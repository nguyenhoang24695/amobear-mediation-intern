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
  sourceTable?: string
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
