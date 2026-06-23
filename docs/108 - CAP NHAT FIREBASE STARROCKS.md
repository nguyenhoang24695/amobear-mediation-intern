# StarRocks Firebase Events — Tối ưu cấu trúc bảng & Query Guide

**Phạm vi:** Bảng `bronze.fb_*` (per-app), 2-3 triệu rows/ngày/app, JSON columns

**Stack:** StarRocks Standalone → 128 CPU / 512GB RAM / 8TB SSD

**Mục tiêu:** Query p95 < 500ms, storage efficiency, ETL-ready

---

## 1. Vấn đề với DDL hiện tại

```sql
-- ❌ DDL HIỆN TẠI — không partition, không TTL
CREATE TABLE bronze.fb_<app_id> (
    event_date DATE,
    event_timestamp BIGINT,
    user_pseudo_id VARCHAR(255),
    install_date DATE,
    retention_day INT,
    event_name VARCHAR(255),
    app_version VARCHAR(100),
    device_json STRING,
    geo_json STRING,
    traffic_source_json STRING,
    event_params_json STRING,
    user_properties_json STRING,
    raw_event_json STRING
)
DUPLICATE KEY(event_date, event_name, user_pseudo_id, event_timestamp)
DISTRIBUTED BY HASH(user_pseudo_id) BUCKETS 8
PROPERTIES("replication_num" = "1");
```

### Các vấn đề chính

| # | Vấn đề | Hậu quả |
| --- | --- | --- |
| 1 | **Không partition** | Full table scan khi query theo ngày, không thể TTL tự động |
| 2 | **Buckets cố định = 8** | Với 2-3M rows/ngày × 365 ngày = ~1B rows, 8 buckets quá ít → hot tablet |
| 3 | **STRING cho JSON** | Đúng rồi, nhưng cần index hỗ trợ |
| 4 | **Không có Materialized View** | Mỗi lần tính DAU/DAV phải scan raw table |
| 5 | **raw_event_json quá lớn** | 1 event Firebase ~2-5KB, chiếm 60-70% storage |

---

## 2. DDL tối ưu (Recommended)

```sql
CREATE TABLE IF NOT EXISTS bronze.fb_<sanitized_app_id> (
    -- === KEY COLUMNS — phải đúng thứ tự, đầu tiên ===
    event_date        DATE           NOT NULL COMMENT 'Partition key, từ BigQuery',
    event_name        VARCHAR(255)   NOT NULL COMMENT 'Firebase event name',
    user_pseudo_id    VARCHAR(255)   NOT NULL COMMENT 'Firebase anonymous user ID',
    event_timestamp   BIGINT         NOT NULL COMMENT 'Microseconds since epoch',
    
    -- === NON-KEY COLUMNS ===
    install_date      DATE                    COMMENT 'Tính từ user_first_touch_timestamp',
    retention_day     INT                     COMMENT 'event_date - install_date',
    app_version       VARCHAR(100)            COMMENT 'app_info.version',
    device_json       STRING                  COMMENT 'device RECORD từ BigQuery',
    geo_json          STRING                  COMMENT 'geo RECORD từ BigQuery',
    traffic_source_json STRING                COMMENT 'traffic_source RECORD',
    event_params_json STRING                  COMMENT 'event_params REPEATED RECORD',
    user_properties_json STRING               COMMENT 'user_properties REPEATED RECORD',
    raw_event_json    STRING                  COMMENT 'Toàn bộ BQ event, backup & recovery'
)
DUPLICATE KEY(event_date, event_name, user_pseudo_id, event_timestamp)
PARTITION BY RANGE(event_date) (
    PARTITION p202601 VALUES [('2026-01-01'), ('2026-02-01')),
    PARTITION p202602 VALUES [('2026-02-01'), ('2026-03-01')),
    PARTITION p202603 VALUES [('2026-03-01'), ('2026-04-01'))
)
DISTRIBUTED BY HASH(user_pseudo_id) BUCKETS 16
PROPERTIES(
    "replication_num" = "1",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "MONTH",
    "dynamic_partition.start" = "-12",
    "dynamic_partition.end" = "2",
    "dynamic_partition.prefix" = "p",
    "dynamic_partition.buckets" = "16",
    "compression" = "ZSTD"
);
```

### Giải thích quyết định

