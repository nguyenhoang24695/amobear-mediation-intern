# Amobear Nexus — Giới thiệu Toàn Platform

> **Dành cho:** Toàn bộ các team — Mediation, UA, Product/Game, Marketing, Leadership  
> **Mục tiêu:** Hiểu rõ hệ thống là gì, dữ liệu từ đâu, tại sao cần dùng, lợi ích cụ thể  
> **Phiên bản:** 2026-05

---

---

## SLIDE 1 — TRANG BÌA

# Amobear Nexus
### Nền tảng Tối ưu Quảng cáo & Phân tích Dữ liệu Toàn diện

> *"Từ 200+ apps, hàng chục mạng quảng cáo, hàng triệu sự kiện — về một nơi, một màn hình, một quyết định."*

**Tháng 5 / 2026 · Internal All-Hands**

---

---

## SLIDE 2 — AGENDA

# Chúng ta sẽ đi qua

| # | Nội dung | Thời gian |
|---|----------|-----------|
| 1 | Tại sao Amobear Nexus ra đời? | 5 phút |
| 2 | Dữ liệu đến từ đâu? | 8 phút |
| 3 | Hệ thống hoạt động như thế nào? | 8 phút |
| 4 | Nexus phục vụ từng team thế nào? | 10 phút |
| 5 | Những lợi ích đã đo được | 5 phút |
| 6 | Roadmap và những gì sắp tới | 5 phút |
| 7 | Q&A | 10 phút |

---

---

## SLIDE 3 — TRƯỚC KHI CÓ NEXUS

# Cuộc sống trước đây trông như thế nào?

```
MỖI BUỔI SÁNG — Mediation Team:

  06:30  Đăng nhập AdMob Console (×4 tài khoản)
  07:00  Export CSV từng tài khoản — copy vào Excel
  07:30  Chạy Waterfall Optimizer Excel — đọc kết quả
  08:00  Review với team lead — chọn gì, bỏ gì
  08:30  Mở Dolphin tool — apply thay đổi thủ công
  09:00  Xong! (nếu không gặp lỗi)

  Ngày hôm sau: bắt đầu lại từ đầu.
```

**Kết quả:**
- ⏱ **2–4 giờ/ngày** cho công việc có thể tự động hóa
- 🐢 **24–48 giờ** để phát hiện eCPM giảm bất thường
- 😰 **5–7 ngày** để tối ưu waterfall cho app/GEO mới
- 📊 Dữ liệu UA, Product, Revenue — nằm ở **3 nơi khác nhau, không kết nối**

---

---

## SLIDE 4 — VẤN ĐỀ CỐT LÕI

# 3 vấn đề không thể giải bằng Excel

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ①  SCALE                                                       │
│      60.000+ ad instances · 200+ apps · hàng chục GEO          │
│      → Con người không thể theo dõi thủ công                   │
│                                                                 │
│  ②  TỐC ĐỘ                                                      │
│      Thị trường quảng cáo thay đổi theo giờ                     │
│      → Quyết định T+1 ngày là đã chậm                           │
│                                                                 │
│  ③  DỮ LIỆU RỜI RẠC                                             │
│      AdMob ở đây · Adjust ở kia · Firebase chỗ khác             │
│      → Không ai thấy được bức tranh đầy đủ                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> **Amobear Nexus** giải quyết cả 3: **tự động hóa scale**, **phản ứng nhanh**, **một nguồn sự thật duy nhất**.

---

---

## SLIDE 5 — AMOBEAR NEXUS LÀ GÌ?

# Một nền tảng — Nhiều vai trò

