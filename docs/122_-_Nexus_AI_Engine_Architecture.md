# 122 — Nexus AI Engine: Kiến trúc Tổng thể

> **Module:** Amobear Nexus — AI Engine Architecture Decision
> **Quyết định:** Hangfire + MCP Servers + Agentic Layer (không dùng OpenClaw)
> **Stack:** .NET Core 8 + Hangfire + MCP Servers + AI Providers + PostgreSQL + StarRocks
> **Reference:** 114 (AI SQL Assistant), 115 (Insight & Alert), 120 (Multi-Mediation), 121 (Health Intelligence)
> **Version:** 1.0 — 2026-03-26

---

# 1. Câu hỏi gốc: Hangfire vs OpenClaw?

## 1.1 Phân tích OpenClaw

OpenClaw là open-source AI agent framework viral nhất 2026 (250K+ GitHub stars). Nó biến LLM thành autonomous agent — tự thực thi tasks, nhớ context, kết nối messaging (Telegram, Slack, WhatsApp).

**Điểm mạnh lý thuyết cho Nexus:**
- Multi-channel messaging (Telegram, Lark) — trùng nhu cầu notification
- Persistent memory across sessions
- Skills system (modular extensions)
- Agent tự quyết định + hành động — phù hợp tầm nhìn L3/L4 autonomy

**Nhưng — khi đánh giá cho production system like Nexus:**

```mermaid
flowchart TB
    subgraph Pros["✅ ĐIỂM MẠNH"]
        P1["Agent tự hành động<br/>phù hợp L3/L4 vision"]
        P2["Multi-channel messaging<br/>Telegram, Lark, Slack built-in"]
        P3["Persistent memory<br/>cross-session context"]
        P4["Skills ecosystem<br/>1000+ community plugins"]
    end

    subgraph Cons["❌ VẤN ĐỀ NGHIÊM TRỌNG"]
        C1["🔴 SECURITY: 512 vulnerabilities<br/>reported, 8 critical CVEs<br/>41% ClawHub skills có lỗ hổng"]
        C2["🔴 NOT ENTERPRISE-READY<br/>No governance, no audit trail<br/>Founder đã rời đi OpenAI"]
        C3["🔴 ARCHITECTURE MISMATCH<br/>Local-first (1 user, 1 machine)<br/>Nexus cần multi-user, server-side"]
        C4["🟡 NODE.JS STACK<br/>Nexus = .NET Core 8<br/>Thêm runtime dependency"]
        C5["🟡 KHÔNG CÓ RBAC<br/>Không có concept per-user<br/>data access control"]
        C6["🟡 UNPREDICTABLE COST<br/>Agent tự quyết query bao nhiêu<br/>Không control token budget"]
    end

    style Cons fill:#ffebee
    style Pros fill:#e8f5e9
```

## 1.2 Verdict: KHÔNG dùng OpenClaw cho Nexus

| Tiêu chí | Yêu cầu Nexus | OpenClaw | Verdict |
|---|---|---|---|
| **Security** | On-premise, data sovereignty, audit trail | 512 vulnerabilities, prompt injection risk | ❌ Fail |
| **Multi-user** | 50+ users, role-based, per-user data access | Single-user, personal assistant | ❌ Fail |
| **Stack** | .NET Core 8 ecosystem | Node.js | ❌ Mismatch |
| **Reliability** | 5 AM batch, 200 apps, zero failure tolerance | "Too dangerous for non-technical users" (maintainer quote) | ❌ Fail |
| **Cost control** | Predictable $2-5/day | Agent decides how many queries to run | ❌ Uncontrolled |
| **Scheduling** | Cron, event-driven, pipeline triggers | Cron basic, designed for interactive | 🟡 Weak |
| **Data governance** | WHERE injection, app_access policy | No concept of data governance | ❌ Fail |

**Kết luận:** OpenClaw là proof-of-concept tuyệt vời cho personal AI agent, nhưng fundamentally không phù hợp production enterprise system. Rủi ro bảo mật + kiến trúc single-user + stack mismatch = đủ lý do để loại.

## 1.3 Thay vào đó: Build Agentic Capabilities IN Nexus

Ý tưởng đúng của OpenClaw (AI tự hành động, multi-step reasoning, persistent memory) hoàn toàn có thể build trong Nexus mà không cần OpenClaw framework:

```mermaid
flowchart LR
    subgraph OpenClaw["OpenClaw Approach<br/>❌ KHÔNG DÙNG"]
        OC1["OpenClaw Gateway<br/>(Node.js, external)"]
        OC2["Skills (unvetted)"]
        OC3["Single-user"]
    end

    subgraph Nexus["Nexus Approach<br/>✅ SỬ DỤNG"]
        N1["Nexus AI Engine<br/>(.NET Core 8, built-in)"]
        N2["MCP Servers<br/>(StarRocks + PostgreSQL)"]
        N3["CRAFT Pipeline<br/>(batch, controlled)"]
        N4["Multi-user RBAC"]
    end

    OpenClaw -.->|"Lấy ý tưởng,<br/>không lấy code"| Nexus

    style OpenClaw fill:#ffebee
    style Nexus fill:#e8f5e9
```