```
┌─────────────────────────────────────────────────────────┐
│              PARTITION BY MONTH                          │
│                                                         │
│  Tại sao MONTH thay vì DAY?                            │
│  • 2-3M rows/ngày → 60-90M rows/tháng                 │
│  • Partition quá nhỏ (DAY) = metadata overhead          │
│  • Query thường theo range (7d, 30d) → scan ít part.   │
│  • TTL dễ quản lý: drop cả tháng                       │
│                                                         │
│  Tại sao 16 BUCKETS?                                    │
│  • Rule of thumb: mỗi bucket ~100-500MB                │
│  • 90M rows × ~3KB/row = ~270GB/tháng                  │
│  • 270GB / 16 = ~17GB/bucket (hợp lý)                  │
│  • Hash by user_pseudo_id → phân bổ đều                │
│                                                         │
│  Tại sao ZSTD?                                          │
│  • JSON data compress ratio ~3-5x vs LZ4               │
│  • raw_event_json chiếm 60-70% storage                 │
│  • Trade-off: CPU tăng nhẹ, storage giảm mạnh          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Cấu trúc bản ghi Firebase trên StarRocks

### 3.1 Nguyên tắc: 1 row = 1 event

- Mỗi dòng trong bảng `bronze.fb_*` tương ứng **đúng một event** trong BigQuery (1:1).
- Pipeline: BigQuery/GCS → Parquet (có thể nhiều physical row cho một event do repeated fields) → **gom theo key** `(event_date, user_pseudo_id, event_timestamp)` → merge `event_params` và `user_properties` → **một row** ghi vào StarRocks.
- Khóa logic: `(event_date, event_name, user_pseudo_id, event_timestamp)` — trùng key = cùng một event.

### 3.2 Các cột JSON và format lưu

| Cột | Nội dung | Format trong StarRocks |
|-----|----------|-------------------------|
| `device_json` | RECORD device từ BQ | Object: `{ "category", "mobile_brand_name", "operating_system", ... }` |
| `geo_json` | RECORD geo | Object: `{ "continent", "country", "region", "city", ... }` |
| `traffic_source_json` | RECORD traffic_source | Object: `{ "source", "medium", "name", ... }` |
| **event_params_json** | REPEATED RECORD event_params từ BQ | **Object (map)** key → value: `{ "ga_session_id": { "int_value": "..." }, "firebase_screen_class": { "string_value": "..." }, ... }` |
| **user_properties_json** | REPEATED RECORD user_properties từ BQ | **Object (map)** key → value: `{ "campaign": { "string_value": "...", "set_timestamp_micros": "..." }, ... }` |
| `raw_event_json` | Toàn bộ event từ nguồn | Object đầy đủ schema BQ (backup & recovery) |

**Lưu ý:** Trong BigQuery, `event_params` và `user_properties` là **REPEATED RECORD** (mảng `[{ key, value }, ...]`). Khi ghi StarRocks, pipeline chuẩn hóa thành **một object** (param/property name → value struct) để query đơn giản: dùng `get_json_string(event_params_json, '$.ga_session_id.int_value')` thay vì parse mảng.

### 3.3 Value struct trong event_params / user_properties

Mỗi giá trị trong map là object Firebase chuẩn:

```json
{
  "string_value": "..." | null,
  "int_value": "..." | null,
  "float_value": null,
  "double_value": null
}
```

`user_properties` có thêm `"set_timestamp_micros"` khi có. Chỉ một trong các `*_value` có giá trị; các field khác null.

---

## 4. Migration từ bảng cũ sang bảng mới

```sql
-- Bước 1: Tạo bảng mới
CREATE TABLE bronze.fb_<app_id>_v2 ( ... ); -- DDL tối ưu ở trên

-- Bước 2: Copy data theo từng tháng (tránh OOM)
INSERT INTO bronze.fb_<app_id>_v2
SELECT * FROM bronze.fb_<app_id>
WHERE event_date >= '2025-01-01' AND event_date < '2025-02-01';

INSERT INTO bronze.fb_<app_id>_v2
SELECT * FROM bronze.fb_<app_id>
WHERE event_date >= '2025-02-01' AND event_date < '2025-03-01';
-- ... lặp cho từng tháng

-- Bước 3: Verify row count
SELECT
    'old' AS src, COUNT(*) AS cnt FROM bronze.fb_<app_id>
UNION ALL
SELECT
    'new' AS src, COUNT(*) AS cnt FROM bronze.fb_<app_id>_v2;

-- Bước 4: Swap
ALTER TABLE bronze.fb_<app_id> RENAME fb_<app_id>_backup;
ALTER TABLE bronze.fb_<app_id>_v2 RENAME fb_<app_id>;

