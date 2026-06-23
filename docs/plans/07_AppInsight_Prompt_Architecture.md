# App Insight — Prompt Architecture
## Từ 1 app → 500+ apps: Cấu trúc prompt tổng quát

> **Vấn đề:** Không thể viết 500 prompt riêng. Nhưng 1 prompt generic thì insight kém.
> **Giải pháp:** 3-layer prompt. Layer 1+2 viết tay (7 templates). Layer 3 auto-generate từ data.

---

## 1. Kiến trúc 3 Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROMPT = L1 + L2 + L3                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: Global AI Instructions (CHUNG cho tất cả apps)        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Format rules, scoring framework, Markdown structure,       │  │
│  │ team tags, mermaid rules, tiếng Việt, number format        │  │
│  │ → Nằm trong Template (CRAFT v2)                            │  │
│  │ → Viết 1 lần, dùng cho 500+ apps                          │  │
│  │ → ~200 words                                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  LAYER 2: Category Context (5-7 categories, viết tay)           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ KPI targets, scoring weights, dimension priorities,        │  │
│  │ typical core loop, monetization pattern                    │  │
│  │ → Nằm trong app_insight_settings.settings.aiContext        │  │
│  │ → Viết 5-7 bộ, assign theo category                       │  │
│  │ → ~150 words                                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  LAYER 3: App-Specific Context (AUTO-GENERATED, không viết tay) │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ App name, bundle, platform                                 │  │
│  │ Top 30 events + auto-classified groups                     │  │
│  │ Ad format mapping (detected from event names)              │  │
│  │ Core KPIs detected (drawing_rate, chat_rate, level_*)      │  │
│  │ → Snapshot builder tự query + classify + inject            │  │
│  │ → Không cần viết thủ công cho mỗi app                     │  │
│  │ → ~150 words                                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Tổng prompt: ~500 words ≈ ~650 tokens                          │
└──────────────────────────────────────────────────────────────────┘
```

**So sánh:**

| Approach | Prompts cần viết | Prompt size | Quality |
|----------|-----------------|-------------|---------|
| 1 generic cho all | 1 | ~200 words | ⭐⭐ Generic, thiếu context |
| 1 riêng cho mỗi app | 500+ | ~500 words × 500 | ⭐⭐⭐⭐⭐ Nhưng bất khả thi |
| **3-layer (đề xuất)** | **1 global + 7 category** | **~500 words** | **⭐⭐⭐⭐ Gần như viết riêng** |

---

## 2. Layer 1: Global AI Instructions

> **Vị trí:** Template → Global AI Instructions (panel phải)
> **Dùng chung:** Tất cả apps, tất cả categories
> **Viết 1 lần**

```
[Cấu hình bắt buộc — áp dụng cho mọi app]

Bạn là AI Health Intelligence Analyst cho Amobear. Mỗi ngày bạn nhận snapshot dữ liệu 1 app và viết báo cáo insight.

FORMAT:
- Tiếng Việt, chuyên nghiệp, data-driven, actionable.
- Revenue: $#,###.##. eCPM: $#.##. Tỉ lệ: #.#%. Không hiển thị raw decimal (0.788 → 78.8%).
- Mermaid charts: xychart cho trend, pie cho split, flowchart cho diagnostic.
- Team tags khi đề xuất action: [Mediation], [UA], [Product], [DA], [Dev], [BOD].

SCORING (8 dimensions):
- Composite = weighted average chỉ trên dimensions CÓ DATA. N/A → loại khỏi tính toán.
- Tier: S(90+), A(80-89), B(65-79), C(50-64), D(30-49), F(<30).
- Nếu thiếu data → ghi N/A + lý do + đề xuất bổ sung. KHÔNG bịa số.

DATA SOURCE AWARENESS:
- Snapshot ghi rõ dataSource mỗi block (gold/silver/bronze/none).
- Bronze data → thêm "⚠️ Số liệu từ raw data, có thể chênh lệch nhỏ".
- Cross-reference dimensions: "retention ↓ → revenue bị ảnh hưởng trong 7-14 ngày".