---

# 2. Kiến trúc Tổng thể: Nexus AI Engine

## 2.1 Ba tầng AI

```mermaid
flowchart TB
    subgraph Layer1["LAYER 1: SCHEDULED INTELLIGENCE<br/>⏰ Hangfire — Batch, Predictable"]
        L1A["Daily Insight Pipeline<br/>200 apps × 12 queries × 8 dimensions<br/>5:00 AM → 6:30 AM"]
        L1B["Alert Evaluation Engine<br/>Every 15 min hoặc after pipeline<br/>Evaluate rules vs StarRocks"]
        L1C["Benchmark Refresh<br/>Weekly Sunday 3:00 AM<br/>Quality scoring + extraction"]
        L1D["Anomaly Detection<br/>Rule-based, pre-AI<br/>Threshold checks"]
    end

    subgraph Layer2["LAYER 2: INTERACTIVE INTELLIGENCE<br/>💬 MCP Servers — Real-time, User-driven"]
        L2A["AI Chat with MCP<br/>User hỏi → AI tự query StarRocks<br/>Multi-step reasoning"]
        L2B["Alert Builder via AI<br/>Parse intent → validate data<br/>→ generate rule"]
        L2C["Insight Investigation<br/>Daily insight → click investigate<br/>→ AI drill-down via MCP"]
        L2D["Cross-app Comparison<br/>AI query multiple apps<br/>Generate comparison"]
    end

    subgraph Layer3["LAYER 3: AGENTIC INTELLIGENCE<br/>🤖 Auto-actions — Semi-autonomous"]
        L3A["Auto-create Experiment<br/>Confidence > 80% → tự tạo AB test<br/>(FG2 Experiment Engine)"]
        L3B["Auto-apply Waterfall<br/>Confidence > 95% → tự apply<br/>(validated pattern)"]
        L3C["Auto-adjust UA Budget<br/>ROAS < threshold → reduce<br/>(with approval workflow)"]
        L3D["Auto-escalate<br/>Critical issue 2+ ngày → escalate<br/>to BOD automatically"]
    end

    Layer1 -->|"Scheduled results<br/>feed into"| Layer2
    Layer2 -->|"Investigation insights<br/>inform"| Layer3
    Layer3 -->|"Actions generate<br/>new data for"| Layer1

    style Layer1 fill:#e3f2fd
    style Layer2 fill:#e8f5e9
    style Layer3 fill:#fff3e0
```

## 2.2 Vì sao 3 layers?

| Layer | Engine | Khi nào chạy | AI Model | Cost Model | Autonomy |
|---|---|---|---|---|---|
| **L1: Scheduled** | Hangfire | Cron/Event triggers | CRAFT → AI API | Fixed ~$2/day | L1-L2 |
| **L2: Interactive** | MCP Servers | User-triggered | AI + MCP tools | Pay-per-session ~$1-2/session | L2 |
| **L3: Agentic** | Hangfire + Rules Engine | Condition-triggered | CRAFT + MCP hybrid | Per-action ~$0.10 | L3-L4 |

---

# 3. Layer 1: Scheduled Intelligence (Hangfire)

## 3.1 Tại sao giữ Hangfire?

```mermaid
flowchart LR
    subgraph HF["HANGFIRE — ĐÃ PROVEN"]
        H1["✅ .NET native<br/>Không thêm runtime"]
        H2["✅ Dashboard UI<br/>Monitor jobs, retry, logs"]
        H3["✅ Cron + Event triggers<br/>After pipeline, weekly, custom"]
        H4["✅ Retry với backoff<br/>Failed jobs auto-retry"]
        H5["✅ Parallel execution<br/>10 apps concurrent"]
        H6["✅ Team đã quen<br/>Đang chạy production"]
    end

    subgraph Jobs["SCHEDULED JOBS"]
        J1["🕐 2:00 AM — Data Sync<br/>AdMob, Firebase, etc."]
        J2["🕐 4:00 AM — Transform<br/>Bronze → Silver → Gold"]
        J3["🕐 5:00 AM — Insight Gen<br/>12 queries × 200 apps"]
        J4["🕐 5:00 AM — Alert Eval<br/>Check all active rules"]
        J5["🕐 6:30 AM — Notify<br/>Push insights + alerts"]
        J6["🕐 Sunday 3 AM — Benchmark<br/>Quality score + extract"]
        J7["🕐 Every 15 min — Alert<br/>Re-evaluate triggered rules"]
    end

    HF --> Jobs
```

