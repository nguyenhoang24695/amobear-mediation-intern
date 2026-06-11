import { apiClient } from "./client"
import type {
  AdjustReportResponse,
  DashboardRangeInput,
  DashboardSummary,
  EngagementTrendSeries,
  QonversionProductReport,
  QonversionProductSeriesResponse,
  QonversionProductsResponse,
  RetentionResponse,
  RevenueTrendSeries,
  TopCountriesResponse,
  TopCountryMetric,
  UserTrendSeries,
} from "@/types/app-dashboard"
import { normalizeDashboardRange } from "@/types/app-dashboard"

const prefix = (appId: string) => `/api/apps/${encodeURIComponent(appId)}/dashboard`

/**
 * Client cho 7 endpoint PO Dashboard. Slice 1 đã đăng ký đủ method
 * (slice sau chỉ implement BE, không sửa file này).
 * Xem docs/po-dashboard-metric/03_API_Contract.md.
 */
export const appDashboardApi = {
  summary: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<DashboardSummary>(`${prefix(appId)}/summary`, withRefresh(rangeParams(range), refresh)),

  userTrend: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<UserTrendSeries>(`${prefix(appId)}/user-trend`, withRefresh(rangeParams(range), refresh)),

  engagementTrend: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<EngagementTrendSeries>(`${prefix(appId)}/engagement-trend`, withRefresh(rangeParams(range), refresh)),

  revenueTrend: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<RevenueTrendSeries>(`${prefix(appId)}/revenue-trend`, withRefresh(rangeParams(range), refresh)),

  retention: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<RetentionResponse>(`${prefix(appId)}/retention`, withRefresh(rangeParams(range), refresh)),

  topCountries: (
    appId: string,
    range: DashboardRangeInput,
    metric: TopCountryMetric,
    refresh?: boolean,
  ) =>
    apiClient.get<TopCountriesResponse>(`${prefix(appId)}/top-countries`, withRefresh({
      ...rangeParams(range),
      metric,
    }, refresh)),

  adjustReport: (appId: string, range: DashboardRangeInput, refresh?: boolean) =>
    apiClient.get<AdjustReportResponse>(`${prefix(appId)}/adjust-report`, withRefresh(rangeParams(range), refresh)),

  getQonversionProducts: (
    appId: string,
    report: QonversionProductReport,
    range: DashboardRangeInput,
    refresh?: boolean,
  ) =>
    apiClient.get<QonversionProductsResponse>(`${prefix(appId)}/qonversion-products`, withRefresh({
      ...rangeParams(range),
      report,
    }, refresh)),

  getQonversionProductSeries: (
    appId: string,
    report: QonversionProductReport,
    range: DashboardRangeInput,
    refresh?: boolean,
  ) =>
    apiClient.get<QonversionProductSeriesResponse>(`${prefix(appId)}/qonversion-products-series`, withRefresh({
      ...rangeParams(range),
      report,
    }, refresh)),
}

function rangeParams(rangeInput: DashboardRangeInput) {
  const range = normalizeDashboardRange(rangeInput)
  return range.range === "custom"
    ? { range: range.range, startDate: range.startDate, endDate: range.endDate }
    : { range: range.range }
}

function withRefresh<T extends Record<string, string | number | boolean | undefined>>(
  params: T,
  refresh?: boolean,
): T & { refresh?: string; refreshAt?: string } {
  return refresh ? { ...params, refresh: "1", refreshAt: String(Date.now()) } : params
}
