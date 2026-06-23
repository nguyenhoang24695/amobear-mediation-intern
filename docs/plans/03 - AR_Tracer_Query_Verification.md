# AR Tracer — Query Verification & Remediation Plan
## Kiểm tra 20 queries + kế hoạch khắc phục

> **Ngày kiểm tra:** 2026-04-09
> **Data range:** 2026-03-25 → 2026-04-08 (15 ngày)
> **App:** AR Tracer — Trace Drawing iOS (`ar_tracer_trace_drawing_ios`)

---

## 1. Tổng kết trạng thái

| Status | Số lượng | Queries |
|--------|---------|---------|
| ✅ Data OK — sẵn sàng dùng | 10 | Q3, Q4, Q5, Q7, Q8, Q9, Q10, Q12, Q16, Q17 |
| ✅ Gold fact có `total_ad_requests` / `total_matched_requests`; MCP/SQL dùng đúng tên cột | 1 | Q1 |
| ⚠️ Data OK nhưng cần sửa SQL/logic | 4 | Q6, Q11, Q13, Q18 |
| 🔧 Cần fix Gold/Silver pipeline | 1 | Q2 (empty) |
| 📋 Cần tạo mới / tích hợp | 3 | Q14 (AppsFlyer API), Q15 (af_status chưa populate), Q20 (T+1 feature) |
| ⏭️ Bỏ qua V1 | 1 | Q19 (dùng data Q16 thay thế) |

---

## 2. Chi tiết từng Query

### Q1: Gold Revenue/eCPM/Fill — ✅ Cột requests đã có; dùng đúng tên

**Vấn đề (đã làm rõ):** Không có cột tên `matched_requests`. Trên `gold.fact_daily_app_metrics` tên đúng là **`total_ad_requests`** và **`total_matched_requests`** (populate từ `silver.daily_app_revenue` trong job `RunGoldFactDailyAppMetricsAsync`). Lỗi thường gặp là **query/prompt sai tên cột**, không phải thiếu pipeline Gold.

**Khắc phục SQL:**
```sql
-- Q1 FIX: Dùng total_ad_requests / total_matched_requests (không dùng matched_requests)
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
```

**Quy ước dữ liệu & App Insight (ưu tiên):**

- **`gold.fact_daily_app_metrics`:** Cập nhật theo ngày **T** khi AdMob/XMP và job transform chạy (revenue, requests, cost, …).
- **`gold.daily_overview`:** Đổ từ pipeline Firebase; job mặc định **04:00 UTC** → so với “hôm nay” trên wall-clock, engagement Gold thường khả dụng đến **T−1** (ngày dữ liệu Firebase đã hoàn tất sau job).
- **Kết luận V1:** Với App Insight, **coi ngày báo cáo đầy đủ engagement (DAU/DAV/ARPDAU) là T−1**, hoặc map DAU/DAV/ARPDAU từ `gold.daily_overview` cùng `event_date` sau khi job chạy — tránh kỳ vọng DAU đầy đủ cho **T** song song revenue intraday cùng ngày trước khi Firebase Gold đã refresh.

**Pipeline:** Không cần thêm cột requests trên Gold cho mục đích Q1; chỉ cần **MCP/SQL/documentation** dùng đúng `total_ad_requests` / `total_matched_requests`.

**Cần verify thêm:** Sau job Firebase 04:00 UTC, kiểm tra `dau` / `dav` / `arpdau` trên fact (join `daily_overview`) còn NULL không cho từng `date`.

---

### Q2: Gold Daily Overview — ❌ Empty

**Vấn đề:** Bảng `gold.daily_overview` KHÔNG có dữ liệu cho app này.

**Tác động:** Không có DAU/sessions/engagement từ Gold → phải dùng Bronze fallback (Q5) cho toàn bộ engagement data.

**Khắc phục pipeline:**
```sql
-- Kiểm tra bảng có tồn tại và schema
SHOW CREATE TABLE gold.daily_overview;

-- Kiểm tra có data cho BẤT KỲ app nào không
SELECT app_id, COUNT(*), MIN(event_date), MAX(event_date)
FROM gold.daily_overview
GROUP BY app_id
LIMIT 10;

-- Nếu bảng tồn tại nhưng chưa populate → cần INSERT từ Bronze
-- Giả sử DDL gold.daily_overview có: event_date, app_id, dau, new_users, dav, sessions, ...
INSERT INTO gold.daily_overview
SELECT
    event_date,
    'ar_tracer_trace_drawing_ios' AS app_id,
    COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement')
        THEN user_pseudo_id END) AS dau,
    COUNT(DISTINCT CASE WHEN event_name = 'first_open'
        THEN user_pseudo_id END) AS new_users,
    COUNT(DISTINCT CASE WHEN event_name LIKE 'ad_impression%'
        THEN user_pseudo_id END) AS dav,
    COUNT(DISTINCT CASE WHEN event_name = 'session_start'
        THEN CONCAT(user_pseudo_id, '_',
            COALESCE(get_json_string(event_params_json, '$.ga_session_id'), ''))
        END) AS sessions,
    -- avg_sessions, avg_dur_min cần tính thêm
    NULL AS avg_sessions,
    NULL AS avg_dur_min,
    NULL AS ad_penetration
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY event_date;
```

