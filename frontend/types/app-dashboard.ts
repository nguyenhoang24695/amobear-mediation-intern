/**
 * Types cho PO Dashboard (Phase 1) — tab "Dashboard" trong màn App detail.
 * Khớp với BE contract: docs/po-dashboard-metric/03_API_Contract.md.
 *
 * Slice 1 đã định nghĩa đầy đủ type cho cả 7 endpoint (kể cả những endpoint
 * chưa được dùng ở slice 1) để slice sau không phải sửa file này.
 */

export type DashboardRange = "today" | "yesterday" | "last7" | "last30" | "custom"

export interface DashboardRangeSelection {
  range: DashboardRange
  startDate?: string
  endDate?: string
}

export type DashboardRangeInput = DashboardRange | DashboardRangeSelection

export function normalizeDashboardRange(input: DashboardRangeInput): DashboardRangeSelection {
  return typeof input === "string" ? { range: input } : input
}

export function dashboardRangeCacheKey(input: DashboardRangeInput): string {
  const range = normalizeDashboardRange(input)
  return range.range === "custom"
    ? `custom:${range.startDate ?? ""}:${range.endDate ?? ""}`
    : range.range
}

export type DashboardWarning =
  | "adjust_not_configured"
  | "firebase_not_configured"
  | "adjust_ad_revenue_missing"
  | "admob_revenue_not_configured"
  | "qonversion_not_configured"

export interface DashboardDateRange {
  range: DashboardRange
  start_date_account_tz: string
  end_date_account_tz: string
  tz_offset_hours: number
  display_tz_offset_hours: number
}

export interface DashboardAdmobAccount {
  account_id: string
  display_name: string
  is_default: boolean
}

export interface DashboardMeta {
  admob_account: DashboardAdmobAccount
  currency: "USD"
  warnings: DashboardWarning[]
}

/* ---------- /summary ---------- */
export interface DashboardMetrics {
  installs: number | null
  new_users: number | null
  install_to_open_rate: number | null
  users_not_opened: number | null
  total_users: number | null
  returning_users: number | null
  avg_engagement_time_minutes: number | null
  engaged_sessions_per_user: number | null
  total_revenue_usd: number | null
}

export interface DashboardSummary {
  date_range: DashboardDateRange
  meta: DashboardMeta
  metrics: DashboardMetrics
}

/* ---------- /*-trend (User / Engagement / Revenue) ---------- */
export interface DailyPoint {
  date: string
  value: number | null
}

export interface SeriesResponse<TKey extends string> {
  date_range: DashboardDateRange
  series: Record<TKey, DailyPoint[]>
  phase2_notice?: string[]
}

export type UserTrendSeries = SeriesResponse<
  "installs" | "new_users" | "total_users" | "returning_users"
>

export type EngagementTrendSeries = SeriesResponse<
  "avg_engagement_time_minutes" | "engaged_sessions_per_user"
>

export type RevenueTrendSeries = SeriesResponse<
  "total" | "iaa" | "iap" | "sub" | "arpu"
>

/* ---------- /retention (Slice 7.7: cohort tables) ---------- */
export interface CohortRow {
  install_date: string
  users: number | null
  /** Retention % theo từng cột, align với `day_offsets`. */
  retention: (number | null)[]
}

export interface CohortSource {
  available: boolean
  /** Mốc ngày cohort của từng cột (Firebase: [1..7]; Adjust: [3,7,14,21,30,45,60,90,120]). */
  day_offsets: number[]
  rows: CohortRow[]
  total: CohortRow | null
}

export interface RetentionResponse {
  date_range: DashboardDateRange
  firebase: CohortSource
  adjust: CohortSource
}

/* ---------- /top-countries ---------- */
export type TopCountryMetric = "iaa" | "iap_sub" | "new_users" | "total_users"

export interface TopCountryRow {
  country_code: string
  country_name: string
  primary_value: number | null
  arpu_country_usd: number | null
  conversion_rate_percent: number | null
}

export interface TopCountriesResponse {
  date_range: DashboardDateRange
  metric: TopCountryMetric
  rows: TopCountryRow[]
}

/* ---------- /adjust-report ---------- */
export interface AdjustReportRow {
  channel: string
  source: string
  installs: number | null
  ad_spend_usd: number | null
  cpi_usd: number | null
  roas_d0: number | null
  roas_d1: number | null
  roas_d3: number | null
  roas_d7: number | null
  retention_d1: number | null
  retention_d3: number | null
  retention_d7: number | null
}

export interface AdjustReportResponse {
  date_range: DashboardDateRange
  available: boolean
  rows: AdjustReportRow[]
}