QUY TẮC:
- Chỉ dùng số từ snapshot. Không suy diễn ngoài data.
- Mỗi section kết thúc bằng KẾT LUẬN rõ ràng, không chỉ liệt kê.
- So sánh với target/benchmark khi có trong appContext.
```

**~200 words. Không chứa gì app-specific.**

---

## 3. Layer 2: Category Context

> **Vị trí:** `app_insight_settings.settings.aiContext` (JSON field)
> **Viết 5-7 bộ**, assign cho apps theo category

### 3.1 Bảng Category Mapping

| Category | Template | Apps ví dụ | Viết riêng gì? |
|----------|----------|-----------|----------------|
| `creative_utility` | CRAFT v2 | AR Tracer, Photo Editor | drawing/creation KPIs, onboarding funnel |
| `ai_chat` | CRAFT v2 | Love AI, Chat Bot | chat_rate, msg/user, content_love/skip |
| `puzzle_game` | Puzzle Game | Puzzle Blast, Block Puzzle | level health, fail_rate, difficulty curve |
| `casual_game` | Casual Game | Solitaire, Match-3 | session depth, reward loop, ad frequency |
| `video_media` | Video/Media | Short Video, Music | watch time, completion rate, ad load |
| `ai_utility` | AI Utility | AI Scanner, AI Writer | API usage, premium/free ratio |
| `generic` | Generic | Tất cả app chưa classify | Dùng data-driven, không assume |

### 3.2 Category Context mẫu: `creative_utility` (cho AR Tracer)

```
[Category: Creative Utility — Ứng dụng sáng tạo AR/Drawing/Photo]

CORE LOOP: Install → Onboard → Browse content → Create (draw/edit/capture) → Complete & Share → Return.
MONETIZATION: Subscription (trial→paid) + Ads (rewarded + interstitial + banner + native + app open).

DIMENSION WEIGHTS: Revenue 20%, Growth 10%, Engagement 20%, Product 20%, AdInfra 15%, UnitEcon 10%, Portfolio 5%, Velocity 5%.

KPI TARGETS (so sánh trong report):
- creation_rate (users tạo content / DAU): >40%
- d0_activation (new users tạo content D0): >25%
- completion_rate (start→finish): >50%
- trial_to_sub: >15%
- D1 retention: >30%, D7: >12%

UA DATA SOURCES: Adjust (installs by network/campaign), XMP (cost by module: tiktok/google/facebook/apple). ROI target: >1.5x.

PRIORITY: creation_rate là KPI #1. Nếu giảm → leading indicator mạnh hơn cả revenue.
Nếu D1↓ + new_users↑ → UA quality kém (check Adjust network breakdown). Nếu D7↓ + D1 OK → core creation experience có vấn đề.
```

### 3.3 Category Context mẫu: `ai_chat` (cho Love AI)

```
[Category: AI Chat — Ứng dụng chat với AI character]

CORE LOOP: Install → Login → Create/Select Character → Chat (send messages) → Send gifts → Unlock content → Level up → Return.
MONETIZATION: Subscription + Ads (rewarded + interstitial + banner + native + app open) + IAP (virtual items).

DIMENSION WEIGHTS: Revenue 20%, Growth 10%, Engagement 25%, Product 15%, AdInfra 15%, UnitEcon 10%, Portfolio 5%, Velocity 0%.

KPI TARGETS:
- chat_rate (users gửi message / DAU): >50%
- msg_per_user (messages / chat users): >5
- content_love_rate (love / impression): >60%
- trial_to_sub: >10%
- D1 retention: >25%, D7: >10%

UA DATA SOURCES: Adjust (installs by network/campaign/country), XMP (cost by module). ROI target: >1.2x.

PRIORITY: chat_rate + msg_per_user là KPI #1. App sống nhờ engagement. Revenue follows engagement.
Nếu chat_rate↓ → check AI response time/quality. Nếu content_skip↑ → content quality giảm.
Nếu Adjust có campaign data → tách ROAS by network, flag campaigns CPI cao + D1 thấp.
```

### 3.4 Category Context mẫu: `puzzle_game`

```
[Category: Puzzle Game — Game giải đố level-based]

CORE LOOP: Install → Tutorial → Play levels → Watch ad/buy boost → Progress → Return.
MONETIZATION: IAP (coins, boosters, lives) + Ads (rewarded for extra life, interstitial between levels).

DIMENSION WEIGHTS: Revenue 15%, Growth 10%, Engagement 20%, Product 25%, AdInfra 15%, UnitEcon 10%, Portfolio 5%, Velocity 0%.

KPI TARGETS:
- level_complete_rate: >70% (avg across levels)
- fail_rate_spike: <25% (bất kỳ level nào)
- sessions_per_user: >2.5
- ad_reward_rate (rewarded view / offer): >60%
- D1: >35%, D7: >15%

