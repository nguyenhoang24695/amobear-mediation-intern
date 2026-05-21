import { apiClient } from "./client"
import type { GeoCountryGroupDto, UpsertGeoCountryGroupDto } from "@/types/meta-ads"

const GEO_PREFIX = "/api/v1/geo"

export const geoCountryGroupsApi = {
  list: async () => {
    return apiClient.get<GeoCountryGroupDto[]>(`${GEO_PREFIX}/country-groups`)
  },

  create: async (request: UpsertGeoCountryGroupDto) => {
    return apiClient.post<GeoCountryGroupDto>(`${GEO_PREFIX}/country-groups`, request)
  },

  update: async (id: number, request: UpsertGeoCountryGroupDto) => {
    return apiClient.put<GeoCountryGroupDto>(`${GEO_PREFIX}/country-groups/${id}`, request)
  },

  delete: async (id: number) => {
    return apiClient.delete<void>(`${GEO_PREFIX}/country-groups/${id}`)
  },
}
