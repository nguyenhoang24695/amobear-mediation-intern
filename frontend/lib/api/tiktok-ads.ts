import { apiClient } from "./client"
import type {
  TikTokCampaignPerformancePageDto,
  TikTokCampaignDetailDto,
  TikTokCampaignListResponseDto,
  TikTokCampaignRequestDetailDto,
  TikTokCampaignRequestListItemDto,
  TikTokDashboardDailyDto,
  TikTokDashboardFiltersResponseDto,
  TikTokDashboardOverviewDto,
  TikTokExecutionResultDto,
  TikTokIntegrationDto,
  TikTokAuthorizeUrlResponseDto,
  TikTokIntegrationTestRequestDto,
  TikTokIntegrationTestResultDto,
  TikTokIdentityOptionDto,
  TikTokAdAccountDto,
  TikTokAdAccountFilterOptionsDto,
  TikTokAdAccountPageDto,
  TikTokAppMappingDto,
  TikTokAppMappingCandidateDto,
  TikTokAppMappingCandidateQueryDto,
  TikTokReferenceResponseDto,
  TikTokRequestAssetDto,
  TikTokTargetingOptionsResponseDto,
  TikTokTokenStatusDto,
  TikTokValidationResultDto,
  CreateTikTokAppMappingRequestDto,
  CreateTikTokCampaignRequestDto,
  CreateTikTokIntegrationRequestDto,
  TikTokInstallDiscrepancyDto,
  UpdateTikTokCampaignRequestDto,
  UpdateTikTokIntegrationRequestDto,
  UpsertTikTokAdAccountRequestDto,
  ResolveTikTokAppMappingCandidateRequestDto,
  SyncTikTokCampaignsRequestDto,
  TikTokSyncResultDto,
} from "@/types/tiktok-ads"

const DASHBOARD_PREFIX = "/api/v1/tiktok-dashboard"
const ACCOUNTS_PREFIX = "/api/v1/tiktok-accounts"
const AUTH_PREFIX = "/api/v1/tiktok-auth"
const REQUESTS_PREFIX = "/api/v1/tiktok-campaign-requests"
const CAMPAIGNS_PREFIX = "/api/v1/tiktok-campaigns"

export const tiktokDashboardApi = {
  getOverview: async (params: {
    startDate: string
    endDate: string
    advertiserId?: string
    campaignId?: string
  }) => apiClient.get<TikTokDashboardOverviewDto>(`${DASHBOARD_PREFIX}/overview`, params),

  getDaily: async (params: {
    startDate: string
    endDate: string
    advertiserId?: string
    campaignId?: string
  }) => apiClient.get<TikTokDashboardDailyDto[]>(`${DASHBOARD_PREFIX}/daily`, params),

  getCampaigns: async (params: {
    startDate: string
    endDate: string
    advertiserId?: string
    campaignId?: string
    search?: string
    sortBy?: "spend" | "installs" | "cpi" | "roas"
    sortDir?: "asc" | "desc"
    page?: number
    pageSize?: number
  }) => apiClient.get<TikTokCampaignPerformancePageDto>(`${DASHBOARD_PREFIX}/campaigns`, params),

  getDiscrepancy: async (params: {
    startDate: string
    endDate: string
    advertiserId?: string
    campaignId?: string
  }) => apiClient.get<TikTokInstallDiscrepancyDto[]>(`${DASHBOARD_PREFIX}/discrepancy`, params),

  getFilters: async (params: {
    startDate: string
    endDate: string
    advertiserId?: string
    campaignId?: string
  }) => apiClient.get<TikTokDashboardFiltersResponseDto>(`${DASHBOARD_PREFIX}/filters`, params),
}

export const tiktokAccountsApi = {
  getIntegrations: async () => apiClient.get<TikTokIntegrationDto[]>(`${ACCOUNTS_PREFIX}/integrations`),
  createIntegration: async (data: CreateTikTokIntegrationRequestDto) => apiClient.post<TikTokIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations`, data),
  updateIntegration: async (id: number, data: UpdateTikTokIntegrationRequestDto) => apiClient.put<TikTokIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}`, data),
  enableIntegration: async (id: number) => apiClient.post<TikTokIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}/enable`),
  disableIntegration: async (id: number) => apiClient.post<TikTokIntegrationDto>(`${ACCOUNTS_PREFIX}/integrations/${id}/disable`),
  syncAdAccounts: async (id: number) => apiClient.post<TikTokAdAccountDto[]>(`${ACCOUNTS_PREFIX}/integrations/${id}/sync-ad-accounts`),
  getAdAccounts: async (params?: {
    page?: number
    pageSize?: number
    name?: string
    advertiserId?: string
    country?: string
  }) => apiClient.get<TikTokAdAccountPageDto>(`${ACCOUNTS_PREFIX}/ad-accounts`, params),
  getAdAccountFilterOptions: async (params?: { search?: string }) =>
    apiClient.get<TikTokAdAccountFilterOptionsDto>(`${ACCOUNTS_PREFIX}/ad-accounts/filter-options`, params),
  createAdAccount: async (data: UpsertTikTokAdAccountRequestDto) => apiClient.post<TikTokAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts`, data),
  updateAdAccount: async (id: number, data: UpsertTikTokAdAccountRequestDto) => apiClient.put<TikTokAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}`, data),
  enableAdAccount: async (id: number) => apiClient.post<TikTokAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}/enable`),
  disableAdAccount: async (id: number) => apiClient.post<TikTokAdAccountDto>(`${ACCOUNTS_PREFIX}/ad-accounts/${id}/disable`),
  getAppMappings: async () => apiClient.get<TikTokAppMappingDto[]>(`${ACCOUNTS_PREFIX}/app-mappings`),
  createAppMapping: async (data: CreateTikTokAppMappingRequestDto) => apiClient.post<TikTokAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings`, data),
  updateAppMapping: async (id: number, data: CreateTikTokAppMappingRequestDto) => apiClient.put<TikTokAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}`, data),
  enableAppMapping: async (id: number) => apiClient.post<TikTokAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}/enable`),
  disableAppMapping: async (id: number) => apiClient.post<TikTokAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}/disable`),
  listAppMappingCandidates: async (query?: TikTokAppMappingCandidateQueryDto) =>
    apiClient.get<TikTokAppMappingCandidateDto[]>(`${ACCOUNTS_PREFIX}/app-mappings/candidates`, query as Record<string, string | number | undefined> | undefined),
  resolveAppMappingCandidate: async (id: number, data: ResolveTikTokAppMappingCandidateRequestDto) =>
    apiClient.post<TikTokAppMappingCandidateDto>(`${ACCOUNTS_PREFIX}/app-mappings/candidates/${id}/resolve`, data),
}

