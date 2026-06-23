# AR Tracer: Trace Drawing — Báo cáo Sức khỏe App | 2026-04-08

---

## 📊 Executive Summary

### Điểm tổng: **83/100** — Xếp hạng: 🅐 Tier A

| Chiều đo | Trọng số | Điểm | Trạng thái | Tín hiệu chính |
|---|---|---|---|---|
| Revenue & Monetization | 20% | **89** | ✅ Mạnh | Rev $1,320.33 · eCPM $4.10 tăng mạnh vs avg7d $3.73 |
| Growth & Acquisition | 10% | **N/A** | ⚪ Thiếu data | Attribution gap (AppsFlyer/Adjust chưa có) |
| Engagement & Retention | 20% | **N/A** | ⚪ Thiếu data | DAU có nhưng cohort retention chưa tách được |
| Product & Content | 20% | **N/A** | ⚪ Thiếu data | Funnel events có, metric tổng hợp chưa đủ |
| Ad Infrastructure | 15% | **75** | 🟡 Ổn | Fill 89.6% · Interstitial chiếm SoW cao |
| Unit Economics | 10% | **N/A** | ⚪ Thiếu data | ROI 0.09 — critical, thiếu IAP để tính đầy đủ |
| Portfolio Position | 5% | **N/A** | ⚪ Thiếu data | Geo phong phú nhưng chưa rank portfolio |
| Optimization Velocity | — | **N/A** | ⚪ Tracking | — |

> ⚠️ **Composite tính trên 2 dimensions có data** (Revenue 89 × 57% + Ad Infra 75 × 43% ≈ **83**). Các dimensions còn lại bị loại khỏi tính toán do thiếu data đầy đủ.

**Tóm tắt:** AR Tracer đang trong giai đoạn tăng trưởng tốt — doanh thu IAA đạt $1,320.33 ngày 08/04, tăng **+9.3%** so với avg7d ($1,207.02) và eCPM tăng lên $4.10 (+10.1% vs avg7d $3.73), tín hiệu monetization rõ ràng tích cực. Điểm yếu nghiêm trọng nhất là **ROI chỉ đạt 0.09** với UA cost $14,727 trong khi IAA revenue $1,320 — giai đoạn growth scaling đang đốt tiền mạnh và chưa có dữ liệu IAP để đánh giá đầy đủ. [BOD] cần theo dõi sát tỷ lệ ROI; [UA] cần kiểm tra chất lượng campaign đặc biệt sau khi UA cost tăng gần gấp đôi so với ngày T-2.

---

## 💰 Revenue & Monetization (+ Ad Infrastructure)

### 3.1 Xu Hướng Doanh Thu Tổng (IAA + IAP)

> ⚠️ **Data Gap:** `gold.daily_overview` trả về `iap_rev = 0.0` cho toàn bộ window 25/03–08/04. IAP revenue không thể xác nhận từ pipeline Gold. Tổng doanh thu bên dưới = **IAA only** từ `gold.fact_daily_app_metrics`. [DA] cần fix ETL pipeline đổ `iap_rev` vào `gold.daily_overview`.
> Ngày **2026-03-30**: `dau` = NULL trên Gold — data gap 1 ngày.

**Bảng 15 ngày — Daily Revenue Series** *(Nguồn: `gold.fact_daily_app_metrics`)*

