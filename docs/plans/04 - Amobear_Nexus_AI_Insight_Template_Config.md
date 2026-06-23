# Amobear Nexus — Bộ Cấu Hình AI Insight Template

## Template: AI Utility App Insight

**Loại / Category:** AI App
**Mô tả:** Tạo báo cáo App Insight hàng ngày cho ứng dụng Utility (creative tools, AR, photo/video editors, productivity). Bao gồm Health Scoring 8 chiều, phân tích doanh thu IAA+IAP, engagement, retention, product metrics đặc thù (drawing rate, activation), geo deep dive, UA economics, và action plan có tracking T+1.

---

# PHẦN 1: GLOBAL AI INSTRUCTIONS

```
[SYSTEM PROMPT — Layer 1: Global Instructions]

Bạn là AI App Health Analyst cho Amobear Nexus. Mỗi ngày bạn nhận:
1. Snapshot dữ liệu ngày T của 1 app
2. Actions từ báo cáo ngày T-1 (nếu có)

Nhiệm vụ: Tạo báo cáo Markdown theo ĐÚNG template format. Report này sẽ được:
- Hiển thị trên Nexus UI (có radar chart renderer)
- Export PDF gửi BOD
- Dùng làm input cho báo cáo T+1 (action tracking)

═══ HEALTH SCORING ═══
- 8 dimensions, mỗi dimension 0-100.
- Composite = weighted average CHỈ trên dimensions CÓ DATA. N/A → loại khỏi tính toán, set radar = 0.
- Tier: S(90+), A(80-89), B(65-79), C(50-64), D(30-49), F(<30).
- So sánh score hôm nay vs hôm qua → ghi trend ↑/↓/→ và delta.

═══ T+1 ACTION TRACKING ═══
- Nếu nhận được previous_actions: review từng action, classify ✅/🔄/❌ dựa trên data hôm nay.
- ✅ Resolved: metric đã cải thiện qua ngưỡng cảnh báo.
- 🔄 Ongoing: chưa cải thiện, ghi carried_days.
- ❌ Worsened: metric xấu hơn → escalate urgency.
- Nếu carried_days ≥ 3 → đề xuất escalate lên cấp trên.
- Actions mới + carried forward → tổng hợp cuối report.

═══ FORMAT SỐ LIỆU ═══
- Revenue: $#,###.## (KHÔNG chia ngàn bằng dấu chấm, dùng dấu phẩy)
- eCPM: $#.##
- Tỷ lệ %: #.#%
- Số lượng lớn: #,### hoặc #.#K khi >10K
- Trend: +#.#% hoặc −#.#% (có dấu)
- N/A khi không có dữ liệu — KHÔNG bịa số

═══ QUY TẮC DOANH THU ═══
- Tổng doanh thu = IAA (AdMob/mediation từ gold.fact) + IAP (purchases/subscriptions từ Firebase)
- LUÔN tách rõ IAA vs IAP trong bảng và phân tích
- ARPDAU = Tổng doanh thu / DAU
- ROI = Tổng doanh thu / Tổng UA cost
- Khi Q1 gold có estimated_revenue nhưng DAU = NULL → dùng Q5 bronze cho DAU, ghi chú pipeline gap

═══ QUY TẮC NGUỒN DỮ LIỆU ═══
- Ưu tiên Gold layer khi có đủ → nhanh hơn, pre-calculated
- Fallback Bronze khi Gold NULL hoặc thiếu
- LUÔN ghi rõ source (Q#) cho mỗi metric
- Cross-validate Gold vs Bronze khi cả hai có cùng metric
- Ghi chú data gaps/anomalies trong Appendix

═══ QUY TẮC JOIN ═══
- gold.fact_daily_app_metrics, silver.daily_app_revenue, bronze.admob_table, bronze.mediation_table → JOIN qua silver.dim_app_identifiers (admob_app_id)
- gold.daily_overview → app_id = admob_app_id (JOIN dim)
- bronze.fb_* → tên bảng chứa app key, KHÔNG có cột app_id
- bronze.xmp_report → JOIN dim qua store_package_id = CONCAT('id', app_store_id) cho iOS
- **AppsFlyer (MMP):** Thứ tự snapshot/MCP: **`bronze.appsflyer_installs_raw`** (Pull) → **`gold.app_ua_daily`** (`mmp_source='appsflyer'`, Master sau transform) → **`bronze.appsflyer_aggregate_daily`** (`report_type='master_api_v4'`). Lọc app theo `dim.package_name` / `id{app_store_id}` / `appsflyer_af_app_id` (xem KB-8).
- **Adjust (MMP):** `bronze.adjust_report` — join `dim.adjust_id = adjust_report.app_token` (campaign rollup có trong `snapshot.ua.adjustCampaignRollupTop`).
- **Ưu tiên nguồn attribution trong narrative:** Nếu `snapshot.attribution.hasAppsFlyerAttributionSlice` = true → dùng `appsFlyerInstallsByMediaSourceTop` / `appsFlyerOrganicSplit` cho Q14/Q15 (nguồn có thể là gold Master, không chỉ raw); `hasAppsFlyerInstallsRaw` chỉ báo Pull bronze. Nếu không AF slice nhưng `hasAdjustCampaignData` → Adjust; nếu chỉ `hasFirebaseAfStatusOnFirstOpen` → fallback Firebase `af_status` trên `first_open`.
- **Gold UA (AppsFlyer pipeline):** `gold.app_ua_daily` với `mmp_source = 'appsflyer'` — cần chạy **`AppsFlyerUaTransformJob`** sau Master sync nếu muốn đồng bộ gold; App Insight đọc gold hoặc aggregate khi raw rỗng. **Hạn chế:** gold AF chỉ có **`media_source` + `country_code`** theo ngày — **không** có campaign. Snapshot `appsFlyerInstallsByMediaSourceTop` = TOP theo **network/media**, không tách campaign. Cần **phân tích theo campaign (AF)** → **không dùng gold**; bắt buộc **MCP `read_query`** lên **`bronze.appsflyer_aggregate_daily`** (Master, có `campaign` / `campaign_id`) hoặc **`bronze.appsflyer_installs_raw`** (Pull, từng dòng install).
- LUÔN filter event_date / install_date / `date` cho partition pruning

═══ NGÔN NGỮ & GIỌNG VĂN ═══
- Viết tiếng Việt, chuyên nghiệp nhưng dễ hiểu
- Dùng emoji section headers theo template
- Insight phải actionable — không chỉ mô tả số liệu
- Gắn thẻ team khi đề cập hành động: [BOD], [UA], [Mediation], [Product], [Dev], [Game], [DA]
- Chỉ trích số có trong snapshot; KHÔNG bịa rank portfolio/benchmark nếu không có dữ liệu
```

---

# PHẦN 2: SECTIONS (7 sections)

---

## Section 1: 📊 Executive Summary

**Section key:** `executive_summary`
**Section đang bật:** ✅

### Metrics

```
health_score, health_tier, composite_8d,
total_revenue, iaa_revenue, iap_revenue,
revenue_trend_7d, impressions, ecpm, fill_rate,
dimension_revenue, dimension_growth, dimension_engagement,
dimension_product, dimension_ad_infra, dimension_unit_econ,
dimension_portfolio, dimension_velocity
```

### So sánh kỳ

- [x] Day-over-day (T-1 vs T-2)
- [x] vs 7-day average
- [x] vs 14-day average
- [ ] vs 30-day average

### Đối tượng (audience)

- [x] BOD / Leadership

### Hướng dẫn AI cho section

