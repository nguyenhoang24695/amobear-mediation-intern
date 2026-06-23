# Amobear Nexus — App Insight V1 Complete Structure
## Cấu trúc, Prompt, Knowledge Base & Metrics cho Agentic AI

> **Mục tiêu:** Tạo báo cáo insight hoàn chỉnh V1, chỉ dùng dữ liệu THỰC SỰ CÓ trong hệ thống.
> **Tham khảo UI:** QOn App Intelligence (card-based insights với severity levels)
> **Output style:** Card-based insights — mỗi card = 1 chủ đề, có severity + headline + analysis + action

---

## 1. Thiết kế Output — Card-Based Insight (tham khảo QOn)

### 1.1 Cấu trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  OVERVIEW CARD (luôn hiển thị đầu tiên)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Health Score: 74 ⬤ Good                                   │  │
│  │                                                           │  │
│  │ Tóm tắt 3-4 câu: điểm mạnh, điểm yếu, rủi ro chính.    │  │
│  │ Highlight số liệu quan trọng bằng màu (tăng/giảm).       │  │
│  │                                                           │  │
│  │ ● N critical  ● N warning  ● N positive  ● N tip          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  INSIGHT CARDS (grid 3 cột, sort theo severity)                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ [Topic]      │ │ [Topic]      │ │ [Topic]      │           │
│  │ ⊘ Critical   │ │ ▲ Warning    │ │ ⊕ Positive   │           │
│  │              │ │              │ │              │           │
│  │ Headline     │ │ Headline     │ │ Headline     │           │
│  │ Analysis     │ │ Analysis     │ │ Analysis     │           │
│  │ ────────     │ │ ────────     │ │ ────────     │           │
│  │ 💡 Action    │ │ 💡 Action    │ │ 💡 Action    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Severity Levels (khớp QOn)

| Severity | Icon | Màu | Điều kiện |
|----------|------|------|-----------|
| **Critical** | ⊘ | Đỏ | Metric vượt ngưỡng nguy hiểm (fill <80%, ROI <0.5, D1 <20%) |
| **Warning** | ▲ | Vàng cam | Metric đang xu hướng xấu hoặc gần ngưỡng |
| **Positive** | ⊕ | Xanh lá | Metric cải thiện đáng kể (>10% tăng, vượt target) |
| **Tip** | ◉ | Tím | Insight hay nhưng chưa khẩn cấp, cơ hội tối ưu |

### 1.3 Mỗi Insight Card có cấu trúc

```json
{
  "topic": "Revenue",
  "severity": "positive",
  "headline": "Revenue Surges 20.7% vs 7-Day Average",
  "analysis": "Phân tích 3-5 câu có số liệu cụ thể, so sánh, cross-reference...",
  "action": "1-2 câu action cụ thể với team tag [Mediation] [UA] [Product]...",
  "metrics_used": ["revenue_t", "revenue_7d_avg", "ecpm", "impressions"],
  "data_source": "gold + bronze",
  "confidence": 95
}
```

---

## 2. Các Insight Topics cho V1 (chỉ dùng data có sẵn)

### 2.1 Data Sources thực tế có cho V1

| Source | Bảng | Dữ liệu | Trạng thái | Loại App |
|--------|------|----------|------------|----------|
| **AdMob Gold** | `gold.fact_daily_app_metrics` | Revenue, eCPM, fill rate, impressions, ua_cost, roi | ✅ Có | Tất cả |
| **AdMob Bronze** | `bronze.admob_table`, `bronze.mediation_table` | Revenue by source, by ad unit, by format | ✅ Có | Tất cả |
| **Firebase Bronze** | `bronze.fb_<app_id>` | DAU, DAV, sessions, retention, events, onboarding, drawing | ✅ Có (fallback) | Tất cả |
| **XMP Bronze** | `bronze.xmp_report` | UA cost by channel (TikTok, Google, Facebook, Apple) | ✅ Có | Tất cả |
| **Adjust Bronze** | `bronze.adjust_report` | Installs by network, campaign, organic/paid | ⚠️ Cần adjust_id | App có Adjust |
| **AppMetrica** | `bronze.appmetrica_*` | Sessions, crashes, ANR, profiles, push, deeplinks | ✅ Có (game) | Game |
| **QOn (Qonversion)** | `bronze.qon_*` *(đang lấy về)* | Subscription revenue, trials, renewals, refunds, MRR, churn | 🔄 Đang tích hợp | App có subscription |
| **AppsFlyer** | `user_properties_json ($.af_*)` + `bronze.appsflyer_*` | Attribution (organic/paid), install source, campaign | ✅ Có (qua Firebase) | Tất cả |

#### Sơ đồ Data Sources theo vai trò

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA SOURCE MAP                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MONETIZATION (💰)                                                      │
│  ├── AdMob ────────── IAA revenue, eCPM, fill rate, waterfall          │
│  ├── QOn (Qonversion) ── IAP/Sub revenue, MRR, trials, churn, refunds │
│  └── Firebase ─────── IAP events (fallback), iap_purchase              │
│                                                                         │
│  USER BEHAVIOR (👥)                                                     │
│  ├── Firebase ─────── DAU, sessions, events, retention, onboarding     │
│  └── AppMetrica ───── Sessions, crashes, ANR, push, profiles (game)    │
│                                                                         │
│  ATTRIBUTION (📈)                                                       │
│  ├── Adjust ─────────  Installs by network/campaign, ROAS, cohort LTV │
│  ├── AppsFlyer ──────  af_status (organic/paid), install source        │
│  └── XMP ────────────  UA cost by channel (TikTok, Google, FB, Apple)  │
│                                                                         │
│  Ưu tiên chồng chéo:                                                   │
│  • Attribution: Adjust > AppsFlyer (af_*) > Firebase first_open        │
│  • IAP Revenue: QOn > Firebase iap_purchase > Gold fact_daily          │
│  • Engagement:  Firebase > AppMetrica (game supplement)                 │
│  • Crash/Perf:  AppMetrica > Firebase (app_exception)                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Insight Topics V1 — Dựa trên data thực có