| Ngày | IAA ($) | IAP ($) | Tổng ($) | eCPM | Fill Rate | Impressions | DAU |
|---|---|---|---|---|---|---|---|
| 2026-03-25 | 717.20 | N/A | 717.20 | — | — | 265,454 | 20,479 |
| 2026-03-26 | 752.02 | N/A | 752.02 | — | — | 272,741 | 21,311 |
| 2026-03-27 | 835.37 | N/A | 835.37 | — | — | 293,747 | 22,801 |
| 2026-03-28 | 997.61 | N/A | 997.61 | — | — | 347,724 | 26,056 |
| 2026-03-29 | 1,030.59 | N/A | 1,030.59 | — | — | 372,742 | 26,401 |
| 2026-03-30 | 935.47 | N/A | 935.47 | — | — | 326,571 | NULL ⚠️ |
| 2026-03-31 | 868.76 | N/A | 868.76 | — | — | 310,688 | 23,365 |
| 2026-04-01 | 814.24 | N/A | 814.24 | — | — | 304,656 | 23,561 |
| 2026-04-02 | 917.46 | N/A | 917.46 | — | — | 314,510 | 23,632 |
| 2026-04-03 | 1,155.03 | N/A | 1,155.03 | — | — | 360,123 | 26,551 |
| 2026-04-04 | 1,191.62 | N/A | 1,191.62 | — | — | 387,089 | 27,142 |
| 2026-04-05 | 1,215.98 | N/A | 1,215.98 | — | — | 380,564 | 27,287 |
| 2026-04-06 | 1,278.78 | N/A | 1,278.78 | — | — | 368,134 | 26,838 |
| 2026-04-07 | **1,369.91** | N/A | **1,369.91** | $3.83 | 89.5% | 381,345 | 27,455 |
| **2026-04-08** | **1,320.33** | N/A | **1,320.33** | **$4.10** | **89.6%** | **373,548** | **26,142** |

> *eCPM và Fill Rate chỉ có sẵn cho T và T-1 từ snapshot daily overview; các ngày còn lại cần query riêng.*

**KPI Cards — Ngày 2026-04-08:**

| KPI | Giá trị | DoD | vs 7d Avg |
|---|---|---|---|
| Tổng Revenue (IAA) | **$1,320.33** | −3.6% (↓) | +9.3% ✅ |
| eCPM | **$4.10** | +7.0% (↑) | +10.1% ✅ |
| Fill Rate | **89.6%** | +0.1pp (→) | ~+0.1pp |
| Impressions | **373,548** | −2.0% (↓) | +1.9% |
| ARPDAU | **$0.0505** | +1.2% (↑) | — |
| DAU | **26,142** | −4.8% (↓) | — |

**Nhận xét:** Revenue giảm nhẹ DoD (−3.6%) nhưng nguyên nhân chủ yếu do DAU giảm −4.8%; eCPM lại tăng +7.0% lên $4.10 — đây là tín hiệu tích cực, cho thấy chất lượng inventory đang cải thiện. Xu hướng 15 ngày cho thấy growth trajectory rõ ràng từ $717 → $1,320 (+84% trong 2 tuần).

---

### 3.2 Doanh Thu Theo Nguồn — Share of Wallet (IAA, Window 25/03–08/04)

*(Nguồn: `bronze.mediation_table` qua `readerEnrichment`)*

| Ad Source | Revenue (Window) | Impressions | eCPM ước tính | SoW% |
|---|---|---|---|---|
| AdMob Network Waterfall | $5,893.05 | 979,002 | $6.02 | **38.5%** |
| AdMob Network | $4,671.40 | 2,588,907 | $1.80 | **30.5%** |
| Unity Ads (bidding) | $1,409.39 | 227,607 | $6.19 | 9.2% |
| Liftoff Monetize (bidding) | $903.63 | 199,324 | $4.53 | 5.9% |
| AppLovin (bidding) | $677.60 | 62,416 | $10.86 | 4.4% |
| Pangle (bidding) | $641.18 | 365,730 | $1.75 | 4.2% |
| Meta Audience Network (bidding) | $486.83 | 247,942 | $1.96 | 3.2% |
| Moloco Ads SDK (bidding) | $441.18 | 222,013 | $1.99 | 2.9% |
| Pangle | $91.16 | 10,762 | $8.47 | 0.6% |
| Khác | $9.46 | 1,097 | — | 0.1% |
| ironSource Ads (bidding) | $0.00 | 0 | — | 0.0% |
| **TỔNG** | **$15,224.88** | **4,904,802** | **$3.10 avg** | **100%** |

