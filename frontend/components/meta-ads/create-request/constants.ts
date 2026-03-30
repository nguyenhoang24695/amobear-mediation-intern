// Standalone constants - no imports from other create-request modules
// (avoids circular dependency between create-request-content and section-adset-budget)

export const OBJECTIVE_OPTIMIZATION_MAP: Record<string, string[]> = {
  OUTCOME_APP_PROMOTION: ["APP_INSTALLS", "LINK_CLICKS", "VALUE"],
  OUTCOME_TRAFFIC: ["LINK_CLICKS", "LANDING_PAGE_VIEWS", "IMPRESSIONS", "REACH"],
  OUTCOME_AWARENESS: ["REACH", "IMPRESSIONS", "AD_RECALL_LIFT"],
  OUTCOME_ENGAGEMENT: ["POST_ENGAGEMENT", "PAGE_LIKES", "LINK_CLICKS", "IMPRESSIONS"],
  OUTCOME_LEADS: ["LEAD_GENERATION", "LINK_CLICKS", "CONVERSIONS"],
  OUTCOME_SALES: ["CONVERSIONS", "VALUE", "LINK_CLICKS"],
}