| # | Topic | Severity Rules | Data Source | Khi nào sinh |
|---|-------|----------------|-------------|-------------|
| 1 | **Revenue Trend** | >+15% vs 7d = Positive; <-15% = Warning; <-25% = Critical | Gold fact_daily | Luôn |
| 2 | **Fill Rate Health** | <80% = Critical; 80-85% = Warning; >90% = Positive | Gold fact_daily | Luôn |
| 3 | **eCPM Trend** | >+10% vs 7d = Positive; <-10% = Warning | Gold fact_daily | Luôn |
| 4 | **Ad Source Concentration** | Top 1 source >60% = Warning; >70% = Critical | Bronze admob | Luôn |
| 5 | **Top Ad Units Performance** | Revenue shift >20% = Warning/Positive | Bronze admob | Luôn |
| 6 | **DAU/DAV Trend** | DAU <-10% vs 7d = Warning; >+10% = Positive | Bronze Firebase / AppMetrica | Khi gold NULL |
| 7 | **Ad Penetration** | DAV/DAU <60% = Tip; >80% = Positive | Bronze Firebase | Khi có DAU+DAV |
| 8 | **Session Quality** | Sessions/user <1.5 = Warning; >2.5 = Positive | Bronze Firebase / AppMetrica | Khi có data |
| 9 | **Retention D1/D7** | D1 <25% = Critical; D7 <10% = Warning | Bronze Firebase | Khi có data |
| 10 | **Onboarding Completion** | <50% = Warning; >70% = Positive | Bronze Firebase | Category creative_utility |
| 11 | **Core Loop (Drawing/Chat)** | KPI #1 rate <target = Warning | Bronze Firebase | Theo category |
| 12 | **UA ROI** | ROI <0.5 = Critical; <1.0 = Warning; >1.5 = Positive | Gold fact_daily | Khi có ua_cost |
| 13 | **UA Spend by Channel** | 1 channel >60% = Tip (diversification) | Bronze XMP | Khi có XMP |
| 14 | **Revenue vs UA Cost** | Revenue/cost < 0.2 = Critical | Gold + XMP | Khi có cả 2 |
| 15 | **Pipeline Health** | gold.daily_overview NULL = Critical data gap | System check | Luôn |
| 16 | **IAP Funnel** | Purchase rate trend, IAP shows→clicks→pays | Bronze Firebase | Khi có iap events |
| 17 | **Subscription Health (QOn)** | Trial conversion <10% = Warning; churn >8% = Critical; refund >5% = Critical | Bronze QOn | Khi có QOn data |
| 18 | **MRR & Revenue Mix** | MRR decline >10% = Warning; IAP/IAA ratio shift >15pp = Tip | QOn + AdMob | Khi có QOn data |
| 19 | **Crash & Stability** | Crash-free <99% = Critical; <99.5% = Warning; ANR spike = Warning | AppMetrica | Category game |
| 20 | **Attribution Quality** | Organic <30% = Warning; top campaign CPI >2x avg = Tip | Adjust / AppsFlyer | Khi có attribution data |

---

## 3. Prompt Architecture — 3 Layers

### Layer 1: Global AI Instructions (CHUNG cho tất cả apps)

```
[SYSTEM PROMPT — Layer 1: Global Instructions]

Bạn là AI App Health Analyst cho Amobear Nexus. Bạn nhận snapshot dữ liệu của 1 app và tạo insight cards.

=== OUTPUT FORMAT ===
Trả về JSON array gồm các insight cards. Mỗi card có cấu trúc:

{
  "overview": {
    "health_score": 0-100,
    "tier": "S|A|B|C|D|F",
    "summary": "3-4 câu tóm tắt. Highlight số liệu quan trọng.",
    "severity_counts": { "critical": N, "warning": N, "positive": N, "tip": N }
  },
  "insights": [
    {
      "topic": "tên chủ đề ngắn",
      "severity": "critical|warning|positive|tip",
      "headline": "Headline ngắn gọn có số liệu (kiểu QOn: 'Revenue Surges 47% Month-Over-Month')",
      "analysis": "Phân tích 3-6 câu. Phải có: (1) số liệu cụ thể T vs T-1, (2) so với 7d/14d avg, (3) nguyên nhân hoặc cross-reference dimension khác.",
      "action": "1-2 câu action cụ thể. Tag team: [Mediation] [UA] [Product] [DA] [Dev] [BOD].",
      "confidence": 0-100
    }
  ]
}

=== QUY TẮC SỐ LIỆU ===
- Revenue: $#,###.##
- eCPM: $#.##
- Tỉ lệ: #.#% (không hiển thị 0.788, phải ghi 78.8%)
- Tăng/giảm: +#.#% hoặc -#.#%, ghi rõ "từ X lên/xuống Y"
- Tiếng Việt, chuyên nghiệp, data-driven

=== QUY TẮC SEVERITY ===
- Critical: Chỉ khi metric vượt ngưỡng nguy hiểm CÓ THỂ ẢNH HƯỞNG DOANH THU NGAY
- Warning: Xu hướng xấu cần theo dõi, gần ngưỡng
- Positive: Cải thiện rõ rệt, nên bảo vệ/nhân rộng
- Tip: Cơ hội tối ưu, không khẩn cấp

=== HEADLINE RULES (tham khảo QOn) ===
- Phải có số liệu trong headline
- Phải có verb mạnh: "Surges", "Collapses", "Drops", "Slips", "Holds Steady"
- Format: "[Metric] [Verb] [Số] [Context]"
- Ví dụ: "Fill Rate Drops Below 85% Warning Threshold"
- Ví dụ: "Revenue Climbs 20.7% Above 7-Day Average"
- Ví dụ: "D1 Retention Holds Steady At 32.5%"

=== DATA SOURCE AWARENESS ===
- Mỗi insight ghi rõ data_source (gold/bronze/system)
- Bronze data: "⚠️ Dữ liệu từ raw data, có thể chênh lệch nhỏ"
- Nếu gold NULL nhưng bronze có: ghi gap + dùng bronze
- KHÔNG bịa số. Nếu không có data → không tạo card cho topic đó.

=== CROSS-REFERENCE ===
- Revenue tăng + DAU giảm → "Tăng trưởng nhờ ads intensity, không bền"
- DAU tăng + Revenue giảm → "User mới chưa monetize, check onboarding"
- Fill rate giảm + Revenue tăng → "Volume bù fill, fragile growth"
- D1 giảm + New users tăng → "UA quality kém"
- D7 giảm + D1 OK → "Core loop có vấn đề"

=== INSIGHT QUANTITY ===
- Tối thiểu: 5 cards (ngoài overview)
- Tối đa: 12 cards
- Ưu tiên: Critical > Warning > Positive > Tip
- Mỗi topic chỉ 1 card (không lặp)
```

### Layer 2: Category Context (viết 5-7 bộ)

#### 2a. Creative Utility (AR Tracer, Photo Editor...)

```
[LAYER 2: Category — Creative Utility]

CORE LOOP: Install → Onboard → Browse content → Create (draw/edit/capture) → Complete & Share → Return
MONETIZATION: IAA (rewarded + interstitial + banner + app open) + Subscription (trial→paid)

KPI #1: drawing_rate (drawing_users / DAU). Target: >40%
KPI TARGETS:
- d0_activation (new users tạo content D0): >25%
- completion_rate (draw start→finish): >50%
- D1 retention: >30%, D7: >12%
- Fill rate: >85%
- ad_penetration (DAV/DAU): >70%
- sessions_per_user: >2.0

INSIGHT PRIORITY cho category này:
1. Revenue & Fill Rate (kinh doanh chính)
2. Drawing Rate & D0 Activation (product health)
3. Retention D1/D7 (sustainability)
4. Onboarding Completion (new user quality)
5. UA ROI & Channel Mix (growth efficiency)

AD FORMAT MAPPING:
- ad_impression1 = rewarded
- ad_impression2 = interstitial
- ad_impression3 = banner
- ad_impression4 = native
- ad_impression_custom = app_open

SEVERITY OVERRIDES:
- drawing_rate <30% → Critical (core loop broken)
- d0_activation <15% → Warning
- Fill rate <80% → Critical (revenue at risk)
- 1 ad source >60% SoW → Warning concentration risk
```

#### 2b. AI Chat (Love AI, Chat Bot...)

```
[LAYER 2: Category — AI Chat]

CORE LOOP: Install → Select/Create Character → Chat → Send gifts → Unlock → Return
MONETIZATION: IAA + Subscription + IAP (virtual items)

KPI #1: chat_rate (users gửi message / DAU). Target: >50%
KPI TARGETS:
- msg_per_user: >5
- content_love_rate: >60%
- D1 retention: >25%, D7: >10%
- Fill rate: >85%
- sessions_per_user: >1.8

INSIGHT PRIORITY:
1. Revenue (IAA + IAP)
2. Chat Rate & Message Volume (engagement)
3. Retention D1/D7
4. UA ROI
5. Content quality (love vs skip)
```

