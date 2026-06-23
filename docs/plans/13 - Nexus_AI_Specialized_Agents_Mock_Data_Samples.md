# Amobear Nexus — Specialized AI Agents Mock Data Samples
## Sample data đã chuẩn hoá theo component contracts của doc 12

> **Phiên bản:** v2.0 (re-aligned với doc 12 UI/UX spec)
> **Ngày:** 2026-04-29
> **Mục đích:** Cung cấp dữ liệu mẫu thực tế (JSON + YAML) feed Vercel V0 + FE để render đúng 12 shared components.
>
> **Liên quan:**
> - [10 - Nexus_AI_Specialized_Agents_Upgrade_Plan.md](./10%20-%20Nexus_AI_Specialized_Agents_Upgrade_Plan.md) — schema definitions
> - [12 - Nexus_AI_Specialized_Agents_UI_UX_Spec_for_V0.md](./12%20-%20Nexus_AI_Specialized_Agents_UI_UX_Spec_for_V0.md) — UI spec + 12 shared components
> - [01 - App_Insight_V1_Daily_Report_Structure.md](./01%20-%20App_Insight_V1_Daily_Report_Structure.md) — layout chuẩn

---

## Cách sử dụng

1. Tạo thư mục `frontend/mock-data/`.
2. Copy từng JSON/YAML block ra file riêng theo `File suggested` ghi trên đầu mỗi section.
3. Khi feed V0 prompt, kèm:
   - 1 V0 prompt template từ doc 12 §8
   - 1 sample data file tương ứng
   - V0 sinh component đúng shape data + render đúng visual.
4. Khi build FE, dùng các file này làm fixture cho SWR mock / Storybook stories / Visual regression test / E2E test seed.

## Field Mapping → doc 12 Components

| Field trong sample | Component doc 12 | Props tương ứng |
|---------------------|------------------|------------------|
| `meta` | `<UnifiedReportShell>` | persona, appName, reportDate, playbookVersion, owner |
| `health_score` | `<HealthScoreCard>` | score, tier, delta, prevScore, confidence, label |
| `radar` | `<RadarChart>` | axes, current, previous |
| `dimension_scores` | `<DimensionScoresTable>` | rows |
| `executive_brief` (verdict + tldr + severity) | `<VerdictBanner>` | title, summary, confidence, severity, signals |
| `action_review` | `<ActionReviewTable>` | reportDateT1, actions, summary |
| Rich section blocks (`funnel_diagnosis`, `level_diagnosis`, `waterfall_breakdown`, etc.) | `<NumberedSection>` | wrapped in section, score, conclusion |
| `actions.new` + `actions.carried_forward` | `<ActionPlanTable>` | newActions, carriedForward |
| `handoff` | `<HandoffBanner>` | fromPersona, toPersona, question |
| `data_sources` | `<AppendixDataSources>` | sources |

## Mục lục

