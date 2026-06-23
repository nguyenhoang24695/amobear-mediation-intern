# Đề xuất tối ưu Data & Performance cho Superset Dashboards

> **Tài liệu tham chiếu:** `AR_Tracer_StarRocks_Detail.md`
> **Ngày review:** 2026-02-28

---

## 1. Vấn đề Country Code Mismatch

### Hiện trạng
| Source | Column | Format | Ví dụ |
|--------|--------|--------|-------|
| `bronze.mediation_table` | `country` | ISO 3166-1 alpha-2 | `US`, `GB`, `TH`, `VN` |
| `silver.geo` | `country` | Full name (Firebase GA4) | `United States`, `Thailand`, `Vietnam` |
| `silver.daily_app_revenue` | `country` | ISO 3166-1 alpha-2 | `US`, `GB`, `TH`, `VN` |

### Vấn đề
- **JOIN không khớp**: Widget 1.3 (Top Countries) JOIN `silver.geo` với `silver.daily_app_revenue` → cần convert.
- **Filter không thống nhất**: Superset filter `country = 'United States'` không hoạt động với `mediation_table`.
- **Dashboard 10, 11**: Query `mediation_table` dùng `TH` nhưng người dùng muốn chọn `Thailand`.

### Giải pháp: `silver.dim_country`

```sql
CREATE TABLE IF NOT EXISTS silver.dim_country (
    country_code VARCHAR(10) NOT NULL,      -- US, GB, VN, TH
    country_name VARCHAR(255) NOT NULL,     -- United States, United Kingdom
    country_name_firebase VARCHAR(255),     -- Tên từ Firebase (có thể khác nhẹ)
    region VARCHAR(100),                    -- APAC, EMEA, LATAM, NA
    tier VARCHAR(10),                       -- T1, T2, T3 (cho ad monetization)
    _updated_at DATETIME NOT NULL
)
PRIMARY KEY(country_code)
```

**Đã thêm DDL vào `StarRocksSchemaInitializer.cs`.**

### Cách dùng trong Superset

```sql
-- Widget 1.3: Top Countries (đã fix)
SELECT 
    c.country_name,  -- Hiển thị tên đẹp
    u.dau,
    r.revenue,
    r.ecpm
FROM silver.geo u
LEFT JOIN silver.dim_country c ON u.country = c.country_name_firebase
LEFT JOIN silver.daily_app_revenue r 
    ON c.country_code = r.country AND r.date = u.event_date
WHERE u.app_id = 'ar_tracer_trace_drawing_ios'
  AND u.event_date BETWEEN '${start_date}' AND '${end_date}'
GROUP BY c.country_name, u.dau, r.revenue, r.ecpm
ORDER BY u.dau DESC;
```

### Dữ liệu seed (250+ countries)

Cần populate `dim_country` với dữ liệu ISO 3166-1. Có thể:
1. **Import từ CSV** (khuyến nghị)
2. Dùng API: `https://restcountries.com/v3.1/all`
3. Hardcode top 50 countries thường gặp

**Lưu ý:** Firebase có thể dùng tên khác (vd: `Czechia` vs `Czech Republic`). Cần check actual data từ `silver.geo`.

---

## 2. Đề xuất tối ưu Performance

### 2.1 Tạo Virtual Datasets (Superset)

Thay vì mỗi widget viết SQL riêng, tạo **Virtual Datasets** gộp sẵn các JOIN phổ biến:

| Dataset Name | Tables | Dùng cho |
|--------------|--------|----------|
| `ds_daily_overview_full` | `daily_overview` + `engagement` + `fact_daily_app_metrics` + `dim_app_identifiers` | Dashboard 1, 11 |
| `ds_retention_cohort` | `retention_overview` + `retention_cohort` | Dashboard 2 |
| `ds_content_summary` | `content_engagement` + `event_summary` | Dashboard 3 |
| `ds_revenue_by_country` | `daily_app_revenue` + `geo` + `dim_country` | Dashboard 9, 11 |
| `ds_mediation_full` | `mediation_table` + `dim_country` + `dim_app_identifiers` | Dashboard 10 |

**Lợi ích:**
- **Cache**: Superset cache dataset thay vì từng widget
- **DRY**: Không lặp lại JOIN logic
- **Semantic layer**: Người dùng business có thể tự drag-drop metrics

### 2.2 Tạo Physical Views trong StarRocks

Cho các query phức tạp, tạo VIEW để StarRocks optimize:

```sql
-- VIEW cho Dashboard 1.1
CREATE VIEW IF NOT EXISTS gold.v_daily_overview_full AS
SELECT 
    h.event_date,
    h.app_id,
    h.dau, h.new_users, h.dav, h.sessions,
    h.avg_sessions, h.avg_dur_min,
    h.ad_impressions, h.ad_clicks, h.paying_users,
    h.ad_penetration,
    e.total_engagement_msec,
    f.total_revenue, f.arpdau, f.ecpm, f.fill_rate,
    f.total_impressions,
    d.display_name AS app_name
FROM gold.daily_overview h
LEFT JOIN silver.engagement e 
    ON h.event_date = e.event_date AND h.app_id = e.app_id
LEFT JOIN silver.dim_app_identifiers d 
    ON d.firebase_id = h.app_id
LEFT JOIN gold.fact_daily_app_metrics f 
    ON f.date = h.event_date AND f.app_id = d.admob_app_id;
```