**Phân tích Concentration Risk:**
- **Top 1 (AdMob Waterfall): 38.5%** — dưới ngưỡng cảnh báo 40%, ✅ còn an toàn
- **Top 2 gộp (AdMob Waterfall + AdMob Network): 69.0%** — 🟡 cao, phụ thuộc lớn vào AdMob ecosystem
- **Bidding networks chiếm ~30.5%** (Unity + Liftoff + AppLovin + Pangle bid + Meta + Moloco) — đa dạng hóa tốt
- **ironSource = $0** — cần kiểm tra lại cấu hình hoặc fill [Mediation]
- **AppLovin (bidding) có eCPM $10.86** — cao nhất trong bidding pool, tuy nhiên volume thấp (62K impressions) → cơ hội tăng inventory cho AppLovin

---

### 3.3 Doanh Thu Theo Ad Unit (Window 25/03–08/04)

*(Nguồn: `bronze.admob_table` qua `readerEnrichment`)*

| Ad Unit | Format | Revenue | Impressions | eCPM |
|---|---|---|---|---|
| V4_ArDrawingOS_InApp_Inter | Interstitial | **$6,602.47** | 575,907 | **$11.46** |
| V4_ArDrawingOS_InApp_Reward | Rewarded | $2,220.52 | 90,788 | **$24.46** ⭐ |
| V4_ArDrawingOS_InApp_Banner1 | Banner | $1,267.82 | 2,540,514 | $0.50 |
| V4_ArDrawingOS_Session2_AppOpenAll | App Open | $911.86 | 191,897 | $4.75 |
| V4_ArDrawingOS_FirstOpen_AppOpenH | App Open | $813.65 | 56,626 | $14.37 ⭐ |
| V4_ArDrawingOS_AppOpen_Resume | App Open | $755.19 | 198,102 | $3.81 |
| V4_ArDrawingOS_InApp_Native5 | Native | $582.23 | 155,431 | $3.75 |
| V4_ArDrawingOS_FirstOpen_Language2DupAll | Native/Inter | $407.75 | 269,514 | $1.51 |
| V4_ArDrawingOS_FirstOpen_Language2DupH | Native/Inter | $327.45 | 21,683 | $15.10 ⭐ |
| V4_ArDrawingOS_InApp_Native2 | Native | $291.05 | 168,278 | $1.73 |
| V4_ArDrawingOS_FirstOpen_Language1H | App Open/Native | $284.31 | 31,767 | $8.95 |
| V4_ArDrawingOS_FirstOpen_OnBoarding3All | App Open | $167.16 | 42,090 | $3.97 |
| V4_ArDrawingOS_InApp_Banner2 | Banner | $145.88 | 450,232 | $0.32 |
| V4_ArDrawingOS_FirstOpen_AppOpenAll | App Open | $124.22 | 39,592 | $3.14 |
| V4_ArDrawingOS_FirstOpen_OnBoarding1All | App Open | $121.39 | 32,279 | $3.76 |
| V4_ArDrawingOS_InApp_Native1 | Native | $95.34 | 25,696 | $3.71 |
| V4_ArDrawingOS_FirstOpen_Language1All | Native/Inter | $71.85 | 27,626 | $2.60 |
| V4_ArDrawingOS_InApp_Native3 | Native | $69.58 | 34,958 | $1.99 |

**Highlights:**
- 🥇 **Rewarded: eCPM $24.46** — cao nhất nhưng volume chỉ 90K impressions. Nếu tăng được trigger rewarded (vd: thêm reward trước mỗi bài học nâng cao), doanh thu có thể tăng đáng kể → [Product] [Mediation]
- 🥈 **Interstitial: eCPM $11.46, revenue $6,602** — ad unit đóng góp lớn nhất
- ⭐ **FirstOpen_AppOpenH: eCPM $14.37** với 56K impressions — high-value slot tại first open
- **Banner eCPM rất thấp** ($0.50 / $0.32) nhưng volume cao — cân nhắc format upgrade

---

### 3.4 Doanh Thu Theo Mediation Group (Window 25/03–08/04)

*(Nguồn: `readerEnrichment.mediationGroupsTop`)*