```
┌──────────────────────────────────────────────────────────────────┐
│                      AMOBEAR NEXUS                               │
│                                                                  │
│   ┌────────────┐  ┌─────────────┐  ┌───────────┐  ┌─────────┐  │
│   │ Thu thập   │  │  Phân tích  │  │ Đề xuất   │  │  Cảnh  │  │
│   │ dữ liệu    │→ │  & tính     │→ │ & Tối ưu  │→ │  báo   │  │
│   │ tự động    │  │  toán KPI   │  │ tự động   │  │  tức   │  │
│   └────────────┘  └─────────────┘  └───────────┘  └─────────┘  │
│                                                        thì        │
│   ┌───────────────────────────────────────────────────────────┐  │
│   │   AI Engine — Trợ lý thông minh hỏi/đáp bằng ngôn ngữ    │  │
│   │   tự nhiên, insight tự động, alert thông minh             │  │
│   └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Ai dùng Nexus?**
- 🎯 **Mediation Team** — Tối ưu waterfall, theo dõi eCPM hàng ngày
- 📈 **UA Team** — Theo dõi ROI, LTV, chi phí acquisition
- 🎮 **Product/Game Team** — Hiểu người dùng, retention, revenue per app
- 👔 **Leadership** — Dashboard tổng hợp toàn portfolio

---

---

## SLIDE 6 — DỮ LIỆU ĐẾN TỪ ĐÂU?

# Nguồn dữ liệu — Bức tranh đầy đủ

```
                    ┌─────────────────────────────┐
                    │      AMOBEAR NEXUS           │
                    │   (một nguồn sự thật duy nhất)│
                    └─────────────────────────────┘
                                  ▲
          ┌───────────┬───────────┼───────────┬───────────┐
          │           │           │           │           │
    ┌─────┴────┐ ┌────┴─────┐ ┌──┴──────┐ ┌─┴───────┐ ┌─┴──────┐
    │ AD NETWORKS│ │ANALYTICS │ │   UA /  │ │  IAP /  │ │  APP   │
    │           │ │          │ │ATTRIBU- │ │SUBSCRI- │ │ STORE  │
    │ • AdMob   │ │•Firebase │ │  TION   │ │ PTION   │ │        │
    │ • AppLovin│ │•AppMetrica│ │• Adjust │ │•Qonver- │ │• Apple │
    │   MAX     │ │          │ │• Apps-  │ │  sion   │ │  Store │
    │ • Meta Ads│ │          │ │  Flyer  │ │         │ │  Connect│
    │ • XMP     │ │          │ │         │ │         │ │        │
    └───────────┘ └──────────┘ └─────────┘ └─────────┘ └────────┘
```

> Mỗi nguồn được **đồng bộ tự động theo lịch** (mỗi giờ / mỗi ngày tùy loại).  
> Không ai phải export CSV bằng tay nữa.

---

---

## SLIDE 7 — CHI TIẾT TỪNG NGUỒN DỮ LIỆU

# Dữ liệu gì, cập nhật khi nào?

| Nguồn | Dữ liệu cung cấp | Tần suất cập nhật | Dùng để |
|-------|-----------------|-------------------|---------|
| **AdMob API** | Revenue, eCPM, Fill Rate, impressions theo app/GEO/format | Hàng ngày (T-1) | Tối ưu waterfall, báo cáo revenue |
| **AppLovin MAX** | Revenue từ mạng MAX, eCPM, fill | Hàng ngày | So sánh mạng, unified reporting |
| **Firebase** | DAU, retention, session, user events | Gần real-time | Chỉ số sức khỏe app |
| **AppMetrica** | Crash, ANR, user events (Android deep) | Hàng ngày | Theo dõi kỹ thuật, UX |
| **Adjust** | Installs, re-installs, attribution theo source | Hàng ngày | UA attribution, LTV tracking |
| **AppsFlyer** | Campaign performance, cohort revenue | Hàng ngày | Phân tích ROI từng kênh |
| **XMP** | Chi phí campaign, CPI, budget | Hàng ngày | ROI calculation |
| **Meta Ads** | Campaign spend, ROAS | Hàng ngày | Chi phí quảng cáo |
| **Qonversion** | IAP revenue, subscriptions, renewals | Hàng ngày | LTV đầy đủ (IAP + IAA) |
| **Apple Store Connect** | App Store revenue, ratings, reviews | Hàng ngày | Theo dõi store |

> **Quan trọng:** AdMob là nguồn chính cho revenue quảng cáo (T-1 delay). Adjust & Firebase bổ sung thêm chiều phân tích user.

---

---

## SLIDE 8 — TẠI SAO PHẢI TỔNG HỢP TỪ NHIỀU NGUỒN?

# Mỗi nguồn chỉ thấy một phần của sự thật

```
Câu hỏi: "App này có đang sinh lời không?"

  AdMob Console nói:        Revenue quảng cáo = $500/ngày  ✓
  Qonversion nói:           IAP revenue = $200/ngày         ✓
  XMP + Meta nói:           Chi phí UA = $600/ngày          ✓
  Adjust + AppsFlyer nói:   1.000 installs mới/ngày         ✓

  Ai trả lời được câu hỏi?  → KHÔNG AI CÓ ĐỦ DỮ LIỆU RIÊNG LẺ

  Nexus kết hợp:
    Total Revenue = $700/ngày
    UA Cost       = $600/ngày
    Net Profit    = $100/ngày  ← chỉ Nexus thấy được con số này
