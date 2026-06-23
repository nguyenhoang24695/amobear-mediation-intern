# MCP / Claude — AR Tracer (export query + bộ Q1–Q20)

> **Canonical spec:** [`02 - AR_Tracer_Insight_Complete_Guideline.md`](../02%20-%20AR_Tracer_Insight_Complete_Guideline.md) §B · **Matrix:** [`AR_Tracer_Q1_Q20_Verification_Matrix.md`](../AR_Tracer_Q1_Q20_Verification_Matrix.md)  
> **Schema tham chiếu:** `FirebaseSilverGoldTableManager` (`gold.ad_performance`, `gold.iap_performance`, `gold.daily_overview`), `StarRocksSchemaInitializer` (`bronze.mediation_table`).

## Tham số cố định (giống export Claude của bạn)

| Biến | Giá trị mẫu |
|------|-------------|
| AdMob `app_id` | `ca-app-pub-9820030150756925~6704748105` |
| Firebase bronze table | `bronze.fb_ar_tracer_trace_drawing_ios` |
| `firebase_id` (dim) | `ar_tracer_trace_drawing_ios` |
| Cửa sổ 15 ngày | `2026-03-25` … `2026-04-08` |
| Cửa sổ 35 ngày (retention) | `2026-03-05` … `2026-04-08` |
| Cửa sổ 7 ngày | `2026-04-02` … `2026-04-08` |

## Sửa lỗi cột (so với export cũ)

| Query cũ | Lỗi | Cách sửa |
|----------|-----|----------|
| SoW mediation (block đầu) | Không có `ad_format` | Cột đúng là **`format`** (AdMob API). Dùng `` `format` AS ad_format `` nếu cần tên hiển thị. |
| `gold.ad_performance` | Không có `total_impressions`, `total_ad_requests` | Cột gốc: **`impressions`**, **`requests`**. Rollup theo ngày: `SUM(impressions)`, `SUM(requests)` (và tính lại `ecpm` / `fill_rate`). |
| `gold.iap_performance` | Không có `paying_users`, `transactions` | Cột gốc: **`iap_users`**, **`iap_purchases`**. Bảng có grain **country / device_model** → cần **`GROUP BY event_date, app_id`** để một dòng mỗi ngày (rollup; `SUM(iap_users)` là tổng slice địa lý, không phải distinct user toàn cầu — với số unique dùng bronze Q9). |

---

## A) Export gốc — đã chỉnh để chạy được trên StarRocks

```sql
-- A1 / SoW mediation by day × source × format (đã sửa: format thay cho ad_format)
SELECT
  `date`,
  ad_source_id,
  ad_source_name,
  `format` AS ad_format,
  SUM(estimated_earnings) AS total_revenue,
  SUM(impressions) AS total_impressions,
  SUM(matched_requests) AS matched_requests,
  SUM(ad_requests) AS ad_requests
FROM bronze.mediation_table
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND `date` BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY `date`, ad_source_id, ad_source_name, `format`
ORDER BY `date` DESC, total_revenue DESC
LIMIT 200;
```

```sql
-- A2: DAU từ session_start (bronze)
SELECT
  event_date,
  COUNT(DISTINCT user_pseudo_id) AS dau,
  COUNT(*) AS total_events
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND event_name = 'session_start'
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 20;
```

```sql
-- A3: Sự kiện theo ngày (diagnostic)
SELECT
  event_date,
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_pseudo_id) AS unique_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY event_date, event_name
ORDER BY event_date DESC, event_count DESC
LIMIT 300;
```

```sql
-- A4: gold.daily_overview (app_id = admob_app_id)
SELECT
  event_date,
  app_id,
  dau,
  new_users,
  dav,
  sessions,
  iap_rev,
  iaa_rev,
  total_rev,
  arpdau,
  ad_penetration
FROM gold.daily_overview
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND event_date BETWEEN '2026-03-25' AND '2026-04-08'
ORDER BY event_date DESC
LIMIT 20;
```

```sql
-- A5: gold.ad_performance — rollup app × ngày (đã sửa tên cột + GROUP BY)
SELECT
  event_date,
  app_id,
  SUM(ad_revenue) AS ad_revenue,
  ROUND(SUM(ad_revenue) * 1000.0 / NULLIF(SUM(impressions), 0), 2) AS ecpm,
  ROUND((SUM(requests) - SUM(load_fails)) * 100.0 / NULLIF(SUM(requests), 0), 1) AS fill_rate,
  SUM(impressions) AS total_impressions,
  SUM(requests) AS total_ad_requests
FROM gold.ad_performance
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND event_date BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY event_date, app_id
ORDER BY event_date DESC
LIMIT 20;
```

