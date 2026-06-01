"use client"

import { useCallback } from "react"
import { useApi } from "@/hooks/use-api"
import { appDashboardApi } from "@/lib/api/appDashboard"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"
import type {
  DashboardRangeInput,
  EngagementTrendSeries,
  RetentionResponse,
  RevenueTrendSeries,
  UserTrendSeries,
} from "@/types/app-dashboard"
import { useRegisterRefetch } from "./use-dashboard-refresh"

export function useDashboardUserTrend(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-user-trend:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.userTrend(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.userTrend(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export function useDashboardEngagementTrend(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-engagement-trend:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.engagementTrend(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.engagementTrend(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export function useDashboardRevenueTrend(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-revenue-trend:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.revenueTrend(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.revenueTrend(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export function useDashboardRetention(appId: string, range: DashboardRangeInput) {
  const rangeKey = dashboardRangeCacheKey(range)
  const cacheKey = `app-dashboard-retention:${appId}:${rangeKey}`
  const result = useApi(
    () => appDashboardApi.retention(appId, range),
    {
      enabled: Boolean(appId),
      cacheKey,
    },
  )

  const refresh = useCallback(
    () => result.refetch(() => appDashboardApi.retention(appId, range, true)),
    [appId, range, result.refetch],
  )
  useRegisterRefetch(cacheKey, refresh)

  return result
}

export type DashboardUserTrendResult = UserTrendSeries
export type DashboardEngagementTrendResult = EngagementTrendSeries
export type DashboardRevenueTrendResult = RevenueTrendSeries
export type DashboardRetentionResult = RetentionResponse
