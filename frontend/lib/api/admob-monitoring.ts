import { apiClient } from "./client"
import type {
  PerformanceSyncCompareListResponse,
  PerformanceSyncCompareQuery,
  PerformanceSyncCompareResyncRequest,
  PerformanceSyncCompareResyncResponse,
} from "@/types/admob-monitoring"

const PREFIX = "/api/v1/monitoring/admob"

export const admobMonitoringApi = {
  listPerformanceSyncCompare: async (params?: PerformanceSyncCompareQuery) => {
    return apiClient.get<PerformanceSyncCompareListResponse>(
      `${PREFIX}/performance-sync-compare`,
      params as Record<string, string | number | boolean | undefined>,
    )
  },

  resyncPerformanceSyncCompare: async (request: PerformanceSyncCompareResyncRequest) => {
    return apiClient.post<PerformanceSyncCompareResyncResponse>(
      `${PREFIX}/performance-sync-compare/resync`,
      request,
    )
  },
}