**Quyết định V1:** Dùng Q5 (Bronze fallback) trực tiếp. Q5 data đã xác nhận OK. Gold populate là nhiệm vụ dài hạn.

---

### Q3: Mediation by Ad Source — ✅ OK

**Kết quả xác nhận:**

| Ad Source | Revenue | Impressions | eCPM |
|-----------|--------:|----------:|-----:|
| AdMob Network Waterfall | $6,237.34 | 1,034,407 | $6.03 |
| AdMob Network | $4,894.15 | 2,703,509 | $1.81 |
| Unity Ads (bidding) | $1,477.83 | 237,212 | $6.23 |
| Liftoff Monetize (bidding) | $959.76 | 208,559 | $4.60 |
| AppLovin (bidding) | $705.58 | 64,919 | $10.87 |
| Pangle (bidding) | $667.48 | 381,248 | $1.75 |
| Meta Audience Network | $503.51 | 257,189 | $1.96 |
| Moloco Ads SDK (bidding) | $461.44 | 229,114 | $2.01 |
| Pangle | $90.96 | 11,156 | $8.15 |

**Nhận xét:** Top source = AdMob Waterfall chiếm ~38.7% revenue (chưa vượt ngưỡng 60% cảnh báo). AppLovin eCPM cao nhất $10.87 nhưng volume thấp. Data sạch, sẵn sàng dùng.

---

### Q4: AdMob by Ad Unit — ✅ OK

| Ad Unit | Format | Revenue | Impressions |
|---------|--------|--------:|----------:|
| V4_ArDrawingOS_InApp_Inter | interstitial | $6,930.42 | 601,044 |
| V4_ArDrawingOS_InApp_Reward | rewarded | $2,321.38 | 94,381 |
| V4_ArDrawingOS_InApp_Banner1 | banner | $1,329.52 | 2,649,088 |
| V4_ArDrawingOS_Session2_AppOpenAll | app_open | $958.26 | 200,043 |
| V4_ArDrawingOS_FirstOpen_AppOpenH | app_open | $857.84 | 59,127 |

**Nhận xét:** Interstitial là "máy in tiền" ($6,930, chiếm ~56% revenue). Banner volume cao nhất (2.6M imp) nhưng revenue thấp hơn. 2 ad units app_open chiếm ~$1,816.

---

### Q5: Firebase DAU/DAV/Sessions — ✅ OK (nhưng chậm >1 phút)

**Data snapshot (sample):**

| Date | DAU | New Users | DAV | Sessions | Engagement (ms) | Paying |
|------|----:|----------:|----:|--------:|---------------:|-------:|
| 04-07 | 27,455 | 12,718 | 25,416 | 32,185 | 20.4B | 588 |
| 04-08 | 26,142 | 11,065 | 23,149 | 30,446 | 19.5B | 593 |

**Phát hiện quan trọng:**
- DAU ~23K-27K, trend ổn định
- DAV/DAU ~92-93% → ad penetration RẤT CAO (vượt target 80%)
- Sessions/user ~1.17 → THẤP hơn target 2.0 ⚠️
- New users ~46-48% DAU → gần nửa DAU là user mới mỗi ngày

**Vấn đề performance:** Query >1 phút. Khắc phục:
- Thêm `AND event_name IN (...)` filter để giảm scan
- Hoặc tạo MV/Silver table pre-aggregated

```sql
-- Q5 OPTIMIZED: Thêm event filter để giảm scan
SELECT event_date, ...
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name IN (
    'session_start', 'user_engagement', 'first_open',
    'ad_impression', 'ad_impression1', 'ad_impression2', 'ad_impression3',
    'ad_impression4', 'ad_impression_custom',
    'in_app_purchase', 'iap_purchase'
  )
GROUP BY event_date
ORDER BY event_date;
```

---

### Q6: Retention Cohort — ⚠️ Cần fix logic