```
Khung doc 121 §3, §7.1 — Health Intelligence: mở bằng H2, health score 0-100
và tier (S/A/B/C/D/F) nếu snapshot hoặc pre-calculated dimension scores có
cung cấp. Nếu có 8 dimension: một dòng radar hoặc bảng
|Dimension|Score|Trend|Status| tóm tắt. 2-4 câu narrative: dimension mạnh/yếu
nhất, rủi ro chính, tín hiệu chéo (vd retention ↔ revenue trong 7-14 ngày).
Chỉ trích số có trong snapshot; không bịa rank portfolio/benchmark nếu không
có dữ liệu. Gắn thẻ team khi đề cập hành động: [BOD], [UA], [Mediation],
[Product], [Dev], [Game], [DA].

DIMENSION WEIGHTS (Utility App):
- Revenue: 20%, Growth: 10%, Engagement: 20%, Product: 20%
- Ad Infra: 15%, Unit Econ: 10%, Portfolio: 5%
- Velocity: không tính vào composite, chỉ tracking

SCORING LOGIC cho mỗi dimension:
- Base = 50
- Revenue: +15 nếu rev_vs_7d >+15%, -15 nếu <-15%, -25 nếu <-25%.
  +5 nếu eCPM trend >+10%, +5 nếu fill >90%.
  +5 nếu IAP revenue > 0 (app có IAP).
- Growth: +20 nếu ROI >1.5, +10 nếu 1.0-1.5, -10 nếu 0.5-1.0, -25 nếu <0.5.
  +10 nếu new_users trend >+10%, +5 nếu organic >50%.
- Engagement: +15 nếu D1 >35%, +5 nếu 30-35%, -10 nếu 25-30%, -15 nếu <25%.
  +10 nếu D7 >15%, -15 nếu <10%.
  +5 nếu sessions/user >2.5, -5 nếu <1.5.
- Product: +15 nếu drawing_rate >45%, +5 nếu 40-45%, -10 nếu 30-35%, -15 nếu <30%.
  +10 nếu d0_activation >30%, -10 nếu <20%.
  +5 nếu onboard_complete >75%, -10 nếu <60%.
- Ad Infra: +10 nếu fill >90%, -10 nếu <80%.
  +5 nếu SoW top1 <40% (healthy), -10 nếu >60%, -15 nếu >70%.
  +5 nếu eCPM by format đa dạng.
- Unit Econ: +15 nếu ARPDAU trend >+10%, -15 nếu <-10%.
  +10 nếu ROI >1.0, -20 nếu <0.5.
- Portfolio: +10 nếu geo diversified (top1 country <50%), -10 nếu >70%.
  +5 nếu revenue rank top 20%.

Output format:
### Điểm tổng: **{score}/100** — Xếp hạng: {tier_emoji} {tier_label}
| Chiều đo | Trọng số | Điểm | Trạng thái | Tín hiệu chính |
...
**Tóm tắt:** 2-4 câu narrative.
```

### Anomaly thresholds

```json
{
  "health_score_drop": { "warning": -5, "critical": -10, "message": "Health score giảm {delta} điểm so với hôm qua" },
  "dimension_critical": { "threshold": 30, "message": "Dimension {name} ở mức F (<30)" }
}
```

---

## Section 2: 💰 Revenue & Monetization (+ Ad Infrastructure)

**Section key:** `revenue_monetization`
**Section đang bật:** ✅

### Metrics

```
total_revenue, iaa_revenue, iap_revenue,
ecpm, fill_rate, impressions,
total_ad_requests, total_matched_requests,
arpdau, iap_revenue_daily,
ad_source_name, ad_source_revenue, ad_source_sow,
ad_unit_name, ad_unit_revenue, ad_unit_ecpm,
ad_format, ad_format_impressions,
rewarded_share, interstitial_share, banner_share
```

### So sánh kỳ

- [x] Day-over-day (T-1 vs T-2)
- [x] vs 7-day average
- [x] vs 14-day average
- [ ] vs 30-day average

### Đối tượng

- [x] BOD / Leadership
- [x] Mediation

### Hướng dẫn AI cho section

```
═══ REVENUE & MONETIZATION + AD INFRASTRUCTURE ═══

Gộp thành 1 section với các sub-sections:

3.1 XU HƯỚNG DOANH THU TỔNG (IAA + IAP):
- Bảng 15 ngày: Ngày | IAA ($) | IAP ($) | Tổng ($) | eCPM | Fill Rate | Impressions
- Biểu đồ: stacked bar (IAA + IAP) với line cho tổng nếu UI hỗ trợ
- KPI cards: Tổng DT (T), DoD%, vs 7d%, eCPM, Fill, ARPDAU
- ARPDAU = Tổng DT / DAU (lấy DAU từ Q5 nếu Q1 NULL)
- Ghi chú rõ khi DoD bị ảnh hưởng bởi IAP spike/drop

3.2 DOANH THU THEO NGUỒN (Share of Wallet — chỉ IAA):
- Pie chart + bảng: Source | Revenue | Impressions | eCPM | SoW%
- Đánh giá concentration risk: Top 1 SoW, Top 2 gộp
- Source từ Q3 mediation_table

3.3 DOANH THU THEO AD UNIT (chỉ IAA):
- Bảng: Ad Unit | Format | Revenue | Impressions | eCPM
- Highlight format có eCPM cao nhưng volume thấp → cơ hội

3.4 AD FORMAT BREAKDOWN (Firebase Q11b):
- Pie chart: impressions theo format từ ad_impression_custom params
- So sánh với Q4 AdMob để cross-validate
- Note: AR Tracer dùng ad_impression_custom, KHÔNG dùng ad_impression1-4

3.5 FILL RATE & INFRA HEALTH:
- Fill rate trend, cross-ref revenue vs fill
- Signal: Rev ↑ + Fill ↓ = fragile growth

QUY TẮC:
- LUÔN tách IAA vs IAP rõ ràng
- Tổng DT = IAA + IAP (không bỏ sót)
- Q1 estimated_revenue = IAA only
- Q9 iap_revenue_usd = IAP only
- SoW analysis chỉ tính trên IAA (AdMob sources)
```

### Anomaly thresholds

```json
{
  "revenue_drop_7d": { "warning": -15, "critical": -25, "unit": "%", "message": "Doanh thu giảm {value}% so với TB 7 ngày" },
  "fill_rate": { "warning_below": 85, "critical_below": 80, "unit": "%", "message": "Fill rate {value}% — dưới ngưỡng {threshold}%" },
  "ecpm_drop_7d": { "warning": -10, "critical": -20, "unit": "%", "message": "eCPM giảm {value}% so với TB 7 ngày" },
  "sow_concentration": { "warning": 60, "critical": 70, "unit": "%", "message": "Top 1 ad source chiếm {value}% SoW" },
  "iap_revenue_zero": { "critical": true, "message": "IAP revenue = $0 — kiểm tra pipeline event" }
}
```

---

## Section 3: 👥 Engagement & Retention

**Section key:** `engagement_retention`
**Section đang bật:** ✅

### Metrics

```
dau, new_users, dav, sessions,
sessions_per_user, ad_penetration, avg_engagement_min,
paying_users, paying_user_rate,
d1_retention, d3_retention, d7_retention, d14_retention, d30_retention,
retention_trend_d1, new_user_pct_dau
```

### So sánh kỳ

- [x] Day-over-day
- [x] vs 7-day average
- [x] vs 14-day average
- [ ] vs 30-day average

### Đối tượng

- [x] BOD / Leadership
- [x] Product

### Hướng dẫn AI cho section

```
═══ ENGAGEMENT & RETENTION ═══

5.1 XU HƯỚNG DAU:
- Biểu đồ bar (DAU) + line (New Users) — 15 ngày
- KPI: DAU (T), DoD%, New Users, Sessions/user, Ad Penetration
- Tính % New Users / DAU → nếu >50% = phụ thuộc UA nặng
- Avg engagement minutes nếu có total_engagement_msec

5.2 RETENTION COHORT:
- Bảng: cohort period | D0 Users | D1% | D3% | D7% | D14%
- Biểu đồ: line D1→D30 retention curve
- Tách 2 giai đoạn nếu đủ data: Mar cohorts vs Apr cohorts
- So sánh vs benchmarks (§KB-1)
- Retention từ Q6 bronze (cohort-based, đã clamp D0 ≤100%)

CROSS-SIGNAL:
- SIGNAL 3: D1↓ + New Users↑ → "UA đang mang về low-quality users" → [UA]
- SIGNAL 4: D7↓ + D1 OK → "Core loop không giữ chân" → [Product]
- Sessions/user < 1.5 → "User không quay lại trong ngày" → [Product]
- New Users > 40% DAU → "DAU phụ thuộc UA, fragile"

QUY TẮC:
- DAU = session_start OR user_engagement (unique users)
- DAV = ad_impression* (unique users)  
- Sessions = unique user_pseudo_id + ga_session_id
- Retention D0+ clamp ≤ 100% (LEAST)
- Ưu tiên Q2 gold.daily_overview khi có, fallback Q5 bronze
```

### Anomaly thresholds

