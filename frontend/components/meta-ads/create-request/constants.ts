// Standalone constants - no imports from other create-request modules
// (avoids circular dependency between create-request-content and section components)

export const OBJECTIVE_OPTIMIZATION_MAP: Record<string, string[]> = {
  OUTCOME_APP_PROMOTION: ["APP_INSTALLS", "LINK_CLICKS", "VALUE"],
  OUTCOME_TRAFFIC: ["LINK_CLICKS", "LANDING_PAGE_VIEWS", "IMPRESSIONS", "REACH"],
  OUTCOME_AWARENESS: ["REACH", "IMPRESSIONS", "AD_RECALL_LIFT"],
  OUTCOME_ENGAGEMENT: ["POST_ENGAGEMENT", "PAGE_LIKES", "LINK_CLICKS", "IMPRESSIONS"],
  OUTCOME_LEADS: ["LEAD_GENERATION", "LINK_CLICKS", "CONVERSIONS"],
  OUTCOME_SALES: ["CONVERSIONS", "VALUE", "LINK_CLICKS"],
}

export const BILLING_EVENT_OPTIONS = [
  "IMPRESSIONS",
  "LINK_CLICKS",
  "APP_INSTALLS",
  "PAGE_LIKES",
  "POST_ENGAGEMENT",
  "VIDEO_VIEWS",
] as const

export const OPTIMIZATION_GOAL_BILLING_EVENT_MAP: Record<string, readonly string[]> = {
  APP_INSTALLS: ["IMPRESSIONS"],
  CLICKS: ["IMPRESSIONS", "LINK_CLICKS"],
  CONVERSIONS: ["IMPRESSIONS"],
  IMPRESSIONS: ["IMPRESSIONS"],
  LANDING_PAGE_VIEWS: ["IMPRESSIONS", "LINK_CLICKS"],
  LEAD_GENERATION: ["IMPRESSIONS"],
  LINK_CLICKS: ["IMPRESSIONS", "LINK_CLICKS"],
  PAGE_LIKES: ["IMPRESSIONS", "PAGE_LIKES"],
  POST_ENGAGEMENT: ["IMPRESSIONS", "POST_ENGAGEMENT"],
  REACH: ["IMPRESSIONS"],
  VALUE: ["IMPRESSIONS"],
  AD_RECALL_LIFT: ["IMPRESSIONS"],
}

export const BID_STRATEGIES_REQUIRING_BID_AMOUNT = ["COST_CAP", "LOWEST_COST_WITH_BID_CAP", "TARGET_COST"] as const
export const UNSUPPORTED_BID_STRATEGY_REASONS: Record<string, string> = {
  LOWEST_COST_WITH_MIN_ROAS: "Unavailable: requires ROAS floor, which is not supported in Mediation Pro yet.",
}

export function bidStrategyRequiresBidAmount(value?: string | null): boolean {
  const normalized = (value ?? "").trim().toUpperCase()
  return BID_STRATEGIES_REQUIRING_BID_AMOUNT.includes(normalized as (typeof BID_STRATEGIES_REQUIRING_BID_AMOUNT)[number])
}

export function getAllowedBillingEvents(optimizationGoal?: string | null): readonly string[] {
  const normalized = (optimizationGoal ?? "").trim().toUpperCase()
  return OPTIMIZATION_GOAL_BILLING_EVENT_MAP[normalized] ?? BILLING_EVENT_OPTIONS
}

export function isBillingEventCompatible(optimizationGoal?: string | null, billingEvent?: string | null): boolean {
  const normalizedEvent = (billingEvent ?? "").trim().toUpperCase()
  if (!normalizedEvent) return true
  return getAllowedBillingEvents(optimizationGoal).includes(normalizedEvent)
}

export function getBillingEventDisabledReason(optimizationGoal?: string | null, billingEvent?: string | null): string | null {
  const normalizedGoal = (optimizationGoal ?? "").trim().toUpperCase()
  const normalizedEvent = (billingEvent ?? "").trim().toUpperCase()
  if (!normalizedGoal || !normalizedEvent) return null
  if (isBillingEventCompatible(normalizedGoal, normalizedEvent)) return null
  const allowed = getAllowedBillingEvents(normalizedGoal)
  const suggested = allowed.length > 0 ? ` Use ${allowed.join(" or ")} instead.` : ""
  return `Unavailable: incompatible with ${normalizedGoal}.${suggested}`
}

export function isBidStrategySupported(value?: string | null): boolean {
  const normalized = (value ?? "").trim().toUpperCase()
  if (!normalized) return true
  return !Object.prototype.hasOwnProperty.call(UNSUPPORTED_BID_STRATEGY_REASONS, normalized)
}

export function getBidStrategyDisabledReason(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase()
  return UNSUPPORTED_BID_STRATEGY_REASONS[normalized] ?? null
}