**Data mẫu:**

| Install Date | Retention Day | D0 Users | Active | Rate |
|-------------|:---:|------:|-------:|-----:|
| 2026-03-05 | 0 | 5,957 | 6,007 | 100.8% |
| 2026-03-05 | 1 | 5,957 | 987 | 16.6% |
| 2026-03-05 | 7 | 5,957 | 134 | 2.2% |
| 2026-03-05 | 30 | 5,957 | 56 | 0.9% |

**Vấn đề phát hiện:**
1. **D0 retention >100%** (100.8%, 102.5%, 100.5%): Có thể do `active_users` D0 > `d0_users` (first_open). Nguyên nhân: một số users có `session_start/user_engagement` ở D0 nhưng `first_open` không ghi nhận (late event, duplicate, hoặc reinstall).
2. **D1 = 16-17%** → THẤP hơn target 30% ⚠️ Critical signal
3. **D7 = 2-3%** → RẤT THẤP so với target 12% ⚠️ Critical signal

**Fix SQL:** D0 nên clamp tại 100%, hoặc dùng D0 users = MAX(first_open users, D0 active users):
```sql
-- Trong query, wrap retention_rate:
LEAST(
    ROUND(COUNT(DISTINCT CASE
        WHEN b.event_name IN ('session_start', 'user_engagement')
        THEN b.user_pseudo_id END) * 100.0
    / NULLIF(d.d0_users, 0), 1),
    100.0
) AS retention_rate
```

**Kết quả sau fix (screenshot):**

![Q6 retention cohort sau clamp D0](AR%20Tracer/6-2.png)

**⚠️ INSIGHT CRITICAL:** D1 16.6% và D7 2.2% là RẤT THẤP. Đây sẽ là finding #1 trong báo cáo insight. Cần cross-check với onboarding (Q8) và D0 activation (Q10) để tìm nguyên nhân.

---

### Q7: Drawing/Content — ✅ OK, có findings quan trọng

**Data snapshot (04-07):**

| Metric | Value |
|--------|------:|
| Drawing users | 14,626 |
| Drawing completions | 25,964 |
| Pro lessons | 0 |
| Free lessons | 62 |
| Template starts | 0 |
| Template completions | 0 |
| Magic photo users | 2,865 |
| Share users | 59 |

**Phát hiện:**
1. **Drawing rate = 14,626 / 27,455 (DAU) = 53.3%** → VƯỢT target 40% ✅
2. **Completions > starts?** 25,964 completions vs ~14,626 drawing users → mỗi user complete ~1.78 lần. OK — users vẽ nhiều bài.
3. **Pro lessons = 0 MỌI NGÀY** ⚠️ → Cần kiểm tra: event `lessons_Pro_start_drawing` có đang fire không? Hay Pro content bị lock hoàn toàn?
4. **Template starts = 0 MỌI NGÀY** ⚠️ → Tương tự, `draw_with_template` không fire. Feature có active?
5. **Free lessons chỉ 60-87/ngày** → Rất thấp so với drawing_users 14K
6. **Share rate = 59 / 27,455 = 0.2%** → Cực thấp ⚠️

**Root cause cần investigate:**
- Có vẻ users chủ yếu dùng `content_draw` (không phải lesson/template). Xem Q12 top events: `content_draw` = 312K events vs `draw_with_lesson` = 39K.
- Pro/template features có thể đã bị disable hoặc event tracking bị broken.

---

### Q8: Onboarding Funnel — ✅ OK, findings quan trọng

**Funnel trung bình (aggregated over 15 days):**

```
Step 1: first_open (install)     → ~10,000/ngày (baseline)
Step 2: language_choose          → ~3,500 (35% of step1) ⚠️ DROP 65%
Step 3: intro_next_click         → ~10,200 (>100% of step1?!)
Step 4: intro_category_choose    → ~5,600 (56%)
Step 5: intro_user_level_choose  → ~5,100 (51%)
Step 6: intro_user_age_choose    → ~5,100 (51%)
Step 7: intro_iap                → ~7,100 (71%)
Step 8: end_onboard_*            → ~8,200 (82%)
```

