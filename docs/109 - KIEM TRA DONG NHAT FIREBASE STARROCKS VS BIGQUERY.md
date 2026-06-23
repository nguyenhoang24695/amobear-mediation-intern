# Kiểm tra tính đồng nhất dữ liệu Firebase: StarRocks vs BigQuery

Hướng dẫn so sánh dữ liệu giữa StarRocks (bảng `bronze.fb_*`) và BigQuery (`events_intraday_*`) sau khi chạy Firebase Pipeline.

**Ví dụ trong doc:** app `fb_ar_tracer_trace_drawing_ios`, ngày **2026-02-01**  
- **StarRocks:** `bronze.fb_ar_tracer_trace_drawing_ios` (tên bảng = `fb_` + appKey đã sanitize: `.` `-` → `_`)  
- **BigQuery:** `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_*` (partition theo `event_date` = `YYYYMMDD`)

### Đảm bảo tính đồng nhất

- **1 row = 1 event:** Mỗi dòng StarRocks tương ứng đúng một event trong BigQuery. Pipeline Parquet gom các physical row cùng key `(event_date, user_pseudo_id, event_timestamp)` thành một event, merge đủ `event_params` và `user_properties` rồi ghi một row.
- **Khóa so sánh:** `(event_date, user_pseudo_id, event_timestamp)` — dùng để đối chiếu row count và lấy mẫu cùng event giữa hai nguồn.
- **JSON:** `event_params_json` và `user_properties_json` trên StarRocks lưu dạng **object** (map key → value); BigQuery lưu **REPEATED RECORD** (mảng). Khi kiểm tra nội dung cần so theo từng key (xem mục 5).

---

## 1. So sánh số dòng (row count)

### StarRocks

```sql
-- Kết nối StarRocks (MySQL protocol), chạy:
SELECT
    event_date,
    COUNT(*) AS row_count
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
GROUP BY event_date;
```

### BigQuery