## 3.2 Daily Insight Pipeline (v2 — 8 dimensions)

```mermaid
sequenceDiagram
    participant HF as Hangfire
    participant SR as StarRocks (Gold)
    participant PG as PostgreSQL
    participant AI as AI Provider (Claude)
    participant STORE as Insight Storage
    participant NOTIFY as Notification Router

    Note over HF: 5:00 AM — Pipeline complete event

    HF->>PG: Load active apps (top 200 by revenue)
    HF->>PG: Load insight template per app category

    loop Per app (parallel 10)
        HF->>SR: Query 1: Revenue multi-source (AdMob + AppLovin + IAP)
        HF->>SR: Query 2: Ad Infra (SoW, fill, quality, benchmark)
        HF->>SR: Query 3: Growth (installs, CPI, ROAS from Adjust/XMP/Meta)
        HF->>SR: Query 4: Engagement (DAU, sessions, stickiness from Firebase/AppMetrica)
        HF->>SR: Query 5: Retention (D1/D7/D30 cohort from Adjust + Firebase)
        HF->>SR: Query 6: Product (levels, crashes, features)
        HF->>SR: Query 7: Geo breakdown
        HF->>SR: Query 8: Unit Economics (LTV, CAC, payback)
        HF->>SR: Query 9: Portfolio position (rank, benchmark)
        HF->>SR: Query 10: Optimization velocity (actions, experiments)
        HF->>SR: Query 11: Campaign ROAS detail
        HF->>SR: Query 12: Cohort LTV curve

        HF->>HF: Rule-based anomaly detection (thresholds)
        HF->>HF: Calculate 8 dimension scores (0-100 each)
        HF->>HF: Calculate composite health score + tier

        HF->>PG: Load app context & scenarios
        HF->>HF: Build CRAFT prompt (template + data + context + anomalies)

        HF->>AI: Generate insight (1 API call, ~3000 tokens out)
        AI-->>HF: Markdown insight with mermaid charts

        HF->>STORE: Save insight + scores + radar data
        HF->>NOTIFY: Queue notifications (anomaly apps only)
    end

    Note over HF: ~6:30 AM — All insights ready
    HF->>NOTIFY: Batch send Telegram/Lark summaries
```

## 3.3 Alert Evaluation Pipeline

```mermaid
flowchart TB
    TRIGGER["⏰ Trigger:<br/>After pipeline (5:30 AM)<br/>OR every 15 min"]

    LOAD["Load active alert rules<br/>from PostgreSQL<br/>(system + user, unified table)"]

    subgraph Eval["EVALUATION (per rule)"]
        E1["Parse rule: metric, condition,<br/>threshold, app_scope"]
        E2["Generate SQL from rule definition"]
        E3["Execute against StarRocks Gold layer"]
        E4{"Breached?"}
        E5["Create triggered_alert record"]
        E6["Log: evaluation OK, skip"]
    end

    subgraph Notify["NOTIFICATION ROUTING"]
        N1{"Alert scope?"}
        N2["System → all users<br/>assigned to affected apps"]
        N3["User → alert owner only"]
        N4["In-app bell notification"]
        N5["Telegram/Lark DM or group"]
        N6["Email (critical only)"]
    end

    TRIGGER --> LOAD --> Eval
    E1 --> E2 --> E3 --> E4
    E4 -->|"Yes"| E5 --> Notify
    E4 -->|"No"| E6

    N1 -->|"system"| N2
    N1 -->|"user"| N3
    N2 --> N4 & N5 & N6
    N3 --> N4 & N5
```

---

# 4. Layer 2: Interactive Intelligence (MCP Servers)

## 4.1 Kiến trúc MCP

```mermaid
flowchart TB
    subgraph Users["👤 USERS"]
        U1["AI Chat UI<br/>(web interface)"]
        U2["Investigate button<br/>(from insight viewer)"]
        U3["Alert Builder<br/>(create via AI)"]
    end

    subgraph Proxy["🔒 MCP PROXY (Nexus Backend)<br/>.NET Core 8"]
        P1["Authentication<br/>Verify user JWT token"]
        P2["Authorization<br/>Load user_app_access"]
        P3["Query Rewriter<br/>Inject WHERE app_id IN (...)"]
        P4["Rate Limiter<br/>Max 10 queries per session"]
        P5["Cost Tracker<br/>Log token usage per user"]
        P6["Audit Logger<br/>Log all queries for compliance"]
    end

    subgraph MCP["🔌 MCP SERVERS (on-premise)"]
        M1["StarRocks MCP Server<br/>github.com/StarRocks/mcp-server-starrocks<br/>Streamable HTTP mode<br/>Port 8080"]
        M2["PostgreSQL MCP Server<br/>Read-only access<br/>Port 8081"]
    end

    subgraph DB["🗄️ DATABASES"]
        D1["StarRocks<br/>Gold layer views only<br/>nexus_ai_readonly user"]
        D2["PostgreSQL<br/>Config tables only<br/>nexus_ai_readonly user"]
    end

    subgraph AI["🧠 AI PROVIDERS"]
        A1["Claude API<br/>(primary)"]
        A2["Gemini API<br/>(fallback)"]
    end

    Users --> AI
    AI <-->|"MCP tool calls"| Proxy
    Proxy --> MCP
    M1 <--> D1
    M2 <--> D2

    style Proxy fill:#fff3e0
```