```sql
-- A6: gold.iap_performance — rollup app × ngày (đã sửa: iap_users, iap_purchases)
SELECT
  event_date,
  app_id,
  SUM(iap_revenue_usd) AS iap_revenue_usd,
  ROUND(SUM(iap_users) * 100.0 / NULLIF(SUM(active_users), 0), 2) AS pay_rate,
  ROUND(SUM(iap_revenue_usd) / NULLIF(SUM(iap_users), 0), 2) AS arppu,
  SUM(iap_users) AS iap_users,
  SUM(iap_purchases) AS iap_purchases
FROM gold.iap_performance
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND event_date BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY event_date, app_id
ORDER BY event_date DESC
LIMIT 20;
```

```sql
-- A7: gold.retention_overview
SELECT
  event_date,
  app_id,
  install_date,
  retention_day,
  retention_rate,
  total_new_users,
  active_users
FROM gold.retention_overview
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND event_date = '2026-04-08'
  AND retention_day IN (1, 3, 7, 14, 30)
ORDER BY install_date DESC, retention_day ASC
LIMIT 50;
```

```sql
-- A8: silver.daily_app_revenue
SELECT
  `date`,
  app_id,
  platform,
  country,
  total_revenue,
  total_impressions,
  ecpm,
  fill_rate
FROM silver.daily_app_revenue
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND `date` BETWEEN '2026-03-25' AND '2026-04-08'
ORDER BY `date` DESC, total_revenue DESC
LIMIT 100;
```

---

## B) Bộ đủ **Q1–Q20** (đồng bộ guideline §B, đổi `CURDATE()` → literal)

> **Q20** chạy trên **Postgres** (app DB), không phải StarRocks.  
> Các Q còn lại: StarRocks. Luôn ưu tiên JOIN `silver.dim_app_identifiers` khi filter theo `firebase_id`.

### Q1 — `gold.fact_daily_app_metrics` (revenue / requests / fill / UA)

```sql
SELECT
  f.`date` AS report_date,
  f.total_revenue,
  f.ecpm,
  f.fill_rate,
  f.total_impressions AS impressions,
  f.total_ad_requests,
  f.total_matched_requests,
  f.ua_cost,
  f.roi,
  f.dau,
  f.dav,
  f.arpdau
FROM gold.fact_daily_app_metrics f
JOIN silver.dim_app_identifiers d ON d.admob_app_id = f.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND f.`date` BETWEEN '2026-03-25' AND '2026-04-08'
ORDER BY f.`date`;
```

### Q2 — `gold.daily_overview`

```sql
SELECT
  o.event_date,
  o.dau,
  o.new_users,
  o.dav,
  o.sessions,
  o.avg_sessions,
  o.avg_dur_min,
  o.ad_penetration
FROM gold.daily_overview o
JOIN silver.dim_app_identifiers d ON d.admob_app_id = o.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND o.event_date BETWEEN '2026-03-25' AND '2026-04-08'
ORDER BY o.event_date;
```

### Q3 — SoW by ad source (mediation)

```sql
SELECT
  a.ad_source_name,
  SUM(a.estimated_earnings) AS revenue,
  SUM(a.impressions) AS impressions,
  ROUND(SUM(a.estimated_earnings) / NULLIF(SUM(a.impressions), 0) * 1000, 2) AS ecpm
FROM bronze.mediation_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY a.ad_source_name
ORDER BY revenue DESC
LIMIT 10;
```

### Q4 — Revenue by ad unit (`bronze.admob_table`)

```sql
SELECT
  a.ad_unit_name,
  a.format,
  SUM(a.estimated_earnings) AS revenue,
  SUM(a.impressions) AS impressions
FROM bronze.admob_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY a.ad_unit_name, a.format
ORDER BY revenue DESC
LIMIT 5;
```

### Q5 — DAU / DAV / sessions (bronze — đầy đủ hơn A2)