export const tiktokAuthApi = {
  getAuthorizeUrl: async (integrationId: number, redirectUri: string, state?: string) =>
    apiClient.get<TikTokAuthorizeUrlResponseDto>(`${AUTH_PREFIX}/integrations/${integrationId}/authorize-url`, { redirectUri, state }),
  callback: async (integrationId: number, data: { code: string; redirectUri: string }) =>
    apiClient.post<TikTokTokenStatusDto>(`${AUTH_PREFIX}/integrations/${integrationId}/callback`, data),
  testDraft: async (data: TikTokIntegrationTestRequestDto) => apiClient.post<TikTokIntegrationTestResultDto>(`${AUTH_PREFIX}/integrations/test`, data),
  testSaved: async (integrationId: number) => apiClient.post<TikTokIntegrationTestResultDto>(`${AUTH_PREFIX}/integrations/${integrationId}/test`, {}),
  tokenStatus: async (integrationId: number) => apiClient.get<TikTokTokenStatusDto>(`${AUTH_PREFIX}/integrations/${integrationId}/token-status`),
}

export const tiktokReferenceApi = {
  getCreateCampaign: async () => apiClient.get<TikTokReferenceResponseDto>("/api/v1/tiktok-reference/create-campaign"),
  getTargetingOptions: async (adAccountId: number, params?: { objectiveType?: string; placements?: string; operatingSystem?: string; levelRange?: string }) =>
    apiClient.get<TikTokTargetingOptionsResponseDto>(`/api/v1/tiktok-reference/ad-accounts/${adAccountId}/targeting-options`, params),
  getIdentities: async (adAccountId: number) =>
    apiClient.get<TikTokIdentityOptionDto[]>(`/api/v1/tiktok-reference/ad-accounts/${adAccountId}/identities`),
}

export const tiktokCampaignRequestsApi = {
  getRequests: async (params?: { status?: string; appRowId?: number; tiktokAdAccountId?: number }) =>
    apiClient.get<TikTokCampaignRequestListItemDto[]>(REQUESTS_PREFIX, params),
  getRequest: async (id: number) => apiClient.get<TikTokCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}`),
  create: async (data: CreateTikTokCampaignRequestDto) => apiClient.post<TikTokCampaignRequestDetailDto>(REQUESTS_PREFIX, data),
  update: async (id: number, data: UpdateTikTokCampaignRequestDto) => apiClient.put<TikTokCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}`, data),
  validate: async (id: number) => apiClient.post<TikTokValidationResultDto>(`${REQUESTS_PREFIX}/${id}/validate`),
  submit: async (id: number) => apiClient.post<TikTokCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/submit`),
  approve: async (id: number, comment?: string) => apiClient.post<TikTokCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/approve`, { comment }),
  reject: async (id: number, reason?: string) => apiClient.post<TikTokCampaignRequestDetailDto>(`${REQUESTS_PREFIX}/${id}/reject`, { reason }),
  execute: async (id: number, dryRun = true) => apiClient.post<TikTokExecutionResultDto>(`${REQUESTS_PREFIX}/${id}/execute`, { dryRun }),
  retry: async (id: number, dryRun = true) => apiClient.post<TikTokExecutionResultDto>(`${REQUESTS_PREFIX}/${id}/retry`, { dryRun }),
  uploadAsset: async (file: File, kind: "image" | "video") => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("kind", kind)
    return apiClient.post<TikTokRequestAssetDto>(`${REQUESTS_PREFIX}/assets`, formData)
  },
  getAsset: async (id: number) => apiClient.get<TikTokRequestAssetDto>(`${REQUESTS_PREFIX}/assets/${id}`),
  getAssetContentBlob: async (id: number) => apiClient.getBlob(`${REQUESTS_PREFIX}/assets/${id}/content`),
}

export const tiktokCampaignsApi = {
  list: async (params?: {
    search?: string
    tiktokAdAccountId?: number
    appRowId?: number
    objective?: string
    status?: string
    page?: number
    pageSize?: number
  }) => apiClient.get<TikTokCampaignListResponseDto>(CAMPAIGNS_PREFIX, params),
  getById: async (id: number, params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<TikTokCampaignDetailDto>(`${CAMPAIGNS_PREFIX}/${id}`, params),
  sync: async (request?: SyncTikTokCampaignsRequestDto) => apiClient.post<TikTokSyncResultDto>(`${CAMPAIGNS_PREFIX}/sync`, request ?? {}),
}