```

> Nexus không tạo ra dữ liệu mới — Nexus **kết hợp đúng chỗ, đúng lúc** những gì vốn đã có.

---

---

## SLIDE 9 — DỮ LIỆU ĐI QUA HỆ THỐNG NHƯ THẾ NÀO?

# Kiến trúc 3 tầng: Bronze → Silver → Gold

```
                         HÀNH TRÌNH DỮ LIỆU

  NGUỒN         BRONZE              SILVER              GOLD
  NGOÀI         (Raw)               (Cleaned)           (Business)
  ──────         ──────              ──────              ──────
               Dữ liệu thô,         Đã chuẩn hoá,      KPI đã tính,
  AdMob  ───► nguyên bản,    ───►  loại trùng,   ───►  sẵn sàng cho
  Firebase     lưu MinIO           đúng format          dashboard
  Adjust       (backup)            và schema            và AI
  ...
               ⏱ Sync tự động     🔄 Transform         📊 Query nhanh
               theo lịch          tự động sau sync      sub-second

  ─────────────────────────────────────────────────────────────────
  Lưu trữ:     MinIO               StarRocks            StarRocks
               (object storage)    (OLAP engine)        (OLAP engine)
```

> **Tại sao cần 3 tầng?** Bronze giữ bản gốc để tra cứu & debug. Silver chuẩn hóa để analysis. Gold tổng hợp để reporting nhanh.

---

---

## SLIDE 10 — AI ENGINE

# Nexus Intelligence — Trợ lý thông minh

Nexus không chỉ lưu data — **nó giúp bạn hiểu data**.

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEXUS AI ENGINE                               │
│                                                                  │
│  🤖 SQL Assistant          📊 Daily Insight                      │
│  ─────────────────         ────────────────                      │
│  "App X hôm qua            Mỗi sáng tự động gửi                 │
│   eCPM bao nhiêu           tóm tắt: app nào tốt,                │
│   ở US Interstitial?"      app nào cần chú ý                     │
│  → Query tự động           → Nhận qua Slack/email               │
│    không cần SQL           không cần vào dashboard               │
│                                                                  │
│  🔔 Alert Builder          🔍 App Health Monitor                 │
│  ─────────────────         ─────────────────────                 │
│  Tự động cảnh báo khi      Tổng quan sức khỏe                   │
│  eCPM giảm >15%,           từng app: revenue,                    │
│  fill rate drop,           retention, crash rate                 │
│  revenue anomaly           → Cảnh báo ngay khi                  │
│  → Không cần canh          có dấu hiệu bất thường               │
│    màn hình 24/7                                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

---

## SLIDE 11 — NEXUS PHỤC VỤ MEDIATION TEAM

# Mediation Team — Từ 5 bước xuống 1 nút bấm

**Trước (5-7 bước thủ công):**
```
Export CSV → Paste Excel → Chạy Optimizer → Review → Mở Dolphin → Apply
```

**Sau (với Nexus):**
```
Mở Nexus Dashboard → Xem Recommendations → [Apply] ← chỉ cần làm vậy
```

---

**Tính năng cụ thể:**

| Tính năng | Mô tả | Lợi ích |
|-----------|-------|---------|
| **SoW Analysis tự động** | Share of Wallet từng ad instance trong Mediation Group | Biết instance nào đang "chiếm" traffic, instance nào kém |
| **Waterfall Optimizer** | 11 rules tự động đề xuất floor price tối ưu | Không cần tính tay, recommend sẵn |
| **Write API** | Apply thay đổi trực tiếp vào AdMob, không qua Dolphin | Một nút — done |
| **Benchmark Engine** | Waterfall template cho app/GEO mới từ 200+ apps sẵn có | Từ 5-7 ngày → 24 giờ |
| **Experiment Engine** | AB test waterfall trước khi rollout 100% | Không còn "all-or-nothing" |
| **Segment Engine** | Cấu hình waterfall riêng cho từng nhóm user | eCPM cao hơn với US, fill cao hơn với IN/BR |

---

---

## SLIDE 12 — BENCHMARK ENGINE (ĐIỂM NỔI BẬT)

# App mới ra mắt — Waterfall ngay lập tức

**Vấn đề cũ:** App mới tại Brazil → team mất 5-7 ngày mới có waterfall tốt.

**Nexus giải quyết thế nào?**

```
Hour 0:   App Brazil mới được detect
          ↓
          Nexus tìm tất cả apps tốt đang chạy ở Brazil
          (chỉ lấy apps có Quality Score ≥ 70 — loại bỏ apps kém)
          ↓
          Tính eCPM percentiles: P25=$2.10 · P50=$4.20 · P75=$6.30 · P90=$8.40
          ↓
          Tự generate waterfall 6 layers từ benchmark
          ↓
          Gửi notification: "Waterfall sẵn sàng — Confidence: HIGH (12 apps)"
          ↓