```sql
SELECT
  event_date,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('session_start', 'user_engagement')
    THEN user_pseudo_id END) AS dau,
  COUNT(DISTINCT CASE
    WHEN event_name = 'first_open'
    THEN user_pseudo_id END) AS new_users,
  COUNT(DISTINCT CASE
    WHEN event_name LIKE 'ad_impression%'
    THEN user_pseudo_id END) AS dav,
  COUNT(DISTINCT CASE
    WHEN event_name = 'session_start'
    THEN CONCAT(user_pseudo_id, '_',
      COALESCE(get_json_string(event_params_json, '$.ga_session_id'), ''))
    END) AS sessions,
  SUM(CASE
    WHEN event_name = 'user_engagement'
    THEN CAST(COALESCE(
      get_json_string(event_params_json, '$.engagement_time_msec.int_value'),
      get_json_string(event_params_json, '$.engagement_time_msec'), '0') AS BIGINT)
    ELSE 0 END) AS total_engagement_msec,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('in_app_purchase', 'iap_purchase')
    THEN user_pseudo_id END) AS paying_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY event_date
ORDER BY event_date;
```

### Q6 — Retention cohort (bronze)

```sql
WITH cohort_users AS (
  SELECT DISTINCT install_date, user_pseudo_id
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_name = 'first_open'
    AND event_date BETWEEN '2026-03-05' AND '2026-04-08'
),
d0_users AS (
  SELECT install_date, COUNT(*) AS d0_users
  FROM cohort_users
  GROUP BY install_date
),
activity AS (
  SELECT b.install_date, b.retention_day, b.user_pseudo_id
  FROM bronze.fb_ar_tracer_trace_drawing_ios b
  INNER JOIN cohort_users c
    ON b.user_pseudo_id = c.user_pseudo_id AND b.install_date = c.install_date
  WHERE b.event_name IN ('session_start', 'user_engagement')
    AND b.event_date BETWEEN '2026-03-05' AND '2026-04-08'
    AND b.retention_day IN (0, 1, 3, 7, 14, 30)
)
SELECT
  a.install_date,
  a.retention_day,
  d.d0_users,
  COUNT(DISTINCT a.user_pseudo_id) AS active_users,
  LEAST(
    ROUND(COUNT(DISTINCT a.user_pseudo_id) * 100.0 / NULLIF(d.d0_users, 0), 1),
    100.0
  ) AS retention_rate
FROM activity a
JOIN d0_users d ON a.install_date = d.install_date
GROUP BY a.install_date, a.retention_day, d.d0_users
ORDER BY a.install_date, a.retention_day;
```

### Q7 — Drawing & content

```sql
SELECT
  event_date,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('draw_with_lesson', 'draw_with_template',
      'content_draw', 'lessons_drawing',
      'lessons_free_start_drawing', 'lessons_Pro_start_drawing')
    THEN user_pseudo_id END) AS drawing_users,
  SUM(CASE
    WHEN event_name IN ('draw_finish_with_lesson',
      'draw_finish_with_template', 'content_done')
    THEN 1 ELSE 0 END) AS drawing_completions,
  SUM(CASE WHEN event_name = 'lessons_Pro_start_drawing' THEN 1 ELSE 0 END) AS pro_lessons,
  SUM(CASE WHEN event_name = 'lessons_free_start_drawing' THEN 1 ELSE 0 END) AS free_lessons,
  SUM(CASE WHEN event_name = 'draw_with_template' THEN 1 ELSE 0 END) AS template_starts,
  SUM(CASE WHEN event_name = 'draw_finish_with_template' THEN 1 ELSE 0 END) AS template_completions,
  COUNT(DISTINCT CASE WHEN event_name = 'magic_photo_draw' THEN user_pseudo_id END) AS magic_photo_users,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('preview_share', 'preview_lesson_share',
      'preview_template_share', 'my_creative_share')
    THEN user_pseudo_id END) AS share_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND event_name IN (
    'draw_with_lesson', 'draw_with_template', 'content_draw', 'lessons_drawing',
    'lessons_free_start_drawing', 'lessons_Pro_start_drawing',
    'draw_finish_with_lesson', 'draw_finish_with_template', 'content_done',
    'magic_photo_draw',
    'preview_share', 'preview_lesson_share', 'preview_template_share', 'my_creative_share'
  )
GROUP BY event_date
ORDER BY event_date;
```

### Q8 — Onboarding funnel