```json
{
  "dau_drop_7d": { "warning": -10, "critical": -20, "unit": "%", "message": "DAU giảm {value}% so với TB 7 ngày" },
  "d1_retention": { "warning_below": 25, "critical_below": 20, "unit": "%", "message": "D1 retention {value}% — {status}" },
  "d7_retention": { "warning_below": 12, "critical_below": 10, "unit": "%", "message": "D7 retention {value}% — {status}" },
  "sessions_per_user": { "warning_below": 1.5, "unit": "x", "message": "Sessions/user {value} — user không quay lại trong ngày" },
  "new_user_dependency": { "warning": 50, "unit": "%", "message": "New users chiếm {value}% DAU — phụ thuộc UA" }
}
```

---

## Section 4: 🎮 Product & Content Health

**Section key:** `product_content`
**Section đang bật:** ✅

### Metrics

```
drawing_rate, d0_activation, onboard_complete_rate, onboard_drop_step,
drawing_users, drawing_completions, completion_rate,
trial_starts, sub_upgrades, trial_to_sub, trial_cancels, sub_cancels, refunds,
iap_shows, iap_clicks, iap_purchases, iap_users, iap_revenue_daily,
share_users, magic_photo_users, pro_lessons, free_lessons,
geo_drawing_rate, geo_d0_activation, geo_onboard_complete,
geo_d1_retention, geo_d7_retention, geo_trial_starts
```

### So sánh kỳ

- [x] Day-over-day
- [x] vs 7-day average
- [x] vs 14-day average
- [ ] vs 30-day average

### Đối tượng

- [x] BOD / Leadership
- [x] Product

### Hướng dẫn AI cho section

```
═══ PRODUCT & CONTENT HEALTH — bao gồm Geo Deep Dive ═══

6.1 CHỈ SỐ PRODUCT TOÀN CỤC:
- Bảng: Metric | Value T | 7d Avg | Target | Status
- drawing_rate (KPI #1), d0_activation, onboard_complete, trial_to_sub
- Biểu đồ: Drawing Rate + D0 Activation song song — 15 ngày

6.2 ONBOARDING FUNNEL TOÀN CỤC (ngày T):
- Flowchart hoặc bảng 8 bước: first_open → language → intro → category → level → age → iap → complete
- Tính % drop giữa mỗi bước, highlight bước drop lớn nhất
- Lưu ý: language_choose chỉ fire khi user đổi ngôn ngữ
- Lưu ý: iap/complete có thể > first_open do returning users trigger

6.3 SUBSCRIPTION FUNNEL:
- Biểu đồ: Trial Starts (bar) + IAP Revenue (line) — 15 ngày
- Bảng 7d: Trial Starts, Sub Upgrades, Trial Cancels, Refunds, IAP Revenue
- Trial→Sub conversion rate — nếu <5% = 🔴
- SIGNAL 7: Trial starts ↑ + conversion ↓ → paywall friction

6.4 GEO DEEP DIVE — TOP 3 COUNTRIES (từ Q16-Q19):

a) BẢNG SO SÁNH:
| Metric | 🇺🇸 Mỹ | 🇬🇧 Anh | 🇯🇵 Nhật | Global |
- DAU, Drawing Rate, D0 Activation, Onboard Complete
- D1/D3/D7/D14 Retention, Trial Starts, Sub Upgrades

b) ONBOARDING FUNNEL MỖI NƯỚC (Q17):
- Flowchart hoặc bảng cho mỗi nước
- Highlight luồng riêng biệt (vd: Japan end_onboard_jp)

c) RETENTION THEO NƯỚC (Q18):
- Biểu đồ line 3 nước trên cùng trục
- Bảng chi tiết: Country | Day | D0 Users | Active | Rate

d) CROSS-INSIGHTS (BẮT BUỘC):
- So sánh drawing rate × retention: nước nào draw nhiều có retain tốt hơn?
- Onboarding drop × drawing rate: nước drop onboarding có drawing rate thấp?
- D0 activation × D7: activation cao có đảm bảo long-term?
- Ghi actions CỤ THỂ per country

QUY TẮC:
- Top 3 countries xác định bằng DAU 7 ngày gần nhất
- drawing_rate = drawing_users / DAU × 100
- d0_activation = D0 drawers / installs × 100 (retention_day = 0)
- onboard_complete = step8 / step1 × 100
- Drawing events: draw_with_lesson, draw_with_template, content_draw, lessons_drawing, lessons_free_start_drawing, lessons_Pro_start_drawing
- Completion events: draw_finish_with_lesson, draw_finish_with_template, content_done
```

### Anomaly thresholds

```json
{
  "drawing_rate": { "warning_below": 35, "critical_below": 30, "unit": "%", "message": "KPI #1: Drawing rate {value}%" },
  "d0_activation": { "warning_below": 25, "critical_below": 20, "unit": "%", "message": "D0 activation {value}%" },
  "onboard_complete": { "warning_below": 60, "critical_below": 50, "unit": "%", "message": "Onboarding completion {value}%" },
  "trial_to_sub": { "warning_below": 10, "critical_below": 5, "unit": "%", "message": "Trial→Sub conversion {value}%" },
  "drawing_rate_drop": { "warning": -5, "critical": -10, "unit": "pp", "message": "Drawing rate giảm {value}pp — KPI #1 alert" }
}
```

---

## Section 5: 📈 Growth & Acquisition

**Section key:** `growth_acquisition`
**Section đang bật:** ✅

### Metrics

```
ua_cost, ua_cost_by_channel, roi,
organic_installs, organic_pct,
installs_by_network, cost_per_install,
new_users, installs_total,
appsflyer_installs_by_media_source, appsflyer_cost_by_media_source,
appsflyer_organic_vs_non_organic, adjust_campaign_cost, adjust_campaign_revenue_proxy,
gold_app_ua_daily_af (optional, post-transform)
```

### So sánh kỳ

- [x] Day-over-day
- [x] vs 7-day average
- [ ] vs 14-day average
- [ ] vs 30-day average

### Đối tượng

- [x] BOD / Leadership
- [x] UA

### Hướng dẫn AI cho section

```
═══ GROWTH & ACQUISITION ═══

7.1 CHI PHÍ UA THEO KÊNH:
- Pie chart + bảng: Channel | Cost | Share%
- Source: Q13 XMP (JOIN dim qua store_package_id)
- Highlight kênh chiếm >50%

7.2 ROI & KINH TẾ ĐƠN VỊ:
- ROI = Tổng DT (IAA+IAP) / Tổng UA cost
- Bảng: Tổng DT, Tổng UA, ROI, Lỗ ròng ước tính
- So sánh vs benchmarks (§KB-1: >1.5 Positive, 1.0-1.5 OK, <0.5 Critical)

7.3 ORGANIC vs PAID:
- **Ưu tiên 1 — AppsFlyer:** Đọc `snapshot.attribution.appsFlyerOrganicSplit[]` (bucket `Organic` | `Non-organic`, field `installs`). Logic warehouse: `media_source` thuộc `organic` hoặc `restricted` → Organic; còn lại → Non-organic.
- **Ưu tiên 2 — Firebase:** `snapshot.attribution.firebaseAfStatusOnFirstOpen[]` (`afStatus`, `installs`) khi không có dữ liệu AF raw trong cửa sổ.
- Organic installs là nguồn miễn phí → nếu organic >50% = product-led growth tiềm năng; **luôn ghi** `primaryPathHint` từ snapshot khi trích dẫn.

7.4 INSTALLS & CHI PHÍ THEO NETWORK (AppsFlyer — tương đương “campaign/network” bên Adjust):
- Bảng snapshot: `snapshot.attribution.appsFlyerInstallsByMediaSourceTop[]` — mỗi phần tử: `mediaSource`, `installs`, `costSum` (tổng `cost_value` trong cửa sổ, có thể 0 nếu Pull không có cost).
- Diễn giải: top kênh theo volume; so sánh `costSum` vs chi XMP (Q13) để phát hiện lệch attribution hoặc delay.
- **Không có** trong snapshot: cohort ROAS D7/D30 AF — nếu template yêu cầu, dùng MCP `read_query` lên `gold.app_ua_daily` / `bronze.appsflyer_aggregate_daily` / `installs_raw` (trong giới hạn budget), filter ngày + join dim như KB-8.

7.5 ADJUST (khi app dùng Adjust, không phải AF):
- `snapshot.ua.adjustCampaignRollupTop[]`: `campaign`, `network`, `partnerName`, `costSum`, `revenueSum`, `rowCount`, `firstDate`, `lastDate`.
- Chỉ tin cậy khi `snapshot.attribution.hasAdjustCampaignData` = true và `dim.adjust_id` đã cấu hình.

CROSS-SIGNAL:
- SIGNAL 3 recap: D1↓ + New Users↑ → [UA] audit campaign quality
- ROI < 0.5 + New Users tăng = "đốt tiền không hiệu quả"
- Organic cao + paid ROI thấp → "cân nhắc giảm paid, tối ưu organic"

QUY TẮC:
- UA cost từ Q13 XMP (có thể chênh 1 ngày do reporting delay)
- Revenue từ Q1+Q9 combined (IAA+IAP)
- **Q14/Q15:** Bám `snapshot.attribution` — dùng `hasAppsFlyerAttributionSlice` + `appsFlyerInstallsByMediaSourceTop` / `appsFlyerOrganicSplit` (Master gold/aggregate hoặc Pull raw); `primaryPathHint` mô tả nguồn.
- Nếu không có AF slice (`hasAppsFlyerAttributionSlice` false) và không có Adjust rollup → Firebase `af_status` hoặc ghi **data gap** cho organic/network.
- iOS: XMP store_package_id = CONCAT('id', app_store_id); AppsFlyer iOS thường dùng `app_id = id{store_id}` trong raw — đã map qua `dim.appsflyer_af_app_id` / package (KB-8).
```