**Phát hiện quan trọng:**
1. **Step 3 > Step 1**: `intro_next_click` (10,200) > `first_open` (10,000). Giải thích: step 3 có thể fire cho cả returning users chưa complete onboard, không chỉ new installs.
2. **Step 2 là bottleneck lớn nhất**: Chỉ 35% users chọn language. Nhưng step 8 = 82% → Có vẻ nhiều users SKIP step 2 (auto-detect language?) rồi nhảy thẳng step 3+.
3. **Step 4→5→6 ổn định ~51%**: Drop từ step 3→4 (50%→56%) rồi giữ phẳng.
4. **Step 7 (iap) > Step 6**: 71% vs 51% → iap screen có thể show cho nhiều users hơn (auto-trigger?).
5. **Onboarding completion rate = step8/step1 = 82%** → VƯỢT target 70% ✅ nhưng cần hiểu rõ flow thực tế.

**⚠️ Cần clarify logic:** Funnel này KHÔNG giảm dần đều — step 2 drop mạnh rồi step 7,8 lại cao hơn step 4,5,6. Có thể do:
- Nhiều onboarding paths (global / iaa / jp)
- Một số steps optional hoặc auto-fire
- Users mở lại app trigger lại step 3+

---

### Q9: IAP/Subscription — ✅ OK

**Data snapshot (04-07):**

| Metric | Value |
|--------|------:|
| IAP shows | 71,124 |
| IAP clicks | 11,843 |
| IAP views | 43 |
| IAP pays | 0 |
| IAP purchases | 1,268 |
| IAP users | 588 |
| IAP revenue | $1,005.86 |
| Trial starts | 521 |
| Sub upgrades | 2 |
| Trial cancels | (scrolled) |

**Phát hiện:**
1. **IAP funnel conversion:** show→click = 16.6%, click→purchase = 10.7%, show→purchase = 1.78%
2. **iap_views = 43, iap_pays = 0** → Các event `iap_open_view` và `iap_open_pay` gần như không fire. Có thể là event tracking chưa implement đúng hoặc flow IAP không qua steps này.
3. **Trial starts = 521, sub upgrades = 2** → Trial-to-sub rate = **0.38%** ⚠️⚠️ CỰC THẤP (target 15%)
4. **IAP revenue ~$600-1000/ngày** → ~$700 avg, chiếm ~50% so với $1,300 ad revenue.

**⚠️ CRITICAL FINDING:** Trial conversion 0.38% thay vì target 15%. Hoặc event `subscription_upgraded` không tracking đúng, hoặc trial → subscription flow thực sự có vấn đề nghiêm trọng.

---

### Q10: D0 Activation — ✅ OK

| Date | Installs | D0 Drawers | D0 Rate |
|------|--------:|----------:|--------:|
| 04-07 | 12,718 | 6,765 | 53.2% |
| 04-08 | 11,065 | 6,037 | 54.6% |

**Nhận xét:** D0 activation 53-63% → VƯỢT target 25% rất nhiều ✅. Hơn nửa new users vẽ ngay ngày cài. Tuy nhiên, kết hợp với D1 chỉ 16% → users vẽ D0 rồi KHÔNG quay lại.

---

### Q11: Ad by Format — ⚠️ Chỉ hiện 1 format

**Vấn đề:** Kết quả chỉ hiện `app_open` format (~270K-390K impressions/ngày). Các format rewarded, interstitial, banner, native KHÔNG xuất hiện.

**Nguyên nhân:** Ad format mapping dùng event name `ad_impression1..4` nhưng trong data thực (xem Q12), event tên là:
- `ad_impression_custom` → app_open (2.56M events, TOP ad event)
- `ad_clicked` → 389K events
- Không thấy `ad_impression1`, `ad_impression2`, `ad_impression3`, `ad_impression4` trong top 50 events!

**Root cause:** App AR Tracer dùng **event naming khác** với mapping giả định:
- KHÔNG dùng `ad_impression1/2/3/4`
- Dùng `ad_impression_custom` cho app_open
- Các format khác có thể track qua `ad_clicked` hoặc event params chứa format info

**Fix cần thiết:**
```sql
-- Kiểm tra tất cả ad-related events và params
SELECT
    event_name,
    COUNT(*) AS cnt,
    COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND (event_name LIKE 'ad_%' OR event_name LIKE 'banner_%')
GROUP BY event_name
ORDER BY cnt DESC;

-- Kiểm tra event_params cho ad_impression_custom để tìm format
SELECT
    event_name,
    get_json_string(event_params_json, '$.ad_format') AS ad_format,
    get_json_string(event_params_json, '$.ad_unit_name') AS ad_unit,
    get_json_string(event_params_json, '$.ad_platform') AS ad_platform,
    COUNT(*) AS cnt
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  AND event_name = 'ad_impression_custom'
LIMIT 20;
```

**Kết quả verify (2 query):**

- **Query 1 — volume theo tên event** (`ad_impression_custom`, `ad_clicked`, `banner_event`, …):

