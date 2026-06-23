# AR Tracer — Complete App Insight Guideline
## Context · KB · Prompt · Metrics · SQL · Product×Geo Deep Dive

> **App:** AR Tracer — Trace Drawing iOS
> **Bundle:** `com.avntech.ar-drawing` | **Firebase ID:** `ar_tracer_trace_drawing_ios`
> **Platform:** iOS | **Bronze table:** `bronze.fb_ar_tracer_trace_drawing_ios`
> **Mục tiêu:** Guideline đầy đủ để Agentic tạo daily insight report chuẩn
>
> **Đồng bộ kiểm tra query & ảnh:** Bản verify chi tiết (Q1–Q20, trạng thái data, SQL fix) nằm trong [03 - AR_Tracer_Query_Verification.md](./03%20-%20AR_Tracer_Query_Verification.md). Ảnh minh chứng (Q6, Q11, Q18): thư mục [AR Tracer](./AR%20Tracer/) (`6-2.png`, `11-1.png`, `11-2.png`, `18-1.png`). Khi gửi **một bộ số liệu đầy đủ** để xây App Insight, nên kèm export hoặc screenshot các query P0/P1 trong §B và ghi rõ `insight_date` / múi giờ (UTC).

---

# PHẦN A — APP CONTEXT

## A1. App Profile

AR Tracer là app **vẽ tranh qua camera AR**. User chọn lesson/template → đặt điện thoại → vẽ theo hình mẫu hiện trên camera.

```
Core Loop:
Install → Onboard (8 bước) → Browse lessons/templates → AR Drawing → Complete → Save & Share → Return

Monetization:
├── IAA: rewarded (unlock content) + interstitial (between draws) + banner + native + app open
├── IAP/Subscription: trial → paid (Pro subscription unlock tất cả lessons)
└── Revenue mix: ~90% IAA, ~10% IAP (subscription-dominant trong IAP)
```

**KPI đặc thù:**

| KPI | Định nghĩa | Target | Tại sao quan trọng |
|-----|-----------|--------|-------------------|
| `drawing_rate` | Drawing users / DAU × 100 | >40% | KPI #1 — nếu user không vẽ, app không có giá trị |
| `d0_activation` | D0 drawers / installs × 100 | >25% | New user ngay ngày cài mà không vẽ = sẽ churn |
| `completion_rate` | Draw finish / draw start × 100 | >50% | User bắt đầu mà không hoàn thành = UX problem |
| `onboarding_complete` | End onboard / first_open × 100 | >70% | Funnel quá dài hoặc khó → mất user trước core loop |
| `trial_to_sub` | subscription_upgraded / trial_started × 100 | >15% | IAP revenue driver |
| `D1 retention` | D1 active / D0 installs × 100 | >30% | Sustainability |
| `D7 retention` | D7 active / D0 installs × 100 | >12% | Long-term health |
| `fill_rate` | Matched / requests × 100 | >85% | Fill <85% = revenue at risk |

## A2. Event Catalog — Phân loại theo Analytics

### Events chính cho insight (tổng 290 events, dùng ~60 cho analytics)

| Nhóm | Events | Dùng cho |
|------|--------|---------|
| **Firebase Core** | `session_start`, `user_engagement`, `first_open`, `screen_view`, `app_remove` | DAU, Sessions, New Users, Uninstall |
| **Drawing/Content** | `draw_with_lesson`, `draw_with_template`, `content_draw`, `lessons_drawing`, `lessons_free_start_drawing`, `lessons_Pro_start_drawing` (starts) — `draw_finish_with_lesson`, `draw_finish_with_template`, `content_done` (completions) | Drawing Rate, Completion Rate |
| **Camera/Magic** | `magic_photo_draw`, `magic_photo_choose`, `drawing_capture`, `drawing_capture_photo` | Feature adoption |
| **Share** | `preview_share`, `preview_lesson_share`, `preview_template_share`, `my_creative_share` | Virality |
| **Onboarding** | `first_open` → `language_choose` → `intro_next_click` → `intro_category_choose` → `intro_user_level_choose` → `intro_user_age_choose` → `intro_iap` → `end_onboard_global` / `end_onboard_iaa` / `end_onboard_jp` | Onboarding funnel |
| **IAP** | `iap_show` → `iap_click` → `iap_open_view` → `iap_open_pay` → `iap_purchase` / `iap_fail_purchase` / `iap_close` | IAP conversion funnel |
| **Subscription** | `trial_started`, `trial_still_active`, `subscription_upgraded`, `trial_canceled`, `trial_expired`, `subscription_canceled`, `subscription_expired`, `refund` | Subscription lifecycle |
| **Ad (AR Tracer — thực tế)** | **Volume chính:** `ad_impression_custom` (top), `ad_clicked`, `banner_event`. **`ad_impression1`…`ad_impression4` thường không xuất hiện** trong top events — đừng giả định mapping 1=native/rewarded theo số. **Format theo param:** trên `ad_impression_custom` (và tương tự) đọc `event_params_json` → `ad_format`: `native`, `interstitial`, `app_open`, `banner`, `video_rewarded`, … (xem Q11 diagnostic trong §B8). **Soát chéo monetization:** Q4 `bronze.admob_table.format` là nguồn “chuẩn billing” khi Firebase không tách format rõ. |
| **Browse** | `browser_category_*` (108 events: Animals, Cute, Nature, Realistic, Cartoon, Vegetables, Color, Anime, Fantasy, Chibi × sub-categories) | Content preference |
| **Attribution** | Via `user_properties_json`: `$.af_status` (Organic/Non-organic), `$.af_message` | Organic/Paid split |
| **Qonversion** | `qon_trial_started`, `qon_subscription_created`, etc. (13 events) | Subscription cross-check |

