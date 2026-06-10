import type { CustomReportCatalogItem } from "@/types/reports"

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

export const METRIC_SOURCE_TABS = [
  "summary",
  "admob",
  "adjust",
  "appsflyer",
  "meta",
  "tiktok",
  "google",
  "custom",
] as const

export type MyReportMetricSourceTab = (typeof METRIC_SOURCE_TABS)[number]

/** @deprecated Use MyReportMetricSourceTab */
export type MyReportMetricTab = "summary" | "admob" | "adjust"

const SOURCE_PREFIXES: Record<
  Exclude<MyReportMetricSourceTab, "summary" | "custom">,
  readonly string[]
> = {
  admob: MY_REPORT_ADMOB_METRIC_IDS,
  adjust: MY_REPORT_ADJUST_METRIC_IDS,
  appsflyer: ["appsflyer_"],
  meta: ["meta_"],
  tiktok: ["tiktok_"],
  google: ["google_"],
}

function metricMatchesSource(metric: CustomReportCatalogItem, source: MyReportMetricSourceTab): boolean {
  if (source === "custom") return false

  const category = metric.category?.toLowerCase() ?? ""
  if (category === source) return true

  if (source === "summary") {
    if ((MY_REPORT_SUMMARY_METRIC_IDS as readonly string[]).includes(metric.id)) return true
    const knownOther = METRIC_SOURCE_TABS.filter(
      (tab) => tab !== "summary" && tab !== "custom",
    ) as Exclude<MyReportMetricSourceTab, "summary" | "custom">[]
    return !knownOther.some((other) => metricMatchesSource(metric, other))
  }

  const rules = SOURCE_PREFIXES[source]
  if ((rules as readonly string[]).includes(metric.id)) return true
  return rules.some((prefix) => prefix.endsWith("_") && metric.id.startsWith(prefix))
}

export function resolveMetricIdsForSource(
  catalog: CustomReportCatalogItem[],
  source: MyReportMetricSourceTab,
): string[] {
  if (source === "custom") return []
  return catalog.filter((metric) => metricMatchesSource(metric, source)).map((metric) => metric.id)
}

export function getVisibleMetricTabs(catalog: CustomReportCatalogItem[]): MyReportMetricSourceTab[] {
  return METRIC_SOURCE_TABS.filter((source) => {
    if (source === "custom") return false
    return resolveMetricIdsForSource(catalog, source).length >= 1
  })
}

export function getMetricTab(metricId: string): MyReportMetricTab {
  if ((MY_REPORT_ADMOB_METRIC_IDS as readonly string[]).includes(metricId)) return "admob"
  if ((MY_REPORT_ADJUST_METRIC_IDS as readonly string[]).includes(metricId)) return "adjust"
  return "summary"
}

export function getMetricSourceTab(
  metricId: string,
  catalog: CustomReportCatalogItem[] = [],
): MyReportMetricSourceTab {
  const item = catalog.find((m) => m.id === metricId)
  if (item) {
    for (const source of METRIC_SOURCE_TABS) {
      if (source === "custom") continue
      if (metricMatchesSource(item, source)) return source
    }
  }
  return getMetricTab(metricId)
}