### Anomaly thresholds

```json
{
  "roi": { "warning_below": 1.0, "critical_below": 0.5, "unit": "x", "message": "ROI {value}x — {status}" },
  "ua_cost_spike": { "warning": 30, "critical": 50, "unit": "%", "message": "UA cost tăng {value}% DoD" },
  "organic_drop": { "warning": -20, "unit": "%", "message": "Organic installs giảm {value}%" }
}
```

---

## Section 6: ⚠️ Anomalies & Alerts

**Section key:** `anomalies_alerts`
**Section đang bật:** ✅

### Metrics

```
(Tất cả metrics từ các section khác — cross-reference)
```

### So sánh kỳ

- [x] Day-over-day
- [x] vs 7-day average
- [x] vs 14-day average
- [ ] vs 30-day average

### Đối tượng

- [x] BOD / Leadership

### Hướng dẫn AI cho section

```
═══ ANOMALIES & ALERTS ═══

Auto-detect từ CROSS-REFERENCE RULES (§KB-2):

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
→ "Core loop không giữ chân"
→ [Product] review content freshness

SIGNAL 5: Drawing rate ↓ + DAU OK
→ "Users quay lại nhưng không vẽ = mất core value"
→ [Product] KPI #1 alert — ưu tiên tối đa

SIGNAL 6: D0 Activation ↓ + Onboarding OK
→ "User hoàn thành onboarding nhưng không vẽ = missing CTA"
→ [Product] review post-onboarding flow

SIGNAL 7: Trial conversion ↓ + Trial starts ↑
→ "Paywall friction hoặc trial value chưa đủ"
→ [Product] review trial experience, paywall copy

SIGNAL 8: Country A drawing_rate >> Country B
→ "Product experience khác nhau theo thị trường"
→ [Product] localization, content preference

SIGNAL 9: gold.daily_overview empty + bronze có
→ "Pipeline gap"
→ [DA] [Dev] fix pipeline

SIGNAL 10: fact Q1 có revenue ngày T nhưng dau/dav/arpdau NULL
→ "Lag Firebase vs mediation — xem §A3.1"
→ Dùng T-1 cho engagement hoặc Q5 bronze

FORMAT OUTPUT:
### 🔴 Nghiêm Trọng
| # | Tín hiệu | Chi tiết | Source |
### 🟡 Cảnh Báo
| # | Tín hiệu | Chi tiết | Source |
### ✅ Tích Cực
| # | Tín hiệu | Chi tiết | Source |
```

### Anomaly thresholds

```json
{
  "cross_signals": [
    {"id": "SIGNAL_1", "conditions": ["revenue_dod > 0", "fill_rate_dod < 0"], "severity": "warning"},
    {"id": "SIGNAL_2", "conditions": ["revenue_dod > 0", "dau_dod < 0"], "severity": "warning"},
    {"id": "SIGNAL_3", "conditions": ["d1_retention_trend < 0", "new_users_trend > 0"], "severity": "critical"},
    {"id": "SIGNAL_5", "conditions": ["drawing_rate_dod < -3", "dau_dod >= -5"], "severity": "critical"},
    {"id": "SIGNAL_7", "conditions": ["trial_starts_trend > 0", "trial_to_sub < 5"], "severity": "critical"},
    {"id": "SIGNAL_10", "conditions": ["q1_dau == null", "q5_dau > 0"], "severity": "info"}
  ]
}
```

---

## Section 7: ✅ Recommendations & Action Plan

**Section key:** `action_plan`
**Section đang bật:** ✅

### Metrics

```
(Derived — không có metrics riêng, tham chiếu tất cả sections)
```

### So sánh kỳ

(Không áp dụng)

### Đối tượng

- [x] BOD / Leadership
- [x] UA
- [x] Product
- [x] Mediation

### Hướng dẫn AI cho section

```
═══ RECOMMENDATIONS & ACTION PLAN ═══

T+1 REVIEW (nếu có previous_actions):
- Load actions từ T-1
- Classify: ✅ Resolved / 🔄 Ongoing / ❌ Worsened
- Tóm tắt: X/Y resolved

NEW ACTIONS — theo priority:

🔴 P0 — Cấp bách (Tuần này):
| # | Hành động | Owner | Tín hiệu | Tác động dự kiến |
- Chỉ 2-4 actions, rõ ràng, measurable
- Gắn owner tag: [UA], [Product], [Mediation], [DA], [Dev]
- Mỗi action phải liên kết trực tiếp với 1 signal/anomaly

🟡 P1 — Sprint hiện tại:
| # | Hành động | Owner | Tín hiệu | Tác động dự kiến |
- 3-5 actions, sprint-level effort

🟢 P2 — Sprint tiếp theo:
| # | Hành động | Owner | Tín hiệu |
- 3-5 actions, planning

CARRIED FORWARD (từ T-1 nếu có):
- Actions chưa resolved, ghi carried_days
- Nếu carried_days ≥ 3 → escalate priority lên 1 bậc

QUY TẮC:
- Tổng không quá 12 actions (3-4 P0, 3-5 P1, 3-5 P2)
- Mỗi action phải có: Hành động cụ thể, Owner, Tín hiệu nguồn, Tác động kỳ vọng
- Không dùng action chung chung ("cải thiện retention") — phải cụ thể ("Push notification D1 với nội dung cá nhân hóa theo category đã chọn")
```

### Anomaly thresholds

```json
{}
```

---

# PHẦN 3: KNOWLEDGE BASE (KB) ENTRIES

---

## KB-1: Thresholds & Benchmarks — Utility App (Creative)

| Field | Value |
|-------|-------|
| **Title** | [KB-1] Thresholds & Benchmarks — Utility App (Creative) |
| **Category** | Rules |
| **Content** | *(xem bên dưới)* |
| **Tags** | `benchmarks`, `thresholds`, `utility`, `creative` |
| **Focus Areas** | `revenue`, `retention`, `product`, `ad_perf` |
| **Priority** | 10 |

**Content:**
```
REVENUE:
  >+15% vs 7d avg → Positive | <-15% → Warning | <-25% → Critical

FILL RATE:
  >90% → Excellent | 85-90% → Good | 80-85% → Warning | <80% → Critical

eCPM:
  >+10% vs 7d → Positive | <-10% → Warning | <-20% → Critical

AD CONCENTRATION (SoW):
  Top 1 >70% → Critical | >60% → Warning | <40% → Healthy

RETENTION (creative_utility targets):
  D1: >35% Excellent | 30-35% Good | 25-30% Acceptable | <25% Warning | <20% Critical
  D7: >15% Good | 12-15% Acceptable | <10% Warning

DRAWING RATE (KPI #1 — utility creative):
  >45% Excellent | 40-45% Good | 35-40% Acceptable | 30-35% Warning | <30% Critical

D0 ACTIVATION:
  >30% Excellent | 25-30% Good | 20-25% Acceptable | <20% Warning

ONBOARDING:
  >75% complete → Excellent | 70-75% Good | <60% Warning | <50% Critical

UA / ROI:
  >1.5 Positive | 1.0-1.5 Acceptable | 0.5-1.0 Warning | <0.5 Critical

TRIAL TO SUBSCRIPTION:
  >20% Excellent | 15-20% Good | 10-15% Acceptable | <10% Warning

SESSIONS/USER:
  >2.5 Positive | 1.5-2.5 Good | <1.5 Warning

AD PENETRATION (DAV/DAU):
  >80% Positive | 60-80% Acceptable | <60% Tip (room to optimize)
```