### 2.3 Partition Pruning

**Quan trọng:** Luôn filter theo `event_date` / `date` để StarRocks prune partitions.

```sql
-- ✅ Good: Partition được prune
WHERE event_date BETWEEN '2026-02-01' AND '2026-02-28'

-- ❌ Bad: Full scan
WHERE YEAR(event_date) = 2026 AND MONTH(event_date) = 2
```

### 2.4 Materialized Views cho Metrics thường dùng

Nếu query Bronze quá chậm, tạo MV:

```sql
-- MV cho Top Categories (Widget 3.6) - refresh daily
CREATE MATERIALIZED VIEW IF NOT EXISTS gold.mv_top_categories
REFRESH ASYNC START("2026-03-01 06:00:00") EVERY(INTERVAL 1 DAY)
AS
SELECT 
    event_date,
    app_id,
    REGEXP_REPLACE(event_name, '^browser_category_', '') AS category,
    SUM(event_count) AS clicks,
    SUM(unique_users) AS users
FROM silver.event_summary
WHERE event_name LIKE 'browser_category_%'
GROUP BY event_date, app_id, event_name;
```

---

## 3. Đề xuất cải thiện Data Model

### 3.1 Thêm columns vào `silver.geo`

Hiện tại `silver.geo.country` là full name. Đề xuất thêm `country_code`:

```sql
ALTER TABLE silver.geo ADD COLUMN country_code VARCHAR(10) DEFAULT '';
```

Và trong INSERT query (`FirebaseSilverGoldAggregator.cs`):

```sql
-- Lookup country_code từ dim_country
COALESCE(
    (SELECT country_code FROM silver.dim_country 
     WHERE country_name_firebase = get_json_string(geo_json, '$.country') LIMIT 1),
    ''
) AS country_code
```

### 3.2 Pre-aggregate impdau, arpdau vào Gold

Thay vì tính trong Superset, tính sẵn trong `gold.daily_overview`:

```sql
-- Đã có avg_sessions, avg_dur_min
-- Thêm:
impdau DOUBLE COMMENT 'ad_impressions / dau',
arpdau DOUBLE COMMENT 'total_rev / dau'  -- Cần data từ AdMob pipeline
```

### 3.3 Date Column Names - Xử lý bằng Alias

> **Quyết định:** Không sửa column name trong database để tránh ảnh hưởng các hệ thống khác. Thay vào đó, xử lý trong **Dataset/View** bằng alias.

| Table | Column gốc | Alias trong View/Dataset |
|-------|------------|--------------------------|
| `silver.engagement` | `event_date` | `event_date` ✅ |
| `silver.geo` | `event_date` | `event_date` ✅ |
| `silver.daily_app_revenue` | `date` | `AS event_date` |
| `gold.fact_daily_app_metrics` | `date` | `AS event_date` |
| `bronze.admob_table` | `date` | `AS event_date` |
| `bronze.mediation_table` | `date` | `AS event_date` |

---

## 4. Chi tiết Superset Datasets

### ⚠️ Quan trọng: App ID Mapping

Hệ thống có **2 loại App ID** từ 2 nguồn khác nhau:

| Nguồn | Column | Format | Ví dụ |
|-------|--------|--------|-------|
| **Firebase** | `app_id` / `firebase_id` | Snake case key | `ar_tracer_trace_drawing_ios` |
| **AdMob** | `app_id` / `admob_app_id` | AdMob format | `ca-app-pub-3940256099942544~1458002511` |

**Bảng nào dùng ID nào?**

| Layer | Table | `app_id` là |
|-------|-------|-------------|
| Bronze | `fb_*` | `firebase_id` (tên bảng) |
| Bronze | `admob_table` | `admob_app_id` |
| Bronze | `mediation_table` | `admob_app_id` |
| Silver | `engagement`, `geo`, `retention_cohort` | `firebase_id` |
| Silver | `daily_app_revenue` | `admob_app_id` |
| Silver | `dim_app_identifiers` | Cả hai (PK = `admob_app_id`, FK = `firebase_id`) |
| Gold | `daily_overview`, `retention_overview` | `firebase_id` |
| Gold | `content_engagement`, `onboarding_funnel` | `firebase_id` |
| Gold | `ad_performance`, `iap_performance` | `firebase_id` |
| Gold | `fact_daily_app_metrics` | **`admob_app_id`** ⚠️ |

**Quy tắc JOIN:**
```sql
-- Firebase tables với nhau: JOIN trực tiếp bằng app_id
FROM gold.daily_overview h
JOIN silver.engagement e ON h.app_id = e.app_id

-- Firebase với AdMob: PHẢI qua dim_app_identifiers
FROM gold.daily_overview h                          -- firebase_id
INNER JOIN silver.dim_app_identifiers d 
    ON d.firebase_id = h.app_id                     -- Map firebase → admob
LEFT JOIN gold.fact_daily_app_metrics f 
    ON f.app_id = d.admob_app_id                    -- JOIN bằng admob_app_id
    AND f.date = h.event_date

-- AdMob tables với nhau: JOIN trực tiếp bằng app_id
FROM bronze.mediation_table m
JOIN silver.daily_app_revenue r ON m.app_id = r.app_id
```