## A3. Data Sources & JOIN Rules

```
┌──────────────────────────────────────────────────────────────────────────┐
│ BẢNG                        │ app_id dùng      │ Cột ngày      │ JOIN  │
├─────────────────────────────┼──────────────────┼───────────────┼───────┤
│ bronze.fb_ar_tracer_...     │ (trong tên bảng) │ event_date    │ Trực tiếp │
│ gold.fact_daily_app_metrics │ admob_app_id     │ `date`(btick) │ dim_app_identifiers │
│ gold.daily_overview         │ **admob_app_id** │ event_date    │ JOIN dim: `d.admob_app_id = o.app_id` (không filter `app_id` = firebase_id) │
│ silver.daily_app_revenue    │ admob_app_id     │ `date`(btick) │ dim_app_identifiers │
│ bronze.admob_table          │ admob_app_id     │ `date`(btick) │ dim_app_identifiers │
│ bronze.mediation_table      │ admob_app_id     │ `date`(btick) │ dim_app_identifiers │
│ bronze.xmp_report           │ store_package_id │ `date`(btick) │ JOIN `silver.dim_app_identifiers`: iOS thường **`x.store_package_id = CONCAT('id', d.app_store_id)`** (vd `id6504559449`), không filter chỉ bằng bundle |
│ bronze.adjust_report        │ app_token        │ `date`(btick) │ dim_app_identifiers.adjust_id │
└──────────────────────────────────────────────────────────────────────────┘

dim_app_identifiers (AR Tracer):
  firebase_id = 'ar_tracer_trace_drawing_ios'
  admob_app_id = (AdMob ID)
  package_name / bundle_id = 'com.avntech.ar-drawing'
  app_store_id = '6504559449'  → XMP hay lưu **id6504559449** trong `store_package_id`
  adjust_id = (Adjust token — app này thường không dùng Adjust; ưu tiên AppsFlyer pilot)
```

### A3.1 Độ tươi dữ liệu & App Insight (Gold vs Firebase)

- **`gold.fact_daily_app_metrics`:** Revenue, `total_ad_requests`, `total_matched_requests`, `fill_rate`, UA cost, … cập nhật theo ngày lịch **T** khi AdMob/XMP và job transform chạy.
- **`gold.daily_overview`:** Đổ từ pipeline Firebase; job tham chiếu **04:00 UTC** → engagement (DAU/DAV/sessions) trên Gold thường **đầy đủ đến T−1** so với “hôm nay” nếu so wall-clock.
- **Quy ước V1 cho báo cáo / snapshot:** Coi **ngày insight “đầy đủ engagement” là T−1**, hoặc map DAU/DAV/ARPDAU từ `gold.daily_overview` cùng `event_date` **sau** khi job Firebase chạy; không kỳ vọng DAU đầy đủ cho **T** cùng lúc revenue intraday **T** trước khi Gold Firebase refresh.
- **Cột fact:** Không có `matched_requests` — chỉ có **`total_ad_requests`**, **`total_matched_requests`** (đặt tên đúng trong mọi SQL/MCP).

---

# PHẦN B — SQL QUERIES CHO SNAPSHOT (20 queries)

## B1. Gold Layer (chạy đầu tiên, nhanh)

```sql
-- Q1: Revenue, eCPM, Fill, requests, UA — 15 ngày
-- Cột đúng: total_ad_requests, total_matched_requests (KHÔNG có matched_requests).
-- DAU/DAV/ARPDAU trên fact join từ gold.daily_overview trong ETL; nếu NULL xem §A3.1 (T vs T−1) và Q5 bronze.
SELECT
    f.`date` AS report_date,
    f.total_revenue AS estimated_revenue,
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
  AND f.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY f.`date`;

-- Q2: Daily Overview — DAU, sessions (gold.daily_overview.app_id = admob_app_id)
-- Thường lag 1 ngày so với “hôm nay” tới khi job 04:00 UTC chạy; đối chiếu cùng event_date với Q1 sau khi pipeline xong.
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
  AND o.event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY o.event_date;
```

## B2. AdMob Bronze (luôn chạy)

```sql
-- Q3: Revenue by ad source — 14 ngày window
SELECT
    a.ad_source_name,
    SUM(a.estimated_earnings) AS revenue,
    SUM(a.impressions) AS impressions,
    ROUND(SUM(a.estimated_earnings) / NULLIF(SUM(a.impressions), 0) * 1000, 2) AS ecpm
FROM bronze.mediation_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY a.ad_source_name
ORDER BY revenue DESC LIMIT 10;

-- Q4: Revenue by ad unit — 14 ngày window
SELECT
    a.ad_unit_name,
    a.format,
    SUM(a.estimated_earnings) AS revenue,
    SUM(a.impressions) AS impressions
FROM bronze.admob_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY a.ad_unit_name, a.format
ORDER BY revenue DESC LIMIT 5;
```

## B3. Firebase Bronze — Engagement (fallback khi gold NULL)

```sql
-- Q5: DAU / DAV / Sessions / Engagement — 14 ngày
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
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY event_date
ORDER BY event_date;
```

## B4. Firebase Bronze — Retention

```sql
-- Q6: Retention D1/D3/D7/D14/D30 — chỉ đếm active trong cohort install (tránh retention_day=0 >100%)
WITH cohort_users AS (
    SELECT DISTINCT install_date, user_pseudo_id
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_name = 'first_open'
      AND event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
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
      AND b.event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
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

*(Kết quả mẫu sau clamp D0: [AR Tracer/6-2.png](./AR%20Tracer/6-2.png); mô tả đầy đủ: [03 - AR_Tracer_Query_Verification.md](./03%20-%20AR_Tracer_Query_Verification.md) §Q6.)*

## B5. Firebase Bronze — Drawing & Content

```sql
-- Q7: Drawing Rate & Content Metrics — 14 ngày
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

