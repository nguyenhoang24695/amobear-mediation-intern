# Amobear Nexus — Specialized AI Agents UI/UX Spec for V0
## Design system + Component library + V0 prompt templates

> **Phiên bản:** v1.0
> **Ngày:** 2026-04-29
> **Mục đích:** Tài liệu trực tiếp feed Vercel V0 để sinh giao diện cho 8 personas + Admin UI + AI Hub.
>
> **Tài liệu liên quan (bắt buộc đọc cùng):**
> - [10 - Nexus_AI_Specialized_Agents_Upgrade_Plan.md](./10%20-%20Nexus_AI_Specialized_Agents_Upgrade_Plan.md) — schema, persona, output JSON
> - [13 - Nexus_AI_Specialized_Agents_Mock_Data_Samples.md](./13%20-%20Nexus_AI_Specialized_Agents_Mock_Data_Samples.md) — sample data realistic
> - [01 - App_Insight_V1_Daily_Report_Structure.md](./01%20-%20App_Insight_V1_Daily_Report_Structure.md) — layout chuẩn V1
>
> **Stack target (đã có trong `frontend/package.json`):**
> - Next.js 16 + React 19
> - Tailwind CSS 4 + shadcn/ui (Radix UI)
> - Recharts 2.15 (chart tương tác) + Mermaid 11 (diagram embed)
> - lucide-react icons
> - date-fns 4
> - react-hook-form + zod (form validation)
> - sonner (toast)

---

## Mục lục