## 4.2 MCP Proxy — Tại sao cần?

Đây là component QUAN TRỌNG NHẤT trong kiến trúc MCP. Không bao giờ expose MCP server trực tiếp cho AI.

```mermaid
flowchart LR
    subgraph Wrong["❌ SAI: AI → MCP → DB trực tiếp"]
        W1["AI gọi read_query(...)"]
        W2["MCP forward tới StarRocks"]
        W3["🔴 AI có thể query BẤT KỲ data nào<br/>Không có per-user filter<br/>Không có audit trail"]
    end

    subgraph Right["✅ ĐÚNG: AI → Proxy → MCP → DB"]
        R1["AI gọi read_query(...)"]
        R2["Proxy check user identity"]
        R3["Proxy inject WHERE app_id IN (user's apps)"]
        R4["Proxy forward modified query → MCP"]
        R5["✅ User chỉ thấy data của mình<br/>✅ Audit log đầy đủ<br/>✅ Rate limit, cost tracking"]
    end

    style Wrong fill:#ffebee
    style Right fill:#e8f5e9
```

## 4.3 Ba luồng Interactive

### Luồng A: AI Chat — Free exploration

```mermaid
sequenceDiagram
    participant User as User (DA team)
    participant UI as AI Chat UI
    participant AI as Claude API
    participant Proxy as MCP Proxy
    participant SR as StarRocks MCP
    participant PG as PostgreSQL MCP

    User->>UI: "Tại sao revenue Puzzle Blast giảm 25%?"
    UI->>AI: User message + system prompt + MCP tools available

    AI->>Proxy: read_query("SELECT date, revenue, ecpm, dau FROM gold.fact_daily_app_metrics WHERE app_id='puzzle_blast' ORDER BY date DESC LIMIT 14")
    Proxy->>Proxy: Verify user has access to puzzle_blast ✅
    Proxy->>Proxy: Audit log: user=quang, query=...
    Proxy->>SR: Forward query
    SR-->>Proxy: Results (14 rows)
    Proxy-->>AI: Results

    Note over AI: Revenue dropping since Mar 19. eCPM also dropping.

    AI->>Proxy: read_query("SELECT ad_format, ecpm, fill_rate FROM gold.fact_ad_performance WHERE app_id='puzzle_blast' AND date >= '2026-03-15'")
    Proxy->>SR: Forward (after access check)
    SR-->>AI: Results via Proxy

    Note over AI: Interstitial eCPM -18%, fill rate -8%

    AI->>Proxy: read_query("SELECT country, revenue, ecpm FROM gold... WHERE app_id='puzzle_blast' AND date='2026-03-22' ORDER BY revenue DESC LIMIT 5")
    SR-->>AI: Results via Proxy

    AI-->>UI: "Revenue giảm 25% chủ yếu do:<br/>1. eCPM Interstitial giảm 18% (từ $5.80 → $4.75)<br/>2. Fill rate giảm từ 92% → 84% ở US market<br/>3. Interstitial chiếm 32% IAA revenue<br/><br/>Root cause có thể: AdMob network issue hoặc waterfall floor cần adjust.<br/><br/>Khuyến nghị: [Mediation] Review waterfall floor cho Interstitial format."
    UI-->>User: Hiển thị kết quả + charts
```

### Luồng B: Insight → Investigate (Hybrid)