## B6. Firebase Bronze — Onboarding Funnel

```sql
-- Q8: 8-step onboarding funnel — 14 ngày
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

## B7. Firebase Bronze — IAP & Subscription

```sql
-- Q9: IAP funnel + subscription lifecycle — 14 ngày
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

## B8. Firebase Bronze — D0 Activation & Ad by Format

```sql
-- Q10: D0 Activation Rate — 14 ngày
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
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name IN ('first_open', 'draw_with_lesson', 'draw_with_template', 'content_draw')
GROUP BY event_date
ORDER BY event_date;

-- Q11a: Volume theo tên event (AR Tracer — ad_impression_custom / ad_clicked / banner_event là chính)
SELECT
    event_name,
    COUNT(*) AS cnt,
    COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND (event_name LIKE 'ad_%' OR event_name LIKE 'banner_%')
GROUP BY event_name
ORDER BY cnt DESC;
-- Ảnh kết quả mẫu: [AR Tracer/11-1.png](./AR%20Tracer/11-1.png)

-- Q11b: Breakdown format từ params (chủ yếu trên ad_impression_custom)
SELECT
    get_json_string(event_params_json, '$.ad_format') AS ad_format,
    COUNT(*) AS cnt,
    COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND event_name = 'ad_impression_custom'
GROUP BY get_json_string(event_params_json, '$.ad_format')
ORDER BY cnt DESC;
-- Ảnh kết quả mẫu: [AR Tracer/11-2.png](./AR%20Tracer/11-2.png)

-- Q11c (legacy / app khác): map ad_impression1..4 + custom → format — StarRocks: không GROUP BY alias, lặp lại CASE; với AR Tracer thường chỉ custom có volume → ưu tiên Q11a/Q11b hoặc gold.ad_performance / Q4 AdMob
SELECT
    event_date,
    CASE
        WHEN event_name = 'ad_impression1' THEN 'rewarded'
        WHEN event_name = 'ad_impression2' THEN 'interstitial'
        WHEN event_name = 'ad_impression3' THEN 'banner'
        WHEN event_name = 'ad_impression4' THEN 'native'
        WHEN event_name = 'ad_impression_custom' THEN 'app_open'
        WHEN event_name = 'ad_impression' THEN COALESCE(
            get_json_string(event_params_json, '$.ad_format.string_value'),
            get_json_string(event_params_json, '$.ad_format'), 'standard')
        ELSE 'standard'
    END AS ad_format,
    COUNT(*) AS impressions,
    COUNT(DISTINCT user_pseudo_id) AS ad_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name LIKE 'ad_impression%'
GROUP BY event_date, CASE
        WHEN event_name = 'ad_impression1' THEN 'rewarded'
        WHEN event_name = 'ad_impression2' THEN 'interstitial'
        WHEN event_name = 'ad_impression3' THEN 'banner'
        WHEN event_name = 'ad_impression4' THEN 'native'
        WHEN event_name = 'ad_impression_custom' THEN 'app_open'
        WHEN event_name = 'ad_impression' THEN COALESCE(
            get_json_string(event_params_json, '$.ad_format.string_value'),
            get_json_string(event_params_json, '$.ad_format'), 'standard')
        ELSE 'standard'
    END
ORDER BY event_date, impressions DESC;

-- Q12: Top Events — 7 ngày (luôn chạy)
SELECT event_name, COUNT(*) AS event_count, COUNT(DISTINCT user_pseudo_id) AS unique_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 50;
```

## B9. XMP, Adjust, AppsFlyer

```sql
-- Q13: UA cost by channel — XMP 14 ngày
-- Khuyến nghị: JOIN dim (bundle + App Store id). Với iOS, XMP thường dùng store_package_id = 'id6504559449' (= CONCAT('id', app_store_id) trong dim).
-- Filter nhanh (debug / đúng app): WHERE x.store_package_id = 'id6504559449'
SELECT
    x.`date`, x.module, SUM(x.cost) AS daily_cost
FROM bronze.xmp_report x
INNER JOIN silver.dim_app_identifiers d
    ON UPPER(TRIM(COALESCE(d.platform,''))) = UPPER(TRIM(COALESCE(x.os,'')))
    AND (d.package_name = x.store_package_id OR d.package_name = x.product_id
    OR (d.app_store_id != '' AND d.app_store_id != '0'
        AND (d.app_store_id = x.product_id OR d.app_store_id = x.store_package_id
             OR x.store_package_id = CONCAT('id', d.app_store_id))))
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY x.`date`, x.module
ORDER BY x.`date`, daily_cost DESC;

-- Q14: Installs by network — AppsFlyer: raw Pull **hoặc** gold Master (`mmp_source='appsflyer'`) **hoặc** `bronze.appsflyer_aggregate_daily` (master_api_v4); snapshot dùng cùng thứ tự. Adjust khi có adjust_id.
-- AppsFlyer Pull (bronze.appsflyer_installs_raw)
SELECT
    install_date AS report_date,
    COALESCE(NULLIF(TRIM(media_source), ''), 'Unknown') AS network,
    COUNT(*) AS installs,
    COALESCE(SUM(COALESCE(cost_value, 0)), 0) AS cost
FROM bronze.appsflyer_installs_raw af
WHERE install_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND (
    af.app_id = (SELECT package_name FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
    OR af.app_id = CONCAT('id', (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1))
    OR af.app_id = (SELECT app_store_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
  )
GROUP BY install_date, COALESCE(NULLIF(TRIM(media_source), ''), 'Unknown')
ORDER BY installs DESC;

-- Q14 Master path: gold.app_ua_daily (sau AppsFlyerUaTransformJob)
SELECT report_date, media_source AS network, SUM(installs) AS installs, SUM(COALESCE(cost_usd, 0)) AS cost
FROM gold.app_ua_daily
WHERE mmp_source = 'appsflyer'
  AND report_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND app_id = (SELECT admob_app_id FROM silver.dim_app_identifiers WHERE firebase_id = 'ar_tracer_trace_drawing_ios' LIMIT 1)
GROUP BY report_date, media_source
ORDER BY installs DESC;

-- Q14c: Adjust installs by network (khi dim.adjust_id khớp app_token)
SELECT
    a.`date`, a.network, a.partner_name,
    SUM(CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT)) AS installs,
    SUM(CAST(get_json_string(a.ad_spend_metrics_json, '$.cost') AS DOUBLE)) AS cost
FROM bronze.adjust_report a
JOIN silver.dim_app_identifiers d ON TRIM(COALESCE(d.adjust_id,'')) != '' AND d.adjust_id = a.app_token
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY a.`date`, a.network, a.partner_name
ORDER BY installs DESC;

-- Q15: Organic vs paid — ưu tiên AppsFlyer media_source; fallback Firebase af_status trên first_open
SELECT bucket AS attribution, installs,
    ROUND(installs * 100.0 / SUM(installs) OVER (), 1) AS pct
FROM (
    SELECT CASE
             WHEN LOWER(TRIM(COALESCE(media_source, ''))) IN ('organic', 'restricted') THEN 'Organic'
             ELSE 'Non-organic'
           END AS bucket,
           COUNT(*) AS installs
    FROM bronze.appsflyer_installs_raw af
    WHERE install_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
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

-- Q15b: Fallback Firebase (khi không có AF bronze)
SELECT
    COALESCE(NULLIF(TRIM(get_json_string(user_properties_json, '$.af_status')), ''), 'Unknown') AS attribution,
    COUNT(DISTINCT user_pseudo_id) AS installs,
    ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0
        / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 1) AS pct
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_name = 'first_open'
  AND event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY COALESCE(NULLIF(TRIM(get_json_string(user_properties_json, '$.af_status')), ''), 'Unknown')
ORDER BY installs DESC;
```

