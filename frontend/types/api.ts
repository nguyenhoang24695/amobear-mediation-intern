// API Types - Match với backend entities

export interface App {
  id: number
  name: string
  appId: string
  platform?: string
  type?: "game" | "app" | null
  displayName?: string
  appStoreId?: string
  iconUri?: string
  approvalState?: string
  /** Số user đang có quyền app (grantee_type=user, chưa hết hạn). */
  activeUserPermissionCount?: number
  publisherId: string
  /** admob_accounts.timezone_offset_hours (publisher) — FE Performance tab default timezone query. Null nếu không có account enabled khớp. */
  publisherTimezoneOffsetHours?: number | null
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
  /** 0 = alerts disabled (default), 1 = alert rules may evaluate this app */
  alertStatus?: number
  /** Đồng bộ daily export Qonversion dashboard (web crawler) cho app này; job dùng cùng mapping StarRocks theo admob app_id */
  qonversionCrawler?: boolean
  /** Qonversion REST keys theo từng app (JSON text: projectKey, apiKey, secretKey) */
  qonversionParams?: string | null
  adUnitsCount?: number
  /** Waterfall Ad Units (from SyncAdMobNetworkWaterfallAdUnitsAsync), distinct from adUnitsCount (from SyncAdUnitsAsync). */
  waterfallAdUnitsCount?: number
  mediationGroupsCount?: number
  averageEcpm?: number
  firebaseParams?: string | null
  /** AppMetrica application id (digits) — saved to Postgres and synced to silver.dim_app_identifiers.appmetrica_id */
  dimAppmetricaId?: string | null

  // Metrics from dashboard cache (today) - returned by /api/Structure/apps. Tách: ad unit (placement không waterfall) + waterfall (placement có trong ít nhất 1 waterfall).
  todayRevenue?: number
  /** Doanh thu từ placements KHÔNG thuộc waterfall (today). */
  todayAdUnitsRevenue?: number
  todayAdUnitsRevenueChangePct?: number | null
  /** Doanh thu từ placements CÓ trong ít nhất 1 waterfall (today). */
  todayWaterfallAdUnitsRevenue?: number
  /** % thay đổi revenue waterfall so với kỳ trước. */
  todayWaterfallAdUnitsRevenueChangePct?: number | null
  todayImpressions?: number
  todayEcpm?: number
  todayFillRate?: number // percent (0..100)

  // Precomputed % change vs yesterday (so UI doesn't have to calculate)
  todayRevenueChangePct?: number
  todayImpressionsChangePct?: number
  todayEcpmChangePct?: number
  todayFillRateChangePct?: number
}

/** GET /api/Structure/apps/performance/hourly?appId=&startDate=&endDate= (or path …/by-appid/{appId}/…) — StarRocks gold hourly revenue + UA cost */
export interface AppHourlyPerformanceBucketDto {
  bucketStart: string
  /** Tổng applovin + admob + qonversion */
  revenue: number
  revenueApplovin: number
  revenueAdmob: number
  revenueQonversion: number
  cost: number
}

/** Per-day: SUM(ua_cost) từ gold.xmp_ua_cost_sync_hourly (bronzeXmpReportCostSum = goldHourlyUaCostSum, tên cũ giữ tương thích). */
export interface AppPerformanceDailyUaCostAlignmentDto {
  reportDate: string
  bronzeXmpReportCostSum: number
  goldHourlyUaCostSum: number
  uaCostDailyVsHourlyMismatch: boolean
}

export interface AppHourlyPerformanceResponseDto {
  starRocksEnabled: boolean
  buckets: AppHourlyPerformanceBucketDto[]
  dailyUaCostByDate?: AppPerformanceDailyUaCostAlignmentDto[]
  /** IANA timezone the server used for start/end date boundaries and daily UA rollups */
  queryTimeZoneId?: string
  lastUpdatedUtc: string
}

export interface AppGrowthTodayPointDto {
  syncedAt: string
  value: number
}

export interface AppGrowthTodayResponseDto {
  revenueReportDate: string
  costReportDate: string
  revenuePoints: AppGrowthTodayPointDto[]
  costPoints: AppGrowthTodayPointDto[]
  latestRevenue?: number | null
  latestCost?: number | null
}