```mermaid
sequenceDiagram
    participant User as User
    participant Viewer as Insight Viewer
    participant Chat as AI Chat (MCP)
    participant AI as Claude + MCP

    User->>Viewer: Đọc Daily Insight
    Note over Viewer: "🔴 D1 Retention ↓4pp (40% → 36%)"

    User->>Viewer: Click "🔍 Investigate"
    
    Viewer->>Chat: Open AI Chat sidebar with PRE-LOADED context:
    Note over Chat: Context injected:<br/>- App: Puzzle Blast<br/>- Health Score: 72/100<br/>- 8 dimension scores<br/>- Anomalies detected<br/>- App scenarios (game design, levels)<br/>- MCP tools: StarRocks + PostgreSQL

    Chat->>AI: System prompt + insight context + MCP tools

    AI-->>Chat: "Tôi đã đọc insight hôm nay. D1 Retention giảm từ 40% → 36%.<br/>Tôi sẽ drill down để tìm root cause..."

    AI->>AI: Tool: read_query("SELECT app_version, COUNT(*), AVG(retention_d1) FROM ... GROUP BY app_version")
    Note over AI: v3.2.1: D1=35.8% vs v3.2.0: D1=40.2%

    AI->>AI: Tool: read_query("SELECT date, crash_free_rate FROM ... WHERE app_id='puzzle_blast'")
    Note over AI: Crash-free dropped from 99.7% to 99.3% since v3.2.1

    AI->>AI: Tool: read_query("SELECT level_id, drop_rate FROM ... WHERE drop_rate > 0.15 ORDER BY drop_rate DESC")
    Note over AI: Level 45: drop_rate 22% (was 14%)

    AI-->>Chat: "Root cause xác định:<br/>1. Version 3.2.1 (released 19/03) → D1 giảm 4pp<br/>2. Crash rate tăng 0.4% cùng thời điểm<br/>3. Level 45 drop_rate tăng từ 14% → 22%<br/><br/>[mermaid flowchart: investigation path]<br/><br/>Actions:<br/>🔴 [Dev] Check v3.2.1 crash logs — priority hotfix<br/>🟡 [Game] Review level 45 difficulty"

    Chat-->>User: Interactive results with charts + actions
```

### Luồng C: Alert Builder + MCP validation

```mermaid
sequenceDiagram
    participant User as User
    participant AI as Claude + MCP
    participant SR as StarRocks via MCP Proxy

    User->>AI: "Báo tôi khi eCPM puzzle blast < $5"

    AI->>SR: read_query("SELECT AVG(ecpm) as avg_7d FROM gold... WHERE app_id='puzzle_blast' AND date >= DATE_SUB(CURDATE(), 7)")
    SR-->>AI: avg_7d = $7.20

    AI->>SR: read_query("SELECT MIN(ecpm) as min_7d FROM gold... WHERE app_id='puzzle_blast' AND date >= DATE_SUB(CURDATE(), 7)")
    SR-->>AI: min_7d = $6.50

    AI-->>User: "eCPM hiện tại $7.20 (7d avg).<br/>Threshold $5.00 = giảm 30%, nghiêm trọng.<br/><br/>📋 Alert Preview:<br/>Metric: eCPM<br/>App: Puzzle Blast<br/>Condition: < $5.00<br/>Severity: 🟡 Warning<br/><br/>💡 Tại sao Warning? $5.00 là mức đáng lo<br/>nhưng chưa phải crisis (min 7d: $6.50).<br/>Muốn đổi Critical? Hoặc tạo luôn?"

    User->>AI: "Tạo đi"
    AI->>AI: POST /api/Alerts/rules (via Nexus API)
    AI-->>User: "✅ Alert đã tạo!"
```

---

# 5. Layer 3: Agentic Intelligence (Semi-Autonomous)

## 5.1 Từ Advisory → Auto-Action

Layer 3 là nơi Nexus bắt đầu TỰ HÀNH ĐỘNG — nhưng có kiểm soát, không phải OpenClaw-style "agent wild".

```mermaid
flowchart TB
    subgraph Trigger["TRIGGERS (từ Layer 1 + 2)"]
        T1["Daily insight phát hiện anomaly"]
        T2["Alert triggered + confidence score"]
        T3["Recommendation pending > 3 ngày"]
        T4["Benchmark detect app/GEO mới"]
    end

    subgraph Decide["DECISION ENGINE (Rules + Confidence)"]
        D1{"Confidence<br/>score?"}
        D2["≥ 95%: Pattern validated<br/>qua ≥ 3 AB tests trước"]
        D3["80-94%: Strong benchmark<br/>hoặc similar pattern 1-2 lần"]
        D4["60-79%: Reasonable<br/>nhưng chưa validated"]
        D5["< 60%: Insufficient data"]
    end

    subgraph Action["AUTO-ACTIONS"]
        A1["⚡ AUTO-APPLY<br/>Confidence ≥ 95%<br/>Apply waterfall change<br/>via AdMob Write API"]
        A2["🧪 AUTO-EXPERIMENT<br/>Confidence 80-94%<br/>Create AB test (FG2)<br/>Control vs suggested"]
        A3["📋 SUGGEST + NOTIFY<br/>Confidence 60-79%<br/>Suggest action, wait approval"]
        A4["💬 FLAG FOR DA<br/>Confidence < 60%<br/>Need human deep-dive"]
    end

    subgraph Safety["🔒 SAFETY GUARDRAILS"]
        S1["Max auto-actions per day: 10"]
        S2["Revenue impact limit: ≤ 5% of app revenue"]
        S3["Mandatory 24h review window after auto-apply"]
        S4["Auto-rollback if metric degrades > 10%"]
        S5["All auto-actions logged + notified to owner"]
        S6["Kill switch: admin can disable per app"]
    end

    Trigger --> Decide
    D1 -->|"≥ 95%"| D2 --> A1
    D1 -->|"80-94%"| D3 --> A2
    D1 -->|"60-79%"| D4 --> A3
    D1 -->|"< 60%"| D5 --> A4
    
    A1 & A2 --> Safety
```

