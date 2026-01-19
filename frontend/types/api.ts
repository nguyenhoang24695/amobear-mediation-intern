// API Types - Match với backend entities

export interface App {
  id: number
  name: string
  appId: string
  platform?: string
  displayName?: string
  appStoreId?: string
  approvalState?: string
  publisherId: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
}

export interface MediationGroup {
  id: number
  name: string
  mediationGroupId: string
  displayName?: string
  platform?: string
  adFormat?: string
  state?: string
  publisherId: string
  mediationGroupLinesJson?: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
}

export interface PerformanceData {
  id: number
  date: string
  publisherId: string
  appId?: string
  adUnitId?: string
  mediationGroupId?: string
  adSourceInstanceId?: string
  adSourceId?: string
  countryCode?: string
  format?: string
  platform?: string
  month?: string
  week?: string
  matchRate?: number
  ecpmMicros?: number
  revenueMicros?: number
  impressions?: number
  clicks?: number
  fillRate?: number
  requests?: number
  ctr?: number
  impressionCtr?: number
  createdAt: string
  updatedAt: string
}

export interface PerformanceSummary {
  publisherId: string
  totalRevenueMicros: number
  totalImpressions: number
  avgEcpmMicros: number
  avgMatchRate: number
  avgFillRate: number
  dateRange: {
    startDate: string
    endDate: string
  }
}

export interface PagedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ApiError {
  error: string
  message?: string
}

// Dashboard Metrics
export interface DashboardMetrics {
  revenueToday: {
    value: number
    change: number
    trend: "up" | "down"
  }
  averageEcpm: {
    value: number
    change: number
    trend: "up" | "down"
  }
  impressions: {
    value: number
    change: number
    trend: "up" | "down"
  }
  fillRate: {
    value: number
    change: number
    trend: "up" | "down"
  }
}

// Top App
export interface TopApp {
  id: number
  appId: string
  name: string
  displayName?: string
  revenue: number
  ecpm: number
  trend: "up" | "down"
  icon?: string
}