/** GET .../mediation-bronze/* — dữ liệu từ StarRocks bronze.mediation_table. */
export interface AppMediationBronzeFilterOptionsResponse {
  starRocksEnabled: boolean
  startDate?: string
  endDate?: string
  countries: string[]
  appVersionNames: string[]
  adSourceTitles: string[]
}

export interface AppMediationBronzeAdUnitRow {
  id: number
  name?: string
  adUnitId: string
  adFormat?: string
  displayName?: string
  publisherId?: string
  createdAt?: string
  updatedAt?: string
  lastSyncedAt?: string
  revenue: number
  impressions: number
  ecpm: number
  fillRate: number
  adRequests: number
  matchedRequests: number
  status?: string
}

export interface AppMediationBronzeAdUnitsResponse {
  starRocksEnabled: boolean
  startDate?: string
  endDate?: string
  country?: string | null
  appVersion?: string | null
  waterfallOnly?: boolean
  search?: string | null
  page?: number
  pageSize?: number
  totalCount?: number
  message?: string
  adUnits: AppMediationBronzeAdUnitRow[]
}

/** Một dòng đồng bộ StarRocks (bronze.mediation_table), không rollup. */
export interface AppMediationBronzeAdUnitDetailRow {
  hashKey: string
  date: string
  adUnitName?: string
  adUnitId: string
  appVersionName?: string
  country?: string
  adSourceName?: string
  adSourceId?: string
  adSourceInstanceId?: string
  adSourceInstanceName?: string
  mediationGroupName?: string
  mediationGroupId?: string
  format?: string
  platform?: string
  adRequests: number
  clicks: number
  estimatedEarnings: number
  impressions: number
  impressionCtr?: number | null
  matchedRequests: number
  matchRate?: number | null
  showRate?: number | null
  observedEcpm?: number | null
}

export interface AppMediationBronzeAdUnitDetailRowsResponse {
  starRocksEnabled: boolean
  startDate?: string
  endDate?: string
  adUnitId: string
  country?: string | null
  appVersion?: string | null
  waterfallOnly?: boolean
  limit?: number
  truncated?: boolean
  message?: string
  rows: AppMediationBronzeAdUnitDetailRow[]
}

/** Cùng shape dòng Bronze như ad unit detail; filter theo mediation group. */
export interface AppMediationBronzeMediationGroupDetailRowsResponse {
  starRocksEnabled: boolean
  startDate?: string
  endDate?: string
  mediationGroupId: string
  country?: string | null
  appVersion?: string | null
  waterfallOnly?: boolean
  limit?: number
  truncated?: boolean
  message?: string
  rows: AppMediationBronzeAdUnitDetailRow[]
}

export interface AppMediationBronzeMediationGroupRow {
  mediationGroupId: string
  displayName: string
  revenue: number
  impressions: number
  ecpm: number
  fillRate: number
  countries: string[]
  adRequests: number
  matchedRequests: number
  /** Format từ PostgreSQL (AdMob) — có thể null nếu group chưa sync vào PG. */
  adFormat?: string | null
  /** State PG (ENABLED / …) — có thể null. */
  status?: string | null
  /** Nguồn quảng cáo trong waterfall (từ <c>mediation_group_lines_json</c>). */
  adSourcesInfo?: AdSourceInfo[]
}