## 5.2 Ví dụ Auto-Actions

| Trigger | Confidence | Action | Safety |
|---|---|---|---|
| eCPM giảm 15%, pattern đã validate 5 lần | 96% | Auto-adjust waterfall floor -10% | Rollback nếu revenue giảm thêm |
| App mới launch, benchmark available | 88% | Auto-create AB test: benchmark vs blank | Test 7 ngày, auto-conclude |
| ROAS < 0.8 trên campaign cụ thể | 72% | Suggest: pause campaign | Notify UA team, wait approval |
| D1 retention drop, nhiều nguyên nhân có thể | 45% | Flag cho DA team deep-dive | Không auto-action |

## 5.3 Implementation: Hangfire + Rules Engine (không cần OpenClaw)

```mermaid
flowchart LR
    subgraph Hangfire["HANGFIRE JOB: AgenticEvaluator<br/>Chạy sau mỗi insight generation"]
        H1["Load all auto-action rules"]
        H2["Match against latest insight data"]
        H3["Calculate confidence per match"]
        H4["Execute approved actions"]
        H5["Log + notify"]
    end

    subgraph Rules["RULES ENGINE (PostgreSQL)"]
        R1["auto_action_rules table<br/>condition, confidence_threshold,<br/>action_type, safety_limits"]
        R2["auto_action_history table<br/>executed, result, rollback_status"]
    end

    subgraph APIs["EXTERNAL APIs"]
        A1["AdMob Write API<br/>(waterfall changes)"]
        A2["Experiment Engine API<br/>(create AB test)"]
        A3["Notification Router<br/>(Telegram, Lark)"]
    end

    Hangfire --> Rules
    Hangfire --> APIs
```

**Key insight:** Layer 3 KHÔNG CẦN OpenClaw vì:
- Auto-actions là RULE-BASED + CONFIDENCE SCORE, không phải "AI tự quyết"
- Hangfire job chạy evaluation loop, giống alert evaluation nhưng với action execution
- Safety guardrails là code logic, không phải AI judgment
- Tất cả đều trong .NET ecosystem đã có

---

# 6. Tổng hợp: Flow Toàn bộ 24 giờ

```mermaid
flowchart TB
    subgraph Night["🌙 2:00-5:00 AM — DATA PIPELINE"]
        N1["2:00 AM — Hangfire: Sync all sources<br/>AdMob, Firebase, AppLovin, AppMetrica, Adjust, XMP"]
        N2["4:00 AM — Hangfire: Transform<br/>Bronze → Silver → Gold"]
        N3["4:30 AM — Hangfire: SoW + Recommendations"]
    end

    subgraph Dawn["🌅 5:00-7:00 AM — INTELLIGENCE GENERATION"]
        D1["5:00 AM — Hangfire: Insight Pipeline (Layer 1)<br/>12 queries × 200 apps × 8 dimensions<br/>CRAFT prompt → AI → Markdown + Radar"]
        D2["5:30 AM — Hangfire: Alert Evaluation (Layer 1)<br/>Check all rules against fresh data"]
        D3["6:00 AM — Hangfire: Agentic Evaluator (Layer 3)<br/>Check auto-action rules, execute high-confidence"]
        D4["6:30 AM — Hangfire: Notify<br/>Push insights + alerts + auto-action reports"]
    end

    subgraph Morning["☀️ 7:00-9:00 AM — TEAM ARRIVES"]
        M1["Team mở Nexus<br/>Daily Insights feed ready"]
        M2["Review radar charts<br/>Check anomalies"]
        M3["Review auto-actions taken<br/>(nếu có L3 actions)"]
    end

    subgraph Day["📊 9:00 AM+ — INTERACTIVE WORK"]
        DA1["💬 AI Chat (Layer 2, MCP)<br/>Investigation, deep-dive"]
        DA2["🔔 Alert Builder (Layer 2, MCP)<br/>Create personal alerts"]
        DA3["📋 Manual Actions<br/>Review + apply recommendations"]
        DA4["🧪 Experiments<br/>Launch, monitor, conclude"]
    end

    subgraph Continuous["🔄 CONTINUOUS (24/7)"]
        C1["Every 15 min — Alert re-evaluation"]
        C2["On-demand — AI Chat sessions"]
        C3["Weekly — Benchmark refresh"]
    end

    Night --> Dawn --> Morning --> Day
    Continuous -.-> Day

    style Night fill:#1a237e,color:#fff
    style Dawn fill:#e65100,color:#fff
    style Morning fill:#2e7d32,color:#fff
    style Day fill:#e3f2fd
```

