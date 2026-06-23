# AR Tracer — Bronze Fallback Queries cho Snapshot Builder
## Giải quyết 6/8 dimensions N/A

> **Vấn đề:** Gold/Silver chưa populate đầy đủ → AI insight chỉ có 2/8 dimensions
> **Giải pháp:** Snapshot builder thêm Bronze fallback queries trực tiếp vào `bronze.fb_ar_tracer_trace_drawing_ios`
> **Bronze table:** `bronze.fb_ar_tracer_trace_drawing_ios`
> **Lưu ý:** Tất cả queries PHẢI có `WHERE event_date` filter

---

## Diagnosis: Tại sao 6/8 dimensions N/A?

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA GAP ANALYSIS                                 │
├──────────────────┬──────────────┬──────────────┬─────────────────────┤
│ Metric           │ Gold         │ Silver       │ Bronze              │
├──────────────────┼──────────────┼──────────────┼─────────────────────┤
│ DAU / DAV        │ ❌ NULL       │ ❓ Chưa check│ ✅ fb_* (tính được) │
│ Retention D1/D7  │ ❌ Chưa pop. │ ❓ Chưa check│ ✅ fb_* (install_d) │
│ Drawing rate     │ ❌ Chưa pop. │ ❓ Chưa check│ ✅ fb_* (draw_*)    │
│ Onboarding       │ ❌ Chưa pop. │ ❓ Chưa check│ ✅ fb_* (intro_*)   │
│ IAP/Subscription │ ❌ Chưa pop. │ ❓ Chưa check│ ✅ fb_* (iap_*)     │
│ Top Events       │ ──           │ ❓ event_sum │ ✅ fb_* (290 events)│
│ Revenue (AdMob)  │ ✅ Có         │ ✅ Có         │ ✅ mkt/admob        │
│ Fill rate, eCPM  │ ✅ Có         │ ✅ Có         │ ✅ mkt/admob        │
│ UA Cost total    │ ✅ fact_daily │ ──           │ ✅ xmp_report       │
│ Cost by channel  │ ❌ Không tách │ ──           │ ✅ xmp (module)     │
│ Installs by net  │ ❌ Không có   │ ──           │ ✅ adjust_report; AF: gold chỉ media → campaign: bronze.appsflyer_aggregate_daily / installs_raw    │
│ Campaign ROAS    │ ❌ Không có   │ ──           │ ⚠️ adjust (JSON)    │
│ Organic vs Paid  │ ❌ Không có   │ ──           │ ✅ fb_* (af_status) │
│                  │              │              │   + adjust_report   │
└──────────────────┴──────────────┴──────────────┴─────────────────────┘

Kết luận: Bronze CÓ TẤT CẢ DATA. Bổ sung Adjust + XMP queries cho Growth dimension.
```

---

## Query 1: DAU / DAV / Sessions (thay cho gold.daily_overview NULL)

**Khi nào chạy:** `gold.daily_overview` rỗng HOẶC `fact_daily_app_metrics.dau` = NULL

```sql
-- Bronze fallback: DAU, DAV, New Users, Sessions
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
        WHEN event_name = 'in_app_purchase' 
        THEN user_pseudo_id END) AS paying_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY event_date
ORDER BY event_date;
```

**Snapshot key:** `engagement`
**dataSource:** `bronze`
**Thời gian ước tính:** ~3-5s (scan 2-3M rows/ngày × 15 ngày)

---

## Query 2: Retention D1/D3/D7/D14/D30 (thay cho gold.retention_overview NULL)

```sql
-- Bronze fallback: Retention by cohort
WITH d0_users AS (
    SELECT 
        install_date,
        COUNT(DISTINCT user_pseudo_id) AS d0_users
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_name = 'first_open'
      AND event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
    GROUP BY install_date
)
SELECT
    b.install_date,
    b.retention_day,
    d.d0_users,
    COUNT(DISTINCT CASE 
        WHEN b.event_name IN ('session_start', 'user_engagement') 
        THEN b.user_pseudo_id END) AS active_users,
    ROUND(
        COUNT(DISTINCT CASE 
            WHEN b.event_name IN ('session_start', 'user_engagement') 
            THEN b.user_pseudo_id END) * 100.0 
        / NULLIF(d.d0_users, 0), 1) AS retention_rate