Hour 1:   Team review → [Apply] → AdMob API apply xong

Day 2-3:  Waterfall Optimizer chạy trên data thực tế → refine tiếp
```

> **Kết quả:** 5-7 ngày → **1-24 giờ**. App có waterfall hợp lý ngay từ đầu, không mất doanh thu.

---

---

## SLIDE 13 — NEXUS PHỤC VỤ UA TEAM

# UA Team — Thấy ROI thực sự, không phải ROI ước tính

**Câu hỏi UA team hay hỏi mà chưa có câu trả lời rõ:**

```
❓ "Campaign Facebook này có sinh lời không?"
   → Trước: Chi phí ở XMP, revenue ở AdMob — không ai kết nối được
   → Nexus: Campaign Cost + Ad Revenue + IAP Revenue = ROAS thực

❓ "User từ Google Ads hay Facebook Ads có LTV cao hơn?"
   → Trước: Adjust có attribution, nhưng không biết user đó ad revenue bao nhiêu
   → Nexus: User LTV = Tổng ad revenue + IAP trong 7/14/30 ngày đầu

❓ "Nên đổ ngân sách vào đâu?"
   → Nexus: ROAS Dashboard theo campaign × source × GEO
```

**Tính năng sắp ra (Q3 2026):**

| Tính năng | Mô tả |
|-----------|-------|
| **ROAS Dashboard** | ROI thực theo campaign, source, GEO |
| **LTV by Cohort** | D1, D7, D14, D30 LTV theo ngày cài đặt |
| **UA Source Comparison** | So sánh organic vs paid, Facebook vs Google |
| **Budget Allocation Insight** | Gợi ý kênh nào đang hiệu quả nhất |

---

---

## SLIDE 14 — NEXUS PHỤC VỤ PRODUCT/GAME TEAM

# Product Team — Hiểu app đang khỏe hay bệnh

**Dashboard App Health — những gì Product team cần nhìn hàng tuần:**

```
┌──────────────────────────────────────────────────────────────────┐
│  App: Weather Pro  |  Platform: Android  |  7 ngày gần nhất      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DAU           Retention D1    Retention D7    Revenue/DAU       │
│  ▲ 125.000     ▲ 42%           ▼ 18%           ▲ $0.42          │
│  +12% W/W      (tốt)          (cần theo dõi)   +5% W/W          │
│                                                                  │
│  ⚠️ CẢNH BÁO: D7 Retention giảm 3 điểm so với tháng trước       │
│     → Gợi ý: Kiểm tra update version 3.2 có thể ảnh hưởng       │
│                                                                  │
│  Ad Revenue     IAP Revenue    Total Revenue   ARPDAU            │
│  $48.000/week   $5.200/week    $53.200/week    $0.42             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Product team không cần vào AdMob, không cần vào Firebase — Nexus tổng hợp hết.**

---

---

## SLIDE 15 — NEXUS PHỤC VỤ LEADERSHIP

# Leadership — Nhìn toàn portfolio trong 30 giây

```
PORTFOLIO OVERVIEW — Tháng 4/2026

  Total Revenue (IAA + IAP):     $1.2M   ▲ +8% M/M
  Total UA Spend:                $380K   ▼ -5% M/M
  Net Profit:                    $820K   ▲ +14% M/M
  Active Apps:                     214

  TOP 5 APPS BY REVENUE              APPS CẦN CHÚ Ý
  1. Weather Pro           $180K      ⚠️ Puzzle Arena  eCPM -18%
  2. Casual Runner         $145K      ⚠️ Word Master    Fill -22%
  3. Photo Editor Plus     $132K      🔴 Dino Jump      Revenue -35%
  4. Puzzle Blast          $110K
  5. Brain Games           $98K

  Revenue by GEO:  US 45% · EU 22% · APAC 18% · ROW 15%
```