---

# 7. Component Matrix

| Component | Engine | Layer | Existing? | Effort |
|---|---|---|---|---|
| Data Sync Jobs | Hangfire | L1 | ✅ Có | 0 |
| Transform Pipeline | Hangfire | L1 | ✅ Có | 0 |
| SoW + Recommendations | Hangfire | L1 | ✅ Có | 0 |
| Insight Generator (v1) | Hangfire + CRAFT | L1 | 🔶 Doc 115 | 3 tuần |
| Insight Generator (v2 — 8 dimensions) | Hangfire + CRAFT | L1 | 🆕 Doc 121 | +2 tuần |
| Alert Evaluation Engine | Hangfire | L1 | 🔶 Doc 115 | 2 tuần |
| Benchmark Engine | Hangfire | L1 | 🆕 Doc 120 FG1 | 3 tuần |
| **StarRocks MCP Server** | **MCP (official)** | **L2** | **🆕 Deploy** | **3 ngày** |
| **PostgreSQL MCP Server** | **MCP (community)** | **L2** | **🆕 Deploy** | **2 ngày** |
| **MCP Proxy (auth + RLS)** | **.NET Core 8** | **L2** | **🆕 Build** | **1 tuần** |
| AI Chat + MCP integration | MCP + AI API | L2 | 🆕 | 2 tuần |
| Insight → Investigate bridge | Hybrid | L2 | 🆕 | 1 tuần |
| Alert Builder + MCP validation | MCP + CRAFT | L2 | 🔶 Doc 115 | +1 tuần |
| **Agentic Evaluator** | **Hangfire + Rules** | **L3** | **🆕 Build** | **2 tuần** |
| Auto-action Safety Guardrails | .NET Core 8 | L3 | 🆕 | 1 tuần |
| Experiment auto-create | Hangfire + FG2 API | L3 | 🆕 Cần FG2 | Sau FG2 |

---

# 8. Roadmap 6 tháng

```mermaid
gantt
    title Nexus AI Engine — 6 Month Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Layer 1 — Scheduled (Hangfire)
    Insight v1 (doc 115 — 7 queries)        :l1a, 2026-04-07, 15d
    Alert Evaluation Engine                  :l1b, 2026-04-07, 10d
    Insight v2 (doc 121 — 12q, 8 dims)      :l1c, after l1a, 10d
    Benchmark Engine (doc 120 FG1)           :l1d, 2026-04-07, 15d
    L1 Complete                              :milestone, m1, after l1c, 0d

    section Layer 2 — Interactive (MCP)
    Deploy StarRocks MCP + PostgreSQL MCP    :l2a, 2026-04-21, 5d
    MCP Proxy (auth, RLS, audit)             :l2b, after l2a, 7d
    AI Chat + MCP integration                :l2c, after l2b, 10d
    Insight → Investigate bridge             :l2d, after m1, 7d
    Alert Builder + MCP validation           :l2e, after l2c, 5d
    L2 Complete                              :milestone, m2, after l2e, 0d

    section Layer 3 — Agentic
    Auto-action rules engine                 :l3a, after m2, 10d
    Safety guardrails + rollback             :l3b, after l3a, 5d
    Auto-experiment creation (needs FG2)     :l3c, 2026-06-15, 10d
    Auto-apply waterfall (validated only)    :l3d, after l3c, 7d
    L3 MVP Complete                          :milestone, m3, after l3d, 0d

    section Cross-cutting
    Role-specific views for insights         :cc1, after m1, 7d
    Radar chart UI component                 :cc2, after m1, 5d
    Notification enhancement (Telegram/Lark) :cc3, 2026-04-14, 10d
    Autonomy Level tracking dashboard        :cc4, after m3, 5d
```

### 30-60-90 Day Checklist

**30 ngày (Tháng 4):**
- [ ] Layer 1: Insight v1 live (7 queries, CRAFT pipeline)
- [ ] Layer 1: Alert Evaluation Engine live (15-min cycle)
- [ ] Layer 1: Benchmark Engine FG1 (quality scoring, extraction)
- [ ] Layer 2: StarRocks MCP + PostgreSQL MCP deployed on IDC
- [ ] Layer 2: MCP Proxy service running with auth + RLS injection
- [ ] Validate: team nhận daily insight lúc 7 AM, format OK?

**60 ngày (Tháng 5):**
- [ ] Layer 1: Insight v2 live (12 queries, 8 dimensions, radar chart)
- [ ] Layer 2: AI Chat + MCP hoạt động — DA team dùng hàng ngày
- [ ] Layer 2: Insight → Investigate bridge hoạt động
- [ ] Layer 2: Alert Builder + MCP validation
- [ ] Role-specific views: mỗi role thấy insight khác nhau
- [ ] Đo lường: investigation time giảm bao nhiêu?