1. [Nguyên tắc thiết kế](#1-nguyên-tắc-thiết-kế)
2. [Design System (color/typography/spacing/icons)](#2-design-system)
3. [Shared Component Library](#3-shared-component-library-storybook)
4. [Page-level Layouts (10 pages)](#4-page-level-layouts)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Responsive Behavior](#6-responsive-behavior)
7. [State Variations (Loading/Empty/Error)](#7-state-variations)
8. [V0 Prompt Templates](#8-v0-prompt-templates)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Phụ lục: Routing + URL Structure](#10-phụ-lục-routing--url-structure)

---

## 1. Nguyên tắc thiết kế

### 1.1 Triết lý

| Nguyên tắc | Mô tả |
|------------|-------|
| **Report-first, not card-grid** | Tuân thủ §17.0 doc 10. Linear scroll, score-first, mỗi section có KẾT LUẬN |
| **Persona consistency** | 8 personas chia sẻ cùng pattern (Header → Top Strip → Verdict → T+1 → Sections → Action Plan → Appendix). User switch persona không phải học lại |
| **Markdown-first** | UI render markdown từ AI. Mọi component phải support markdown export PDF |
| **Data-grounded** | Mọi số liệu hiển thị phải link với data source (badge "Gold/Silver/Bronze" + freshness) |
| **Action-oriented** | Mỗi insight kết thúc bằng action — UI có nút trigger ngay (Open A/B, Backlog, Brief Team) |
| **Drill-down chứ không thay thế** | "Investigate in [PO/DA/UA]" buttons — không tạo modal lồng |
| **Mobile-aware nhưng desktop-first** | BOD/DA xem trên desktop chính. Mobile chỉ cần read-only daily brief |

### 1.2 Brand & Tone

- **Tên app:** Amobear Nexus
- **Tone:** Professional, data-driven, Vietnamese (UI có thể Anh/Việt — default Việt)
- **Voice trong AI output:** Trực diện, có số liệu, có action tag

---

## 2. Design System

### 2.1 Color Palette

```css
/* Severity colors — dùng cho status, badges, alerts */
--severity-critical: #dc2626;     /* red-600 */
--severity-critical-bg: #fee2e2;   /* red-100 */
--severity-warning: #d97706;       /* amber-600 */
--severity-warning-bg: #fef3c7;    /* amber-100 */
--severity-positive: #16a34a;      /* green-600 */
--severity-positive-bg: #dcfce7;   /* green-100 */
--severity-tip: #7c3aed;           /* violet-600 */
--severity-tip-bg: #ede9fe;        /* violet-100 */
--severity-info: #2563eb;          /* blue-600 */

/* Tier colors — dùng cho health score badge */
--tier-s: #fbbf24;                 /* amber-400 — gold */
--tier-a: #16a34a;                 /* green-600 */
--tier-b: #2563eb;                 /* blue-600 */
--tier-c: #d97706;                 /* amber-600 */
--tier-d: #ea580c;                 /* orange-600 */
--tier-f: #dc2626;                 /* red-600 */

/* Persona accent colors */
--persona-app-insight: #6366f1;    /* indigo-500 */
--persona-product-owner: #14b8a6;  /* teal-500 */
--persona-data-analyst: #3b82f6;   /* blue-500 */
--persona-ua-marketing: #f59e0b;   /* amber-500 */
--persona-mediation: #8b5cf6;      /* violet-500 */
--persona-devops: #6b7280;         /* gray-500 */
--persona-qa: #10b981;             /* emerald-500 */
--persona-bod: #be185d;            /* pink-700 */

/* Data source layer badges */
--layer-gold: #ca8a04;             /* yellow-600 */
--layer-silver: #94a3b8;           /* slate-400 */
--layer-bronze: #ea580c;           /* orange-600 */
--layer-config: #2563eb;           /* blue-600 */

/* Trend icons */
--trend-up: #16a34a;
--trend-down: #dc2626;
--trend-flat: #6b7280;
```

> **Lưu ý:** dùng Tailwind tokens chuẩn (`text-red-600`, `bg-amber-100`, etc.) — KHÔNG hardcode hex trong component.

### 2.2 Typography

| Element | Class Tailwind | Note |
|---------|----------------|------|
| H1 (page title) | `text-2xl font-semibold` | App name + date |
| H2 (section) | `text-xl font-semibold` | "## 1. Funnel Diagnosis" |
| H3 (sub) | `text-lg font-medium` | Sub-section |
| Body | `text-sm leading-relaxed` | Default content |
| Metric value | `text-3xl font-bold tabular-nums` | Score 64, $4.2M |
| Metric label | `text-xs text-muted-foreground uppercase tracking-wider` | "BLENDED ROAS" |
| Code/SQL | `font-mono text-xs` | SQL blocks |
| KẾT LUẬN | `text-sm font-medium border-l-4 pl-4 py-2` | Color theo severity |

Font family: System UI stack (Inter fallback). KHÔNG dùng custom web font (giảm CLS).

### 2.3 Spacing & Layout Grid

```
Page max-width: 1440px (xl breakpoint)
Container padding: px-6 lg:px-8
Section gap (vertical): space-y-6
Card padding: p-6
Inline gap: gap-4

Top strip layout: grid-cols-1 lg:grid-cols-3 gap-6
Action plan table: max-w-full overflow-x-auto
```

### 2.4 Icons

Dùng `lucide-react`. Map persona → icon:

| Persona | Icon | Lucide name |
|---------|------|-------------|
| 🤖 App Insight | Bot | `Bot` |
| 🧭 Product Owner | Compass | `Compass` |
| 📊 Data Analyst | BarChart3 | `BarChart3` |
| 🎯 UA Marketing | Target | `Target` |
| 📡 Mediation | Radio | `Radio` |
| ⚙️ DevOps | Settings2 | `Settings2` |
| 🛡️ QA | ShieldCheck | `ShieldCheck` |
| 🏛️ BOD | Landmark | `Landmark` |

Severity icons: `AlertTriangle` (warning), `XCircle` (critical), `CheckCircle2` (positive), `Lightbulb` (tip).

Status icons: `ArrowUp` / `ArrowDown` / `Minus` cho trend.

---

## 3. Shared Component Library (Storybook)

> Đây là **12 reusable components** dùng chung cho 8 personas. FE team build trong Sprint 1. Tất cả có Storybook stories với mock data từ doc 13.

### 3.1 `<UnifiedReportShell>`

**Mục đích:** Wrapper layout cho mọi persona report. Chứa Header + Top Strip + Verdict + T+1 + slots cho Sections + Action Plan + Appendix.

**Props:**
```typescript
interface UnifiedReportShellProps {
  persona: PersonaId;          // app_insight | product_owner | data_analyst | ...
  appName: string;
  reportDate: string;          // ISO date
  playbookVersion?: number;
  owner?: string;              // email
  actions?: ReportAction[];    // [Re-run] [Export PDF] [Brief BOD] ...
  children: ReactNode;          // sections content
}
```

**Layout:** Sticky top header (Persona icon + App name + Date + Tier badge + actions). Body container max-w-5xl mx-auto py-6.

### 3.2 `<HealthScoreCard>`

**Props:**
```typescript
interface HealthScoreCardProps {
  score: number;              // 0-100
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  delta?: number;             // +3 / -7
  prevScore?: number;
  confidence?: number;        // 0-1
  label?: string;             // "PO HEALTH" / "STABILITY" / "PORTFOLIO"
}
```

**Visual:** Circle 120×120 với score, tier badge dưới, delta arrow + previous score, confidence dots.

### 3.3 `<RadarChart>`

**Mục đích:** Render mermaid radar-beta hoặc Recharts radar (fallback).

**Props:**
```typescript
interface RadarChartProps {
  axes: string[];                              // ["Revenue", "Growth", ...]
  current: number[];                           // [91, 35, 62, ...]
  previous?: number[];                         // T-1 line
  title?: string;
  rendererPreference?: 'mermaid' | 'recharts'; // default 'recharts' (interactive)
}
```

**Behavior:** Default Recharts (responsive + hoverable). Có toggle "Mermaid view" nếu user muốn export markdown.

### 3.4 `<DimensionScoresTable>`

**Props:**
```typescript
interface DimensionScoresTableProps {
  rows: Array<{
    dimension: string;
    score: number;
    trend: 'up' | 'down' | 'flat';
    delta?: number;
    weight?: number;
    status?: 'ok' | 'warning' | 'critical' | 'positive';
  }>;
}
```

**Visual:** Compact table 3-4 cột. Color row theo status. Trend icon inline.

### 3.5 `<VerdictBanner>`

**Props:**
```typescript
interface VerdictBannerProps {
  title: string;                  // "Product-Market Fit Slipping (B → C)"
  summary: string;                // 1-2 câu narrative
  confidence?: number;            // 0-1, render dots ●●●●○
  severity: 'critical' | 'warning' | 'positive' | 'info';
  signals?: string[];             // ["S5_drawing_rate_drop"]
}
```

**Visual:** Full-width banner với border-l-4 màu severity. Title bold + summary muted + confidence inline.

### 3.6 `<ActionReviewTable>` (T+1)

**Props:**
```typescript
interface ActionReviewTableProps {
  reportDateT1: string;           // báo cáo hôm trước
  actions: Array<{
    id: string;
    description: string;
    status: 'resolved' | 'ongoing' | 'worsened';
    carried_days?: number;
    evidence: string;
    next?: string;                // "Escalate" / "—"
    escalated?: boolean;
  }>;
  summary: string;                // "1/3 resolved · 2 ongoing · 1 escalate"
}
```

**Visual:** Table với status icon (✅ ⏳ ❌) + carried_days badge + evidence text + next button.

### 3.7 `<NumberedSection>`

**Props:**
```typescript
interface NumberedSectionProps {
  number: number;
  title: string;
  score?: number;                 // 0-100
  trend?: 'up' | 'down' | 'flat';
  delta?: number;
  metrics?: Array<{ label: string; value: string; trend?: string }>;
  chart?: ReactNode;              // <RadarChart /> | <Recharts ...> | <MermaidEmbed />
  conclusion: string;             // KẾT LUẬN markdown
  conclusionSeverity?: SeverityLevel;
  children?: ReactNode;           // optional rich content
}
```

**Visual:** H2 với "## N. Title (score/100 ↓)" + metric block (3-col grid) + chart slot + KẾT LUẬN với border-l-4.

### 3.8 `<KetLuanBlock>`

**Props:**
```typescript
interface KetLuanBlockProps {
  text: string;                   // 1-2 sentences
  severity?: SeverityLevel;
  teamTags?: string[];           // ["[Product]", "[Dev]"]
}
```

**Visual:** `border-l-4 pl-4 py-2 text-sm font-medium`, color theo severity. Team tags là `<Badge>`.

### 3.9 `<ActionPlanTable>`

**Props:**
```typescript
interface ActionPlanTableProps {
  newActions: Array<{
    id: string;
    title: string;
    team: string[];               // ["Product", "Dev"]
    urgency: 'P0' | 'P1' | 'P2';
    confidence: number;
    expectedImpact?: string;
    onView?: () => void;          // open detail drawer
  }>;
  carriedForward?: Array<{
    id: string;
    title: string;
    carriedDays: number;
    status: 'ongoing' | 'worsened';
    escalate?: boolean;
  }>;
}
```

**Visual:** 2-table layout. Urgency = colored chip (🔴 P0 / 🟡 P1 / 🟢 P2). Click row → drawer detail.

### 3.10 `<AppendixDataSources>`

**Props:**
```typescript
interface AppendixDataSourcesProps {
  sources: Array<{
    block: string;                // "Funnel events"
    source: string;               // "bronze.fb_ar_tracer"
    layer: 'gold' | 'silver' | 'bronze' | 'config' | 'external';
    freshness: string;            // "T-1" / "Live"
    note?: string;                // "✅" / "⚠️ partial"
  }>;
}
```

**Visual:** Compact table at bottom. Layer = colored badge.

### 3.11 `<HandoffBanner>`

**Props:**
```typescript
interface HandoffBannerProps {
  fromPersona: PersonaId;
  toPersona: PersonaId;
  question: string;
  context?: { metricsInQuestion: string[]; linkedReportId: string };
  onAccept: () => void;           // mở persona đích với context
  onDismiss?: () => void;
}
```

**Visual:** Full-width sticky bottom banner color persona-source. Avatar persona-source → arrow → persona-target. CTA "Open in [Target Persona]".

### 3.12 `<PersonaSwitcher>`

**Props:**
```typescript
interface PersonaSwitcherProps {
  current: PersonaId;
  enabledPersonas: PersonaId[];   // theo permission
  onSwitch: (persona: PersonaId) => void;
  showPlaybookEdit?: boolean;
}
```

**Visual:** Dropdown shadcn `<Select>` với icon + label + phase badge (P1/P2). Dùng trong AI Chat header.

### 3.13 Bonus: `<MetricBlock>`, `<TrendBadge>`, `<TierBadge>`, `<SeverityChip>`, `<DataSourceBadge>`, `<TeamTag>`

Atomic helpers — props đơn giản, dùng trong các component lớn ở trên.

---

## 4. Page-level Layouts

> Mỗi page là 1 route trong Next.js App Router. Layout dựa trên §17.x của doc 10. Sample data → file `frontend/mock-data/` từ doc 13.

### 4.1 Page: AI Hub (Daily Brief Landing)

- **Route:** `/ai-hub`
- **Sample data:** `ai-hub-daily-brief-sample.json` (doc 13 §10)
- **Layout:**
  ```
  ┌────────────────────────────────────────────────────────────┐
  │ Header: "Welcome back, minh@" · Date · Portfolio score 78  │
  ├────────────────────────────────────────────────────────────┤
  │ Persona Grid (2-4 cols responsive)                         │
  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
  │  │ App │ │ PO  │ │ DA  │ │ UA  │  Each: icon + count +    │
  │  │ Ins.│ │ 12  │ │  5  │ │  8  │  last_run_at + P0 badge  │
  │  └─────┘ └─────┘ └─────┘ └─────┘                          │
  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          │
  │  │ Med │ │ Dev │ │ QA  │ │ BOD │                          │
  │  │  6  │ │  3  │ │  1  │ │  4  │                          │
  │  └─────┘ └─────┘ └─────┘ └─────┘                          │
  ├────────────────────────────────────────────────────────────┤
  │ Top P0 Actions Pending (table, 8 rows)                     │
  ├────────────────────────────────────────────────────────────┤
  │ Active Cross-Agent Handoffs (list, 4 items)                │
  ├────────────────────────────────────────────────────────────┤
  │ Recent Activity (timeline, 5 entries)                       │
  └────────────────────────────────────────────────────────────┘
  ```
- **Components used:** Custom `<PersonaTile>`, `<P0ActionsTable>`, `<HandoffList>`, `<ActivityTimeline>`

### 4.2 Page: AI App Insight (Layer 1, hiện có — refresh layout)

- **Route:** `/apps/[appId]/ai-insights?date=YYYY-MM-DD`
- **Sample data:** `ai-app-insight-sample.json` (doc 13 §1)
- **Layout:** `<UnifiedReportShell>` với 8 sections doc 01:
  1. Executive Summary
  2. Revenue & Monetization
  3. Engagement & Retention
  4. Product & Content Health
  5. Growth & Acquisition
  6. Subscription Health (conditional QOn)
  7. App Stability (conditional AppMetrica)
  8. Anomalies & Alerts
- **Top strip:** HealthScoreCard + RadarChart (8 axes) + DimensionScoresTable
- **Date navigation:** Calendar picker top-right

### 4.3 Page: AI Product Owner (Utility lens)

- **Route:** `/apps/[appId]/ai-product-owner?date=YYYY-MM-DD`
- **Sample data:** `ai-po-utility-sample.json` (doc 13 §2)
- **Layout:** `<UnifiedReportShell>` với 4 sections:
  1. Funnel Diagnosis (multi-funnel + geo variant tabs)
  2. User Segments (table + treemap)
  3. Feature Recommendations (card list — click expand A/B test design)
  4. Open Questions for DA (list + Send button)
- **Top strip:** PO Health + Radar 5-axes + Dimension Scores
- **Sticky CTAs:** "Investigate in DA" · "Brief UA" · "Export PRD draft"

### 4.4 Page: AI Product Owner (Game lens)

- **Route:** `/apps/[appId]/ai-product-owner?date=YYYY-MM-DD` (cùng route, differ theo `category_lens`)
- **Sample data:** `ai-po-game-sample.json` (doc 13 §3)
- **Layout:** Different sections (3 sections vs 4):
  1. Level Progression Diagnosis (level fail rate table + xychart)
  2. Game Economy Audit (currencies table + source/sink chart)
  3. Gacha Audit (rate compare + whale fatigue chart)
- **Top strip:** Game-specific Radar 6-axes (Tutorial, Level, Economy, Gacha, Monetization, Engagement)

### 4.5 Page: AI Data Analyst (chat-session)

- **Route:** `/apps/[appId]/ai-data-analyst?session=[sessionId]`
- **Sample data:** `ai-da-conversation-sample.json` (doc 13 §4)
- **Layout:** Chat-style — KHÔNG dùng `<UnifiedReportShell>`:
  ```
  Header: Session title + [+ New Question] [Save] [Push to Superset]

  ┌─ User message ──────────────────────────────────────┐
  │ "Tại sao retention D7 giảm?"                         │
  └──────────────────────────────────────────────────────┘

  ┌─ DA response ───────────────────────────────────────┐
  │ Decomposition (4 sub-questions)                      │
  │                                                      │
  │ Query 1/4 — D7 trend by cohort                       │
  │ ┌─ SQL block (validated) ──────────────────────────┐ │
  │ │ SELECT install_date, retention_rate ...           │ │
  │ │ ⏱ 412ms · 30 rows · ✓ validators passed           │ │
  │ └────────────────────────────────────────────────────┘ │
  │ ┌─ Result chart ────────────────────────────────────┐ │
  │ │ [Recharts line with annotation]                   │ │
  │ └────────────────────────────────────────────────────┘ │
  │ Finding: D7 ↓ 4.1pp post 04-15. Confidence 91%       │
  │ [Continue Query 2/4 ▶]                                │
  └──────────────────────────────────────────────────────┘

  ... more queries

  ┌─ Session Summary ───────────────────────────────────┐
  │ 4 queries · 3 findings · 1 chart saved              │
  │ Handoff: → [Product Owner]                          │
  │ [💾 Save as Scheduled Report]                        │
  └──────────────────────────────────────────────────────┘
  ```
- **Components needed:** `<ChatMessage>`, `<SqlBlock>`, `<QueryResultChart>`, `<FindingCard>`, `<SessionSummary>`

### 4.6 Page: AI UA Marketing

- **Route:** `/apps/[appId]/ai-ua-marketing?date=YYYY-MM-DD&window=7d`
- **Sample data:** `ai-ua-report-sample.json` (doc 13 §5)
- **Layout:** `<UnifiedReportShell>` với 4 sections:
  1. Channel × Country Matrix (data table với row coloring theo verdict)
  2. Cohort LTV Curves (Recharts multi-line)
  3. Audience Behavior — Geo Efficiency (table + treemap)
  4. Creative Kill-list (table)
- **Top strip:** UA Health + Radar 6-axes + Dimension Scores
- **Window selector:** "7d / 14d / 30d" toggle

### 4.7 Page: AI Mediation / AdOps

- **Route:** `/apps/[appId]/ai-mediation?date=YYYY-MM-DD`
- **Sample data:** `ai-mediation-sample.json` (doc 13 §6)
- **Layout:** `<UnifiedReportShell>` với 4 sections:
  1. Waterfall Breakdown (special: drag-drop reorder networks visual)
  2. Fill Rate by Geo (heatmap component)
  3. Concentration Diagnosis (pie chart + recommendation)
  4. eCPM & Format Mix Trends (multi-chart)
- **Top strip:** Med Health + Radar 5-axes + Dimension Scores
- **Special component:** `<WaterfallVisualizer>` — bidding tier 1 above + waterfall tier 2 below, drag handles

### 4.8 Page: AI DevOps / SRE

- **Route:** `/apps/[appId]/ai-devops`
- **Sample data:** `ai-devops-sample.json` (doc 13 §7)
- **Layout:** `<UnifiedReportShell>` với 4 sections:
  1. Crash Diagnosis (top stack signatures table + clickable expand stack trace)
  2. ANR Diagnosis
  3. Performance Metrics (P50/P95 + battery + network)
  4. SDK Hygiene (SDK list with version badges)
- **Top strip:** Stability + Radar 5-axes + Dimension Scores
- **Continuous mode:** Live banner "🚨 ALERT: Crash spike v2.3.1" sticky top
- **Special component:** `<StackTraceCollapsible>`

### 4.9 Page: AI QA / Release Gate

- **Route:** `/apps/[appId]/ai-qa?candidate=[version]`
- **Sample data:** `ai-qa-release-gate-sample.json` (doc 13 §8)
- **Layout:** Gate-style (KHÔNG radar, có Decision Banner LỚN):
  ```
  Header: Candidate version + target release date

  ┌─────────────────────────────────────────────────────┐
  │ 🟡 CONDITIONAL_GO                                   │
  │ Blockers: 1 · Warnings: 1 · Passes: 4              │
  │ Recommendation: [paragraph]                         │
  │ Auto-unblock when: [conditions]                     │
  │                                                     │
  │ [✅ Approve] [❌ Block] [💬 Discuss in Slack]        │
  └─────────────────────────────────────────────────────┘

  ## 1. Gates Status (table 6 rows)
  ## 2. Version Compare (table 3-5 versions × metrics)
  ## 3. Regression Findings (cards)
  ## 4. Bug-Event Correlation (table)
  ## 5. Smoke Test Coverage (covered/uncovered list)

  Handoff section
  ```
- **Special component:** `<ReleaseGateDecisionBanner>` — large, color theo decision

### 4.10 Page: AI BOD / Portfolio Strategist

- **Route:** `/ai-hub/bod?period=Q2-2026`
- **Sample data:** `ai-bod-portfolio-sample.json` (doc 13 §9)
- **Layout:** `<UnifiedReportShell>` (NHƯNG cross-app, không gắn 1 app):
  1. Portfolio Treemap (Recharts treemap by category × revenue)
  2. Scale / Maintain / Kill (3-column grid với app cards)
  3. Risk Concentration (4 dimension table với severity)
  4. Quarterly Outlook (xychart projection 6 quarters with confidence bands)
- **Top strip:** Portfolio Health + Radar 6-axes + Dimension Scores
- **Period selector:** "Q1 2026 / Q2 2026 / Q3 2026" + "Compare to Q1"

### 4.11 Page: Playbook Admin (per app)

- **Route:** `/apps/[appId]/ai-playbook`
- **Sample data:** `playbook-ar-tracer.yaml` / `playbook-hero-rpg.yaml` (doc 13 §11-12)
- **Layout:** Form-based với 6 collapsible sections:
  1. Funnels (list + add new + edit)
  2. KPI Overrides (key-value editor)
  3. Releases Calendar (timeline + add)
  4. Custom Events (table)
  5. Analysis Scenarios (cards)
  6. Handoff Matrix (rule list)
- **Actions:** Validate · Preview AI Output · Save as Draft · Publish v(N+1) · View YAML
- **Components needed:** `<FunnelEditor>`, `<KpiKeyValueEditor>`, `<ReleaseCalendar>`, `<ScenarioCardEditor>`, `<YamlPreview>`

### 4.12 Page: Category Profile Admin

- **Route:** `/admin/ai-categories/[categoryId]`
- **Sample data:** `category-midcore-game.yaml` (doc 13 §13)
- **Layout:** Same form pattern như Playbook Admin nhưng global. Read-only by default, edit cần admin role.

---

## 5. Interaction Patterns

### 5.1 Re-run report

```
User clicks [↻ Re-run]
→ Confirm modal: "Cost: ~$0.05, ETA 30s"
→ POST /api/v1/agents/{persona}/digest/{appId}/generate
→ Show progress toast (sonner)
→ On complete: refetch + animate score delta
```

### 5.2 Export PDF

```
User clicks [📄 Export PDF]
→ Server-side: render markdown + mermaid → Puppeteer PDF
→ Download trigger
→ Toast "PDF saved"
```

### 5.3 Drill-down handoff

```
User clicks "Investigate in DA" trên PO report
→ Navigate to /apps/[appId]/ai-data-analyst?from=po&context=funnel_drop_step2
→ DA workspace pre-loads với context message:
  "PO observed step 2 drop 22% in onboarding funnel. Investigate cohort patterns."
→ DA tự kick off query plan với context
```

### 5.4 Action status update

```
User clicks action row → drawer open
Drawer: full action detail + status dropdown
User changes status: open → in_progress → done/abandoned
→ POST /api/v1/agents/{persona}/actions/{actionId}/status
→ T+1 next day, AI sẽ thấy status đã đổi
```

### 5.5 Cross-agent handoff accept

```
HandoffBanner xuất hiện sticky bottom
→ User clicks "Accept & Open in [Target]"
→ Navigate to target persona route với context
→ Banner dismissed, log handoff acceptance
```

### 5.6 Playbook hot-reload

```
PO sửa Playbook → Save as Draft → Preview AI Output (modal)
→ Modal show preview report với playbook v(N+1) draft
→ User confirm → Publish v(N+1)
→ Cache invalidation trigger
→ Toast "Playbook v(N+1) live in 15min"
```

---

## 6. Responsive Behavior

### 6.1 Breakpoints

| Breakpoint | Width | Use case |
|------------|-------|----------|
| `sm` | ≥ 640px | Mobile read-only daily brief |
| `md` | ≥ 768px | Tablet, hub landing |
| `lg` | ≥ 1024px | Desktop primary (BOD, DA, PO) |
| `xl` | ≥ 1280px | Large desktop optimal |
| `2xl` | ≥ 1536px | Ultra-wide (BOD treemap shines) |

### 6.2 Layout adaptations

| Component | Mobile (<768px) | Desktop (≥1024px) |
|-----------|------------------|---------------------|
| Top strip 3-cell | Stack vertical | 3-col grid |
| Persona grid | 2 cols | 4 cols |
| Action plan table | Card list (no table) | Table |
| Radar chart | 280×280 | 360×360 |
| Sticky CTAs | Bottom sheet | Right sidebar |
| Date picker | Modal | Inline popover |

### 6.3 Mobile constraints

- DA chat session: full read but **NO query execute** (cost / safety)
- Playbook admin: **read-only** trên mobile (edit force desktop)
- BOD Portfolio: simplified treemap (top 10 apps only)

---

## 7. State Variations

Mỗi page phải xử lý 5 states:

### 7.1 Loading

- Skeleton placeholder cho mọi component
- `<HealthScoreCard>` loading → pulse circle
- `<RadarChart>` loading → grey radar shape
- `<DimensionScoresTable>` → 8 skeleton rows
- Top-strip total render < 200ms cached, < 3s uncached

### 7.2 Empty (no data yet)

```
"Báo cáo cho ngày này chưa được tạo."
[Generate Now] (cost estimate)
"Hoặc chọn ngày khác →" + date picker
```

### 7.3 Partial data (data_completeness < 0.7)

- Banner top: ⚠️ "Báo cáo này dùng auto-generated playbook (confidence 0.65). PO nên review playbook."
- Sections không đủ data → ghi "N/A — insufficient data" thay vì hiding

### 7.4 Error

- Network error → retry button + last-success cache
- AI generation failed → error message + "Try again in 5 min" + show last successful report

### 7.5 Stale (>24h old)

- Banner "Báo cáo này cũ 2 ngày. Re-run để lấy data mới." + [↻ Re-run] CTA

---

## 8. V0 Prompt Templates

> Copy template, paste vào V0, kèm sample data file tương ứng. V0 sẽ sinh component đúng shape.

### 8.1 Template — UnifiedReportShell + PO Utility

```
Tạo Next.js page component cho "AI Product Owner Workspace" theo design system Tailwind + shadcn/ui.

Route: /apps/[appId]/ai-product-owner

LAYOUT (report-style, KHÔNG card-grid):
1. Sticky Header với:
   - Persona icon (Compass from lucide) + "AI Product Owner — {appName} — {date}"
   - Subtitle "Playbook v{N} · {category_id} · Owner: {email}"
   - Action buttons: [↻ Re-run] [📄 Export PDF] [Brief BOD] [Investigate in DA]

2. TOP STRIP (3-col grid lg, stack mobile):
   - Cell 1: Large Health Score Card
     - Circle 120×120, score 64 trong giữa
     - "C-Tier 🟡" badge dưới
     - Delta arrow "↓ -7" + "vs T-1: 71"
     - Confidence dots ●●●●○ 86%
   - Cell 2: Radar Chart (Recharts <RadarChart>)
     - 5 axes: Funnel Health, Localization, Engagement, Monetization, Activation
     - 2 lines: today + T-1
   - Cell 3: Dimension Scores Table
     - 5 rows × (dimension, score, trend, delta) cột
     - Color row theo score: <50 red, 50-65 amber, 65-80 blue, 80+ green

3. VERDICT BANNER (full-width, border-l-4 amber):
   - Title bold: "Product-Market Fit Slipping (B → C)"
   - Summary 2 dòng narrative
   - Confidence dots inline

4. T+1 ACTION REVIEW table:
   - 4 cols: # | Action | Status (✅/⏳/❌) | Evidence | Next
   - Status icons có màu (green check, amber clock, red X)
   - Carried_days badge nếu > 0
   - Summary line below: "1/3 resolved · 2 ongoing · 1 escalate"

5. NUMBERED SECTIONS (4 sections):
   Section 1: ## 1. Funnel Diagnosis (58/100 ↓)
     - Funnel name + variant tabs (default | JP)
     - Funnel steps list với drop% và flag
     - Recharts xychart 14d funnel completion trend
     - KẾT LUẬN block (border-l-4)

   Section 2: ## 2. User Segments (72/100 →)
     - Table 5 cols (Name, Size%, ARPDAU, Risk, Opportunity)
     - Recharts pie (segment by ARPDAU contribution)
     - KẾT LUẬN block

   Section 3: ## 3. Feature Recommendations
     - Card list (3 cards) với title, priority chip (🔴 P0/🟡 P1/🟢 P2), confidence
     - Click expand → A/B test design detail
     - KẾT LUẬN

   Section 4: ## 4. Open Questions for DA
     - Bullet list 3 questions
     - "[Send to DA →]" button bottom

6. ACTION PLAN section:
   - Table newActions (5 cols)
   - Carried Forward sub-table

7. APPENDIX DATA SOURCES:
   - Compact table 5 cols, layer = colored badge

DATA: Use mock data từ ai-po-utility-sample.json (đính kèm).
INTERACTIONS: Re-run button → toast "Generating..." (sonner). Investigate in DA button → router.push('/apps/[appId]/ai-data-analyst?from=po')
RESPONSIVE: Top strip stack vertical mobile, sections luôn full-width.
ICONS: Use lucide-react (Compass, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp, Minus).
COLORS: Use Tailwind tokens (text-amber-600, bg-amber-100, etc.) — NO hardcoded hex.
```

### 8.2 Template — UA Marketing Workspace

```
Tạo page "AI UA Marketing Workspace" report-style.

Route: /apps/[appId]/ai-ua-marketing

LAYOUT same shell như PO Utility (sticky header + top strip + verdict + T+1 + numbered sections + action plan + appendix).

TOP STRIP:
- Health Score: 58 C-Tier 🟡, ↓-6, "Spend $18.4K / ROAS 0.78 / Target 1.0"
- Radar 6-axes: ROAS Health, CPI Efficiency, Retention Quality, Geo Diversification, Network Mix, LTV Trajectory
- Dimension Scores table 6 rows

VERDICT: "ROAS dưới target — TikTok ID + Google US underperform. Recommend cut TikTok ID -50% + scale Google US +30%."

WINDOW SELECTOR top-right: toggle [7d | 14d | 30d]

NUMBERED SECTIONS:
1. Channel × Country Matrix (52/100 ↓)
   - Table 7 cols: Network, Country, Spend 7d, CPI, D7 Ret, ROAS d7, Verdict
   - Row colored theo verdict: cut=red-50, watch=amber-50, scale=green-50, ok=neutral
   - Recharts pie: spend share by network × top countries
   - KẾT LUẬN

2. Cohort LTV Curves (42/100 ↓)
   - Table 7 cols: Install Week, Network, Country, LTV d7, LTV d30 proj, Payback days
   - Recharts multi-line: LTV curve d0-d30 by network
   - KẾT LUẬN

3. Audience Behavior — Geo Efficiency
   - Table: Country, Share Spend, Share Revenue, Efficiency, Lookalike opportunity
   - KẾT LUẬN

4. Creative Kill-list
   - Simple table: Creative hash, Network, Reason
   - Each row có "Kill" button (destructive)

ACTION PLAN with 5 actions, each: P0/P1/P2 chip, team tag, urgency days, confidence.
APPENDIX with UA cost source / cohort source / attribution source.

DATA: ai-ua-report-sample.json (attached).
```

### 8.3 Template — AI Hub Landing

```
Tạo page "AI Hub Daily Brief" landing — entry point cho mọi persona.

Route: /ai-hub

LAYOUT:
1. Header: "Welcome back, {userEmail}" + Date + Portfolio Health badge

2. PERSONA GRID (responsive 2/3/4 cols):
   - 8 tiles, each:
     - Persona icon (lucide) + label + phase badge (P1/P2/Live/Beta)
     - Today count (large number)
     - Last run timestamp (relative: "12 min ago")
     - P0 actions count badge
     - Click → navigate /apps or /ai-hub/bod
   - Persona accent color theo §2.1

3. TOP P0 ACTIONS PENDING table (8 rows):
   - Cols: Action title, App, Persona icon, Carried days, Status, [Open]
   - Status: open / in_progress / escalated (red dot)
   - Click row → navigate to source persona report

4. ACTIVE CROSS-AGENT HANDOFFS list (4 items):
   - Each: from-persona avatar → arrow → to-persona avatar
   - Question text (truncate 120 chars)
   - Created_at relative
   - "Accept" button or "Pending"

5. RECENT ACTIVITY timeline (5 entries):
   - Each: persona icon + app + action verb + timestamp + summary

DATA: ai-hub-daily-brief-sample.json (attached).
RESPONSIVE: Persona grid 2-col mobile, 4-col desktop.
ICONS: Map persona → lucide icons per §2.4.
```

### 8.4 Template — Mediation Waterfall Visualizer

```
Tạo component đặc biệt <WaterfallVisualizer> cho AI Mediation page.

VISUAL:
- Vertical layout, 2 zones:
  Zone 1 (top): "Tier 1 — Bidding" header
    - List of bidding networks, each row:
      - Drag handle (lucide GripVertical)
      - Network logo + name (AdMob, AppLovin MAX, Liftoff)
      - eCPM, Fill, Revenue 7d (3-cell grid)
    - Networks reorderable via drag-drop (use @dnd-kit/core)

  Zone 2 (bottom): "Tier 2 — Waterfall" header
    - List ordered by floor desc, each row:
      - Drag handle
      - Network name + Floor price
      - Fill rate bar (0-100%)
      - Revenue badge

- Overall: Add network button bottom + Save changes confirmation

PROPS:
{
  adUnitId: string;
  bidding: Array<{ source, ecpm, fill, revenue }>;
  waterfall: Array<{ source, floor, fill, revenue }>;
  onReorder: (zone, newOrder) => void;
  onAddNetwork: () => void;
  onRemoveNetwork: (source) => void;
}

INTERACTIONS:
- Drag waterfall network up → shows confirmation "Increase floor priority"
- Drop zone has subtle highlight when dragging
- Disabled networks (low fill) shown faded + warning tooltip
```

### 8.5 Template — Release Gate Decision Banner

```
Tạo component <ReleaseGateDecisionBanner> cho AI QA page.

VISUAL: Large card, full-width, color theo decision:
- GO: green-50 bg, border green-500, icon CheckCircle2
- CONDITIONAL_GO: amber-50 bg, border amber-500, icon AlertTriangle
- BLOCK: red-50 bg, border red-500, icon XCircle

CONTENT:
- Top: Decision text "🟡 CONDITIONAL_GO" (text-3xl font-bold)
- Stats row: Blockers: 1 · Warnings: 1 · Passes: 4 (each clickable to filter gates table below)
- Recommendation paragraph
- Auto-unblock conditions (if applicable) — list with checkboxes (read-only)
- CTA buttons row:
  - [✅ Approve] (primary, disabled if BLOCK)
  - [❌ Block] (destructive)
  - [💬 Discuss in Slack] (secondary)

PROPS:
{
  decision: 'GO' | 'CONDITIONAL_GO' | 'BLOCK';
  blockers: number;
  warnings: number;
  passes: number;
  recommendation: string;
  autoUnblockConditions?: string[];
  onApprove: () => void;
  onBlock: () => void;
  onDiscussSlack: () => void;
}
```

### 8.6 Template — DevOps Continuous Alert Banner

```
Component <ContinuousAlertBanner> cho AI DevOps page top.

VISUAL: Sticky top, full-width, red-100 bg, animated pulse on icon
- Icon AlertOctagon (lucide) red-600
- Title bold: "🚨 ALERT: Crash spike v2.3.1"
- Subtitle: "Affected 12% users · 1,840 events/24h · Detected 18 min ago"
- Actions inline: [View Crash Diagnosis] [Acknowledge] [Mute 1h]

ANIMATION: pulse-slow on icon (custom @keyframes 2s ease-in-out infinite)
DISMISSIBLE: User can mute, stored in localStorage with TTL
```

### 8.7 Template — Playbook YAML Editor

```
Component cho Playbook Admin page.

LAYOUT: Tabs trên cùng [Form view | YAML view]

FORM VIEW:
- Section accordions (shadcn <Accordion>):
  1. Funnels (CollapsibleList of funnel cards)
  2. KPI Overrides (Key-Value editor — add/remove rows)
  3. Releases (Timeline picker — add release entry)
  4. Custom Events (Table editable)
  5. Analysis Scenarios (Card editor)
  6. Handoff Matrix (Rule list)

Each section:
- + Add new button
- Edit inline / via drawer
- Delete with confirm

YAML VIEW:
- Read-only Monaco-style code block với syntax highlighting (use Prism)
- Auto-sync với form changes

VALIDATION:
- Real-time với zod schema (event_name exists in fb_*, etc.)
- Show errors inline + summary top

ACTIONS bottom:
- [Validate Playbook] (run schema check + event existence)
- [Preview AI Output] (modal — show preview persona report with this playbook draft)
- [Save as Draft]
- [Publish v(N+1)] (with confirm modal showing diff vs current)

DATA: playbook-ar-tracer.yaml (attached).
```

### 8.8 Template — BOD Portfolio Treemap

```
Component <PortfolioTreemap> cho AI BOD page.

VISUAL: Recharts <Treemap>
- Each rectangle = 1 app
- Size proportional to revenue_mo
- Color theo trend: green (+), amber (flat), red (-)
- Group by category (treemap parent nodes)
- Hover: tooltip với app_name, category, revenue_mo, trend, verdict

PROPS:
{
  apps: Array<{
    app_id: string;
    app_name: string;
    category: string;
    revenue_mo: number;
    trend_pct: number;
    verdict: 'scale' | 'maintain' | 'kill';
  }>;
  onAppClick: (appId: string) => void;
}

LEGEND: Color scale + size scale below treemap
INTERACTION: Click app → drawer mở với Scale/Maintain/Kill action options
```

---

## 9. Acceptance Criteria

### 9.1 Mỗi page phải pass

| # | Criterion | Cách verify |
|---|-----------|-------------|
| 1 | Render đầy đủ với sample data từ doc 13 | Visual check + jest snapshot |
| 2 | Tuân thủ unified report layout §17.0 (no card-grid) | Code review checklist |
| 3 | Mọi metric có data source badge (gold/silver/bronze/config) | Visual scan |
| 4 | KẾT LUẬN block không rỗng trong mọi section | Lint rule |
| 5 | Action items có team tag rõ ràng | Lint rule |
| 6 | Loading skeleton render < 200ms | Lighthouse CI |
| 7 | LCP < 2.5s với cached data | Web Vitals |
| 8 | Keyboard accessible (tab order + focus visible) | a11y audit |
| 9 | Color contrast AA (severity colors qua test) | Axe DevTools |
| 10 | Markdown export PDF render đúng (mermaid + table + chart) | Visual smoke test |

### 9.2 Component library Storybook

- Mỗi shared component có ≥ 3 stories: default, edge case, error
- Mock data từ doc 13 — KHÔNG hardcode trong stories
- Accessibility addon enabled
- Visual regression test (Chromatic or Percy)

### 9.3 V0 → Code workflow

1. Copy V0 prompt template (§8.x) + đính kèm sample data JSON
2. V0 sinh component skeleton
3. Refactor: extract atomic helpers vào shared library
4. Add Storybook story
5. Add unit test (snapshot + interaction)
6. Visual check on staging
7. Merge to main

---

## 10. Phụ lục: Routing + URL Structure

```
/ai-hub                                    — Daily Brief Landing
/ai-hub/bod?period=Q2-2026                 — BOD Portfolio (top-level, cross-app)
/admin/ai-categories                       — Category Profile list
/admin/ai-categories/[categoryId]          — Category Profile detail
/admin/ai-personas                         — Persona Pack admin

/apps/[appId]                              — App detail overview (existing)
/apps/[appId]/ai-insights?date=YYYY-MM-DD  — AI App Insight Layer 1 (existing)
/apps/[appId]/ai-product-owner?date=...    — PO workspace (utility or game lens auto)
/apps/[appId]/ai-data-analyst              — DA chat session list
/apps/[appId]/ai-data-analyst/[sessionId]  — DA conversation detail
/apps/[appId]/ai-ua-marketing?date=...&window=7d
/apps/[appId]/ai-mediation?date=...
/apps/[appId]/ai-devops
/apps/[appId]/ai-qa?candidate=v2.3.2       — Release Gate
/apps/[appId]/ai-playbook                   — Playbook editor

/api/v1/agents/{persona}/...                — Backend API (xem doc 10 §16.3)
```

### URL params ngữ nghĩa

| Param | Ý nghĩa | Default |
|-------|---------|---------|
| `?date=YYYY-MM-DD` | Báo cáo ngày nào | hôm nay |
| `?from=po` | Đến từ persona nào (cho handoff context) | none |
| `?context=funnel_drop_step2` | Context message preload | none |
| `?window=7d` | Time window cho UA/Mediation | 7d |
| `?period=Q2-2026` | Quarter cho BOD | current Q |
| `?session=sess-xxx` | DA session ID | new |
| `?candidate=v2.3.2` | Release candidate cho QA | latest |

---

## Cách dùng tài liệu này

### Cho V0 (sinh component):

1. **Mở V0** (https://v0.dev)
2. **Chọn page cần build** trong §4
3. **Copy prompt template tương ứng** trong §8
4. **Đính kèm sample data file** từ doc 13 vào V0 prompt
5. V0 sinh component → review + adjust trong V0 chat
6. **Export to Next.js code** → paste vào `frontend/app/...`
7. Refactor: extract shared components vào `frontend/components/ai-agents/shared/`

### Cho FE Lead (build shared component library):

1. Đọc §3 (Shared Component Library)
2. Build 12 components trong Sprint 1 — đặt trong `frontend/components/ai-agents/shared/`
3. Storybook story mỗi component với mock data từ doc 13
4. Document props với JSDoc
5. Visual regression test setup

### Cho Designer:

1. Đọc §1 (Nguyên tắc) + §2 (Design System)
2. Lookup §4 (Page Layouts) cho từng persona
3. Mock-up Figma cho page chưa có (nếu cần)
4. Sync với FE qua Storybook + Chromatic

### Cho PM/PO (review):

1. Đọc §1 (Triết lý) + §4 (Page Layouts)
2. Verify §9 Acceptance Criteria
3. Sample data trong doc 13 → kiểm tra realistic không
4. Sign-off khi page pass §9