![Q11-1 ad events by event_name](AR%20Tracer/11-1.png)

- **Query 2 — breakdown `ad_format` từ params** (`native`, `interstitial`, `app_open`, `banner`, `video_rewarded`, …):

![Q11-2 ad_format từ event_params](AR%20Tracer/11-2.png)

**Quyết định V1:** Dùng Q4 (AdMob by ad unit + format) thay cho Firebase ad format breakdown. AdMob data đã có format rõ ràng.

---

### Q12: Top Events — ✅ OK, rất hữu ích

**Top 30 events (7 ngày):**

| Event | Count | Unique Users |
|-------|------:|----------:|
| screen_view | 6,650,801 | 149,346 |
| user_engagement | 5,130,859 | 145,900 |
| qonversion_remoteconfig_response | 3,586,811 | 159,771 |
| **ad_impression_custom** | **2,564,157** | **123,863** |
| intro_next_click | 567,246 | 68,303 |
| iap_show | 500,285 | 125,555 |
| iap_close | 447,049 | 98,884 |
| ad_clicked | 389,778 | 69,358 |
| content_click | 351,272 | 81,376 |
| intro_normal | 335,695 | 143,530 |
| **draw_mode** | **312,793** | **78,141** |
| **content_draw** | **312,543** | **78,063** |
| session_start | 219,064 | 143,431 |
| content_start | 219,005 | 66,767 |
| content_done | 157,542 | 45,970 |
| exit_ok | 108,276 | 37,271 |
| StorKitPurchase | 84,400 | 34,275 |
| iap_click | 84,344 | 34,250 |
| first_open | 79,381 | 79,133 |
| ATT_permission | 62,399 | 62,188 |
| draw_with_lesson | 39,756 | 15,121 |

**Phát hiện quan trọng:**
1. **Ad events:** `ad_impression_custom` (2.56M) là event quảng cáo CHÍNH. `ad_impression1/2/3/4` KHÔNG xuất hiện → confirm Q11 issue
2. **Content flow:** `content_click` (351K) → `content_draw` (312K) → `content_done` (157K). Completion rate = 157K/312K = **50.3%** ✅
3. **Draw with lesson chỉ 39K** vs `content_draw` 312K → Phần lớn users dùng content_draw, KHÔNG phải lesson
4. **iap_close (447K) >> iap_click (84K)**: 84% users đóng paywall mà không click
5. **StorKitPurchase (84K)** → event StoreKit (Apple), confirm có IAP purchases
6. **Qonversion events rất cao** (3.5M) → QOn SDK đang fire nhiều config events

---

### Q13: XMP Cost — ⚠️ Cần fix filter

**Vấn đề:** `store_package_id` cho iOS app này là `id6504559449` (App Store ID), KHÔNG phải bundle_id.

**Dim (đã có sẵn):** Trong `silver.dim_app_identifiers`, app AR Tracer có **`app_store_id = 6504559449`**. Cách XMP lưu tương ứng là **`id{app_store_id}`** → `id6504559449`. Join cost pipeline (`RunGoldFactDailyAppMetricsAsync` / XMP) dùng điều kiện kiểu `d.app_store_id != ''` và khớp `x.store_package_id` với `product_id` / `store_package_id` / `CONCAT('id', d.app_store_id)` — filter trực tiếp bằng literal dưới đây là đúng với dim.

**Fix:**
```sql
-- Q13 FIX: Dùng App Store ID cho iOS apps (khớp dim_app_identifiers.app_store_id = 6504559449)
SELECT x.`date`, x.module, SUM(x.cost) AS daily_cost
FROM bronze.xmp_report x
WHERE x.store_package_id = 'id6504559449'
  AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY x.`date`, x.module
ORDER BY x.`date`, daily_cost DESC;
```

**Data OK (sau fix):** TikTok > Apple > Google > Facebook > Mintegral. Sẵn sàng dùng.

**Next step — AppsFlyer pilot:** Tích hợp thử **AppsFlyer** với app này trước (cùng định danh store / bundle trong dim), sau đó test chung với Q14/Q15 (`bronze.appsflyer_report`, attribution). Xem mục Q14, Q15.

**Long-term fix:** Prompt/KB ghi rõ: iOS filter XMP bằng **`id` + app_store_id** từ dim; Android dùng `package_name` / bundle_id. (Cột `app_store_id` đã có trên `silver.dim_app_identifiers` — ưu tiên đọc từ dim thay vì hard-code trong production queries.)

---

### Q14: Adjust Installs — ❌ Không có data

