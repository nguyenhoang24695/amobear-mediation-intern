export type PerformanceSyncCompareStatus = "Waiting" | "Running" | string

export type PerformanceSyncCompareSourceTable =
  | "admob_table"
  | "mkt_table"
  | "mediation_table"
  | string

export interface PerformanceSyncCompareItem {
  hashKey: string
  date: string
  appId: string
  appName?: string | null
  appStoreId?: string | null
  appIconUri?: string | null
  platform: string
  sourceTable: PerformanceSyncCompareSourceTable
  status: PerformanceSyncCompareStatus
  revenueTableEarnings: number
  detailTableSum: number
  delta: number
  revenueTableMaxSyncedAt?: string | null
  sourceTableMaxSyncedAt?: string | null
  detectedAt?: string | null
  lastSyncAttemptAt?: string | null
  lastError?: string | null
}

export interface PerformanceSyncCompareListResponse {
  items: PerformanceSyncCompareItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PerformanceSyncCompareQuery {
  startDate?: string
  endDate?: string
  /** @deprecated Dùng sourceTables */
  sourceTable?: string
  sourceTables?: string[]
  status?: string
  appSearch?: string
  platform?: string
  page?: number
  pageSize?: number
}

export interface PerformanceSyncCompareResyncRequest {
  hashKeys: string[]
}

export interface PerformanceSyncCompareResyncResponse {
  queued: boolean
  jobId?: string | null
  count: number
}

export interface PerformanceSyncCompareRecompareRequest {
  hashKeys: string[]
}

export interface PerformanceSyncCompareRecompareResultItem {
  hashKey: string
  outcome: "deleted" | "updated" | "failed" | string
  message?: string | null
}

export interface PerformanceSyncCompareRecompareResponse {
  processed: number
  matchedDeleted: number
  updated: number
  failed: number
  results: PerformanceSyncCompareRecompareResultItem[]
}

export interface AdmobApiTrafficFilterOptions {
  callTypes: string[]
  publishers: string[]
  httpStatuses: (number | null)[]
}

export interface AdmobApiTrafficChartPoint {
  bucketStart: string
  count: number
  breakdown: Record<string, number>
}

export type AdmobApiTrafficBucket = "minute" | "hour" | "day"
export type AdmobApiTrafficDimension = "none" | "publisher" | "type" | "http_status"

export interface AdmobApiTrafficChartResponse {
  bucket: AdmobApiTrafficBucket | string
  dimension: AdmobApiTrafficDimension | string
  createdFrom: string
  createdTo: string
  totalCalls: number
  series: string[]
  points: AdmobApiTrafficChartPoint[]
}

export interface AdmobApiTrafficChartQuery {
  createdFrom?: string
  createdTo?: string
  callType?: string
  publisherId?: string
  responseHttpStatus?: string
  bucket?: AdmobApiTrafficBucket
  dimension?: AdmobApiTrafficDimension
}