**AppsFlyer pilot (AR Tracer):** Tích hợp thử với app này trước (cùng `app_store_id` / bundle trong `dim_app_identifiers`), sau đó test mở rộng — tài liệu kỹ thuật: [128_APPSFLYER_INTEGRATION.md](../128_APPSFLYER_INTEGRATION.md); trạng thái query: [03 - AR_Tracer_Query_Verification.md](./03%20-%20AR_Tracer_Query_Verification.md) §Q14–Q15.

## B10. ⭐ Product × Geo Deep Dive — Top 3 Countries

```sql
-- Q16: DAU + Drawing + Retention by Country — Top 3 nước
-- Bước 1: Xác định top 3 countries by DAU
WITH country_dau AS (
    SELECT
        get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT CASE
            WHEN event_name IN ('session_start', 'user_engagement')
            THEN user_pseudo_id END) AS total_dau
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY get_json_string(geo_json, '$.country')
    ORDER BY total_dau DESC
    LIMIT 3
)
-- Bước 2: Chi tiết engagement × content cho top 3
SELECT
    get_json_string(b.geo_json, '$.country') AS country,
    b.event_date,
    -- Engagement
    COUNT(DISTINCT CASE
        WHEN b.event_name IN ('session_start', 'user_engagement')
        THEN b.user_pseudo_id END) AS dau,
    COUNT(DISTINCT CASE
        WHEN b.event_name = 'first_open'
        THEN b.user_pseudo_id END) AS new_users,
    -- Drawing
    COUNT(DISTINCT CASE
        WHEN b.event_name IN ('draw_with_lesson', 'draw_with_template',
            'content_draw', 'lessons_drawing',
            'lessons_free_start_drawing', 'lessons_Pro_start_drawing')
        THEN b.user_pseudo_id END) AS drawing_users,
    SUM(CASE
        WHEN b.event_name IN ('draw_finish_with_lesson',
            'draw_finish_with_template', 'content_done')
        THEN 1 ELSE 0 END) AS drawing_completions,
    -- Ad
    COUNT(DISTINCT CASE
        WHEN b.event_name LIKE 'ad_impression%'
        THEN b.user_pseudo_id END) AS dav,
    SUM(CASE WHEN b.event_name LIKE 'ad_impression%' THEN 1 ELSE 0 END) AS ad_impressions,
    -- IAP
    COUNT(DISTINCT CASE
        WHEN b.event_name IN ('iap_purchase', 'in_app_purchase')
        THEN b.user_pseudo_id END) AS iap_users,
    SUM(CASE WHEN b.event_name = 'trial_started' THEN 1 ELSE 0 END) AS trial_starts,
    SUM(CASE WHEN b.event_name = 'subscription_upgraded' THEN 1 ELSE 0 END) AS sub_upgrades
FROM bronze.fb_ar_tracer_trace_drawing_ios b
WHERE b.event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
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

-- Q17: Onboarding Funnel by Top 3 Countries
WITH country_dau AS (
    SELECT get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement')
            THEN user_pseudo_id END) AS total_dau
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY get_json_string(geo_json, '$.country') ORDER BY total_dau DESC LIMIT 3
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
WHERE b.event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
  AND b.event_name IN (
      'first_open', 'language_choose', 'intro_next_click', 'intro_category_choose',
      'intro_user_level_choose', 'intro_user_age_choose', 'intro_iap',
      'end_onboard_global', 'end_onboard_iaa', 'end_onboard_jp'
  )
GROUP BY get_json_string(b.geo_json, '$.country')
ORDER BY step1_install DESC;

-- Q18: Retention by Top 3 Countries (không inflate denominator: cohort user ∩ activity, rồi SUM theo country×retention_day)
WITH country_dau AS (
    SELECT get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement')
            THEN user_pseudo_id END) AS total_dau
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY get_json_string(geo_json, '$.country') ORDER BY total_dau DESC LIMIT 3
),
cohort_users AS (
    SELECT
        get_json_string(geo_json, '$.country') AS country,
        install_date,
        user_pseudo_id
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_name = 'first_open'
      AND event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
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
      AND b.event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
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
-- Tránh cartesian JOIN làm phình denominator (xem [03](./03%20-%20AR_Tracer_Query_Verification.md) §Q18). Ảnh kết quả mẫu: [AR Tracer/18-1.png](./AR%20Tracer/18-1.png)

-- Q19: D0 Activation by Top 3 Countries
WITH country_dau AS (
    SELECT get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement')
            THEN user_pseudo_id END) AS total_dau
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY get_json_string(geo_json, '$.country') ORDER BY total_dau DESC LIMIT 3
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
WHERE b.event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
  AND b.event_name IN ('first_open', 'draw_with_lesson', 'draw_with_template', 'content_draw')
GROUP BY get_json_string(b.geo_json, '$.country')
ORDER BY installs DESC;
```

