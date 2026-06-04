import { apiClient } from "./client"
import type {
  PerformanceSyncCompareListResponse,
  PerformanceSyncCompareQuery,
  PerformanceSyncCompareRecompareRequest,
  PerformanceSyncCompareRecompareResponse,
  PerformanceSyncCompareResyncRequest,
  PerformanceSyncCompareResyncResponse,
} from "@/types/admob-monitoring"

const PREFIX = "/api/v1/monitoring/admob"

function buildListQueryString(params?: PerformanceSyncCompareQuery): string {
  if (!params) return ""

  const search = new URLSearchParams()
  if (params.startDate) search.set("startDate", params.startDate)
  if (params.endDate) search.set("endDate", params.endDate)
  if (params.status) search.set("status", params.status)
  if (params.appSearch) search.set("appSearch", params.appSearch)
  if (params.platform) search.set("platform", params.platform)
  if (params.page != null) search.set("page", String(params.page))
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize))

  if (params.sourceTables?.length) {
    for (const table of params.sourceTables) {
      if (table) search.append("sourceTables", table)
    }
  } else if (params.sourceTable) {
    search.set("sourceTable", params.sourceTable)
  }

  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

export const admobMonitoringApi = {
  listPerformanceSyncCompare: async (params?: PerformanceSyncCompareQuery) => {
    return apiClient.get<PerformanceSyncCompareListResponse>(
      `${PREFIX}/performance-sync-compare${buildListQueryString(params)}`,
    )
  },

  resyncPerformanceSyncCompare: async (request: PerformanceSyncCompareResyncRequest) => {
    return apiClient.post<PerformanceSyncCompareResyncResponse>(
      `${PREFIX}/performance-sync-compare/resync`,
      request,
    )
  },

  recomparePerformanceSyncCompare: async (request: PerformanceSyncCompareRecompareRequest) => {
    return apiClient.post<PerformanceSyncCompareRecompareResponse>(
      `${PREFIX}/performance-sync-compare/recompare`,
      request,
    )
  },
}