-- Bước 5: Drop backup sau 7 ngày confirm OK
-- DROP TABLE bronze.fb_<app_id>_backup;
```

---

## 5. Query mẫu — Device JSON

Firebase device RECORD chứa ~10 keys. Trong StarRocks dùng `get_json_string()`.

### 5.1 Parse device info cơ bản

```sql
SELECT
    event_date,
    user_pseudo_id,
    event_name,
    get_json_string(device_json, '$.category')                AS device_category,
    get_json_string(device_json, '$.mobile_brand_name')       AS brand,
    get_json_string(device_json, '$.mobile_model_name')       AS model,
    get_json_string(device_json, '$.mobile_os_hardware_model') AS hw_model,
    get_json_string(device_json, '$.operating_system')        AS os,
    get_json_string(device_json, '$.operating_system_version') AS os_version,
    get_json_string(device_json, '$.language')                AS language,
    get_json_string(device_json, '$.web_info.browser')        AS browser,
    get_json_string(device_json, '$.advertising_id')          AS adv_id,
    get_json_string(device_json, '$.is_limited_ad_tracking')  AS limited_ad_tracking
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
LIMIT 100;
```

### 5.2 Device breakdown — Top models by DAU

```sql
SELECT
    get_json_string(device_json, '$.mobile_brand_name')  AS brand,
    get_json_string(device_json, '$.mobile_model_name')  AS model,
    get_json_string(device_json, '$.operating_system_version') AS os_ver,
    COUNT(DISTINCT user_pseudo_id) AS dau,
    COUNT(*) AS total_events
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
  AND event_name IN ('session_start', 'user_engagement')
GROUP BY brand, model, os_ver
ORDER BY dau DESC
LIMIT 20;
```

### 5.3 Device performance correlation (nâng cao)

```sql
-- Xem user trên device cũ (OS version thấp) có retention kém hơn không?
SELECT
    get_json_string(device_json, '$.operating_system_version') AS os_ver,
    COUNT(DISTINCT user_pseudo_id) AS users,
    AVG(retention_day) AS avg_retention,
    COUNT(DISTINCT CASE WHEN retention_day >= 7 THEN user_pseudo_id END) AS retained_d7,
    ROUND(
        COUNT(DISTINCT CASE WHEN retention_day >= 7 THEN user_pseudo_id END) * 100.0
        / COUNT(DISTINCT user_pseudo_id), 2
    ) AS d7_retention_pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28'
  AND event_name = 'session_start'
GROUP BY os_ver
HAVING users >= 100
ORDER BY d7_retention_pct DESC;
```

---

## 6. Query mẫu — Geo JSON

Firebase geo RECORD chứa: continent, sub_continent, country, region, city, metro.

### 6.1 Parse geo info

```sql
SELECT
    event_date,
    user_pseudo_id,
    get_json_string(geo_json, '$.continent')     AS continent,
    get_json_string(geo_json, '$.sub_continent')  AS sub_continent,
    get_json_string(geo_json, '$.country')        AS country,
    get_json_string(geo_json, '$.region')         AS region,
    get_json_string(geo_json, '$.city')           AS city,
    get_json_string(geo_json, '$.metro')          AS metro
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
LIMIT 100;
```

### 6.2 DAU by country — Top markets

```sql
SELECT
    get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT user_pseudo_id) AS dau,
    COUNT(*) AS total_events,
    COUNT(DISTINCT CASE WHEN event_name = 'ad_impression' THEN user_pseudo_id END) AS dav,
    ROUND(
        COUNT(DISTINCT CASE WHEN event_name = 'ad_impression' THEN user_pseudo_id END) * 100.0
        / NULLIF(COUNT(DISTINCT user_pseudo_id), 0), 2
    ) AS ad_penetration_pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
GROUP BY country
ORDER BY dau DESC
LIMIT 30;
```

### 6.3 Geo × Retention (market quality analysis)

```sql
-- Đánh giá chất lượng user theo market
SELECT
    get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT user_pseudo_id) AS total_users,
    COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END) AS new_users,
    COUNT(DISTINCT CASE WHEN retention_day >= 1 THEN user_pseudo_id END) AS d1_retained,
    COUNT(DISTINCT CASE WHEN retention_day >= 7 THEN user_pseudo_id END) AS d7_retained,
    ROUND(
        COUNT(DISTINCT CASE WHEN retention_day >= 1 THEN user_pseudo_id END) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END), 0), 2
    ) AS d1_retention_pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28'
  AND event_name = 'session_start'