1. [App Insight Daily Brief](#1-app-insight-daily-brief)
2. [PO Utility — AR Tracer](#2-po-utility--ar-tracer)
3. [PO Game — Hero RPG](#3-po-game--hero-rpg)
4. [Data Analyst — Conversation Session](#4-data-analyst--conversation-session)
5. [UA Marketing — Daily Report](#5-ua-marketing--daily-report)
6. [Mediation / AdOps — Waterfall Audit](#6-mediation--adops--waterfall-audit)
7. [DevOps — Crash Spike Investigation](#7-devops--crash-spike-investigation)
8. [QA — Release Gate Decision](#8-qa--release-gate-decision)
9. [BOD — Portfolio Strategy](#9-bod--portfolio-strategy)
10. [AI Hub Daily Brief](#10-ai-hub-daily-brief)
11. [Playbook — AR Tracer (Utility)](#11-playbook--ar-tracer-utility)
12. [Playbook — Hero RPG (Game)](#12-playbook--hero-rpg-game)
13. [Category Profile — midcore_game](#13-category-profile--midcore_game)
14. [Cross-Agent Handoff Sample](#14-cross-agent-handoff-sample)

---

## 1. App Insight Daily Brief

**File suggested:** `frontend/mock-data/ai-app-insight-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-1234567890123456~9876543210",
    "app_name": "AR Tracer",
    "report_date": "2026-04-29",
    "persona": "app_insight",
    "category_id": "creative_utility",
    "playbook_version": 3,
    "data_completeness": 0.94,
    "generated_at": "2026-04-29T05:12:34Z",
    "owner": "minh@amobear.com"
  },
  "health_score": {
    "score": 74,
    "tier": "B",
    "delta": -3,
    "prev_score": 77,
    "confidence": 0.92,
    "label": "APP HEALTH"
  },
  "radar": {
    "axes": ["Revenue", "Growth", "Engagement", "Product", "Ad Infra", "Unit Econ", "Portfolio", "Velocity"],
    "current": [78, 65, 72, 64, 88, 70, 82, 60],
    "previous": [80, 73, 75, 71, 88, 74, 80, 58]
  },
  "dimension_scores": [
    { "dimension": "Revenue", "score": 78, "trend": "down", "delta": -2, "weight": 20, "status": "ok" },
    { "dimension": "Growth", "score": 65, "trend": "down", "delta": -8, "weight": 10, "status": "warning" },
    { "dimension": "Engagement", "score": 72, "trend": "down", "delta": -3, "weight": 20, "status": "ok" },
    { "dimension": "Product", "score": 64, "trend": "down", "delta": -7, "weight": 20, "status": "warning" },
    { "dimension": "Ad Infra", "score": 88, "trend": "flat", "delta": 0, "weight": 15, "status": "positive" },
    { "dimension": "Unit Econ", "score": 70, "trend": "down", "delta": -4, "weight": 10, "status": "ok" },
    { "dimension": "Portfolio", "score": 82, "trend": "up", "delta": 2, "weight": 5, "status": "positive" },
    { "dimension": "Velocity", "score": 60, "trend": "up", "delta": 2, "weight": 0, "status": "ok" }
  ],
  "executive_brief": {
    "title": "Health Score 74 (B-Tier) — slipping 3 points",
    "summary": "Doanh thu giảm nhẹ 4.2%, drawing rate rớt 8.4pp trong 14 ngày trùng release v3.4. Fill rate ổn định ở 87%. UA spend tăng 12% nhưng ROAS giảm xuống 0.82.",
    "confidence": 0.92,
    "severity": "warning",
    "signals": ["S5_drawing_rate_drop", "S2_revenue_up_dau_down", "S7_roi_below_threshold"]
  },
  "action_review": {
    "report_date_t1": "2026-04-28",
    "actions": [
      {
        "id": "ACT-20260428-001",
        "description": "Rà soát onboarding step 2 (choose_style)",
        "team": "Product",
        "status": "ongoing",
        "carried_days": 3,
        "evidence": "Drop rate vẫn 22% — chưa rollback",
        "next": "Escalate [Dev] cho hotfix v2.3.2",
        "escalated": true
      },
      {
        "id": "ACT-20260428-002",
        "description": "Cut TikTok ID UA budget -30%",
        "team": "UA",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "Spend giảm $620, blended ROAS hồi phục 0.82",
        "next": "Continue monitor"
      }
    ],
    "summary": "1/2 resolved · 1 ongoing >3d · cần escalate [Dev]"
  },
  "insights": [
    {
      "topic": "Drawing Rate",
      "severity": "critical",
      "headline": "Drawing Rate Collapses 8.4pp Below 30-Day Baseline",
      "analysis": "Drawing rate hôm nay 36.8% — giảm từ 45.2% (T-14d). Mức giảm bắt đầu ngay sau release v3.4 (15/04). Onboarding step 'choose_style' bị regression 22.1%. JP cohort không bị ảnh hưởng (skip personalization).",
      "action": "Rollback hoặc A/B test style picker mới ngay. [Product] [Dev]",
      "metrics_used": ["drawing_rate", "onboard_step_2_completion", "geo_d1_retention.JP"],
      "data_source": "bronze + playbook.releases",
      "confidence": 0.92
    },
    {
      "topic": "UA ROI",
      "severity": "warning",
      "headline": "Blended ROAS Slips to 0.82 from 1.04",
      "analysis": "ROAS d7 0.82 (target 1.0). Nguyên nhân chính: TikTok ID spend tăng 35% nhưng D7 retention chỉ 6.2%.",
      "action": "Cut TikTok ID -50% trong 3 ngày tới, monitor blended ROAS. [UA]",
      "metrics_used": ["roas_d7", "ua_cost", "channel_breakdown.TikTok"],
      "data_source": "gold + bronze.xmp",
      "confidence": 0.85
    },
    {
      "topic": "Fill Rate Health",
      "severity": "positive",
      "headline": "Fill Rate Holds Steady at 87%",
      "analysis": "Fill rate 87% — trong target band. AdMob bidding tier 1 fill 78%, AppLovin MAX 65%. Concentration risk: AdMob 64% revenue share (warning).",
      "action": "Monitor — nếu AdMob giảm cần backup network. [Mediation]",
      "metrics_used": ["fill_rate", "ad_source_sow"],
      "data_source": "gold + bronze.admob",
      "confidence": 0.90
    }
  ],
  "data_sources": [
    { "block": "Revenue", "source": "gold.fact_daily_app_metrics", "layer": "gold", "freshness": "T-1", "note": "✅" },
    { "block": "DAU/Sessions", "source": "bronze.fb_ar_tracer", "layer": "bronze", "freshness": "T-1", "note": "⚠️ gold.daily_overview empty, dùng bronze fallback" },
    { "block": "Ad Sources", "source": "bronze.admob_table", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "UA Cost", "source": "bronze.xmp_report", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Attribution", "source": "AppsFlyer (Firebase af_status)", "layer": "bronze", "freshness": "T-1", "note": "✅" }
  ]
}
```

---

## 2. PO Utility — AR Tracer

**File suggested:** `frontend/mock-data/ai-po-utility-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-1234567890123456~9876543210",
    "app_name": "AR Tracer",
    "report_date": "2026-04-29",
    "persona": "product_owner",
    "category_lens": "creative_utility",
    "playbook_version": 3,
    "data_completeness": 0.92,
    "owner": "minh@amobear.com",
    "generated_at": "2026-04-29T07:14:00Z"
  },
  "health_score": {
    "score": 64,
    "tier": "C",
    "delta": -7,
    "prev_score": 71,
    "confidence": 0.86,
    "label": "PO HEALTH"
  },
  "radar": {
    "axes": ["Funnel Health", "Localization", "Engagement", "Monetization", "Activation"],
    "current": [58, 72, 69, 74, 58],
    "previous": [67, 72, 70, 72, 66]
  },
  "dimension_scores": [
    { "dimension": "Funnel Health", "score": 58, "trend": "down", "delta": -9, "weight": 25, "status": "warning" },
    { "dimension": "Localization", "score": 72, "trend": "flat", "delta": 0, "weight": 15, "status": "ok" },
    { "dimension": "Engagement", "score": 69, "trend": "flat", "delta": -1, "weight": 20, "status": "ok" },
    { "dimension": "Monetization", "score": 74, "trend": "up", "delta": 2, "weight": 20, "status": "positive" },
    { "dimension": "Activation", "score": 58, "trend": "down", "delta": -8, "weight": 20, "status": "warning" }
  ],
  "executive_brief": {
    "title": "Product-Market Fit Slipping (B → C)",
    "tier_change": { "from": "B", "to": "C", "direction": "down" },
    "summary": "Drawing rate giảm 8.4pp trong 14 ngày, trùng release v3.4 (15/04). Onboarding step 'choose_style' rớt 22%. JP variant healthy (skip step). Likely UX regression in style picker redesign.",
    "confidence": 0.86,
    "severity": "warning",
    "signals": ["S5_drawing_rate_drop", "S6_onboarding_funnel_break"]
  },
  "action_review": {
    "report_date_t1": "2026-04-28",
    "actions": [
      {
        "id": "F-2026-04-28-01",
        "description": "Rollback / A/B onboarding style picker",
        "team": "Product",
        "status": "ongoing",
        "carried_days": 3,
        "evidence": "Chưa rollback — A/B chưa start",
        "next": "Escalate [Dev]",
        "escalated": true
      },
      {
        "id": "F-2026-04-28-02",
        "description": "Localized JP template pack",
        "team": "Product",
        "status": "ongoing",
        "carried_days": 1,
        "evidence": "Spec pending Design",
        "next": "—"
      },
      {
        "id": "F-2026-04-28-03",
        "description": "Improve share CTA visibility",
        "team": "Product",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "Share rate +12% (3,120 → 3,494)",
        "next": "Done"
      }
    ],
    "summary": "1/3 resolved · 2 ongoing · 1 escalate [Dev]"
  },
  "user_segments": [
    {
      "name": "JP Power Users",
      "size_pct": 18.2,
      "behavior": "Skip personalization, jump straight to drawing. High completion + share rate.",
      "monetization": "ARPDAU $0.42 (3.2x portfolio avg)",
      "risk": "D7 retention dropping -2pp",
      "opportunity": "Localized template pack — JP-themed",
      "linked_metrics": ["jp_arpdau", "jp_d7_retention"]
    },
    {
      "name": "US Casual",
      "size_pct": 34.5,
      "behavior": "Browse heavy, low completion (38%). Most affected by v3.4.",
      "monetization": "ARPDAU $0.18",
      "risk": "Drawing rate -12pp post v3.4",
      "opportunity": "Simplify style selection (back to v3.3 pattern)"
    },
    {
      "name": "ID New Installs",
      "size_pct": 11.0,
      "behavior": "Low device tier, short sessions (2.4 min avg).",
      "monetization": "ARPDAU $0.04",
      "risk": "D0 churn 92%",
      "opportunity": "Simplified onboarding for low-end devices"
    }
  ],
  "funnel_diagnosis": [
    {
      "funnel_id": "onboarding",
      "variant": "default",
      "section_score": 58,
      "section_trend": "down",
      "section_delta": -9,
      "stages": [
        { "step": "app_open", "users": 12450, "drop_pct": 0, "flag": null },
        { "step": "onboard_step_1", "users": 12000, "drop_pct": 3.6, "flag": null },
        { "step": "onboard_step_2", "users": 9700, "drop_pct": 22.1, "flag": "regression" },
        { "step": "onboard_step_3", "users": 9100, "drop_pct": 6.2, "flag": null },
        { "step": "onboard_complete", "users": 8800, "drop_pct": 3.3, "flag": null },
        { "step": "first_drawing_start", "users": 7820, "drop_pct": 11.1, "flag": null },
        { "step": "first_drawing_complete", "users": 5210, "drop_pct": 33.4, "flag": "high_drop" },
        { "step": "first_save_or_share", "users": 3120, "drop_pct": 40.1, "flag": "high_drop" }
      ],
      "narrative": "Step 2 (choose_style) là root cause. Drop 22% là +18pp so với baseline 4%. Likely UI complexity từ v3.4.",
      "compare_to_baseline": { "baseline_period": "2026-03-15 to 2026-04-14", "drop_baseline": 4.2 },
      "conclusion": "Step 'choose_style' là root cause — drop 22% là +18pp so với baseline 4%. Likely UX complexity từ v3.4. [Product] cần A/B rollback trong 24h.",
      "conclusion_severity": "critical",
      "team_tags": ["Product", "Dev"]
    },
    {
      "funnel_id": "onboarding",
      "variant": "JP",
      "section_score": 84,
      "section_trend": "flat",
      "stages": [
        { "step": "app_open", "users": 2230, "drop_pct": 0 },
        { "step": "end_onboard_jp", "users": 2080, "drop_pct": 6.7 },
        { "step": "first_drawing_start", "users": 1820, "drop_pct": 12.5 },
        { "step": "first_drawing_complete", "users": 1480, "drop_pct": 18.7 },
        { "step": "first_save_or_share", "users": 1120, "drop_pct": 24.3 }
      ],
      "narrative": "JP variant healthy — bypass path không bị ảnh hưởng.",
      "conclusion": "JP variant healthy — bypass path không bị ảnh hưởng. Confirm UX issue ở style picker step.",
      "conclusion_severity": "positive"
    }
  ],
  "feature_recommendations": [
    {
      "id": "F-2026-04-29-01",
      "title": "Rollback or A/B test new onboarding style picker",
      "type": "regression_fix",
      "priority": "P0",
      "evidence": [
        "select_style drop +22% post v3.4",
        "JP cohort không bị ảnh hưởng → confirm UX issue",
        "v3.3 baseline drop chỉ 4.2%"
      ],
      "expected_impact": { "drawing_rate_uplift_pp": [4, 8], "d0_activation_uplift_pp": [3, 6] },
      "effort": "S",
      "owner_tags": ["Product", "Dev"],
      "linked_metrics": ["drawing_rate", "d0_activation", "onboard_step_2_completion"],
      "confidence": 0.78,
      "ab_test_design": {
        "variants": [
          { "id": "control_v3.4", "split": 0.50, "description": "Current new picker" },
          { "id": "rollback_v3.3", "split": 0.30, "description": "Restore previous picker" },
          { "id": "hybrid_simplified", "split": 0.20, "description": "Reduce options 8 → 4" }
        ],
        "primary_metric": "drawing_rate",
        "secondary_metrics": ["d1_retention", "d0_activation"],
        "min_sample_per_variant": 8000,
        "duration_days": 7,
        "statistical_power": 0.80,
        "mde": 0.03
      },
      "status": "open"
    },
    {
      "id": "F-2026-04-29-02",
      "title": "Localized template pack — JP-themed",
      "type": "opportunity",
      "priority": "P1",
      "evidence": ["JP ARPDAU 3.2x avg", "JP D7 dropping -2pp", "JP-specific events strong"],
      "expected_impact": { "jp_arpdau_uplift_pct": [10, 18], "jp_d7_uplift_pp": [2, 4] },
      "effort": "M",
      "owner_tags": ["Product", "Design"],
      "confidence": 0.70,
      "status": "open"
    },
    {
      "id": "F-2026-04-29-03",
      "title": "Improve share/save CTA visibility",
      "type": "optimization",
      "priority": "P2",
      "evidence": ["save/share drop 40%", "drawing_complete → save funnel weakest stage"],
      "expected_impact": { "share_rate_uplift_pp": [5, 10] },
      "effort": "S",
      "owner_tags": ["Product", "Design"],
      "confidence": 0.65,
      "status": "open"
    }
  ],
  "open_questions_for_da": [
    "Verify cohort install_date >= 2026-04-15 có thực sự retention thấp hơn cohort 2026-04-01 to 2026-04-14?",
    "Group drop step 2 by device_tier — có pattern theo phone tier không?",
    "Geo breakdown của drop tại step 2 — country nào nặng nhất?"
  ],
  "actions": {
    "new": [
      { "id": "F-2026-04-29-01", "title": "Rollback / A/B style picker", "team": ["Product", "Dev"], "urgency": "P0", "urgency_label": "24h", "confidence": 0.78, "expected_impact": "drawing_rate +4-8pp" },
      { "id": "F-2026-04-29-02", "title": "JP localized template pack", "team": ["Product", "Design"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.70 },
      { "id": "F-2026-04-29-03", "title": "Share CTA visibility", "team": ["Product", "Design"], "urgency": "P2", "urgency_label": "14d", "confidence": 0.65 }
    ],
    "carried_forward": [
      { "id": "CF-1", "title": "Rollback v3.4 onboarding", "carried_days": 3, "status": "ongoing", "escalate": true },
      { "id": "CF-2", "title": "JP template pack spec", "carried_days": 1, "status": "ongoing", "escalate": false }
    ]
  },
  "handoff": {
    "to_data_analyst": ["Cohort 04-15 onward bị regression — confirm release impact"],
    "to_ua_marketing": ["Check campaign mix shift around 04-15"]
  },
  "linked_assets": {
    "superset_charts_to_create": ["dr_by_cohort_install_date", "step2_drop_by_geo"],
    "deep_links": ["nexus://app/ar-tracer/funnels?step=onboard_step_2"]
  },
  "data_sources": [
    { "block": "Funnel events", "source": "bronze.fb_ar_tracer_ios", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "User segments", "source": "silver.engagement", "layer": "silver", "freshness": "T-1", "note": "✅" },
    { "block": "Geo breakdown", "source": "silver.geo", "layer": "silver", "freshness": "T-1", "note": "✅" },
    { "block": "Releases calendar", "source": "playbook v3 releases", "layer": "config", "freshness": "live", "note": "✅" },
    { "block": "KPI thresholds", "source": "playbook.kpi_overrides", "layer": "config", "freshness": "live", "note": "✅" }
  ]
}
```

---

## 3. PO Game — Hero RPG

**File suggested:** `frontend/mock-data/ai-po-game-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-9876543210987654~1234567890",
    "app_name": "Hero Legends RPG",
    "report_date": "2026-04-29",
    "persona": "product_owner",
    "category_lens": "midcore_game",
    "playbook_version": 5,
    "data_completeness": 0.95,
    "owner": "gameteam@amobear.com",
    "generated_at": "2026-04-29T07:18:00Z"
  },
  "health_score": {
    "score": 71,
    "tier": "B",
    "delta": -3,
    "prev_score": 74,
    "confidence": 0.89,
    "label": "PO HEALTH"
  },
  "radar": {
    "axes": ["Tutorial", "Level Progression", "Economy Balance", "Gacha Health", "Monetization Mix", "Engagement"],
    "current": [82, 54, 78, 65, 74, 72],
    "previous": [82, 63, 78, 69, 72, 72]
  },
  "dimension_scores": [
    { "dimension": "Tutorial Completion", "score": 82, "trend": "flat", "delta": 0, "weight": 15, "status": "positive" },
    { "dimension": "Level Progression", "score": 54, "trend": "down", "delta": -9, "weight": 25, "status": "warning" },
    { "dimension": "Economy Balance", "score": 78, "trend": "flat", "delta": 0, "weight": 20, "status": "ok" },
    { "dimension": "Gacha Health", "score": 65, "trend": "down", "delta": -4, "weight": 15, "status": "warning" },
    { "dimension": "Monetization Mix", "score": 74, "trend": "up", "delta": 2, "weight": 15, "status": "positive" },
    { "dimension": "Engagement", "score": 72, "trend": "flat", "delta": 0, "weight": 10, "status": "ok" }
  ],
  "executive_brief": {
    "title": "Stuck wall at Chapter 2 (Level 18-20)",
    "summary": "Fail rate L18 = 47%, drop sau level = 38%. Boss L20 chỉ 22% user reach. Ảnh hưởng D7 retention -3.2pp. Economy ổn định, gacha có signal whale fatigue cần monitor.",
    "confidence": 0.89,
    "severity": "warning",
    "signals": ["stuck_level_audit", "gacha_balance_audit"]
  },
  "action_review": {
    "report_date_t1": "2026-04-22",
    "report_cycle": "weekly",
    "actions": [
      {
        "id": "G-2026-04-22-01",
        "description": "Rebalance Chapter 2 tutorial",
        "team": "Product",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "Tutorial completion +5pp (77% → 82%)",
        "next": "Done"
      },
      {
        "id": "G-2026-04-22-02",
        "description": "New SSR character banner",
        "team": "Product",
        "status": "ongoing",
        "carried_days": 7,
        "evidence": "Spec ready, art pending",
        "next": "—"
      }
    ],
    "summary": "1/2 resolved · 1 ongoing 7d"
  },
  "level_diagnosis": {
    "section_score": 54,
    "section_trend": "down",
    "section_delta": -9,
    "levels": [
      { "level": 17, "fail_rate": 0.18, "avg_attempts": 2.1, "drop_after": 0.08, "verdict": "ok" },
      { "level": 18, "fail_rate": 0.47, "avg_attempts": 6.2, "drop_after": 0.38, "verdict": "Too hard — needs rebalance", "severity": "critical" },
      { "level": 19, "fail_rate": 0.29, "avg_attempts": 3.1, "drop_after": 0.12, "verdict": "ok" },
      { "level": 20, "reach_pct": 0.22, "fail_rate": 0.61, "avg_attempts": 8.4, "verdict": "Boss wall — needs nerf or extra reward", "severity": "critical" }
    ],
    "conclusion": "L18-20 stuck wall ảnh hưởng D7 retention -3.2pp. [Product] giảm difficulty L18 -15% trong 24h.",
    "conclusion_severity": "critical",
    "team_tags": ["Product", "Game Design"]
  },
  "economy_diagnosis": {
    "section_score": 78,
    "section_trend": "flat",
    "currencies": [
      { "id": "gold", "type": "soft", "inflation_30d": 0.08, "p50_balance_dau": 4200, "p99_balance_whale": 124000, "verdict": "Healthy" },
      { "id": "gem", "type": "hard", "inflation_30d": 0.04, "p50_balance_paying": 380, "p99_balance_whale": 8400, "verdict": "Healthy" },
      { "id": "energy", "type": "capped", "avg_use_per_dau": 86, "max": 120, "regen_per_min": 0.5, "verdict": "Bottleneck — 28% sessions limited" }
    ],
    "source_sink_balance": {
      "gold_sources_total_d30": 1850000,
      "gold_sinks_total_d30": 1720000,
      "net_inflation": 0.07
    },
    "booster_usage": {
      "level_18_20_offered_pct": 0.42,
      "level_18_20_used_pct": 0.12,
      "verdict": "Low — players not aware booster exists"
    },
    "conclusion": "Economy ổn định. Booster awareness là vấn đề UX — [Product] thêm prompt sau 4 fails.",
    "conclusion_severity": "ok",
    "team_tags": ["Product", "UX"]
  },
  "gacha_diagnosis": {
    "section_score": 65,
    "section_trend": "down",
    "section_delta": -4,
    "banner": "Standard",
    "pull_cost_gem": 300,
    "rates_published": { "SSR": 0.015, "SR": 0.06, "R": 0.925 },
    "rates_actual_d30": { "SSR": 0.014, "SR": 0.058, "R": 0.928 },
    "rates_match": true,
    "whale_pulls_7d_trend": -0.22,
    "whale_pull_avg_per_user": 8.2,
    "weeks_since_new_ssr": 6,
    "conclusion": "Pull rate đúng spec. Whale fatigue cần xử lý — [Product] ra new featured banner.",
    "conclusion_severity": "warning",
    "team_tags": ["Product", "Game Design"]
  },
  "monetization_mix": {
    "iap_revenue_pct": 0.42,
    "iaa_revenue_pct": 0.38,
    "subscription_revenue_pct": 0.20,
    "trend_30d": "Subscription growing +8%, IAA stable, IAP -3%"
  },
  "feature_recommendations": [
    {
      "id": "G-2026-04-29-01",
      "title": "Reduce difficulty Level 18 by 15%",
      "type": "level_balance",
      "priority": "P0",
      "evidence": ["fail_rate 47% vs target 25%", "drop 38% vs baseline 18%", "avg_attempts 6.2 vs target 2.5"],
      "expected_impact": { "level_completion_uplift_pct": [8, 14], "d7_uplift_pp": [1.5, 2.5], "iap_uplift_pct": [3, 5] },
      "effort": "S",
      "owner_tags": ["Product", "Game Design"],
      "confidence": 0.82,
      "status": "open"
    },
    {
      "id": "G-2026-04-29-02",
      "title": "Add free booster prompt after 4 fails on Level 18-20",
      "type": "ux",
      "priority": "P0",
      "evidence": ["booster usage chỉ 12% vs offered 42%", "users not aware of booster"],
      "expected_impact": { "stuck_level_pct_reduction": [10, 15] },
      "effort": "S",
      "owner_tags": ["Product", "UX"],
      "confidence": 0.78
    },
    {
      "id": "G-2026-04-29-03",
      "title": "New featured SSR banner — whale fatigue mitigation",
      "type": "monetization",
      "priority": "P1",
      "evidence": ["whale pulls -22% w/w", "no new SSR character in 6 weeks"],
      "expected_impact": { "whale_pull_recovery_pct": [10, 20] },
      "effort": "M",
      "owner_tags": ["Product", "Game Design"],
      "confidence": 0.65
    },
    {
      "id": "G-2026-04-29-04",
      "title": "Energy bottleneck mitigation — increase regen rate or cap",
      "type": "engagement",
      "priority": "P2",
      "evidence": ["28% sessions energy-limited"],
      "effort": "S",
      "owner_tags": ["Product", "Game Design"],
      "confidence": 0.60
    }
  ],
  "open_questions_for_da": [
    "Cohort progression chart: % users reach Level 20 by install_week last 8 weeks",
    "Whale spend pattern by region — JP vs US whale behavior khác nhau?",
    "Booster offer prompt funnel — where users dismiss?"
  ],
  "actions": {
    "new": [
      { "id": "G-2026-04-29-01", "title": "Reduce L18 difficulty 15%", "team": ["Product", "Game Design"], "urgency": "P0", "urgency_label": "24h", "confidence": 0.82 },
      { "id": "G-2026-04-29-02", "title": "Add free booster prompt L18-20", "team": ["Product", "UX"], "urgency": "P0", "urgency_label": "48h", "confidence": 0.78 },
      { "id": "G-2026-04-29-03", "title": "New SSR banner (whale fatigue)", "team": ["Product", "Game Design"], "urgency": "P1", "urgency_label": "14d", "confidence": 0.65 },
      { "id": "G-2026-04-29-04", "title": "Energy regen mitigation", "team": ["Product", "Game Design"], "urgency": "P2", "urgency_label": "30d", "confidence": 0.60 }
    ],
    "carried_forward": [
      { "id": "CF-1", "title": "New SSR banner art", "carried_days": 7, "status": "ongoing", "escalate": false }
    ]
  },
  "handoff": {
    "to_data_analyst": ["Cohort progression by install_week — verify L20 reach drop"],
    "to_ua_marketing": ["Whale acquisition by country — JP whale value 3x US"]
  },
  "data_sources": [
    { "block": "Level events", "source": "AppMetrica events", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Economy events", "source": "bronze.fb_hero_rpg", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Gacha events", "source": "bronze.fb_hero_rpg", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Game progression schema", "source": "playbook v5 game_progression", "layer": "config", "freshness": "live", "note": "✅" },
    { "block": "Game economy schema", "source": "playbook v5 game_economy", "layer": "config", "freshness": "live", "note": "✅" }
  ]
}
```

---

## 4. Data Analyst — Conversation Session

**File suggested:** `frontend/mock-data/ai-da-conversation-sample.json`

> DA workspace là chat-style — KHÔNG dùng top strip pattern. Component spec xem doc 12 §4.5.

```json
{
  "session_id": "da-sess-2026-04-29-001",
  "session_title": "AR Tracer D7 retention drop investigation",
  "app_id": "ca-app-pub-1234567890123456~9876543210",
  "app_name": "AR Tracer",
  "started_at": "2026-04-29T09:14:22Z",
  "started_by": "lan@amobear.com",
  "context_from": {
    "persona": "product_owner",
    "report_id": "po-report-2026-04-29",
    "linked_message": "PO observed step 2 drop 22% in onboarding funnel. Investigate cohort patterns."
  },
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Tại sao retention D7 của AR Tracer giảm trong 30 ngày qua?",
      "timestamp": "2026-04-29T09:14:22Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "tier_used": "standard",
      "content_blocks": [
        {
          "type": "decomposition",
          "interpretation": {
            "scope": "AR Tracer (app_id=ca-app-pub-1234567890123456~9876543210), 30d window",
            "decomposition": [
              "D7 retention trend by install_date cohort",
              "D7 retention by country (top 10)",
              "D7 retention by install_source (organic/paid/network)",
              "D7 retention vs core_loop_completion D0"
            ]
          }
        },
        {
          "type": "sql_block",
          "query_id": "q1",
          "purpose": "D7 trend by cohort",
          "sql": "SELECT install_date, retention_rate\nFROM gold.retention_overview\nWHERE app_id = 'ca-app-pub-1234567890123456~9876543210'\n  AND retention_day = 7\n  AND install_date >= '2026-03-30'\nORDER BY install_date",
          "validated": true,
          "validator_notes": [
            "✓ Date filter present",
            "✓ App ID filter (RLS)",
            "✓ LIMIT not needed (deterministic small set)",
            "✓ Tables in whitelist"
          ]
        },
        {
          "type": "result",
          "query_id": "q1",
          "rows_count": 30,
          "exec_ms": 412,
          "data_preview": [
            { "install_date": "2026-04-01", "retention_rate": 0.302 },
            { "install_date": "2026-04-02", "retention_rate": 0.298 },
            { "install_date": "2026-04-08", "retention_rate": 0.305 },
            { "install_date": "2026-04-15", "retention_rate": 0.281, "annotation": "v3.4 release" },
            { "install_date": "2026-04-20", "retention_rate": 0.262 },
            { "install_date": "2026-04-25", "retention_rate": 0.258 }
          ],
          "chart": {
            "type": "line_with_band",
            "title": "D7 Retention by Install Cohort (30d)",
            "x_field": "install_date",
            "y_field": "retention_rate",
            "annotations": [{ "x": "2026-04-15", "label": "v3.4 release" }]
          },
          "finding": {
            "claim": "D7 giảm 4.1pp tập trung ở cohort install_date >= 2026-04-15",
            "magnitude": "high",
            "confidence": 0.91,
            "linked_signal": "S4_d7_drop_d1_ok"
          }
        },
        {
          "type": "next_query_prompt",
          "text": "Continue with Query 2/4: D7 retention by country?",
          "actions": ["continue", "edit_plan", "stop"]
        }
      ],
      "timestamp": "2026-04-29T09:14:48Z"
    },
    {
      "id": "msg-3",
      "role": "user",
      "content": "Continue",
      "timestamp": "2026-04-29T09:15:02Z"
    },
    {
      "id": "msg-4",
      "role": "assistant",
      "tier_used": "standard",
      "content_blocks": [
        {
          "type": "sql_block",
          "query_id": "q2",
          "purpose": "D7 by country top 10",
          "sql": "SELECT c.country_name AS country, AVG(r.retention_rate) AS d7_avg, COUNT(*) AS cohort_size\nFROM gold.retention_overview r\nJOIN silver.dim_country c ON r.country_code = c.country_code\nWHERE r.app_id = 'ca-app-pub-1234567890123456~9876543210'\n  AND retention_day = 7\n  AND install_date >= '2026-04-15'\nGROUP BY country\nORDER BY cohort_size DESC\nLIMIT 10",
          "validated": true,
          "validator_notes": ["✓ Date filter", "✓ App ID filter", "✓ LIMIT 10", "✓ JOIN whitelisted dim_country"]
        },
        {
          "type": "result",
          "query_id": "q2",
          "rows_count": 10,
          "exec_ms": 380,
          "data_preview": [
            { "country": "United States", "d7_avg": 0.241, "cohort_size": 4820 },
            { "country": "Japan", "d7_avg": 0.382, "cohort_size": 2230 },
            { "country": "Indonesia", "d7_avg": 0.184, "cohort_size": 3100 },
            { "country": "Brazil", "d7_avg": 0.226, "cohort_size": 1840 },
            { "country": "Vietnam", "d7_avg": 0.298, "cohort_size": 1220 }
          ],
          "finding": {
            "claim": "US và ID drop nhiều nhất (vs pre-04-15 baseline). JP stable.",
            "confidence": 0.88
          }
        }
      ]
    }
  ],
  "summary": {
    "total_queries": 4,
    "total_findings": 3,
    "charts_proposed": 2,
    "charts_saved": 1,
    "session_duration_ms": 184320,
    "mcp_queries_used": 4,
    "tier_used_max": "standard",
    "estimated_cost_usd": 0.018
  },
  "report_proposal": {
    "should_create": true,
    "type": "scheduled_dashboard",
    "name": "Cohort Retention Health — Weekly",
    "schedule": "weekly_monday_8am",
    "sections": ["D7 trend by cohort", "Geo breakdown", "Source breakdown"]
  },
  "handoff": {
    "to_product_owner": ["D7 drop confirmed post-v3.4, US + ID hardest hit. JP healthy. Recommend rollback investigation."],
    "to_ua_marketing": ["Check campaign mix shift around 04-15"]
  }
}
```

---

## 5. UA Marketing — Daily Report

**File suggested:** `frontend/mock-data/ai-ua-report-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-1234567890123456~9876543210",
    "app_name": "AR Tracer",
    "report_date": "2026-04-29",
    "persona": "ua_marketing",
    "category_lens": "creative_utility",
    "playbook_version": 3,
    "owner": "huy@amobear.com",
    "window": "last_7d",
    "lookback_cohort": "30d",
    "generated_at": "2026-04-29T06:00:00Z"
  },
  "health_score": {
    "score": 58,
    "tier": "C",
    "delta": -6,
    "prev_score": 64,
    "confidence": 0.88,
    "label": "UA HEALTH"
  },
  "radar": {
    "axes": ["ROAS Health", "CPI Efficiency", "Retention Quality", "Geo Diversification", "Network Mix", "LTV Trajectory"],
    "current": [52, 68, 49, 72, 65, 42],
    "previous": [60, 68, 61, 72, 65, 50]
  },
  "dimension_scores": [
    { "dimension": "ROAS Health", "score": 52, "trend": "down", "delta": -8, "weight": 25, "status": "warning" },
    { "dimension": "CPI Efficiency", "score": 68, "trend": "flat", "delta": 0, "weight": 15, "status": "ok" },
    { "dimension": "Retention Quality", "score": 49, "trend": "down", "delta": -12, "weight": 20, "status": "critical" },
    { "dimension": "Geo Diversification", "score": 72, "trend": "flat", "delta": 0, "weight": 10, "status": "ok" },
    { "dimension": "Network Mix", "score": 65, "trend": "flat", "delta": 0, "weight": 10, "status": "ok" },
    { "dimension": "LTV Trajectory", "score": 42, "trend": "down", "delta": -8, "weight": 20, "status": "critical" }
  ],
  "executive_brief": {
    "title": "ROAS Below Target — Recommend Cuts",
    "summary": "Blended ROAS d7 0.78 (target 1.0). TikTok ID + Google US underperform. Recommend cut TikTok ID -50% + scale Google US +30%. Total spend $18.4K/7d.",
    "confidence": 0.88,
    "severity": "warning",
    "signals": ["roas_below_target", "ID_low_quality_users"]
  },
  "kpi_summary": {
    "blended_roas_d7": 0.78,
    "blended_roas_d7_trend": -0.12,
    "blended_roas_d30_proj": 1.34,
    "spend_total_7d": 18420.50,
    "installs_total_7d": 47210,
    "cpi_blended": 0.39
  },
  "action_review": {
    "report_date_t1": "2026-04-28",
    "actions": [
      {
        "id": "UA-2026-04-28-01",
        "description": "Cut TikTok ID -30%",
        "team": "UA",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "Spend giảm $620, blended ROAS hồi phục",
        "next": "Continue cut deeper -50%"
      },
      {
        "id": "UA-2026-04-28-02",
        "description": "Scale Apple SA US +20%",
        "team": "UA",
        "status": "ongoing",
        "carried_days": 1,
        "evidence": "Pending finance approve",
        "next": "Follow up Finance"
      }
    ],
    "summary": "1/2 resolved · 1 ongoing pending finance"
  },
  "channel_country_matrix": {
    "section_score": 52,
    "section_trend": "down",
    "rows": [
      { "network": "TikTok",  "country": "JP", "spend_7d": 1840, "installs_7d": 4220,  "cpi": 0.436, "d7_retention": 0.32, "arpdau_d7": 0.041, "roas_d7": 1.42, "verdict": "ok" },
      { "network": "TikTok",  "country": "US", "spend_7d": 2200, "installs_7d": 6810,  "cpi": 0.323, "d7_retention": 0.24, "arpdau_d7": 0.022, "roas_d7": 0.96, "verdict": "watch" },
      { "network": "TikTok",  "country": "ID", "spend_7d": 4120, "installs_7d": 18420, "cpi": 0.224, "d7_retention": 0.062, "arpdau_d7": 0.018, "roas_d7": 0.31, "verdict": "cut" },
      { "network": "Google",  "country": "US", "spend_7d": 4200, "installs_7d": 8420,  "cpi": 0.499, "d7_retention": 0.28, "arpdau_d7": 0.038, "roas_d7": 1.42, "verdict": "scale" },
      { "network": "Google",  "country": "JP", "spend_7d": 1200, "installs_7d": 1840,  "cpi": 0.652, "d7_retention": 0.34, "arpdau_d7": 0.052, "roas_d7": 1.78, "verdict": "scale" },
      { "network": "Meta",    "country": "US", "spend_7d": 1800, "installs_7d": 3220,  "cpi": 0.559, "d7_retention": 0.25, "arpdau_d7": 0.028, "roas_d7": 1.08, "verdict": "ok" },
      { "network": "Apple SA","country": "US", "spend_7d": 1620, "installs_7d": 2240,  "cpi": 0.723, "d7_retention": 0.35, "arpdau_d7": 0.064, "roas_d7": 1.92, "verdict": "scale" }
    ],
    "conclusion": "TikTok ID là worst performer — spend $4.1K/7d nhưng ROAS 0.31. [UA] cut -50% trong 24h. Apple SA US và Google JP có headroom scale.",
    "conclusion_severity": "warning",
    "team_tags": ["UA"]
  },
  "campaign_diagnostics": [
    {
      "campaign_id": "tt_id_creative_v12",
      "creative_hash": "abc123",
      "network": "TikTok",
      "country": "ID",
      "spend_7d": 620,
      "installs_7d": 2840,
      "issue": "high_install_low_retention",
      "user_signal": {
        "primary_geo": "ID",
        "device_tier": "low_end",
        "session_count_d0": 1.1,
        "core_loop_completion_d0": 0.084
      },
      "recommendation": "Pause creative, A/B with localized v13 (ID-specific)"
    }
  ],
  "audience_behavior": {
    "section_score": 72,
    "by_geo": [
      { "country": "JP", "share_spend": 0.18, "share_revenue": 0.32, "efficiency": 1.78 },
      { "country": "US", "share_spend": 0.42, "share_revenue": 0.38, "efficiency": 0.90 },
      { "country": "ID", "share_spend": 0.24, "share_revenue": 0.08, "efficiency": 0.33 },
      { "country": "BR", "share_spend": 0.10, "share_revenue": 0.12, "efficiency": 1.20 },
      { "country": "VN", "share_spend": 0.06, "share_revenue": 0.10, "efficiency": 1.67 }
    ],
    "lookalike_opportunity": ["JP power users → expand to KR/TW", "VN users → expand to TH/PH"],
    "conclusion": "JP + VN = high-efficiency audiences — [UA] expand lookalike to KR/TW + TH/PH.",
    "conclusion_severity": "positive",
    "team_tags": ["UA"]
  },
  "ltv_cohorts": {
    "section_score": 42,
    "section_trend": "down",
    "rows": [
      { "install_week": "2026-W17", "network": "Google",   "country": "US", "ltv_d7": 0.42, "ltv_d30_proj": 1.85, "payback_days_proj": 21 },
      { "install_week": "2026-W17", "network": "TikTok",   "country": "ID", "ltv_d7": 0.05, "ltv_d30_proj": 0.32, "payback_days_proj": 168 },
      { "install_week": "2026-W17", "network": "Apple SA", "country": "US", "ltv_d7": 0.61, "ltv_d30_proj": 2.42, "payback_days_proj": 18 }
    ],
    "conclusion": "Apple SA US payback 18d — dấu hiệu high-value audience. TikTok ID payback 168d — kill.",
    "conclusion_severity": "critical",
    "team_tags": ["UA"]
  },
  "creative_killlist": [
    { "creative_hash": "abc123", "network": "TikTok", "reason": "D1<15% × spend>$500", "spend_7d": 620 },
    { "creative_hash": "def456", "network": "Meta",   "reason": "ROAS d7 < 0.5 × 7 days", "spend_7d": 320 }
  ],
  "actions": {
    "new": [
      { "id": "UA-2026-04-29-01", "title": "Cut TikTok ID -50% (all camp.)", "team": ["UA"], "urgency": "P0", "urgency_label": "24h", "confidence": 0.88, "expected_impact": { "blended_roas_d7_uplift": 0.08, "spend_save_weekly": 2060 } },
      { "id": "UA-2026-04-29-02", "title": "Kill creative abc123 (TikTok)", "team": ["UA"], "urgency": "P0", "urgency_label": "24h", "confidence": 0.92 },
      { "id": "UA-2026-04-29-03", "title": "Scale Google US +30%", "team": ["UA"], "urgency": "P1", "urgency_label": "3d", "confidence": 0.80, "expected_impact": { "revenue_uplift_weekly": 1800 } },
      { "id": "UA-2026-04-29-04", "title": "Expand JP lookalike → KR/TW", "team": ["UA"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.65 },
      { "id": "UA-2026-04-29-05", "title": "Investigate ID device tier UX", "team": ["Product"], "urgency": "P2", "urgency_label": "14d", "confidence": 0.60 }
    ],
    "carried_forward": [
      { "id": "CF-1", "title": "Apple SA US +20% pending finance", "carried_days": 1, "status": "ongoing", "escalate": false }
    ]
  },
  "handoff": {
    "to_product": ["ID low_end users churn D0 — check device tier UX, possible memory issue"],
    "to_data_analyst": ["Verify cohort LTV projection model assumption — TikTok ID payback >120d"],
    "to_mediation": ["Check fill rate in ID — may correlate with D0 churn"]
  },
  "data_sources": [
    { "block": "UA cost", "source": "bronze.xmp_report", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Cohort LTV", "source": "gold.app_ua_daily", "layer": "gold", "freshness": "T-1", "note": "✅" },
    { "block": "Attribution", "source": "AppsFlyer Master + Adjust", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "Retention", "source": "gold.retention_overview", "layer": "gold", "freshness": "T-1", "note": "✅" },
    { "block": "Creative metadata", "source": "AppsFlyer raw events", "layer": "bronze", "freshness": "T-1", "note": "✅" }
  ]
}
```

---

## 6. Mediation / AdOps — Waterfall Audit

**File suggested:** `frontend/mock-data/ai-mediation-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-1234567890123456~9876543210",
    "app_name": "AR Tracer",
    "report_date": "2026-04-29",
    "persona": "mediation",
    "category_lens": "creative_utility",
    "playbook_version": 3,
    "owner": "tuan@amobear.com",
    "window": "last_7d",
    "generated_at": "2026-04-29T07:00:00Z"
  },
  "health_score": {
    "score": 74,
    "tier": "B",
    "delta": 0,
    "prev_score": 74,
    "confidence": 0.90,
    "label": "MEDIATION HEALTH"
  },
  "radar": {
    "axes": ["eCPM", "Fill Rate", "Concentration", "Format Mix", "Bidding Health"],
    "current": [82, 78, 62, 78, 72],
    "previous": [78, 81, 62, 78, 70]
  },
  "dimension_scores": [
    { "dimension": "eCPM", "score": 82, "trend": "up", "delta": 4, "weight": 25, "status": "positive" },
    { "dimension": "Fill Rate", "score": 78, "trend": "down", "delta": -3, "weight": 25, "status": "ok" },
    { "dimension": "Concentration", "score": 62, "trend": "flat", "delta": 0, "weight": 20, "status": "warning" },
    { "dimension": "Format Mix", "score": 78, "trend": "flat", "delta": 0, "weight": 15, "status": "ok" },
    { "dimension": "Bidding Health", "score": 72, "trend": "up", "delta": 2, "weight": 15, "status": "ok" }
  ],
  "executive_brief": {
    "title": "Fill Rate Drop in Tier-1 Geos — Concentration Risk",
    "summary": "Fill rate dropping in JP/US Tier-1 due to AdMob bidding shift. Top source 64% (warning). Recommend add Liftoff bidding to top 3 ad units. Expected eCPM uplift 12-18%.",
    "confidence": 0.90,
    "severity": "warning",
    "signals": ["S1_revenue_up_fill_down", "concentration_risk_admob"]
  },
  "kpi_summary": {
    "blended_ecpm": 6.42,
    "fill_rate": 0.87,
    "ad_revenue_7d": 14820.50,
    "impressions_7d": 2310000
  },
  "action_review": {
    "report_date_t1": "2026-04-28",
    "actions": [
      {
        "id": "MED-2026-04-28-01",
        "description": "Raise Unity floor JP $4 → $5",
        "team": "Mediation",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "eCPM Unity JP +18%, fill stable",
        "next": "Done — try $6.50 next"
      }
    ],
    "summary": "1/1 resolved"
  },
  "waterfall_breakdown": [
    {
      "ad_unit_id": "rewarded_main",
      "format": "rewarded",
      "section_score": 82,
      "section_trend": "up",
      "tier_1_bidding": [
        { "source": "AdMob Bidding", "ecpm": 8.40, "fill": 0.78, "rev_7d": 1420 },
        { "source": "AppLovin MAX",  "ecpm": 7.92, "fill": 0.65, "rev_7d": 980 }
      ],
      "tier_2_waterfall": [
        { "source": "Unity",      "floor": 5.00, "fill": 0.45, "rev_7d": 320 },
        { "source": "ironSource", "floor": 3.50, "fill": 0.38, "rev_7d": 210 },
        { "source": "Vungle",     "floor": 2.00, "fill": 0.22, "rev_7d": 90 }
      ],
      "diagnosis": "Top tier strong (eCPM > $7), lower waterfall underperforming",
      "conclusion": "Tier 1 bidding mạnh, lower waterfall yếu — [Mediation] remove Vungle hoặc raise floor.",
      "conclusion_severity": "ok"
    },
    {
      "ad_unit_id": "interstitial_main",
      "format": "interstitial",
      "section_score": 68,
      "tier_1_bidding": [
        { "source": "AdMob Bidding", "ecpm": 4.20, "fill": 0.82, "rev_7d": 720 }
      ],
      "tier_2_waterfall": [
        { "source": "AppLovin", "floor": 2.50, "fill": 0.55, "rev_7d": 280 },
        { "source": "Unity",    "floor": 1.50, "fill": 0.48, "rev_7d": 150 }
      ],
      "diagnosis": "Single bidding source — diversification opportunity",
      "conclusion": "Single bidding source = single point of failure — [Mediation] add AppLovin Bidding tier 1.",
      "conclusion_severity": "warning"
    }
  ],
  "ecpm_trends": {
    "section_score": 82,
    "section_trend": "up",
    "rows": [
      { "source": "AdMob",       "trend_7d": 0.042,  "status": "up" },
      { "source": "AppLovin",    "trend_7d": 0.018,  "status": "up" },
      { "source": "Unity",       "trend_7d": 0.0,    "status": "flat" },
      { "source": "ironSource",  "trend_7d": -0.054, "status": "down" },
      { "source": "Liftoff",     "trend_7d": -0.124, "status": "down" }
    ],
    "conclusion": "Liftoff eCPM ↓-12.4% — investigate hoặc swap network."
  },
  "fill_rate_by_geo": {
    "section_score": 78,
    "section_trend": "down",
    "rows": [
      { "country": "US", "tier": 1, "fill": 0.91, "ecpm": 8.20, "status": "ok" },
      { "country": "JP", "tier": 1, "fill": 0.78, "ecpm": 7.10, "status": "warning" },
      { "country": "BR", "tier": 2, "fill": 0.84, "ecpm": 3.20, "status": "ok" },
      { "country": "VN", "tier": 3, "fill": 0.72, "ecpm": 1.80, "status": "warning" },
      { "country": "ID", "tier": 3, "fill": 0.62, "ecpm": 1.40, "status": "critical" }
    ],
    "conclusion": "ID tier-3 fill 62% — chấp nhận được. JP tier-1 78% là regression cần xử lý.",
    "conclusion_severity": "warning"
  },
  "concentration_diagnosis": {
    "section_score": 62,
    "top_source": "AdMob",
    "top_source_share": 0.64,
    "severity": "warning",
    "second_source": "AppLovin",
    "second_source_share": 0.18,
    "all_shares": [
      { "source": "AdMob", "share": 0.64 },
      { "source": "AppLovin", "share": 0.18 },
      { "source": "Unity", "share": 0.08 },
      { "source": "Liftoff", "share": 0.06 },
      { "source": "ironSource", "share": 0.04 }
    ],
    "recommendation": "Shift 10-15% to AppLovin Bidding to reduce single-source dependency. Add Liftoff as fallback.",
    "diversification_target": 0.55,
    "conclusion": "Concentration risk — [Mediation] add Liftoff bidding để giảm AdMob xuống <55%.",
    "conclusion_severity": "warning"
  },
  "format_mix": [
    { "format": "rewarded",     "impressions_pct": 0.42, "revenue_pct": 0.58 },
    { "format": "interstitial", "impressions_pct": 0.28, "revenue_pct": 0.22 },
    { "format": "banner",       "impressions_pct": 0.20, "revenue_pct": 0.08 },
    { "format": "app_open",     "impressions_pct": 0.10, "revenue_pct": 0.12 }
  ],
  "actions": {
    "new": [
      { "id": "MED-2026-04-29-01", "title": "Add Liftoff bidding rewarded_main", "team": ["Mediation"], "urgency": "P0", "urgency_label": "48h", "confidence": 0.85, "expected_impact": { "ecpm_uplift_pct": [8, 12], "concentration_reduction": "AdMob 64% → 55%" } },
      { "id": "MED-2026-04-29-02", "title": "Raise Unity floor JP $5 → $6.50", "team": ["Mediation"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.72 },
      { "id": "MED-2026-04-29-03", "title": "Add AppLovin Bidding interstitial", "team": ["Mediation"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.78 },
      { "id": "MED-2026-04-29-04", "title": "Remove Vungle from waterfall", "team": ["Mediation"], "urgency": "P2", "urgency_label": "14d", "confidence": 0.65 }
    ],
    "carried_forward": []
  },
  "handoff": {
    "to_ua": ["JP fill rate drop có thể correlate với UA mix shift — verify install source by network"],
    "to_devops": ["Verify SDK version Adjust ≥ 4.39 to access bidding"],
    "to_bod": ["Concentration risk: AdMob 64% — strategic diversification needed"]
  },
  "data_sources": [
    { "block": "Waterfall hits", "source": "bronze.mediation_table", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "eCPM/Fill", "source": "gold.fact_daily_app_metrics", "layer": "gold", "freshness": "T-1", "note": "✅" },
    { "block": "SoW analysis", "source": "silver.daily_sow_analysis", "layer": "silver", "freshness": "T-1", "note": "✅" },
    { "block": "Format mix", "source": "bronze.fb_ar_tracer_ios (ad events)", "layer": "bronze", "freshness": "T-1", "note": "✅" }
  ]
}
```

---

## 7. DevOps — Crash Spike Investigation

**File suggested:** `frontend/mock-data/ai-devops-sample.json`

```json
{
  "meta": {
    "app_id": "ca-app-pub-9876543210987654~1234567890",
    "app_name": "Hero Legends RPG",
    "report_date": "2026-04-29",
    "persona": "devops",
    "playbook_version": 5,
    "owner": "ops@amobear.com",
    "trigger_mode": "continuous_alert",
    "alert_state": "active",
    "generated_at": "2026-04-29T03:18:00Z"
  },
  "health_score": {
    "score": 78,
    "tier": "B",
    "delta": -3,
    "prev_score": 81,
    "confidence": 0.94,
    "label": "STABILITY"
  },
  "radar": {
    "axes": ["Crash-free", "ANR Health", "Performance", "SDK Hygiene", "Network Reliability"],
    "current": [62, 88, 78, 65, 92],
    "previous": [82, 88, 78, 70, 92]
  },
  "dimension_scores": [
    { "dimension": "Crash-free", "score": 62, "trend": "down", "delta": -20, "weight": 35, "status": "warning" },
    { "dimension": "ANR Health", "score": 88, "trend": "flat", "delta": 0, "weight": 20, "status": "positive" },
    { "dimension": "Performance", "score": 78, "trend": "flat", "delta": 0, "weight": 20, "status": "ok" },
    { "dimension": "SDK Hygiene", "score": 65, "trend": "down", "delta": -5, "weight": 15, "status": "warning" },
    { "dimension": "Network Reliability", "score": 92, "trend": "flat", "delta": 0, "weight": 10, "status": "positive" }
  ],
  "executive_brief": {
    "title": "Crash Spike v2.3.1 (Android 14 + SD8 Gen 1)",
    "summary": "Crash-free rate dropped to 98.4% (target ≥99%). Affected 12% users (3,420 events/24h). Root cause: NPE @ AdSDKInitializer.initializeAdMob:124. Linked release v2.3.1 (2026-04-25). Adjust SDK CVE also requires P0 update.",
    "confidence": 0.94,
    "severity": "critical",
    "signals": ["S12_crash_spike_version", "sdk_cve_adjust"]
  },
  "alert_banner": {
    "active": true,
    "title": "🚨 ALERT: Crash spike v2.3.1",
    "subtitle": "Affected 12% users · 1,840 events/24h · Detected 18 min ago",
    "actions": [
      { "label": "View Crash Diagnosis", "type": "scroll_to", "target": "section_1" },
      { "label": "Acknowledge", "type": "ack" },
      { "label": "Mute 1h", "type": "mute", "ttl_minutes": 60 }
    ]
  },
  "kpi_summary": {
    "crash_free_rate": 0.984,
    "crash_free_target": 0.99,
    "anr_rate": 0.0021,
    "affected_users_pct": 0.12,
    "crash_events_24h": 3420
  },
  "action_review": {
    "report_date_t1": "2026-04-28",
    "actions": [
      {
        "id": "DEV-2026-04-28-01",
        "description": "Investigate v2.3.1 crash signature",
        "team": "Dev",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "Root cause identified: NPE in AdSDKInitializer",
        "next": "Hotfix v2.3.2"
      }
    ],
    "summary": "1/1 resolved · proceeding to hotfix"
  },
  "crash_diagnosis": {
    "section_score": 62,
    "section_trend": "down",
    "section_delta": -20,
    "stacks": [
      {
        "stack_signature": "java.lang.NullPointerException @ AdSDKInitializer.initializeAdMob:124",
        "occurrences_24h": 1840,
        "first_seen_version": "v2.3.1",
        "first_seen_at": "2026-04-25T14:22:00Z",
        "affected_devices": ["Pixel 8", "Pixel 8 Pro", "Galaxy S24", "Galaxy S24+"],
        "affected_os": ["Android 14"],
        "affected_chipset": ["Snapdragon 8 Gen 1", "Tensor G3"],
        "severity": "critical",
        "fix_priority": "P0",
        "stack_preview": [
          "at com.amobear.hero.ads.AdSDKInitializer.initializeAdMob(AdSDKInitializer.java:124)",
          "at com.amobear.hero.ads.AdSDKInitializer.initialize(AdSDKInitializer.java:67)",
          "at com.amobear.hero.MainApplication.onCreate(MainApplication.java:42)"
        ]
      },
      {
        "stack_signature": "java.lang.OutOfMemoryError @ ImageCache.put:88",
        "occurrences_24h": 620,
        "first_seen_version": "v2.2.0",
        "severity": "warning",
        "fix_priority": "P1"
      },
      {
        "stack_signature": "android.app.RemoteServiceException @ Notification.show:12",
        "occurrences_24h": 180,
        "first_seen_version": "v2.3.0",
        "severity": "warning",
        "fix_priority": "P2"
      }
    ],
    "conclusion": "Hotfix v2.3.2 cần ship trong 48h. [Dev] đã có fix branch.",
    "conclusion_severity": "critical",
    "team_tags": ["Dev"]
  },
  "anr_diagnosis": {
    "section_score": 88,
    "section_trend": "flat",
    "items": [
      { "thread": "main", "pattern": "Network call HeroDataLoader.fetchHeroes", "occurrences_24h": 380, "fix_priority": "P1" },
      { "thread": "main", "pattern": "Disk I/O SharedPrefs", "occurrences_24h": 120, "fix_priority": "P2" }
    ],
    "conclusion": "Move network off main thread — [Dev] async refactor.",
    "conclusion_severity": "ok"
  },
  "performance_metrics": {
    "section_score": 78,
    "metrics": {
      "app_launch_p50_ms": 2400,
      "app_launch_p50_target": 2000,
      "app_launch_p95_ms": 6200,
      "app_launch_p95_target": 5000,
      "frozen_frames_pct": 0.004,
      "network_error_rate": 0.012,
      "battery_per_hour_pct": 0.026,
      "battery_target_max": 0.025
    },
    "verdicts": {
      "launch_p50": "ok",
      "launch_p95": "warning",
      "frozen_frames": "ok",
      "network": "ok",
      "battery": "warning"
    },
    "conclusion": "P95 launch cần optimize. Battery regression từ v2.3.0.",
    "conclusion_severity": "warning"
  },
  "sdk_status": {
    "section_score": 65,
    "section_trend": "down",
    "items": [
      { "name": "Google AdMob", "current": "22.6.0", "latest": "22.6.0", "status": "ok",       "priority": null,  "notes": "Up to date" },
      { "name": "Firebase",     "current": "32.7.0", "latest": "32.8.0", "status": "outdated", "priority": "P2",  "notes": null },
      { "name": "AppsFlyer",    "current": "6.13.0", "latest": "6.14.2", "status": "outdated", "priority": "P1",  "notes": null },
      { "name": "Adjust",       "current": "4.38.0", "latest": "4.39.0", "status": "critical", "priority": "P0",  "notes": "CVE-2026-XXXX security fix" },
      { "name": "AppMetrica",   "current": "5.4.0",  "latest": "5.4.0",  "status": "ok",       "priority": null },
      { "name": "Unity Ads",    "current": "4.10.0", "latest": "4.11.0", "status": "outdated", "priority": "P2" }
    ],
    "conclusion": "Adjust SDK CVE-2026-XXXX cần update P0 — [Dev].",
    "conclusion_severity": "critical"
  },
  "release_correlation": [
    { "version": "v2.2.0", "released_at": "2026-04-01", "crash_free": 0.996, "anr": 0.0018 },
    { "version": "v2.3.0", "released_at": "2026-04-15", "crash_free": 0.992, "anr": 0.0019 },
    { "version": "v2.3.1", "released_at": "2026-04-25", "crash_free": 0.984, "anr": 0.0021, "annotation": "spike" }
  ],
  "actions": {
    "new": [
      { "id": "DEV-2026-04-29-01", "title": "Hotfix NPE AdSDKInit (v2.3.2)", "team": ["Dev"], "urgency": "P0", "urgency_label": "48h", "confidence": 0.95, "expected_impact": { "crash_free_rate_uplift_pp": 1.4 } },
      { "id": "DEV-2026-04-29-02", "title": "Update Adjust SDK 4.39 (CVE)", "team": ["Dev"], "urgency": "P0", "urgency_label": "48h", "confidence": 1.00, "expected_impact": { "security_resolved": true } },
      { "id": "DEV-2026-04-29-03", "title": "Async fix HeroDataLoader", "team": ["Dev"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.80 },
      { "id": "DEV-2026-04-29-04", "title": "Update AppsFlyer 6.14.2", "team": ["Dev"], "urgency": "P1", "urgency_label": "7d", "confidence": 0.90 }
    ],
    "carried_forward": []
  },
  "handoff": {
    "to_qa": ["Run regression smoke for v2.3.2 hotfix focus AdSDK init paths + Android 14 devices"],
    "to_product": ["v2.3.1 onboarding metric drop có thể do crash chứ không phải UX — cần verify"],
    "to_mediation": ["AdSDK init failure could affect ad fill rate — coordinate verification"]
  },
  "data_sources": [
    { "block": "Crash stacks", "source": "AppMetrica + Firebase exception", "layer": "bronze", "freshness": "realtime", "note": "✅" },
    { "block": "Performance", "source": "AppMetrica perf", "layer": "bronze", "freshness": "T-1", "note": "✅" },
    { "block": "SDK metadata", "source": "App build manifest", "layer": "config", "freshness": "live", "note": "✅" },
    { "block": "Releases", "source": "playbook v5 releases", "layer": "config", "freshness": "live", "note": "✅" },
    { "block": "CVE feed", "source": "RAG: SDK CVE database", "layer": "external", "freshness": "T-1", "note": "✅" }
  ]
}
```

---

## 8. QA — Release Gate Decision

**File suggested:** `frontend/mock-data/ai-qa-release-gate-sample.json`

> QA dùng **gate-style layout** (KHÔNG có top strip Health Score + Radar + Dimension Scores như các persona khác). Component spec xem doc 12 §4.9 và §8.5.

```json
{
  "meta": {
    "app_id": "ca-app-pub-9876543210987654~1234567890",
    "app_name": "Hero Legends RPG",
    "candidate_version": "v2.3.2",
    "candidate_type": "hotfix",
    "report_date": "2026-04-29",
    "persona": "qa",
    "release_target_date": "2026-04-30T10:00:00Z",
    "owner": "qa@amobear.com",
    "generated_at": "2026-04-29T08:45:00Z"
  },
  "release_gate": {
    "decision": "CONDITIONAL_GO",
    "decision_severity": "warning",
    "blockers_count": 1,
    "warnings_count": 1,
    "passes_count": 4,
    "recommendation": "BLOCK release until JP onboarding regression resolved. Battery investigation can run in parallel for v2.3.3.",
    "auto_unblock_when": [
      "jp_d0_retention recovers ≥ 0.45 in next candidate build"
    ],
    "estimated_block_duration_days": 2,
    "approved_by": null,
    "blocked_by": null
  },
  "gates": [
    {
      "id": "crash_regression",
      "label": "Crash-free regression",
      "status": "pass",
      "metric": "crash_free_rate",
      "value": 0.995,
      "threshold": 0.99,
      "comparison": "vs v2.3.1 = 0.984 (was a regression itself)",
      "icon": "CheckCircle2"
    },
    {
      "id": "core_loop_no_regression",
      "label": "Core loop completion",
      "status": "pass",
      "metric": "tutorial_completion",
      "value": 0.78,
      "delta_pp": 0,
      "icon": "CheckCircle2"
    },
    {
      "id": "battery_no_regression",
      "label": "Battery usage",
      "status": "warning",
      "metric": "battery_per_hour",
      "value": 0.028,
      "delta_pct": 0.08,
      "note": "Battery +8% vs v2.2 — not a blocker but investigate before next major",
      "icon": "AlertTriangle"
    },
    {
      "id": "anr_health",
      "label": "ANR rate",
      "status": "pass",
      "metric": "anr_rate",
      "value": 0.0018,
      "threshold": 0.002,
      "icon": "CheckCircle2"
    },
    {
      "id": "jp_funnel_no_regression",
      "label": "JP onboarding D0 retention",
      "status": "block",
      "metric": "jp_d0_retention",
      "value": 0.42,
      "delta_pp": -3,
      "note": "JP D0 drops 3pp — block release until investigated",
      "icon": "XCircle"
    },
    {
      "id": "smoke_test_coverage",
      "label": "Smoke test coverage",
      "status": "warning",
      "covered": 12,
      "total": 15,
      "percent": 0.80,
      "uncovered_critical": ["JP_onboarding_bypass", "whale_gacha_10x", "subscription_cancel"],
      "icon": "AlertTriangle"
    }
  ],
  "version_compare": {
    "versions": ["v2.3.0", "v2.3.1", "v2.3.2"],
    "metrics": [
      { "metric": "crash_free",         "values": [0.996, 0.984, 0.995], "verdict": "v2.3.2 fixes v2.3.1 spike" },
      { "metric": "anr",                "values": [0.0018, 0.0021, 0.0018], "verdict": "ok" },
      { "metric": "tutorial_completion","values": [0.78, 0.78, 0.78],   "verdict": "stable" },
      { "metric": "app_launch_p50_ms",  "values": [2200, 2400, 2300],     "verdict": "stable" },
      { "metric": "battery_per_hour",   "values": [0.024, 0.026, 0.028],  "verdict": "regression — +0.4pp over 2 versions" },
      { "metric": "jp_d0_retention",    "values": [0.46, 0.45, 0.42],     "verdict": "regression — investigate" },
      { "metric": "us_d0_retention",    "values": [0.39, 0.38, 0.39],     "verdict": "stable" }
    ]
  },
  "regression_findings": [
    {
      "metric": "jp_d0_retention",
      "magnitude": -0.03,
      "magnitude_unit": "absolute_pp",
      "first_seen_version": "v2.3.1",
      "amplified_in": "v2.3.2",
      "linked_changelog": "v2.3.1 redesign onboarding style picker",
      "severity": "critical",
      "owner_recommended": "product_owner"
    },
    {
      "metric": "battery_per_hour",
      "magnitude": 0.004,
      "magnitude_unit": "absolute_pct",
      "first_seen_version": "v2.3.0",
      "linked_changelog": "v2.3.0 background sync feature",
      "severity": "warning",
      "owner_recommended": "devops"
    }
  ],
  "bug_event_correlations": [
    {
      "user_report": "App stuck after onboarding",
      "report_count": 12,
      "matching_signal": "onboarding_complete event drop -8% in v2.3.1",
      "confidence": 0.78
    },
    {
      "user_report": "Crash on character select",
      "report_count": 4,
      "matching_signal": null,
      "confidence": 0.20,
      "note": "Could not reproduce — keep monitoring"
    },
    {
      "user_report": "Battery drains faster",
      "report_count": 8,
      "matching_signal": "battery_per_hour +8% vs v2.2",
      "confidence": 0.85
    }
  ],
  "smoke_coverage": {
    "covered_paths": [
      "onboarding_default", "tutorial_complete", "first_battle_win", "first_gacha_pull",
      "first_iap_purchase", "subscription_start", "level_18_attempt", "level_20_boss",
      "ad_reward_video", "ad_interstitial_show", "logout_login_cycle", "settings_change_language"
    ],
    "uncovered_critical": ["JP_onboarding_bypass", "whale_gacha_10x", "subscription_cancel"],
    "coverage_pct": 0.80,
    "recommendation": "Add 3 critical paths before next major release"
  },
  "handoff": {
    "to_devops": ["v2.3.2 hotfix verified for AdSDK NPE, but battery regression still present from v2.3.0 onward"],
    "to_product": ["JP onboarding regression — investigate root cause of style picker change"]
  },
  "data_sources": [
    { "block": "Crash data", "source": "AppMetrica + Firebase exception", "layer": "bronze", "freshness": "realtime", "note": "✅" },
    { "block": "Metric snapshot per version", "source": "gold.fact_daily_app_metrics + bronze.fb_*", "layer": "gold + bronze", "freshness": "T-1", "note": "✅" },
    { "block": "User reports", "source": "support_tickets table", "layer": "external", "freshness": "T-1", "note": "✅" },
    { "block": "Smoke test runs", "source": "ci_test_runs table", "layer": "external", "freshness": "live", "note": "✅" }
  ]
}
```

---

## 9. BOD — Portfolio Strategy

**File suggested:** `frontend/mock-data/ai-bod-portfolio-sample.json`

```json
{
  "meta": {
    "report_period": "Q2 2026",
    "report_date": "2026-04-29",
    "persona": "bod",
    "scope": "portfolio",
    "apps_count": 500,
    "active_apps": 453,
    "currency": "USD",
    "owner": "bod@amobear.com",
    "generated_at": "2026-04-29T08:00:00Z"
  },
  "health_score": {
    "score": 78,
    "tier": "B",
    "delta": 2,
    "prev_score": 76,
    "confidence": 0.82,
    "label": "PORTFOLIO HEALTH"
  },
  "radar": {
    "axes": ["Health", "Margin", "Diversification", "Growth", "UA Efficiency", "Risk"],
    "current": [78, 65, 72, 82, 68, 58],
    "previous": [76, 67, 72, 80, 70, 60]
  },
  "dimension_scores": [
    { "dimension": "Portfolio Health", "score": 78, "trend": "up", "delta": 2, "weight": 25, "status": "positive" },
    { "dimension": "Margin", "score": 65, "trend": "down", "delta": -2, "weight": 20, "status": "ok" },
    { "dimension": "Diversification", "score": 72, "trend": "flat", "delta": 0, "weight": 15, "status": "ok" },
    { "dimension": "Growth", "score": 82, "trend": "up", "delta": 2, "weight": 15, "status": "positive" },
    { "dimension": "UA Efficiency", "score": 68, "trend": "down", "delta": -2, "weight": 15, "status": "ok" },
    { "dimension": "Risk Score", "score": 58, "trend": "flat", "delta": 0, "weight": 10, "status": "warning" }
  ],
  "executive_brief": {
    "title": "Portfolio Healthy — Margin Pressure from UA Spend",
    "summary": "Revenue $4.2M/mo (+8.4%), margin 28% (-2pp). Top opportunity: Scale midcore_game (+$420K/mo proj). Top risk: 12 hyper_casual apps with declining D7 retention.",
    "confidence": 0.82,
    "severity": "info",
    "signals": ["margin_pressure", "midcore_growth_engine", "hyper_casual_decline"]
  },
  "kpi_summary": {
    "revenue_total_mo": 4200000,
    "revenue_trend_pct": 0.084,
    "ua_spend_mo": 1800000,
    "ua_spend_trend_pct": 0.12,
    "net_margin": 0.28,
    "net_margin_trend_pp": -0.02,
    "ebitda_mo": 1176000
  },
  "action_review": {
    "report_date_t1": "2026-03-29",
    "report_cycle": "monthly",
    "actions": [
      {
        "id": "BOD-Q1-04",
        "description": "Diversify ad mediation — add AppLovin Bidding portfolio-wide",
        "team": "Mediation",
        "status": "ongoing",
        "carried_days": 31,
        "evidence": "30 apps migrated, 470 remaining",
        "next": "Continue rollout"
      },
      {
        "id": "BOD-Q1-05",
        "description": "JP expansion pilot",
        "team": "UA",
        "status": "resolved",
        "carried_days": 0,
        "evidence": "JP revenue share +4pp vs Q1",
        "next": "Expand to KR/TW"
      }
    ],
    "summary": "1/2 resolved · 1 ongoing portfolio-wide rollout"
  },
  "category_breakdown": {
    "section_score": 78,
    "rows": [
      { "category": "midcore_game",         "apps": 28,  "revenue_mo": 1680000, "trend_pct":  0.124, "verdict": "scale" },
      { "category": "creative_utility",     "apps": 95,  "revenue_mo": 980000,  "trend_pct":  0.042, "verdict": "maintain" },
      { "category": "casual_game",          "apps": 72,  "revenue_mo": 720000,  "trend_pct":  0.018, "verdict": "maintain" },
      { "category": "subscription_content", "apps": 18,  "revenue_mo": 380000,  "trend_pct":  0.082, "verdict": "maintain" },
      { "category": "hyper_casual",         "apps": 142, "revenue_mo": 280000,  "trend_pct": -0.084, "verdict": "prune" },
      { "category": "ai_chat",              "apps": 12,  "revenue_mo": 120000,  "trend_pct":  0.245, "verdict": "watch" },
      { "category": "other",                "apps": 86,  "revenue_mo": 40000,   "trend_pct": -0.020, "verdict": "evaluate" }
    ],
    "conclusion": "Midcore + AI chat là engines tăng trưởng. Hyper_casual cần giảm tải. [BOD] reallocate budget.",
    "conclusion_severity": "info"
  },
  "scale_decisions": [
    {
      "app_id": "ca-app-pub-9876543210987654~1234567890",
      "app_name": "Hero Legends RPG",
      "category": "midcore_game",
      "current_revenue_mo": 620000,
      "scale_action": "+30% UA budget",
      "rationale": "ROAS d30 1.45, payback 28d, healthy retention, growing whale base",
      "expected_revenue_uplift_mo": 180000,
      "evidence": ["roas_d30=1.45", "payback=28d", "whale_arpu_d30=$54"]
    },
    {
      "app_id": "ca-app-pub-1234567890123456~9876543210",
      "app_name": "AR Tracer",
      "category": "creative_utility",
      "current_revenue_mo": 480000,
      "scale_action": "+15% UA budget",
      "rationale": "Stable revenue, recovering from v3.4 regression, strong JP segment",
      "expected_revenue_uplift_mo": 65000
    },
    {
      "app_id": "ca-app-pub-aaa1111111111111~bbb2222222222222",
      "app_name": "Match King",
      "category": "casual_game",
      "current_revenue_mo": 380000,
      "scale_action": "+20% UA budget",
      "rationale": "Match-3 leader, geo expansion opportunity"
    },
    {
      "app_id": "ca-app-pub-ccc3333333333333~ddd4444444444444",
      "app_name": "Story RPG",
      "category": "midcore_game",
      "current_revenue_mo": 520000,
      "scale_action": "+25% UA budget"
    }
  ],
  "maintain_decisions": [
    { "app_id": "...", "app_name": "Photo Pro",     "rationale": "Steady cash cow, low growth ceiling" },
    { "app_id": "...", "app_name": "EduPro",        "rationale": "Subscription stable, no major changes Q2" },
    { "app_id": "...", "app_name": "Stack Runner",  "rationale": "Recently launched, observe 2 more quarters" }
  ],
  "kill_decisions": [
    {
      "app_id": "ca-app-pub-eee5555555555555~fff6666666666666",
      "app_name": "Stack Runner v2",
      "category": "hyper_casual",
      "current_revenue_mo": 14000,
      "ua_spend_mo": 8000,
      "rationale": "D7 6%, ROAS d30 0.42, no improvement trajectory after 2 quarters",
      "recommended_action": "Soft-kill (stop UA, milk organic, sunset in 6 months)",
      "savings_mo": 8000,
      "exit_plan": {
        "stop_ua_date": "2026-05-15",
        "sunset_date": "2026-11-30",
        "data_retention_until": "2027-05-31"
      }
    },
    { "app_id": "...", "app_name": "Word Quest", "current_revenue_mo": 9000, "rationale": "Declining 30%/quarter for 3 quarters", "savings_mo": 4000 },
    { "app_id": "...", "app_name": "Idle Town v1", "current_revenue_mo": 11000, "rationale": "Replaced by Idle Town v2", "savings_mo": 3500 }
  ],
  "risk_concentration": {
    "section_score": 58,
    "revenue_top_3_share": 0.62,
    "revenue_top_3_severity": "warning",
    "revenue_top_3_apps": ["Hero Legends RPG", "Story RPG", "AR Tracer"],
    "geo_concentration": [
      { "country": "US", "share": 0.45, "severity": "warning" },
      { "country": "JP", "share": 0.18, "severity": "ok" },
      { "country": "BR", "share": 0.08, "severity": "ok" }
    ],
    "ad_source_concentration": [
      { "source": "AdMob", "share": 0.64, "severity": "warning" },
      { "source": "AppLovin", "share": 0.18, "severity": "ok" }
    ],
    "ua_network_concentration": [
      { "network": "Google", "share": 0.48, "severity": "ok" },
      { "network": "TikTok", "share": 0.32, "severity": "ok" },
      { "network": "Meta", "share": 0.15, "severity": "ok" }
    ],
    "conclusion": "3 vùng concentration risk — đề xuất diversification Q2.",
    "conclusion_severity": "warning"
  },
  "quarterly_outlook": {
    "section_score": 82,
    "revenue_proj_eoq_low": 12200000,
    "revenue_proj_eoq_mid": 13200000,
    "revenue_proj_eoq_high": 14000000,
    "confidence": 0.78,
    "key_drivers": ["midcore_game scale", "UA efficiency improvement", "JP expansion"],
    "key_risks": ["Hyper_casual decline", "AdMob bidding spec changes Q3", "iOS privacy update impact"],
    "conclusion": "EOQ revenue projection $13.2M (mid) — confidence 78%."
  },
  "actions": {
    "new": [
      { "id": "BOD-Q2-01", "title": "Reallocate 20% UA hyper → midcore", "team": ["BOD", "UA"], "urgency": "P0", "urgency_label": "Q2 start", "confidence": 0.85, "expected_impact": { "revenue_uplift_q": 480000, "net_margin_uplift_pp": 1.5 } },
      { "id": "BOD-Q2-02", "title": "Soft-kill 3 hyper_casual apps", "team": ["BOD", "Product"], "urgency": "P0", "urgency_label": "May 15", "confidence": 0.92, "expected_impact": { "cost_save_q": 30000, "team_focus_freed": "2 engineers" } },
      { "id": "BOD-Q2-03", "title": "Diversify ad mediation AdMob < 55%", "team": ["BOD", "Mediation"], "urgency": "P1", "urgency_label": "Q2", "confidence": 0.75 },
      { "id": "BOD-Q2-04", "title": "Expand JP segment to KR + TW", "team": ["BOD", "UA"], "urgency": "P1", "urgency_label": "Q2", "confidence": 0.70 },
      { "id": "BOD-Q2-05", "title": "Evaluate AI Chat for incremental investment", "team": ["BOD", "Product"], "urgency": "P2", "urgency_label": "Q3", "confidence": 0.60 }
    ],
    "carried_forward": [
      { "id": "BOD-Q1-04", "title": "AppLovin Bidding portfolio-wide rollout", "carried_days": 31, "status": "ongoing", "escalate": false }
    ]
  },
  "data_sources": [
    { "block": "Aggregated metrics", "source": "gold.fact_daily_app_metrics", "layer": "gold", "freshness": "T-1", "note": "✅" },
    { "block": "Persona reports rollup", "source": "ai_persona_reports table", "layer": "config", "freshness": "live", "note": "✅" },
    { "block": "Financial data", "source": "Internal P&L (external)", "layer": "external", "freshness": "T-1", "note": "✅" },
    { "block": "Benchmark", "source": "FG1 + market intel KB", "layer": "external", "freshness": "weekly", "note": "✅" }
  ]
}
```

---

## 10. AI Hub Daily Brief

**File suggested:** `frontend/mock-data/ai-hub-daily-brief-sample.json`

```json
{
  "report_date": "2026-04-29",
  "user": {
    "id": "minh@amobear.com",
    "role": "product_manager",
    "display_name": "Minh"
  },
  "portfolio_summary": {
    "health_score": 78,
    "tier": "B",
    "trend": "up",
    "delta": 2,
    "active_apps": 453,
    "total_apps": 500,
    "severity_counts": { "critical": 12, "warning": 47, "positive": 28, "tip": 18 },
    "p0_actions_pending": 23,
    "cross_agent_handoffs": 8
  },
  "personas": [
    { "id": "app_insight",    "label": "App Insight",    "icon": "Bot",          "today_count": 47, "last_run_at": "2026-04-29T05:12:00Z", "p0": 0,  "enabled": true, "phase": "live" },
    { "id": "product_owner",  "label": "Product Owner",  "icon": "Compass",      "today_count": 12, "last_run_at": "2026-04-29T07:14:00Z", "p0": 4, "p1": 5, "p2": 3, "enabled": true, "phase": "p1" },
    { "id": "data_analyst",   "label": "Data Analyst",   "icon": "BarChart3",    "today_count": 5,  "last_run_at": "2026-04-29T08:38:00Z", "p0": 0,  "enabled": true, "phase": "p1" },
    { "id": "ua_marketing",   "label": "UA Marketing",   "icon": "Target",       "today_count": 8,  "last_run_at": "2026-04-29T06:00:00Z", "p0": 2, "p1": 3, "p2": 3, "enabled": true, "phase": "p1" },
    { "id": "mediation",      "label": "Mediation",      "icon": "Radio",        "today_count": 6,  "last_run_at": "2026-04-29T07:00:00Z", "p0": 1, "p1": 3, "p2": 2, "enabled": true, "phase": "p2" },
    { "id": "devops",         "label": "DevOps",         "icon": "Settings2",    "today_count": 3,  "last_run_at": "2026-04-29T03:18:00Z", "p0": 2, "p1": 2, "p2": 1, "enabled": true, "phase": "p2_beta" },
    { "id": "qa",             "label": "QA",             "icon": "ShieldCheck",  "today_count": 1,  "last_run_at": "2026-04-29T04:00:00Z", "p0": 0,  "enabled": true, "phase": "p2_beta" },
    { "id": "bod",            "label": "BOD",            "icon": "Landmark",     "today_count": 4,  "last_run_at": "2026-04-29T08:00:00Z", "p0": 2, "p1": 1, "p2": 2, "enabled": true, "phase": "p2" }
  ],
  "top_p0_actions": [
    { "id": "F-2026-04-29-01", "app": "AR Tracer",    "persona": "product_owner", "title": "Rollback onboarding v3.4",            "carried_days": 3, "status": "in_progress", "escalated": true },
    { "id": "G-2026-04-29-01", "app": "Hero RPG",     "persona": "product_owner", "title": "Reduce L18 difficulty 15%",            "carried_days": 0, "status": "open", "escalated": false },
    { "id": "UA-2026-04-29-01","app": "AR Tracer",    "persona": "ua_marketing",  "title": "Cut TikTok ID -50%",                   "carried_days": 0, "status": "open", "escalated": false },
    { "id": "DEV-2026-04-29-01","app": "Hero RPG",    "persona": "devops",        "title": "Hotfix NPE AdSDK (v2.3.2)",            "carried_days": 0, "status": "in_progress", "escalated": true },
    { "id": "DEV-2026-04-29-02","app": "Hero RPG",    "persona": "devops",        "title": "Update Adjust SDK 4.39 (CVE)",         "carried_days": 0, "status": "open", "escalated": false },
    { "id": "MED-2026-04-29-01","app": "AR Tracer",   "persona": "mediation",     "title": "Add Liftoff bidding rewarded_main",    "carried_days": 1, "status": "open", "escalated": false },
    { "id": "BOD-Q2-01",       "app": "(Portfolio)",  "persona": "bod",           "title": "Reallocate 20% UA budget hyper→midcore","carried_days": 0, "status": "open", "escalated": false },
    { "id": "BOD-Q2-02",       "app": "(Portfolio)",  "persona": "bod",           "title": "Soft-kill 3 hyper_casual apps",        "carried_days": 0, "status": "open", "escalated": false }
  ],
  "recent_activity": [
    { "persona": "product_owner", "app": "AR Tracer",    "action": "ran",   "timestamp": "2026-04-29T07:14:00Z", "summary": "Verdict: PMF Slipping B → C" },
    { "persona": "data_analyst",  "app": "Hero RPG",     "action": "ran",   "timestamp": "2026-04-29T08:38:00Z", "summary": "L18 fail rate investigation" },
    { "persona": "ua_marketing",  "app": "Stack Runner", "action": "ran",   "timestamp": "2026-04-29T06:00:00Z", "summary": "ROAS d7 0.42 below threshold" },
    { "persona": "mediation",     "app": "AR Tracer",    "action": "ran",   "timestamp": "2026-04-29T07:00:00Z", "summary": "Concentration risk AdMob 64%" },
    { "persona": "devops",        "app": "Hero RPG",     "action": "alert", "timestamp": "2026-04-29T03:18:00Z", "summary": "Crash spike v2.3.1" }
  ],
  "active_handoffs": [
    { "from": "product_owner", "to": "data_analyst",  "app": "AR Tracer", "question": "Verify cohort 04-15 onward retention",       "created_at": "2026-04-29T07:20:00Z", "status": "pending" },
    { "from": "ua_marketing",  "to": "product_owner", "app": "Hero RPG",  "question": "ID low-end users churn — device tier issue?", "created_at": "2026-04-29T06:42:00Z", "status": "pending" },
    { "from": "devops",        "to": "qa",            "app": "Hero RPG",  "question": "Run regression for v2.3.2 hotfix",            "created_at": "2026-04-29T04:18:00Z", "status": "in_progress" },
    { "from": "mediation",     "to": "ua_marketing",  "app": "AR Tracer", "question": "JP fill drop correlate with UA mix?",         "created_at": "2026-04-29T07:08:00Z", "status": "pending" }
  ]
}
```

---

## 11. Playbook — AR Tracer (Utility)

**File suggested:** `frontend/mock-data/playbook-ar-tracer.yaml`

```yaml
playbook_version: 3
app_id: ca-app-pub-1234567890123456~9876543210
app_name: AR Tracer
category_id: creative_utility
status: active

funnels:
  - id: onboarding
    label: "Onboarding (Default)"
    description: "Luồng new user từ install đến tạo content lần đầu"
    cohort_basis: install_date
    measurement_window_days: 1
    geo_variants:
      JP:
        steps:
          - { event: app_open, label: "Open App" }
          - { event: end_onboard_jp, label: "JP Bypass Onboarding" }
          - { event: first_drawing_start, label: "Drawing Start" }
          - { event: first_drawing_complete, label: "Drawing Complete" }
          - { event: first_save_or_share, label: "Save/Share" }
        notes: "JP users skip personalization step (~93%)"
    default:
      steps:
        - { event: app_open, label: "Open App" }
        - { event: onboard_step_1, label: "Welcome" }
        - { event: onboard_step_2, label: "Choose Style" }
        - { event: onboard_step_3, label: "Permission" }
        - { event: onboard_complete, label: "Complete Onboard" }
        - { event: first_drawing_start, label: "Drawing Start" }
        - { event: first_drawing_complete, label: "Drawing Complete" }
        - { event: first_save_or_share, label: "Save/Share" }

  - id: core_loop
    label: "Daily Core Loop"
    cohort_basis: dau_session
    measurement_window_days: 1
    default:
      steps:
        - { event: session_start, label: "Open Session" }
        - { event: browse_template, label: "Browse" }
        - { event: drawing_start, label: "Draw Start" }
        - { event: drawing_complete, label: "Draw Complete" }
        - { event: save_or_share, label: "Save/Share" }

kpi_overrides:
  drawing_rate: { target: 0.45, severity_warn: 0.35, severity_crit: 0.30 }
  d1_retention: { target: 0.32, severity_warn: 0.25 }
  geo_overrides:
    JP:
      d1_retention: { target: 0.40 }
      arpdau: { target: 0.35 }

custom_events:
  - name: first_drawing_start
    aliases: [drawing_start_first, drawing_first]
    description: "Lần đầu user bấm bắt đầu vẽ"
  - name: end_onboard_jp
    description: "JP-specific bypass — không có ở GEO khác"
  - name: save_or_share
    aliases: [content_save, content_share]

releases:
  - { version: "3.4.0", date: "2026-04-15", notes: "Redesign onboarding style picker" }
  - { version: "3.3.0", date: "2026-04-01", notes: "New filter pack" }
  - { version: "3.2.5", date: "2026-03-15", notes: "Bug fixes" }
  - { version: "3.2.0", date: "2026-03-01", notes: "Subscription paywall update" }

analysis_scenarios:
  - id: jp_localization_health
    persona: [product_owner]
    schedule: daily
    trigger: "geo_d1_retention.JP < 0.35 OR jp_share_revenue_drop > 0.10"
    questions:
      - "JP cohort có tiếp tục skip personalization?"
      - "JP D7 retention so với US/EU như thế nào?"
      - "Có template/filter JP-specific nào underperform?"
  - id: onboarding_regression_check
    persona: [product_owner, data_analyst]
    schedule: daily
    trigger: "drawing_rate_dod < -3"
    questions:
      - "Step nào trong funnel rớt nhất?"
      - "Có phải release vừa rồi gây regression?"

glossary:
  - { term: "drawing", definition: "Hành động trace 1 image với AR overlay" }
  - { term: "completion", definition: "User finish drawing và lưu/share — không bao gồm cancel" }

handoff_matrix:
  - { trigger: "stuck_step:onboard_step_2", primary: product_owner, copy: [data_analyst] }
  - { trigger: "roas_drop_>15pct", primary: ua_marketing, copy: [product_owner] }
  - { trigger: "fill_rate_drop_>5pct", primary: mediation }

owners:
  product_owner: minh@amobear.com
  data_analyst: lan@amobear.com
  ua_lead: huy@amobear.com
  mediation_lead: tuan@amobear.com

last_updated: "2026-04-28"
last_updated_by: minh@amobear.com
```

---

## 12. Playbook — Hero RPG (Game)

**File suggested:** `frontend/mock-data/playbook-hero-rpg.yaml`

```yaml
playbook_version: 5
app_id: ca-app-pub-9876543210987654~1234567890
app_name: Hero Legends RPG
category_id: midcore_game
status: active

funnels:
  - id: tutorial
    label: "Tutorial Funnel"
    cohort_basis: install_date
    measurement_window_days: 1
    default:
      steps:
        - { event: tutorial_start, label: "Tutorial Start" }
        - { event: tutorial_step_1_complete, label: "Step 1: Movement" }
        - { event: tutorial_step_2_complete, label: "Step 2: Combat" }
        - { event: tutorial_step_3_complete, label: "Step 3: Hero" }
        - { event: tutorial_complete, label: "Complete" }
        - { event: first_battle_win, label: "First PvE Win" }

  - id: economy_loop
    label: "Daily Economy Loop"
    cohort_basis: dau_session
    default:
      steps:
        - { event: claim_daily, label: "Daily Login Reward" }
        - { event: complete_quest, label: "Daily Quest" }
        - { event: spend_currency, label: "Spend (any source)" }
        - { event: gacha_pull, label: "Gacha" }
        - { event: hero_upgrade, label: "Upgrade Hero" }

game_progression:
  level_structure:
    type: linear
    total_levels: 200
    chapter_size: 20
    boss_levels: [10, 20, 30, 50, 100, 200]
  difficulty_target:
    avg_attempts_per_level: { target_max: 2.5, warn: 4.0, crit: 6.0 }
    pass_rate: { target_min: 0.60, warn: 0.45, crit: 0.30 }

game_economy:
  currencies:
    - id: gold
      type: soft
      sources: [quest_reward, battle_drop, daily_login]
      sinks: [hero_upgrade, equipment_buy]
    - id: gem
      type: hard
      sources: [iap, ad_reward, achievement]
      sinks: [gacha_pull, refresh_shop, energy_refill]
    - id: energy
      type: capped
      max: 120
      regen_per_min: 0.5
      sinks: [start_battle]
  iap_skus:
    - { sku: starter_pack, price_usd: 4.99, contains: { gem: 600, hero_x_shard: 30 } }
    - { sku: monthly_pass, price_usd: 9.99, type: subscription, contains: { gem_per_day: 100 } }
    - { sku: gem_pack_small, price_usd: 1.99, contains: { gem: 200 } }
  gacha:
    - { banner: standard, pull_cost_gem: 300, rates: { SSR: 0.015, SR: 0.06, R: 0.925 } }
    - { banner: featured, pull_cost_gem: 300, rates: { SSR: 0.020, SR: 0.06, R: 0.920 } }

kpi_overrides:
  tutorial_completion: { target: 0.78, warn: 0.65, crit: 0.55 }
  stuck_level_pct: { target_max: 0.20 }
  gem_inflation_30d: { target_max: 0.10, warn: 0.20, crit: 0.30 }
  arpwhale_d30: { target: 50.0 }

releases:
  - { version: "2.3.1", date: "2026-04-25", notes: "Hotfix attempt — caused AdSDK NPE" }
  - { version: "2.3.0", date: "2026-04-15", notes: "Background sync feature + onboarding tweaks" }
  - { version: "2.2.0", date: "2026-04-01", notes: "Q2 content drop, 20 new levels" }

analysis_scenarios:
  - id: stuck_level_audit
    persona: [product_owner, data_analyst]
    schedule: weekly
    questions:
      - "Top 5 levels có fail_rate cao nhất 7 ngày qua?"
      - "Drop rate tại boss levels (10, 20, 30) có vượt baseline?"
      - "Có cần giảm difficulty hay thêm boost availability?"
  - id: gacha_balance_audit
    persona: [product_owner, data_analyst]
    schedule: weekly
    questions:
      - "Pull rate thực tế vs công bố (SSR 0.015) có khớp?"
      - "Whale gacha pulls có giảm? — tín hiệu fatigue?"
      - "Currency inflation rate trong 30d?"
  - id: monetization_mix_health
    persona: [product_owner, ua_marketing]
    schedule: daily
    questions:
      - "Tỉ lệ user mua starter_pack / new install?"
      - "Subscription churn rate vs target?"

handoff_matrix:
  - { trigger: "stuck_level:18-20", primary: product_owner, copy: [data_analyst] }
  - { trigger: "currency_inflation_>20pct", primary: product_owner, copy: [data_analyst, ua_marketing] }
  - { trigger: "crash_spike_post_release", primary: devops, copy: [qa, product_owner] }

owners:
  product_owner: gameteam@amobear.com
  ua_lead: huy@amobear.com
  game_designer: balance@amobear.com
  devops_lead: ops@amobear.com

last_updated: "2026-04-29"
last_updated_by: gameteam@amobear.com
```

---

## 13. Category Profile — midcore_game

**File suggested:** `frontend/mock-data/category-midcore-game.yaml`

```yaml
category_id: midcore_game
display_name: "Mid-core Game (RPG, Strategy)"
description: "Game có progression sâu, kinh tế phức tạp, gacha/hero collection"

default_funnel:
  - { id: install, label: "Install" }
  - { id: tutorial_start, label: "Tutorial Start" }
  - { id: tutorial_complete, label: "Tutorial Complete" }
  - { id: first_battle, label: "First Battle" }
  - { id: first_upgrade, label: "First Hero Upgrade" }
  - { id: first_gacha_pull, label: "First Gacha" }
  - { id: first_iap, label: "First Purchase" }
  - { id: d1_return, label: "D1 Return" }

kpi_catalog:
  - { id: tutorial_completion, target: 0.75, severity_warn: 0.6, severity_crit: 0.5 }
  - { id: stuck_level_pct, target_max: 0.25, severity_warn: 0.30, severity_crit: 0.40,
      definition: "Tỉ lệ user fail ≥ 5 lần ở 1 level" }
  - { id: gacha_pull_per_dau, target: 1.5, severity_low: 0.8 }
  - { id: currency_inflation_30d, target_max: 0.15, severity_warn: 0.25 }
  - { id: arpwhale_d30, target: 50.0 }
  - { id: f2p_d7_retention, target: 0.30 }
  - { id: iap_revenue_share, target: 0.40 }

analysis_scenarios:
  - id: stuck_level_diagnosis
    persona: [product_owner, data_analyst]
    trigger: "stuck_level_pct > threshold OR drop_rate_at_level > 0.4"
    skills: [game.level.fail_funnel, game.level.attempt_distribution, game.economy.boost_usage]
  - id: economy_balance_check
    persona: [product_owner, data_analyst]
    trigger: "weekly_audit OR currency_inflation > threshold"
    skills: [game.economy.source_sink, game.economy.player_segment_balance]

default_skills:
  product_owner: [game.level.fail_funnel, game.economy.balance_audit, game.cohort.progression, po.changelog.correlate]
  data_analyst: [game.level.heatmap, game.economy.source_sink, da.cohort.builder, da.dimensional.matrix]
  ua_marketing: [ua.cohort.ltv, ua.creative.killlist, game.ua.payback_by_country]

# Persona-specific radar axes (for HealthScoreCard + RadarChart components)
persona_radar_axes:
  product_owner: ["Tutorial", "Level Progression", "Economy Balance", "Gacha Health", "Monetization Mix", "Engagement"]
  ua_marketing: ["ROAS Health", "CPI Efficiency", "Retention Quality", "Geo Diversification", "Network Mix", "LTV Trajectory"]

glossary:
  - { term: "stuck", definition: "User fail level ≥ 5 lần liên tiếp không pass" }
  - { term: "whale", definition: "User chi ≥ $100/30d" }
  - { term: "soft currency", definition: "Coin earn được qua gameplay" }
  - { term: "hard currency", definition: "Gem mua bằng tiền thật" }
  - { term: "gacha", definition: "Random hero/equipment draw mechanic" }
```

---

## 14. Cross-Agent Handoff Sample

**File suggested:** `frontend/mock-data/cross-agent-handoff-sample.json`

```json
{
  "handoffs": [
    {
      "id": "ho-2026-04-29-001",
      "app_id": "ca-app-pub-1234567890123456~9876543210",
      "app_name": "AR Tracer",
      "from_persona": "product_owner",
      "from_persona_label": "Product Owner",
      "to_persona": "data_analyst",
      "to_persona_label": "Data Analyst",
      "trigger": "po_open_question",
      "question": "Cohort install_date 2026-04-15 onward có thực sự retention thấp hơn cohort 2026-04-01 to 2026-04-14? Cần verify trước khi rollback v3.4.",
      "context": {
        "linked_report_id": "po-report-2026-04-29",
        "linked_action_id": "F-2026-04-29-01",
        "metrics_in_question": ["d1_retention", "d7_retention"]
      },
      "created_at": "2026-04-29T07:20:00Z",
      "status": "pending",
      "expected_response_within_hours": 4
    },
    {
      "id": "ho-2026-04-29-002",
      "app_id": "ca-app-pub-9876543210987654~1234567890",
      "app_name": "Hero Legends RPG",
      "from_persona": "devops",
      "from_persona_label": "DevOps",
      "to_persona": "qa",
      "to_persona_label": "QA",
      "trigger": "release_candidate_ready",
      "question": "Run regression smoke for v2.3.2 hotfix focus AdSDK init paths + Android 14 devices",
      "context": {
        "linked_report_id": "devops-report-2026-04-29",
        "candidate_version": "v2.3.2",
        "focus_areas": ["ad_sdk_init", "android_14_compat"]
      },
      "created_at": "2026-04-29T04:18:00Z",
      "status": "in_progress",
      "responded_at": "2026-04-29T08:45:00Z",
      "response_summary": "Smoke test passed AdSDK init. JP onboarding regression detected — see release_gate report."
    },
    {
      "id": "ho-2026-04-29-003",
      "app_id": "ca-app-pub-1234567890123456~9876543210",
      "app_name": "AR Tracer",
      "from_persona": "mediation",
      "from_persona_label": "Mediation",
      "to_persona": "ua_marketing",
      "to_persona_label": "UA Marketing",
      "trigger": "fill_rate_drop_>5pct",
      "question": "JP fill rate drop 78% (target 90%) có thể correlate với UA mix shift gần đây — verify install source by network",
      "context": {
        "linked_report_id": "mediation-report-2026-04-29",
        "metrics_in_question": ["fill_rate.JP", "install_source_share"]
      },
      "created_at": "2026-04-29T07:08:00Z",
      "status": "pending"
    },
    {
      "id": "ho-2026-04-29-004",
      "app_id": "ca-app-pub-9876543210987654~1234567890",
      "app_name": "Hero Legends RPG",
      "from_persona": "ua_marketing",
      "from_persona_label": "UA Marketing",
      "to_persona": "product_owner",
      "to_persona_label": "Product Owner",
      "trigger": "ua_user_quality_concern",
      "question": "ID low-end users churn D0 92% — có phải device tier UX issue (memory? performance?)? Cần Product investigate.",
      "context": {
        "linked_report_id": "ua-report-2026-04-29",
        "segment": { "country": "ID", "device_tier": "low_end" }
      },
      "created_at": "2026-04-29T06:42:00Z",
      "status": "pending"
    }
  ]
}
```

---

## Notes

- Tất cả `app_id`, `creative_hash`, email, app_name là fictional — không phải production data.
- Số liệu được thiết kế stress-test UI: cả happy path (positive) và edge case (critical, regression).
- Funnel và level data có cả pattern healthy + broken để dev test rendering.
- Khi schema thay đổi trong doc 10/12, phải update sample data tương ứng để FE không bị stale.
- Mỗi sample có `data_completeness` để test partial-data state UI (xem doc 12 §7.3).
- Persona reports đều có `health_score`, `radar`, `dimension_scores` ở top — dùng cho `<HealthScoreCard>` + `<RadarChart>` + `<DimensionScoresTable>` (trừ DA chat-style và QA gate-style).
- `actions: { new, carried_forward }` là format chuẩn cho `<ActionPlanTable>`.
- `data_sources` cuối mỗi sample → `<AppendixDataSources>`.
- `action_review` → `<ActionReviewTable>` (T+1 carried actions).
- `executive_brief` (title + summary + confidence + severity + signals) → `<VerdictBanner>`.
