export interface CustomReportQueryRequest {
  from: string
  to: string
  appIds: string[]
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  metricFilters?: CustomReportMetricFilter[]
  sortBy?: string | null
  sortDir?: string
  iapRevenueModeDefault?: number | null
  iapRevenueModeOverrides?: Record<string, number> | null
}

export interface CustomReportMetricFilter {
  metric: string
  condition: "gt" | "gte" | "lt" | "lte" | "eq" | "neq"
  value: number
}

export interface CustomReportQueryMeta {
  from: string
  to: string
  rowCount: number
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  appIds: string[]
}

export interface CustomReportQueryResponse {
  rows: Record<string, string | number | null>[]
  totals: Record<string, string | number | null>
  meta: CustomReportQueryMeta
}

export interface CustomReportCatalogItem {
  id: string
  label: string
  category: string
  format?: string | null
}

export interface CustomReportCatalogResponse {
  dimensions: CustomReportCatalogItem[]
  metrics: CustomReportCatalogItem[]
  revenueSources: string[]
}

export interface TeamLeadAppCacheItem {
  appId: string
  appStoreId?: string | null
  displayName?: string | null
  platform?: string | null
  iconUri?: string | null
  approvalState?: string | null
  publisherId?: string | null
}

export interface TeamLeadAppCache {
  teamId: string
  organizationId: string
  leadUserId?: string | null
  admobAppIds: string[]
  appStoreIds: string[]
  apps: TeamLeadAppCacheItem[]
  cachedAt: string
}

export interface CustomReportFilters {
  from: string
  to: string
  appIds: string[]
  revenueSource: string
  metricFilters: CustomReportMetricFilter[]
  /** Selected team member user ID for commission team app scope. */
  commissionUser?: string | null
  commissionUsernames?: string[] | null
  /** Team filter for commission managers — limits apps to profit-plan apps visible for the selected team scope. */
  commissionTeamId?: string | null
  commissionTeamIds?: string[] | null
  sortBy?: string | null
  sortDir: string
  activePresetDays?: number | null
  /** yyyy-MM when date filter mode is month */
  selectedMonth?: string | null
}

export interface SaveCustomReportRequest {
  name: string
  folder?: string | null
  filters: CustomReportFilters
  dimensions: string[]
  metrics: string[]
}

export interface CustomReportSaved {
  id: string
  name: string
  folder: string
  ownerId: string
  filters: CustomReportFilters
  dimensions: string[]
  metrics: string[]
  createdAt: string
  updatedAt: string
  isPinned: boolean
}

export interface CustomReportListItem {
  id: string
  name: string
  folder: string
  updatedAt: string
  isPinned: boolean
}

export interface CustomReportFolder {
  id: string
  name: string
  createdAt: string
}

export type { OverviewColumnId, OverviewColumnGroup } from "@/lib/reports/overview-column-config"

export interface ProfitOverviewMetricValues {
  plan?: number | null
  actual?: number | null
  completionPercent?: number | null
}

export interface ProfitOverviewMonthCell {
  revenue: ProfitOverviewMetricValues
  cost: ProfitOverviewMetricValues
  profit: ProfitOverviewMetricValues
}

export interface ProfitOverviewAppRow {
  appId: string
  appLabel: string
  appPlatform?: string | null
  appStoreId?: string | null
  appIconUri?: string | null
  months: Record<string, ProfitOverviewMonthCell>
}

export interface ProfitOverviewTeamRow {
  teamId: string
  teamName: string
  leadUserId?: string | null
  leadName?: string | null
  leadEmail?: string | null
  months: Record<string, ProfitOverviewMonthCell>
  /** @deprecated Chỉ dùng khi API cũ trả apps; overview mới không gồm apps. */
  apps?: ProfitOverviewAppRow[]
}

export interface ProfitOverviewTeamAppsResponse {
  teamId: string
  months: string[]
  apps: ProfitOverviewAppRow[]
  totalCount: number
  totalAppPages: number
  page: number
  pageSize: number
}

export interface ProfitOverviewSharedAppConflict {
  appStoreId: string
  appLabel: string
  groupLabels: string[]
  teamNames: string[]
}

export interface ProfitOverviewReportResponse {
  months: string[]
  teams: ProfitOverviewTeamRow[]
  lastUpdatedAt?: string | null
}

export interface OverviewReportFilter {
  from: string
  to: string
  selectedYear?: string | null
  teamIds: string[]
}

export interface WaterfallReportRequest {
  from: string
  to: string
  appIds: string[]
}

export interface WaterfallNetworkRow {
  adSourceId: string
  adSourceLabel: string
  impressions: number
  revenue: number
  ecpm: number
  fillRate: number
  sowPct: number
}

export interface WaterfallReportResponse {
  from: string
  to: string
  appIds: string[]
  networks: WaterfallNetworkRow[]
  totalRevenue: number
  totalImpressions: number
}