#### 2c. Puzzle Game

```
[LAYER 2: Category — Puzzle Game]

CORE LOOP: Install → Tutorial → Play levels → Watch ad/buy boost → Progress → Return
MONETIZATION: IAP (coins, boosters, lives) + IAA (rewarded for extra life, interstitial between levels)

KPI #1: level_complete_rate. Target: >70%
KPI TARGETS:
- fail_rate_spike: <25% any level
- sessions_per_user: >2.5
- ad_reward_rate: >60%
- D1: >35%, D7: >15%

INSIGHT PRIORITY:
1. Product & Level Health (fail rate, progression)
2. Revenue (IAP + IAA mix)
3. Retention D1/D7
4. Booster usage & effectiveness
5. UA quality (D1 by campaign)
```

#### 2d. Generic (chưa classify)

```
[LAYER 2: Category — Generic]

CORE LOOP: Unknown — dùng data-driven approach
MONETIZATION: Detect từ events (IAA / IAP / subscription / mixed)

KPI #1: Auto-detect từ top events
KPI TARGETS:
- D1: >28%, D7: >12%
- Fill rate: >85%
- sessions_per_user: >1.5

INSIGHT PRIORITY:
1. Revenue trend
2. Engagement (DAU, sessions)
3. Retention
4. UA ROI (nếu có)
5. Ad infrastructure
```

### Layer 3: Auto-Generated App Context

```
[LAYER 3: App Context — Auto-generated bởi SnapshotBuilder]

APP: {app_name}
PLATFORM: {ios/android}
BUNDLE: {bundle_id}
FIREBASE_ID: {firebase_id}
CATEGORY: {category}

TOP 30 EVENTS (7 ngày):
{auto-query từ bronze.fb_<app_id> — event_name, count, unique_users}

AD FORMAT DETECTED:
{mapping từ event names → format labels}

CORE KPIs DETECTED:
{auto-classify từ top events → drawing_rate / chat_rate / level_complete etc.}

DATA AVAILABILITY:
- gold.daily_overview: {available/empty}
- gold.fact_daily_app_metrics: {available/empty}
- bronze.fb_*: {available/empty}
- bronze.xmp_report: {available/empty}
- bronze.adjust_report: {available/empty, adjust_id: found/missing}

DATA GAPS:
{list dimensions không có data → sẽ N/A}
```

---

## 4. Knowledge Base (KB) — Inject vào Prompt

### KB-1: Ngưỡng & Benchmark (chung cho tất cả apps)

```
[KB: Thresholds & Benchmarks]

REVENUE:
- Revenue tăng >15% vs 7d avg → Positive
- Revenue giảm >15% vs 7d avg → Warning
- Revenue giảm >25% vs 7d avg → Critical

FILL RATE:
- >90% → Excellent
- 85-90% → Good
- 80-85% → Warning threshold
- <80% → Critical

eCPM:
- Tăng >10% vs 7d → Positive
- Giảm >10% vs 7d → Warning
- Giảm >20% vs 7d → Critical (check network health)

AD CONCENTRATION:
- Top 1 source >70% SoW → Critical dependency
- Top 1 source >60% SoW → Warning
- Top 1 source <40% SoW → Good diversification

RETENTION:
- D1 >40% → Excellent
- D1 30-40% → Good
- D1 25-30% → Acceptable
- D1 <25% → Warning
- D1 <20% → Critical
- D7 >20% → Excellent
- D7 12-20% → Good
- D7 <10% → Warning

UA / ROI:
- ROI >1.5 → Positive (profitable per day)
- ROI 1.0-1.5 → Acceptable
- ROI 0.5-1.0 → Warning (cần LTV justify)
- ROI <0.5 → Critical (burning money)
- CPI spike >30% vs 7d → Warning [UA]

ENGAGEMENT:
- Sessions/user >2.5 → Positive
- Sessions/user 1.5-2.5 → Good
- Sessions/user <1.5 → Warning
- DAV/DAU >80% → Positive ad penetration
- DAV/DAU <60% → Tip (room for optimization)

DATA PIPELINE:
- gold.daily_overview empty → Critical data gap
- DAU/DAV = NULL in gold → Warning, use bronze fallback
- QOn data unavailable (app có subscription) → Warning data gap
- AppMetrica unavailable (game app) → Tip, use Firebase fallback

SUBSCRIPTION (QOn):
- Trial-to-paid >15% → Positive (excellent conversion)
- Trial-to-paid 10-15% → Good
- Trial-to-paid <10% → Warning
- Trial-to-paid <5% → Critical
- Cancellation rate giảm >10pp → Positive
- Cancellation rate >60% → Warning
- Monthly churn >8% → Critical
- Monthly churn 5-8% → Warning
- Refund rate >5% → Critical (app store risk)
- Refund rate 3-5% → Warning
- MRR tăng >10% → Positive
- MRR giảm >10% → Warning

APP STABILITY (AppMetrica):
- Crash-free >99.8% → Excellent
- Crash-free 99.5-99.8% → Good
- Crash-free 99-99.5% → Warning
- Crash-free <99% → Critical
- ANR rate >0.5% → Warning
- Crash rate spike sau update → Critical [Dev]

ATTRIBUTION (AppsFlyer / Adjust):
- Organic >40% → Healthy
- Organic 30-40% → Acceptable
- Organic <30% → Warning (paid dependency)
- Organic <20% → Critical (organic channel broken)
- D1 retention paid < D1 organic × 0.7 → Warning (UA quality)
```

### KB-2: Cross-Reference Rules

```
[KB: Cross-Reference Intelligence]

Khi phân tích, luôn kiểm tra các cross-signal sau:

SIGNAL 1: Revenue ↑ + Fill Rate ↓
→ Insight: "Revenue tăng nhờ volume/eCPM bù, nhưng fill giảm = fragile growth"
→ Action: [Mediation] rà soát fill rate by format, check waterfall health
→ Severity: Warning

SIGNAL 2: Revenue ↑ + DAU ↓
→ Insight: "Revenue tăng không phải từ user growth, có thể từ ads intensity"
→ Action: [Product] check ad load, user experience
→ Severity: Warning

SIGNAL 3: DAU ↑ + Revenue ↓
→ Insight: "User mới chưa tạo doanh thu, check monetization cho new users"
→ Action: [Product] review onboarding, ad trigger timing
→ Severity: Tip

SIGNAL 4: D1 ↓ + New Users ↑
→ Insight: "UA đang mang về low-quality users"
→ Action: [UA] review campaign targeting, check network quality
→ Severity: Warning

SIGNAL 5: D7 ↓ + D1 OK
→ Insight: "Onboarding OK nhưng core loop không giữ chân"
→ Action: [Product] review mid-term content, feature engagement
→ Severity: Warning

SIGNAL 6: Revenue ↑ + Impressions ↑ + eCPM ↓
→ Insight: "Volume-driven growth, eCPM dilution"
→ Action: [Mediation] review floor prices, check low-value inventory
→ Severity: Tip

SIGNAL 7: UA Cost >> Revenue (ROI <0.5)
→ Insight: "App đang đốt tiền, UA chưa tự hoàn vốn"
→ Action: [BOD] [UA] siết budget hoặc cần LTV data justify
→ Severity: Critical

SIGNAL 8: gold.daily_overview empty + bronze có data
→ Insight: "Pipeline gap — báo cáo dùng bronze fallback"
→ Action: [DA] [Dev] fix pipeline, ưu tiên khôi phục gold
→ Severity: Critical (data health)

SIGNAL 9: Trial conversion ↓ + New trials ↑ (QOn)
→ Insight: "Funnel burning faster — trials tăng nhưng convert kém hơn"
→ Action: [Product] review trial experience, paywall copy, trial duration
→ Severity: Warning

SIGNAL 10: Refund rate ↑ + Revenue ↑ (QOn)
→ Insight: "Revenue tăng nhưng refund dilute — net revenue growth thấp hơn gross"
→ Action: [Product] investigate refund reasons, check specific plans/channels
→ Severity: Warning

SIGNAL 11: Cancellation ↓ + New subscriptions ↑ (QOn)
→ Insight: "Subscriber base expanding and stabilizing — strong retention signal"
→ Action: [Marketing] audit what changed, formalize as permanent
→ Severity: Positive

SIGNAL 12: Crash rate spike + Version mới (AppMetrica)
→ Insight: "Version X gây crash regression — D1 retention có thể bị ảnh hưởng"
→ Action: [Dev] hotfix priority, consider rollback nếu crash-free <99%
→ Severity: Critical

SIGNAL 13: Organic ratio ↓ + UA cost ↑ (AppsFlyer + XMP)
→ Insight: "Phụ thuộc paid tăng, organic channel đang yếu"
→ Action: [Marketing] review ASO, content marketing; [UA] check creative fatigue
→ Severity: Warning

SIGNAL 14: D1 paid << D1 organic (AppsFlyer × Firebase retention)
→ Insight: "UA đang mang về low-quality users so với organic"
→ Action: [UA] review targeting, check network quality; flag specific campaigns
→ Severity: Warning
```