---

### 4.1 Dataset 1: `ds_daily_overview`

**Mục đích:** Dashboard 1 (Overview), Dashboard 11 (ROI)

> **Lưu ý quan trọng về App ID:**
> - `gold.daily_overview.app_id` = `firebase_id` (vd: `ar_tracer_trace_drawing_ios`)
> - `gold.fact_daily_app_metrics.app_id` = `admob_app_id` (vd: `ca-app-pub-xxx~yyy`)
> - Phải JOIN qua `dim_app_identifiers` để map: `firebase_id` → `admob_app_id`

```sql
-- Superset Virtual Dataset: ds_daily_overview
SELECT 
    h.event_date,
    h.app_id AS firebase_app_id,
    d.admob_app_id,
    d.display_name AS app_name,
    d.platform,
    
    -- Engagement metrics (Firebase - từ daily_overview)
    h.dau,
    h.new_users,
    h.dav,
    h.sessions,
    h.avg_sessions,
    h.avg_dur_min,
    e.total_engagement_msec,
    e.paying_users,
    
    -- Ad metrics (Firebase - từ daily_overview)
    h.ad_impressions,
    h.ad_clicks,
    h.ad_penetration,
    
    -- Revenue metrics (AdMob - từ fact_daily_app_metrics)
    -- JOIN qua d.admob_app_id, KHÔNG phải h.app_id
    f.total_revenue,
    f.total_impressions AS admob_impressions,
    f.ecpm,
    f.fill_rate,
    f.ua_cost,
    f.roi,
    
    -- Calculated
    ROUND(f.total_revenue / NULLIF(h.dau, 0), 4) AS arpdau,
    ROUND(f.total_impressions * 1.0 / NULLIF(h.dau, 0), 1) AS impdau
    
FROM gold.daily_overview h
LEFT JOIN silver.engagement e 
    ON h.event_date = e.event_date AND h.app_id = e.app_id
INNER JOIN silver.dim_app_identifiers d 
    ON d.firebase_id = h.app_id  -- Map: firebase_id từ daily_overview
LEFT JOIN gold.fact_daily_app_metrics f 
    ON f.date = h.event_date 
    AND f.app_id = d.admob_app_id  -- ⚠️ JOIN bằng admob_app_id!
```

**Columns & Metrics:**

| Column | Type | Description | Metric Expression |
|--------|------|-------------|-------------------|
| `event_date` | DATE | Ngày | - |
| `app_id` | STRING | Firebase App ID | - |
| `app_name` | STRING | Tên app | - |
| `dau` | BIGINT | Daily Active Users | `SUM(dau)` |
| `new_users` | BIGINT | New installs | `SUM(new_users)` |
| `sessions` | BIGINT | Total sessions | `SUM(sessions)` |
| `total_revenue` | DECIMAL | Revenue USD | `SUM(total_revenue)` |
| `arpdau` | DECIMAL | Revenue/DAU | `SUM(total_revenue)/SUM(dau)` |
| `ecpm` | DECIMAL | eCPM | `SUM(total_revenue)/SUM(admob_impressions)*1000` |
| `impdau` | DECIMAL | Impressions/DAU | `SUM(admob_impressions)/SUM(dau)` |

---

### 4.2 Dataset 2: `ds_retention_cohort`

**Mục đích:** Dashboard 2 (Retention)

```sql
-- Superset Virtual Dataset: ds_retention_cohort
SELECT 
    r.install_date,
    r.app_id,
    d.display_name AS app_name,
    r.retention_day,
    r.total_new_users,
    r.active_users,
    r.retention_rate,
    r.avg_play_time_min,
    r.total_ltv,
    r.impdau,
    
    -- Cohort detail
    c.total_engagement_msec,
    c.sessions
    
FROM gold.retention_overview r
LEFT JOIN silver.retention_cohort c 
    ON r.install_date = c.install_date 
    AND r.app_id = c.app_id 
    AND r.retention_day = c.retention_day
LEFT JOIN silver.dim_app_identifiers d 
    ON d.firebase_id = r.app_id
```

**Metrics:**

| Metric | Expression | Format |
|--------|------------|--------|
| D1 Retention | `AVG(CASE WHEN retention_day=1 THEN retention_rate END)` | % |
| D7 Retention | `AVG(CASE WHEN retention_day=7 THEN retention_rate END)` | % |
| D30 Retention | `AVG(CASE WHEN retention_day=30 THEN retention_rate END)` | % |
| Avg LTV | `AVG(total_ltv)` | $ |
| Cohort Size | `SUM(CASE WHEN retention_day=0 THEN total_new_users END)` | # |

---

### 4.3 Dataset 3: `ds_content_engagement`

