import type { ReportDateFilterMode } from "@/lib/reports/report-date-filter-utils"

export const MY_REPORT_DEFAULT_DIMENSIONS = ["date"] as const

export const MY_REPORT_DEFAULT_METRICS = [
  "estimated_revenue",
  "ua_cost",
  "iap_net_revenue",
  "total_revenue_usd",
  "profit",
] as const

export const MY_REPORT_DEFAULT_IAP_MODE = 0.7

export const MY_REPORT_DEFAULT_REVENUE_SOURCE = "All"

export const MY_REPORT_DEFAULT_SORT = {
  sortBy: "date",
  sortDir: "desc" as const,
}

export const MY_REPORT_DEFAULT_DATE = {
  dateFilterMode: "preset" as ReportDateFilterMode,
  activePresetDays: 30,
}

export const IAP_REVENUE_MODE_OPTIONS = [
  { value: 0.7, label: "70% of Gross" },
  { value: 0.85, label: "85% of Gross" },
  { value: 1, label: "100% (Gross)" },
] as const

export const REVENUE_SOURCE_OPTIONS = ["All", "Ads", "InAppPurchase", "Subscription"] as const