### KB-3: Headline Templates (tham khảo QOn style)

```
[KB: Headline Generation Templates]

FORMAT: "[Topic Noun] [Strong Verb] [Number/Percent] [Context]"

POSITIVE VERBS: Surges, Climbs, Jumps, Soars, Hits, Reaches, Breaks Through
WARNING VERBS: Slips, Drops, Declines, Falls, Dips Below, Crosses Warning Threshold
CRITICAL VERBS: Collapses, Plummets, Crashes Below, Still Critical At
NEUTRAL VERBS: Holds Steady, Stabilizes, Flattens, Remains At
TIP VERBS: Below Benchmark, Room For Improvement, Opportunity At

EXAMPLES (tuỳ severity):
- "Revenue Surges 20.7% Above 7-Day Average" (Positive)
- "Fill Rate Drops Below 85% Warning Threshold" (Warning)
- "Fill Rate Still Critical At 80.9%" (Critical)
- "D1 Retention Holds Steady At 32.5%" (Positive)
- "Active Trials Collapse 41% Despite More Starts" (Warning — QOn reference)
- "Cancellations Drop Dramatically By 25%" (Positive — QOn reference)
- "User-To-Paid Conversion Below Benchmark" (Tip — QOn reference)
- "UA ROI Climbs To 18.3% But Still Below Break-Even" (Warning)
- "AdMob Concentration Risk: 38% Revenue From Single Source" (Tip)
- "Pipeline Gap: gold.daily_overview Empty For 14 Days" (Critical)
```

---

## 5. Metrics Catalog — Chi tiết cho V1

### 5.1 Revenue & Monetization Metrics

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `revenue_t` | Revenue Today | Tổng revenue ngày T | gold.fact_daily_app_metrics | So sánh T vs T-1 |
| `revenue_t1` | Revenue Yesterday | Tổng revenue ngày T-1 | gold.fact_daily_app_metrics | Baseline |
| `revenue_7d_avg` | 7-Day Avg Revenue | AVG(revenue) 7 ngày | gold.fact_daily_app_metrics | Trend context |
| `revenue_14d_avg` | 14-Day Avg Revenue | AVG(revenue) 14 ngày | gold.fact_daily_app_metrics | Longer trend |
| `revenue_dod_pct` | Revenue DoD% | (T - T1) / T1 × 100 | Derived | Headline |
| `revenue_vs_7d_pct` | Revenue vs 7d% | (T - 7d_avg) / 7d_avg × 100 | Derived | Severity |
| `ecpm_t` | eCPM Today | Revenue / impressions × 1000 | gold.fact_daily_app_metrics | Quality signal |
| `ecpm_7d_avg` | 7-Day Avg eCPM | AVG(eCPM) 7 ngày | gold.fact_daily_app_metrics | Trend |
| `fill_rate_t` | Fill Rate Today | Matched / requests | gold.fact_daily_app_metrics | Health check |
| `impressions_t` | Impressions Today | Tổng impressions | gold.fact_daily_app_metrics | Volume |

### 5.2 Ad Infrastructure Metrics

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `top_ad_sources` | Top Ad Sources | Revenue by ad_source | bronze.admob_table | Concentration |
| `top_source_pct` | Top Source SoW% | Max source rev / total × 100 | bronze.admob_table | Risk |
| `top_ad_units` | Top Ad Units | Revenue by ad_unit | bronze.admob_table | Performance |
| `ad_format_rev` | Revenue by Format | Revenue by ad_impression type | bronze.fb_* | Mix analysis |

### 5.3 Engagement & Retention Metrics

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `dau` | Daily Active Users | COUNT(DISTINCT user) session_start/engagement | bronze.fb_* | Core metric |
| `dav` | Daily Ad Viewers | COUNT(DISTINCT user) ad_impression | bronze.fb_* | Monetization reach |
| `new_users` | New Users | COUNT(DISTINCT user) first_open | bronze.fb_* | Growth signal |
| `sessions` | Total Sessions | Unique user+session_id combos | bronze.fb_* | Depth |
| `sessions_per_user` | Sessions/User | sessions / DAU | Derived | Engagement quality |
| `ad_penetration` | Ad Penetration% | DAV / DAU × 100 | Derived | Monetization efficiency |
| `retention_d1` | D1 Retention% | D1 active / D0 installs × 100 | bronze.fb_* | Quality signal |
| `retention_d7` | D7 Retention% | D7 active / D0 installs × 100 | bronze.fb_* | Sustainability |
| `paying_users` | Paying Users | COUNT(DISTINCT user) in_app_purchase | bronze.fb_* | IAP health |

### 5.4 Product & Content Metrics (category-specific)

| Metric | Tên hiển thị | Category | Công thức | Source |
|--------|-------------|----------|-----------|--------|
| `drawing_users` | Drawing Users | creative_utility | Users có draw events | bronze.fb_* |
| `drawing_rate` | Drawing Rate% | creative_utility | drawing_users / DAU × 100 | Derived |
| `completion_rate` | Completion Rate% | creative_utility | completions / starts × 100 | bronze.fb_* |
| `d0_activation` | D0 Activation% | creative_utility | D0 drawers / installs × 100 | bronze.fb_* |
| `onboarding_completion` | Onboarding Complete% | creative_utility | step8 / step1 × 100 | bronze.fb_* |
| `chat_rate` | Chat Rate% | ai_chat | chat_users / DAU × 100 | Derived |
| `msg_per_user` | Messages/User | ai_chat | total_msg / chat_users | Derived |