**Lý do:** App này dùng **AppsFlyer** (không phải Adjust). `adjust_id` = NULL trong `dim_app_identifiers`.

**Action:** Bạn sẽ tích hợp AppsFlyer data vào StarRocks. Khi có, tạo bảng `bronze.appsflyer_report` tương tự `bronze.adjust_report`.

---

### Q15: AppsFlyer Attribution — ⚠️ af_status chưa populate đúng

**Kết quả:** 153,106 "Unknown", chỉ 1 "Organic".

**Nguyên nhân:** `user_properties_json` KHÔNG chứa `af_status` cho hầu hết users. AppsFlyer SDK có thể:
- Chưa gửi attribution data vào Firebase user properties
- Hoặc pipeline ETL chưa capture field này

**Action:** Khi tích hợp AppsFlyer API trực tiếp vào StarRocks, sẽ có bảng `bronze.appsflyer_report` với installs, network, campaign, country — tương tự Adjust.

**V1 decision:** Attribution = N/A. Ghi rõ trong data gaps.

---

### Q16: Product × Geo Top 3 — ✅ OK, data rất phong phú

**Top 3 countries by DAU: United States, United Kingdom, Japan**

**Sample data (04-07):**

| Country | DAU | New Users | Drawing Users | Completions | DAV | Ad Imp | IAP Users | Trial Starts | Sub Up |
|---------|----:|--------:|------------:|----------:|----:|------:|--------:|----------:|------:|
| 🇺🇸 United States | (largest) | (largest) | | | | | | | |
| 🇬🇧 United Kingdom | 2,464 | 1,257 | 1,531 | 3,083 | 1,914 | 43,439 | 68 | 12 | 12 |
| 🇯🇵 Japan | 1,536 | 760 | 829 | 1,336 | 1,010 | 19,314 | 45 | 11 | 11 |

**Nhận xét:** Data đầy đủ, sẵn sàng cho Product × Geo deep dive. Có thể tính drawing_rate, ad_penetration, trial conversion per country.

---

### Q17: Onboarding per Country — ✅ OK

| Country | Install | Language | Intro | Category | Level | Age | IAP | Complete |
|---------|-------:|--------:|------:|--------:|-----:|----:|----:|--------:|
| 🇺🇸 US | 32,978 | 319 | 36,854 | 31,421 | 31,557 | 31,337 | 36,489 | 31,311 |
| 🇬🇧 UK | 11,667 | 335 | 12,495 | 11,225 | 11,277 | 11,206 | 12,166 | 11,376 |
| 🇯🇵 JP | 10,398 | 133 | 710 | 563 | 564 | 561 | 10,874 | 9,930 |

**Phát hiện rất thú vị:**
1. **US & UK:** Step3 (intro) > Step1 (install) → Cùng pattern toàn cục. Step 2 (language) cực thấp (1-3%) → Hầu hết users skip language selection.
2. **Japan:** Step3 (intro) = 710 vs Step1 = 10,398 → Chỉ **6.8%** đến step 3! Nhưng Step7 (iap) = 10,874 và Step8 (complete) = 9,930 = **95.5%!** → Japan có ONBOARDING PATH KHÁC (end_onboard_jp), skip hầu hết intro steps.
3. **US onboarding complete = 31,311 / 32,978 = 94.9%** → Rất cao
4. **UK onboarding complete = 11,376 / 11,667 = 97.5%** → Cao nhất

**Kết luận:** Onboarding completion rất cao ở cả 3 nước. Vấn đề KHÔNG phải ở onboarding, mà ở retention sau onboarding (D1 = 16%).

---

### Q18: Retention per Country — ⚠️ Cần fix SQL + logic

**Vấn đề SQL:** StarRocks không nhận alias trong GROUP BY → đã fix bằng `GROUP BY get_json_string(b.geo_json, '$.country')`. Query chạy >1 phút.

**Vấn đề data:** `total_d0` cột có giá trị KHỔNG LỒ (2.5 tỷ, 5.3 tỷ) và `retention_rate` = 0.

**Root cause:** Query dùng `SUM(d.d0_users)` nhưng JOIN tạo cartesian product — mỗi row trong `b` join với nhiều rows trong `d0_by_country`, nên `SUM(d.d0_users)` bị nhân lên hàng nghìn lần.