> Báo cáo này **tự động cập nhật mỗi ngày**. Leadership không cần hỏi ai, không cần chờ ai tổng hợp.

---

---

## SLIDE 16 — TẠI SAO PHẢI DÙNG NEXUS? (KHÔNG THỂ DÙNG TOOL KHÁC?)

# Lý do Nexus là lựa chọn duy nhất đúng

```
                    Nexus   HyperBid   AdMob Console   Excel + Dolphin
                    ──────  ──────────  ─────────────   ───────────────
Dữ liệu đa nguồn    ✅        ❌            ❌               ❌
 (Adjust, Firebase,
  XMP, IAP...)

Data ownership      ✅        ❌            ✅               ✅
(on-premise,        (server   (vendor       (chỉ AdMob      (file local)
 không ra ngoài)    riêng)    giữ data)     data)

Waterfall Benchmark ✅        ❌            ❌               ❌
(Qualified, scored)

AB Testing          ✅        ✅            ❌               ❌

AI Assistant        ✅        ❌ (buzzword)  ❌               ❌

Automated Alerts    ✅        ❌            Cơ bản           ❌

Scale 200+ apps     ✅        ✅            ❌ (thủ công)     ❌
```

> **Điểm mấu chốt:** HyperBid yêu cầu bạn **trao toàn bộ data cho vendor bên ngoài (TopOn)** — Nexus giữ data 100% on-premise.

---

---

## SLIDE 17 — LỢI ÍCH ĐÃ ĐO ĐƯỢC

# Con số thực tế

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⏱  Thời gian tối ưu waterfall cho app/GEO mới                  │
│      TRƯỚC: 5–7 ngày    →    SAU: 1–24 giờ                      │
│                                                                 │
│  🕐  Thời gian phát hiện sự cố eCPM/fill rate bất thường         │
│      TRƯỚC: 24–48 giờ   →    SAU: < 1 giờ (alert tự động)       │
│                                                                 │
│  👨‍💼  Thời gian thủ công hàng ngày của Mediation Team             │
│      TRƯỚC: 2–4 giờ     →    SAU: 20–30 phút review             │
│                                                                 │
│  📈  eCPM uplift kỳ vọng với multi-mediation backfill            │
│      (validated bởi HyperBid case studies)  +7% đến +27%        │
│                                                                 │
│  💰  Revenue bị mất khi không phát hiện kịp                      │
│      eCPM -20% ở app top → ~$500–1.000/ngày                     │
│      → Nexus phát hiện trong 1 giờ, không phải 2 ngày           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

---

## SLIDE 18 — NHỮNG GÌ ĐÃ CÓ (Q2 2026)

# Hệ thống hiện tại — Live và đang chạy

```
✅  Pipeline dữ liệu đầy đủ
    AdMob · AppLovin MAX · Firebase · AppMetrica
    Adjust · AppsFlyer · XMP · Qonversion · Apple Store

✅  StarRocks Bronze / Silver / Gold
    Lưu trữ và tính toán tốc độ cao

✅  Dashboard Nexus (Next.js)
    Revenue · eCPM · Fill Rate · SoW Analysis

✅  Waterfall Optimizer (11 rules)
    Tự động đề xuất, apply qua AdMob Write API

✅  AI Suite
    SQL Assistant · Daily Insight · Alert Builder

✅  Alert System
    Slack + Email · cấu hình ngưỡng theo app/metric

✅  Benchmark Engine (FG1)
    Quality Scoring · Template Day-0 · Tự động detect app/GEO mới

🔄  Experiment Engine (FG2) — đang build Q2 2026
🔄  Segment Engine (FG3)    — đang build Q2 2026
```

---

---

## SLIDE 19 — ROADMAP

# Những gì sắp tới