**Mục đích:** Dashboard 3 (Content & Drawing)

```sql
-- Superset Virtual Dataset: ds_content_engagement
SELECT 
    ce.event_date,
    ce.app_id,
    d.display_name AS app_name,
    ce.country,
    c.country_code,
    c.region,
    c.tier,
    ce.dau,
    
    -- Slots mapped to content metrics
    ce.slot1_name,  -- drawing_start
    ce.slot1_users AS drawing_users,
    ce.slot1_count AS drawing_starts,
    
    ce.slot2_name,  -- drawing_complete
    ce.slot2_users AS complete_users,
    ce.slot2_count AS completions,
    
    ce.slot3_name,  -- lesson_start
    ce.slot3_users AS lesson_start_users,
    ce.slot3_count AS lesson_starts,
    
    ce.slot4_name,  -- lesson_complete
    ce.slot4_users AS lesson_complete_users,
    ce.slot4_count AS lesson_completions,
    
    ce.slot5_name,  -- template_start
    ce.slot5_users AS template_start_users,
    ce.slot5_count AS template_starts,
    
    ce.slot6_name,  -- pro_lesson
    ce.slot6_count AS pro_lessons,
    
    ce.slot7_name,  -- free_lesson
    ce.slot7_count AS free_lessons,
    
    ce.slot8_name,  -- magic_photo
    ce.slot8_users AS magic_photo_users,
    ce.slot8_count AS magic_photos,
    
    ce.slot9_name,  -- share
    ce.slot9_users AS share_users,
    ce.slot9_count AS shares,
    
    ce.slot10_name, -- capture
    ce.slot10_count AS captures,
    
    -- Calculated rates
    ce.rate1 AS drawing_rate,
    ce.rate2 AS completion_rate,
    ce.rate3 AS share_rate

FROM gold.content_engagement ce
LEFT JOIN silver.dim_country c ON ce.country = c.country_name_firebase
LEFT JOIN silver.dim_app_identifiers d ON d.firebase_id = ce.app_id
```

**Calculated Columns (Superset):**

| Name | SQL Expression |
|------|----------------|
| `drawing_rate` | `ROUND(drawing_users * 100.0 / NULLIF(dau, 0), 1)` |
| `completion_rate` | `ROUND(completions * 100.0 / NULLIF(drawing_starts, 0), 1)` |
| `lesson_completion_rate` | `ROUND(lesson_completions * 100.0 / NULLIF(lesson_starts, 0), 1)` |
| `pro_ratio` | `ROUND(pro_lessons * 100.0 / NULLIF(pro_lessons + free_lessons, 0), 1)` |
| `share_rate` | `ROUND(share_users * 100.0 / NULLIF(dau, 0), 2)` |

---

### 4.4 Dataset 4: `ds_ad_performance`

**Mục đích:** Dashboard 4 (IAA Firebase)

```sql
-- Superset Virtual Dataset: ds_ad_performance
SELECT 
    ap.event_date,
    ap.app_id,
    d.display_name AS app_name,
    ap.ad_format,
    ap.ad_placement,
    ap.country,
    c.country_name,
    c.region,
    c.tier,
    ap.retention_day,
    
    ap.active_users,
    ap.ad_users,
    ap.impressions,
    ap.clicks,
    ap.completes,
    ap.rewards,
    ap.requests,
    ap.load_fails,
    ap.ad_revenue,
    
    -- Pre-calculated
    ap.imp_per_ad_user,
    ap.reward_rate,
    
    -- Calculated
    ROUND(ap.ad_revenue / NULLIF(ap.impressions, 0) * 1000, 2) AS ecpm,
    ROUND(ap.clicks * 100.0 / NULLIF(ap.impressions, 0), 2) AS ctr,
    ROUND(ap.completes * 100.0 / NULLIF(ap.impressions, 0), 1) AS complete_rate,
    ROUND((ap.requests - ap.load_fails) * 100.0 / NULLIF(ap.requests, 0), 1) AS fill_rate,
    ROUND(ap.ad_users * 100.0 / NULLIF(ap.active_users, 0), 1) AS ad_penetration

FROM gold.ad_performance ap
LEFT JOIN silver.dim_country c ON ap.country = c.country_code
LEFT JOIN silver.dim_app_identifiers d ON d.firebase_id = ap.app_id
```

---

### 4.5 Dataset 5: `ds_iap_performance`

**Mục đích:** Dashboard 5 (IAP & Subscription)

