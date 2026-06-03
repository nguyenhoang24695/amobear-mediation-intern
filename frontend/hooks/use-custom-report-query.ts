"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { reportsApi } from "@/lib/api/services"
import type { CustomReportMetricFilter, CustomReportQueryResponse } from "@/types/reports"

export function useCustomReportQuery(options: {
  startDate: Date
  endDate: Date
  selectedAppIds: string[]
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  metricFilters?: CustomReportMetricFilter[]
  commissionUsernames?: string[] | null
  commissionTeamId?: string | null
  commissionTeamIds?: string[] | null
  sortBy: string
  sortDir: "asc" | "desc"
  enabled?: boolean
}) {
  const {
    startDate,
    endDate,
    selectedAppIds,
    dimensions,
    metrics,
    revenueSource,
    metricFilters = [],
    commissionTeamId = null,
    commissionTeamIds = null,
    sortBy,
    sortDir,
    enabled = true,
  } = options

  const [data, setData] = useState<CustomReportQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const appIdsKey = selectedAppIds.join(",")
  const dimensionsKey = [...dimensions].sort().join(",")
  const metricsKey = [...metrics].sort().join(",")
  const metricFiltersKey = JSON.stringify(metricFilters)
  const commissionTeamIdsKey = (commissionTeamIds ?? []).join(",")

  useEffect(() => {
    if (!enabled || dimensions.length === 0 || metrics.length === 0 || selectedAppIds.length === 0) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    const handle = window.setTimeout(async () => {
      try {
        const result = await reportsApi.query({
          from: format(startDate, "yyyy-MM-dd"),
          to: format(endDate, "yyyy-MM-dd"),
          appIds: selectedAppIds,
          dimensions: dimensionsKey ? dimensionsKey.split(",") : [],
          metrics: metricsKey ? metricsKey.split(",") : [],
          revenueSource,
          metricFilters,
          commissionTeamId:
            commissionTeamIds && commissionTeamIds.length > 0 ? null : commissionTeamId,
          commissionTeamIds:
            commissionTeamIds && commissionTeamIds.length > 0 ? commissionTeamIds : null,
          sortBy,
          sortDir,
        })
        if (reqId !== requestIdRef.current) return
        setData(result)
      } catch (err: unknown) {
        if (reqId !== requestIdRef.current) return
        setData(null)
        setError((err as { message?: string })?.message ?? "Failed to load report")
      } finally {
        if (reqId === requestIdRef.current) setLoading(false)
      }
    }, 400)

    return () => window.clearTimeout(handle)
  }, [
    enabled,
    startDate.getTime(),
    endDate.getTime(),
    appIdsKey,
    dimensionsKey,
    metricsKey,
    metricFiltersKey,
    commissionTeamId,
    commissionTeamIdsKey,
    revenueSource,
    sortBy,
    sortDir,
    // Keep dependency array length stable across Fast Refresh while using canonical keys,
    // so reordering columns does not trigger a fresh API call.
    appIdsKey,
    dimensionsKey,
    metricsKey,
    metricFiltersKey,
  ])

  return { data, loading, error }
}
