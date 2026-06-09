"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type { DashboardRangeInput, QonversionProductReport, QonversionProductSeriesResponse } from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useQonversionProductSeries(
  appId: string,
  range: DashboardRangeInput,
  report: QonversionProductReport,
) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-qonversion-product-series:${appId}:${rangeKey}:${report}`
  const result = useApi(
    () => appDashboardApi.getQonversionProductSeries(appId, report, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )
  const { refetch } = result

  const refresh = useCallback(
    () => refetch(() => appDashboardApi.getQonversionProductSeries(appId, report, range, true)),
    [appId, range, report, refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export type QonversionProductSeriesResult = QonversionProductSeriesResponse