GROUP BY country
HAVING total_users >= 50
ORDER BY d1_retention_pct DESC;
```

---

## 7. Query mẫu — Event Params JSON

Trên StarRocks, `event_params_json` được lưu dạng **object (map)** param name → value struct, không phải mảng. Cấu trúc tương đương BigQuery nhưng đã chuẩn hóa để query theo key.

### Cấu trúc event_params_json trong StarRocks (sau pipeline)

```json
{
  "ga_session_id": { "string_value": null, "int_value": "1772323200", "float_value": null, "double_value": null },
  "firebase_screen_class": { "string_value": "HomeViewController", "int_value": null, "float_value": null, "double_value": null },
  "engaged_session_event": { "string_value": null, "int_value": "1", "float_value": null, "double_value": null }
}
```

Dùng path `$.param_name` hoặc `$.param_name.int_value` / `$.param_name.string_value` để lấy giá trị.

### 7.1 Lấy giá trị event param theo tên

```sql
-- Lấy ga_session_id, firebase_screen_class từ event_params (object)
SELECT
    event_date,
    event_name,
    get_json_string(event_params_json, '$.ga_session_id.int_value')   AS ga_session_id,
    get_json_string(event_params_json, '$.firebase_screen_class.string_value') AS screen_class
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
  AND event_name = 'screen_view'
LIMIT 20;
```

### 7.2 Tìm giá trị event param cụ thể (regex fallback) (pattern phổ biến nhất)

```sql
-- Trích xuất ga_session_id từ event_params
-- Dùng json_each() hoặc unnest pattern
-- Cách đơn giản nhất trên StarRocks: regex hoặc json path search

-- Cách A: Dùng regexp để tìm key cụ thể (nhanh, practical)
SELECT
    event_date,
    user_pseudo_id,
    event_name,
    regexp_extract(
        event_params_json,
        '"key"\\s*:\\s*"ga_session_id"\\s*,\\s*"value"\\s*:\\s*\\{[^}]*"int_value"\\s*:\\s*"?(\\d+)"?',
        1
    ) AS ga_session_id,
    regexp_extract(
        event_params_json,
        '"key"\\s*:\\s*"firebase_screen_class"\\s*,\\s*"value"\\s*:\\s*\\{[^}]*"string_value"\\s*:\\s*"([^"]*)"',
        1
    ) AS screen_class
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
  AND event_name = 'screen_view'
LIMIT 20;
```

### 7.3 Session analysis với event_params

```sql
-- Đếm sessions dựa trên ga_session_id
SELECT
    event_date,
    COUNT(DISTINCT user_pseudo_id) AS dau,
    COUNT(DISTINCT CONCAT(
        user_pseudo_id, '_',
        regexp_extract(
            event_params_json,
            '"key"\\s*:\\s*"ga_session_id"\\s*,\\s*"value"\\s*:\\s*\\{[^}]*"int_value"\\s*:\\s*"?(\\d+)"?',
            1
        )
    )) AS total_sessions,
    ROUND(
        COUNT(DISTINCT CONCAT(
            user_pseudo_id, '_',
            regexp_extract(
                event_params_json,
                '"key"\\s*:\\s*"ga_session_id"\\s*,\\s*"value"\\s*:\\s*\\{[^}]*"int_value"\\s*:\\s*"?(\\d+)"?',
                1
            )
        )) * 1.0 / NULLIF(COUNT(DISTINCT user_pseudo_id), 0), 2
    ) AS sessions_per_user
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
GROUP BY event_date;
```

---

## 8. Query mẫu — Raw Event JSON

`raw_event_json` chứa toàn bộ BQ event. Dùng khi cần field không có trong các cột khác.

### 8.1 Parse fields từ raw_event_json

```sql
SELECT
    event_date,
    event_name,
    user_pseudo_id,
    -- Fields chỉ có trong raw
    get_json_string(raw_event_json, '$.event_value_in_usd')        AS event_value_usd,
    get_json_string(raw_event_json, '$.user_id')                   AS user_id,
    get_json_string(raw_event_json, '$.stream_id')                 AS stream_id,
    get_json_string(raw_event_json, '$.platform')                  AS platform,
    get_json_string(raw_event_json, '$.batch_event_index')         AS batch_idx,
    get_json_string(raw_event_json, '$.event_bundle_sequence_id')  AS bundle_seq,
    -- Privacy info
    get_json_string(raw_event_json, '$.privacy_info.analytics_storage')            AS analytics_storage,
    get_json_string(raw_event_json, '$.privacy_info.ads_storage')                  AS ads_storage,
    get_json_string(raw_event_json, '$.privacy_info.uses_transient_token')         AS transient_token,
    -- User LTV
    get_json_string(raw_event_json, '$.user_ltv.revenue')          AS ltv_revenue,
    get_json_string(raw_event_json, '$.user_ltv.currency')         AS ltv_currency,
    -- App info đầy đủ
    get_json_string(raw_event_json, '$.app_info.id')               AS app_bundle_id,
    get_json_string(raw_event_json, '$.app_info.version')          AS app_ver,
    get_json_string(raw_event_json, '$.app_info.install_source')   AS install_source,
    get_json_string(raw_event_json, '$.app_info.firebase_app_id')  AS firebase_app_id
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-03-01'
  AND event_name = 'in_app_purchase'
