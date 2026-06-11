import { apiClient } from "./client"
import type {
  AdmobApiTrafficChartQuery,
  AdmobApiTrafficChartResponse,
  AdmobApiTrafficFilterOptions,
  PerformanceSyncCompareListResponse,
  PerformanceSyncCompareQuery,
  PerformanceSyncCompareRecompareRequest,
  PerformanceSyncCompareRecompareResponse,
  PerformanceSyncCompareResyncRequest,
  PerformanceSyncCompareResyncResponse,
} from "@/types/admob-monitoring"

const PREFIX = "/api/v1/monitoring/admob"

function pickStringField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function pickNumberField(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

/** Chuẩn hóa payload chart (camelCase hoặc PascalCase từ .NET). */
export function normalizeTrafficChartResponse(raw: unknown): AdmobApiTrafficChartResponse {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const pointsRaw = (record.points ?? record.Points ?? []) as unknown[]
  const seriesRaw = (record.series ?? record.Series ?? []) as unknown[]

  const points = pointsRaw.map((item) => {
    const point = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    const breakdownRaw = point.breakdown ?? point.Breakdown
    const breakdown: Record<string, number> = {}
    if (breakdownRaw && typeof breakdownRaw === "object") {
      for (const [key, value] of Object.entries(breakdownRaw as Record<string, unknown>)) {
        breakdown[key] = pickNumberField({ v: value }, "v")
      }
    }

    const bucketStartRaw = point.bucketStart ?? point.BucketStart
    const bucketStart =
      typeof bucketStartRaw === "string"
        ? bucketStartRaw
        : bucketStartRaw != null
          ? String(bucketStartRaw)
          : ""

    return {
      bucketStart,
      count: pickNumberField(point, "count", "Count"),
      breakdown,
    }
  })

  return {
    bucket: pickStringField(record, "bucket", "Bucket") || "hour",
    dimension: (pickStringField(record, "dimension", "Dimension") || "none") as AdmobApiTrafficChartResponse["dimension"],
    createdFrom: pickStringField(record, "createdFrom", "CreatedFrom"),
    createdTo: pickStringField(record, "createdTo", "CreatedTo"),
    totalCalls: pickNumberField(record, "totalCalls", "TotalCalls"),
    series: seriesRaw
      .map((item) => (typeof item === "string" ? item.trim() : item != null ? String(item).trim() : ""))
      .filter(Boolean),
    points,
  }
}

export function normalizeTrafficFilterOptions(raw: unknown): AdmobApiTrafficFilterOptions {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const callTypesRaw = record.callTypes ?? record.CallTypes
  const publishersRaw = record.publishers ?? record.Publishers
  const httpStatusesRaw = record.httpStatuses ?? record.HttpStatuses

  const toStringList = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : item != null ? String(item).trim() : ""))
          .filter(Boolean)
      : []

  const httpStatuses = Array.isArray(httpStatusesRaw)
    ? httpStatusesRaw.map((item) => {
        if (item == null) return null
        if (typeof item === "number" && Number.isFinite(item)) return item
        const parsed = Number(item)
        return Number.isFinite(parsed) ? parsed : null
      })
    : []

  return {
    callTypes: toStringList(callTypesRaw),
    publishers: toStringList(publishersRaw),
    httpStatuses,
  }
}

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

function buildTrafficQueryString(params?: AdmobApiTrafficChartQuery): string {
  if (!params) return ""

  const search = new URLSearchParams()
  if (params.createdFrom) search.set("createdFrom", params.createdFrom)
  if (params.createdTo) search.set("createdTo", params.createdTo)
  if (params.callType) search.set("callType", params.callType)
  if (params.publisherId) search.set("publisherId", params.publisherId)
  if (params.responseHttpStatus) search.set("responseHttpStatus", params.responseHttpStatus)
  if (params.bucket) search.set("bucket", params.bucket)
  if (params.dimension) search.set("dimension", params.dimension)

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

  getApiTrafficFilterOptions: async (params?: Pick<AdmobApiTrafficChartQuery, "createdFrom" | "createdTo">) => {
    const raw = await apiClient.get<unknown>(
      `${PREFIX}/api-traffic/filter-options${buildTrafficQueryString(params)}`,
    )
    return normalizeTrafficFilterOptions(raw)
  },

  getApiTrafficChart: async (params?: AdmobApiTrafficChartQuery) => {
    const raw = await apiClient.get<unknown>(
      `${PREFIX}/api-traffic/chart${buildTrafficQueryString(params)}`,
    )
    return normalizeTrafficChartResponse(raw)
  },
}