```sql
-- Superset Virtual Dataset: ds_iap_performance
SELECT 
    ip.event_date,
    ip.app_id,
    d.display_name AS app_name,
    ip.country,
    c.country_name,
    c.region,
    c.tier,
    ip.device_model,
    ip.retention_day,
    
    ip.active_users,
    ip.iap_users,
    ip.iap_shows,
    ip.iap_clicks,
    ip.iap_open_views,
    ip.iap_open_pays,
    ip.iap_purchases,
    ip.iap_fails,
    ip.iap_closes,
    ip.iap_revenue_usd,
    
    ip.trial_starts,
    ip.trial_cancels,
    ip.trial_expires,
    ip.sub_upgrades,
    ip.sub_cancels,
    ip.sub_expires,
    ip.refunds,
    
    -- Pre-calculated
    ip.show_to_click_rate,
    ip.refund_rate,
    ip.arppu,
    
    -- Calculated
    ROUND(ip.iap_users * 100.0 / NULLIF(ip.active_users, 0), 2) AS pay_rate,
    ROUND(ip.iap_purchases * 100.0 / NULLIF(ip.iap_shows, 0), 2) AS conversion_rate,
    ROUND(ip.sub_upgrades * 100.0 / NULLIF(ip.trial_starts, 0), 2) AS trial_to_sub_rate

FROM gold.iap_performance ip
LEFT JOIN silver.dim_country c ON ip.country = c.country_code
LEFT JOIN silver.dim_app_identifiers d ON d.firebase_id = ip.app_id
```

---

### 4.6 Dataset 6: `ds_onboarding_funnel`

**Mục đích:** Dashboard 6 (Onboarding)

```sql
-- Superset Virtual Dataset: ds_onboarding_funnel
SELECT 
    of.event_date,
    of.app_id,
    d.display_name AS app_name,
    of.country,
    c.country_name,
    c.region,
    c.tier,
    
    of.step1_name, of.step1_users,
    of.step2_name, of.step2_users,
    of.step3_name, of.step3_users,
    of.step4_name, of.step4_users,
    of.step5_name, of.step5_users,
    of.step6_name, of.step6_users,
    of.step7_name, of.step7_users,
    of.step8_name, of.step8_users,
    of.completion_rate,
    
    -- Step-by-step drop rates
    ROUND((of.step1_users - of.step2_users) * 100.0 / NULLIF(of.step1_users, 0), 1) AS drop_1_2,
    ROUND((of.step2_users - of.step3_users) * 100.0 / NULLIF(of.step2_users, 0), 1) AS drop_2_3,
    ROUND((of.step3_users - of.step4_users) * 100.0 / NULLIF(of.step3_users, 0), 1) AS drop_3_4,
    ROUND((of.step4_users - of.step5_users) * 100.0 / NULLIF(of.step4_users, 0), 1) AS drop_4_5,
    ROUND((of.step5_users - of.step6_users) * 100.0 / NULLIF(of.step5_users, 0), 1) AS drop_5_6,
    ROUND((of.step6_users - of.step7_users) * 100.0 / NULLIF(of.step6_users, 0), 1) AS drop_6_7,
    ROUND((of.step7_users - of.step8_users) * 100.0 / NULLIF(of.step7_users, 0), 1) AS drop_7_8

FROM gold.onboarding_funnel of
LEFT JOIN silver.dim_country c ON of.country = c.country_name_firebase
LEFT JOIN silver.dim_app_identifiers d ON d.firebase_id = of.app_id
```

---

### 4.7 Dataset 7: `ds_revenue_country`

**Mục đích:** Dashboard 9 (Revenue), Dashboard 11 (ROI by Country)

```sql
-- Superset Virtual Dataset: ds_revenue_country
SELECT 
    r.date AS event_date,  -- Alias để thống nhất
    r.app_id AS admob_app_id,
    d.firebase_id AS app_id,
    d.display_name AS app_name,
    d.platform,
    
    r.country AS country_code,
    c.country_name,
    c.country_name_firebase,
    c.region,
    c.tier,
    
    r.total_revenue,
    r.total_impressions,
    r.total_ad_requests,
    r.total_matched_requests,
    r.ecpm,
    r.fill_rate,
    
    -- Join với geo để lấy user data
    g.dau,
    g.new_users,
    
    -- Calculated
    ROUND(r.total_revenue / NULLIF(g.dau, 0), 4) AS arpdau

FROM silver.daily_app_revenue r
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = r.app_id
LEFT JOIN silver.dim_country c ON r.country = c.country_code
LEFT JOIN silver.geo g 
    ON g.country = c.country_name_firebase 
    AND g.event_date = r.date 
    AND g.app_id = d.firebase_id
```

---

### 4.8 Dataset 8: `ds_mediation`

**Mục đích:** Dashboard 10 (Mediation & Waterfall)

```sql
-- Superset Virtual Dataset: ds_mediation
SELECT 
    m.date AS event_date,  -- Alias
    m.app_id AS admob_app_id,
    d.firebase_id AS app_id,
    d.display_name AS app_name,
    d.platform,
    
    m.country AS country_code,
    c.country_name,
    c.region,
    c.tier,
    
    m.ad_unit_id,
    m.ad_unit_name,
    m.format,
    m.ad_source_id,
    m.ad_source_name,
    m.ad_source_instance_id,
    m.ad_source_instance_name,
    m.mediation_group_id,
    m.mediation_group_name,
    
    m.ad_requests,
    m.matched_requests,
    m.impressions,
    m.impression_ctr,
    m.clicks,
    m.estimated_earnings,
    
    -- Calculated
    ROUND(m.estimated_earnings / NULLIF(m.impressions, 0) * 1000, 2) AS ecpm,
    ROUND(m.matched_requests * 100.0 / NULLIF(m.ad_requests, 0), 1) AS fill_rate,
    ROUND(m.impressions * 100.0 / NULLIF(SUM(m.impressions) OVER (PARTITION BY m.date, m.app_id, m.format), 0), 1) AS win_rate

FROM bronze.mediation_table m
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = m.app_id
LEFT JOIN silver.dim_country c ON m.country = c.country_code
```