## B11. T+1 Action Tracking

```sql
-- Q20: Postgres — app_daily_insights dùng app_row_id (FK apps.id), không có cột app_id Firebase
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

**API / snapshot:** Insight generator lưu `actions_json`; `AppInsightSnapshotBuilder` bổ sung `t1ActionTracking` (schemaVersion 8) từ insight **completed** ngày T-1.

## B12. Performance & guardrails

- **Fast path:** `gold.daily_overview`, `gold.retention_overview`, `gold.ad_performance`, `gold.fact_daily_app_metrics` — giới hạn cửa sổ 15–35 ngày; luôn filter app qua `silver.dim_app_identifiers`.
- **Deep path (bronze `fb_*`):** Q5/Q18 — chỉ drill-down khi gold/silver thiếu; tránh full scan không `event_date`; **Q18** dùng CTE tách `d0_users` / `activity` / aggregate — không `SUM(d0_users)` sau JOIN nhiều-dòng (cartesian).
- **Q6:** `retention_rate` D0+ nên **clamp ≤ 100%** (`LEAST(..., 100.0)`) khi `active_users` > cohort `first_open`.
- **Q11 (AR Tracer):** ưu tiên **Q11a/Q11b** (event + `ad_format` param) hoặc **Q4 AdMob**; `gold.ad_performance` khi ETL đã đủ; query `ad_impression1..4` mapping cổ điển thường **không** phản ánh thực tế app này.
- **Gold fact:** mọi SQL dùng **`total_ad_requests` / `total_matched_requests`**, không đặt tên `matched_requests`.

---

# PHẦN C — KNOWLEDGE BASE ENTRIES

## KB-1: Thresholds & Benchmarks (AR Tracer)

```
REVENUE:
  >+15% vs 7d avg → Positive | <-15% → Warning | <-25% → Critical

FILL RATE:
  >90% → Excellent | 85-90% → Good | 80-85% → Warning | <80% → Critical

eCPM:
  >+10% vs 7d → Positive | <-10% → Warning | <-20% → Critical

AD CONCENTRATION:
  Top 1 source >70% → Critical | >60% → Warning | <40% → Healthy

RETENTION (creative_utility targets):
  D1 >35% → Excellent | 30-35% → Good | 25-30% → Acceptable | <25% → Warning | <20% → Critical
  D7 >15% → Good | 12-15% → Acceptable | <10% → Warning

