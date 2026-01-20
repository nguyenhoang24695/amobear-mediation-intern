// API Types - Match với backend entities

export interface App {
  id: number
  name: string
  appId: string
  platform?: string
  displayName?: string
  appStoreId?: string
  iconUri?: string
  approvalState?: string
  publisherId: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
  adUnitsCount?: number
  mediationGroupsCount?: number
  averageEcpm?: number
}

export interface AdUnit {
  id: number
  name: string
  adUnitId: string
  adFormat?: string
  displayName?: string
  publisherId: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
  revenue?: number
  impressions?: number
  ecpm?: number
  fillRate?: number
  status?: string
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

// Dashboard Types
export type DateRangeType = "today" | "yesterday" | "last3days" | "last7days" | "last14days" | "last30days" | "thismonth" | "lastmonth" | "custom"

export interface KeyMetricItem {
  value: number
  formattedValue: string
  change: number
  changeDirection: "up" | "down" | "neutral"
  sparkline: number[]
}

export interface DashboardKeyMetrics {
  revenue: KeyMetricItem
  averageEcpm: KeyMetricItem
  impressions: KeyMetricItem
  fillRate: KeyMetricItem
  lastUpdated: string
}

export interface ChartDataPoint {
  date: string
  value: number
  comparisonValue?: number
}

export interface ChartSummary {
  total: number
  average: number
  min: number
  max: number
  change: number
}

export interface RevenueOverview {
  metric: "revenue" | "ecpm" | "impressions"
  data: ChartDataPoint[]
  summary: ChartSummary
}

export interface TopAppItem {
  appId: number
  appName: string
  packageName: string
  platform: string
  iconUrl?: string
  revenue: number
  ecpm: number
  impressions: number
  change: number
  rank: number
}

export interface TopApps {
  apps: TopAppItem[]
  totalApps: number
}

export interface NetworkRevenueItem {
  networkId: string
  networkName: string
  iconUrl?: string
  revenue: number
  percentage: number
  ecpm: number
  impressions: number
}

export interface RevenueByNetwork {
  networks: NetworkRevenueItem[]
  totalRevenue: number
}

export interface ActivityItem {
  id: string
  type: string
  severity: string
  title: string
  description: string
  timestamp: string
  relativeTime: string
  isRead: boolean
  resourceType?: string
  resourceId?: string
  resourceUrl?: string
}

export interface RecentActivities {
  activities: ActivityItem[]
  unreadCount: number
}

// Legacy Dashboard Metrics (for backward compatibility)
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
  icon?: string
  iconUri?: string
  revenue: number
  ecpm: number
  trend: "up" | "down"
}
