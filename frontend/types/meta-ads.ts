export type MetaRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed"

export type MetaCreativeType = "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL_IMAGE" | "EXISTING_POST" | "FLEXIBLE"
export type MetaGeoMode = "GLOBAL" | "COUNTRY" | "REGION" | "COUNTRY_GROUP" | "CITY"
export type MetaCreativeMediaMode = "meta_ref" | "external_url" | "uploaded_asset"


export interface MetaIntegrationDto {
  id: number
  displayName: string
  authMode: string
  isProductionSafe: boolean
  productionUsageMessage?: string | null
  metaBusinessId?: string | null
  metaBusinessName?: string | null
  metaAppId?: string | null
  hasAppSecret: boolean
  appSecretHint?: string | null
  hasAccessToken: boolean
  accessTokenHint?: string | null
  tokenType?: string | null
  tokenExpiresAt?: string | null
  lastCheckedAt?: string | null
  scopes: string[]
  tokenStatus: string
  lastCheckMessage?: string | null
  syncedAdAccountCount: number
  totalAmountSpent?: number | null
  totalBalance?: number | null
  totalSpendCap?: number | null
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateMetaIntegrationRequestDto {
  displayName: string
  authMode: string
  metaBusinessId?: string | null
  metaBusinessName?: string | null
  metaAppId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  tokenType?: string | null
  tokenExpiresAt?: string | null
  scopes?: string[] | null
  isDefault: boolean
  isEnabled: boolean
}

export interface UpdateMetaIntegrationRequestDto {
  displayName?: string | null
  authMode?: string | null
  metaBusinessId?: string | null
  metaBusinessName?: string | null
  metaAppId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  tokenType?: string | null
  tokenExpiresAt?: string | null
  scopes?: string[] | null
  isDefault?: boolean
  isEnabled?: boolean
  clearAppSecret?: boolean
  clearAccessToken?: boolean
}

export interface MetaAuthorizeUrlResponseDto {
  authorizationUrl: string
  state: string
}

export interface MetaOAuthCallbackRequestDto {
  code: string
  redirectUri: string
}

export interface MetaTokenStatusDto {
  integrationId: number
  authMode: string
  isProductionSafe: boolean
  hasAccessToken: boolean
  tokenType?: string | null
  tokenExpiresAt?: string | null
  lastCheckedAt?: string | null
  tokenStatus: string
  lastCheckMessage?: string | null
  scopes: string[]
}

export interface MetaIntegrationTestRequestDto {
  integrationId?: number | null
  authMode?: string | null
  metaBusinessId?: string | null
  metaBusinessName?: string | null
  metaAppId?: string | null
  appSecret?: string | null
  accessToken?: string | null
  tokenType?: string | null
  tokenExpiresAt?: string | null
  scopes?: string[] | null
}

export interface MetaIntegrationTestResultDto {
  integrationId?: number | null
  success: boolean
  authMode: string
  isProductionSafe: boolean
  resultCode: string
  tokenStatus: string
  checkedAt: string
  message: string
  tokenType?: string | null
  tokenExpiresAt?: string | null
  scopes: string[]
  warningMessages: string[]
}

export interface MetaAdAccountDto {
  id: number
  metaIntegrationId: number
  metaAdAccountId: string
  name: string
  currency?: string | null
  timeZoneName?: string | null
  timezoneOffsetMinutes?: number | null
  businessId?: string | null
  businessName?: string | null
  amountSpent?: number | null
  balance?: number | null
  spendCap?: number | null
  status: string
  isActive: boolean
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertMetaAdAccountRequestDto {
  metaIntegrationId: number
  metaAdAccountId: string
  name: string
  currency?: string | null
  timeZoneName?: string | null
  timezoneOffsetMinutes?: number | null
  businessId?: string | null
  businessName?: string | null
  status?: string | null
  isActive: boolean
}

export interface MetaAppMappingDto {
  id: number
  appRowId?: number | null
  linkedAppRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  normalizedStoreIdentifier?: string | null
  storeIdentifierType?: string | null
  metaApplicationId: string
  externalAppName?: string | null
  objectStoreUrl?: string | null
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
  isMappedToAdmob?: boolean
  admobAccountCount?: number
  admobBindings?: MetaAppMappingAdmobBindingDto[]
  createdAt: string
  updatedAt: string
}

export interface MetaAppMappingAdmobBindingDto {
  bindingId: number
  admobAccountId?: number | null
  admobAccountName?: string | null
  admobAccountExternalId?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  externalAppId: string
  isActive: boolean
}

export interface CreateMetaAppMappingRequestDto {
  appRowId?: number | null
  linkedAppRowId?: number | null
  metaApplicationId: string
  objectStoreUrl?: string | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
}

export interface UpdateMetaAppMappingRequestDto {
  appRowId?: number | null
  linkedAppRowId?: number | null
  metaApplicationId?: string | null
  objectStoreUrl?: string | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive?: boolean
}

export interface MetaAppMappingDiscoveryRequestDto {
  lookbackDays?: number | null
}

export interface MetaAppMappingDiscoveryResultDto {
  accountsScanned: number
  accountsPartiallyScanned: number
  adSetsScanned: number
  externalAppsDiscovered: number
  mappingsAutoCreated: number
  candidatesOpened: number
  candidatesUpdated: number
  conflictsFound: number
  messages: string[]
}

export interface MetaAppMappingCandidateAppDto {
  appRowId: number
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
}

export interface MetaAppMappingCandidateDto {
  id: number
  discoveryKey: string
  platform?: string | null
  metaApplicationId: string
  objectStoreUrl?: string | null
  normalizedStoreIdentifier?: string | null
  storeIdentifierType?: string | null
  sampleAdSetId?: string | null
  sampleAdSetName?: string | null
  sourceAdAccountIds: string[]
  sourceAdSetIds: string[]
  sourceAdAccountCount: number
  sourceAdSetCount: number
  firstDiscoveredAt: string
  lastDiscoveredAt: string
  matchQuality: string
  reviewStatus: string
  recommendedAppRowId?: number | null
  recommendedApp?: MetaAppMappingCandidateAppDto | null
  suggestedApps: MetaAppMappingCandidateAppDto[]
  resolvedAppRowId?: number | null
  resolvedApp?: MetaAppMappingCandidateAppDto | null
  resolvedMetaAppMappingId?: number | null
  resolutionType?: string | null
  resolutionNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface MetaAppMappingCandidateQueryDto {
  search?: string
  platform?: string
  reviewStatus?: string
  matchQuality?: string
}

export interface ResolveMetaAppMappingCandidateRequestDto {
  resolutionType: string
  appRowId?: number | null
  resolutionNote?: string | null
}

export interface MetaCampaignListSummaryDto {
  total: number
  active: number
  paused: number
  issues: number
  staleSync: number
  lastSyncedAt?: string | null
}

export interface MetaCampaignListItemDto {
  id: number
  externalCampaignId: string
  name: string
  objective: string
  status: string
  effectiveStatus?: string | null
  metaAdAccountRowId: number
  metaAdAccountId: string
  metaAdAccountName?: string | null
  businessId?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  appIconUri?: string | null
  platform?: string | null
  isUnmapped: boolean
  isSyncStale: boolean
  source: string
  createdFromRequestId?: number | null
  adSetCount: number
  adCount: number
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}
export interface MetaCampaignListResponseDto {
  items: MetaCampaignListItemDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: MetaCampaignListSummaryDto
}

export interface MetaCampaignAdSetSummaryDto {
  id: number
  externalAdSetId: string
  name: string
  status: string
  effectiveStatus?: string | null
  dailyBudget?: string | null
  lifetimeBudget?: string | null
  budgetRemaining?: string | null
  bidAmount?: string | null
  bidStrategy?: string | null
  roasAverageFloor?: string | null
  billingEvent?: string | null
  optimizationGoal?: string | null
  pacingType?: string | null
  learningStageInfoSummary?: string | null
  startTime?: string | null
  endTime?: string | null
  targetingSummary?: string | null
  issuesInfoSummary?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  metaApplicationId?: string | null
  objectStoreUrl?: string | null
  lastSyncedAt?: string | null
  updatedAt: string
}

export interface MetaCampaignAdSummaryDto {
  id: number
  externalAdId: string
  name: string
  status: string
  effectiveStatus?: string | null
  metaAdSetRowId: number
  externalAdSetId?: string | null
  adSetName?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  metaCreativeRowId?: number | null
  externalCreativeId?: string | null
  creativeName?: string | null
  lastSyncedAt?: string | null
  updatedAt: string
}

export interface MetaCampaignCreativeUsageAdDto {
  id: number
  externalAdId: string
  adName: string
}

export interface MetaCampaignCreativeSummaryDto {
  id: number
  externalCreativeId: string
  name: string
  status: string
  objectType?: string | null
  pageId?: string | null
  instagramActorId?: string | null
  headline?: string | null
  message?: string | null
  description?: string | null
  callToActionType?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  linkUrl?: string | null
  effectiveObjectStoryId?: string | null
  usedByAdCount: number
  usedByAds: MetaCampaignCreativeUsageAdDto[]
  lastSyncedAt?: string | null
  configJson?: string | null
}

export interface MetaCampaignPreviewDto {
  campaignId: number
  adId: number
  externalAdId: string
  adName: string
  previewUrl: string
  message: string
}

export interface MetaCampaignDuplicateRequestDto {
  deepCopy?: boolean
  quantity?: number
}

export interface MetaAdSetDuplicateRequestDto {
  quantity?: number
  newName?: string | null
}

export interface MetaAdSetDuplicateResponseDto {
  success: boolean
  message: string
  newExternalAdSetIds: string[]
  newLocalAdSetIds: number[]
}

export interface MetaCampaignStatusUpdateResultDto {
  campaignId: number
  externalCampaignId: string
  previousStatus: string
  newStatus: string
  effectiveStatus?: string | null
  message: string
  updatedAt: string
  traceId?: string | null
}

export interface MetaCampaignDuplicateConflictResponseDto {
  message: string
  readiness: MetaCampaignDuplicateReadinessResultDto
}

export interface MetaCampaignDuplicateReadinessCheckDto {
  key: string
  label: string
  status: string
  message: string
  targetType: string
  targetId?: string | null
  metaErrorCode?: string | null
  metaErrorSubcode?: string | null
  metaErrorType?: string | null
  traceId?: string | null
}

export interface MetaCampaignDuplicateReadinessResultDto {
  sourceCampaignId: number
  sourceExternalCampaignId: string
  metaAdAccountRowId: number
  isReady: boolean
  status: string
  summary: string
  checkedAt: string
  checks: MetaCampaignDuplicateReadinessCheckDto[]
}
export interface MetaCampaignSyncSingleResultDto {
  campaignId: number
  metaAdAccountRowId: number
  externalCampaignId: string
  campaignName: string
  syncResult: SyncMetaCampaignsResultDto
}

export interface MetaCampaignDuplicateStartResponseDto {
  operationId: number
  status: string
  correlationId: string
  jobId?: string | null
  requestedCopies: number
  completedCopies: number
  failedCopies: number
  message: string
}

export interface MetaCampaignDuplicateOperationItemDto {
  id: number
  copyIndex: number
  status: string
  metaAsyncBatchId?: string | null
  metaAsyncStatus?: string | null
  externalCampaignId?: string | null
  campaignId?: number | null
  campaignName: string
  failureSummary?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

export interface MetaCampaignDuplicateOperationLogDto {
  id: number
  step: string
  status: string
  attemptNumber: number
  action?: string | null
  resourcePath?: string | null
  httpStatusCode?: number | null
  metaErrorCode?: string | null
  metaErrorSubcode?: string | null
  metaErrorType?: string | null
  metaTraceId?: string | null
  summaryMessage?: string | null
  errorMessage?: string | null
  startedAt: string
  finishedAt?: string | null
  createdAt: string
}

export interface MetaCampaignDuplicateOperationDto {
  id: number
  sourceCampaignId: number
  sourceExternalCampaignId: string
  metaAdAccountRowId: number
  appRowId?: number | null
  status: string
  correlationId: string
  jobId?: string | null
  metaAsyncBatchId?: string | null
  metaAsyncStatus?: string | null
  newExternalCampaignId?: string | null
  newCampaignId?: number | null
  failureSummary?: string | null
  requestedCopies: number
  completedCopies: number
  failedCopies: number
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  items: MetaCampaignDuplicateOperationItemDto[]
  logs: MetaCampaignDuplicateOperationLogDto[]
}

export interface MetaCampaignDetailDto {
  id: number
  externalCampaignId: string
  name: string
  objective: string
  status: string
  effectiveStatus?: string | null
  buyingType?: string | null
  budgetStrategy?: string | null
  bidStrategy?: string | null
  isAdSetBudgetSharingEnabled?: boolean | null
  dailyBudget?: string | null
  lifetimeBudget?: string | null
  spendCap?: string | null
  specialAdCategories: string[]
  startTime?: string | null
  stopTime?: string | null
  issuesInfoSummary?: string | null
  recommendationsSummary?: string | null
  metaAdAccountRowId: number
  metaAdAccountId: string
  metaAdAccountName?: string | null
  businessId?: string | null
  businessName?: string | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  appIconUri?: string | null
  platform?: string | null
  isUnmapped: boolean
  isSyncStale: boolean
  source: string
  createdFromRequestId?: number | null
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
  adSets: MetaCampaignAdSetSummaryDto[]
  ads: MetaCampaignAdSummaryDto[]
  creatives: MetaCampaignCreativeSummaryDto[]
}
export interface SyncMetaCampaignsRequestDto {
  metaAdAccountIds?: number[] | null
}

export interface MetaCampaignSyncAccountResultDto {
  metaAdAccountRowId: number
  metaAdAccountId: string
  metaAdAccountName: string
  success: boolean
  message: string
  campaignsSynced: number
  adSetsSynced: number
  adsSynced: number
  creativesSynced: number
}

export interface SyncMetaCampaignsResultDto {
  accountsScanned: number
  campaignsSynced: number
  adSetsSynced: number
  adsSynced: number
  creativesSynced: number
  failedAccounts: number
  syncedAt: string
  messages: string[]
  accountResults: MetaCampaignSyncAccountResultDto[]
}
export interface MetaObjectivePresetDto {
  key: string
  label: string
  description: string
}

export interface MetaBidStrategyPresetDto {
  key: string
  label: string
  description: string
  metaUiLabel?: string | null
  contextualValueLabel?: string | null
}

export interface MetaPerformanceGoalTypeOptionDto {
  key: string
  label: string
  description: string
  isEnabled: boolean
  disabledReason?: string | null
}

export interface MetaPerformanceGoalOptionDto {
  key: string
  label: string
  description: string
  groupKey?: "STANDARD" | "CUSTOM" | null
  isCustom?: boolean | null
}

export interface CreateMetaAppCustomEventDto {
  eventKeyOrName: string
  displayName?: string | null
}

export interface MetaPerformanceGoalReferenceDto {
  appRowId: number
  goalTypes: MetaPerformanceGoalTypeOptionDto[]
  appEvents: MetaPerformanceGoalOptionDto[]
  valueTypes: MetaPerformanceGoalOptionDto[]
  valueOptimizationEligibilityStatus?: "eligible" | "ineligible" | "unknown" | null
  valueOptimizationDisabledReason?: string | null
  valueOptimizationCheckedAt?: string | null
  metaErrorCode?: number | null
  metaErrorSubcode?: number | null
  fbtraceId?: string | null
}
export interface MetaCampaignDraftDto {
  name: string
  objective: string
  buyingType?: string | null
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  bidStrategy?: string | null
  isAdSetBudgetSharingEnabled?: boolean | null
  specialAdCategories: string[]
}

export interface MetaCreateCampaignReferenceDto {
  adAccounts: MetaAdAccountDto[]
  appMappings: MetaAppMappingDto[]
  objectives: MetaObjectivePresetDto[]
  bidStrategies: MetaBidStrategyPresetDto[]
}



export interface MetaGeoCityTargetDto {
  key: string
  name: string
  region?: string | null
  regionId?: string | null
  countryCode?: string | null
  countryName?: string | null
  type?: string | null
}

export interface MetaAdSetDraftDto {
  name: string
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  billingEvent: string
  optimizationGoal: string
  performanceGoalType: string
  performanceGoalEventName?: string | null
  performanceGoalValueType?: string | null
  bidAmount?: number | null
  roasAverageFloor?: number | null
  advantageAudience: boolean
  startTime?: string | null
  endTime?: string | null
  geoMode?: MetaGeoMode | null
  countries: string[]
  regionKeys: string[]
  countryGroupIds: number[]
  cityTargets: MetaGeoCityTargetDto[]
  ageMin?: number | null
  ageMax?: number | null
  genders: string[]
  devicePlatforms: string[]
  userOs: string[]
  publisherPlatforms: string[]
  facebookPositions: string[]
  instagramPositions: string[]
}

export interface MetaCreativeMediaSourceDto {
  mode?: MetaCreativeMediaMode | null
  imageHash?: string | null
  imageUrl?: string | null
  videoId?: string | null
  uploadedAssetId?: number | null
}

export interface MetaCreativeCommonDraftDto {
  name: string
  pageId?: string | null
  instagramActorId?: string | null
}

export interface MetaSingleImageCreativeDraftDto {
  message?: string | null
  messages?: string[] | null
  headline?: string | null
  headlines?: string[] | null
  description?: string | null
  callToActionType?: string | null
  linkUrl?: string | null
  image?: MetaCreativeMediaSourceDto | null
}

export interface MetaSingleVideoCreativeDraftDto {
  message?: string | null
  messages?: string[] | null
  headline?: string | null
  headlines?: string[] | null
  description?: string | null
  callToActionType?: string | null
  linkUrl?: string | null
  video?: MetaCreativeMediaSourceDto | null
  thumbnail?: MetaCreativeMediaSourceDto | null
}

export interface MetaCarouselCardDraftDto {
  headline?: string | null
  description?: string | null
  linkUrl?: string | null
  image?: MetaCreativeMediaSourceDto | null
}

export interface MetaCarouselCreativeDraftDto {
  message?: string | null
  callToActionType?: string | null
  cards: MetaCarouselCardDraftDto[]
}

export interface MetaExistingPostCreativeDraftDto {
  sourcePostId?: string | null
}

export interface MetaFlexibleCreativeAssetDraftDto {
  assetType: "IMAGE" | "VIDEO"
  image?: MetaCreativeMediaSourceDto | null
  video?: MetaCreativeMediaSourceDto | null
  thumbnail?: MetaCreativeMediaSourceDto | null
}

export interface MetaFlexibleCreativeDraftDto {
  primaryTexts?: string[] | null
  headlines?: string[] | null
  callToActionType?: string | null
  linkUrl?: string | null
  assets: MetaFlexibleCreativeAssetDraftDto[]
}
export interface MetaCreativeDraftDto {
  type?: MetaCreativeType | null
  common?: MetaCreativeCommonDraftDto | null
  singleImage?: MetaSingleImageCreativeDraftDto | null
  singleVideo?: MetaSingleVideoCreativeDraftDto | null
  carousel?: MetaCarouselCreativeDraftDto | null
  existingPost?: MetaExistingPostCreativeDraftDto | null
  flexible?: MetaFlexibleCreativeDraftDto | null
  name?: string | null
  pageId?: string | null
  instagramActorId?: string | null
  message?: string | null
  headline?: string | null
  description?: string | null
  callToActionType?: string | null
  imageHash?: string | null
  imageUrl?: string | null
  linkUrl?: string | null
}

export interface MetaRequestAssetDto {
  id: number
  kind: "image" | "video" | string
  fileName: string
  contentType: string
  sizeBytes: number
  previewUrl: string
  createdAt: string
}

export interface MetaAdDraftDto {
  name: string
  status: string
  trackingSpecsJson?: string | null
}

export interface MetaAdVariantDto {
  sequenceNumber: number
  creative: MetaCreativeDraftDto
  ad: MetaAdDraftDto
}

export interface CreateMetaCampaignRequestDto {
  metaAdAccountId: number
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
  idempotencyKey?: string | null
  campaign: MetaCampaignDraftDto
  adSet: MetaAdSetDraftDto
  adVariants: MetaAdVariantDto[]
  // Legacy fields — kept for backward compat read of old payload_json
  creative?: MetaCreativeDraftDto | null
  ad?: MetaAdDraftDto | null
}

export interface UpdateMetaCampaignRequestDto {
  metaAdAccountId: number
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
  campaign: MetaCampaignDraftDto
  adSet: MetaAdSetDraftDto
  adVariants: MetaAdVariantDto[]
  // Legacy fields — kept for backward compat read of old payload_json
  creative?: MetaCreativeDraftDto | null
  ad?: MetaAdDraftDto | null
}

export interface ApproveMetaCampaignRequestDto {
  comment?: string | null
}

export interface RejectMetaCampaignRequestDto {
  reason?: string | null
}

export interface ExecuteMetaCampaignRequestDto {
  correlationId?: string | null
}

export interface MetaValidationResultDto {
  isValid: boolean
  errors: string[]
}

export interface MetaAdSetDraftValidationDto {
  isValid: boolean
  valueOptimizationEligibilityStatus: "eligible" | "ineligible" | "unknown"
  valueOptimizationDisabledReason?: string | null
  warning?: string | null
  checkedAt?: string | null
  errors: string[]
  metaErrorCode?: number | null
  metaErrorSubcode?: number | null
  fbtraceId?: string | null
}

export interface MetaOperationLogDto {
  id: number
  step: string
  status: string
  attemptNumber: number
  action?: string | null
  resourcePath?: string | null
  httpStatusCode?: number | null
  metaErrorCode?: string | null
  metaErrorSubcode?: string | null
  metaErrorType?: string | null
  metaTraceId?: string | null
  summaryMessage?: string | null
  requestJson?: string | null
  responseJson?: string | null
  errorMessage?: string | null
  correlationId?: string | null
  startedAt: string
  finishedAt?: string | null
}

export interface MetaCreatedObjectDto {
  entityType: string
  localId: number
  externalId: string
  name: string
  status: string
}

export interface MetaCampaignRequestListItemDto {
  id: number
  campaignName: string
  objective: string
  status: MetaRequestStatus
  metaAdAccountId: number
  metaAdAccountName?: string | null
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

export interface MetaCampaignRequestDetailDto {
  id: number
  campaignName: string
  objective: string
  status: MetaRequestStatus
  metaAdAccountId: number
  metaAdAccountName?: string | null
  appRowId?: number | null
  paidMediaAppBindingId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  metaAppMappingId?: number | null
  idempotencyKey: string
  validationErrorsJson?: string | null
  failureSummary?: string | null
  correlationId?: string | null
  requestedBy: string
  approvedBy?: string | null
  rejectedBy?: string | null
  executedBy?: string | null
  createdAt: string
  updatedAt: string
  submittedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  executedAt?: string | null
  failedAt?: string | null
  payload: CreateMetaCampaignRequestDto
  operationLogs: MetaOperationLogDto[]
  createdObjects: MetaCreatedObjectDto[]
}



export interface MetaFacebookPageReferenceDto {
  id: string
  name: string
  category?: string | null
  accessStatus?: string | null
  pictureUrl?: string | null
}

export interface MetaFacebookPageProfileDto {
  pageId: string
  profileId: string | null
  profileUrl: string | null
}

export interface MetaFacebookPostReferenceDto {
  id: string
  message?: string | null
  story?: string | null
  permalinkUrl?: string | null
  fullPictureUrl?: string | null
  createdTime?: string | null
  type?: string | null
  statusType?: string | null
  isPublished?: boolean | null
}

export interface MetaFacebookPostReferencePageDto {
  items: MetaFacebookPostReferenceDto[]
  nextCursor?: string | null
  hasMore: boolean
}

export interface MetaFacebookPostReferenceQueryDto {
  [key: string]: string | number | undefined
  q?: string
  after?: string
  limit?: number
}
export interface MetaReferenceMediaDto {
  id: string
  assetType: "IMAGE" | "VIDEO"
  hash?: string | null
  videoId?: string | null
  name?: string | null
  thumbnailUrl?: string | null
  playableUrl?: string | null
  playableUrlExpiresAt?: string | null
  width?: number | null
  height?: number | null
  createdTime?: string | null
  requiresAuth?: boolean
}

export interface MetaReferenceMediaPageDto {
  items: MetaReferenceMediaDto[]
  nextCursor?: string | null
  hasMore: boolean
}

export interface MetaReferenceMediaQueryDto {
  [key: string]: string | number | undefined
  q?: string
  after?: string
  limit?: number
  sort?: string
  dateFrom?: string
  dateTo?: string
}

export interface MetaGeoRegionDto {
  key: string
  label: string
  countryCount: number
}

export interface GeoCountryGroupDto {
  id: number
  name: string
  description?: string | null
  countryCodes: string[]
  countryCount: number
  isActive: boolean
}

export interface UpsertGeoCountryGroupDto {
  name: string
  description?: string | null
  countryCodes: string[]
}

export interface MetaGeoCityReferenceDto extends MetaGeoCityTargetDto {}

export interface MetaExecuteResponseDto {
  success: boolean
  message?: string | null
  correlationId?: string | null
  detail: MetaCampaignRequestDetailDto
}

export interface MetaRequestAssetSelectionState {
  mode: MetaCreativeMediaMode
  metaRefSource: "manual" | "from_meta"
  imageHash: string
  imageUrl: string
  videoId: string
  uploadedAssetId: number | null
  uploadedAssetName: string
  uploadedAssetPreviewUrl: string
  metaPreviewUrl: string
  metaPreviewRequiresAuth: boolean
  metaPlayableUrl: string
  metaAssetId: string
  metaAssetName: string
  metaAssetType: "IMAGE" | "VIDEO" | ""
  metaAdAccountId: string
}

export interface MetaCarouselCardFormState {
  id: string
  headline: string
  description: string
  linkUrl: string
  image: MetaRequestAssetSelectionState
}

export interface MetaFlexibleAssetFormState {
  id: string
  assetType: "IMAGE" | "VIDEO"
  image: MetaRequestAssetSelectionState
  video: MetaRequestAssetSelectionState
  thumbnail: MetaRequestAssetSelectionState
}
export interface AdVariantFormState {
  // Stable key used for retry idempotency (1-based, auto-incremented)
  sequenceNumber: number
  creativeType: MetaCreativeType
  creativeName: string
  facebookPageId: string
  instagramActorId: string
  singleImagePrimaryText: string
  singleImagePrimaryTexts: string[]
  singleImageHeadline: string
  singleImageHeadlines: string[]
  singleImageDescription: string
  singleImageCallToAction: string
  singleImageLinkUrl: string
  singleImageImage: MetaRequestAssetSelectionState
  singleVideoPrimaryText: string
  singleVideoPrimaryTexts: string[]
  singleVideoHeadline: string
  singleVideoHeadlines: string[]
  singleVideoDescription: string
  singleVideoCallToAction: string
  singleVideoLinkUrl: string
  singleVideoVideo: MetaRequestAssetSelectionState
  singleVideoThumbnail: MetaRequestAssetSelectionState
  carouselPrimaryText: string
  carouselCallToAction: string
  carouselCards: MetaCarouselCardFormState[]
  flexiblePrimaryTexts: string[]
  flexibleHeadlines: string[]
  flexibleCallToAction: string
  flexibleLinkUrl: string
  flexibleAssets: MetaFlexibleAssetFormState[]
  existingPostId: string
  adName: string
  trackingSpecs: string
}

export interface MetaRequestFormState {
  adAccountId: string
  appRowId: string
  paidMediaAppBindingId: string
  objective: string
  budgetStrategy: "CBO" | "ABO"
  campaignName: string
  buyingType: string
  campaignObjective: string
  specialAdCategories: string[]
  bidStrategy: string
  isAdSetBudgetSharingEnabled: boolean
  campaignDailyBudget: string
  campaignLifetimeBudget: string
  adSetName: string
  geoMode: MetaGeoMode
  countries: string[]
  regionKeys: string[]
  countryGroupIds: number[]
  cityTargets: MetaGeoCityTargetDto[]
  ageMin: number
  ageMax: number
  gender: string
  placementMode: "AUTOMATIC" | "MANUAL"
  publisherPlatforms: string[]
  facebookPositions: string[]
  instagramPositions: string[]
  adSetDailyBudget: string
  adSetLifetimeBudget: string
  billingEvent: string
  optimizationGoal: string
  performanceGoalType: string
  performanceGoalEventName: string
  performanceGoalValueType: string
  bidAmount: string
  roasAverageFloor: string
  advantageAudience: boolean
  startTime: string
  endTime: string
  creativeType: MetaCreativeType
  creativeName: string
  facebookPageId: string
  instagramActorId: string
  singleImagePrimaryText: string
  singleImagePrimaryTexts: string[]
  singleImageHeadline: string
  singleImageHeadlines: string[]
  singleImageDescription: string
  singleImageCallToAction: string
  singleImageLinkUrl: string
  singleImageImage: MetaRequestAssetSelectionState
  singleVideoPrimaryText: string
  singleVideoPrimaryTexts: string[]
  singleVideoHeadline: string
  singleVideoHeadlines: string[]
  singleVideoDescription: string
  singleVideoCallToAction: string
  singleVideoLinkUrl: string
  singleVideoVideo: MetaRequestAssetSelectionState
  singleVideoThumbnail: MetaRequestAssetSelectionState
  carouselPrimaryText: string
  carouselCallToAction: string
  carouselCards: MetaCarouselCardFormState[]
  flexiblePrimaryTexts: string[]
  flexibleHeadlines: string[]
  flexibleCallToAction: string
  flexibleLinkUrl: string
  flexibleAssets: MetaFlexibleAssetFormState[]
  existingPostId: string
  adName: string
  trackingSpecs: string
  // Additional ad variants (variant 2, 3, ...). Variant 1 is represented by the flat creative/ad fields above.
  additionalVariants: AdVariantFormState[]
}

export interface MetaRequestFilters {
  status?: string
  appRowId?: number
  metaAdAccountId?: number
  search?: string
}

export type GroupedValidationErrors = Record<string, string[]>


export interface MetaInsightsOverviewDto {
  totalSpend: number
  totalInstalls: number
  totalClicks: number
  totalImpressions: number
  totalReach: number
  totalRevenue: number
  totalRevenueD7: number
  totalRevenueD30: number
  avgCpi: number
  avgCpc: number
  avgCpm: number
  avgCtr: number
  avgFrequency: number
  avgRoas: number
  avgRoasD7: number
  avgRoasD30: number
  totalCampaigns: number
  prevSpend: number
  prevInstalls: number
  prevClicks: number
  prevImpressions: number
  prevReach: number
  prevRevenue: number
  prevRevenueD7: number
  prevRevenueD30: number
  prevRoas: number
  prevRoasD7: number
  prevRoasD30: number
}

export interface MetaInsightsDailyDto {
  date: string
  spend: number
  installs: number
  clicks: number
  impressions: number
  reach: number
  cpi: number
  cpc: number
  cpm: number
  ctr: number
  revenue: number | null
  roas: number | null
  roasD7: number | null
  roasD30: number | null
}

export interface MetaCampaignBreakdownDto {
  campaignRowId: number | null
  campaignId: string
  campaignName: string
  accountId: string
  appId: string
  spend: number
  installs: number
  clicks: number
  impressions: number
  reach: number
  cpi: number
  cpc: number
  cpm: number
  ctr: number
  frequency: number
  revenue: number | null
  revenueD7: number | null
  revenueD30: number | null
  roas: number | null
  roasD7: number | null
  roasD30: number | null
}

export interface MetaCampaignBreakdownPageDto {
  items: MetaCampaignBreakdownDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface MetaInsightsFilterOptionDto {
  value: string
  label: string
}

export interface MetaInsightsFiltersResponseDto {
  accounts: MetaInsightsFilterOptionDto[]
  campaigns: MetaInsightsFilterOptionDto[]
  countries: MetaInsightsFilterOptionDto[]
}


