export const MY_REPORT_SUMMARY_METRIC_IDS = [
  "ua_cost",
  "iap_net_revenue",
  "total_revenue_usd",
  "profit",
] as const

export const MY_REPORT_ADMOB_METRIC_IDS = [
  "estimated_revenue",
  "observed_ecpm",
  "impressions",
  "requests",
  "matched_requests",
  "match_rate",
  "show_rate",
  "arpdau_ads",
] as const

export const MY_REPORT_ADJUST_METRIC_IDS = [
  "adjust_network_impressions",
  "adjust_network_clicks",
  "adjust_installs",
  "adjust_network_installs",
  "adjust_ctr",
  "adjust_click_conversion_rate",
  "adjust_impression_conversion_rate",
  "adjust_network_cost",
  "adjust_network_ecpi",
  "adjust_network_ecpm",
  "adjust_ecpc",
] as const

export const MY_REPORT_DIMENSION_IDS = ["date", "app", "platform"] as const

export type MyReportMetricTab = "summary" | "admob" | "adjust"

export function getMetricTab(metricId: string): MyReportMetricTab {
  if ((MY_REPORT_ADMOB_METRIC_IDS as readonly string[]).includes(metricId)) return "admob"
  if ((MY_REPORT_ADJUST_METRIC_IDS as readonly string[]).includes(metricId)) return "adjust"
  return "summary"
}