### 5.5 Growth & Acquisition Metrics

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `ua_cost_t` | UA Cost Today | Tổng cost ngày T | gold.fact_daily_app_metrics | Budget |
| `roi_t` | ROI Today | Revenue / ua_cost | Derived | Efficiency |
| `spend_by_channel` | Spend by Channel | Cost group by module | bronze.xmp_report | Channel mix |
| `installs_by_network` | Installs by Network | Installs group by network | bronze.adjust_report | Attribution |
| `organic_paid_ratio` | Organic/Paid Ratio | Organic / Total installs | bronze.adjust_report | Quality |
| `cpi_by_channel` | CPI by Channel | Cost / installs by channel | XMP + Adjust | Efficiency |

### 5.6 Attribution Metrics (AppsFlyer + Adjust)

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `af_organic_pct` | Organic % (AppsFlyer) | COUNT(af_status='Organic') / total | Firebase user_properties ($.af_status) | Organic health |
| `af_paid_pct` | Paid % (AppsFlyer) | COUNT(af_status='Non-organic') / total | Firebase user_properties ($.af_status) | Paid dependency |
| `af_d1_by_source` | D1 Retention by Source | D1 users / installs per attribution | Firebase bronze cross-query | UA quality check |
| `adjust_installs_network` | Installs by Network | Installs group by network | bronze.adjust_report | Campaign attribution |
| `adjust_campaign_roas` | Campaign ROAS | Revenue / cost per campaign | bronze.adjust_report | Campaign efficiency |

> **Ưu tiên nguồn attribution:** Nếu app có cả Adjust và AppsFlyer, ưu tiên Adjust (chi tiết campaign/network). AppsFlyer (af_status) là fallback rộng hơn vì hầu hết apps đều có qua Firebase SDK.

### 5.7 Subscription Metrics (QOn / Qonversion)

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `mrr` | Monthly Recurring Revenue | Sum active subscription revenue | QOn bronze | Business health |
| `mrr_growth_pct` | MRR Growth% | (MRR_t - MRR_t1) / MRR_t1 × 100 | QOn derived | Trend |
| `new_trials` | New Trials | Count trial starts | QOn bronze | Funnel top |
| `active_trials` | Active Trials | Count trials in progress | QOn bronze | Funnel middle |
| `trial_to_paid_rate` | Trial→Paid Rate% | Conversions / trials × 100 | QOn derived | Conversion quality |
| `new_subscriptions` | New Subscriptions | Count new paid subs | QOn bronze | Growth |
| `cancellation_rate` | Cancellation Rate% | Cancels / active subs × 100 | QOn derived | Churn signal |
| `churn_rate_monthly` | Monthly Churn% | Churned / start-of-month active × 100 | QOn derived | Sustainability |
| `refund_rate` | Refund Rate% | Refunds / total transactions × 100 | QOn derived | App store risk |
| `refund_dollars` | Refund Dollars | Total refund amount USD | QOn bronze | Revenue impact |
| `arpu_subscriber` | ARPU Subscriber | Revenue / active subscribers | QOn derived | Value per sub |

> **QOn đang tích hợp:** Schema exact sẽ confirm khi pipeline hoàn thành. Các metrics trên là reference từ QOn dashboard (ảnh tham khảo). Firebase iap_* events vẫn là fallback nếu QOn chưa sẵn sàng.

### 5.8 App Stability Metrics (AppMetrica)

| Metric | Tên hiển thị | Công thức | Source | Cách dùng |
|--------|-------------|-----------|--------|-----------|
| `crash_free_rate` | Crash-Free Rate% | (1 - crashes/sessions) × 100 | AppMetrica | Stability |
| `crash_rate_by_version` | Crash Rate by Version | Crashes per version | AppMetrica | Regression detect |
| `anr_rate` | ANR Rate% | ANR count / sessions × 100 | AppMetrica | Performance |
| `top_crash_reasons` | Top Crash Reasons | Most frequent crash traces | AppMetrica | Debug priority |
| `crash_users_pct` | Crash Users% | Users with crash / DAU × 100 | AppMetrica / Firebase | User impact |

> **AppMetrica chuyên game:** Dùng cho game apps (puzzle_game, casual_game). Cho crash/ANR data chi tiết hơn Firebase app_exception. Nếu không có AppMetrica → fallback Firebase app_exception event.

### 5.9 System Health Metrics

| Metric | Tên hiển thị | Công thức | Cách dùng |
|--------|-------------|-----------|-----------|
| `gold_daily_overview_status` | Gold Pipeline Status | Check rows exist | Data completeness |
| `gold_fact_daily_status` | Gold Metrics Status | Check NULL columns | Data completeness |
| `bronze_fb_status` | Firebase Bronze Status | Check row count | Fallback available |
| `data_gaps` | Data Gaps List | List missing sources | Transparency |

---

## 6. Snapshot Data Structure (input cho AI)

### 6.1 Snapshot JSON Schema V1

```json
{
  "app": {
    "name": "AR Tracer: Trace Drawing",
    "platform": "ios",
    "bundle_id": "com.avntech.ar-drawing",
    "firebase_id": "ar_tracer_trace_drawing_ios",
    "category": "creative_utility"
  },
  "date": "2026-04-07",
  "schemaVersion": 1,

  "revenue": {
    "dataSource": "gold",
    "revenue_t": 1369.65,
    "revenue_t1": 1278.78,
    "revenue_7d_avg": 1134.68,
    "revenue_14d_avg": 1005.70,
    "revenue_14d_trend": [688.91, 717.20, ..., 1369.65],
    "ecpm_t": 3.83,
    "ecpm_t1": 3.76,
    "fill_rate_t": 0.809,
    "fill_rate_t1": 0.894,
    "impressions_t": 381344,
    "impressions_t1": 368139
  },

  "adInfrastructure": {
    "dataSource": "bronze",
    "top_ad_sources": [
      {"name": "AdMob Network Waterfall", "revenue": 5620.19},
      {"name": "AdMob Network", "revenue": 4494.25},
      {"name": "Unity Ads (bidding)", "revenue": 1338.06},
      {"name": "Liftoff Monetize (bidding)", "revenue": 864.32},
      {"name": "AppLovin (bidding)", "revenue": 656.60}
    ],
    "top_ad_units": [
      {"name": "V4_ArDrawingOS_InApp_Inter", "revenue": 6355.89},
      {"name": "V4_ArDrawingOS_InApp_Reward", "revenue": 2109.51},
      {"name": "V4_ArDrawingOS_InApp_Banner1", "revenue": 1231.63}
    ]
  },

  "engagement": {
    "dataSource": "bronze|gold|null",
    "dau_14d": [null, null, ...],
    "dav_14d": [null, null, ...],
    "new_users_14d": [null, null, ...],
    "sessions_14d": [null, null, ...]
  },

  "retention": {
    "dataSource": "bronze|null",
    "cohorts": [
      {"install_date": "2026-03-20", "d0": 500, "d1": 160, "d7": 55}
    ]
  },

  "product": {
    "dataSource": "bronze|null",
    "drawing_14d": [{"date": "...", "drawing_users": N, "completions": N}],
    "onboarding_14d": [{"date": "...", "step1": N, ..., "step8": N}],
    "d0_activation_14d": [{"date": "...", "installs": N, "d0_drawers": N}]
  },

  "growth": {
    "dataSource": "gold+bronze",
    "ua_cost_t": 7494.27,
    "ua_cost_t1": 13543.69,
    "roi_t": 0.183,
    "roi_t1": 0.094,
    "spend_by_channel": [
      {"module": "tiktok", "cost": 71178.23},
      {"module": "apple", "cost": 39595.81},
      {"module": "google", "cost": 22552.90},
      {"module": "facebook", "cost": 6772.05}
    ],
    "adjust_available": false,
    "adjust_gap": "adjust_id not found in dim_app_identifiers"
  },

  "attribution": {
    "dataSource": "appsflyer_via_firebase|adjust|null",
    "primary_source": "appsflyer",
    "organic_paid_ratio": {"organic": 0.45, "paid": 0.55},
    "top_networks": [
      {"network": "TikTok", "installs": 5200, "pct": 28.5},
      {"network": "Apple Search Ads", "installs": 3800, "pct": 20.8}
    ],
    "appsflyer_af_status": {"Organic": 8200, "Non-organic": 10050}
  },

  "subscription": {
    "dataSource": "qon|firebase|null",
    "qon_available": true,
    "mrr_t": 12500.00,
    "mrr_t1": 12100.00,
    "active_trials_t": 1225,
    "new_trials_t": 350,
    "trial_to_paid_rate": 17.46,
    "trial_to_paid_rate_t1": 19.74,
    "cancellation_rate_t": 47.74,
    "cancellation_rate_t1": 63.89,
    "refund_rate_t": 5.55,
    "refund_dollars_t": 17305,
    "new_subscriptions_t": 3573,
    "churn_rate_monthly": 6.2,
    "arpu_subscriber": 55.12
  },

  "appStability": {
    "dataSource": "appmetrica|null",
    "appmetrica_available": true,
    "crash_free_rate_t": 99.3,
    "crash_free_rate_t1": 99.7,
    "anr_rate_t": 0.12,
    "crashes_by_version": [
      {"version": "3.2.1", "crash_rate": 0.7},
      {"version": "3.2.0", "crash_rate": 0.3}
    ],
    "top_crash_reasons": ["NullPointerException in LevelManager", "OOM in AdLoader"]
  },

  "systemHealth": {
    "gold_daily_overview": "empty",
    "gold_fact_daily_app_metrics": "available",
    "bronze_firebase": "available",
    "bronze_xmp": "available",
    "bronze_adjust": "unavailable_no_mapping",
    "bronze_appmetrica": "available",
    "bronze_qon": "available",
    "appsflyer_via_firebase": "available",
    "data_gaps": [
      "gold.daily_overview empty → DAU/ARPDAU from gold unavailable",
      "adjust_id missing → no campaign-level attribution from Adjust (using AppsFlyer instead)"
    ]
  }
}
```

