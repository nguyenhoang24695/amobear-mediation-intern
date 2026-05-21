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

export interface TikTokDashboardFilterOptionDto {
  value: string
  label: string
}

export interface TikTokDashboardFiltersResponseDto {
  advertisers: TikTokDashboardFilterOptionDto[]
  campaigns: TikTokDashboardFilterOptionDto[]
}

export interface TikTokCampaignListSummaryDto {
  total: number
  active: number
  paused: number
  issues: number
  unmapped: number
  staleSync: number
  lastSyncedAt?: string | null
}

export interface TikTokCampaignListItemDto {
  id: number
  tikTokCampaignId: string
  name: string
  objective?: string | null
  status: string
  secondaryStatus?: string | null
  budget?: number | null
  budgetMode?: string | null
  appPromotionType?: string | null
  tikTokCreatedAt?: string | null
  tikTokModifiedAt?: string | null
  tikTokAdAccountRowId: number
  advertiserId: string
  tikTokAdAccountName?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  appIconUri?: string | null
  platform?: string | null
  isUnmapped: boolean
  isSyncStale: boolean
  source: string
  createdFromRequestId?: number | null
  adGroupCount: number
  adCount: number
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface TikTokCampaignListResponseDto {
  items: TikTokCampaignListItemDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: TikTokCampaignListSummaryDto
}

export interface TikTokCampaignAdGroupSummaryDto {
  id: number
  tikTokAdGroupId: string
  name: string
  status: string
  budget?: number | null
  budgetMode?: string | null
  placementType?: string | null
  optimizationGoal?: string | null
  bidType?: string | null
  bid?: number | null
  billingEvent?: string | null
  scheduleType?: string | null
  adTexts: string[]
  scheduleStartTime?: string | null
  scheduleEndTime?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
  createdFromRequestId?: number | null
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface TikTokCampaignAdSummaryDto {
  id: number
  tikTokAdId: string
  name: string
  status: string
  adFormat?: string | null
  videoId?: string | null
  videoIds: string[]
  imageIds: string[]
  adText?: string | null
  adTexts: string[]
  callToAction?: string | null
  landingPageUrl?: string | null
  trackingUrl?: string | null
  creativeMedia: TikTokCreativeMediaDto
  tikTokAdGroupRowId: number
  tikTokAdGroupId?: string | null
  tikTokAdGroupName?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
  createdFromRequestId?: number | null
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface TikTokCreativeMediaDto {
  images: TikTokCreativeImageDto[]
  videos: TikTokCreativeVideoDto[]
  errorMessage?: string | null
}

export interface TikTokCreativeImageDto {
  imageId: string
  imageUrl?: string | null
  fileName?: string | null
  format?: string | null
  width?: number | null
  height?: number | null
  size?: number | null
  displayable?: boolean | null
  materialId?: string | null
  createTime?: string | null
  modifyTime?: string | null
}

export interface TikTokCreativeVideoDto {
  videoId: string
  previewUrl?: string | null
  previewUrlExpireTime?: string | null
  videoCoverUrl?: string | null
  fileName?: string | null
  format?: string | null
  duration?: number | null
  width?: number | null
  height?: number | null
  size?: number | null
  displayable?: boolean | null
  allowDownload?: boolean | null
  materialId?: string | null
  createTime?: string | null
  modifyTime?: string | null
}

export interface TikTokLibraryVideoPageDto {
  items: TikTokCreativeVideoDto[]
  page: number
  pageSize: number
  totalNumber?: number | null
}

export interface TikTokLibraryImagePageDto {
  items: TikTokCreativeImageDto[]
  page: number
  pageSize: number
  totalNumber?: number | null
}

export interface TikTokCampaignDetailDto extends TikTokCampaignListItemDto {
  configJson?: string | null
  performanceStartDate: string
  performanceEndDate: string
  performance: TikTokCampaignPerformanceSummaryDto
  adGroups: TikTokCampaignAdGroupSummaryDto[]
  ads: TikTokCampaignAdSummaryDto[]
}

export interface TikTokCampaignPerformanceSummaryDto {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  tikTokReportedInstalls: number
  mmpInstalls: number
  cpi: number
  cpc: number
  cpm: number
  ctr: number
  costPerConversion: number
}

export interface SyncTikTokCampaignsRequestDto {
  tikTokAdAccountIds?: number[] | null
}

export interface TikTokSyncResultDto {
  syncedAt: string
  accountsScanned: number
  rawObjectsSaved: number
  rowsWritten: number
  failedAccounts: number
  messages: string[]
}


export interface TikTokCampaignDuplicateReadinessCheckDto {
  key: string
  label: string
  isReady: boolean
  message: string
}

export interface TikTokCampaignDuplicateReadinessResultDto {
  isReady: boolean
  summary: string
  checkedAt: string
  checks: TikTokCampaignDuplicateReadinessCheckDto[]
}

export interface TikTokCampaignDuplicateResponseDto {
  success: boolean
  message: string
  newCampaignId?: string | null
  newLocalCampaignId?: number | null
  createdAdGroupCount: number
  createdAdCount: number
}

export interface TikTokCampaignDuplicateToRequestResponseDto {
  success: boolean
  message: string
  requestId: number
  requestUrl: string
  copiedAdGroupCount: number
  copiedAdCount: number
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
  grantBalance?: number | null
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
  appRowId?: number | null
  linkedAppRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  appPlatform?: string | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  normalizedStoreIdentifier?: string | null
  storeIdentifierType?: string | null
  tikTokAppId: string
  downloadUrl: string
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
  advertiserIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateTikTokAppMappingRequestDto {
  appRowId?: number | null
  linkedAppRowId?: number | null
  tikTokAppId: string
  downloadUrl: string
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  packageNameOverride?: string
  bundleIdOverride?: string
  deepLinkUrlOverride?: string
  storeUrlOverride?: string
  isActive?: boolean
}

export interface TikTokAppMappingCandidateAppDto {
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
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
  budgetModes: TikTokOptionDto[]
  scheduleTypes: TikTokOptionDto[]
  billingEvents: TikTokOptionDto[]
  genders: TikTokOptionDto[]
  ageGroups: TikTokOptionDto[]
  operatingSystems: TikTokOptionDto[]
  callToActions: TikTokOptionDto[]
  adFormats: TikTokOptionDto[]
  identityTypes: TikTokOptionDto[]
  placements: TikTokOptionDto[]
  defaultLocationIds: string[]
}

export interface TikTokTargetingOptionsResponseDto {
  locations: TikTokTargetingOptionDto[]
  languages: TikTokTargetingOptionDto[]
  source: string
  loadedAt: string
  errorMessage?: string | null
}

export interface TikTokTargetingOptionDto {
  key: string
  label: string
  type: string
  countryCode?: string | null
  level?: string | null
  parentId?: string | null
  path?: string | null
}

export interface TikTokIdentityOptionDto {
  key: string
  label: string
  identityId: string
  identityType: string
  identityAuthorizedBcId?: string | null
  displayName?: string | null
}

export interface TikTokOptionDto {
  key: string
  label: string
}

export interface CreateTikTokCampaignRequestDto {
  tikTokAdAccountRowId: number
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
  idempotencyKey?: string
  campaign: TikTokCampaignDraftDto
  adGroup: TikTokAdGroupDraftDto
  ad: TikTokAdDraftDto
  ads: TikTokAdDraftDto[]
  adGroups: TikTokAdGroupDraftWithAdsDto[]
}

export interface UpdateTikTokCampaignRequestDto extends Omit<CreateTikTokCampaignRequestDto, "idempotencyKey"> {}

export interface TikTokCampaignDraftDto {
  campaignName: string
  objectiveType: string
  campaignType?: string
  appPromotionType?: string
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
  countryGroupIds: number[]
  ageGroups: string[]
  gender: string
  languages: string[]
  adTexts: string[]
}

export interface TikTokAdGroupDraftWithAdsDto {
  adGroup: TikTokAdGroupDraftDto
  ads: TikTokAdDraftDto[]
}

export interface TikTokAdDraftDto {
  adName: string
  adFormat: string
  videoId?: string
  videoIds: string[]
  imageIds: string[]
  videoAssetId?: number
  videoAssetIds: number[]
  imageAssetIds: number[]
  adText?: string
  adTexts: string[]
  callToAction?: string
  landingPageUrl?: string
  trackingUrl?: string
  identityId?: string
  identityType?: string
  identityAuthorizedBcId?: string
  displayName?: string
  appName?: string
  avatarIconWebUri?: string
}

export interface TikTokRequestAssetDto {
  id: number
  kind: "image" | "video" | string
  fileName: string
  contentType: string
  sizeBytes: number
  previewUrl: string
  createdAt: string
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
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
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
  paidMediaAppBindingId?: number | null
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




