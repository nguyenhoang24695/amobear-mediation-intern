import { apiClient } from "./client"
import type {
  ApproveMetaCampaignRequestDto,
  CreateMetaAppCustomEventDto,
  CreateMetaAppMappingRequestDto,
  CreateMetaCampaignRequestDto,
  CreateMetaIntegrationRequestDto,
  ExecuteMetaCampaignRequestDto,
  MetaAdAccountDto,
  MetaAdSetDraftValidationDto,
  MetaAppMappingCandidateDto,
  MetaAppMappingCandidateQueryDto,
  MetaAppMappingDiscoveryRequestDto,
  MetaAppMappingDiscoveryResultDto,
  MetaAppMappingDto,
  MetaAuthorizeUrlResponseDto,
  MetaCampaignDetailDto,
  MetaCampaignDuplicateOperationDto,
  MetaCampaignDuplicateReadinessResultDto,
  MetaCampaignDuplicateRequestDto,
  MetaCampaignDuplicateStartResponseDto,
  MetaCampaignPreviewDto,
  MetaCampaignListResponseDto,
  MetaCampaignStatusUpdateResultDto,
  MetaCampaignRequestDetailDto,
  MetaCampaignRequestListItemDto,
  MetaCampaignBreakdownPageDto,
  MetaInsightsDailyDto,
  MetaInsightsFiltersResponseDto,
  MetaInsightsOverviewDto,
  MetaRequestAssetDto,
  MetaCreateCampaignReferenceDto,
  MetaExecuteResponseDto,
  MetaFacebookPageReferenceDto,
  MetaFacebookPostReferencePageDto,
  MetaFacebookPostReferenceQueryDto,
  MetaGeoCityReferenceDto,
  GeoCountryGroupDto,
  MetaGeoRegionDto,
  MetaReferenceMediaPageDto,
  MetaReferenceMediaQueryDto,
  MetaIntegrationDto,
  MetaIntegrationTestRequestDto,
  MetaIntegrationTestResultDto,
  MetaPerformanceGoalOptionDto,
  MetaPerformanceGoalReferenceDto,
  MetaTokenStatusDto,
  MetaValidationResultDto,
  RejectMetaCampaignRequestDto,
  ResolveMetaAppMappingCandidateRequestDto,
  SyncMetaCampaignsRequestDto,
  SyncMetaCampaignsResultDto,
  UpdateMetaAppMappingRequestDto,
  UpdateMetaCampaignRequestDto,
  UpdateMetaIntegrationRequestDto,
  UpsertGeoCountryGroupDto,
  UpsertMetaAdAccountRequestDto,
} from "@/types/meta-ads"

const AUTH_PREFIX = "/api/v1/meta-auth"
const ACCOUNTS_PREFIX = "/api/v1/meta-accounts"
const REFERENCE_PREFIX = "/api/v1/meta-reference"
const REQUESTS_PREFIX = "/api/v1/meta-campaign-requests"
const CAMPAIGNS_PREFIX = "/api/v1/meta-campaigns"
const INSIGHTS_PREFIX = "/api/v1/meta-insights"