export interface AppMediationBronzeMediationGroupsResponse {
  starRocksEnabled: boolean
  startDate?: string
  endDate?: string
  country?: string | null
  appVersion?: string | null
  adSourceTitle?: string | null
  search?: string | null
  page?: number
  pageSize?: number
  totalCount?: number
  message?: string
  mediationGroups: AppMediationBronzeMediationGroupRow[]
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

/** AdMob Network Waterfall Ad Unit (placement waterfall theo app). */
export interface WaterfallAdUnit {
  id: number
  name: string
  admobNetworkWaterfallAdUnitId: string
  displayName?: string
  appId: number
  format?: string
  adTypesJson?: string
  globalFloorMicros?: number | null
  publisherId: string
  createdAt: string
  updatedAt: string
  lastSyncedAt?: string
  /** Revenue từ StarRocks bronze.mediation_table (tổng theo ad_unit mapping), 30 ngày gần nhất. */
  revenue?: number
  /** Các country có dữ liệu (từ mediation_table). */
  countries?: string[]
}

/** Waterfall ad unit chưa được gắn với ad unit nào (orphan) – trả về từ API orphan-waterfall. */
export interface OrphanWaterfallItem {
  id: number
  name: string
  admobNetworkWaterfallAdUnitId: string
  displayName?: string | null
  appId: number
  format?: string | null
  globalFloorMicros?: number | null
  publisherId: string
  appDisplayName?: string | null
  appAdMobId?: string | null
  appIconUri?: string | null
  lastSyncedAt?: string | null
}

/** Waterfall list item from GET /api/Structure/waterfall (all or unused only). */
export interface WaterfallListItem extends OrphanWaterfallItem {
  lastSyncedAt?: string | null
  revenue?: number
  mappingDisplayName?: string | null
  mappingState?: string | null
  adUnitDisplayName?: string | null
  adUnitId?: string | null
}

export interface AdSourceInfo {
  adSourceId: string
  title: string
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
  ecpm?: number
  adSources?: string[] // Legacy field for backward compatibility
  adSourcesInfo?: AdSourceInfo[] // New field with detailed info from database
  countries?: string[]
  status?: string

  // Detailed metrics (from cache)
  revenue?: number
  impressions?: number
  adRequests?: number
  matchedRequests?: number
  fillRate?: number
  revenue7Days?: number
  impressions7Days?: number
  adRequests7Days?: number
  matchedRequests7Days?: number
  ecpm7Days?: number
  fillRate7Days?: number
  revenueChangePct?: number
  impressionsChangePct?: number
  ecpmChangePct?: number
  fillRateChangePct?: number

  // App info
  appId?: number
  appAdMobId?: string
  appName?: string
  appIconUri?: string

