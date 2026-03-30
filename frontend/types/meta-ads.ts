export type MetaRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed"

export interface MetaIntegrationDto {
  id: number
  displayName: string
  authMode: string
  isProductionSafe: boolean
  productionUsageMessage?: string | null
  metaBusinessId?: string | null
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
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateMetaIntegrationRequestDto {
  displayName: string
  authMode: string
  metaBusinessId?: string | null
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
  appRowId: number
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
  metaApplicationId: string
  objectStoreUrl?: string | null
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateMetaAppMappingRequestDto {
  appRowId: number
  metaApplicationId: string
  objectStoreUrl?: string | null
  packageNameOverride?: string | null
  bundleIdOverride?: string | null
  deepLinkUrlOverride?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
}

export interface UpdateMetaAppMappingRequestDto {
  metaApplicationId?: string | null
  objectStoreUrl?: string | null
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

export interface MetaObjectivePresetDto {
  key: string
  label: string
  description: string
}

export interface MetaBidStrategyPresetDto {
  key: string
  label: string
  description: string
}

export interface MetaCampaignDraftDto {
  name: string
  objective: string
  buyingType?: string | null
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  bidStrategy?: string | null
  specialAdCategories: string[]
}

export interface MetaAdSetDraftDto {
  name: string
  dailyBudget?: number | null
  lifetimeBudget?: number | null
  billingEvent: string
  optimizationGoal: string
  bidAmount?: number | null
  startTime?: string | null
  endTime?: string | null
  countries: string[]
  ageMin?: number | null
  ageMax?: number | null
  genders: string[]
  devicePlatforms: string[]
  userOs: string[]
  publisherPlatforms: string[]
  facebookPositions: string[]
  instagramPositions: string[]
}

export interface MetaCreativeDraftDto {
  name: string
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

export interface MetaAdDraftDto {
  name: string
  status: string
  trackingSpecsJson?: string | null
}

export interface CreateMetaCampaignRequestDto {
  metaAdAccountId: number
  appRowId: number
  idempotencyKey?: string | null
  campaign: MetaCampaignDraftDto
  adSet: MetaAdSetDraftDto
  creative: MetaCreativeDraftDto
  ad: MetaAdDraftDto
}

export interface UpdateMetaCampaignRequestDto {
  metaAdAccountId: number
  appRowId: number
  campaign: MetaCampaignDraftDto
  adSet: MetaAdSetDraftDto
  creative: MetaCreativeDraftDto
  ad: MetaAdDraftDto
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

export interface MetaOperationLogDto {
  id: number
  step: string
  status: string
  attemptNumber: number
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

export interface MetaCampaignRequestDetailDto {
  id: number
  campaignName: string
  objective: string
  status: MetaRequestStatus
  metaAdAccountId: number
  metaAdAccountName?: string | null
  appRowId: number
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

export interface MetaCreateCampaignReferenceDto {
  adAccounts: MetaAdAccountDto[]
  appMappings: MetaAppMappingDto[]
  objectives: MetaObjectivePresetDto[]
  bidStrategies: MetaBidStrategyPresetDto[]
}

export interface MetaExecuteResponseDto {
  success: boolean
  message?: string | null
  correlationId?: string | null
  detail: MetaCampaignRequestDetailDto
}

export interface MetaRequestFormState {
  adAccountId: string
  appRowId: string
  objective: string
  budgetStrategy: "CBO" | "ABO"
  campaignName: string
  buyingType: string
  campaignObjective: string
  specialAdCategories: string[]
  bidStrategy: string
  campaignDailyBudget: string
  campaignLifetimeBudget: string
  adSetName: string
  countries: string[]
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
  bidAmount: string
  startTime: string
  endTime: string
  creativeName: string
  facebookPageId: string
  instagramActorId: string
  primaryText: string
  headline: string
  description: string
  callToAction: string
  imageHash: string
  imageUrl: string
  linkUrl: string
  adName: string
  trackingSpecs: string
}

export interface MetaRequestFilters {
  status?: string
  appRowId?: number
  metaAdAccountId?: number
  search?: string
}

export type GroupedValidationErrors = Record<string, string[]>