---

### 4.9 Dataset 9: `ds_event_summary`

**Mục đích:** Dashboard 3 (Top Categories), Dashboard 7 (Feature Discovery)

```sql
-- Superset Virtual Dataset: ds_event_summary
SELECT 
    es.event_date,
    es.app_id,
    d.display_name AS app_name,
    es.event_name,
    es.event_count,
    es.unique_users,
    
    -- Event categorization
    CASE 
        WHEN es.event_name LIKE 'browser_category_%' THEN 'browse'
        WHEN es.event_name LIKE 'ad_%' THEN 'ad'
        WHEN es.event_name LIKE 'iap_%' THEN 'iap'
        WHEN es.event_name LIKE 'draw_%' OR es.event_name LIKE 'content_%' THEN 'drawing'
        WHEN es.event_name LIKE 'intro_%' OR es.event_name LIKE 'language_%' THEN 'onboarding'
        WHEN es.event_name LIKE 'magic_photo_%' THEN 'magic_photo'
        WHEN es.event_name LIKE '%share%' THEN 'share'
        ELSE 'other'
    END AS event_category,
    
    -- Clean category name for browse events
    CASE 
        WHEN es.event_name LIKE 'browser_category_%' 
        THEN REGEXP_REPLACE(es.event_name, '^browser_category_', '')
        ELSE NULL
    END AS browse_category

FROM silver.event_summary es
LEFT JOIN silver.dim_app_identifiers d ON d.firebase_id = es.app_id
```

---

## 5. Ad-hoc Filters Configuration

### 5.1 Filter: Time Range

| Property | Value |
|----------|-------|
| **Filter Type** | Time Range |
| **Column** | `event_date` |
| **Default** | Last 30 days |
| **Scope** | All dashboards |

### 5.2 Filter: App

| Property | Value |
|----------|-------|
| **Filter Type** | Select |
| **Column** | `app_name` (from `dim_app_identifiers`) |
| **Default** | AR Tracer |
| **Scope** | All dashboards |
| **Parent Filters** | None |

### 5.3 Filter: Country

| Property | Value |
|----------|-------|
| **Filter Type** | Select (Multi) |
| **Dataset** | `dim_country` |
| **Column** | `country_name` |
| **Default** | All |
| **Sort** | By `dau` DESC (cần cross-filter) |
| **Scope** | Dashboard 1, 9, 10, 11 |

### 5.4 Filter: Region

| Property | Value |
|----------|-------|
| **Filter Type** | Select (Multi) |
| **Dataset** | `dim_country` |
| **Column** | `region` |
| **Options** | APAC, EMEA, LATAM, NA, AFRICA |
| **Default** | All |
| **Scope** | Dashboard 9, 10, 11 |

### 5.5 Filter: Tier

| Property | Value |
|----------|-------|
| **Filter Type** | Select (Multi) |
| **Dataset** | `dim_country` |
| **Column** | `tier` |
| **Options** | T1, T2, T3 |
| **Default** | All |
| **Scope** | Dashboard 9, 10, 11 |

### 5.6 Filter: Ad Format

| Property | Value |
|----------|-------|
| **Filter Type** | Select (Multi) |
| **Column** | `ad_format` / `format` |
| **Options** | rewarded, interstitial, banner, native, app_open |
| **Default** | All |
| **Scope** | Dashboard 4, 10 |

### 5.7 Filter: Platform

| Property | Value |
|----------|-------|
| **Filter Type** | Select |
| **Column** | `platform` |
| **Options** | iOS, Android |
| **Default** | All |
| **Scope** | All dashboards |

### 5.8 Filter: Retention Day

| Property | Value |
|----------|-------|
| **Filter Type** | Select / Range |
| **Column** | `retention_day` |
| **Options** | 0, 1, 3, 7, 14, 30, 60, 90 |
| **Default** | 0-30 |
| **Scope** | Dashboard 2, 4, 5 |

---

## 6. Metrics Definitions

### 6.1 Core Metrics

| Metric Name | SQL Expression | Format | Dashboard |
|-------------|----------------|--------|-----------|
| `dau` | `SUM(dau)` | #,### | 1, 2 |
| `new_users` | `SUM(new_users)` | #,### | 1, 6 |
| `sessions` | `SUM(sessions)` | #,### | 1 |
| `total_revenue` | `SUM(total_revenue)` | $#,###.## | 1, 9, 11 |
| `total_impressions` | `SUM(total_impressions)` | #,### | 4, 9, 10 |

### 6.2 Calculated Metrics