```
Q2 2026 (Tháng 4–6)         Q3 2026 (Tháng 7–9)         Q4 2026 (Tháng 10–12)
────────────────────         ───────────────────          ────────────────────────

✅ Benchmark Engine          🔶 Multi-Mediation           🔵 Kafka Event System
   App/GEO mới có               Backfill routing             Real-time events
   waterfall ngay               MAX + TopOn                  50M+ users scale

🔄 Experiment Engine         🔶 LTV Intelligence          🔵 Real-time Experiment
   AB test waterfall            User-level LTV                Metrics tức thì
   trước khi rollout            D1/D7/D30

🔄 Segment Engine            🔶 UA ROAS Dashboard         🔵 Live Anomaly Detection
   Per-user-group               Campaign ROI thực            Phát hiện sự cố
   waterfall config             vs estimate                   trong seconds

                                                           🔵 Stream LTV
                                                              Real-time user value
```

> **Nguyên tắc:** Batch first → Validate → Scale với Kafka khi thực sự cần.

---

---

## SLIDE 20 — LÀM THẾ NÀO ĐỂ BẮT ĐẦU?

# Hướng dẫn cho từng team

### Mediation Team
```
1. Truy cập Nexus Dashboard (link nội bộ)
2. Vào "SoW Analysis" → xem recommendations hôm nay
3. Review → click [Apply] cho recommendations muốn apply
4. Bật Alert cho các app quan trọng (eCPM, Fill Rate threshold)
5. Dùng "Benchmark" khi có app/GEO mới
```

### UA Team
```
1. Xem "App Health" dashboard để biết app nào đang tốt/kém
2. Q3: ROAS Dashboard sẽ sẵn sàng — liên hệ team backend để onboard
3. Báo cáo nếu cần metric nào chưa có → sẽ ưu tiên build
```

### Product/Game Team
```
1. Truy cập "App Health" — xem DAU, retention, revenue per app
2. Bật weekly email report cho app của team mình
3. Q&A: Dùng AI SQL Assistant nếu muốn tự query data
```

### Leadership
```
1. Nhận daily email digest tự động mỗi sáng (contact IT để bật)
2. Truy cập Portfolio Overview dashboard bất cứ lúc nào
```

---

---

## SLIDE 21 — Q&A THƯỜNG GẶP

# Câu hỏi hay gặp

**"Data có chính xác không? Tôi thấy số khác AdMob Console?"**
> AdMob Console là nguồn chính thức (T-1). Nexus sync từ đây — số phải khớp. Nếu khác, có thể do múi giờ hoặc filter khác nhau. Báo cáo team backend.

**"Data cập nhật bao lâu một lần?"**
> AdMob: hàng ngày (data ngày hôm qua có lúc ~7-8 giờ sáng). Firebase: gần real-time (15-30 phút delay). Adjust: hàng ngày. Xem bảng ở Slide 7.

**"Tôi có thể tự query data không?"**
> Có. Dùng AI SQL Assistant trong Nexus — đặt câu hỏi bằng tiếng Việt/Anh, AI tự viết SQL và trả kết quả.

**"Nếu hệ thống apply sai waterfall thì sao?"**
> Mọi thay đổi đều có review trước khi apply (không có auto-apply 100%). Lịch sử thay đổi được lưu đầy đủ. Có thể rollback.

**"Dữ liệu có bị ra ngoài không?"**
> Không. Toàn bộ hệ thống chạy on-premise. Dữ liệu không đi qua bất kỳ vendor bên ngoài nào.

---

---

## SLIDE 22 — KIẾN TRÚC KỸ THUẬT (CHO DEV TEAM)