UA DATA SOURCES: Adjust (installs, network, campaign ROAS by country), XMP (cost by module). CPI target: <$1.50 T1, <$0.50 T2.

PRIORITY: Product & Content là dimension #1 (difficulty curve, level design). 
Nếu fail_rate spike ở level cụ thể → [Game Design] review. Nếu D1↓ sau update → check regression.
Nếu Adjust có country-level → so sánh CPI × D7 retention để tìm GEO tốt nhất scale.
```

**Mỗi category context ~120-150 words. Viết 7 bộ = ~1,000 words tổng. Một lần, dùng mãi.**

---

## 4. Layer 3: App-Specific Context (AUTO-GENERATED)

> **Vị trí:** Snapshot builder tự generate, inject vào prompt mỗi lần chạy
> **Không cần viết tay** — hoàn toàn tự động từ data

### 4.1 Logic generate

```csharp
// AppContextGenerator.cs — chạy trước khi gọi AI
public async Task<string> GenerateAppContext(string firebaseId, string bronzeTable)
{
    // 1. App info
    var appInfo = await GetAppInfo(firebaseId); // từ dim_app_identifiers + app_registry
    
    // 2. Top events (query Bronze)
    var topEvents = await QueryTopEvents(bronzeTable, days: 7, limit: 30);
    
    // 3. Auto-classify events
    var classified = ClassifyEvents(topEvents);
    
    // 4. Detect ad formats
    var adFormats = DetectAdFormats(topEvents);
    
    // 5. Detect core KPIs từ events
    var coreKpis = DetectCoreKpis(classified, appInfo.Category);
    
    // 6. Build context string
    return BuildContextString(appInfo, classified, adFormats, coreKpis);
}
```

### 4.2 Event Classification Rules (code)

```csharp
// Tự động classify events — không cần config per app
private Dictionary<string, List<string>> ClassifyEvents(List<EventRow> events)
{
    var groups = new Dictionary<string, List<string>>();
    
    foreach (var e in events)
    {
        var name = e.EventName;
        var group = name switch
        {
            // Firebase standard
            "session_start" or "user_engagement" or "first_open" 
                or "screen_view" => "core",
            
            // Ad events (pattern: ad_impression*)
            _ when name.StartsWith("ad_impression") => "ad",
            _ when name is "ad_clicked" or "ad_complete" or "ad_reward" 
                or "ad_request" or "ad_load_fail" => "ad",
            
            // IAP (pattern: iap_* or in_app_purchase)
            _ when name.StartsWith("iap_") => "iap",
            "in_app_purchase" or "purchase" => "iap",
            
            // Subscription
            _ when name.StartsWith("trial_") or name.StartsWith("subscription_") 
                or "refund" => "subscription",
            
            // Onboarding (pattern: intro_*, onboard*, language_choose)
            _ when name.StartsWith("intro_") or name.StartsWith("end_onboard") 
                or name == "language_choose" => "onboarding",
            
            // Share
            _ when name.Contains("share") => "share",
            
            // Content browsing (pattern: browser_category_*, category_*)
            _ when name.StartsWith("browser_category_") 
                or name.StartsWith("category_") => "browse",
            
            // Level/progression (pattern: level_*, start_level_*)
            _ when name.StartsWith("level_") or name.StartsWith("start_level_") => "level",
            
            // Drawing/creation (pattern: draw_*, content_*, lesson*)
            _ when name.StartsWith("draw_") or name.StartsWith("content_") 
                or name.StartsWith("lessons_") => "creation",
            
            // Chat (pattern: *_msg_*, chat_*, *_message*)
            _ when name.Contains("msg") or name.Contains("chat") 
                or name.Contains("message") => "chat",
            
            // Camera/photo
            _ when name.Contains("photo") or name.Contains("capture") 
                or name.Contains("camera") => "camera",
            
            // Notification
            _ when name.Contains("notification") or name.Contains("push") => "notification",
            
            // Button clicks
            _ when name.StartsWith("btn_") or name == "button_click" => "ui_button",
            
            // Default
            _ => "other"
        };
        
        groups.GetOrAdd(group).Add(name);
    }
    return groups;
}
```

### 4.3 Ad Format Detection

```csharp
// Detect từ event names — pattern chung cho hầu hết apps Amobear
private Dictionary<string, string> DetectAdFormats(List<EventRow> events)
{
    var mapping = new Dictionary<string, string>();
    var adEvents = events.Where(e => e.EventName.StartsWith("ad_impression")).ToList();
    
    // Heuristic: ad_impression1 = rewarded (thường eCPM cao nhất)
    foreach (var e in adEvents)
    {
        mapping[e.EventName] = e.EventName switch
        {
            "ad_impression1" => "rewarded",
            "ad_impression2" => "interstitial",
            "ad_impression3" => "banner",
            "ad_impression4" => "native",
            "ad_impression_custom" => "app_open",
            "ad_impression" => "standard (all)",
            _ => "unknown"
        };
    }
    return mapping;
}
```

### 4.4 Output mẫu: auto-generated context cho AR Tracer

```
[App: AR Tracer: Trace Drawing | iOS | com.avntech.ar-drawing]