LIMIT 50;
```

### 8.2 Revenue events analysis

```sql
-- Tổng hợp IAP revenue từ raw_event_json
SELECT
    event_date,
    get_json_string(geo_json, '$.country') AS country,
    COUNT(*) AS purchase_events,
    COUNT(DISTINCT user_pseudo_id) AS paying_users,
    SUM(CAST(
        COALESCE(get_json_string(raw_event_json, '$.event_value_in_usd'), '0')
        AS DOUBLE
    )) AS total_revenue_usd
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28'
  AND event_name = 'in_app_purchase'
GROUP BY event_date, country
ORDER BY total_revenue_usd DESC;
```

### 8.3 Traffic source deep dive

```sql
SELECT
    get_json_string(traffic_source_json, '$.source')  AS source,
    get_json_string(traffic_source_json, '$.medium')  AS medium,
    get_json_string(traffic_source_json, '$.name')    AS campaign,
    COUNT(DISTINCT user_pseudo_id) AS users,
    COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END) AS new_users,
    COUNT(DISTINCT CASE WHEN retention_day >= 7 THEN user_pseudo_id END) AS d7_retained,
    ROUND(
        COUNT(DISTINCT CASE WHEN retention_day >= 7 THEN user_pseudo_id END) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END), 0), 2
    ) AS d7_ret_pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY source, medium, campaign
HAVING new_users >= 10
ORDER BY new_users DESC;
```

---

## 9. Materialized Views — Tự động tổng hợp

Đây là key performance optimization. Thay vì scan 2-3M rows mỗi lần, MV tổng hợp sẵn.

### 9.1 MV: Daily App Engagement (DAU/DAV/Sessions)

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS silver.mv_daily_engagement_<app_id>
REFRESH ASYNC EVERY (INTERVAL 4 HOUR)   -- Refresh mỗi 4h, sync với data freshness target
AS
SELECT
    event_date,

    -- DAU: user có session_start hoặc user_engagement
    COUNT(DISTINCT CASE
        WHEN event_name IN ('session_start', 'user_engagement')
        THEN user_pseudo_id
    END) AS dau,

    -- New Users: retention_day = 0
    COUNT(DISTINCT CASE
        WHEN event_name = 'first_open'
        THEN user_pseudo_id
    END) AS new_users,

    -- DAV: user có ad_impression
    COUNT(DISTINCT CASE
        WHEN event_name = 'ad_impression'
        THEN user_pseudo_id
    END) AS dav,

    -- Total events
    COUNT(*) AS total_events,

    -- Ad metrics
    SUM(CASE WHEN event_name = 'ad_impression' THEN 1 ELSE 0 END) AS ad_impressions,
    SUM(CASE WHEN event_name = 'ad_click' THEN 1 ELSE 0 END) AS ad_clicks,

    -- IAP
    COUNT(DISTINCT CASE
        WHEN event_name = 'in_app_purchase'
        THEN user_pseudo_id
    END) AS paying_users,

    -- Session count (unique user+session_id combos)
    COUNT(DISTINCT CASE
        WHEN event_name = 'session_start'
        THEN CONCAT(user_pseudo_id, '_',
             COALESCE(regexp_extract(
                 event_params_json,
                 '"key"\\s*:\\s*"ga_session_id"\\s*,\\s*"value"\\s*:\\s*\\{[^}]*"int_value"\\s*:\\s*"?(\\d+)"?',
                 1
             ), ''))
    END) AS sessions

FROM bronze.fb_ar_tracer_trace_drawing_ios
GROUP BY event_date;
```