| Mediation Group | Revenue | Impressions | Ghi chú |
|---|---|---|---|
| V4_ArDrawingOS_Inter_Global | **$6,550.07** | 566,295 | 🏆 Top group |
| V4_ArDrawingOS_Banner_Group3 | $1,036.98 | 1,198,244 | Tier cao của banner |
| V4_ArDrawingOS_Reward_Group2 | $901.68 | 32,864 | eCPM ngầm ~$27.4 |
| V4_ArDrawingOS_Session2_AppOpenAll | $898.82 | 186,660 | App open mid-session |
| V4_ArDrawingOS_FirstOpen_AppOpenH_All | $805.30 | 55,603 | High-value first open |
| V4_ArDrawingOS_Reward_Group4 | $764.08 | 13,956 | eCPM rất cao (US/CH) |
| V4_ArDrawingOS_AppOpen_Resume2. | $741.06 | 191,594 | App resume |
| V4_ArDrawingOS_Native | $517.21 | 242,639 | Native toàn cục |
| V4_ArDrawingOS_NativeInApp_Group3 | $305.81 | 57,083 | Native in-app |
| Khác (5 groups) | ~$1,180 | ~1,180K | — |

---

### 3.5 Fill Rate & Infra Health

| Metric | T (08/04) | T-1 (07/04) | avg7d | Trạng thái |
|---|---|---|---|---|
| Fill Rate | **89.6%** | 89.5% | ~89.5% | 🟡 Cần cải thiện |
| Total Ad Requests | 567,379 | 533,260 | ~366K (từ impressions proxy) | ↑ Tăng mạnh |
| Matched Requests | 427,390 | 427,512 | — | → Flat |
| Impressions | 373,548 | 381,345 | 366,473 | ✅ |
| eCPM | **$4.10** | $3.83 | $3.73 | ✅ +10% vs avg |

**Tín hiệu cảnh báo — Fill Rate Gap:**
- Ad Requests tăng mạnh (+34K DoD: 567K vs 533K) nhưng Matched Requests hầu như không đổi (427,390 vs 427,512) → **fill rate theo matched/request giảm thực chất**
- Tổng Requests ngày T (567K) cao hơn nhiều avg7d (ước ~430K) → pipeline mở rộng nhưng inventory chưa theo kịp
- **Signal**: Revenue ↑ + Fill Rate marginal + Ad Requests ↑ mạnh = fragile growth nếu bidders không scale theo

> 🟡 [Mediation] Cần kiểm tra lý do ad_requests tăng đột biến +34K DoD trong khi matched_requests flat — có thể do mở thêm ad placement hoặc tần suất cao hơn mà không có demand tương ứng.

---

## 👥 Engagement & Retention

### 5.1 Xu Hướng DAU (15 ngày)

*(Nguồn: `gold.fact_daily_app_metrics` + `bronze.fb_ar_tracer_trace_drawing_ios` [Q2])*

**Daily Series:**

| Ngày | DAU | New Users | New/DAU% | Sessions (gold) | DAV | Ad Penetration |
|---|---|---|---|---|---|---|
| 2026-03-25 | 20,479 | — | — | — | 19,244 | — |
| 2026-03-26 | 21,311 | — | — | — | 19,540 | — |
| 2026-03-27 | 22,801 | — | — | — | 18,801 | — |
| 2026-03-28 | 26,056 | — | — | — | 24,365 | — |
| 2026-03-29 | 26,401 | — | — | — | 23,762 | — |
| 2026-03-30 | NULL ⚠️ | — | — | — | NULL | — |
| 2026-03-31 | 23,365 | — | — | — | 21,165 | ~82% |
| 2026-04-01 | 23,561 | — | — | — | 21,148 | — |
| 2026-04-02 | 23,632 | 9,089 | 38.5% | — | 21,756 | — |
| 2026-04-03 | 26,551 | 11,178 | 42.1% | — | 22,231 | — |
| 2026-04-04 | 27,142 | 11,534 | 42.5% | — | 24,850 | — |
| 2026-04-05 | 27,287 | 11,654 | 42.7% | — | 24,534 | — |
| 2026-04-06 | 26,838 | 11,895 | 44.3% | — | 26,565 | — |
| 2026-04-07 | 27,455 | 12,718 | 46.3% | 32,185 | 25,416 | — |
| **2026-04-08** | **26,142** | **11,065** | **42.3%** | **30,446** | **23,149** | **88.55%** |