DRAWING RATE (KPI #1):
  >45% → Excellent | 40-45% → Good | 35-40% → Acceptable | 30-35% → Warning | <30% → Critical

D0 ACTIVATION:
  >30% → Excellent | 25-30% → Good | 20-25% → Acceptable | <20% → Warning

ONBOARDING:
  >75% complete → Excellent | 70-75% → Good | <60% → Warning | <50% → Critical

UA / ROI:
  >1.5 → Positive | 1.0-1.5 → Acceptable | 0.5-1.0 → Warning | <0.5 → Critical

TRIAL TO SUBSCRIPTION:
  >20% → Excellent | 15-20% → Good | 10-15% → Acceptable | <10% → Warning

SESSIONS/USER:
  >2.5 → Positive | 1.5-2.5 → Good | <1.5 → Warning

AD PENETRATION (DAV/DAU):
  >80% → Positive | 60-80% → Acceptable | <60% → Tip (room to optimize)
```

## KB-2: Cross-Reference Rules

```
SIGNAL 1: Revenue ↑ + Fill Rate ↓
→ "Revenue tăng nhờ volume/eCPM bù, nhưng fill giảm = fragile growth"
→ [Mediation] rà soát fill rate by format

SIGNAL 2: Revenue ↑ + DAU ↓
→ "Ads intensity tăng, không bền"
→ [Product] check ad load, user experience

SIGNAL 3: D1 ↓ + New Users ↑
→ "UA đang mang về low-quality users"
→ [UA] review campaign targeting

SIGNAL 4: D7 ↓ + D1 OK
→ "Core loop (drawing) không giữ chân"
→ [Product] review drawing experience, content freshness

SIGNAL 5: Drawing rate ↓ + DAU OK
→ "Users quay lại nhưng không vẽ = app đang mất core value"
→ [Product] KPI #1 alert — ưu tiên tối đa

SIGNAL 6: D0 Activation ↓ + Onboarding OK
→ "User hoàn thành onboarding nhưng không vẽ = missing CTA or content"
→ [Product] review post-onboarding flow, first draw trigger

SIGNAL 7: Trial conversion ↓ + Trial starts ↑
→ "Paywall friction hoặc trial value chưa đủ"
→ [Product] review trial experience, paywall copy

SIGNAL 8: Country A drawing_rate >> Country B
→ "Product experience khác nhau theo thị trường"
→ [Product] localization, content preference analysis

SIGNAL 9: gold.daily_overview empty + bronze có
→ "Pipeline gap"
→ [DA] [Dev] fix pipeline

SIGNAL 10: fact Q1 có revenue ngày T nhưng dau/dav/arpdau NULL
→ "Lag Firebase vs mediation hoặc chưa join daily_overview — xem §A3.1; đừng báo lỗi revenue"
→ Insight: dùng T−1 cho engagement hoặc Q5 bronze sau khi xác nhận event_date
```

## KB-3: Product × Geo Deep Dive Instructions

```
PHẦN PRODUCT × GEO (Section 🎮):
AI phải phân tích top 3 nước có nhiều DAU nhất. Cho MỖI nước, report phải có:

1. ENGAGEMENT PROFILE:
   - DAU, new_users, sessions/user
   - So sánh 3 nước với nhau

2. USER FLOW (onboarding):
   - Funnel 8 bước: first_open → ... → end_onboard
   - Drop-off % giữa mỗi bước
   - So sánh: nước nào onboard tốt nhất? Drop ở bước nào?
   - Mermaid flowchart cho mỗi nước (hoặc 1 chart so sánh)

3. CORE LOOP (drawing):
   - Drawing rate mỗi nước
   - Completion rate mỗi nước
   - D0 activation mỗi nước
   - So sánh: nước nào có user "sticky" nhất?

4. RETENTION by Country:
   - D1, D3, D7 cho mỗi nước
   - Nước nào retain tốt nhất?

5. MONETIZATION by Country:
   - DAV/DAU (ad penetration)
   - Trial starts / sub upgrades
   - So sánh willingness to pay

6. INSIGHT CHÉO:
   - Nước có drawing_rate cao có D7 tốt hơn không?
   - Nước có onboarding drop cao có drawing_rate thấp không?
   - Nước có D0 activation thấp có trial conversion kém không?

7. ACTIONS cụ thể:
   - Nước A: "Onboarding drop ở bước 4 (category) → simplify hoặc skip cho market này"
   - Nước B: "D0 activation thấp → chèn forced first draw trong onboarding"
   - Nước C: "Drawing rate cao nhưng trial thấp → paywall timing sớm quá"

FORMAT: Bảng so sánh 3 nước + flowchart onboarding mỗi nước
```

---

# PHẦN D — PROMPT (3 LAYERS)

## Layer 1: Global Instructions

*(Giữ nguyên từ tài liệu Daily Report Structure — Section 5, Layer 1)*

## Layer 2: Category Context — Creative Utility

```
[Category: Creative Utility — AR Drawing / Photo]

CORE LOOP: Install → Onboard (8 steps) → Browse → Create (draw/edit) → Complete & Share → Return.
MONETIZATION: IAA (5 format) + Subscription (trial→paid).

DIMENSION WEIGHTS: Revenue 20%, Growth 10%, Engagement 20%, Product 20%, AdInfra 15%, UnitEcon 10%, Portfolio 5%.

KPI TARGETS: drawing_rate >40%, d0_activation >25%, completion >50%, trial_to_sub >15%, D1 >30%, D7 >12%, fill >85%.

KPI #1: drawing_rate. Nếu giảm → leading indicator MẠNH HƠN cả revenue.

AD MAPPING (generic): ad_impression1=rewarded, 2=interstitial, 3=banner, 4=native — **AR Tracer thực tế:** chủ yếu `ad_impression_custom` + param `ad_format` (native, interstitial, app_open, banner, video_rewarded, …); soát Q4 AdMob cho revenue theo format.

PRODUCT × GEO: Section Product PHẢI phân tích top 3 countries bao gồm:
- Onboarding funnel mỗi nước (drop-off %, flowchart)
- Drawing rate, D0 activation, completion rate mỗi nước
- Retention D1/D7 mỗi nước
- Cross-insight: onboarding × drawing × retention correlation
- Action cụ thể per country

CROSS-SIGNAL ĐẶC THÙ:
- drawing_rate↓ → KPI #1 alarm, product team action
- D0 activation↓ + onboarding OK → missing first draw trigger
- Country A drawing >> Country B → localization opportunity
```

## Layer 3: Auto-generated App Context

```
[App: AR Tracer: Trace Drawing | iOS | com.avntech.ar-drawing]
firebase_id: ar_tracer_trace_drawing_ios

TOP EVENTS (7d, verify trên env — mẫu verify 2026-04): `screen_view`, `user_engagement`, `ad_impression_custom` (top ad), `ad_clicked`, `content_draw` / `draw_mode`, `iap_*`, `first_open`, … — **`ad_impression1`…`4` thường không vào top**; xem Q12 + §B8 Q11a.

DATA AVAILABILITY (kiểm tra theo môi trường):
- gold.fact_daily_app_metrics: ✅ (requests: `total_ad_requests`, `total_matched_requests`)
- gold.daily_overview: ⚠️ có thể trống theo app/pipeline — khi trống dùng Q5 bronze; khi có, align **event_date** với Q1 theo §A3.1 (T vs T−1, job 04:00 UTC)
- bronze.fb_*: ✅
- bronze.xmp_report: ✅ (iOS filter `id` + `app_store_id` trong dim — vd `id6504559449`)
- bronze.adjust_report: ⚠️ (AR Tracer thường không có `adjust_id`)
- AppsFlyer API / bronze: 📋 pilot trên app này — [128_APPSFLYER_INTEGRATION.md](../128_APPSFLYER_INTEGRATION.md)
- Firebase `af_status` trong user_properties: ⚠️ thường Unknown — đừng tin hoàn toàn cho attribution V1

KNOWN DATA GAPS:
- daily_overview missing hoặc lag → DAU/sessions từ Q5 hoặc đợi job Firebase
- DAU trên fact NULL intraday T → bình thường trước refresh; insight “đủ engagement” dùng T−1 hoặc sau job
- adjust_id thiếu → UA install Adjust (Q14c) skip; AppsFlyer: snapshot dùng raw / gold / aggregate Master
```

---

# PHẦN E — METRICS CHO REPORT

## E1. Revenue & Monetization

| Metric | Công thức | Source | Format |
|--------|----------|--------|--------|
| revenue_t | Tổng revenue ngày T | Q1 gold | $#,###.## |
| revenue_dod_pct | (T - T1) / T1 × 100 | Derived | +#.#% |
| revenue_vs_7d_pct | (T - 7d_avg) / 7d_avg × 100 | Derived | +#.#% |
| ecpm_t | Revenue / impressions × 1000 | Q1 gold | $#.## |
| fill_rate_t | Cột `fill_rate` trên fact hoặc `total_matched_requests` / `total_ad_requests` × 100 | Q1 gold | #.#% |
| impressions_t | Tổng impressions | Q1 gold | #,### |
| top_source_sow | Max source rev / total × 100 | Q3 mediation | #.#% |
| iap_revenue_usd | Tổng IAP revenue | Q9 firebase | $#,###.## |

## E2. Engagement & Retention

| Metric | Công thức | Source | Format |
|--------|----------|--------|--------|
| dau | Unique users session_start ∪ user_engagement | Q5 / Q2 | #,### |
| new_users | Unique users first_open | Q5 | #,### |
| dav | Unique users ad_impression* | Q5 | #,### |
| sessions_per_user | Sessions / DAU | Derived | #.# |
| ad_penetration | DAV / DAU × 100 | Derived | #.#% |
| d1_retention | D1 active / D0 × 100 | Q6 | #.#% |
| d7_retention | D7 active / D0 × 100 | Q6 | #.#% |

## E3. Product & Content (Global + Per Country)

| Metric | Công thức | Source | Format |
|--------|----------|--------|--------|
| drawing_rate | Drawing users / DAU × 100 | Q7 + Q5 | #.#% |
| drawing_users | Unique users draw events | Q7 | #,### |
| completion_rate | Completions / starts × 100 | Q7 | #.#% |
| d0_activation | D0 drawers / installs × 100 | Q10 | #.#% |
| onboard_complete_rate | Step8 / Step1 × 100 | Q8 | #.#% |
| onboard_drop_step | Bước có drop lớn nhất | Q8 | Step N: #.#% drop |
| pro_ratio | Pro lessons / total × 100 | Q7 | #.#% |
| share_rate | Share users / DAU × 100 | Q7 + Q5 | #.#% |

**Per country (top 3):**

| Metric | Công thức | Source |
|--------|----------|--------|
| drawing_rate_{country} | Drawing users / DAU per country | Q16 |
| d0_activation_{country} | D0 drawers / installs per country | Q19 |
| onboard_complete_{country} | Step8 / Step1 per country | Q17 |
| onboard_drop_step_{country} | Bước drop lớn nhất per country | Q17 |
| d1_retention_{country} | D1 rate per country | Q18 |
| d7_retention_{country} | D7 rate per country | Q18 |

## E4. Growth & Acquisition

| Metric | Công thức | Source | Format |
|--------|----------|--------|--------|
| ua_cost_t | Tổng UA cost | Q1 gold | $#,###.## |
| roi_t | Revenue / ua_cost × 100 | Q1 gold | #.#% |
| spend_by_channel | Cost per module | Q13 XMP | $#,###.## |
| organic_pct | Organic / total installs × 100 | Q15 AppsFlyer (raw / gold / aggregate) hoặc Firebase | #.#% |

## E5. Health Scoring

| Dimension | Weight | Score Input | Scoring Rules |
|-----------|--------|------------|---------------|
| Revenue | 20% | revenue_vs_7d, ecpm_trend, iap_exists | Base 50 ± (see KB-1) |
| Growth | 10% | new_users_trend, roi, organic_pct | Base 50 ± |
| Engagement | 20% | dau_trend, d1, d7, sessions | Base 50 ± |
| Product | 20% | drawing_rate, d0_activation, completion, onboard | Base 50 ± |
| Ad Infra | 15% | fill_rate, sow_concentration, ecpm_by_format | Base 50 ± |
| Unit Econ | 10% | arpdau_trend, ltv_cac_ratio | Base 50 ± |
| Portfolio | 5% | revenue_rank, geo_diversification | Base 50 ± |
| Velocity | — | action_resolution_rate (T+1) | Base 50 ± |

---

# PHẦN F — REPORT SECTIONS CHO AR TRACER

*(AI phải sinh report theo ĐÚNG thứ tự này)*

## Section 1: Health Score + Radar + Dimension Table
Radar chart (Mermaid), tier badge, so sánh vs hôm qua.

## Section 2: T+1 Action Review
Load Q20. Classify ✅/⏳/❌. Summary X/Y resolved.

## Section 3: Revenue & Monetization
Q1 + Q3 + Q4. Revenue trend 14d (xychart). Revenue split (pie). Top ad units. eCPM, fill rate. Cross-ref fill vs revenue.

## Section 4: Ad Infrastructure
Q3 + Q11. SoW concentration. Ad format breakdown. Fill rate by format.

## Section 5: Engagement & Retention
Q5 (or Q2) + Q6. DAU trend (xychart). Retention table D1/D7. Sessions/user.

## Section 6: 🎮 Product & Content — Bao gồm Geo Deep Dive
```
6a. Global metrics: drawing_rate, completion, d0_activation, onboarding funnel
6b. Top 3 Countries Deep Dive (Q16, Q17, Q18, Q19):

    BẢNG SO SÁNH:
    | Metric          | 🇺🇸 USA  | 🇧🇷 Brazil | 🇮🇳 India | Global |
    |-----------------|---------|----------|---------|--------|
    | DAU             |         |          |         |        |
    | Drawing Rate    |         |          |         |        |
    | D0 Activation   |         |          |         |        |
    | Completion Rate |         |          |         |        |
    | Onboard Complete|         |          |         |        |
    | Onboard Drop@   |         |          |         |        |
    | D1 Retention    |         |          |         |        |
    | D7 Retention    |         |          |         |        |
    | DAV/DAU         |         |          |         |        |
    | Trial→Sub       |         |          |         |        |

    ONBOARDING FUNNEL mỗi nước (flowchart hoặc bảng):
    first_open → language → intro → category → level → age → iap → complete
    với % giữa mỗi bước, highlight bước drop nhiều nhất

    CROSS-INSIGHT:
    - "USA: onboarding 78% nhưng drawing rate chỉ 38% → gap giữa onboard và core loop"
    - "Brazil: D0 activation 32% (cao nhất) nhưng D7 chỉ 8% → engage nhanh nhưng churn nhanh"
    - "India: onboarding drop mạnh ở step4 (category) → content preference khác biệt"

    ACTIONS per country:
    - [Product] USA: chèn forced first draw sau onboarding
    - [Product] Brazil: improve D3-D7 content refresh, push notification
    - [Product] India: simplify category step, test skip option
```

## Section 7: Growth & Acquisition
Q1 + Q13 + Q14 + Q15. ROI, spend by channel, organic/paid.

## Section 8: Subscription Health
Q9. Trial funnel, conversion rate, cancellation, refunds.

## Section 9: Anomalies & Alerts
Auto-detect từ cross-reference rules (KB-2).

## Section 10: Action Plan
New actions (sort by urgency) + Carried Forward from T-1.

## Appendix: Data Sources & Gaps
Ghi rõ mỗi block dùng Gold/Bronze, data gaps.

---

# PHẦN G — CHECKLIST LẤY DATA

Khi bạn chạy queries thực tế, lấy output của 20 queries sau và gửi lại cho tôi:

| # | Query | Ước tính thời gian | Ưu tiên |
|---|-------|-------------------|---------|
| Q1 | Gold revenue/ecpm/fill + `total_ad_requests`/`total_matched_requests` (15d) | ~1s | P0 |
| Q2 | Gold daily_overview (14d) | ~1s | P0 (check empty / lag T−1) |
| Q3 | Mediation by ad source | ~2s | P0 |
| Q4 | AdMob by ad unit | ~1s | P0 |
| Q5 | Firebase DAU/DAV/sessions (14d) | ~5s | P0 |
| Q6 | Firebase retention cohort (35d) | ~8s | P0 |
| Q7 | Firebase drawing/content (14d) | ~5s | P0 |
| Q8 | Firebase onboarding funnel (14d) | ~3s | P0 |
| Q9 | Firebase IAP/subscription (14d) | ~3s | P0 |
| Q10 | Firebase D0 activation (14d) | ~3s | P0 |
| Q11 | Firebase ad: Q11a event + Q11b `ad_format`; Q11c legacy (14d) | ~3s | P1 |
| Q12 | Firebase top events (7d) | ~3s | P1 |
| Q13 | XMP UA cost by channel (14d) | ~2s | P1 |
| Q14 | AppsFlyer (raw / gold / aggregate) / Adjust (Q14c) | ~2s | P1 (Adjust skip nếu không có adjust_id) |
| Q15 | AppsFlyer attribution (Q15) / Firebase af_status (Q15b) | ~3s | P1 |
| Q16 | Product × Geo: Top 3 countries engagement+drawing | ~8s | P0 ⭐ |
| Q17 | Product × Geo: Onboarding per country | ~5s | P0 ⭐ |
| Q18 | Product × Geo: Retention per country | ~8s | P0 ⭐ |
| Q19 | Product × Geo: D0 activation per country | ~3s | P0 ⭐ |
| Q20 | Previous day's actions (T+1) | ~1s | P0 (skip if first run) |

**Tổng ước tính: ~70s nếu chạy hết. Priority P0 = ~50s.**

### Gửi bộ số liệu đầy đủ để xây App Insight

Kèm theo export (CSV/JSON/screenshot) hoặc bảng copy từ StarRocks/Postgres, nên ghi rõ:

1. **`insight_date` / `targetDate`** dự kiến (UTC) và thời điểm chạy query (để hiểu đã qua job Firebase 04:00 UTC hay chưa).
2. **Toàn bộ hàng P0** trong bảng trên + **Q11a/Q11b** (P1) nếu phân tích format quảng cáo.
3. Một dòng **trạng thái pipeline:** `gold.daily_overview` có dữ liệu cho `admob_app_id` app chưa; fact Q1 có `dau` NULL ngày nào.
4. (Tuỳ chọn) Ảnh minh chứng đã verify: [AR Tracer](./AR%20Tracer/) + mô tả trong [03 - AR_Tracer_Query_Verification.md](./03%20-%20AR_Tracer_Query_Verification.md).

Sau khi có gói dữ liệu này, có thể ghép với snapshot `AppInsightSnapshotBuilder` / prompt Layer 1–3 để ra bản insight mẫu.

---

*Guideline này đồng bộ với bản verify Q1–Q20 (file 03). Mỗi app mới chỉ cần thay: Layer 2 (category), Layer 3 (auto-context), event lists trong Q7–Q10, geo queries Q16–Q19, và dòng dim (bundle, `app_store_id`, XMP id-prefix).*