---

## KB-2: Cross-Reference Rules

| Field | Value |
|-------|-------|
| **Title** | [KB-2] Cross-Reference Rules — Signal Detection |
| **Category** | Rules |
| **Content** | *(SIGNAL 1-10 đã ghi trong Section 6 Anomalies)* |
| **Tags** | `signals`, `cross-reference`, `anomaly` |
| **Focus Areas** | `all` |
| **Priority** | 10 |

---

## KB-3: Bronze Firebase Schema

| Field | Value |
|-------|-------|
| **Title** | [115] Bronze Firebase fb_* (no app_id column) |
| **Category** | Schema |
| **Content** | *(xem bên dưới)* |
| **Tags** | `firebase`, `bronze`, `115`, `sql` |
| **Focus Areas** | `iaa`, `iap`, `retention` |
| **Priority** | 10 |

**Content:**
```
`bronze.fb_*` = raw events, **one physical table per Firebase app** (suffix is sanitized 
app key, not AdMob id in the name).
**There is no `app_id` column.** Do NOT write `WHERE app_id IN (...)` or `WHERE app_id = ...`
on `bronze.fb_*` — StarRocks error: column cannot be resolved.
Scope the app by mapping from `silver.dim_app_identifiers`. Always filter **`event_date`**
(partition).

Columns: event_date, event_timestamp, user_pseudo_id, install_date, retention_day,
event_name, app_version, device_json, geo_json, traffic_source_json, event_params_json,
user_properties_json, raw_event_json

JSON parsing: use get_json_string(column, '$.path')
event_params_json format: object map (key → {string_value, int_value, float_value, double_value})
Example: get_json_string(event_params_json, '$.ga_session_id.int_value')
```

---

## KB-4: Gold Layer Overview

| Field | Value |
|-------|-------|
| **Title** | Gold Layer Overview — fact/daily_overview schema |
| **Category** | Schema |
| **Content** | *(xem bên dưới)* |
| **Tags** | `gold`, `schema`, `fact`, `daily_overview` |
| **Focus Areas** | `revenue`, `engagement` |
| **Priority** | 10 |

**Content:**
```
gold.fact_daily_app_metrics:
  app_id = admob_app_id (JOIN silver.dim_app_identifiers)
  `date` (backtick required), total_revenue/estimated_revenue, ecpm, fill_rate,
  impressions, total_ad_requests, total_matched_requests, ua_cost, roi,
  dau, dav, arpdau (MAY BE NULL if Firebase pipeline hasn't run)

gold.daily_overview:
  app_id = admob_app_id (JOIN dim)
  event_date, dau, new_users, dav, sessions, avg_sessions, avg_dur_min, ad_penetration
  Lag ~1 day vs "today" until Firebase job runs at 04:00 UTC

CRITICAL: Do NOT use `matched_requests` — correct column is `total_matched_requests`
```

---

## KB-5: JOIN Rules — dim_app_identifiers

| Field | Value |
|-------|-------|
| **Title** | [115] JOIN Rules — dim_app_identifiers mapping |
| **Category** | Rules |
| **Content** | *(xem bên dưới)* |
| **Tags** | `join`, `dim`, `115`, `sql` |
| **Focus Areas** | `all` |
| **Priority** | 10 |

**Content:**
```
silver.dim_app_identifiers maps:
  firebase_id ↔ admob_app_id ↔ package_name/bundle_id ↔ app_store_id ↔ adjust_id ↔ appsflyer_af_app_id

JOIN patterns:
- gold.fact / gold.daily_overview / bronze.admob / bronze.mediation:
  JOIN dim ON dim.admob_app_id = table.app_id
  WHERE dim.firebase_id = '{app_key}'

- bronze.xmp_report (iOS):
  JOIN dim ON d.app_store_id != '' AND x.store_package_id = CONCAT('id', d.app_store_id)
  
- bronze.fb_*: NO JOIN needed — table name contains the app key

- AppsFlyer (App Insight / reader): thứ tự **installs_raw** (Pull) → **gold.app_ua_daily** (`mmp_source=appsflyer`, Master sau transform) → **aggregate_daily** (`master_api_v4`). Map `app_id` / admob: package_name, `id`+app_store_id, `appsflyer_af_app_id`.

- bronze.adjust_report:
  JOIN ON adjust_report.app_token = dim.adjust_id

Do NOT use: silver.dim_apps_summary (deprecated)
```

---

## KB-6: Utility App — Event Catalog

| Field | Value |
|-------|-------|
| **Title** | Utility App Event Catalog — Drawing/Creative |
| **Category** | Schema |
| **Content** | *(xem bên dưới)* |
| **Tags** | `events`, `utility`, `creative`, `drawing` |
| **Focus Areas** | `product`, `retention`, `iap` |
| **Priority** | 8 |

**Content:**
```
FIREBASE CORE: session_start, user_engagement, first_open, screen_view, app_remove

DRAWING/CONTENT:
  Starts: draw_with_lesson, draw_with_template, content_draw, lessons_drawing,
          lessons_free_start_drawing, lessons_Pro_start_drawing
  Completions: draw_finish_with_lesson, draw_finish_with_template, content_done

CAMERA/MAGIC: magic_photo_draw, magic_photo_choose, drawing_capture, drawing_capture_photo
SHARE: preview_share, preview_lesson_share, preview_template_share, my_creative_share

ONBOARDING (8 steps):
  first_open → language_choose → intro_next_click → intro_category_choose →
  intro_user_level_choose → intro_user_age_choose → intro_iap →
  end_onboard_global / end_onboard_iaa / end_onboard_jp

IAP FUNNEL: iap_show → iap_click → iap_open_view → iap_open_pay → iap_purchase / iap_fail_purchase
SUBSCRIPTION: trial_started, trial_still_active, subscription_upgraded, trial_canceled,
              subscription_canceled, refund

AD (AR Tracer specific): ad_impression_custom (main), ad_clicked, banner_event
  Format via param: get_json_string(event_params_json, '$.ad_format')
  Values: native, interstitial, app_open, banner, video_rewarded
  NOTE: ad_impression1-4 NOT used by this app
```

---

## KB-7: Forbidden Identifiers & Pitfalls

| Field | Value |
|-------|-------|
| **Title** | [115] Forbidden identifiers & common SQL pitfalls |
| **Category** | Rules |
| **Content** | *(xem bên dưới)* |
| **Tags** | `starrocks`, `115`, `sql`, `pitfalls` |
| **Focus Areas** | `all` |
| **Priority** | 10 |

**Content:**
```
Do NOT use:
- silver.dim_apps_summary → deprecated
- `matched_requests` → correct: `total_matched_requests`
- `WHERE app_id = ...` on bronze.fb_* → no such column
- SELECT * on bronze tables → raw_event_json ~3KB/row
- Query without event_date filter → full table scan
- GROUP BY alias on StarRocks → repeat the expression
- ad_impression1..4 mapping for AR Tracer → use ad_impression_custom + ad_format param

Always:
- Filter event_date in WHERE (partition pruning)
- Use get_json_string() for JSON parsing (not JSON_EXTRACT)
- Cast JSON values: CAST(get_json_string(...) AS DOUBLE)
- Batch INSERT by date during migration (avoid OOM)
- Use COALESCE(NULLIF(...), 0) for division safety
```

---

## KB-8: AppsFlyer — Snapshot App Insight & StarRocks

| Field | Value |
|-------|-------|
| **Title** | AppsFlyer (MMP) trong App Insight — snapshot JSON & query |
| **Category** | Schema / Attribution |
| **Content** | *(xem bên dưới)* |
| **Tags** | `appsflyer`, `mmp`, `attribution`, `insight`, `bronze`, `115` |
| **Focus Areas** | `growth`, `ua` |
| **Priority** | 9 |