---

## 7. Section Instructions (cho từng insight topic)

### Section: Overview Card

```
Tạo overview card với:
- Health score 0-100, tier S/A/B/C/D/F
- Score = weighted average CÓ DATA dimensions. Null → bỏ qua.
- Weights theo category context (Layer 2)
- Summary 3-4 câu: (1) headline KPI #1, (2) điểm mạnh nhất, (3) rủi ro/điểm yếu, (4) action ưu tiên nhất
- Đếm severity: critical/warning/positive/tip
```

### Section: Revenue & Monetization

```
Tạo 1-3 insight cards cho revenue:
Card 1 (luôn tạo): Revenue trend — T vs T-1, vs 7d, vs 14d. Severity theo ngưỡng KB-1.
Card 2 (nếu fill rate có data): Fill rate health. Critical nếu <80%, warning nếu <85%.
Card 3 (nếu có cross-signal): Revenue + fill mâu thuẫn → card cross-reference.

Headline phải có số. Ví dụ: "Revenue Climbs $1,369.65, +20.7% vs Weekly Average"
Analysis: tách IAA vs IAP nếu có. Ghi rõ impressions trend, eCPM trend.
```

### Section: Ad Infrastructure

```
Tạo 1-2 insight cards:
Card 1: SoW concentration — top source %, cảnh báo nếu >60%.
Card 2 (nếu dữ liệu đủ): Top ad units performance shift.

Phải ghi tên cụ thể ad source và revenue. Ví dụ: "AdMob Network Waterfall chiếm 38.3%"
```

### Section: Engagement & Retention

```
Tạo 1-3 insight cards (chỉ khi có data):
Card 1: DAU/DAV trend (nếu có)
Card 2: Retention D1/D7 (nếu có cohort data)
Card 3: Session quality (sessions/user)

Nếu gold NULL → dùng bronze + ghi "⚠️ Bronze fallback"
Nếu bronze cũng NULL → KHÔNG tạo card, chỉ ghi trong data_gaps
```

### Section: Product & Content

```
Tạo 1-2 insight cards (theo category):
- creative_utility: drawing_rate, d0_activation, onboarding completion
- ai_chat: chat_rate, msg_per_user
- puzzle_game: level health, fail rate
- generic: top events trend

Nếu không đủ data → ghi tip "tracking có raw data nhưng chưa chuẩn hoá"
```

### Section: Growth & Acquisition

```
Tạo 1-2 insight cards:
Card 1: ROI trend — T vs T-1, severity theo ngưỡng
Card 2: Spend by channel (nếu XMP có)

Nếu thiếu Adjust → ghi rõ "không có campaign-level ROAS"
Nếu thiếu XMP → ghi rõ "cost từ gold, không tách channel"
```

### Section: Data Pipeline Health

```
Tạo 1 card nếu có data gap critical:
- gold.daily_overview empty → Critical
- adjust_id missing → Warning
- qon data unavailable → Tip (nếu app có subscription)
- appmetrica unavailable → Tip (nếu app là game)
- Bất kỳ dimension N/A vì thiếu data → ghi cụ thể

Action: [DA] [Dev] với steps cụ thể để fix
```

### Section: Subscription Health (QOn)

```
Tạo 1-3 insight cards (CHỈ khi QOn data available):

Card 1: Trial-to-Paid Conversion
- So sánh trial_to_paid_rate T vs T-1
- Nếu giảm >2pp → Warning "Trial Conversion Rate Slipping"
- Nếu <10% → Critical
- Cross-ref: nếu new_trials tăng mà conversion giảm → "Funnel burning faster"
- Action: [Product] review trial experience, paywall messaging

Card 2: Cancellation & Churn
- cancellation_rate trend, churn_rate_monthly
- Nếu cancellation giảm mạnh → Positive "Cancellations Drop Dramatically"
- Nếu churn >8% → Critical
- Action: [Product] implement pause/downgrade alternatives

Card 3: Refund Rate
- refund_rate_t, refund_dollars_t
- Nếu >5% → Critical "Refund Rate Still Critical"
- Nếu giảm nhưng vẫn >5% → Warning
- Cross-ref: refund tăng + revenue tăng → "Dilution effect"
- Action: [Product] investigate refund reasons, check app store standing

MRR insight (khi có): MRR trend, ARPU subscriber
Headline style QOn: "Revenue Surges 47% Month-Over-Month" hoặc "Refund Rate Still Critical At 5.55%"
```

### Section: App Stability (AppMetrica)

```
Tạo 1-2 insight cards (CHỈ khi AppMetrica data available, ưu tiên game):

Card 1: Crash & Stability
- crash_free_rate T vs T-1
- Nếu <99% → Critical "Crash Rate Spikes After Update"
- Nếu <99.5% → Warning
- Nếu >99.8% → Positive
- Cross-ref: crash spike + version mới → "Version X gây regression"
- Include top crash reasons nếu có
- Action: [Dev] check crash logs, consider hotfix/rollback

Card 2 (nếu có ANR data): ANR Rate
- anr_rate trend
- Action: [Dev] review main thread blocking operations

Lưu ý: Đây là dimension Product & Content enhancement. 
Chỉ tạo khi category = game hoặc khi crash_free <99.5%.
```