FROM bronze.fb_ar_tracer_trace_drawing_ios b
JOIN d0_users d ON b.install_date = d.install_date
WHERE b.event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
  AND b.retention_day IN (0, 1, 3, 7, 14, 30)
  AND b.install_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
GROUP BY b.install_date, b.retention_day, d.d0_users
ORDER BY b.install_date, b.retention_day;
```

**Snapshot key:** `retention`
**dataSource:** `bronze`
**Thời gian ước tính:** ~5-8s

---

## Query 3: Drawing Rate & Content Metrics (thay cho gold.content_engagement NULL)

```sql
-- Bronze fallback: Drawing, Lesson, Template, Share metrics
SELECT
    event_date,
    -- Drawing (KPI #1)
    COUNT(DISTINCT CASE 
        WHEN event_name IN ('draw_with_lesson', 'draw_with_template', 
            'content_draw', 'lessons_drawing',
            'lessons_free_start_drawing', 'lessons_Pro_start_drawing')
        THEN user_pseudo_id END) AS drawing_users,
    SUM(CASE 
        WHEN event_name IN ('draw_finish_with_lesson', 
            'draw_finish_with_template', 'content_done') 
        THEN 1 ELSE 0 END) AS drawing_completions,
    -- Lesson
    SUM(CASE 
        WHEN event_name IN ('draw_with_lesson', 'lessons_drawing',
            'lessons_free_start_drawing', 'lessons_Pro_start_drawing') 
        THEN 1 ELSE 0 END) AS lesson_starts,
    SUM(CASE 
        WHEN event_name = 'draw_finish_with_lesson' 
        THEN 1 ELSE 0 END) AS lesson_completions,
    -- Pro vs Free
    SUM(CASE WHEN event_name = 'lessons_Pro_start_drawing' THEN 1 ELSE 0 END) AS pro_lessons,
    SUM(CASE WHEN event_name = 'lessons_free_start_drawing' THEN 1 ELSE 0 END) AS free_lessons,
    -- Template
    SUM(CASE WHEN event_name = 'draw_with_template' THEN 1 ELSE 0 END) AS template_starts,
    SUM(CASE WHEN event_name = 'draw_finish_with_template' THEN 1 ELSE 0 END) AS template_completions,
    -- Magic Photo
    COUNT(DISTINCT CASE WHEN event_name = 'magic_photo_draw' THEN user_pseudo_id END) AS magic_photo_users,
    -- Share
    COUNT(DISTINCT CASE 
        WHEN event_name IN ('preview_share', 'preview_lesson_share', 
            'preview_template_share', 'my_creative_share')
        THEN user_pseudo_id END) AS share_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
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

**Snapshot key:** `contentDrawing`
**dataSource:** `bronze`
**Lưu ý:** Cần JOIN với Query 1 (DAU) để tính drawing_rate = drawing_users / dau

---

## Query 4: Onboarding Funnel (thay cho gold.onboarding_funnel NULL)

```sql
-- Bronze fallback: 8-step onboarding funnel
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
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name IN (
      'first_open', 'language_choose', 'intro_next_click', 'intro_category_choose',
      'intro_user_level_choose', 'intro_user_age_choose', 'intro_iap',
      'end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp'
  )
GROUP BY event_date
ORDER BY event_date;
```

**Snapshot key:** `onboardingFunnel`
**dataSource:** `bronze`

---

## Query 5: IAP & Subscription (thay cho gold.iap_performance NULL)

```sql
-- Bronze fallback: IAP funnel + subscription lifecycle
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
    -- Subscription
    SUM(CASE WHEN event_name = 'trial_started' THEN 1 ELSE 0 END) AS trial_starts,
    SUM(CASE WHEN event_name = 'subscription_upgraded' THEN 1 ELSE 0 END) AS sub_upgrades,
    SUM(CASE WHEN event_name = 'trial_canceled' THEN 1 ELSE 0 END) AS trial_cancels,
    SUM(CASE WHEN event_name = 'subscription_canceled' THEN 1 ELSE 0 END) AS sub_cancels,
    SUM(CASE WHEN event_name = 'refund' THEN 1 ELSE 0 END) AS refunds
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name IN (
      'iap_show', 'iap_click', 'iap_open_view', 'iap_open_pay', 
      'iap_purchase', 'in_app_purchase', 'iap_fail_purchase', 'iap_close',
      'trial_started', 'trial_still_active', 'subscription_upgraded', 
      'trial_canceled', 'trial_expired', 'subscription_canceled', 'refund'
  )
GROUP BY event_date
ORDER BY event_date;
```

**Snapshot key:** `iapSubscription`
**dataSource:** `bronze`

---

## Query 6: Top Events Discovery (fix topEvents rỗng)

```sql
-- Bronze: Top 50 events by volume (7 ngày gần nhất)
SELECT
    event_name,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_pseudo_id) AS unique_users,
    COUNT(DISTINCT event_date) AS days_active
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 50;
```

**Snapshot key:** `topEvents`
**dataSource:** `bronze`
**Lưu ý:** Query này LUÔN chạy — dùng để verify event_summary có populate không

---

## Query 7: D0 Activation Rate (KPI đặc thù)

```sql
-- Bronze: D0 activation = % new users vẽ trong ngày cài
SELECT
    event_date,
    COUNT(DISTINCT CASE 
        WHEN event_name = 'first_open' 
        THEN user_pseudo_id END) AS installs,
    COUNT(DISTINCT CASE 
        WHEN event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
            AND retention_day = 0 
        THEN user_pseudo_id END) AS d0_drawers,
    ROUND(
        COUNT(DISTINCT CASE 
            WHEN event_name IN ('draw_with_lesson', 'draw_with_template', 'content_draw')
                AND retention_day = 0 
            THEN user_pseudo_id END) * 100.0 /
        NULLIF(COUNT(DISTINCT CASE 
            WHEN event_name = 'first_open' 
            THEN user_pseudo_id END), 0), 1) AS d0_activation_rate
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name IN ('first_open', 'draw_with_lesson', 'draw_with_template', 'content_draw')
GROUP BY event_date
ORDER BY event_date;
```

**Snapshot key:** `d0Activation`
**dataSource:** `bronze`

---

## Query 8: Ad Performance by Format (Firebase events)

```sql
-- Bronze fallback: Ad metrics by format (thay cho gold.ad_performance)
SELECT
    event_date,
    CASE
        WHEN event_name = 'ad_impression1' THEN 'rewarded'
        WHEN event_name = 'ad_impression2' THEN 'interstitial'
        WHEN event_name = 'ad_impression3' THEN 'banner'
        WHEN event_name = 'ad_impression4' THEN 'native'
        WHEN event_name = 'ad_impression_custom' THEN 'app_open'
        WHEN event_name = 'ad_impression' THEN 'standard'
        ELSE 'other'
    END AS ad_format,
    COUNT(*) AS impressions,
    COUNT(DISTINCT user_pseudo_id) AS ad_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name LIKE 'ad_impression%'
GROUP BY event_date, ad_format
ORDER BY event_date, impressions DESC;
```

**Snapshot key:** `adPerformanceFirebase`
**dataSource:** `bronze`

---

## Query 9: Installs by Network — Adjust

**Khi nào chạy:** LUÔN chạy nếu app có `adjust_id` trong `dim_app_identifiers`

```sql
-- Adjust: Installs by network / campaign / country (14 ngày)
SELECT
    a.`date`,
    a.network,
    a.partner_name,
    a.campaign,
    a.country_code,
    -- Installs từ conversion_metrics_json
    CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT) AS installs,
    CAST(get_json_string(a.conversion_metrics_json, '$.sessions') AS BIGINT) AS sessions,
    -- Cost từ ad_spend_metrics_json (nếu có)
    CAST(get_json_string(a.ad_spend_metrics_json, '$.cost') AS DOUBLE) AS cost,
    -- Revenue từ revenue_metrics_json (nếu có, cho ROAS)
    CAST(get_json_string(a.revenue_metrics_json, '$.all_revenue') AS DOUBLE) AS attributed_revenue
FROM bronze.adjust_report a
JOIN silver.dim_app_identifiers d ON d.adjust_id = a.app_token
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY a.`date`, installs DESC;
```

**Snapshot key:** `adjustInstalls`
**dataSource:** `bronze`
**Lưu ý:**
- `app_token` trong Adjust ≠ `app_id` AdMob → JOIN qua `dim_app_identifiers.adjust_id`
- Metrics nằm trong các cột JSON → dùng `get_json_string()` + CAST
- Nếu `adjust_id` NULL trong dim → skip query, ghi dataGap

### Derived: Installs by Network (aggregate)

```sql
-- Aggregate cho snapshot: top networks
SELECT
    a.network,
    a.partner_name,
    SUM(CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT)) AS total_installs,
    SUM(CAST(get_json_string(a.ad_spend_metrics_json, '$.cost') AS DOUBLE)) AS total_cost,
    SUM(CAST(get_json_string(a.revenue_metrics_json, '$.all_revenue') AS DOUBLE)) AS total_revenue
FROM bronze.adjust_report a
JOIN silver.dim_app_identifiers d ON d.adjust_id = a.app_token
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY a.network, a.partner_name
ORDER BY total_installs DESC
LIMIT 10;
```

### Derived: Organic vs Paid (từ Adjust)

```sql
-- Organic = network rỗng hoặc 'Organic'
SELECT
    CASE WHEN a.network IN ('Organic', '') OR a.network IS NULL THEN 'Organic' ELSE 'Paid' END AS source,
    SUM(CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT)) AS installs
FROM bronze.adjust_report a
JOIN silver.dim_app_identifiers d ON d.adjust_id = a.app_token
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY CASE WHEN a.network IN ('Organic', '') OR a.network IS NULL THEN 'Organic' ELSE 'Paid' END;
```

## Query 9b: AppsFlyer — campaign (chỉ bronze; `gold.app_ua_daily` AF không có campaign)

**Khi nào chạy:** Cần breakdown **theo campaign** với MMP = AppsFlyer. **`gold.app_ua_daily`** (`mmp_source = 'appsflyer'`) chỉ có **`media_source` + `country_code`** theo ngày — **không** `campaign`. Snapshot mặc định (`appsFlyerInstallsByMediaSourceTop`) cũng chỉ theo **media_source**. Phân tích campaign → **MCP `read_query`** lên bronze.

**Nguồn:** (1) **`bronze.appsflyer_aggregate_daily`** với `report_type = 'master_api_v4'` — có `campaign`, `campaign_id`, `media_source`. (2) **`bronze.appsflyer_installs_raw`** nếu bật Pull — mức install.

```sql
SELECT
    COALESCE(NULLIF(TRIM(campaign), ''), '(none)') AS campaign,
    COALESCE(NULLIF(TRIM(media_source), ''), 'Unknown') AS media_source,
    SUM(installs) AS installs,
    SUM(COALESCE(cost, 0)) AS cost_sum
FROM bronze.appsflyer_aggregate_daily
WHERE report_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
  AND report_type = 'master_api_v4'
  AND app_id = '<af_app_id_tu_dim>'
GROUP BY 1, 2
ORDER BY installs DESC
LIMIT 20;
```

**Snapshot key:** (không có sẵn) — bổ sung qua MCP / agentic. Xem thêm [04 - Amobear_Nexus_AI_Insight_Template_Config](04%20-%20Amobear_Nexus_AI_Insight_Template_Config.md) KB-9 (grain & fallback campaign).

---

## Query 10: UA Cost by Channel — XMP

**Khi nào chạy:** LUÔN chạy (XMP có cho hầu hết apps)

```sql
-- XMP: UA cost by channel/module (14 ngày)
SELECT
    x.`date`,
    x.module,
    x.product_name,
    SUM(x.cost) AS daily_cost,
    SUM(x.xmp_cost) AS daily_xmp_cost
FROM bronze.xmp_report x
WHERE x.store_package_id = 'com.avntech.ar-drawing'  -- bundle_id
  AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY x.`date`, x.module, x.product_name
ORDER BY x.`date`, daily_cost DESC;
```

**Snapshot key:** `xmpCostByChannel`
**dataSource:** `bronze`

### Derived: Cost by Channel (aggregate)

```sql
-- Aggregate: top modules by spend
SELECT
    x.module,
    SUM(x.cost) AS total_cost,
    COUNT(DISTINCT x.`date`) AS active_days,
    ROUND(SUM(x.cost) / COUNT(DISTINCT x.`date`), 2) AS avg_daily_cost
FROM bronze.xmp_report x
WHERE x.store_package_id = 'com.avntech.ar-drawing'
  AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY x.module
ORDER BY total_cost DESC;
```

### Derived: CPI by Channel (XMP cost ÷ Adjust installs)

```sql
-- Cross-source: CPI = XMP cost / Adjust installs (by module≈network mapping)
-- Lưu ý: module (tiktok, google, facebook...) ≈ network trong Adjust
-- StarRocks: GROUP BY phải dùng expression đầy đủ, KHÔNG dùng alias
WITH cost AS (
    SELECT x.`date`, x.module, SUM(x.cost) AS cost
    FROM bronze.xmp_report x
    WHERE x.store_package_id = 'com.avntech.ar-drawing'
      AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
    GROUP BY x.`date`, x.module
),
installs AS (
    SELECT a.`date`,
        CASE
            WHEN LOWER(a.network) LIKE '%tiktok%' OR LOWER(a.partner_name) LIKE '%tiktok%' THEN 'tiktok'
            WHEN LOWER(a.network) LIKE '%google%' THEN 'google'
            WHEN LOWER(a.network) LIKE '%facebook%' OR LOWER(a.network) LIKE '%meta%' THEN 'facebook'
            WHEN LOWER(a.network) LIKE '%apple%' THEN 'apple'
            ELSE LOWER(a.network)
        END AS module,
        SUM(CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT)) AS installs
    FROM bronze.adjust_report a
    JOIN silver.dim_app_identifiers d ON d.adjust_id = a.app_token
    WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
      AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
    GROUP BY a.`date`,
        CASE
            WHEN LOWER(a.network) LIKE '%tiktok%' OR LOWER(a.partner_name) LIKE '%tiktok%' THEN 'tiktok'
            WHEN LOWER(a.network) LIKE '%google%' THEN 'google'
            WHEN LOWER(a.network) LIKE '%facebook%' OR LOWER(a.network) LIKE '%meta%' THEN 'facebook'
            WHEN LOWER(a.network) LIKE '%apple%' THEN 'apple'
            ELSE LOWER(a.network)
        END
)
SELECT c.module,
    SUM(c.cost) AS total_cost,
    SUM(i.installs) AS total_installs,
    ROUND(SUM(c.cost) / NULLIF(SUM(i.installs), 0), 2) AS cpi
FROM cost c
LEFT JOIN installs i ON c.`date` = i.`date` AND c.module = i.module
GROUP BY c.module
ORDER BY total_cost DESC;
```

**Snapshot key:** `cpiByChannel`
**dataSource:** `bronze (xmp + adjust)`

---

## Tổng hợp: Snapshot Builder Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│              SNAPSHOT BUILDER QUERY ORDER                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ① GOLD queries (nhanh, sạch)                                       │
│     → fact_daily_app_metrics (revenue, ecpm, fill_rate)      ✅ OK   │
│     → daily_overview (dau, sessions)                         ❌ NULL │
│     → retention_overview (D1/D7)                             ❌ EMPTY│
│     → content_engagement (drawing_rate)                      ❌ EMPTY│
│     → onboarding_funnel                                      ❌ EMPTY│
│     → iap_performance                                        ❌ EMPTY│
│     → ad_performance                                         ❌ EMPTY│
│                                                                      │
│  ② Nếu Gold NULL/EMPTY → chạy FIREBASE BRONZE fallback              │
│     → Query 1: DAU/DAV/Sessions                              ~3-5s  │
│     → Query 2: Retention D1/D7/D30                           ~5-8s  │
│     → Query 3: Drawing/Content                               ~3-5s  │
│     → Query 4: Onboarding funnel                             ~2-3s  │
│     → Query 5: IAP/Subscription                              ~2-3s  │
│     → Query 7: D0 Activation                                 ~2-3s  │
│     → Query 8: Ad by Format                                  ~2-3s  │
│                                                                      │
│  ③ LUÔN chạy (data chỉ có ở Bronze, không có Gold/Silver)           │
│     → Query 6: Top Events Discovery (fb_*)                   ~2-3s  │
│     → Query 9: Adjust installs by network/campaign           ~2-3s  │
│     → Query 10: XMP cost by channel                          ~1-2s  │
│     → CPI cross-source (XMP cost ÷ Adjust installs)         ~2-3s  │
│     → AdMob queries (mediation_table, admob_table)           ~1-2s  │
│                                                                      │
│  Tổng thời gian: ~30-40s (Bronze full) | ~8-12s (Gold + always)    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Kỳ vọng kết quả sau khi thêm Bronze fallback

### Trước (hiện tại):

| Dimension | Score | Data |
|-----------|-------|------|
| Revenue & Monetization | 95 | ✅ AdMob data |
| Ad Infrastructure | 45 | ✅ AdMob data |
| Growth & Acquisition | N/A | ❌ |
| Engagement & Retention | N/A | ❌ |
| Product & Content | N/A | ❌ |
| Unit Economics | N/A | ❌ |
| Portfolio Position | N/A | ❌ |
| Optimization Velocity | N/A | ❌ |

### Sau (với Bronze fallback + Adjust + XMP):

| Dimension | Score (est.) | Data source |
|-----------|-------------|-------------|
| Revenue & Monetization | ~95 | ✅ Gold (AdMob) + Bronze (IAP) |
| Ad Infrastructure | ~45-55 | ✅ Gold (AdMob) + Bronze (Firebase ad events) |
| **Growth & Acquisition** | **~35-55** | ⚠️ **Adjust (installs by network) + XMP (cost by channel) + Bronze fb_* (af_status)** |
| **Engagement & Retention** | **~50-70** | ⚠️ **Bronze fb_* (DAU, D1/D7, sessions)** |
| **Product & Content** | **~40-70** | ⚠️ **Bronze fb_* (drawing_rate, completion, onboarding)** |
| **Unit Economics** | **~30-50** | ⚠️ **Bronze DAU + Gold revenue + XMP cost + Adjust installs → ARPDAU, CPI, LTV/CAC** |
| Portfolio Position | N/A | ❌ (cần cross-app data) |
| Optimization Velocity | N/A | ❌ (cần action tracking) |

**Kết quả: từ 2/8 → 6/8 dimensions có score!**
**Growth dimension nay có channel-level CPI + installs by network thay vì chỉ total ROI.**

---

## Checklist implement

- [ ] Thêm 8 Firebase Bronze queries vào `AppInsightSnapshotBuilder.cs`
- [ ] Thêm Query 9: Adjust installs by network (check `adjust_id` != null trước khi chạy)
- [ ] Thêm Query 10: XMP cost by channel (match bằng `store_package_id` = bundle_id)
- [ ] Thêm CPI cross-source: XMP cost ÷ Adjust installs (module ≈ network mapping)
- [ ] Logic: Gold → check NULL/empty → Bronze fallback
- [ ] Ghi `dataSource` (gold/silver/bronze) + `dataGaps` vào mỗi block snapshot
- [ ] Test: chạy cho AR Tracer → verify 6/8 dimensions có score
- [ ] Test: verify Adjust JSON parsing (conversion_metrics_json, ad_spend_metrics_json)
- [ ] Monitor: log execution time tổng (~30-40s budget)
- [ ] Dài hạn: fix Silver/Gold pipeline → Bronze fallback tự inactive