  // Ad sources breakdown (from detail/cache)
  biddingSources?: string[]
  waterfallSources?: string[]
  /** Full ad source list with mode and order (from GET mediationgroups/:id) */
  adSourceDetails?: Array<{
    adSourceId: string
    title?: string | null
    cpmMode?: string
    order?: number | null
  }>
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
  /** AdMob app_id (string) cho link /apps/{appAdMobId}. */
  appAdMobId?: string
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
  id: number
  type: string
  severity: string
  title: string
  description: string
  timestamp: string
  relativeTime: string
  isRead: boolean
  resourceType?: string
  resourceId?: number
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

/** Một dòng History Permission (bảng gold.ab_user_app_mapping; đồng bộ từ app permissions). */
export interface AbUserAppMappingRow {
  /** Khóa StarRocks (PRIMARY KEY); thiếu khi API/backend cũ. */
  id?: number
  appId: string
  startDate?: string | null
  endDate?: string | null
}

// Team Members / Users
export interface TeamMember {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName: string
  avatarUrl?: string
  phone?: string
  role: string
  roles?: string[]
  roleNames?: string[]
  status?: string
  emailVerified?: boolean
  emailVerifiedAt?: string
  lastLoginAt?: string
  lastLoginIp?: string
  passwordChangedAt?: string
  mustChangePassword?: boolean
  organization?: {
    id: string
    name: string
    slug: string
    logoUrl?: string
  }
  teams: Array<{
    id: string
    name: string
    role: string
    status: string
    joinedAt?: string
    isTeamLead?: boolean
  }>
  permissions?: Record<string, string>
  metaAdAccountIds?: number[] | null
  metaAdAccountCount?: number
}

export interface ActiveSession {
  id: string
  deviceInfo?: string | null
  ipAddress?: string | null
  createdAt: string
  lastUsedAt?: string | null
  expiresAt: string
  isCurrent: boolean
}

export interface TeamMemberFilterRequest {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
  teamId?: string
}

export interface PagedTeamMembersResponse {
  items: TeamMember[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Hangfire Job Schedule Types
export interface HangfireJobSchedule {
  id: number
  jobId: string
  jobTypeName?: string
  jobMethodName?: string
  displayName?: string
  cronExpression: string
  timeZoneId: string
  enabled: boolean
  sortOrder: number
  /** JSON: Run now — useAsyncRun + queryParams (key, inputType, isRequired). */
  manualRunJson?: string | null
  createdAt: string
  updatedAt: string
}

/** Parsed from <see cref="HangfireJobSchedule.ManualRunJson" />. */
export type ManualRunInputType = "string" | "boolean" | "date" | "integer" | "datetime"

export interface ManualRunQueryParamField {
  key: string
  inputType: ManualRunInputType
  isRequired: boolean
}

export interface ManualRunConfig {
  useAsyncRun?: boolean
  queryParams?: ManualRunQueryParamField[]
}

export interface JobScheduleUpdateRequest {
  cronExpression?: string
  timeZoneId?: string
  enabled?: boolean
  displayName?: string
  jobTypeName?: string
  jobMethodName?: string
  /** Khi true, ghi đè manualRunJson (null/undefined = xóa cấu hình Run now). */
  setManualRunJson?: boolean
  manualRunJson?: string | null
}

// Data Sources (Nexus observability)
export interface DataDomainJobDto {
  jobId: string
  displayName?: string | null
  cronExpression: string
  enabled: boolean
  timeZoneId: string
  lastCheckpointAt?: string | null
  watermarkDate?: string | null
  lastCheckpointSuccess?: boolean | null
  hangfireLastExecution?: string | null
  hangfireNextExecution?: string | null
  hangfireLastJobState?: string | null
}

export interface DataDomainOverviewDto {
  domainKey: string
  label: string
  description: string
  minioPathPattern?: string | null
  starRocksNotes?: string | null
  jobs: DataDomainJobDto[]
}

export interface DataSourceOverviewItemDto {
  key: string
  name: string
  role: string
  brandColorClass: string
  domains: DataDomainOverviewDto[]
}

export interface DataQualityRowDto {
  id: string
  sourceKey: string
  sourceName: string
  tableName: string
  layer: string
  description: string
  status: string
  lastUpdatedRelative?: string | null
  lastDataAtUtc?: string | null
  rowCount?: string | null
  rowCountValue?: number | null
  notes?: string | null
}

export interface DataSourcesOverviewDto {
  sources: DataSourceOverviewItemDto[]
  quality: DataQualityRowDto[]
}

export interface DataSourcesTimelineJobDto {
  jobId: string
  displayName?: string | null
  sourceKey?: string | null
  domainKey?: string | null
  cronExpression: string
  enabled: boolean
  lastExecution?: string | null
  nextExecution?: string | null
  lastJobState?: string | null
  lastCheckpointAt?: string | null
  watermarkDate?: string | null
}

export interface DataSourcesVisualBarDto {
  id: string
  jobId: string
  displayName: string
  startHourFromWindowStart: number
  durationHours: number
  status: string
  recordsLabel: string
  createdAtUtc?: string | null
}

export interface DataSourcesVisualRowDto {
  sourceKey: string
  sourceName: string
  sourceColorClass: string
  bars: DataSourcesVisualBarDto[]
}

export interface DataSourcesTimelineDto {
  jobs: DataSourcesTimelineJobDto[]
  visualRows?: DataSourcesVisualRowDto[] | null
  visualWindowStartUtc?: string | null
  visualWindowEndUtc?: string | null
  currentHourFromWindowStart?: number | null
}

/** Data Sources → Details tab (health by day + jobs-test suggestions) */
export interface DailyHealthCellDto {
  date: string
  count?: number | null
  /** ok | missing | anomaly | unknown */
  status: string
}

export interface JobsTestBackfillActionDto {
  label: string
  /** Path under POST /api/v1/jobs-test/ */
  endpoint: string
  queryParams: Record<string, string>
}

export interface SourceTableHealthDto {
  /** bronze | silver | gold — for grouping when layer=all */
  starRocksLayer?: string | null
  groupKey: string
  displayName?: string | null
  appKey?: string | null
  firebaseId?: string | null
  admobAppId?: string | null
  median?: number | null
  missingCount: number
  anomalyCount: number
  daily: DailyHealthCellDto[]
  suggestedActions: JobsTestBackfillActionDto[]
  isFirebaseRollup?: boolean
  firebasePerApp?: SourceTableHealthDto[] | null
}

export interface SourceDetailsLayerBreakdownDto {
  layer: string
  tableCount: number
  missingDaySlots: number
  anomalyDaySlots: number
}

export interface SourceDetailsSummaryDto {
  topLevelTableCount: number
  tablesWithAnyIssue: number
  totalMissingDaySlots: number
  totalAnomalyDaySlots: number
  byLayer: SourceDetailsLayerBreakdownDto[]
  quickActions: JobsTestBackfillActionDto[]
}

export interface SourceDetailsDto {
  sourceKey: string
  sourceName: string
  layer: string
  days: number
  rangeFrom: string
  rangeTo: string
  tables: SourceTableHealthDto[]
  summary?: SourceDetailsSummaryDto | null
}

// Waterfall Recommendation Types
export interface WaterfallRecommendationConfigDto {
  id: number
  configName: string
  isGlobalDefault: boolean
  isActive: boolean
  minRecommendations: number
  maxRecommendations: number
  minMatchRatePercent: number
  minSowPercent: number
  notes?: string | null
  ruleGroupId?: number | null
  ruleGroupName?: string | null
  appCount: number
  appIds: string[]
  createdAt: string
  updatedAt: string
}

export interface UpsertWaterfallRecommendationConfigDto {
  configName: string
  isGlobalDefault: boolean
  isActive: boolean
  minRecommendations: number
  maxRecommendations: number
  minMatchRatePercent: number
  minSowPercent: number
  notes?: string | null
  ruleGroupId?: number | null
}

export interface ReplaceWaterfallConfigAppsDto {
  appIds: string[]
}

export interface EffectiveWaterfallConfigDto {
  config: WaterfallRecommendationConfigDto
  source: "direct" | "global" | "appsettings"
  directlyAssignedConfigId?: number | null
}

export interface WaterfallRecommendationRuleDto {
  id: number
  displayOrder: number
  name: string
  isActive: boolean
  conditionSowMin?: number | null
  conditionSowMax?: number | null
  conditionMatchRateMin?: number | null
  conditionMatchRateMax?: number | null
  conditionOnlyOneInstance?: boolean | null
  conditionIsHighestFloor?: boolean | null
  conditionOverlapGapThreshold?: number | null
  isMgLevelRule?: boolean
  action: string
  actionMultiplier?: number | null
  actionMultiplier2?: number | null
  actionStaircaseSteps?: number | null
  actionUseMidpoint: boolean
  reasonTemplate?: string | null
  priority: string
  notes?: string | null
  groupId?: number | null
  groupName?: string | null
  createdAt: string
  updatedAt: string
}

export interface WaterfallRecommendationRuleGroupDto {
  id: number
  name: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  color?: string | null
  version?: string | null
  parentGroupId?: number | null
  ruleCount: number
  appCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateUpdateRuleGroupDto {
  name: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  isDefault?: boolean
  color?: string | null
  version?: string | null
  parentGroupId?: number | null
}

export interface AppRuleGroupMappingDto {
  granteeType: "mediation_group"
  granteeId: string
  groupId: number | null
  groupName: string | null
  effectiveGroupId?: number | null
  effectiveGroupName?: string | null
  effectiveSource?: string | null
}

export interface WaterfallBulkPolicyTargetDto {
  mediationGroupId: string
  mediationGroupName: string
  appId: string
  appName: string
  appIconUri?: string | null
  effectiveRuleGroupId?: number | null
  effectiveRuleGroupName?: string | null
  ruleGroupSource?: string | null
  currentApplyMode: string
  currentIntervalDays: number
  dueAt?: string | null
  previewDueAt?: string | null
  lastObservedApplyAt?: string | null
  platform?: string | null
  adFormat?: string | null
  state?: string | null
  hasPersistedPolicy: boolean
}

export interface WaterfallBulkPolicyPreviewResponseDto {
  filterType: string
  appId?: string | null
  ruleGroupId?: number | null
  totalCount: number
  targets: WaterfallBulkPolicyTargetDto[]
}

export interface WaterfallActivePolicyItemDto {
  mediationGroupId: string
  mediationGroupName: string
  appId: string
  appName: string
  appIconUri?: string | null
  effectiveRuleGroupName?: string | null
  applyMode: string
  intervalDays: number
  dueAt?: string | null
  isDue: boolean
  lastObservedApplyAt?: string | null
  lastApplySource?: string | null
  lastEvaluatedAt?: string | null
  lastAlertResultId?: number | null
  platform?: string | null
  adFormat?: string | null
  state?: string | null
}

export interface WaterfallActivePolicyListResponseDto {
  totalCount: number
  autoCount: number
  semiAutoCount: number
  dueNowCount: number
  items: WaterfallActivePolicyItemDto[]
}

export interface BulkUpdateWaterfallApplyPoliciesRequestDto {
  applyMode: string
  intervalDays: number
  mediationGroupIds: string[]
}

export interface BulkUpdateWaterfallApplyPoliciesResponseDto {
  applyMode: string
  requestedCount: number
  updatedCount: number
  skippedCount: number
  updatedAt: string
  updatedMediationGroupIds: string[]
  skippedMediationGroupIds: string[]
}

export interface WaterfallFilterOptionDto {
  value: string
  label: string
  secondaryLabel?: string | null
  iconUri?: string | null
}

export interface AlertRule {
  id: number
  /** ORG = rule tổ chức; PRIVATE = rule cá nhân (My Alerts). */
  visibility?: string | null
  name: string
  description?: string | null
  ruleType: string
  severity: string
  ruleExpression: string
  thresholdValue?: number | null
  timeWindowHours: number
  comparisonPeriodHours?: number | null
  filterConditions?: string | null
  configVersion: number
  ruleConfig?: string | null
  messageTemplate: string
  isEnabled: boolean
  cooldownMinutes: number
  notificationChannels: string
  telegramTopics?: string | null
  emailRecipients?: string | null
  slackChannels?: string | null
  priority: number
  createdAt: string
  /** User id (UUID) người tạo rule; thiếu nếu rule hệ thống hoặc dữ liệu cũ */
  createdBy?: string | null
  updatedAt: string
  lastTriggeredAt?: string | null
}

export interface UpsertAlertRuleRequest {
  /** ORG | PRIVATE — mặc định ORG nếu bỏ qua. */
  visibility?: string | null
  name: string
  description?: string | null
  ruleType: string
  severity: string
  ruleExpression: string
  thresholdValue?: number | null
  timeWindowHours: number
  comparisonPeriodHours?: number | null
  filterConditions?: string | null
  configVersion: number
  ruleConfig?: string | null
  messageTemplate: string
  isEnabled: boolean
  cooldownMinutes: number
  notificationChannels: string
  telegramTopics?: string | null
  emailRecipients?: string | null
  slackChannels?: string | null
  priority: number
}

export interface AlertRuleScopeConfig {
  allApps: boolean
  appIds: string[]
  /** Metric key (revenue, ecpm, …) để sắp xếp thứ tự xử lý alert theo app; để trống = thứ tự mặc định */
  orderByMetric?: string | null
  /** "asc" | "desc"; mặc định desc khi có orderByMetric */
  orderByDirection?: string | null
}

/** Một điều kiện trong rule_config.conditions[] (AND/OR qua conditionLogic). */
export interface AlertRuleConditionPayload {
  id?: string | null
  metricKey?: string | null
  metricUnit?: string | null
  conditionType?: string | null
  operator?: string | null
  thresholdValue?: number | null
  percentChange?: number | null
  consecutiveDays?: number | null
}

export interface AlertRuleConfigPayload {
  version: number
  source?: string | null
  /** Legacy: một metric gốc khi không dùng conditions[]. */
  metricKey?: string | null
  metricUnit?: string | null
  /** "all" = AND, "any" = OR, "always_true" = luôn kích hoạt (không dùng conditions[]) */
  conditionLogic?: string | null
  conditions?: AlertRuleConditionPayload[] | null
  conditionType?: string | null
  operator?: string | null
  thresholdValue?: number | null
  percentChange?: number | null
  consecutiveDays?: number | null
  frequency?: string | null
  /** Realtime/Hourly: phút tối thiểu giữa hai lần check cho cùng app + rule */
  evaluationCooldownMinutes?: number | null
  /** Daily: giờ 0–23 theo GMT+7 (UTC+7); key JSON vẫn dailyEvaluationHourUtc; null = không khóa giờ */
  dailyEvaluationHourUtc?: number | null
  autoResolve?: boolean | null
  prompt?: string | null
  scope: AlertRuleScopeConfig
}

/** Catalog metric for alert rule builder (from app_metrics, filtered by user app permissions). */
export interface AppMetricCatalogItem {
  metricKey: string
  name: string
}

export interface AlertCenterListItem {
  id: number
  alertRuleId: number
  alertType: string
  severity: string
  message: string
  publisherId: string
  /** admob_accounts.display_name khi PublisherId khớp account_id. */
  adMobAccountDisplayName?: string | null
  appId?: string
  appDisplayName?: string
  appStoreId?: string | null
  appPlatform?: string
  appIconUri?: string
  mediationGroupId?: string
  mediationGroupDisplayName?: string
  adSourceId?: string
  adSourceDisplayName?: string
  countryCode?: string
  value: number
  threshold: number
  baselineValue?: number | null
  deltaValue?: number | null
  deltaPercent?: number | null
  metricKey?: string | null
  metricUnit?: string | null
  status: string
  triggeredAt: string
  sentAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  snoozedUntil?: string
  resolutionComment?: string | null
  correlationKey?: string | null
  additionalData?: string
  alertRuleName?: string | null
  alertRuleDescription?: string | null
  notificationChannels?: string | null
  /** Server: user hiện tại đã mở/xem alert trong app (bảng alert_in_app_reads). */
  inAppReadAt?: string | null
}

export interface AlertDetailTimelineItem {
  id: number
  type: string
  title: string
  description?: string | null
  occurredAt: string
}

/** Global Alert Center timeline row (paginated API, sourced from alert_history). */
export interface AlertCenterTimelineItem {
  id: number
  alertResultId: number
  action: string
  previousStatus?: string | null
  newStatus?: string | null
  actionBy?: string | null
  comment?: string | null
  occurredAt: string
  title: string
  subtitle?: string | null
  alertRuleName?: string | null
  appId?: string | null
  appDisplayName?: string | null
}

export interface PagedAlertCenterTimelineResponse {
  data: AlertCenterTimelineItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AlertNotificationLogItem {
  id: number
  channel: string
  recipient: string
  status: string
  sentAt: string
  errorMessage?: string | null
}

export interface AlertTrendPoint {
  label: string
  date: string
  value: number
  threshold?: number | null
}

export interface AlertMetricSummary {
  label: string
  value: string
  changePercent?: number | null
  status: string
}

export interface AlertSuggestedAction {
  id: string
  action: string
  impact: string
}

export interface AlertDetailResponse {
  alert: AlertCenterListItem
  timeline: AlertDetailTimelineItem[]
  notificationLogs: AlertNotificationLogItem[]
  relatedAlerts: AlertCenterListItem[]
  trend: AlertTrendPoint[]
  relatedMetrics: AlertMetricSummary[]
  suggestedActions: AlertSuggestedAction[]
  aiInsight?: string | null
}

// —— App Insight (daily AI insight)
export interface DimensionScores {
  revenueMonetization?: number
  growthAcquisition?: number
  engagementRetention?: number
  productContent?: number
  adInfrastructure?: number
  unitEconomics?: number
  portfolioPosition?: number
  optimizationVelocity?: number
}
/** Tài liệu Help & Docs do user tải lên (`/api/HelpDocuments`). */
export interface HelpDocumentListItem {
  id: string
  title: string
  originalFileName: string
  contentType: string
  fileSize: number
  isPublishedGlobal: boolean
  isOwner: boolean
  createdAt: string
}

export interface InsightAnomaly {
  label: string
  severity: string
  metricKey?: string | null
}

export interface InsightActionItem {
  id: string
  title: string
  severity: string
  metricKey?: string | null
  status: string
  source: string
}

export interface InsightMetadata {
  provider?: string | null
  model?: string | null
  inputTokens: number
  outputTokens: number
  latencyMs: number
  snapshotPartial?: boolean
  dataGaps?: string[] | null
  snapshotRevenueT1?: number | null
  snapshotImpressionsT1?: number | null
}

/** Per-day summary for insight history calendar. */
export interface AppInsightHistoryDay {
  insightDate: string
  healthScore?: number | null
  anomalyCount: number
}

export interface AppDailyInsight {
  id?: number
  appRowId: number
  appId: string
  displayName?: string | null
  iconUri?: string | null
  insightDate: string
  markdownBody: string
  healthScore?: number | null
  healthTier?: string | null
  dimensionScores?: DimensionScores | null
  actions?: InsightActionItem[]
  anomalies: InsightAnomaly[]
  metadata: InsightMetadata
  status: string
  errorMessage?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AppInsightSettings {
  appRowId: number
  insightTemplateId?: number | null
  generationEnabled: boolean
  settings: Record<string, unknown>
}

export interface InsightTemplateSection {
  id?: number
  sectionKey: string
  title: string
  metrics: string[]
  comparisonPeriods: string[]
  aiInstruction: string
  audience: string[]
  sortOrder: number
  isActive: boolean
  anomalyThresholds?: Record<string, unknown> | null
}

export interface InsightTemplate {
  id: number
  name: string
  description?: string | null
  isDefault: boolean
  globalAiInstructions: string
  preferredProvider?: string | null
  maxAppsPerBatch: number
  parallelDegree: number
  sections: InsightTemplateSection[]
  createdAt: string
  updatedAt: string
}

export interface InsightContextTemplate {
  id: number
  name: string
  contextType: string
  defaultTitle: string
  body: string
  description?: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DailyInsightFeedItem {
  insightId: number
  appRowId: number
  appId: string
  displayName?: string | null
  iconUri?: string | null
  category?: string | null
  insightDate: string
  healthScore?: number | null
  summary: string
  anomalies: InsightAnomaly[]
  sectionCount: number
  totalTokens: number
  revenueT1?: number | null
  dauT1?: number | null
  trend: string
}

export interface InsightGenerationRun {
  id: string
  startedAt: string
  finishedAt?: string | null
  triggerKind: string
  insightDateTarget: string
  appsTotal: number
  appsSucceeded: number
  appsFailed: number
  errorSummary?: string | null
}

export interface InsightUserNotification {
  id: string
  title: string
  body?: string | null
  insightId: number
  appId: string
  insightDate: string
  createdAt: string
  read: boolean
}

// ---- Commission ----

export interface CommissionRateDto {
  id: number
  username: string
  appId: string
  /** Tên hiển thị (PostgreSQL), có thể null nếu user không có first/last name */
  userDisplayName?: string | null
  userEmail?: string | null
  userAvatarUrl?: string | null
  appDisplayName?: string | null
  appIconUri?: string | null
  appStoreId?: string | null
  /** null = không hưởng hoa hồng */
  commissionRate: number | null
  effectiveDate: string
  expiryDate: string | null
  createdOn: string | null
  updatedOn: string | null
}

export interface CreateCommissionRateRequest {
  username: string
  appId: string
  commissionRate: number | null
  effectiveDate: string
  expiryDate: string | null
  /** Gửi true sau khi user xác nhận ghi đè period chồng lấn */
  confirmOverrideOverlappingPeriods?: boolean
}

export interface SetExpiryRequest {
  expiryDate: string
}

export interface CommissionRevenueRow {
  username: string
  appId: string
  appName: string
  /** Tháng dạng yyyy-MM */
  month: string
  totalRevenue: number
  commissionRate: number | null
  commissionAmount: number
}

export interface CommissionRatePagedResult {
  data: CommissionRateDto[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface PermittedAppListItem {
  appId: string
  name: string
  displayName?: string | null
  appStoreId?: string | null
  iconUri?: string | null
  platform?: string | null
}