export const metaRequestsApi = {
  list: async (params?: { status?: string; appRowId?: number; metaAdAccountId?: number }) => {
    return apiClient.get<MetaCampaignRequestListItemDto[]>(REQUESTS_PREFIX, params)
  },

  getById: async (id: number) => {
    return apiClient.get<MetaCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}`)
  },

  create: async (request: CreateMetaCampaignRequestDto) => {
    return apiClient.post<MetaCampaignRequestDetailDto>(REQUESTS_PREFIX, request)
  },

  update: async (id: number, request: UpdateMetaCampaignRequestDto) => {
    return apiClient.put<MetaCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}`, request)
  },

  validate: async (id: number) => {
    return apiClient.post<MetaValidationResultDto>(`${REQUESTS_PREFIX}/${id}/validate`, {})
  },

  submit: async (id: number) => {
    return apiClient.post<MetaCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/submit`, {})
  },

  approve: async (id: number, request: ApproveMetaCampaignRequestDto) => {
    return apiClient.post<MetaCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/approve`, request)
  },

  reject: async (id: number, request: RejectMetaCampaignRequestDto) => {
    return apiClient.post<MetaCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/reject`, request)
  },

  execute: async (id: number, request: ExecuteMetaCampaignRequestDto) => {
    return apiClient.post<MetaExecuteResponseDto>(`${REQUESTS_PREFIX}/${id}/execute`, request)
  },

  retry: async (id: number, request: ExecuteMetaCampaignRequestDto) => {
    return apiClient.post<MetaExecuteResponseDto>(`${REQUESTS_PREFIX}/${id}/retry`, request)
  },

  uploadAsset: async (file: File, kind: "image" | "video") => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("kind", kind)
    return apiClient.post<MetaRequestAssetDto>(`${REQUESTS_PREFIX}/assets`, formData)
  },

  getAsset: async (id: number) => {
    return apiClient.get<MetaRequestAssetDto>(`${REQUESTS_PREFIX}/assets/${id}`)
  },
}

export const metaCampaignsApi = {
  list: async (params?: {
    search?: string
    metaAdAccountId?: number
    appRowId?: number
    objective?: string
    effectiveStatus?: string
    quickFilter?: string
    syncFreshness?: string
    page?: number
    pageSize?: number
  }) => {
    return apiClient.get<MetaCampaignListResponseDto>(CAMPAIGNS_PREFIX, params)
  },

  getById: async (id: number) => {
    return apiClient.get<MetaCampaignDetailDto>(`${CAMPAIGNS_PREFIX}/${id}`)
  },

  sync: async (request?: SyncMetaCampaignsRequestDto) => {
    return apiClient.post<SyncMetaCampaignsResultDto>(`${CAMPAIGNS_PREFIX}/sync`, request ?? {})
  },

  syncOne: async (id: number) => {
    return apiClient.post<SyncMetaCampaignsResultDto>(`${CAMPAIGNS_PREFIX}/${id}/sync`, {})
  },

  pause: async (id: number) => {
    return apiClient.post<MetaCampaignStatusUpdateResultDto>(`${CAMPAIGNS_PREFIX}/${id}/pause`, {})
  },

  resume: async (id: number) => {
    return apiClient.post<MetaCampaignStatusUpdateResultDto>(`${CAMPAIGNS_PREFIX}/${id}/resume`, {})
  },

  duplicate: async (id: number, request?: MetaCampaignDuplicateRequestDto) => {
    return apiClient.post<MetaCampaignDuplicateStartResponseDto>(`${CAMPAIGNS_PREFIX}/${id}/duplicate`, request ?? { deepCopy: true })
  },

  checkDuplicateReadiness: async (id: number) => {
    return apiClient.post<MetaCampaignDuplicateReadinessResultDto>(`${CAMPAIGNS_PREFIX}/${id}/duplicate-readiness-check`, {})
  },

  getDuplicateOperation: async (operationId: number) => {
    return apiClient.get<MetaCampaignDuplicateOperationDto>(`${CAMPAIGNS_PREFIX}/duplicate-operations/${operationId}`)
  },

  previewAd: async (campaignId: number, adId: number) => {
    return apiClient.get<MetaCampaignPreviewDto>(`${CAMPAIGNS_PREFIX}/${campaignId}/ads/${adId}/preview`)
  },
}

export const metaReferenceApi = {
  getCreateCampaignReference: async () => {
    return apiClient.get<MetaCreateCampaignReferenceDto>(`${REFERENCE_PREFIX}/create-campaign`)
  },

  getAdAccountAppMappings: async (adAccountId: number) => {
    return apiClient.get<MetaAppMappingDto[]>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/app-mappings`)
  },

  getAdAccountFacebookPages: async (adAccountId: number, source: "promote_pages" | "access_token_all" = "promote_pages") => {
    return apiClient.get<MetaFacebookPageReferenceDto[]>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/facebook-pages`, { source })
  },

  getFacebookPagePosts: async (adAccountId: number, pageId: string, query?: MetaFacebookPostReferenceQueryDto) => {
    return apiClient.get<MetaFacebookPostReferencePageDto>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/facebook-pages/${encodeURIComponent(pageId)}/posts`, query)
  },

  getAdAccountImages: async (adAccountId: number, query?: MetaReferenceMediaQueryDto) => {
    return apiClient.get<MetaReferenceMediaPageDto>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/images`, query)
  },

  getAdAccountVideos: async (adAccountId: number, query?: MetaReferenceMediaQueryDto) => {
    return apiClient.get<MetaReferenceMediaPageDto>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/videos`, query)
  },

  getGeoRegions: async () => {
    return apiClient.get<MetaGeoRegionDto[]>(`${REFERENCE_PREFIX}/geo/regions`)
  },

  getGeoCountryGroups: async () => {
    return apiClient.get<GeoCountryGroupDto[]>(`${REFERENCE_PREFIX}/geo/country-groups`)
  },

  createGeoCountryGroup: async (request: UpsertGeoCountryGroupDto) => {
    return apiClient.post<GeoCountryGroupDto>(`${REFERENCE_PREFIX}/geo/country-groups`, request)
  },

  updateGeoCountryGroup: async (id: number, request: UpsertGeoCountryGroupDto) => {
    return apiClient.put<GeoCountryGroupDto>(`${REFERENCE_PREFIX}/geo/country-groups/${id}`, request)
  },

  deleteGeoCountryGroup: async (id: number) => {
    return apiClient.delete<void>(`${REFERENCE_PREFIX}/geo/country-groups/${id}`)
  },

  searchGeoCities: async (metaAdAccountId: number, q: string) => {
    return apiClient.get<MetaGeoCityReferenceDto[]>(`${REFERENCE_PREFIX}/geo/cities`, { metaAdAccountId, q })
  },

  getAppPerformanceGoals: async (appRowId: number, metaAdAccountId?: number | null, paidMediaAppBindingId?: number | null) => {
    return apiClient.get<MetaPerformanceGoalReferenceDto>(
      `${REFERENCE_PREFIX}/apps/${appRowId}/performance-goals`,
      {
        ...(metaAdAccountId && Number.isFinite(metaAdAccountId) ? { metaAdAccountId } : {}),
        ...(paidMediaAppBindingId && Number.isFinite(paidMediaAppBindingId) ? { paidMediaAppBindingId } : {}),
      },
    )
  },

  createAppCustomEvent: async (appRowId: number, request: CreateMetaAppCustomEventDto) => {
    return apiClient.post<MetaPerformanceGoalOptionDto>(`${REFERENCE_PREFIX}/apps/${appRowId}/performance-goals/custom-events`, request)
  },

  validateAdSetDraft: async (request: CreateMetaCampaignRequestDto) => {
    return apiClient.post<MetaAdSetDraftValidationDto>(`${REFERENCE_PREFIX}/adsets/validate-draft`, request)
  },
}