| Metric Name | SQL Expression | Format |
|-------------|----------------|--------|
| `arpdau` | `SUM(total_revenue) / NULLIF(SUM(dau), 0)` | $0.0000 |
| `ecpm` | `SUM(total_revenue) / NULLIF(SUM(total_impressions), 0) * 1000` | $0.00 |
| `impdau` | `SUM(total_impressions) / NULLIF(SUM(dau), 0)` | 0.0 |
| `fill_rate` | `SUM(matched_requests) * 100.0 / NULLIF(SUM(ad_requests), 0)` | 0.0% |
| `ctr` | `SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0)` | 0.00% |

### 6.3 Retention Metrics

| Metric Name | SQL Expression | Format |
|-------------|----------------|--------|
| `d1_retention` | `AVG(CASE WHEN retention_day = 1 THEN retention_rate END)` | 0.0% |
| `d7_retention` | `AVG(CASE WHEN retention_day = 7 THEN retention_rate END)` | 0.0% |
| `d30_retention` | `AVG(CASE WHEN retention_day = 30 THEN retention_rate END)` | 0.0% |
| `avg_ltv` | `AVG(total_ltv)` | $0.0000 |

### 6.4 Content Metrics (AR Tracer specific)

| Metric Name | SQL Expression | Format |
|-------------|----------------|--------|
| `drawing_rate` | `SUM(drawing_users) * 100.0 / NULLIF(SUM(dau), 0)` | 0.0% |
| `completion_rate` | `SUM(completions) * 100.0 / NULLIF(SUM(drawing_starts), 0)` | 0.0% |
| `lesson_completion_rate` | `SUM(lesson_completions) * 100.0 / NULLIF(SUM(lesson_starts), 0)` | 0.0% |
| `share_rate` | `SUM(share_users) * 100.0 / NULLIF(SUM(dau), 0)` | 0.00% |

### 6.5 IAP Metrics

| Metric Name | SQL Expression | Format |
|-------------|----------------|--------|
| `pay_rate` | `SUM(iap_users) * 100.0 / NULLIF(SUM(active_users), 0)` | 0.00% |
| `arppu` | `SUM(iap_revenue_usd) / NULLIF(SUM(iap_users), 0)` | $0.00 |
| `trial_to_sub` | `SUM(sub_upgrades) * 100.0 / NULLIF(SUM(trial_starts), 0)` | 0.0% |
| `conversion_rate` | `SUM(iap_purchases) * 100.0 / NULLIF(SUM(iap_shows), 0)` | 0.00% |

---

## 7. StarRocks Views (Optional)

> Tạo views trong StarRocks để optimize complex queries. Superset có thể query trực tiếp views này.

### 7.1 View: `gold.v_daily_overview`

> **Lưu ý:** JOIN `fact_daily_app_metrics` qua `d.admob_app_id`, không phải `h.app_id`

```sql
CREATE VIEW IF NOT EXISTS gold.v_daily_overview AS
SELECT 
    h.event_date,
    h.app_id AS firebase_app_id,
    d.admob_app_id,
    d.display_name AS app_name,
    d.platform,
    h.dau,
    h.new_users,
    h.dav,
    h.sessions,
    h.avg_sessions,
    h.avg_dur_min,
    e.total_engagement_msec,
    e.paying_users,
    h.ad_impressions,
    h.ad_clicks,
    h.ad_penetration,
    f.total_revenue,
    f.total_impressions AS admob_impressions,
    f.ecpm,
    f.fill_rate,
    f.ua_cost,
    f.roi,
    ROUND(f.total_revenue / NULLIF(h.dau, 0), 4) AS arpdau,
    ROUND(f.total_impressions / NULLIF(h.dau, 0), 1) AS impdau
FROM gold.daily_overview h
LEFT JOIN silver.engagement e 
    ON h.event_date = e.event_date AND h.app_id = e.app_id
INNER JOIN silver.dim_app_identifiers d 
    ON d.firebase_id = h.app_id
LEFT JOIN gold.fact_daily_app_metrics f 
    ON f.date = h.event_date 
    AND f.app_id = d.admob_app_id;  -- ⚠️ JOIN bằng admob_app_id
```

### 7.2 View: `gold.v_revenue_country`

```sql
CREATE VIEW IF NOT EXISTS gold.v_revenue_country AS
SELECT 
    r.date AS event_date,
    d.firebase_id AS app_id,
    d.display_name AS app_name,
    d.platform,
    c.country_code,
    c.country_name,
    c.region,
    c.tier,
    r.total_revenue,
    r.total_impressions,
    r.ecpm,
    r.fill_rate,
    g.dau,
    g.new_users,
    ROUND(r.total_revenue / NULLIF(g.dau, 0), 4) AS arpdau
FROM silver.daily_app_revenue r
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = r.app_id
LEFT JOIN silver.dim_country c ON r.country = c.country_code
LEFT JOIN silver.geo g 
    ON g.country = c.country_name_firebase 
    AND g.event_date = r.date 
    AND g.app_id = d.firebase_id;
```

### 7.3 View: `gold.v_mediation_summary`