**Content:**
```
Mục tiêu: Cùng cấp độ “khai thác UA/attribution” như Adjust — App Insight đọc trước từ snapshot; MCP bổ sung khi thiếu.

═══ SNAPSHOT JSON (đúng key camelCase như backend) ═══
1) snapshot.attribution (cửa sổ thường trùng readerEnrichment / ua, ~14–30 ngày tùy builder)
   - window: "yyyy-MM-dd..yyyy-MM-dd"
   - hasAppsFlyerInstallsRaw: bool — có hàng trong bronze.appsflyer_installs_raw (Pull) sau khi map dim
   - hasAppsFlyerGoldUa: bool — có hàng gold.app_ua_daily (mmp_source=appsflyer) trong cửa sổ
   - hasAppsFlyerAttributionSlice: bool — true nếu có dữ liệu AF cho Q14/Q15 (raw hoặc gold hoặc aggregate Master)
   - hasAdjustCampaignData: bool
   - hasFirebaseAfStatusOnFirstOpen: bool
   - primaryPathHint: string — gợi ý nguồn chính (raw vs gold Master vs aggregate vs Adjust vs Firebase)
   - sources: mô tả text
   - appsFlyerInstallsByMediaSourceTop: [ { mediaSource, installs, costSum } ] — TOP N theo installs
   - appsFlyerOrganicSplit: [ { bucket: "Organic"|"Non-organic", installs } ]
   - firebaseAfStatusOnFirstOpen: [ { afStatus, installs } ] — fallback

2) snapshot.ua (không thay Adjust; bổ sung song song)
   - adjustCampaignRollupTop — chỉ khi Adjust active
   - xmpSpendByModule, applovin*, gold ua_cost/roi (nơi có trong builder)

3) snapshot.dimAppIdentifiers
   - Các key thường gặp: firebaseId, appmetricaId, adjustId, packageName, appStoreId, platform, displayName, productHealthProfile.
   - AppsFlyer không luôn xuất hiện dưới dạng field riêng: reader khớp `bronze.appsflyer_installs_raw.app_id` với packageName, `id{appStoreId}`, hoặc biến thể số — đồng bộ `silver.dim_app_identifiers.appsflyer_af_app_id` (PostgreSQL) để khớp Master/Pull CSV.

═══ BẢNG bronze.appsflyer_installs_raw (tham chiếu MCP) ═══
- install_date (DATE) — bắt buộc filter
- app_id (STRING) — Android: thường package; iOS: id{store_id} hoặc store id digits; khớp dim
- media_source, campaign, campaign_id, af_channel, geo, platform, …
- cost_value — chi phí attribution (có thể 0 nếu nguồn không đẩy cost)
- Organic: media_source IN ('organic','restricted') theo logic tổng hợp snapshot

═══ GOLD (sau job transform AppsFlyer) ═══
- gold.app_ua_daily WHERE mmp_source = 'appsflyer': grain **ngày × admob_app_id × media_source × country_code** (installs, cost, …) — **không có campaign**. Đồng bộ với gold.fact cho UA tổng hợp.

═══ BRONZE — khi cần campaign (không có trong snapshot mặc định) ═══
- **Master:** `bronze.appsflyer_aggregate_daily` (`report_type='master_api_v4'`) có `campaign`, `campaign_id`, `media_source`, `country_code` — dùng MCP GROUP BY campaign (hoặc campaign × media) trong cửa sổ.
- **Pull:** `bronze.appsflyer_installs_raw` có `campaign` / `campaign_id` ở mức install.
- Thứ tự gợi ý: aggregate Master nếu không bật Pull; Pull raw nếu cần install-level / đối soát từng dòng.

═══ HƯỚNG DẪN PROMPT (Global / Section Growth) ═══
- Luôn kiểm tra attribution.primaryPathHint trước khi viết “theo AppsFlyer” hay “theo Adjust”.
- Khi hasAppsFlyerAttributionSlice: mô tả top media_source + organic split + costSum (nếu >0); ghi rõ primaryPathHint (Pull raw vs gold Master vs aggregate). So sánh với new_users Firebase nếu có.
- Không đồng nhất installs AF với first_open Firebase 1:1 — ghi rõ định nghĩa khác nhau.
- Regenerate agentic: có thể hỏi thêm SQL cohort (retention × media_source) trong giới hạn McpQueryBudget.

═══ MCP read_query — ví dụ khung (chỉnh ngày + điều kiện app) ═══
-- Top media_source 14d (gold Master — admob_app_id)
SELECT media_source, SUM(installs) AS installs, SUM(COALESCE(cost_usd,0)) AS cost_sum
FROM gold.app_ua_daily
WHERE report_date >= 'YYYY-MM-DD' AND report_date <= 'YYYY-MM-DD'
  AND app_id = '<admob_app_id>' AND mmp_source = 'appsflyer'
GROUP BY 1 ORDER BY installs DESC LIMIT 15;
-- Top campaign 14d — AF Master (bronze aggregate, không có trong gold.app_ua_daily)
SELECT COALESCE(NULLIF(TRIM(campaign),''),'(none)') AS campaign,
       COALESCE(NULLIF(TRIM(media_source),''),'Unknown') AS media_source,
       SUM(installs) AS installs, SUM(COALESCE(cost,0)) AS cost_sum
FROM bronze.appsflyer_aggregate_daily
WHERE report_date >= 'YYYY-MM-DD' AND report_date <= 'YYYY-MM-DD'
  AND report_type = 'master_api_v4'
  AND app_id IN ('<af_app_id per dim>')
GROUP BY 1, 2 ORDER BY installs DESC LIMIT 20;
-- Hoặc AF Pull raw (install-level, campaign từng dòng)
SELECT COALESCE(NULLIF(TRIM(campaign),''),'(none)') AS campaign,
       COUNT(*) AS installs,
       COALESCE(SUM(COALESCE(cost_value,0)),0) AS cost_sum
FROM bronze.appsflyer_installs_raw
WHERE install_date >= 'YYYY-MM-DD' AND install_date <= 'YYYY-MM-DD'
  AND app_id IN ('<package_or_id_prefixed>')
GROUP BY 1 ORDER BY installs DESC LIMIT 15;
```

---

# PHẦN 4: METRICS DEFINITIONS

---

### Revenue Domain

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `total_revenue` | Tổng doanh thu | Revenue | USD | iaa_revenue + iap_revenue | `Q1.estimated_revenue + Q9.iap_revenue_usd` | gold.fact + bronze.fb_* | 1 | — | `revenue`, `p0` |
| `iaa_revenue` | Doanh thu IAA | Revenue | USD | estimated_revenue | `SUM(estimated_revenue)` | gold.fact_daily_app_metrics | 1 | — | `revenue`, `iaa` |
| `iap_revenue` | Doanh thu IAP | Revenue | USD | iap_revenue_usd | `SUM(iap_revenue_usd) WHERE event_name IN ('iap_purchase','in_app_purchase')` | bronze.fb_* | 2 | — | `revenue`, `iap` |
| `ecpm` | eCPM | Revenue | USD | revenue / impressions × 1000 | `ecpm` (pre-calculated) | gold.fact_daily_app_metrics | 2 | — / <-10% / <-20% | `revenue`, `ad_perf` |
| `fill_rate` | Fill Rate | Ad Perf | % | matched / requests × 100 | `fill_rate` (pre-calculated) or `total_matched_requests / total_ad_requests` | gold.fact_daily_app_metrics | 2 | >90% / 80-85% / <80% | `ad_perf` |
| `arpdau` | ARPDAU | Revenue | USD | total_revenue / dau | `(Q1.estimated_revenue + Q9.iap_revenue_usd) / Q5.dau` | Derived | 2 | — | `revenue`, `unit_econ` |
| `impressions` | Impressions | Ad Perf | count | total impressions | `impressions` | gold.fact_daily_app_metrics | 3 | — | `ad_perf` |
| `total_ad_requests` | Ad Requests | Ad Perf | count | total requests | `total_ad_requests` | gold.fact_daily_app_metrics | 4 | — | `ad_perf` |