### Section: Attribution & Organic/Paid (AppsFlyer + Adjust)

```
Tạo 1-2 insight cards (khi có attribution data):

Card 1: Organic vs Paid Ratio
- Source: AppsFlyer af_status (từ Firebase user_properties) hoặc Adjust network
- Ưu tiên: Adjust (chi tiết hơn) > AppsFlyer (rộng hơn)
- Organic >40% → Positive
- Organic <30% → Warning "Paid Dependency Risk"
- Trend: organic ratio đang tăng/giảm
- Action: [Marketing] review ASO, content marketing nếu organic giảm

Card 2 (nếu có Adjust campaign data): Campaign Quality
- Flag campaigns với CPI >2x average
- Flag campaigns với D1 retention <50% of avg
- Action: [UA] pause underperforming campaigns

AppsFlyer query (từ Firebase bronze):
  get_json_string(user_properties_json, '$.af_status') → 'Organic' | 'Non-organic'
  get_json_string(user_properties_json, '$.af_message') → install details

Ghi rõ source: "Attribution từ AppsFlyer (qua Firebase)" hoặc "Attribution từ Adjust"
```

---

## 8. Queries cần thiết cho Snapshot Builder

### 8.1 Gold Layer Queries (luôn chạy trước)

```sql
-- Q1: Revenue, eCPM, Fill Rate, UA Cost (14 ngày)
SELECT 
  report_date, estimated_revenue, ecpm, fill_rate,
  impressions, matched_requests, ua_cost, roi
FROM gold.fact_daily_app_metrics
WHERE app_id = '{app_id}'
  AND report_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY report_date;

-- Q2: Daily Overview (DAU, sessions — check empty)
SELECT *
FROM gold.daily_overview
WHERE app_id = '{app_id}'
  AND event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY event_date;
```

### 8.2 AdMob Bronze Queries (luôn chạy)

```sql
-- Q3: Revenue by ad source (14 ngày window)
SELECT 
  ad_source_name, SUM(estimated_earnings) AS revenue
FROM bronze.admob_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = '{firebase_id}'
  AND a.date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY ad_source_name
ORDER BY revenue DESC LIMIT 10;

-- Q4: Revenue by ad unit (14 ngày window)
SELECT 
  ad_unit_name, SUM(estimated_earnings) AS revenue
FROM bronze.admob_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = '{firebase_id}'
  AND a.date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY ad_unit_name
ORDER BY revenue DESC LIMIT 5;
```

### 8.3 Firebase Bronze Fallback (chạy khi gold NULL)

```sql
-- Q5: DAU/DAV/Sessions (doc 06, Query 1)
-- Q6: Retention D1/D7 (doc 06, Query 2)
-- Q7: Drawing/Content metrics (doc 06, Query 3) — category creative_utility
-- Q8: Onboarding funnel (doc 06, Query 4) — category creative_utility
-- Q9: IAP funnel (doc 06, Query 5)
-- Q10: D0 Activation (doc 06, Query 7) — category creative_utility
-- Q11: Ad by Format (doc 06, Query 8)
-- Q12: Top Events (doc 06, Query 6) — luôn chạy
```

### 8.4 XMP & Adjust & AppsFlyer Bronze (luôn chạy nếu có data)

```sql
-- Q13: UA cost by channel (doc 06, Query 10)
-- Q14: Adjust installs by network (doc 06, Query 9)
-- Q15: CPI cross-source (doc 06, derived CPI query)
```

### 8.5 AppsFlyer Attribution (từ Firebase user_properties)

```sql
-- Q16: Organic vs Paid (AppsFlyer af_status qua Firebase)
-- Luôn chạy — af_status có trong hầu hết apps dùng AppsFlyer SDK
SELECT
    COALESCE(get_json_string(user_properties_json, '$.af_status'), 'Unknown') AS attribution,
    COALESCE(get_json_string(user_properties_json, '$.af_message'), 'Unknown') AS install_detail,
    COUNT(DISTINCT user_pseudo_id) AS installs,
    ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0
        / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 1) AS pct
FROM bronze.fb_{app_id}
WHERE event_name = 'first_open'
  AND event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY attribution, install_detail
ORDER BY installs DESC;

-- Q17: AppsFlyer Attribution × Retention Quality
-- Cross-check: organic users có D1 retention tốt hơn paid không?
WITH src AS (
    SELECT
        COALESCE(get_json_string(user_properties_json, '$.af_status'), 'Unknown') AS attr,
        user_pseudo_id, install_date
    FROM bronze.fb_{app_id}
    WHERE event_name = 'first_open'
      AND event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
)
SELECT s.attr,
    COUNT(DISTINCT s.user_pseudo_id) AS installs,
    COUNT(DISTINCT CASE WHEN b.retention_day = 1 THEN b.user_pseudo_id END) AS d1_ret,
    ROUND(COUNT(DISTINCT CASE WHEN b.retention_day = 1 THEN b.user_pseudo_id END)
        * 100.0 / NULLIF(COUNT(DISTINCT s.user_pseudo_id), 0), 1) AS d1_rate
FROM src s
LEFT JOIN bronze.fb_{app_id} b
    ON s.user_pseudo_id = b.user_pseudo_id
    AND b.event_name IN ('session_start','user_engagement')
    AND b.retention_day = 1
    AND b.event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY s.attr
HAVING installs >= 20
ORDER BY installs DESC;
```

### 8.6 QOn (Qonversion) — Subscription Metrics (chạy khi QOn available)

```sql
-- Q18: Subscription overview (trials, conversions, cancellations, refunds)
-- Lưu ý: Schema QOn đang tích hợp, queries dưới đây là reference.
-- Cần confirm exact table/column names khi pipeline hoàn thành.

-- Option A: Nếu QOn data được sync vào StarRocks bronze.qon_*
SELECT
    `date`,
    SUM(new_trials) AS new_trials,
    SUM(active_trials) AS active_trials,
    SUM(conversions) AS trial_conversions,
    SUM(new_subscriptions) AS new_subscriptions,
    SUM(cancellations) AS cancellations,
    SUM(refunds) AS refunds,
    SUM(refund_amount) AS refund_dollars,
    SUM(mrr) AS mrr,
    ROUND(SUM(conversions) * 100.0 / NULLIF(SUM(new_trials), 0), 2) AS trial_to_paid_rate,
    ROUND(SUM(cancellations) * 100.0 / NULLIF(SUM(active_subscriptions), 0), 2) AS cancel_rate,
    ROUND(SUM(refunds) * 100.0 / NULLIF(SUM(total_transactions), 0), 2) AS refund_rate
FROM bronze.qon_subscription_metrics
WHERE app_id = '{app_id}'
  AND `date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY `date`
ORDER BY `date`;

-- Option B: Nếu QOn data qua Firebase events (qon_* events)
-- App AR Tracer đã có events: qon_trial_started, qon_subscription_created, etc.
SELECT
    event_date,
    SUM(CASE WHEN event_name LIKE 'qon_trial%' THEN 1 ELSE 0 END) AS qon_trial_events,
    SUM(CASE WHEN event_name LIKE 'qon_subscription%' THEN 1 ELSE 0 END) AS qon_sub_events,
    SUM(CASE WHEN event_name LIKE 'qon_revenue%' THEN 1 ELSE 0 END) AS qon_revenue_events