### 9.2 MV: Daily Geo Breakdown

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS silver.mv_daily_geo_<app_id>
REFRESH ASYNC EVERY (INTERVAL 4 HOUR)
AS
SELECT
    event_date,
    get_json_string(geo_json, '$.country') AS country,

    COUNT(DISTINCT CASE
        WHEN event_name IN ('session_start', 'user_engagement')
        THEN user_pseudo_id
    END) AS dau,

    COUNT(DISTINCT CASE
        WHEN event_name = 'first_open'
        THEN user_pseudo_id
    END) AS new_users,

    COUNT(DISTINCT CASE
        WHEN event_name = 'ad_impression'
        THEN user_pseudo_id
    END) AS dav,

    SUM(CASE WHEN event_name = 'ad_impression' THEN 1 ELSE 0 END) AS ad_impressions

FROM bronze.fb_ar_tracer_trace_drawing_ios
GROUP BY event_date, country;
```

### 9.3 MV: Daily Device Breakdown

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS silver.mv_daily_device_<app_id>
REFRESH ASYNC EVERY (INTERVAL 4 HOUR)
AS
SELECT
    event_date,
    get_json_string(device_json, '$.mobile_brand_name') AS brand,
    get_json_string(device_json, '$.mobile_model_name') AS model,
    get_json_string(device_json, '$.operating_system_version') AS os_version,

    COUNT(DISTINCT CASE
        WHEN event_name IN ('session_start', 'user_engagement')
        THEN user_pseudo_id
    END) AS dau,

    COUNT(*) AS total_events

FROM bronze.fb_ar_tracer_trace_drawing_ios
GROUP BY event_date, brand, model, os_version;
```

---

## 10. Query trên Materialized Views (nhanh hơn 10-50x)

```sql
-- DAU trend 30 ngày — query MV thay vì raw table
SELECT
    event_date,
    dau,
    new_users,
    dav,
    sessions,
    ROUND(sessions * 1.0 / NULLIF(dau, 0), 2) AS sessions_per_user,
    ROUND(dav * 100.0 / NULLIF(dau, 0), 2) AS ad_penetration_pct
FROM silver.mv_daily_engagement_<app_id>
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY event_date;

-- Top 10 countries by DAU — query MV
SELECT
    country,
    SUM(dau) AS total_dau,
    SUM(new_users) AS total_new,
    SUM(dav) AS total_dav,
    ROUND(SUM(ad_impressions) * 1.0 / NULLIF(SUM(dav), 0), 1) AS impressions_per_dav
FROM silver.mv_daily_geo_<app_id>
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY country
ORDER BY total_dau DESC
LIMIT 10;
```

---

## 11. Combined Queries — Real-world Use Cases

### 11.1 Full User Profile (ad-hoc investigation)

```sql
SELECT
    event_date,
    event_name,
    event_timestamp,
    retention_day,
    app_version,
    -- Device
    get_json_string(device_json, '$.mobile_brand_name')        AS brand,
    get_json_string(device_json, '$.mobile_model_name')        AS model,
    get_json_string(device_json, '$.operating_system_version') AS os_ver,
    -- Geo
    get_json_string(geo_json, '$.country')                     AS country,
    get_json_string(geo_json, '$.city')                        AS city,
    -- Traffic
    get_json_string(traffic_source_json, '$.source')           AS traffic_source,
    get_json_string(traffic_source_json, '$.medium')           AS traffic_medium,
    -- LTV
    get_json_string(raw_event_json, '$.user_ltv.revenue')      AS ltv_revenue
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE user_pseudo_id = 'EF7EC3DED1BC4D5F87929B1D1DA37C98'
  AND event_date BETWEEN '2026-02-01' AND '2026-03-01'
ORDER BY event_timestamp;
```

### 11.2 ARPDAU calculation (kết hợp với AdMob)

```sql
-- Join Firebase DAU với AdMob revenue
WITH daily_dau AS (
    SELECT event_date, dau
    FROM silver.mv_daily_engagement_<app_id>
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
),
daily_revenue AS (
    SELECT date AS event_date, SUM(estimated_earnings) AS revenue
    FROM bronze.admob_table
    WHERE app_id = 'ca-app-pub-xxx~yyy'
      AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY date
)
SELECT
    d.event_date,
    d.dau,
    r.revenue,
    ROUND(r.revenue / NULLIF(d.dau, 0), 4) AS arpdau
FROM daily_dau d
LEFT JOIN daily_revenue r ON d.event_date = r.event_date
ORDER BY d.event_date;
```

