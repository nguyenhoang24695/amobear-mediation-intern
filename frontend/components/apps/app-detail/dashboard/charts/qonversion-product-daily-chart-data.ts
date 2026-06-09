import type { QonversionProductReport, QonversionProductSeriesRow } from "@/types/app-dashboard"
import { formatCount, formatPercent, formatUsd } from "../format"
import type { QonversionProductColumnKey } from "../tables/qonversion-product-table"

export type QonversionDailyValueType = "count" | "percent" | "usd"

export interface QonversionDailyMetricConfig {
  key: QonversionProductColumnKey
  label: string
  valueType: QonversionDailyValueType
  additive: boolean
}

export interface QonversionProductDailyChartConfig {
  title: string
  subtitle: string
  report: QonversionProductReport
  primaryMetric: QonversionDailyMetricConfig
  secondaryMetric?: QonversionDailyMetricConfig
}

export interface QonversionDailySeries {
  key: string
  productId: string
  label: string
  color: string
  isOther?: boolean
}

export interface QonversionDailyChartRow {
  reportDate: string
  dateLabel: string
  [seriesKey: string]: string | number | null
}

export interface QonversionDailyChartData {
  rows: QonversionDailyChartRow[]
  series: QonversionDailySeries[]
}

const TOP_PRODUCT_COUNT = 5
const OTHER_KEY = "other"
const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#64748b"]

export const QONVERSION_PRODUCT_DAILY_CHARTS: QonversionProductDailyChartConfig[] = [
  {
    title: "Subscriptions by Product",
    subtitle: "Daily new subscriptions stacked by product",
    report: "subscriptions",
    primaryMetric: { key: "newSubscriptions", label: "New subscriptions", valueType: "count", additive: true },
  },
  {
    title: "New-User-to-Trial by Product",
    subtitle: "Daily conversion rate for top products",
    report: "new_user_to_trial",
    primaryMetric: { key: "conversionRate", label: "Conversion rate", valueType: "percent", additive: false },
  },
  {
    title: "Trial-to-Paid by Product",
    subtitle: "Daily revenue stacked by product, with conversion rate trend",
    report: "trial_to_paid",
    primaryMetric: { key: "revenueUsd", label: "Revenue", valueType: "usd", additive: true },
    secondaryMetric: { key: "conversionRate", label: "Conversion rate", valueType: "percent", additive: false },
  },
  {
    title: "Refunds by Product",
    subtitle: "Daily refunds stacked by product, with refund rate trend",
    report: "refunds",
    primaryMetric: { key: "refundsUsd", label: "Refunds", valueType: "usd", additive: true },
    secondaryMetric: { key: "refundRate", label: "Refund rate", valueType: "percent", additive: false },
  },
]

export function buildQonversionDailyChartData(
  rows: QonversionProductSeriesRow[],
  metric: QonversionDailyMetricConfig,
  topN = TOP_PRODUCT_COUNT,
): QonversionDailyChartData {
  const dates = uniqueSorted(rows.map((row) => row.reportDate))
  const topProducts = selectTopProducts(rows, metric, topN)
  const topSet = new Set(topProducts)
  const includeOther = metric.additive && rows.some((row) => !topSet.has(row.productId) && getMetricValue(row, metric.key) != null)
  const series = buildSeries(topProducts, includeOther)

  const chartRows = dates.map((date) => {
    const chartRow: QonversionDailyChartRow = {
      reportDate: date,
      dateLabel: formatDateLabel(date),
    }

    for (const productId of topProducts) {
      chartRow[seriesKey(productId)] = sumMetric(rows, date, productId, metric.key)
    }

    if (includeOther) {
      chartRow[OTHER_KEY] = rows
        .filter((row) => row.reportDate === date && !topSet.has(row.productId))
        .reduce((total, row) => total + (getMetricValue(row, metric.key) ?? 0), 0)
    }

    return chartRow
  })

  return { rows: chartRows, series }
}

export function hasQonversionDailyValues(data: QonversionDailyChartData) {
  return data.rows.some((row) => data.series.some((series) => row[series.key] != null && row[series.key] !== 0))
}

export function formatQonversionDailyValue(value: number | null | undefined, valueType: QonversionDailyValueType) {
  if (valueType === "usd") return formatUsd(value)
  if (valueType === "percent") return formatPercent(value, 2)
  return formatCount(value)
}

export function formatDateLabel(date: string) {
  const [, month, day] = date.split("-")
  return month && day ? `${month}-${day}` : date
}

function selectTopProducts(rows: QonversionProductSeriesRow[], metric: QonversionDailyMetricConfig, topN: number) {
  return uniqueSorted(rows.map((row) => row.productId))
    .map((productId) => ({ productId, score: scoreProduct(rows, productId, metric) }))
    .sort((left, right) => right.score - left.score || left.productId.localeCompare(right.productId))
    .slice(0, topN)
    .map((item) => item.productId)
}

function scoreProduct(rows: QonversionProductSeriesRow[], productId: string, metric: QonversionDailyMetricConfig) {
  const values = rows
    .filter((row) => row.productId === productId)
    .map((row) => getMetricValue(row, metric.key))
    .filter((value): value is number => value != null)

  if (values.length === 0) return Number.NEGATIVE_INFINITY
  return metric.additive
    ? values.reduce((total, value) => total + value, 0)
    : values.reduce((total, value) => total + value, 0) / values.length
}

function buildSeries(productIds: string[], includeOther: boolean): QonversionDailySeries[] {
  const series: QonversionDailySeries[] = productIds.map((productId, index) => ({
    key: seriesKey(productId),
    productId,
    label: shortProductId(productId),
    color: COLORS[index % COLORS.length],
  }))

  if (includeOther) {
    series.push({ key: OTHER_KEY, productId: "Other products", label: "Other", color: COLORS[COLORS.length - 1], isOther: true })
  }

  return series
}

function sumMetric(
  rows: QonversionProductSeriesRow[],
  reportDate: string,
  productId: string,
  metricKey: QonversionProductColumnKey,
) {
  const values = rows
    .filter((row) => row.reportDate === reportDate && row.productId === productId)
    .map((row) => getMetricValue(row, metricKey))
    .filter((value): value is number => value != null)
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0)
}

function getMetricValue(row: QonversionProductSeriesRow, key: QonversionProductColumnKey) {
  return row[key] ?? null
}

function seriesKey(productId: string) {
  return `p_${hashString(productId)}`
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}

function shortProductId(productId: string) {
  if (productId.length <= 24) return productId
  return `${productId.slice(0, 10)}...${productId.slice(-10)}`
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))
}
