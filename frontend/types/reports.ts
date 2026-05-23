export interface CustomReportQueryRequest {
  from: string
  to: string
  appIds: string[]
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  metricFilters?: CustomReportMetricFilter[]
  commissionUsernames?: string[] | null
  sortBy?: string | null
  sortDir?: string
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
  commissionUsernames?: string[] | null
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

export interface CustomReportFilters {
  from: string
  to: string
  appIds: string[]
  revenueSource: string
  metricFilters: CustomReportMetricFilter[]
  commissionUser?: string | null
  commissionUsernames?: string[] | null
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