### Engagement Domain

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `dau` | DAU | Engagement | count | unique users with session_start OR user_engagement | `COUNT(DISTINCT CASE WHEN event_name IN ('session_start','user_engagement') THEN user_pseudo_id END)` | bronze.fb_* or gold.daily_overview | 1 | — | `engagement`, `p0` |
| `new_users` | New Users | Growth | count | unique users with first_open | `COUNT(DISTINCT CASE WHEN event_name='first_open' THEN user_pseudo_id END)` | bronze.fb_* | 2 | — | `growth` |
| `dav` | DAV | Engagement | count | unique users with ad_impression* | `COUNT(DISTINCT CASE WHEN event_name LIKE 'ad_impression%' THEN user_pseudo_id END)` | bronze.fb_* | 2 | — | `engagement`, `ad_perf` |
| `sessions` | Sessions | Engagement | count | unique user+session_id | `COUNT(DISTINCT CONCAT(user_pseudo_id,'_',ga_session_id))` | bronze.fb_* | 3 | — | `engagement` |
| `sessions_per_user` | Sessions/User | Engagement | ratio | sessions / dau | Derived | Derived | 3 | >2.5 / <1.5 / — | `engagement` |
| `ad_penetration` | Ad Penetration | Engagement | % | dav / dau × 100 | Derived | Derived | 3 | >80% / <60% / — | `engagement`, `ad_perf` |
| `paying_users` | Paying Users | Revenue | count | unique users with iap_purchase/in_app_purchase | `COUNT(DISTINCT CASE WHEN event_name IN ('iap_purchase','in_app_purchase') THEN user_pseudo_id END)` | bronze.fb_* | 4 | — | `revenue`, `iap` |

### Retention Domain

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `d1_retention` | D1 Retention | Retention | % | D1 active / D0 installs × 100 | *(Q6 cohort query)* | bronze.fb_* | 1 | >35% / <25% / <20% | `retention`, `p0` |
| `d3_retention` | D3 Retention | Retention | % | D3 active / D0 × 100 | *(Q6)* | bronze.fb_* | 2 | — | `retention` |
| `d7_retention` | D7 Retention | Retention | % | D7 active / D0 × 100 | *(Q6)* | bronze.fb_* | 1 | >15% / <12% / <10% | `retention`, `p0` |
| `d14_retention` | D14 Retention | Retention | % | D14 active / D0 × 100 | *(Q6)* | bronze.fb_* | 3 | — | `retention` |

### Product Domain (Utility — Creative)

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `drawing_rate` | Drawing Rate | Product | % | drawing_users / dau × 100 | `Q7.drawing_users / Q5.dau × 100` | Derived | 1 | >45% / 30-35% / <30% | `product`, `kpi1`, `p0` |
| `d0_activation` | D0 Activation | Product | % | d0_drawers / installs × 100 | `Q10.d0_drawers / Q10.installs × 100` | bronze.fb_* | 1 | >30% / <25% / <20% | `product`, `p0` |
| `onboard_complete_rate` | Onboard Complete | Product | % | step8 / step1 × 100 | `Q8.step8_complete / Q8.step1_install × 100` | bronze.fb_* | 2 | >75% / <60% / <50% | `product`, `onboarding` |
| `trial_to_sub` | Trial→Sub | Product | % | sub_upgrades / trial_starts × 100 | `Q9.sub_upgrades / Q9.trial_starts × 100` | bronze.fb_* | 2 | >20% / <10% / <5% | `product`, `iap`, `subscription` |
| `trial_starts` | Trial Starts | Product | count | trial_started events | `SUM(CASE WHEN event_name='trial_started' THEN 1 ELSE 0 END)` | bronze.fb_* | 3 | — | `iap`, `subscription` |
| `drawing_users` | Drawing Users | Product | count | unique users with draw events | *(Q7 query)* | bronze.fb_* | 3 | — | `product` |

### Growth Domain

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `ua_cost` | UA Cost | Growth | USD | sum cost by channel | `SUM(x.cost)` | bronze.xmp_report | 2 | — | `growth`, `ua` |
| `roi` | ROI | Growth | ratio | total_revenue / ua_cost | Derived | Derived | 1 | >1.5 / 0.5-1.0 / <0.5 | `growth`, `unit_econ`, `p0` |
| `organic_pct` | Organic % | Growth | % | organic installs / total × 100 | Từ `attribution.appsFlyerOrganicSplit` hoặc Firebase fallback | `snapshot.attribution` → Pull raw / gold AF / aggregate Master | 3 | — | `growth`, `attribution` |
| `af_installs_top_media` | AF installs by media_source | Growth | count | TOP N theo SUM(installs) | `appsFlyerInstallsByMediaSourceTop` | Pull raw hoặc gold.app_ua_daily hoặc aggregate_daily | 2 | — | `growth`, `appsflyer`, `mmp` |
| `af_cost_by_media` | AF cost by media_source | Growth | USD | SUM(cost) | Cùng GROUP BY media_source | Cùng nguồn như af_installs_top_media | 3 | — | `growth`, `appsflyer` |
| `adjust_campaign_cost` | Adjust cost (rollup) | Growth | USD | costSum field | Snapshot rollup | bronze.adjust_report + dim | 2 | — | `growth`, `adjust` |

### Health Score Domain

| metric_key | display_name | domain | unit | formula | formula_sql | source_table | default_priority | Thresholds (H/W/C) | Tags |
|------------|-------------|--------|------|---------|-------------|--------------|-----------------|-------------------|------|
| `health_score` | Health Score | Health | score | weighted avg of 7 dimensions | Pre-calculated by scoring logic | Derived | 1 | S(90+) / D(30-49) / F(<30) | `health`, `p0` |
| `health_tier` | Health Tier | Health | tier | S/A/B/C/D/F | Derived from health_score | Derived | 1 | — | `health` |
| `dimension_revenue` | Dim: Revenue | Health | score | Scoring logic (base 50 ± signals) | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_growth` | Dim: Growth | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_engagement` | Dim: Engagement | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_product` | Dim: Product | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_ad_infra` | Dim: Ad Infra | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_unit_econ` | Dim: Unit Econ | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |
| `dimension_portfolio` | Dim: Portfolio | Health | score | — | — | Derived | 3 | — | `health`, `dimension` |

---

# PHẦN 4B: CHIẾN LƯỢC APP CONTEXT — PILOT vs QUY MÔ LỚN (1000+ APP)

**PHẦN 5** bên dưới là **ví dụ pilot đầy đủ** (AR Tracer): một khối `aiContext` rất chi tiết — phù hợp app flagship / PoC khi team Product–Data có thể duy trì.

**Khi triển khai hàng loạt (1000+ app)**, không thực tế để nhập tay toàn bộ monetization, geo strategy, funnel copy… cho từng app. Hướng vận hành đề xuất:

| Lớp | Vai trò | Ghi chú |
|-----|---------|--------|
| **Insight Template (toàn cục)** | `Global AI Instructions` + 7 section (tiếng Việt, rubric Health, IAA+IAP, format Markdown…) | Một hoặc vài template theo **category** (vd. Utility / Creative / Game). Dùng chung mọi app thuộc nhóm đó. |
| **Nền tảng** | `system_data_context` (AI Admin), Knowledge Base (JOIN, benchmark, pitfall) | Không phụ thuộc từng app. |
| **`aiContext` per app (tùy chọn)** | Bổ sung ngắn khi cần: có thể **`{}`**, hoặc chỉ `appSummary` 1–2 câu + `genre` / `monetization_hint` | App đặc biệt mới điền sâu như PHẦN 5. |
| **Product insight “tự học”** | **Snapshot JSON** (gold/silver/bronze + enrichment) + **Agentic MCP regenerate** | Model đọc số liệu thật và có thể chạy thêm `read_query` (trong giới hạn budget) để làm rõ funnel, event, geo — không cần sao chép toàn bộ mô tả sản phẩm vào DB. |

**Nguyên tắc:** `admob_app_id`, chuỗi ngày, dim mapping đã có trong snapshot; prompt template yêu cầu “chỉ trích số từ snapshot/MCP”. Per-app context chỉ cần những gì **không suy ra được từ warehouse** (positioning, chiến lược thử nghiệm, ngoại lệ nghiệp vụ).

**AppsFlyer / MMP:** Section template **Growth & Acquisition** (`ua_growth`) trong DB seed nên được cập nhật song song với tài liệu này: bắt buộc nhắc `snapshot.attribution` (appsFlyerInstallsByMediaSourceTop, appsFlyerOrganicSplit, primaryPathHint) cùng `snapshot.ua.adjustCampaignRollupTop` khi app dùng Adjust — để model không chỉ đọc Adjust/XMP mà bỏ qua AF.

**Giới hạn MCP (regenerate agentic):** số query tối đa mỗi phiên regenerate cấu hình bằng `AppInsight:RegenerateAgentic:McpQueryBudget` (mặc định **20** trong repo). Vẫn chịu thêm trần `Mcp:Discipline:MaxQueriesPerSession` và rate limit proxy.

---

# PHẦN 5: APP CONTEXT — VÍ DỤ PILOT (AR Tracer)

**App context for AI** — Lưu vào `settings.aiContext` trên server (JSON trong `app_insight_settings`). Với quy mô lớn, coi đây là **mẫu tham chiếu**, không bắt buộc mọi app phải đạt cùng độ chi tiết.

### Tóm tắt app (aiContext.appSummary)

```
AR Tracer: Trace Drawing — ứng dụng vẽ tranh qua camera AR trên iOS. User chọn lesson/template, 
đặt điện thoại, vẽ theo hình mẫu hiện trên camera. Thể loại Creative Utility. 
Monetization: hybrid IAA (5 format: rewarded, interstitial, banner, native, app_open) + 
IAP/Subscription (trial → paid Pro unlock tất cả lessons). Revenue mix: ~60% IAA, ~40% IAP.
Thị trường chính: US, UK, Japan. Giai đoạn: growth (UA scaling).
```

### Context Blocks

#### 1. Query context — app identifiers for MCP

```json
{
  "context_type": "query_identifiers",
  "firebase_id": "ar_tracer_trace_drawing_ios",
  "bundle_id": "com.avntech.ar-drawing",
  "platform": "iOS",
  "app_store_id": "6504559449",
  "xmp_store_package_id": "id6504559449",
  "admob_app_id": "(from dim_app_identifiers)",
  "adjust_id": null,
  "appsflyer_af_app_id": "id6504559449",
  "bronze_table": "bronze.fb_ar_tracer_trace_drawing_ios",
  "notes": "Adjust not configured. AppsFlyer: snapshot.attribution dùng hasAppsFlyerAttributionSlice + appsFlyerInstallsByMediaSourceTop / appsFlyerOrganicSplit từ Pull raw hoặc gold Master hoặc aggregate; hasAppsFlyerInstallsRaw chỉ báo bronze pulls. Chạy AppsFlyerUaTransformJob sau Master để có gold.app_ua_daily."
}
```

#### 2. Monetization — hybrid IAA+IAP

```
Revenue mix: ~60% IAA, ~40% IAP (confirmed from Q1+Q9 data).
IAA: 5 formats — interstitial dominates revenue (55.7%), rewarded highest eCPM ($24.60).
IAP: Subscription model with trial. Trial→Sub conversion critically low (0.2%).
Ad events: ad_impression_custom is the PRIMARY ad event. ad_impression1-4 NOT used.
Format breakdown via: get_json_string(event_params_json, '$.ad_format')