```sql
SELECT
  event_date,
  COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS step1_install,
  COUNT(DISTINCT CASE WHEN event_name = 'language_choose' THEN user_pseudo_id END) AS step2_language,
  COUNT(DISTINCT CASE WHEN event_name = 'intro_next_click' THEN user_pseudo_id END) AS step3_intro,
  COUNT(DISTINCT CASE WHEN event_name = 'intro_category_choose' THEN user_pseudo_id END) AS step4_category,
  COUNT(DISTINCT CASE WHEN event_name = 'intro_user_level_choose' THEN user_pseudo_id END) AS step5_level,
  COUNT(DISTINCT CASE WHEN event_name = 'intro_user_age_choose' THEN user_pseudo_id END) AS step6_age,
  COUNT(DISTINCT CASE WHEN event_name = 'intro_iap' THEN user_pseudo_id END) AS step7_iap,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp')
    THEN user_pseudo_id END) AS step8_complete
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND event_name IN (
    'first_open', 'language_choose', 'intro_next_click', 'intro_category_choose',
    'intro_user_level_choose', 'intro_user_age_choose', 'intro_iap',
    'end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp'
  )
GROUP BY event_date
ORDER BY event_date;
```

### Q9 — IAP funnel + subscription (bronze)

```sql
SELECT
  event_date,
  SUM(CASE WHEN event_name = 'iap_show' THEN 1 ELSE 0 END) AS iap_shows,
  SUM(CASE WHEN event_name = 'iap_click' THEN 1 ELSE 0 END) AS iap_clicks,
  SUM(CASE WHEN event_name = 'iap_open_view' THEN 1 ELSE 0 END) AS iap_views,
  SUM(CASE WHEN event_name = 'iap_open_pay' THEN 1 ELSE 0 END) AS iap_pays,
  SUM(CASE WHEN event_name IN ('iap_purchase', 'in_app_purchase') THEN 1 ELSE 0 END) AS iap_purchases,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('iap_purchase', 'in_app_purchase')
    THEN user_pseudo_id END) AS iap_users,
  SUM(CASE WHEN event_name IN ('in_app_purchase', 'iap_purchase')
    THEN CAST(COALESCE(get_json_string(raw_event_json, '$.event_value_in_usd'), '0') AS DOUBLE)
    ELSE 0 END) AS iap_revenue_usd,
  SUM(CASE WHEN event_name = 'trial_started' THEN 1 ELSE 0 END) AS trial_starts,
  SUM(CASE WHEN event_name = 'subscription_upgraded' THEN 1 ELSE 0 END) AS sub_upgrades,
  SUM(CASE WHEN event_name = 'trial_canceled' THEN 1 ELSE 0 END) AS trial_cancels,
  SUM(CASE WHEN event_name = 'subscription_canceled' THEN 1 ELSE 0 END) AS sub_cancels,
  SUM(CASE WHEN event_name = 'refund' THEN 1 ELSE 0 END) AS refunds
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND event_name IN (
    'iap_show', 'iap_click', 'iap_open_view', 'iap_open_pay',
    'iap_purchase', 'in_app_purchase', 'iap_fail_purchase', 'iap_close',
    'trial_started', 'trial_still_active', 'subscription_upgraded',
    'trial_canceled', 'trial_expired', 'subscription_canceled', 'refund'
  )
GROUP BY event_date
ORDER BY event_date;
```

### Q10 — D0 activation

```sql
SELECT
  event_date,
  COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS installs,
  COUNT(DISTINCT CASE
    WHEN event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
      AND retention_day = 0
    THEN user_pseudo_id END) AS d0_drawers,
  ROUND(
    COUNT(DISTINCT CASE
      WHEN event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
        AND retention_day = 0
      THEN user_pseudo_id END) * 100.0 /
    NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END), 0), 1
  ) AS d0_activation_rate
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND event_name IN ('first_open', 'draw_with_lesson', 'draw_with_template', 'content_draw')
GROUP BY event_date
ORDER BY event_date;
```

### Q11a — Ad events by name

```sql
SELECT
  event_name,
  COUNT(*) AS cnt,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  AND (event_name LIKE 'ad_%' OR event_name LIKE 'banner_%')
GROUP BY event_name
ORDER BY cnt DESC;
```

### Q11b — Format từ params (`ad_impression_custom`)

```sql
SELECT
  get_json_string(event_params_json, '$.ad_format') AS ad_format,
  COUNT(*) AS cnt,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  AND event_name = 'ad_impression_custom'
GROUP BY get_json_string(event_params_json, '$.ad_format')
ORDER BY cnt DESC;
```

