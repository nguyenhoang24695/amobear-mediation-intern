// Standalone constants - no imports from other create-request modules
// (avoids circular dependency between create-request-content and section components)

export const OBJECTIVE_OPTIMIZATION_MAP: Record<string, string[]> = {
  OUTCOME_APP_PROMOTION: ["APP_INSTALLS", "CONVERSIONS", "VALUE"],
  OUTCOME_TRAFFIC: ["LINK_CLICKS", "LANDING_PAGE_VIEWS", "IMPRESSIONS", "REACH"],
  OUTCOME_AWARENESS: ["REACH", "IMPRESSIONS", "AD_RECALL_LIFT"],
  OUTCOME_ENGAGEMENT: ["POST_ENGAGEMENT", "PAGE_LIKES", "LINK_CLICKS", "IMPRESSIONS"],
  OUTCOME_LEADS: ["LEAD_GENERATION", "LINK_CLICKS", "CONVERSIONS"],
  OUTCOME_SALES: ["CONVERSIONS", "VALUE", "LINK_CLICKS"],
}

export const APP_PROMOTION_PERFORMANCE_GOAL_TYPES = ["APP_INSTALLS", "APP_EVENT", "VALUE"] as const
export const PERFORMANCE_GOAL_TO_OPTIMIZATION_GOAL: Record<string, string> = {
  APP_INSTALLS: "APP_INSTALLS",
  APP_EVENT: "OFFSITE_CONVERSIONS",
  VALUE: "VALUE",
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
  OFFSITE_CONVERSIONS: ["IMPRESSIONS"],
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

const PERFORMANCE_GOAL_BID_STRATEGY_MAP: Record<string, readonly string[]> = {
  APP_INSTALLS: ["LOWEST_COST_WITHOUT_CAP", "COST_CAP", "LOWEST_COST_WITH_BID_CAP", "TARGET_COST", "LOWEST_COST_WITH_MIN_ROAS"],
  APP_EVENT: ["LOWEST_COST_WITHOUT_CAP", "COST_CAP", "LOWEST_COST_WITH_BID_CAP", "TARGET_COST", "LOWEST_COST_WITH_MIN_ROAS"],
  VALUE: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_MIN_ROAS"],
}

const BID_STRATEGY_PERFORMANCE_GOAL_MAP: Record<string, readonly string[]> = {
  LOWEST_COST_WITHOUT_CAP: ["APP_INSTALLS", "APP_EVENT", "VALUE"],
  COST_CAP: ["APP_INSTALLS", "APP_EVENT"],
  LOWEST_COST_WITH_BID_CAP: ["APP_INSTALLS", "APP_EVENT"],
  TARGET_COST: ["APP_INSTALLS", "APP_EVENT"],
  LOWEST_COST_WITH_MIN_ROAS: ["VALUE"],
}

const PERFORMANCE_GOAL_BID_STRATEGY_DISABLED_REASONS: Record<string, Record<string, string>> = {
  VALUE: {
    COST_CAP: "Unavailable: cost per result goal is incompatible with Maximize value of conversions.",
    LOWEST_COST_WITH_BID_CAP: "Unavailable: bid cap is incompatible with Maximize value of conversions.",
    TARGET_COST: "Unavailable: target cost is incompatible with Maximize value of conversions.",
  },
}

export function resolveOptimizationGoal(performanceGoalType?: string | null): string {
  const normalized = (performanceGoalType ?? "").trim().toUpperCase()
  return PERFORMANCE_GOAL_TO_OPTIMIZATION_GOAL[normalized] ?? "APP_INSTALLS"
}

export function inferPerformanceGoalType(optimizationGoal?: string | null): string {
  const normalized = (optimizationGoal ?? "").trim().toUpperCase()
  if (normalized === "VALUE" || normalized === "IN_APP_VALUE") return "VALUE"
  if (normalized === "APP_INSTALLS") return "APP_INSTALLS"
  return "APP_EVENT"
}

export function getAllowedPerformanceGoalTypes(objective?: string | null): readonly string[] {
  const normalized = (objective ?? "").trim().toUpperCase()
  if (normalized === "OUTCOME_APP_PROMOTION") return APP_PROMOTION_PERFORMANCE_GOAL_TYPES
  return [inferPerformanceGoalType(OBJECTIVE_OPTIMIZATION_MAP[normalized]?.[0])]
}

export function bidStrategyRequiresBidAmount(value?: string | null): boolean {
  const normalized = (value ?? "").trim().toUpperCase()
  return BID_STRATEGIES_REQUIRING_BID_AMOUNT.includes(normalized as (typeof BID_STRATEGIES_REQUIRING_BID_AMOUNT)[number])
}

export function isBidAmountAllowed(value?: string | null): boolean {
  return bidStrategyRequiresBidAmount(value)
}

export function getAllowedBidStrategies(performanceGoalType?: string | null): readonly string[] {
  const normalized = inferPerformanceGoalType(performanceGoalType)
  return PERFORMANCE_GOAL_BID_STRATEGY_MAP[normalized] ?? PERFORMANCE_GOAL_BID_STRATEGY_MAP.APP_INSTALLS
}

export function getAllowedPerformanceGoalsForBidStrategy(bidStrategy?: string | null): readonly string[] {
  const normalizedStrategy = (bidStrategy ?? "").trim().toUpperCase()
  if (!normalizedStrategy) return APP_PROMOTION_PERFORMANCE_GOAL_TYPES
  return BID_STRATEGY_PERFORMANCE_GOAL_MAP[normalizedStrategy] ?? APP_PROMOTION_PERFORMANCE_GOAL_TYPES
}

export function isBidStrategyCompatible(performanceGoalType?: string | null, bidStrategy?: string | null): boolean {
  const normalizedStrategy = (bidStrategy ?? "").trim().toUpperCase()
  if (!normalizedStrategy) return true
  return getAllowedBidStrategies(performanceGoalType).includes(normalizedStrategy)
}

export function isPerformanceGoalCompatibleWithBidStrategy(performanceGoalType?: string | null, bidStrategy?: string | null): boolean {
  const normalizedGoalType = inferPerformanceGoalType(performanceGoalType)
  return getAllowedPerformanceGoalsForBidStrategy(bidStrategy).includes(normalizedGoalType)
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

export function getBidStrategyDisabledReason(value?: string | null, performanceGoalType?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase()
  const normalizedPerformanceGoalType = inferPerformanceGoalType(performanceGoalType)
  const compatibilityReason = PERFORMANCE_GOAL_BID_STRATEGY_DISABLED_REASONS[normalizedPerformanceGoalType]?.[normalized]
  if (compatibilityReason) return compatibilityReason
  return UNSUPPORTED_BID_STRATEGY_REASONS[normalized] ?? null
}

export function getPerformanceGoalDisabledReasonForBidStrategy(performanceGoalType?: string | null, bidStrategy?: string | null): string | null {
  const normalizedGoalType = inferPerformanceGoalType(performanceGoalType)
  if (isPerformanceGoalCompatibleWithBidStrategy(normalizedGoalType, bidStrategy)) return null

  const normalizedStrategy = (bidStrategy ?? "").trim().toUpperCase()
  if (normalizedGoalType === "VALUE" && ["COST_CAP", "LOWEST_COST_WITH_BID_CAP", "TARGET_COST"].includes(normalizedStrategy)) {
    return "Unavailable: Maximize value of conversions cannot be used with cost cap or bid cap. Use Highest value instead."
  }

  if (normalizedGoalType !== "VALUE" && normalizedStrategy === "LOWEST_COST_WITH_MIN_ROAS") {
    return "Unavailable: Minimum ROAS is only compatible with Maximize value of conversions."
  }

  return `Unavailable: incompatible with ${normalizedStrategy || "the selected bid strategy"}.`
}