# Stack công nghệ

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND        Next.js 16 · React 19 · TypeScript             │
│                  Tailwind 4 · shadcn/ui                         │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND         .NET 8 · ASP.NET Core API                      │
│                  Hangfire (scheduled jobs)                      │
│                  Entity Framework Core (PostgreSQL)             │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER      StarRocks — OLAP, Bronze/Silver/Gold           │
│                  PostgreSQL — Master data, RBAC, credentials    │
│                  MinIO — Raw file backup (Parquet, JSON)        │
├─────────────────────────────────────────────────────────────────┤
│  MESSAGING       RabbitMQ — async job queue                     │
├─────────────────────────────────────────────────────────────────┤
│  AI              LLM (Claude/GPT) + RAG + MCP Proxy             │
│                  CRAFT architecture: Context-aware queries       │
├─────────────────────────────────────────────────────────────────┤
│  INFRA           Docker Compose (dev) · Linux server (prod)     │
│                  Redis (cache) · Slack/Email (alerts)           │
│                  Q4: Apache Kafka (event streaming)             │
└─────────────────────────────────────────────────────────────────┘
```

---

---

## SLIDE 23 — TÓM TẮT

# Amobear Nexus — 5 điểm cần nhớ

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1️⃣  MỘT NGUỒN SỰ THẬT                                          │
│      10+ nguồn dữ liệu → kết hợp đúng chỗ, đúng lúc           │
│                                                                 │
│  2️⃣  TỰ ĐỘNG HÓA HOÀN TOÀN                                      │
│      Sync · Transform · Recommend · Alert — không cần làm tay  │
│                                                                 │
│  3️⃣  DATA OWNERSHIP 100%                                        │
│      On-premise · không vendor nào giữ data của Amobear        │
│                                                                 │
│  4️⃣  PHỤC VỤ MỌI TEAM                                           │
│      Mediation · UA · Product · Marketing · Leadership         │
│                                                                 │
│  5️⃣  NỀN TẢNG CHO TƯƠNG LAI                                     │
│      Benchmark → Experiment → Segment → Multi-mediation → LTV  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

---

## SLIDE 24 — KẾT THÚC

# Cảm ơn đã lắng nghe

**Câu hỏi và phản hồi?**

```
  📧  Backend team:   [team channel nội bộ]
  💬  Slack:          #amobear-nexus
  🐛  Bug report:     GitHub Issues (repo nội bộ)
  📚  Tài liệu đầy đủ: docs/99 - MEDIATION PRO PLATFORM.md
```

---

> *Amobear Nexus — Built by Amobear, for Amobear.*  
> *Dữ liệu của chúng ta. Quyết định của chúng ta.*

---

---

## PHỤ LỤC A — THUẬT NGỮ

| Thuật ngữ | Giải thích |
|-----------|-----------|
| **eCPM** | Effective Cost Per Mille — doanh thu trung bình trên 1.000 lần hiển thị quảng cáo |
| **Fill Rate** | Tỉ lệ yêu cầu quảng cáo được đáp ứng (ad filled / ad requested × 100%) |
| **SoW** | Share of Wallet — tỉ lệ impression mỗi ad instance trong một Mediation Group chiếm |
| **Waterfall** | Chuỗi ad instances xếp theo thứ tự ưu tiên/floor price trong AdMob |
| **Floor Price** | Giá sàn — eCPM tối thiểu để ad instance được phép phục vụ impression |
| **Mediation Group (MG)** | Nhóm cấu hình quảng cáo trong AdMob, gồm nhiều ad instances |
| **ARPDAU** | Average Revenue Per Daily Active User — doanh thu trung bình mỗi user mỗi ngày |
| **LTV** | Lifetime Value — tổng giá trị (revenue) một user mang lại trong suốt vòng đời |
| **ROAS** | Return On Ad Spend — doanh thu / chi phí quảng cáo |
| **CPI** | Cost Per Install — chi phí để có một lượt cài đặt app |
| **DAU** | Daily Active Users — số user hoạt động trong ngày |
| **Cohort** | Nhóm user cài đặt app trong cùng một khoảng thời gian |
| **Bronze/Silver/Gold** | 3 tầng dữ liệu: Raw → Cleaned → Aggregated |
| **T-1** | Dữ liệu của ngày hôm qua (có độ trễ 1 ngày) |
| **GEO** | Quốc gia/khu vực địa lý của user |
| **IAA** | In-App Advertising — doanh thu từ quảng cáo trong app |
| **IAP** | In-App Purchase — doanh thu từ mua hàng trong app |

---

## PHỤ LỤC B — LIÊN KẾT TÀI LIỆU KỸ THUẬT

| Tài liệu | Mô tả |
|----------|-------|
| `docs/99 - MEDIATION PRO PLATFORM.md` | Tài liệu gốc đầy đủ về toàn bộ platform |
| `docs/120 - Amobear Nexus Multi-Mediation Intelligence Platform.md` | Roadmap 5 Feature Groups (FG1-FG5) |
| `docs/113 - WATERFALL OPTIMIZER MODULE FULL.md` | Chi tiết Waterfall Optimizer 11 rules |
| `docs/114 - AI SQL ASSISTANT SOLUTION.md` | Hướng dẫn dùng AI Assistant |
| `docs/111 - AMOBEAR DATA ANALYTICS — STARROCKS VIEWS & METRICS SETS.md` | Schema Gold layer |
| `docs/100 - AMOBEAR DATA STORAGE ARCHITECTURE.md` | Kiến trúc lưu trữ StarRocks |