### Q12 — Top events

```sql
SELECT
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_pseudo_id) AS unique_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 50;
```

### Q13 — XMP UA cost

```sql
SELECT
  x.`date`, x.module, SUM(x.cost) AS daily_cost
FROM bronze.xmp_report x
INNER JOIN silver.dim_app_identifiers d
  ON UPPER(TRIM(COALESCE(d.platform, ''))) = UPPER(TRIM(COALESCE(x.os, '')))
  AND (d.package_name = x.store_package_id OR d.package_name = x.product_id
  OR (d.app_store_id != '' AND d.app_store_id != '0'
    AND (d.app_store_id = x.product_id OR d.app_store_id = x.store_package_id
         OR x.store_package_id = CONCAT('id', d.app_store_id))))
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND x.`date` BETWEEN '2026-03-25' AND '2026-04-08'
GROUP BY x.`date`, x.module
ORDER BY x.`date`, daily_cost DESC;
```

### Q14 — AppsFlyer installs by network

```sql
SELECT
  install_date AS report_date,
  COALESCE(NULLIF(TRIM(media_source), ''), 'Unknown') AS network,
  COUNT(*) AS installs,
  COALESCE(SUM(COALESCE(cost_value, 0)), 0) AS cost
FROM bronze.appsflyer_installs_raw af
WHERE install_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND (
    af.app_id = (SELECT package_name FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
    OR af.app_id = CONCAT('id', (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1))
    OR af.app_id = (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
  )
GROUP BY install_date, COALESCE(NULLIF(TRIM(media_source), ''), 'Unknown')
ORDER BY installs DESC;
```

### Q15 — Organic vs paid (AppsFlyer)

```sql
SELECT bucket AS attribution, installs,
  ROUND(installs * 100.0 / SUM(installs) OVER (), 1) AS pct
FROM (
  SELECT CASE
    WHEN LOWER(TRIM(COALESCE(media_source, ''))) IN ('organic', 'restricted') THEN 'Organic'
    ELSE 'Non-organic'
  END AS bucket,
  COUNT(*) AS installs
  FROM bronze.appsflyer_installs_raw af
  WHERE install_date BETWEEN '2026-03-25' AND '2026-04-08'
    AND (
      af.app_id = (SELECT package_name FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
      OR af.app_id = CONCAT('id', (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1))
      OR af.app_id = (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
    )
  GROUP BY CASE
    WHEN LOWER(TRIM(COALESCE(media_source, ''))) IN ('organic', 'restricted') THEN 'Organic'
    ELSE 'Non-organic'
  END
) t
ORDER BY installs DESC;
```

### Q16 — DAU + drawing + IAP by country (top 5 by DAU)

```sql
WITH country_dau AS (
  SELECT
    get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT CASE
      WHEN event_name IN ('session_start', 'user_engagement')
      THEN user_pseudo_id END) AS total_dau
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  GROUP BY get_json_string(geo_json, '$.country')
  ORDER BY total_dau DESC
  LIMIT 5
)
SELECT
  get_json_string(b.geo_json, '$.country') AS country,
  b.event_date,
  COUNT(DISTINCT CASE
    WHEN b.event_name IN ('session_start', 'user_engagement')
    THEN b.user_pseudo_id END) AS dau,
  COUNT(DISTINCT CASE
    WHEN b.event_name = 'first_open'
    THEN b.user_pseudo_id END) AS new_users,
  COUNT(DISTINCT CASE
    WHEN b.event_name IN ('draw_with_lesson', 'draw_with_template',
      'content_draw', 'lessons_drawing',
      'lessons_free_start_drawing', 'lessons_Pro_start_drawing')
    THEN b.user_pseudo_id END) AS drawing_users,
  SUM(CASE
    WHEN b.event_name IN ('draw_finish_with_lesson',
      'draw_finish_with_template', 'content_done')
    THEN 1 ELSE 0 END) AS drawing_completions,
  COUNT(DISTINCT CASE
    WHEN b.event_name LIKE 'ad_impression%'
    THEN b.user_pseudo_id END) AS dav,
  SUM(CASE WHEN b.event_name LIKE 'ad_impression%' THEN 1 ELSE 0 END) AS ad_impressions,
  COUNT(DISTINCT CASE
    WHEN b.event_name IN ('iap_purchase', 'in_app_purchase')
    THEN b.user_pseudo_id END) AS iap_users,
  SUM(CASE WHEN b.event_name = 'trial_started' THEN 1 ELSE 0 END) AS trial_starts,
  SUM(CASE WHEN b.event_name = 'subscription_upgraded' THEN 1 ELSE 0 END) AS sub_upgrades
FROM bronze.fb_ar_tracer_trace_drawing_ios b
WHERE b.event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
  AND b.event_name IN (
    'session_start', 'user_engagement', 'first_open',
    'draw_with_lesson', 'draw_with_template', 'content_draw', 'lessons_drawing',
    'lessons_free_start_drawing', 'lessons_Pro_start_drawing',
    'draw_finish_with_lesson', 'draw_finish_with_template', 'content_done',
    'ad_impression', 'ad_impression1', 'ad_impression2', 'ad_impression3',
    'ad_impression4', 'ad_impression_custom',
    'iap_purchase', 'in_app_purchase', 'trial_started', 'subscription_upgraded'
  )
GROUP BY get_json_string(b.geo_json, '$.country'), b.event_date
ORDER BY country, b.event_date;
```

