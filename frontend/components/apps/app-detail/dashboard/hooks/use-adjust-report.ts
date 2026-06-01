"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type { AdjustReportResponse, DashboardRangeInput } from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useAdjustReport(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-adjust-report:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.adjustReport(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.adjustReport(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export type AdjustReportResult = AdjustReportResponse