**Fix SQL:**
```sql
-- Q18 FIX: Tính retention per country đúng cách
WITH country_dau AS (
    SELECT get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement')
            THEN user_pseudo_id END) AS total_dau
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY get_json_string(geo_json, '$.country')
    ORDER BY total_dau DESC LIMIT 3
),
d0_by_country AS (
    SELECT
        get_json_string(geo_json, '$.country') AS country,
        COUNT(DISTINCT user_pseudo_id) AS d0_users
    FROM bronze.fb_ar_tracer_trace_drawing_ios
    WHERE event_name = 'first_open'
      AND event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
      AND get_json_string(geo_json, '$.country') IN (SELECT country FROM country_dau)
    GROUP BY get_json_string(geo_json, '$.country')
),
retention_active AS (
    SELECT
        get_json_string(b.geo_json, '$.country') AS country,
        b.retention_day,
        COUNT(DISTINCT CASE
            WHEN b.event_name IN ('session_start', 'user_engagement')
            THEN b.user_pseudo_id END) AS active_users
    FROM bronze.fb_ar_tracer_trace_drawing_ios b
    WHERE b.event_date >= DATE_SUB(CURDATE(), INTERVAL 35 DAY)
      AND b.retention_day IN (0, 1, 3, 7, 14)
      AND get_json_string(b.geo_json, '$.country') IN (SELECT country FROM country_dau)
      AND b.event_name IN ('session_start', 'user_engagement')
    GROUP BY get_json_string(b.geo_json, '$.country'), b.retention_day
)
SELECT
    r.country,
    r.retention_day,
    d.d0_users,
    r.active_users,
    ROUND(r.active_users * 100.0 / NULLIF(d.d0_users, 0), 1) AS retention_rate
FROM retention_active r
JOIN d0_by_country d ON r.country = d.country
ORDER BY r.country, r.retention_day;
```

**Kết quả sau fix (screenshot):**

![Q18 retention per country sau fix SQL](AR%20Tracer/18-1.png)

---

### Q19: D0 Activation per Country — ✅ OK

| Country | Installs | D0 Drawers | D0 Activation |
|---------|--------:|----------:|----------:|
| 🇺🇸 United States | 32,978 | 23,293 | 70.6% |
| 🇬🇧 United Kingdom | 11,667 | 7,663 | 65.7% |
| 🇯🇵 Japan | 10,398 | 6,093 | 58.6% |

**Phát hiện:** D0 activation cao ở cả 3 nước (58-70%), US cao nhất. Tuy nhiên kết hợp Q6 (D1 = 16%) → Users vẽ D0 rồi churn ngày sau.

---

### Q20: T+1 Action Tracking — 📋 Chưa tạo

Cần tạo:
1. Cột `actions_json` trong bảng `app_daily_insights` (nếu chưa có)
2. Logic lưu actions từ mỗi report
3. Logic load + compare khi generate report T+1

---

## 3. Tổng hợp Data Findings cho Insight Report

### 🔴 Critical Findings

| # | Finding | Data | Severity |
|---|---------|------|----------|
| 1 | **D1 Retention = 16.6%** (target 30%) | Q6 | 🔴 Critical |
| 2 | **D7 Retention = 2.2%** (target 12%) | Q6 | 🔴 Critical |
| 3 | **Trial→Sub = 0.38%** (target 15%) | Q9 | 🔴 Critical — hoặc tracking broken |
| 4 | **Sessions/user = 1.17** (target 2.0) | Q5 | 🔴 Critical |

### 🟡 Warning Findings

| # | Finding | Data | Severity |
|---|---------|------|----------|
| 5 | **Pro lessons = 0** mọi ngày | Q7 | 🟡 Event tracking broken? |
| 6 | **Template starts = 0** mọi ngày | Q7 | 🟡 Feature disabled? |
| 7 | **Share rate = 0.2%** | Q7 | 🟡 Very low virality |
| 8 | **iap_views = 43, iap_pays = 0** | Q9 | 🟡 IAP funnel tracking incomplete |
| 9 | **gold.daily_overview empty** | Q2 | 🟡 Pipeline gap |
| 10 | **AppsFlyer af_status = Unknown 99.99%** | Q15 | 🟡 Attribution broken |

### 🟢 Positive Findings

| # | Finding | Data | Severity |
|---|---------|------|----------|
| 11 | **Drawing rate = 53%** (target 40%) | Q7+Q5 | 🟢 Vượt target |
| 12 | **D0 Activation = 53-63%** (target 25%) | Q10 | 🟢 Rất tốt |
| 13 | **Ad penetration = 92%** (target 80%) | Q5 | 🟢 Rất cao |
| 14 | **Onboarding complete = 82-95%** (target 70%) | Q8 | 🟢 Vượt target |
| 15 | **Content completion rate = 50%** (target 50%) | Q12 | 🟢 Đạt target |