TOP EVENTS (7d, by volume):
- core: session_start (850K), user_engagement (2.1M), first_open (22K)
- ad: ad_impression3 (380K), ad_impression2 (72K), ad_impression1 (85K), ad_impression4 (20K)
- creation: draw_with_lesson (45K), draw_finish_with_lesson (28K), content_draw (18K), lessons_free_start_drawing (15K)
- onboarding: first_open (22K), language_choose (21K), intro_next_click (20K), end_onboard_global (16K)
- iap: iap_show (42K), iap_click (8K), iap_purchase (1.8K), trial_started (3.2K)
- browse: browser_category_* (108 events, 120K total)
- share: preview_share (5.2K)
- camera: magic_photo_draw (3.1K), drawing_capture (8.5K)

AD FORMATS: ad_impression1=rewarded, 2=interstitial, 3=banner, 4=native, _custom=app_open.

DETECTED KPIS: creation_rate (draw users/DAU), completion_rate (finish/start), onboarding_completion (step8/step1), d0_activation (D0 draw/installs).

SUBSCRIPTION: trial_started→subscription_upgraded flow detected.
```

### 4.5 Output mẫu: auto-generated context cho Love AI

```
[App: Love AI: Virtual Character | Android | com.chatbotai.virtualcharacter.app]

TOP EVENTS (7d, by volume):
- core: session_start (520K), user_engagement (1.8M), first_open (18K)
- ad: ad_impression3 (290K), ad_impression4 (45K), ad_impression1 (60K)
- chat: user_msg_sent (380K), ai_msg_sent (350K), create_chat_success (12K)
- iap: iap_show (35K), iap_click (5K), iap_purchase (800)
- level: start_level_1 (15K), start_level_2 (8K), start_level_3 (4K)
- ui_button: btn_like (25K), btn_send_gift (18K), btn_Flower/Ring/Coffee... (72 localized, 85K total)
- notification: notification_permission_granted (8K)
- subscription: subscription_canceled (200), subscription_expired (150)

AD FORMATS: ad_impression1=rewarded, 2=interstitial, 3=banner, 4=native, _custom=app_open.

DETECTED KPIS: chat_rate (msg users/DAU), msg_per_user, content_love_rate, level_progression.