> ⚠️ New Users từ `bronze.fb_ar_tracer_trace_drawing_ios` (event `first_open`) — chỉ available đầy đủ cho phần cuối window từ agentic query. Sessions và ad_penetration từ `gold.daily_overview`.

**KPI Cards — Ngày 2026-04-08:**

| KPI | Giá trị | DoD | Nhận xét |
|---|---|---|---|
| DAU | **26,142** | −4.8% (↓) | Giảm nhẹ sau peak 27,455 |
| New Users | **11,065** | −13.0% (↓) | Giảm theo DAU |
| New/DAU % | **42.3%** | −4pp (↓) | Vẫn cao — phụ thuộc UA |
| Sessions | **30,446** | −5.4% (↓) | ~1.16 sessions/user |
| DAV | **23,149** | −8.9% (↓) | 88.6% of DAU thấy quảng cáo |
| Ad Penetration | **88.55%** | — | ✅ Cao |

**Phân tích:**
- **DAU tăng 27.7% trong 2 tuần** (20,479 → 26,142) — tăng trưởng mạnh nhờ UA scaling
- **New Users chiếm 42–46% DAU** trong tuần đầu tháng 4 → 🟡 DAU phụ thuộc UA nặng, rủi ro nếu cắt budget
- **Sessions/user ~1.16** (30,446 sessions / 26,142 DAU) → 🔴 Thấp — user chỉ mở app 1 lần/ngày trung bình, chưa quay lại trong ngày
- **Ad penetration 88.55%** — tốt, gần 9/10 DAU thấy quảng cáo

### 5.2 Retention Cohort

> ⚠️ **Data Gap:** Retention cohort chi tiết (D1/D3/D7/D14 theo ngày install) không có trong snapshot hiện tại. `gold.retention_overview` chưa được query trong window này. [DA] cần bổ sung retention cohort query để đánh giá đầy đủ dimension Engagement.

**Dữ liệu gần nhất có thể suy luận:** Từ agentic summary, ad_penetration dao động 82–99% trong window → user quay lại đủ để thấy quảng cáo. Tuy nhiên sessions/user thấp (~1.16) gợi ý D1 retention có thể không cao.

**Tín hiệu từ New Users ratio:**
- New Users ~42% DAU → nếu D1 retention thấp (<30%), DAU sẽ sụt ngay khi giảm UA
- Cần ưu tiên query `gold.retention_overview` cho cohort D1/D7 → [DA]

---

## 🎮 Product & Content Health

### 6.1 Chỉ Số Product Tổng Quan

*(Nguồn: `bronze.fb_ar_tracer_trace_drawing_ios` — window 25/03–08/04, [Q3])*

| Event | Count (Window) | Users | Avg/Day | Ghi chú |
|---|---|---|---|---|
| `iap_show` | 1,025,065 | 225,569 | ~68,338 | IAP screen hiển thị rất nhiều |
| `iap_close` | 908,939 | 180,285 | ~60,596 | 88.7% đóng lại |
| `content_click` | 736,994 | 150,916 | ~49,133 | Khám phá template |
| `draw_mode` | 659,626 | 145,720 | ~43,975 | Mode vẽ mở |
| `content_draw` | 659,128 | 145,581 | ~43,942 | Bắt đầu vẽ |
| `content_start` | 456,167 | 122,768 | ~30,411 | Bắt đầu bài học/template |
| `content_done` | 330,014 | 87,269 | ~22,001 | Hoàn thành vẽ |
| `iap_click` | 171,940 | 67,525 | ~11,463 | Click vào nút mua |
| `draw_with_lesson` | 82,441 | 29,006 | ~5,496 | Dùng lesson feature |
| `iap_purchase` | 10,126 | 8,440 | ~675 | Mua thành công |

