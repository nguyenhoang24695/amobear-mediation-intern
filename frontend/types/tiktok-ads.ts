export interface TikTokDashboardOverviewDto {
  totalSpend: number
  totalInstalls: number
  totalClicks: number
  totalImpressions: number
  avgCpi: number
  avgCpc: number
  avgCpm: number
  avgCtr: number
  avgRoasD7: number
  activeCampaigns: number
  accountBalance: number
}

export interface TikTokDashboardDailyDto {
  date: string
  spend: number
  installs: number
  clicks: number
  impressions: number
  roasD7: number | null
}

export interface TikTokCampaignPerformanceDto {
  campaignId: string
  campaignName: string
  advertiserId: string
  appId?: string | null
  spend: number
  installs: number
  cpi: number
  roas?: number | null
  status: string
}

export interface TikTokCampaignPerformancePageDto {
  items: TikTokCampaignPerformanceDto[]
  total: number
  page: number
  pageSize: number
}

export interface TikTokInstallDiscrepancyDto {
  date: string
  campaignId: string
  campaignName: string
  mmpInstalls: number
  tikTokReportedInstalls: number
  driftPercent: number
}

export interface TikTokIntegrationDto {
  id: number
  displayName: string
  tikTokAppId: string
  hasAppSecret: boolean
  appSecretHint?: string | null
  hasAccessToken: boolean
  accessTokenHint?: string | null
  tokenStatus: string
  lastCheckedAt?: string | null
  lastCheckMessage?: string | null
  scopes: string[]
  authorizedAdvertiserIds: string[]
  isSandbox: boolean
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface TikTokAuthorizeUrlResponseDto {
  authorizationUrl: string
  state: string
}

export interface TikTokTokenStatusDto {
  integrationId: number
  hasAccessToken: boolean
  tokenStatus: string
  lastCheckedAt?: string | null
  lastCheckMessage?: string | null
  scopes: string[]
  authorizedAdvertiserIds: string[]
}

export interface TikTokIntegrationTestRequestDto {
  integrationId?: number | null
  tikTokAppId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  scopes?: string[] | null
  isSandbox?: boolean
}

export interface TikTokIntegrationTestResultDto {
  integrationId?: number | null
  success: boolean
  resultCode: string
  tokenStatus: string
  checkedAt: string
  message: string
  scopes: string[]
  authorizedAdvertiserIds: string[]
}

export interface CreateTikTokIntegrationRequestDto {
  displayName: string
  tikTokAppId: string
  appSecret?: string | null
  accessToken?: string | null
  scopes?: string[] | null
  isSandbox?: boolean
  isDefault?: boolean
  isEnabled?: boolean
}

export interface UpdateTikTokIntegrationRequestDto {
  displayName?: string | null
  tikTokAppId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  clearAppSecret?: boolean
  clearAccessToken?: boolean
  scopes?: string[] | null
  isSandbox?: boolean
  isDefault?: boolean
  isEnabled?: boolean
}

export interface TikTokAdAccountDto {
  id: number
  tikTokIntegrationId: number
  advertiserId: string
  name: string
  currency?: string | null
  country?: string | null
  timezone?: string | null
  timezoneOffsetMinutes?: number | null
  bcId?: string | null
  bcName?: string | null
  balance?: number | null
  status: string
  isActive: boolean
  lastSyncedAt?: string | null
}

export interface TikTokAdAccountPageDto {
  items: TikTokAdAccountDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TikTokAdAccountFilterOptionsDto {
  names: string[]
  advertiserIds: string[]
  countries: string[]
}

export interface UpsertTikTokAdAccountRequestDto {
  tikTokIntegrationId: number
  advertiserId: string
  name: string
  currency?: string
  country?: string
  timezone?: string
  timezoneOffsetMinutes?: number
  status?: string
  isActive?: boolean
}

export interface TikTokAppMappingDto {
  id: number
  appRowId: number
  appId?: string | null
  appDisplayName?: string | null
  appPlatform?: string | null
  tikTokAppId: string
  downloadUrl: string
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTikTokAppMappingRequestDto {
  appRowId: number
  tikTokAppId: string
  downloadUrl: string
  packageNameOverride?: string
  bundleIdOverride?: string
  deepLinkUrlOverride?: string
  storeUrlOverride?: string
  isActive?: boolean
}

export interface TikTokAppMappingCandidateAppDto {
  appRowId: number
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
}

export interface TikTokAppMappingCandidateDto {
  id: number
  discoveryKey: string
  source: string
  tikTokAppId: string
  downloadUrl?: string | null
  packageName?: string | null
  bundleId?: string | null
  storeUrl?: string | null
  sampleCampaignId?: string | null
  sampleAdGroupId?: string | null
  sourceAdvertiserIds: string[]
  sourceCampaignIds: string[]
  sourceAdGroupIds: string[]
  identifiers: string[]
  sourceAdvertiserCount: number
  sourceCampaignCount: number
  sourceAdGroupCount: number
  firstDiscoveredAt: string
  lastDiscoveredAt: string
  matchQuality: string
  reviewStatus: string
  recommendedAppRowId?: number | null
  recommendedApp?: TikTokAppMappingCandidateAppDto | null
  suggestedApps: TikTokAppMappingCandidateAppDto[]
  resolvedAppRowId?: number | null
  resolvedApp?: TikTokAppMappingCandidateAppDto | null
  resolvedTikTokAppMappingId?: number | null
  resolutionType?: string | null
  resolutionNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface TikTokAppMappingCandidateQueryDto {
  search?: string
  reviewStatus?: string
  matchQuality?: string
  advertiserId?: string
}

export interface ResolveTikTokAppMappingCandidateRequestDto {
  resolutionType: string
  appRowId?: number | null
  resolutionNote?: string | null
}

export interface TikTokReferenceResponseDto {
  adAccounts: TikTokAdAccountDto[]
  appMappings: TikTokAppMappingDto[]
  objectives: TikTokOptionDto[]
  placementTypes: TikTokOptionDto[]
  bidTypes: TikTokOptionDto[]
  optimizationGoals: TikTokOptionDto[]
}

export interface TikTokOptionDto {
  key: string
  label: string
}

export interface CreateTikTokCampaignRequestDto {
  tikTokAdAccountRowId: number
  appRowId: number
  idempotencyKey?: string
  campaign: TikTokCampaignDraftDto
  adGroup: TikTokAdGroupDraftDto
  ad: TikTokAdDraftDto
}

export interface UpdateTikTokCampaignRequestDto extends Omit<CreateTikTokCampaignRequestDto, "idempotencyKey"> {}

export interface TikTokCampaignDraftDto {
  campaignName: string
  objectiveType: string
  budget?: number
  budgetMode: string
}

export interface TikTokAdGroupDraftDto {
  adGroupName: string
  placementType: string
  placements: string[]
  budget?: number
  budgetMode: string
  scheduleType: string
  startTime?: string
  endTime?: string
  optimizationGoal: string
  bidType: string
  bid?: number
  billingEvent: string
  appId?: string
  appDownloadUrl?: string
  operatingSystems: string[]
  locationIds: string[]
  ageGroups: string[]
  gender: string
  languages: string[]
}

export interface TikTokAdDraftDto {
  adName: string
  adFormat: string
  videoId?: string
  imageIds: string[]
  videoAssetId?: number
  imageAssetIds: number[]
  adText?: string
  callToAction?: string
  landingPageUrl?: string
  trackingUrl?: string
}

export interface TikTokValidationResultDto {
  isValid: boolean
  errors: string[]
}

export interface TikTokCampaignRequestListItemDto {
  id: number
  campaignName: string
  objective: string
  status: string
  tikTokAdAccountRowId: number
  tikTokAdAccountName?: string | null
  appRowId: number
  appId?: string | null
  appDisplayName?: string | null
  idempotencyKey: string
  failureSummary?: string | null
  requestedBy: string
  approvedBy?: string | null
  createdAt: string
  submittedAt?: string | null
  approvedAt?: string | null
  executedAt?: string | null
  failedAt?: string | null
}

export interface TikTokCampaignRequestDetailDto extends TikTokCampaignRequestListItemDto {
  tikTokAppMappingId?: number | null
  payloadJson: string
  validationErrors: string[]
  correlationId?: string | null
  rejectedBy?: string | null
  executedBy?: string | null
  updatedAt: string
  rejectedAt?: string | null
  operationLogs: TikTokOperationLogDto[]
  createdObjects: TikTokCreatedObjectDto[]
}

export interface TikTokOperationLogDto {
  id: number
  step: string
  status: string
  attemptNumber: number
  action?: string | null
  resourcePath?: string | null
  httpStatusCode?: number | null
  tikTokErrorCode?: string | null
  summaryMessage?: string | null
  requestJson?: string | null
  responseJson?: string | null
  errorMessage?: string | null
  correlationId?: string | null
  startedAt: string
  finishedAt?: string | null
}

export interface TikTokCreatedObjectDto {
  entityType: string
  localId: number
  externalId: string
  name: string
  status: string
}

export interface TikTokExecutionResultDto {
  success: boolean
  dryRun: boolean
  message?: string | null
  correlationId: string
  payloadPreview?: unknown
  detail?: TikTokCampaignRequestDetailDto | null
}
