"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type { DashboardRangeInput } from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useDashboardSummary(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-summary:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.summary(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.summary(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}
