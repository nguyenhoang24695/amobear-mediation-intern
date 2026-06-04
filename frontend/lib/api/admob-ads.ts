import { apiClient } from "./client"
import type { AdmobAppMappingDto, UpsertAdmobAppMappingRequestDto } from "@/types/admob-ads"

const BASE_PREFIX = "/api/v1/admob-accounts"

export const admobAppMappingsApi = {
  list: async () => {
    return apiClient.get<AdmobAppMappingDto[]>(`${BASE_PREFIX}/app-mappings`)
  },

  listStoreMappings: async () => {
    return apiClient.get<AdmobAppMappingDto[]>(`${BASE_PREFIX}/store-app-mappings`)
  },

  getById: async (id: number) => {
    return apiClient.get<AdmobAppMappingDto>(`${BASE_PREFIX}/store-app-mappings/${id}`)
  },

  create: async (request: UpsertAdmobAppMappingRequestDto) => {
    return apiClient.post<AdmobAppMappingDto>(`${BASE_PREFIX}/store-app-mappings`, request)
  },

  update: async (id: number, request: UpsertAdmobAppMappingRequestDto) => {
    return apiClient.put<AdmobAppMappingDto>(`${BASE_PREFIX}/store-app-mappings/${id}`, request)
  },

  enable: async (id: number) => {
    return apiClient.post<AdmobAppMappingDto>(`${BASE_PREFIX}/store-app-mappings/${id}/enable`, {})
  },

  disable: async (id: number) => {
    return apiClient.post<AdmobAppMappingDto>(`${BASE_PREFIX}/store-app-mappings/${id}/disable`, {})
  },
}