FROM bronze.fb_{app_id}
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
  AND event_name LIKE 'qon_%'
GROUP BY event_date
ORDER BY event_date;
```

### 8.7 AppMetrica — Crash & Stability (chạy cho game apps)

```sql
-- Q19: Crash rate by version (AppMetrica)
-- Lưu ý: Exact schema phụ thuộc cách AppMetrica sync vào StarRocks
-- Dưới đây là reference query, cần adjust theo actual DDL

-- Option A: Nếu AppMetrica có bảng riêng
SELECT
    stat_date,
    app_version,
    SUM(sessions) AS sessions,
    SUM(crashes) AS crashes,
    ROUND((1 - SUM(crashes) * 1.0 / NULLIF(SUM(sessions), 0)) * 100, 2) AS crash_free_rate,
    SUM(anr_count) AS anr_count
FROM bronze.appmetrica_crashes
WHERE app_id = '{appmetrica_app_id}'
  AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY stat_date, app_version
ORDER BY stat_date, crashes DESC;

-- Option B: Nếu crash data trong Firebase
SELECT
    event_date,
    app_version,
    COUNT(CASE WHEN event_name = 'app_exception' THEN 1 END) AS crash_events,
    COUNT(DISTINCT CASE WHEN event_name = 'session_start' THEN user_pseudo_id END) AS session_users,
    COUNT(DISTINCT CASE WHEN event_name = 'app_exception' THEN user_pseudo_id END) AS crash_users,
    ROUND((1 - COUNT(DISTINCT CASE WHEN event_name = 'app_exception' THEN user_pseudo_id END) * 1.0
        / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'session_start' THEN user_pseudo_id END), 0))
        * 100, 2) AS crash_free_user_rate
FROM bronze.fb_{app_id}
WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND event_name IN ('app_exception', 'session_start')
GROUP BY event_date, app_version
ORDER BY event_date;
```

---

## 9. So sánh: Agentic hiện tại vs V1 mới

| Khía cạnh | Agentic hiện tại (AR_Agentic_Claude.md) | V1 mới (tài liệu này) |
|-----------|----------------------------------------|------------------------|
| **Output format** | Markdown dài, 8 dimension sections | JSON → Card-based UI (kiểu QOn) |
| **Dimensions** | 8 dimensions, 6/8 N/A | Chỉ tạo cards cho data CÓ SẴN |
| **Data sources** | 5 (AdMob, Firebase, XMP, Adjust, Gold) | **8 sources** (+AppMetrica, +QOn, +AppsFlyer) |
| **Severity** | Bảng text trong section cuối | Mỗi card có severity badge trực quan |
| **Headline** | Mô tả dài | Short headline có số liệu (QOn style) |
| **Action** | Bảng 8 actions cuối report | Mỗi card có action riêng, rõ team tag |
| **Subscription** | N/A (chỉ Firebase iap events) | **QOn: MRR, trial conversion, churn, refunds** |
| **Crash/Stability** | N/A | **AppMetrica: crash-free rate, ANR, version regression** |
| **Attribution** | Chỉ total ROI từ gold | **AppsFlyer organic/paid + Adjust campaign-level** |
| **Data gaps** | List cuối report | 1 card "Pipeline Health" + ghi source mỗi card |
| **Cross-reference** | Trong analysis text | **14 cross-signal rules** (incl. QOn + AppMetrica signals) |
| **Scalability** | 1 prompt per app | 3-layer: Global + Category + Auto-context |
| **Mermaid charts** | Trong Markdown | Tách biệt — card text + optional chart data |
| **Insight topics** | 8 dimensions (fixed) | **20 topics** (dynamic, chỉ sinh khi có data) |

---

## 10. Implementation Checklist

### Phase 1: Core (tuần 1-2)

- [ ] Viết Layer 1 Global Instructions (section 3) → lưu Template
- [ ] Viết 4 Category Contexts: creative_utility, ai_chat, puzzle_game, generic
- [ ] Implement SnapshotBuilder V1: Gold queries → null check → Bronze fallback
- [ ] Implement KB injection: thresholds, cross-reference rules, headline templates
- [ ] Implement AppsFlyer attribution query (Q16-Q17) — đã có trong Firebase user_properties
- [ ] Test: AR Tracer snapshot → AI → verify 5+ insight cards

### Phase 2: Expand + New Sources (tuần 3-4)

- [ ] Thêm 3 Category Contexts: casual_game, video_media, ai_utility
- [ ] Implement Auto Context Generator (Layer 3): top events, ad format detect
- [ ] **QOn integration:** Confirm schema bronze.qon_*, implement Q18 subscription queries
- [ ] **QOn insight cards:** Subscription Health, MRR, Trial Conversion, Refund Rate
- [ ] **AppMetrica integration:** Confirm schema bronze.appmetrica_*, implement Q19 crash queries
- [ ] **AppMetrica insight cards:** Crash & Stability (ưu tiên game category)
- [ ] Severity auto-classification engine
- [ ] Test: Love AI + 3 apps khác → verify output quality

### Phase 3: Production (tuần 5-6)

- [ ] Assign category cho top 50 apps
- [ ] Map data source availability per app: Firebase ✅, AdMob ✅, XMP ?, Adjust ?, AppMetrica ?, QOn ?
- [ ] Batch run: verify coverage, data gaps, insight card count per source
- [ ] UI: Card renderer từ JSON output
- [ ] Monitoring: % cards có data, avg cards/app, severity distribution, source coverage %
- [ ] Feedback loop: DA review → adjust thresholds
- [ ] QOn pipeline validation: so sánh QOn revenue vs Firebase IAP revenue → reconciliation

---

## 11. Amobear Nexus Widget Mapping

File `Widget__Variable__Metric.xlsx` định nghĩa 60+ widgets trên Nexus. Các metrics trong App Insight V1 map trực tiếp:

| Insight Topic | Nexus Dashboard | Nexus Widget | Metrics dùng chung |
|---------------|----------------|-------------|---------------------|
| Revenue Trend | Overview | Daily Users & Revenue | total_rev, IAP_rev, IAA_rev, new_users, active_users |
| Engagement | Overview | Avg Sessions & Avg Duration | avg_sessions, avg_dur.min |
| Geo Revenue | Overview | Top Countries | country, total_rev, user_percent |
| Retention | Engagement & Retention | Overview Metrics by Retention Day | retention_day, retention_rate, total_LTV, ARPDAU |
| D1/D7 Cohort | Engagement & Retention | Cohort - Retention Rate | install_day, D0_user, RRate |
| LTV | Engagement & Retention | Cohort - Revenue & LTV | IAA_rev, IAP_rev, total_LTV |
| Ad by Format | IAA | Overview Ad Metrics - Format | ad_format, total_imp, ad_rev, eCPM, CTR |
| Ad by Country | IAA | Overview Ad Metrics - Country | country, ad_rev, eCPM, ARPU |
| IAP by Country | IAP | Overview IAP Metrics by Country | country, IAP_purchase, pay_rate, IAP_rev_per_user |

Insight V1 tổng hợp **cross-widget** — cái mà từng widget đơn lẻ không làm được. Ví dụ: card "Revenue Surges But Fill Rate Drops" kết hợp data từ widget Revenue + widget Ad Performance.

---

*Tài liệu này là blueprint hoàn chỉnh để implement App Insight V1 trên Amobear Nexus. Cập nhật khi có thêm data source hoặc thay đổi ưu tiên sản phẩm.*