export const metaIntegrationsApi = {
  list: async () => {
    return apiClient.get<MetaIntegrationDto[]>(`${ACCOUNTS_PREFIX}/integrations`)
  },

  create: async (request: CreateMetaIntegrationRequestDto) => {
    return apiClient.post<MetaIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations`, request)
  },

  update: async (id: number, request: UpdateMetaIntegrationRequestDto) => {
    return apiClient.put<MetaIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}`, request)
  },

  enable: async (id: number) => {
    return apiClient.post<MetaIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}/enable`, {})
  },

  disable: async (id: number) => {
    return apiClient.post<MetaIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}/disable`, {})
  },

  syncAdAccounts: async (id: number) => {
    return apiClient.post<MetaAdAccountDto[]>(`${ACCOUNTS_PREFIX}/integrations/${id}/sync-ad-accounts`, {})
  },

  getAuthorizeUrl: async (integrationId: number, redirectUri: string, state?: string) => {
    return apiClient.get<MetaAuthorizeUrlResponseDto>(`${AUTH_PREFIX}/integrations/${integrationId}/authorize-url`, {
      redirectUri,
      state,
    })
  },

  exchangeCode: async (integrationId: number, code: string, redirectUri: string) => {
    return apiClient.post<MetaTokenStatusDto>(`${AUTH_PREFIX}/integrations/${integrationId}/callback`, {
      code,
      redirectUri,
    })
  },

  test: async (request: MetaIntegrationTestRequestDto) => {
    return apiClient.post<MetaIntegrationTestResultDto>(`${AUTH_PREFIX}/integrations/test`, request)
  },

  testSaved: async (integrationId: number) => {
    return apiClient.post<MetaIntegrationTestResultDto>(`${AUTH_PREFIX}/integrations/${integrationId}/test`, {})
  },

  getTokenStatus: async (integrationId: number) => {
    return apiClient.get<MetaTokenStatusDto>(`${AUTH_PREFIX}/integrations/${integrationId}/token-status`)
  },
}

