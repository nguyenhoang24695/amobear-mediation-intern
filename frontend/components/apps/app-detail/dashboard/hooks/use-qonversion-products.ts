"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type { DashboardRangeInput, QonversionProductReport, QonversionProductsResponse } from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useQonversionProducts(
  appId: string,
  range: DashboardRangeInput,
  report: QonversionProductReport,
) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-qonversion-products:${appId}:${rangeKey}:${report}`
  const result = useApi(
    () => appDashboardApi.getQonversionProducts(appId, report, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )
  const { refetch } = result

  const refresh = useCallback(
    () => refetch(() => appDashboardApi.getQonversionProducts(appId, report, range, true)),
    [appId, range, report, refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export type QonversionProductsResult = QonversionProductsResponse
