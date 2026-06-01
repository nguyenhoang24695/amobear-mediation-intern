"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type { DashboardRangeInput, TopCountriesResponse, TopCountryMetric } from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useTopCountry(appId: string, range: DashboardRangeInput, metric: TopCountryMetric) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-top-country:${appId}:${rangeKey}:${metric}`
  const result = useApi(
    () => appDashboardApi.topCountries(appId, range, metric),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.topCountries(appId, range, metric, true)),
    [appId, range, metric, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export type TopCountryResult = TopCountriesResponse