export const metaAdAccountsApi = {
  list: async () => {
    return apiClient.get<MetaAdAccountDto[]>(`${ACCOUNTS_PREFIX}/ad-accounts`)
  },

  create: async (request: UpsertMetaAdAccountRequestDto) => {
    return apiClient.post<MetaAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts`, request)
  },

  update: async (id: number, request: UpsertMetaAdAccountRequestDto) => {
    return apiClient.put<MetaAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}`, request)
  },

  enable: async (id: number) => {
    return apiClient.post<MetaAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}/enable`, {})
  },

  disable: async (id: number) => {
    return apiClient.post<MetaAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}/disable`, {})
  },
}

export const metaAppMappingsApi = {
  list: async () => {
    return apiClient.get<MetaAppMappingDto[]>(`${ACCOUNTS_PREFIX}/store-app-mappings`)
  },

  listCandidates: async (query?: MetaAppMappingCandidateQueryDto) => {
    return apiClient.get<MetaAppMappingCandidateDto[]>(`${ACCOUNTS_PREFIX}/app-mappings/candidates`, query
      ? {
          search: query.search,
          platform: query.platform,
          reviewStatus: query.reviewStatus,
          matchQuality: query.matchQuality,
        }
      : undefined)
  },

  discover: async (request?: MetaAppMappingDiscoveryRequestDto) => {
    return apiClient.post<MetaAppMappingDiscoveryResultDto>(`${ACCOUNTS_PREFIX}/app-mappings/discover`, request ?? {})
  },

  resolveCandidate: async (id: number, request: ResolveMetaAppMappingCandidateRequestDto) => {
    return apiClient.post<MetaAppMappingCandidateDto>(`${ACCOUNTS_PREFIX}/app-mappings/candidates/${id}/resolve`, request)
  },

  create: async (request: CreateMetaAppMappingRequestDto) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/store-app-mappings`, request)
  },

  update: async (id: number, request: UpdateMetaAppMappingRequestDto) => {
    return apiClient.put<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/store-app-mappings/${id}`, request)
  },

  enable: async (id: number) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/store-app-mappings/${id}/enable`, {})
  },

  disable: async (id: number) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/store-app-mappings/${id}/disable`, {})
  },
}

export const metaInsightsApi = {
  getOverview: async (params: {
    startDate: string
    endDate: string
    accountId?: string
    campaignId?: string
    country?: string
  }) => {
    return apiClient.get<MetaInsightsOverviewDto>(`${INSIGHTS_PREFIX}/overview`, params)
  },

  getDaily: async (params: {
    startDate: string
    endDate: string
    accountId?: string
    campaignId?: string
    country?: string
  }) => {
    return apiClient.get<MetaInsightsDailyDto[]>(`${INSIGHTS_PREFIX}/daily`, params)
  },

  getCampaigns: async (params: {
    startDate: string
    endDate: string
    accountId?: string
    campaignId?: string
    country?: string
    sortBy?: string
    sortDir?: "asc" | "desc"
    page?: number
    pageSize?: number
    search?: string
  }) => {
    return apiClient.get<MetaCampaignBreakdownPageDto>(`${INSIGHTS_PREFIX}/campaigns`, params)
  },

  getFilters: async (params: {
    startDate: string
    endDate: string
    accountId?: string
    campaignId?: string
    country?: string
  }) => {
    return apiClient.get<MetaInsightsFiltersResponseDto>(`${INSIGHTS_PREFIX}/filters`, params)
  },
}








