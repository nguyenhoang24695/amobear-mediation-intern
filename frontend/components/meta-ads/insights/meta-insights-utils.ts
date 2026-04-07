import { format } from "date-fns"
import type { DateRange } from "@/components/ui/date-range-picker"
import type { MetaInsightsDailyDto, MetaInsightsOverviewDto } from "@/types/meta-ads"

export type MetaChartMetricKey = "spend" | "installs" | "cpi" | "ctr" | "impressions"
export type MetaCardMetricKey = MetaChartMetricKey | "reach"

export const metaMetricColors: Record<MetaCardMetricKey, string> = {
  spend: "#1877F2",
  installs: "#42B72A",
  cpi: "#F5533D",
  ctr: "#7C3AED",
  impressions: "#F59E0B",
  reach: "#06B6D4",
}

export function getDefaultMetaRange(): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today)
  from.setDate(from.getDate() - 6)
  return { from, to: today }
}

export function formatDateForApi(value: Date): string {
  return format(value, "yyyy-MM-dd")
}

export function toFilterValue(value: string): string | undefined {
  return value === "all" ? undefined : value
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US")
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return `${Math.round(value)}`
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits)
}

export function formatMetricValue(metric: MetaCardMetricKey, value: number): string {
  switch (metric) {
    case "spend":
    case "cpi":
      return formatCurrency(value)
    case "ctr":
      return formatPercent(value)
    case "installs":
    case "impressions":
    case "reach":
      return formatInteger(value)
    default:
      return formatDecimal(value)
  }
}

export function formatChartAxisValue(metric: MetaChartMetricKey, value: number): string {
  switch (metric) {
    case "spend":
      return formatCurrency(value)
    case "cpi":
      return `$${value.toFixed(2)}`
    case "ctr":
      return `${value.toFixed(1)}%`
    default:
      return formatCompactNumber(value)
  }
}

export function getDailyMetricValue(metric: MetaCardMetricKey, item: MetaInsightsDailyDto): number {
  switch (metric) {
    case "spend":
      return item.spend
    case "installs":
      return item.installs
    case "cpi":
      return item.cpi
    case "ctr":
      return item.ctr
    case "impressions":
      return item.impressions
    case "reach":
      return item.reach
    default:
      return 0
  }
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0
    return 100
  }
  return ((current - previous) / previous) * 100
}

export function getOverviewMetricCurrent(metric: MetaCardMetricKey, overview: MetaInsightsOverviewDto): number {
  switch (metric) {
    case "spend":
      return overview.totalSpend
    case "installs":
      return overview.totalInstalls
    case "cpi":
      return overview.avgCpi
    case "ctr":
      return overview.avgCtr
    case "impressions":
      return overview.totalImpressions
    case "reach":
      return overview.totalReach
    default:
      return 0
  }
}

export function getOverviewMetricPrevious(metric: MetaCardMetricKey, overview: MetaInsightsOverviewDto): number {
  switch (metric) {
    case "spend":
      return overview.prevSpend
    case "installs":
      return overview.prevInstalls
    case "cpi":
      return overview.prevInstalls > 0 ? overview.prevSpend / overview.prevInstalls : 0
    case "ctr":
      return overview.prevImpressions > 0 ? (overview.prevClicks / overview.prevImpressions) * 100 : 0
    case "impressions":
      return overview.prevImpressions
    case "reach":
      return overview.prevReach
    default:
      return 0
  }
}

export function formatChartDate(value: string): string {
  return format(new Date(value), "MMM d")
}