### Q17 — Onboarding funnel by top 5 countries

```sql
WITH country_dau AS (
  SELECT get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT CASE WHEN event_name IN ('session_start', 'user_engagement')
      THEN user_pseudo_id END) AS total_dau
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  GROUP BY get_json_string(geo_json, '$.country')
  ORDER BY total_dau DESC
  LIMIT 3
)
SELECT
  get_json_string(b.geo_json, '$.country') AS country,
  COUNT(DISTINCT CASE WHEN b.event_name = 'first_open' THEN b.user_pseudo_id END) AS step1_install,
  COUNT(DISTINCT CASE WHEN b.event_name = 'language_choose' THEN b.user_pseudo_id END) AS step2_language,
  COUNT(DISTINCT CASE WHEN b.event_name = 'intro_next_click' THEN b.user_pseudo_id END) AS step3_intro,
  COUNT(DISTINCT CASE WHEN b.event_name = 'intro_category_choose' THEN b.user_pseudo_id END) AS step4_category,
  COUNT(DISTINCT CASE WHEN b.event_name = 'intro_user_level_choose' THEN b.user_pseudo_id END) AS step5_level,
  COUNT(DISTINCT CASE WHEN b.event_name = 'intro_user_age_choose' THEN b.user_pseudo_id END) AS step6_age,
  COUNT(DISTINCT CASE WHEN b.event_name = 'intro_iap' THEN b.user_pseudo_id END) AS step7_iap,
  COUNT(DISTINCT CASE
    WHEN b.event_name IN ('end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp')
    THEN b.user_pseudo_id END) AS step8_complete
FROM bronze.fb_ar_tracer_trace_drawing_ios b
WHERE b.event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
  AND b.event_name IN (
    'first_open', 'language_choose', 'intro_next_click', 'intro_category_choose',
    'intro_user_level_choose', 'intro_user_age_choose', 'intro_iap',
    'end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp'
  )
GROUP BY get_json_string(b.geo_json, '$.country')
ORDER BY step1_install DESC;
```

### Q18 — Retention by top 5 countries (denominator-safe)