### 11.3 Retention cohort analysis

```sql
-- D1, D3, D7 retention theo install_date cohort
SELECT
    install_date AS cohort_date,
    COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END) AS d0_users,
    COUNT(DISTINCT CASE WHEN retention_day = 1 THEN user_pseudo_id END) AS d1_users,
    COUNT(DISTINCT CASE WHEN retention_day = 3 THEN user_pseudo_id END) AS d3_users,
    COUNT(DISTINCT CASE WHEN retention_day = 7 THEN user_pseudo_id END) AS d7_users,
    ROUND(
        COUNT(DISTINCT CASE WHEN retention_day = 1 THEN user_pseudo_id END) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END), 0), 2
    ) AS d1_ret_pct,
    ROUND(
        COUNT(DISTINCT CASE WHEN retention_day = 7 THEN user_pseudo_id END) * 100.0
        / NULLIF(COUNT(DISTINCT CASE WHEN retention_day = 0 THEN user_pseudo_id END), 0), 2
    ) AS d7_ret_pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_name = 'session_start'
  AND install_date BETWEEN '2026-02-01' AND '2026-02-14'
  AND event_date BETWEEN '2026-02-01' AND '2026-02-28'
GROUP BY install_date
ORDER BY install_date;
```

---

## 12. Performance Tips & Gotchas

### DO ✅

| Tip | Lý do |
| --- | --- |
| Luôn filter `event_date` trong WHERE | Partition pruning, giảm scan 10-30x |
| Dùng `get_json_string()` cho StarRocks | Native JSON function, tối ưu hơn `JSON_EXTRACT` |
| Filter `event_name` sau `event_date` | Duplicate key prefix → prefix scan |
| Dùng MV cho dashboard queries | Pre-aggregated, millisecond response |
| Cast JSON values khi tính toán | `CAST(get_json_string(...) AS DOUBLE)` |
| Batch INSERT theo ngày khi migration | Tránh OOM trên large table |

### DON'T ❌

| Anti-pattern | Hậu quả |
| --- | --- |
| Query không có `event_date` filter | Full table scan, minutes+ response |
| `SELECT *` trên raw table | Pull `raw_event_json` (~3KB/row) → network bottleneck |
| Parse `event_params_json` trong WHERE | Regex trên 2-3M rows = rất chậm |
| Tạo MV refresh mỗi 1 phút | CPU overhead, không cần thiết cho daily batch |
| Join raw table trực tiếp cho dashboard | Dùng MV hoặc silver tables |

---

## 13. Automation Script — Tạo bảng cho nhiều apps

```sql
-- Template để StarRocksFirebaseWriter tạo bảng tự động
-- Thay {APP_TABLE} bằng sanitized app_id tại runtime

CREATE TABLE IF NOT EXISTS bronze.{APP_TABLE} (
    event_date        DATE           NOT NULL,
    event_timestamp   BIGINT         NOT NULL,
    user_pseudo_id    VARCHAR(255)   NOT NULL,
    install_date      DATE,
    retention_day     INT,
    event_name        VARCHAR(255)   NOT NULL,
    app_version       VARCHAR(100),
    device_json       STRING,
    geo_json          STRING,
    traffic_source_json STRING,
    event_params_json STRING,
    user_properties_json STRING,
    raw_event_json    STRING
)
DUPLICATE KEY(event_date, event_name, user_pseudo_id, event_timestamp)
PARTITION BY RANGE(event_date) ()
DISTRIBUTED BY HASH(user_pseudo_id) BUCKETS 16
PROPERTIES(
    "replication_num" = "1",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "MONTH",
    "dynamic_partition.start" = "-12",
    "dynamic_partition.end" = "2",
    "dynamic_partition.prefix" = "p",
    "dynamic_partition.buckets" = "16",
    "storage_medium" = "SSD",
    "compression" = "ZSTD"
);
```

---

## 14. Sizing Estimate

| Metric | Per App/Day | Per App/Month | 200 Apps/Month |
| --- | --- | --- | --- |
| Raw rows | 2-3M | 60-90M | 12-18B |
| Raw size (uncompressed) | ~6-9 GB | ~180-270 GB | ~36-54 TB |
| Compressed (ZSTD) | ~1.5-2.5 GB | ~45-75 GB | ~9-15 TB |
| MV rows | ~1-200 | ~3-6K | ~600K-1.2M |