```sql
-- Trong BigQuery Console (project ar-tracer-trace-drawing-ios hoặc project bạn query):
SELECT
    PARSE_DATE('%Y%m%d', event_date) AS event_date,
    COUNT(*) AS row_count
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_*`
WHERE _TABLE_SUFFIX = '20260201'
GROUP BY event_date;
```

Hoặc dùng partition dạng bảng:

```sql
SELECT
    event_date,
    COUNT(*) AS row_count
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
GROUP BY event_date;
```

**Kiểm tra:** Hai `row_count` phải bằng nhau (hoặc chênh lệch rất nhỏ nếu BQ có thêm dòng realtime sau khi export). Vì 1 row = 1 event, số dòng chính là số event trong ngày.

---

## 2. So sánh phân bố theo event_name

Đảm bảo số lượng từng loại event khớp giữa hai nguồn.

### StarRocks

```sql
SELECT
    event_name,
    COUNT(*) AS cnt
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
GROUP BY event_name
ORDER BY cnt DESC;
```

### BigQuery

```sql
SELECT
    event_name,
    COUNT(*) AS cnt
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
GROUP BY event_name
ORDER BY cnt DESC;
```

**Kiểm tra:** Từng `event_name` có `cnt` giống nhau (hoặc gần bằng).

---

## 3. So sánh theo (user_pseudo_id, event_timestamp) — khóa duy nhất

Mỗi event được xác định bởi `(event_date, event_name, user_pseudo_id, event_timestamp)` trong StarRocks và tương ứng trong BQ. Có thể kiểm tra tồn tại đủ cặp (user_pseudo_id, event_timestamp) cho một ngày.

### Số bản ghi duy nhất theo user + timestamp

**StarRocks:**

```sql
SELECT COUNT(*) AS unique_events
FROM (
    SELECT user_pseudo_id, event_timestamp
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date = '2026-02-01'
    GROUP BY user_pseudo_id, event_timestamp
) t;
```

**BigQuery:**

```sql
SELECT COUNT(*) AS unique_events
FROM (
    SELECT user_pseudo_id, event_timestamp
    FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
    GROUP BY user_pseudo_id, event_timestamp
) t;
```

Hai số `unique_events` nên bằng nhau và bằng tổng số dòng (nếu không có duplicate).

---

## 4. So sánh nội dung mẫu (một vài dòng)

Lấy vài dòng từ mỗi bên theo cùng điều kiện, so sánh cột quan trọng và JSON.

### StarRocks — lấy mẫu

```sql
SELECT
    event_date,
    event_name,
    user_pseudo_id,
    event_timestamp,
    install_date,
    retention_day,
    app_version,
    LEFT(device_json, 200)         AS device_json_preview,
    LEFT(geo_json, 200)            AS geo_json_preview,
    LEFT(event_params_json, 500)  AS event_params_json_preview,
    LEFT(user_properties_json, 300) AS user_properties_json_preview
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
ORDER BY event_timestamp
LIMIT 10;
```

**Lưu ý:** `event_params_json` / `user_properties_json` trong StarRocks là **object** (map), ví dụ:  
`{"ga_session_id":{"int_value":"1769926445"},"firebase_screen_class":{"string_value":"HomeViewController"}}`  
— không phải mảng như BQ.

### BigQuery — lấy mẫu tương ứng (cùng user_pseudo_id + event_timestamp)

Dùng vài cặp `(user_pseudo_id, event_timestamp)` từ kết quả StarRocks ở trên:

```sql
SELECT
    PARSE_DATE('%Y%m%d', event_date) AS event_date,
    event_name,
    user_pseudo_id,
    event_timestamp,
    DATE(TIMESTAMP_MICROS(user_first_touch_timestamp)) AS install_date,
    (SELECT STRING_AGG(version) FROM UNNEST(app_info.version) AS version) AS app_version,
    TO_JSON_STRING(device)         AS device_json,
    TO_JSON_STRING(geo)            AS geo_json,
    TO_JSON_STRING(event_params)   AS event_params_json,
    TO_JSON_STRING(user_properties) AS user_properties_json
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
WHERE (user_pseudo_id, event_timestamp) IN (
    ('<user_pseudo_id_1>', <event_timestamp_1>),
    ('<user_pseudo_id_2>', <event_timestamp_2>)
    -- thay bằng giá trị thật từ StarRocks
)
ORDER BY event_timestamp;
```

So sánh tay:
- `event_name`, `event_timestamp`, `user_pseudo_id` khớp.
- **JSON:** BQ trả về `event_params`/`user_properties` dạng mảng `[{ "key": "...", "value": {...} }, ...]`. StarRocks lưu dạng object `{ "param_name": { "string_value"/"int_value": ... }, ... }`. Nội dung tương đương khi mỗi key trong BQ có đúng một value tương ứng trong object StarRocks (xem mục 5).

---

## 5. Cách kiểm tra dữ liệu JSON (event_params / user_properties)

### 5.1 Format trong StarRocks vs BigQuery

| Nguồn | event_params / user_properties |
|-------|----------------------------------|
| **StarRocks** | **Object (map):** `{ "ga_session_id": { "int_value": "1769926445" }, "firebase_screen_class": { "string_value": "HomeViewController" }, ... }` — key = tên param/property. |
| **BigQuery** | **Mảng REPEATED RECORD:** `[ { "key": "ga_session_id", "value": { "int_value": "1769926445" } }, { "key": "firebase_screen_class", "value": { "string_value": "HomeViewController" } }, ... ]` |

Pipeline chuẩn hóa: Parquet (nhiều row/event) → gom nhóm → merge → output mảng `[{ key, value }, ...]` → Transformer đổi thành object rồi ghi StarRocks. Để so sánh đồng nhất, so theo **từng key**: giá trị của cùng một key ở BQ phải bằng giá trị trong object StarRocks.

### 5.2 Kiểm tra theo key trên StarRocks (object)

Dùng `get_json_string(..., '$.<key>.<string_value|int_value>')` hoặc `json_query`:

```sql
-- Lấy giá trị một param cụ thể
SELECT
    event_name,
    user_pseudo_id,
    event_timestamp,
    get_json_string(event_params_json, '$.ga_session_id.int_value')   AS ga_session_id,
    get_json_string(event_params_json, '$.firebase_screen_class.string_value') AS screen_class
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
  AND event_params_json IS NOT NULL
