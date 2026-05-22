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