**⚠️ Với 200+ apps, 8TB SSD sẽ đầy trong ~6-8 tháng.** TTL 12 tháng dynamic partition là quan trọng. Monitor storage weekly.

---

## 15. Lộ trình triển khai

| Tuần | Action | Deliverable |
| --- | --- | --- |
| **1** | Migrate DDL sang bảng mới (có partition + ZSTD) cho 5 apps thử | DDL script, migration log |
| **2** | Validate data, so sánh query performance cũ vs mới | Benchmark report |
| **3** | Update StarRocksFirebaseWriter dùng DDL mới | Code PR |
| **4** | Tạo MV cho top 20 apps (theo DAU) | MV scripts |
| **5** | Build Superset dashboards trên MV | 3 dashboards: DAU, Geo, Device |
| **6** | Rollout DDL mới cho toàn bộ 200+ apps | Migration complete |

---

## 16. Automated Pipeline Jobs

### 16.1 Hangfire Recurring Jobs

| Job ID | Tên | Cron | Mô tả |
|---|---|---|---|
| `firebase-pipeline-daily` | Firebase Pipeline Daily (T-1) | `0 4 * * *` (UTC) | Load dữ liệu ngày hôm qua cho tất cả apps, chạy parallel 5 apps |
| `firebase-pipeline-weekly` | Firebase Pipeline Smart Recovery | `0 6 * * 0` (UTC) | Chủ nhật - kiểm tra data integrity và chỉ reload khi cần |

### 16.2 Smart Recovery Workflow

Weekly job không reload toàn bộ dữ liệu 7 ngày × 500 apps (hàng tỷ rows). Thay vào đó:

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART RECOVERY FLOW                       │
├─────────────────────────────────────────────────────────────┤
│ Với mỗi ngày (7 ngày gần nhất):                             │
│   Với mỗi app (parallel 5 apps):                            │
│     1. Kiểm tra MinIO có files không?                       │
│        └── Nếu không → SyncGcsToMinioIfNeededAsync()        │
│     2. Đếm rows từ Parquet metadata (không load data)       │
│     3. Đếm rows từ StarRocks: COUNT(*) WHERE date = ...     │
│     4. So sánh: |parquet - starrocks| / parquet             │
│        ├── > 1% (threshold) → RELOAD                        │
│        └── ≤ 1% → SKIP                                      │
│     5. Nếu RELOAD: RunPipelineFromMinioOnlyAsync()          │
│   Cuối cùng: Tính DAU/DAV CHỈ cho apps đã reload            │
└─────────────────────────────────────────────────────────────┘
```

### 16.3 Manual Trigger qua API

| Endpoint | Method | Parameters | Mô tả |
|---|---|---|---|
| `/api/jobs/firebase-pipeline/run` | POST | `date`, `skipExport` | Chạy pipeline cho một ngày |
| `/api/jobs/firebase-pipeline/run-range` | POST | `startDate`, `endDate`, `skipExport` | Chạy cho date range |
| `/api/jobs/firebase-pipeline/diagnostics` | POST | `date`, `appKey`, `eventName` | Debug với log chi tiết |

### 16.4 Cấu hình

BQ export: thử streaming trước, nếu bảng không tồn tại thì tự động fallback sang daily (theo từng app, không cần config).

```json
{
  "Firebase": {
    "UseStarRocksFilesLoad": false,     // false = .NET parse (recommended)
    "AppParallelDegree": 5,             // Số apps chạy đồng thời  
    "IntegrityCheckThreshold": 0.01     // 1% tolerance
  },
  "StarRocks": {
    "MaxFilterRatio": 0.01              // Allow 1% filtered rows
  }
}
```

---

## 17. Dynamic Partition Management

### 17.1 Cấu hình bảng Bronze

```sql
PROPERTIES(
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "MONTH",
    "dynamic_partition.start" = "-36",              -- Giữ 3 năm lịch sử
    "dynamic_partition.end" = "3",                  -- Tạo trước 3 tháng
    "dynamic_partition.prefix" = "p",
    "dynamic_partition.buckets" = "16",
    "dynamic_partition.history_partition_num" = "36"
);
```

### 17.2 Xử lý partition cho data cũ

Khi insert data nằm ngoài dynamic partition range, pipeline tự động:

1. **Disable** dynamic_partition.enable
2. **ADD PARTITION** IF NOT EXISTS cho tháng cần thiết
3. **Re-enable** dynamic_partition.enable (trong finally block)

Điều này được thực hiện trong `StarRocksFirebaseWriter.EnsurePartitionExistsAsync()`.