GIFT ITEMS: 72 localized btn_* events → Flower, Ring, Coffee, Letter, Chocolate groups.
```

**~150 words mỗi app. Hoàn toàn tự động. Không cần viết tay.**

---

## 5. Prompt Assembly — Cách ghép 3 layers

```
┌──────────────────────────────────────────────────────────────────┐
│ FINAL PROMPT = concatenate(L1, L2, L3) + snapshot JSON           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ System message ─────────────────────────────────────────────┐ │
│ │ {Layer 1: Global AI Instructions}        (~200 words)        │ │
│ │ {Layer 2: Category Context}              (~150 words)        │ │
│ │ {Layer 3: Auto-generated App Context}    (~150 words)        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ User message (per section) ─────────────────────────────────┐ │
│ │ {Section instruction}                    (~100 words)        │ │
│ │ {Snapshot JSON data for this section}    (~5K-15K tokens)    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Total prompt overhead: ~600 words ≈ ~800 tokens                  │
│ Total with snapshot: ~800 + ~10K snapshot ≈ ~11K tokens         │
│ (vs current 86K — phần lớn là snapshot, prompt chỉ ~1%)         │
└──────────────────────────────────────────────────────────────────┘
```

### Code assembly

```csharp
// PromptAssembler.cs
public string AssemblePrompt(InsightTemplate template, AppInsightSettings settings, 
    string autoContext, string sectionKey, string sectionInstruction, object snapshotData)
{
    var systemPrompt = string.Join("\n\n",
        template.GlobalAiInstructions,      // Layer 1 (~200 words)
        settings.AiContext,                   // Layer 2 (~150 words) 
        autoContext                           // Layer 3 (~150 words, auto-generated)
    );
    
    var userPrompt = $"""
        Section: {sectionKey}
        {sectionInstruction}
        
        === SNAPSHOT DATA ===
        {JsonSerializer.Serialize(snapshotData)}
        """;
    
    return (systemPrompt, userPrompt);
}
```

---

## 6. Section Instructions (chung cho mọi app)

> Viết 1 lần trong template, không cần thay đổi per app.
> Category + auto-context đã cung cấp đủ specifics.

### Section 1: Executive Summary

```
Health score 0-100, tier S/A/B/C/D/F. Bảng 8 dimension |Dimension|Score|Trend|Status|.
Tóm tắt 2-3 câu: mạnh/yếu nhất, rủi ro chính, tín hiệu chéo giữa dimensions.
Mention KPI #1 của app (từ category context). Top 1 action + team tag.
```

### Section 2: Revenue & Monetization (+ Ad Infrastructure)

```
Revenue T vs T-1, 7d, 14d. Tách IAA (by format) vs IAP.
Cảnh báo nếu IAA > 90%. eCPM trend, fill rate (cảnh báo <85%).
SoW: top sources, cảnh báo 1 source >60%. Top 3 ad units.
Mermaid xychart: revenue 14d. Mermaid pie: revenue split.
Kết: revenue bền (volume-driven) hay fragile (chỉ eCPM bù fill)?
```

### Section 3: Engagement & Retention

```
DAU trend 14d. Sessions/user, avg duration.
D1/D7/D30 retention vs targets (từ category context).
KPI #1 trend (creation_rate / chat_rate / session_depth — tuỳ category).
Insight chéo: D1↓ + new_users↑ → UA quality. D7↓ + D1 OK → core loop.
Mermaid xychart: DAU + KPI #1 14 ngày.
Nếu null → estimate từ impressions trend, ghi rõ.
```

### Section 4: Product & Content

```
Core loop metrics từ detected events (creation funnel / level health / chat engagement — tùy app).
Onboarding funnel: steps + drop-off %. D0 activation.
Feature adoption: top detected event groups.
Mermaid flowchart: core loop với drop-off points.
Nếu events rỗng → ghi N/A + đề xuất tracking.
```

### Section 5: Growth & Acquisition

```
INSTALLS & ATTRIBUTION (ưu tiên Adjust nếu có):
- Adjust (bronze.adjust_report): installs, network, partner_name, campaign, country_code.
  Join: app_token = dim_app_identifiers.adjust_id. Metrics trong conversion_metrics_json.
  → Breakdown installs by network (Meta, Google, TikTok, Unity, Apple Search Ads).
  → Organic vs paid ratio. Organic > 40% = healthy.
  → Campaign-level: flag campaign có CPI cao + retention thấp.
- Nếu không có Adjust → dùng Firebase first_open (new_users) + af_status (organic/paid).

UA COST (ưu tiên XMP nếu có):
- XMP (bronze.xmp_report): cost, module (tiktok/google/facebook/apple/mintegral), product_id.
  Join: product_id hoặc store_package_id = bundle_id app.
  → Spend by module/channel. Total daily cost. Cost trend 14d.
  → CPI = cost / installs (Adjust installs). CPI spike >30% → cảnh báo [UA].
- Nếu không có XMP → dùng ua_cost từ fact_daily_app_metrics (nếu có).

ROI & UNIT ECONOMICS:
- ROI = revenue / ua_cost. ROI < 1 → "đang đốt tiền mỗi user" → flag [BOD].
- LTV/CAC: LTV từ retention_overview.total_ltv, CAC = CPI.
  LTV/CAC < 1.5 → cảnh báo. < 1.0 → critical.
- ARPDAU trend: cross-check revenue growth vs DAU growth.