```sql
WITH country_dau AS (
  SELECT get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT CASE WHEN event_name IN ('session_start', 'user_engagement')
      THEN user_pseudo_id END) AS total_dau
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  GROUP BY get_json_string(geo_json, '$.country')
  ORDER BY total_dau DESC
  LIMIT 3
),
cohort_users AS (
  SELECT
    get_json_string(geo_json, '$.country') AS country,
    install_date,
    user_pseudo_id
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_name = 'first_open'
    AND event_date BETWEEN '2026-03-05' AND '2026-04-08'
    AND get_json_string(geo_json, '$.country') IN (SELECT country FROM country_dau)
  GROUP BY get_json_string(geo_json, '$.country'), install_date, user_pseudo_id
),
d0_counts AS (
  SELECT country, install_date, COUNT(*) AS d0_users
  FROM cohort_users
  GROUP BY country, install_date
),
activity AS (
  SELECT
    get_json_string(b.geo_json, '$.country') AS country,
    b.install_date,
    b.retention_day,
    b.user_pseudo_id
  FROM bronze.fb_ar_tracer_trace_drawing_ios b
  INNER JOIN cohort_users c
    ON b.user_pseudo_id = c.user_pseudo_id
    AND b.install_date = c.install_date
    AND get_json_string(b.geo_json, '$.country') = c.country
  WHERE b.event_name IN ('session_start', 'user_engagement')
    AND b.event_date BETWEEN '2026-03-05' AND '2026-04-08'
    AND b.retention_day IN (0, 1, 3, 7, 14)
    AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
),
per_cell AS (
  SELECT a.country, a.install_date, a.retention_day, d.d0_users,
    COUNT(DISTINCT a.user_pseudo_id) AS active_users
  FROM activity a
  JOIN d0_counts d ON a.country = d.country AND a.install_date = d.install_date
  GROUP BY a.country, a.install_date, a.retention_day, d.d0_users
)
SELECT country, retention_day,
  SUM(d0_users) AS total_d0,
  SUM(active_users) AS active_users,
  ROUND(SUM(active_users) * 100.0 / NULLIF(SUM(d0_users), 0), 1) AS retention_rate
FROM per_cell
GROUP BY country, retention_day
ORDER BY country, retention_day;
```

### Q19 — D0 activation by top 3 countries

```sql
WITH country_dau AS (
  SELECT get_json_string(geo_json, '$.country') AS country,
    COUNT(DISTINCT CASE WHEN event_name IN ('session_start', 'user_engagement')
      THEN user_pseudo_id END) AS total_dau
  FROM bronze.fb_ar_tracer_trace_drawing_ios
  WHERE event_date BETWEEN '2026-04-02' AND '2026-04-08'
  GROUP BY get_json_string(geo_json, '$.country')
  ORDER BY total_dau DESC
  LIMIT 3
)
SELECT
  get_json_string(b.geo_json, '$.country') AS country,
  COUNT(DISTINCT CASE WHEN b.event_name = 'first_open' THEN b.user_pseudo_id END) AS installs,
  COUNT(DISTINCT CASE
    WHEN b.event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
      AND b.retention_day = 0
    THEN b.user_pseudo_id END) AS d0_drawers,
  ROUND(COUNT(DISTINCT CASE
    WHEN b.event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
      AND b.retention_day = 0
    THEN b.user_pseudo_id END) * 100.0 /
    NULLIF(COUNT(DISTINCT CASE WHEN b.event_name = 'first_open' THEN b.user_pseudo_id END), 0), 1
  ) AS d0_activation_rate
FROM bronze.fb_ar_tracer_trace_drawing_ios b
WHERE b.event_date BETWEEN '2026-03-25' AND '2026-04-08'
  AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
  AND b.event_name IN ('first_open', 'draw_with_lesson', 'draw_with_template', 'content_draw')
GROUP BY get_json_string(b.geo_json, '$.country')
ORDER BY installs DESC;
```

### Q20 — Postgres: T+1 actions

```sql
-- Chạy trên Postgres (MediationPro DB), không dùng StarRocks MCP.
SELECT
  i.actions_json,
  i.dimension_scores_json,
  i.health_score,
  i.health_tier,
  i.insight_date,
  i.completed_at
FROM app_daily_insights i
JOIN apps a ON a.id = i.app_row_id
WHERE a.firebase_params::jsonb->>'firebaseAppKey' = 'ar_tracer_trace_drawing_ios'
  AND i.insight_date = CURRENT_DATE - INTERVAL '1 day'
  AND i.status = 'completed'
ORDER BY i.completed_at DESC NULLS LAST, i.created_at DESC
LIMIT 1;
```

---

## Ghi chú nhanh cho agent / prompt

1. **Mediation:** chỉ có **`format`**, không tự đặt `ad_format` trừ khi alias.  
2. **`gold.ad_performance` / `gold.iap_performance`:** grain theo format/placement/country; rollup app×ngày = `GROUP BY event_date, app_id` + `SUM(...)`. Số **user IAP unique** nên lấy từ **bronze Q9**, không dựa vào `SUM(iap_users)` sau rollup địa lý.  
3. **Q11c** (map `ad_impression1..4`) và **Q14b Adjust** / **Q15b Firebase fallback** nằm trong [`02 - AR_Tracer_Insight_Complete_Guideline.md`](../02%20-%20AR_Tracer_Insight_Complete_Guideline.md) §B — thêm nếu pipeline Adjust/AF thiếu.