**Tính toán KPI Product:**

| Metric | Giá trị | Công thức | Trạng thái |
|---|---|---|---|
| Drawing Rate (proxy) | **~55.7%** | content_draw users (145K) / avg DAU (~261K tổng) | ✅ Tốt (>45%) |
| Content Completion Rate | **~50.1%** | content_done (330K) / content_start (456K) | ✅ Cao |
| IAP Funnel: Show → Click | **16.8%** | iap_click (172K) / iap_show (1,025K) | 🟡 Thấp |
| IAP Funnel: Click → Purchase | **5.9%** | iap_purchase (10K) / iap_click (172K) | 🟡 Biên giới |
| IAP Funnel: Show → Purchase | **0.99%** | iap_purchase / iap_show | 🔴 Thấp |
| Lesson Usage | ~20% users vẽ | draw_with_lesson (29K users) / content_draw users | 🟡 Cần kích thích |

> ⚠️ Drawing rate được ước tính từ window 15 ngày / tổng user — cần query theo ngày để có trend chính xác.

### 6.2 Onboarding & IAP Funnel

**IAP Funnel (Window 25/03–08/04):**

```
iap_show      → 1,025,065 events / 225,569 users  [100%]
     ↓ 16.8%
iap_click     →   171,940 events /  67,525 users
     ↓ 5.9%
iap_purchase  →    10,126 events /   8,440 users   [0.99% of shows]
```

**Nhận xét funnel:**
- **Close rate 88.7%** (908K close / 1,025K show) → Quá cao, user thấy paywall nhưng hầu hết đóng ngay
- IAP screen được show **rất nhiều** (~68K lần/ngày) — có thể quá aggressive, gây UX friction
- Từ show → purchase chỉ 0.99% → [Product] cần A/B test paywall copy, pricing, hoặc trial offer

**Content Funnel:**
```
content_click  → 736,994 / 150,916 users  [100% explorers]
     ↓ ~96%
content_draw   → 659,128 / 145,581 users  [drawing initiated]
     ↓ ~60%
content_start  → 456,167 / 122,768 users  [lesson started]
     ↓ ~72%
content_done   → 330,014 /  87,269 users  [completed]
```

Content funnel khá tốt — drop lớn nhất ở content_draw → content_start (40% không bắt đầu lesson chính thức sau khi vẽ). Cần tìm hiểu nguyên nhân.

### 6.3 IAP / Subscription Tổng Quan

> ⚠️ `iap_rev` và `total_rev` trên `gold.daily_overview` = 0.0 cho toàn bộ window — **pipeline gap nghiêm trọng**. Không thể xác nhận doanh thu IAP thực tế. Chỉ có event count từ Firebase.

| Metric | Giá trị (Window) | Ghi chú |
|---|---|---|
| iap_purchase events | 10,126 | ~675/ngày |
| iap_purchase users | 8,440 | Unique buyers |
| IAP Revenue ($) | **N/A** | Pipeline gap — gold.daily_overview rỗng |
| iap_show → purchase CVR | 0.99% | Thấp |

Theo app context, IAP/Subscription chiếm ~40% revenue. Với total IAA ~$1,320/ngày, IAP ước tính ~$880/ngày → tổng có thể ~$2,200/ngày nếu tỷ lệ này đúng. [DA] cần xác nhận khẩn.

### 6.4 Geo Deep Dive — Top Countries

*(Nguồn: `bronze.fb_ar_tracer_trace_drawing_ios` — window 25/03–08/04, [Q4])*

| Quốc gia | DAU (Window Cumulative) | % Tổng | Tier |
|---|---|---|---|
| 🇺🇸 United States | **59,829** | **~26.8%** | Tier 1 |
| 🇬🇧 United Kingdom | **19,435** | **~8.7%** | Tier 1 |
| 🇯🇵 Japan | **17,144** | **~7.7%** | Tier 1 |
| 🇩🇪 Germany | **12,171** | **~5.5%** | Tier 1 |
| 🇻🇳