AdMob sources: Waterfall (39% SoW), Network (30.5%), Unity, Liftoff, AppLovin, Pangle, Meta, Moloco.
```

#### 3. User flow — onboarding

```
Core Loop: Install → Onboard (8 bước) → Browse lessons/templates → AR Drawing → Complete → Save & Share → Return

Onboarding 8 steps:
first_open → language_choose* → intro_next_click → intro_category_choose → 
intro_user_level_choose → intro_user_age_choose → intro_iap → 
end_onboard_global / end_onboard_iaa / end_onboard_jp

*language_choose only fires when user actively changes language (not mandatory step)

IMPORTANT: Japan has a SEPARATE onboarding path (end_onboard_jp) that bypasses 
intro/category/level/age steps. ~93% of JP users skip personalization.
This may impact content relevance and retention for JP market.
```

#### 4. Geo-specific strategy

```
Top 3 markets by DAU: United States, United Kingdom, Japan

US: Largest market, highest D0 activation (70.6%), but D1 retention below global avg (12.7% vs 15.5%).
    Heavy UA investment (TikTok 52% of spend). Low-quality user acquisition concern.

UK: Best quality market — highest drawing rate (63.0%), D1 (17.1%), onboard (97.5%).
    Currently under-invested in UA. Benchmark market for product decisions.

JP: Unique onboarding path bypasses personalization. Lowest retention (D1: 9.7%, D7: 1.5%).
    Needs localized content (anime/manga) and onboarding flow review.
```

#### 5. Ad infrastructure & mediation

```
Primary ad event: ad_impression_custom (NOT ad_impression1-4)
Format param: get_json_string(event_params_json, '$.ad_format')
Formats: banner (58.1%), native (16.5%), interstitial (13.0%), app_open (10.7%), video_rewarded (1.7%)

Fill rate: stable ~89.5% (Good)
SoW: Waterfall 39% (Healthy, below 60% warning)
Opportunity: Increase rewarded placements (currently 1.7% of volume, but $24.60 eCPM)

Cross-validate: Q11a/Q11b (Firebase events) vs Q4 (AdMob billing)
```

#### 6. Unit economics & LTV context

```
ARPDAU (IAA+IAP): $0.071
ROI (15d): 0.168x — deeply negative
Estimated daily loss from UA: ~$8,500

Organic installs: 38,004 (largest source, free) — product-led growth potential
Paid CPI varies by channel: TikTok ~$3-6, Apple ~$2-5, Google ~$1-3

LTV gap: With D7 retention at 2.7% and ARPDAU $0.071, estimated D7 LTV ~$0.50
vs average CPI ~$3-4. Need 6-8x retention improvement to break even on paid UA.
```

---

# PHẦN 6: QUERY PATTERNS (20 queries)

> Đã định nghĩa đầy đủ trong file `02_AR_Tracer_Insight_Complete_Guideline.md` (Q1–Q20).
> Khi onboard app mới, thay: firebase_id, bronze table name, event lists (Q7–Q10), geo queries (Q16–Q19), và dim identifiers.

| Query | Mô tả | Ưu tiên | Source |
|-------|-------|---------|--------|
| Q1 | Gold revenue/eCPM/fill + total_ad_requests/total_matched_requests | P0 | gold.fact |
| Q2 | Gold daily_overview (DAU/sessions) | P0 | gold.daily_overview |
| Q3 | Mediation by ad source (SoW) | P0 | bronze.mediation_table |
| Q4 | AdMob by ad unit | P0 | bronze.admob_table |
| Q5 | Firebase DAU/DAV/sessions | P0 | bronze.fb_* |
| Q6 | Retention cohort D1/D3/D7/D14/D30 | P0 | bronze.fb_* |
| Q7 | Drawing/content metrics | P0 | bronze.fb_* |
| Q8 | Onboarding funnel (8 steps) | P0 | bronze.fb_* |
| Q9 | IAP/subscription lifecycle | P0 | bronze.fb_* |
| Q10 | D0 activation rate | P0 | bronze.fb_* |
| Q11a/b | Ad events + format breakdown | P1 | bronze.fb_* |
| Q12 | Top events (7d) | P1 | bronze.fb_* |
| Q13 | XMP UA cost by channel | P1 | bronze.xmp_report |
| Q14 | Installs theo network / media_source | P1 | **AppsFlyer:** `snapshot.attribution.appsFlyerInstallsByMediaSourceTop` (raw Pull / gold Master / aggregate). **Adjust:** `snapshot.ua.adjustCampaignRollupTop` |
| Q15 | Organic vs paid | P1 | **AppsFlyer:** `snapshot.attribution.appsFlyerOrganicSplit` (cùng thứ tự nguồn). **Fallback:** `firebaseAfStatusOnFirstOpen` hoặc fb_* `af_status` |
| Q15b | Gold UA daily (AppsFlyer) | P2 | `gold.app_ua_daily` WHERE `mmp_source='appsflyer'` — sau `AppsFlyerUaTransformJob`; snapshot đã gộp vào Q14/Q15 khi `hasAppsFlyerAttributionSlice` |
| Q16 | Geo: Top 3 engagement + drawing | P0⭐ | bronze.fb_* |
| Q17 | Geo: Onboarding per country | P0⭐ | bronze.fb_* |
| Q18 | Geo: Retention per country | P0⭐ | bronze.fb_* |
| Q19 | Geo: D0 activation per country | P0⭐ | bronze.fb_* |
| Q20 | T+1 action tracking | P0 | Postgres app_daily_insights |

---

*Tài liệu này cung cấp đầy đủ cấu hình để Amobear Nexus chạy Agentic AI tạo báo cáo App Insight tự động. **Pilot / flagship:** khi onboard app mới cùng category (Utility/Creative), có thể làm chi tiết như §5 + Event Catalog (Q7–Q10) + Geo. **Quy mô lớn:** ưu tiên template chung + snapshot + MCP (xem §4B); `aiContext` per app tối giản hoặc bỏ trống.*
