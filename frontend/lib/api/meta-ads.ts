import { apiClient } from "./client"
import type {
  ApproveMetaCampaignRequestDto,
  CreateMetaAppMappingRequestDto,
  MetaAppMappingCandidateDto,
  MetaAppMappingCandidateQueryDto,
  MetaAppMappingDiscoveryRequestDto,
  MetaAppMappingDiscoveryResultDto,
  CreateMetaCampaignRequestDto,
  CreateMetaIntegrationRequestDto,
  ExecuteMetaCampaignRequestDto,
  MetaAdAccountDto,
  MetaAppMappingDto,
  MetaAuthorizeUrlResponseDto,
  MetaCampaignRequestDetailDto,
  MetaCampaignRequestListItemDto,
  MetaCreateCampaignReferenceDto,
  MetaExecuteResponseDto,
  MetaIntegrationDto,
  MetaIntegrationTestRequestDto,
  MetaIntegrationTestResultDto,
  MetaTokenStatusDto,
  MetaValidationResultDto,
  RejectMetaCampaignRequestDto,
  ResolveMetaAppMappingCandidateRequestDto,
  UpdateMetaAppMappingRequestDto,
  UpdateMetaCampaignRequestDto,
  UpdateMetaIntegrationRequestDto,
  UpsertMetaAdAccountRequestDto,
} from "@/types/meta-ads"

const AUTH_PREFIX = "/api/v1/meta-auth"
const ACCOUNTS_PREFIX = "/api/v1/meta-accounts"
const REFERENCE_PREFIX = "/api/v1/meta-reference"
const REQUESTS_PREFIX = "/api/v1/meta-campaign-requests"

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
}

export const metaReferenceApi = {
  getCreateCampaignReference: async () => {
    return apiClient.get<MetaCreateCampaignReferenceDto>(`${REFERENCE_PREFIX}/create-campaign`)
  },

  getAdAccountAppMappings: async (adAccountId: number) => {
    return apiClient.get<MetaAppMappingDto[]>(`${REFERENCE_PREFIX}/ad-accounts/${adAccountId}/app-mappings`)
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
    return apiClient.get<MetaAppMappingDto[]>(`${ACCOUNTS_PREFIX}/app-mappings`)
  },

  listCandidates: async (query?: MetaAppMappingCandidateQueryDto) => {
    return apiClient.get<MetaAppMappingCandidateDto[]>(`${ACCOUNTS_PREFIX}/app-mappings/candidates`, query)
  },

  discover: async (request?: MetaAppMappingDiscoveryRequestDto) => {
    return apiClient.post<MetaAppMappingDiscoveryResultDto>(`${ACCOUNTS_PREFIX}/app-mappings/discover`, request ?? {})
  },

  resolveCandidate: async (id: number, request: ResolveMetaAppMappingCandidateRequestDto) => {
    return apiClient.post<MetaAppMappingCandidateDto>(`${ACCOUNTS_PREFIX}/app-mappings/candidates/${id}/resolve`, request)
  },

  create: async (request: CreateMetaAppMappingRequestDto) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings`, request)
  },

  update: async (id: number, request: UpdateMetaAppMappingRequestDto) => {
    return apiClient.put<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}`, request)
  },

  enable: async (id: number) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}/enable`, {})
  },

  disable: async (id: number) => {
    return apiClient.post<MetaAppMappingDto>(`${ACCOUNTS_PREFIX}/app-mappings/${id}/disable`, {})
  },
}


