import type { InsightTemplateSection } from "@/types/api"

/** Bản sao cấu trúc 7 section mặc định (khớp backend seed / doc 121) để tạo template mới trên FE. */
export function createDefaultSections(): InsightTemplateSection[] {
  return [
    {
      sectionKey: "executive_summary",
      title: "📊 Executive Summary",
      metrics: [
        "health_score",
        "health_tier",
        "composite_8d",
        "total_revenue",
        "impressions",
        "ecpm",
        "fill_rate",
      ],
      comparisonPeriods: ["dod", "7d_avg", "14d_avg"],
      aiInstruction:
        "Tóm tắt health score, radar/bảng 8 chiều khi có dimension scores; 2–4 câu narrative; chỉ số từ snapshot.",
      audience: ["bod"],
      sortOrder: 1,
      isActive: true,
      anomalyThresholds: null,
    },
    {
      sectionKey: "revenue_monetization",
      title: "💰 Revenue & Monetization (+ Ad Infrastructure)",
      metrics: [
        "total_revenue",
        "iaa_revenue",
        "iap_revenue",
        "ecpm",
        "arpdau",
        "fill_rate",
        "revenue_mix",
        "sow_percent",
        "fill_rate_by_format",
      ],
      comparisonPeriods: ["dod", "7d_avg", "14d_avg"],
      aiInstruction:
        "Revenue đa nguồn (AdMob/AppLovin) + fill/SoW/waterfall từ snapshot; IAA vs IAP; không bịa số không có trong JSON.",
      audience: ["bod", "mediation", "da"],
      sortOrder: 2,
      isActive: true,
      anomalyThresholds: {
        revenuePctVs7d: 20,
        ecpmPctVs7d: 15,
        fillRateMinPct: 80,
        singleNetworkSowMaxPct: 60,
      },
    },
    {
      sectionKey: "users_engagement",
      title: "👥 Engagement & Retention",
      metrics: [
        "d1_retention",
        "d7_retention",
        "dau",
        "dav",
        "arpdau",
        "session_length",
        "stickiness_dau_mau",
      ],
      comparisonPeriods: ["dod", "7d_avg", "14d_avg"],
      aiInstruction:
        "Dùng usersEngagement.dailySeries + gold/Firebase DAU; retention curve qua MCP nếu snapshot thiếu cohort.",
      audience: ["product", "ua", "bod"],
      sortOrder: 3,
      isActive: true,
      anomalyThresholds: {
        impressionsPctVs7d: 15,
        d1RetentionMinPct: 30,
        d7RetentionMinPct: 10,
        d1RetentionPctVs14d: 10,
      },
    },
    {
      sectionKey: "game_health",
      title: "🎮 Product & Content Health",
      metrics: ["level_drop_rate", "win_rate", "crash_rate", "feature_adoption", "progression_funnel"],
      comparisonPeriods: ["7d_avg", "14d_avg"],
      aiInstruction:
        "gameHealth: AppMetrica (game) hoặc Firebase topEvents; level stress / crash chỉ khi có trong snapshot.",
      audience: ["dev", "product", "game"],
      sortOrder: 4,
      isActive: true,
      anomalyThresholds: { levelDropRateMaxPct: 25, crashFreeRateMinPct: 99 },
    },
    {
      sectionKey: "ua_growth",
      title: "📈 Growth & Acquisition",
      metrics: [
        "installs",
        "organic_ratio",
        "cpi",
        "campaign_roas_d7",
        "ua_cost",
        "roi",
        "xmp_spend_by_module",
      ],
      comparisonPeriods: ["dod", "7d_avg"],
      aiInstruction:
        "snapshot.ua: gold ua_cost/roi, xmpSpendByModule, AppLovin; campaign/Adjust JSON qua MCP read_query — không bịa CPI/ROAS không có dữ liệu.",
      audience: ["ua", "marketing", "bod"],
      sortOrder: 5,
      isActive: true,
      anomalyThresholds: {
        newUsersPctVs7d: 25,
        campaignRoasMin: 1.0,
        organicRatioMinPct: 30,
        cpiSpikePctVs7d: 30,
      },
    },
    {
      sectionKey: "anomalies",
      title: "⚠️ Anomalies & Alerts",
      metrics: ["anomalies", "data_gaps"],
      comparisonPeriods: ["dod"],
      aiInstruction: "Mở rộng anomaly rule-based; liên hệ chéo dimension khi hợp lý.",
      audience: ["bod", "mediation", "ua", "product", "da", "dev"],
      sortOrder: 6,
      isActive: true,
      anomalyThresholds: null,
    },
    {
      sectionKey: "recommendations",
      title: "✅ Recommendations & Action Plan",
      metrics: ["actions", "ltv_cac", "payback_days", "optimization_velocity"],
      comparisonPeriods: ["dod", "7d_avg"],
      aiInstruction:
        "Action plan gắn team; unit economics / velocity khi snapshot hoặc MCP có dữ liệu.",
      audience: ["bod", "mediation", "ua", "product", "da", "dev", "game"],
      sortOrder: 7,
      isActive: true,
      anomalyThresholds: {
        ltvCacMinHealthy: 1.5,
        paybackWarningDays: 60,
        pendingRecommendationDays: 7,
      },
    },
  ]
}