```sql
CREATE VIEW IF NOT EXISTS gold.v_mediation_summary AS
SELECT 
    m.date AS event_date,
    d.firebase_id AS app_id,
    d.display_name AS app_name,
    c.country_name,
    c.region,
    c.tier,
    m.format,
    m.ad_source_name,
    m.ad_unit_name,
    m.mediation_group_name,
    SUM(m.ad_requests) AS ad_requests,
    SUM(m.matched_requests) AS matched_requests,
    SUM(m.impressions) AS impressions,
    SUM(m.clicks) AS clicks,
    SUM(m.estimated_earnings) AS revenue,
    ROUND(SUM(m.estimated_earnings) / NULLIF(SUM(m.impressions), 0) * 1000, 2) AS ecpm,
    ROUND(SUM(m.matched_requests) * 100.0 / NULLIF(SUM(m.ad_requests), 0), 1) AS fill_rate
FROM bronze.mediation_table m
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = m.app_id
LEFT JOIN silver.dim_country c ON m.country = c.country_code
GROUP BY m.date, d.firebase_id, d.display_name, c.country_name, c.region, c.tier, 
         m.format, m.ad_source_name, m.ad_unit_name, m.mediation_group_name;
```

---

## 8. Caching Strategy

### 8.1 Dataset Cache Configuration

| Dataset | Cache Timeout | Reason |
|---------|---------------|--------|
| `ds_daily_overview` | 4 hours | T-1 data, updated daily |
| `ds_retention_cohort` | 4 hours | T-1 data |
| `ds_content_engagement` | 4 hours | T-1 data |
| `ds_ad_performance` | 4 hours | T-1 data |
| `ds_iap_performance` | 4 hours | T-1 data |
| `ds_onboarding_funnel` | 4 hours | T-1 data |
| `ds_revenue_country` | 1 hour | Revenue data cần fresh hơn |
| `ds_mediation` | 1 hour | Revenue data cần fresh hơn |
| `ds_event_summary` | 4 hours | T-1 data |

### 8.2 Dashboard Cache

| Dashboard | Cache Timeout | Auto Refresh |
|-----------|---------------|--------------|
| 1. Overview | 4 hours | 06:00 UTC |
| 2. Retention | 4 hours | 06:00 UTC |
| 3. Content | 4 hours | 06:00 UTC |
| 4. IAA | 4 hours | 06:00 UTC |
| 5. IAP | 4 hours | 06:00 UTC |
| 6. Onboarding | 4 hours | 06:00 UTC |
| 7. Drop-off | 24 hours | 06:00 UTC |
| 8. Attribution | 24 hours | 06:00 UTC |
| 9. Revenue | 1 hour | Hourly |
| 10. Mediation | 1 hour | Hourly |
| 11. ROI | 4 hours | 06:00 UTC |

---

## 9. Action Items - Updated

### Immediate (P0) - ✅ Done
- [x] Thêm DDL `silver.dim_country` vào `StarRocksSchemaInitializer.cs`
- [x] Tạo file seed `dim_country_seed.sql` với 220+ countries
- [x] Tạo file analysis `country_mapping_analysis.md`
- [x] Update Widget 1.3, 10.4 trong `AR_Tracer_StarRocks_Detail.md`

### Short-term (P1) - In Progress
- [ ] **Chạy seed SQL**: Execute `dim_country_seed.sql` trong StarRocks
- [ ] **Tạo 9 Virtual Datasets** trong Superset (xem Section 4)
- [ ] **Cấu hình 8 Ad-hoc Filters** (xem Section 5)
- [ ] **Định nghĩa Metrics** trong mỗi Dataset (xem Section 6)

### Medium-term (P2)
- [ ] **Tạo 3 StarRocks Views** (xem Section 7)
- [ ] **Cấu hình Caching** (xem Section 8)
- [ ] **Evaluate MV** cho Bronze-heavy queries (Dashboard 7, 8)
- [ ] **Tạo Dashboard Templates** trong Superset

### Long-term (P3)
- [ ] **Alert rules** cho KPI drops (DAU -10%, Revenue -15%)
- [ ] **Scheduled Reports** (Daily/Weekly email)
- [ ] **User permissions** (Marketing vs Product vs Mediation views)
- [ ] **Documentation** cho end-users

---

## 10. Appendix: Date Column Alias Cheatsheet

| Source Table | Original Column | Use In Dataset |
|--------------|-----------------|----------------|
| `gold.daily_overview` | `event_date` | `event_date` |
| `silver.engagement` | `event_date` | `event_date` |
| `silver.geo` | `event_date` | `event_date` |
| `silver.retention_cohort` | `install_date` | `install_date` |
| `gold.retention_overview` | `install_date` | `install_date` |
| `silver.daily_app_revenue` | `date` | `date AS event_date` |
| `gold.fact_daily_app_metrics` | `date` | `date AS event_date` |
| `bronze.admob_table` | `date` | `date AS event_date` |
| `bronze.mediation_table` | `date` | `date AS event_date` |
| `gold.content_engagement` | `event_date` | `event_date` |
| `gold.onboarding_funnel` | `event_date` | `event_date` |
| `gold.ad_performance` | `event_date` | `event_date` |
| `gold.iap_performance` | `event_date` | `event_date` |
| `silver.event_summary` | `event_date` | `event_date` |