**90 ngày (Tháng 6):**
- [ ] Layer 3: Agentic evaluator MVP — auto-create experiments
- [ ] Layer 3: Safety guardrails proven (rollback tested)
- [ ] Layer 3: Auto-apply waterfall cho validated patterns
- [ ] Autonomy Level tracking: bao nhiêu app ở L1/L2/L3?
- [ ] Portfolio health intelligence: aggregate all apps

---

# 9. Cost Summary

| Component | Monthly Cost | Notes |
|---|---|---|
| Hangfire jobs (existing) | $0 | .NET native, no license |
| StarRocks MCP Server | $0 | Open-source, runs on existing IDC |
| PostgreSQL MCP Server | $0 | Open-source, runs on existing IDC |
| MCP Proxy | $0 | Custom .NET service, self-hosted |
| AI tokens — Batch insight | ~$60/month | 200 apps × $0.01 × 30 days |
| AI tokens — Interactive MCP | ~$90/month | ~3 sessions/day × $1.5 × 20 workdays |
| AI tokens — Alert Builder | ~$10/month | ~100 alerts/month × $0.10 |
| AI tokens — Agentic actions | ~$15/month | ~150 auto-evaluations × $0.10 |
| **Total AI infra cost** | **~$175/month** | **Cho entire AI engine** |

---

# 10. Risk & Mitigation

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | MCP Proxy bypass | 🔴 Data leak | MCP servers KHÔNG expose external port. Chỉ Proxy có network access |
| 2 | AI query expensive Gold tables | 🟡 Performance | StarRocks query governor: max 10s timeout, max 10K rows return |
| 3 | Auto-action gây revenue drop | 🔴 Revenue loss | Safety guardrails: 5% revenue cap, 24h review, auto-rollback, kill switch |
| 4 | Token cost spike (MCP sessions) | 🟡 Budget | Per-user daily limit (20K tokens), per-session limit (10 queries) |
| 5 | StarRocks MCP server instability | 🟡 Service down | Graceful degradation: AI Chat falls back to "suggest SQL" mode |
| 6 | Audit compliance | 🟡 Governance | MCP Proxy logs every query: who, when, what, result row count |
| 7 | AI hallucinate wrong SQL | 🟡 Wrong data | Read-only MCP user. Proxy validates SQL syntax before forward |

---

# 11. Tổng kết: Tại sao kiến trúc này tốt hơn OpenClaw

```mermaid
flowchart LR
    subgraph Nexus["NEXUS AI ENGINE"]
        direction TB
        N1["✅ .NET native — no new runtime"]
        N2["✅ Multi-user RBAC — 50+ users"]
        N3["✅ On-premise — data sovereignty"]
        N4["✅ Cost-controlled — per-layer budget"]
        N5["✅ Production-proven — Hangfire years"]
        N6["✅ MCP for interactivity — best of both"]
        N7["✅ Agentic with guardrails — not wild agent"]
        N8["✅ Audit trail — every query logged"]
    end

    style Nexus fill:#e8f5e9
```

**Nguyên tắc thiết kế:**

| Nguyên tắc | Giải thích |
|---|---|
| **Batch ≠ Interactive** | Dùng đúng tool cho đúng việc. Hangfire cho batch, MCP cho interactive |
| **Proxy everything** | AI KHÔNG BAO GIỜ truy cập DB trực tiếp. Mọi thứ qua Proxy |
| **Confidence before action** | Auto-action CHỈ khi confidence ≥ threshold + safety limits |
| **Graceful degradation** | MCP down → AI Chat vẫn hoạt động (suggest SQL mode). Batch insight không bị ảnh hưởng |
| **Cost predictability** | Batch cost cố định. Interactive cost có cap. Agentic cost per-action |
| **Own the stack** | Không dependency vào framework bên ngoài. Mọi thứ trong .NET ecosystem |

---

> **Quyết định cuối cùng:**
>
> | Câu hỏi | Trả lời |
> |---|---|
> | Hangfire hay OpenClaw? | **Hangfire** — cho batch/scheduled. Không dùng OpenClaw |
> | Thêm gì mới? | **MCP Servers** — cho interactive AI. **Agentic Rules Engine** — cho auto-actions |
> | OpenClaw có vai trò gì? | **Inspiration only** — ý tưởng agent tốt, implementation không phù hợp enterprise |
> | Chi phí thêm? | **~$175/month** AI tokens. $0 infrastructure (self-hosted MCP) |
> | Timeline? | L1 (tháng 4) → L2 (tháng 5) → L3 (tháng 6) — 3 tháng cho full AI engine |