Mermaid bar: spend by channel. Mermaid xychart: UA cost vs revenue 14d.
Ghi rõ data sources thực tế có (Adjust/XMP/Firebase/Gold).
Nếu thiếu Adjust → ghi "không có campaign-level ROAS, chỉ có tổng ROI".
Nếu thiếu XMP → ghi "cost từ fact_daily_app_metrics, không tách được channel".
```

### Section 6: Anomalies & Alerts

```
Liệt kê warnings: metric, so sánh, team tag, confidence %.
Auto-detect: fill↓>5pp, revenue↑nhưng fill↓, ROI↓, D1↓>3pp, KPI#1↓.
Data limitation: dimensions N/A + dataSource layer.
```

### Section 7: Recommendations & Action Plan

```
Bảng |#|Action|Team|Urgency|Confidence|Auto?|. Sort: 🔴24h → 🟡3d → 🔵7d.
Tối đa 8, tối thiểu 3. Cuối: dataGaps cần bổ sung pipeline.
```

**Tổng 7 sections: ~700 words. Chung cho tất cả apps.**

---

## 7. Ví dụ: Cùng template, khác app

### AR Tracer chạy qua pipeline:

```
L1: [Global format rules — 200 words]
L2: [Category: creative_utility — creation_rate >40%, completion >50%...]
L3: [Auto: AR Tracer, iOS, draw_with_lesson (45K), ad_impression1=rewarded...]
Section instruction: [Revenue: T vs T-1, IAA/IAP split, fill rate...]
Snapshot: {revenue: 1216.32, ecpm: 3.80, fill_rate: 0.788, dau: 12450, drawing_users: 5200...}
```

→ Output nhắc "drawing_rate 41.8% (target >40%)", "fill rate 78.8% < 85% cảnh báo"

### Love AI chạy qua CÙNG pipeline:

```
L1: [Global format rules — 200 words] ← GIỐNG
L2: [Category: ai_chat — chat_rate >50%, msg_per_user >5...]
L3: [Auto: Love AI, Android, user_msg_sent (380K), btn_Flower/Ring/Coffee...]
Section instruction: [Revenue: T vs T-1, IAA/IAP split, fill rate...] ← GIỐNG
Snapshot: {revenue: 890.50, ecpm: 2.90, chat_users: 8500, dau: 15200, msg_sent: 42000...}
```

→ Output nhắc "chat_rate 55.9% (target >50%)", "gift preference: Flower > Ring > Coffee"

### Puzzle Blast chạy qua CÙNG pipeline:

```
L1: [Global format rules — 200 words] ← GIỐNG
L2: [Category: puzzle_game — level_complete >70%, fail_rate <25%...]
L3: [Auto: Puzzle Blast, Android, level_start (120K), level_complete (95K), level_fail (25K)...]
Section instruction: [Product: core loop metrics, drop-off...] ← GIỐNG
Snapshot: {revenue: 2100, dau: 35000, level_data: [{level: 45, fail_rate: 28%}]...}
```

→ Output nhắc "Level 45 fail_rate 28% > 25% target", "difficulty spike cần [Game Design] review"

**Cùng template + cùng 7 section instructions. Khác category context + auto-generated context.**

---

## 8. Triển khai

### 8.1 Việc cần làm (1 lần)

| # | Việc | Effort | Output |
|---|------|--------|--------|
| 1 | Viết Layer 1 Global Instructions | 1h | 1 prompt, ~200 words |
| 2 | Viết 7 Category Contexts | 3h | 7 prompts, ~150 words mỗi bộ |
| 3 | Viết 7 Section Instructions | 2h | 7 prompts, ~100 words mỗi cái |
| 4 | Implement `AppContextGenerator` | 1-2 ngày | Auto-classify events, detect KPIs |
| 5 | Implement `PromptAssembler` (3-layer concat) | 0.5 ngày | Ghép L1+L2+L3 |
| 6 | Assign category cho 500 apps | 1-2h | Bulk update `app_insight_settings` |

### 8.2 Mapping vào UI hiện tại

| UI Element | Layer |
|-----------|-------|
| Template "CRAFT v2" → Global AI Instructions | **Layer 1** |
| App Insight Settings → `settings.aiContext` | **Layer 2** (chọn theo category) |
| Snapshot builder tự inject | **Layer 3** (invisible to UI) |
| Template sections → Section AI instruction | **Section instructions** (chung) |

### 8.3 Khi thêm app mới

```
1. Assign category (creative_utility / ai_chat / puzzle_game / ...) → Layer 2 tự có
2. Chạy snapshot → AppContextGenerator tự query top events → Layer 3 tự có
3. AI tự viết insight → Done. Không cần viết prompt gì thêm.
```