LIMIT 10;
```

Kiểm tra tồn tại key và không bị mất sau merge:

```sql
SELECT
    event_name,
    COUNT(*) AS total,
    SUM(CASE WHEN get_json_string(event_params_json, '$.ga_session_id') IS NOT NULL AND get_json_string(event_params_json, '$.ga_session_id') != '' THEN 1 ELSE 0 END) AS with_ga_session_id
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
GROUP BY event_name
ORDER BY total DESC
LIMIT 20;
```

### 5.3 Kiểm tra tương ứng trên BigQuery (mảng)

Lấy cùng giá trị từ BQ (UNNEST + filter key):

```sql
SELECT
    event_name,
    user_pseudo_id,
    event_timestamp,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id' LIMIT 1) AS ga_session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'firebase_screen_class' LIMIT 1) AS screen_class
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
WHERE (user_pseudo_id, event_timestamp) IN (
    ('<user_pseudo_id_1>', <event_timestamp_1>),
    ('<user_pseudo_id_2>', <event_timestamp_2>)
)
ORDER BY event_timestamp;
```

So sánh: với cùng `(user_pseudo_id, event_timestamp)`, cột `ga_session_id` / `screen_class` (và mọi key khác) phải giống nhau giữa StarRocks và BQ.

### 5.4 Đếm event có params (so sánh tỉ lệ)

**StarRocks:** đếm event có `event_params_json` không rỗng và khác `{}`:

```sql
SELECT
    event_name,
    COUNT(*) AS total,
    SUM(CASE WHEN event_params_json IS NOT NULL AND event_params_json != '' AND event_params_json != '{}' THEN 1 ELSE 0 END) AS with_params
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = '2026-02-01'
GROUP BY event_name
ORDER BY total DESC
LIMIT 20;
```

**BigQuery:**

```sql
SELECT
    event_name,
    COUNT(*) AS total,
    SUM(CASE WHEN ARRAY_LENGTH(event_params) > 0 THEN 1 ELSE 0 END) AS with_params
FROM `ar-tracer-trace-drawing-ios.analytics_449963528.events_intraday_20260201`
GROUP BY event_name
ORDER BY total DESC
LIMIT 20;
```

Tỉ lệ `with_params / total` từng `event_name` nên tương đương hai bên — nếu lệch nhiều thì có thể thiếu merge hoặc thiếu key.

---

## 6. Checklist nhanh

| Bước | Nội dung | StarRocks | BigQuery | Kết luận |
|------|----------|-----------|----------|----------|
| 1 | Row count (số event) | `COUNT(*)` WHERE event_date = '...' | `COUNT(*)` FROM events_intraday_YYYYMMDD | Hai số bằng nhau (1 row = 1 event) |
| 2 | Phân bố event_name | GROUP BY event_name | GROUP BY event_name | Cùng distribution |
| 3 | Unique (user_pseudo_id, event_timestamp) | COUNT DISTINCT từ subquery | COUNT DISTINCT từ subquery | Bằng nhau |
| 4 | Mẫu 5–10 dòng | SELECT ... ORDER BY event_timestamp LIMIT 10 | SELECT cùng (user_pseudo_id, event_timestamp) | Cột scalar + JSON khớp |
| 5 | event_params / user_properties | with_params vs total (object, `$.key`) | ARRAY_LENGTH(event_params) > 0 | Tỉ lệ tương đương |
| 6 | Kiểm tra JSON theo key | get_json_string(event_params_json, '$.ga_session_id.int_value') | UNNEST(event_params) WHERE key = 'ga_session_id' | Cùng (user, ts) → cùng giá trị |

---

## 7. Lưu ý

- **1 row = 1 event:** Pipeline Parquet gom theo (event_date, user_pseudo_id, event_timestamp), merge đủ event_params/user_properties rồi ghi một row StarRocks. Row count phải bằng số event BQ cho cùng ngày.
- **Format JSON:** StarRocks lưu `event_params_json` / `user_properties_json` là **object** (map key → value). BigQuery lưu **mảng** `[{ key, value }, ...]`. So sánh nội dung theo từng key (mục 5).
- **Tên bảng StarRocks:** Bảng = `bronze.fb_` + appKey đã sanitize (`.` và `-` → `_`). Prefix `fb_` do code thêm.
- **BigQuery partition:** Bảng partition `events_intraday_YYYYMMDD`; với ngày 2026-02-01 dùng `events_intraday_20260201` hoặc `events_intraday_*` với `_TABLE_SUFFIX = '20260201'`.
- **event_date:** StarRocks = `DATE` (2026-02-01); BQ = STRING `YYYYMMDD` (20260201) — dùng `PARSE_DATE('%Y%m%d', event_date)` khi cần.

Nếu tất cả bước trên khớp thì có thể kết luận dữ liệu Firebase giữa StarRocks và BigQuery đồng nhất cho ngày và app đã kiểm tra.