### 💡 Key Insight

**Paradox lớn:** D0 activation 53% + Drawing rate 53% + Onboarding 82% → App CÓ GIÂY PHÚT ĐẦU TỐT. Nhưng D1 = 16% và D7 = 2% → Users KHÔNG QUAY LẠI. 

Vấn đề không phải onboarding hay core experience lần đầu, mà là **retention loop** — lý do để user quay lại ngày sau. Giả thuyết:
- Content bị lặp (user đã vẽ bài muốn vẽ, không có motivation quay lại)
- Push notification chưa hiệu quả
- No social/community feature
- App đáp ứng nhu cầu 1 lần (vẽ 1 bức) không phải daily habit

---

## 4. Pipeline Fix — Kế hoạch hành động

### Ưu tiên 1: Fix ngay (ảnh hưởng insight quality)

| # | Task | Query | Effort | Assignee |
|---|------|-------|--------|----------|
| 1 | Q1: MCP/SQL dùng `total_ad_requests` / `total_matched_requests`; verify `dau/dav/arpdau` sau job Firebase 04:00 UTC | Q1 | 30 min | [DA] |
| 2 | Fix Q11: investigate ad event naming thực tế (chạy diagnostic query) | Q11 | 1h | [DA] |
| 3 | Fix Q13: đổi filter thành `store_package_id = 'id6504559449'` | Q13 | 10 min | [DA] |
| 4 | Fix Q18: rewrite SQL tránh cartesian product (dùng fix ở trên) | Q18 | 30 min | [DA] |
| 5 | Fix Q6: clamp D0 retention ≤ 100% | Q6 | 10 min | [DA] |

### Ưu tiên 2: Investigate (ảnh hưởng insight accuracy)

| # | Task | Liên quan | Effort | Assignee |
|---|------|-----------|--------|----------|
| 6 | Verify trial→sub tracking: `subscription_upgraded` có fire đúng không? Cross-check QOn/StoreKit | Q9 finding #3 | 2h | [Dev] [DA] |
| 7 | Verify pro_lessons = 0: event `lessons_Pro_start_drawing` có được implement? | Q7 finding #5 | 1h | [Dev] |
| 8 | Verify template = 0: event `draw_with_template` có active? | Q7 finding #6 | 1h | [Dev] |
| 9 | Investigate af_status Unknown: AppsFlyer SDK config, Firebase user_properties | Q15 | 2h | [Dev] [DA] |

### Ưu tiên 3: Pipeline improvements (medium-term)

| # | Task | Effort | Assignee |
|---|------|--------|----------|
| 10 | Populate `gold.daily_overview` từ Bronze (Q5 INSERT vào gold) | 2h | [DA] |
| 11 | Tạo `bronze.appsflyer_report` table + pipeline từ AppsFlyer API | 1-2 ngày | [Dev] |
| 12 | Verify/backfill `app_store_id` trên `dim_app_identifiers` cho mọi app iOS (cột đã có; xem Q13) | 30 min | [DA] |
| 13 | Tạo T+1 Action Tracking: `actions_json` column + save/load logic | 1 ngày | [Dev] |
| 14 | Optimize Q5, Q18 performance (>1 min → target <10s): tạo MV hoặc Silver table | 2h | [DA] |

### Ưu tiên 4: Cập nhật Guideline & KB

| # | Task | Effort |
|---|------|--------|
| 15 | Update Q1: dùng `total_ad_requests`, `total_matched_requests` trong SQL template / MCP |
| 16 | Update Q11: ad format mapping cho AR Tracer (`ad_impression_custom` → app_open, cần investigate thêm) |
| 17 | Update Q13: document iOS dùng store_id, Android dùng bundle_id |
| 18 | Update Q18: StarRocks GROUP BY phải dùng expression, không dùng alias |
| 19 | Update KB: AR Tracer KHÔNG dùng `ad_impression1/2/3/4`, dùng `ad_impression_custom` |
| 20 | Update KB: onboarding flow Japan khác (skip intro, dùng end_onboard_jp) |

---

## 5. Bước tiếp theo

Sau khi fix Priority 1 (5 items, ~2h), bạn gửi lại kết quả:
1. Q1: query đúng cột requests + sau job 04:00 UTC kiểm tra `dau/dav/arpdau` (T vs T−1 theo quy ước §Q1)
2. Q11 diagnostic (ad event names + params thực tế; ảnh 11-1, 11-2)
3. Q18 fix (retention per country đúng; ảnh 18-1)

Từ đó mình sẽ build report output mẫu hoàn chỉnh với data thực.
