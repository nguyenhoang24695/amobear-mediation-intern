"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { reportsApi } from "@/lib/api/services"
import type { CustomReportQueryResponse } from "@/types/reports"

export function useCustomReportQuery(options: {
  startDate: Date
  endDate: Date
  selectedAppIds: string[]
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  commissionUsernames: string[] | null
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
    commissionUsernames,
    sortBy,
    sortDir,
    enabled = true,
  } = options

  const [data, setData] = useState<CustomReportQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const appIdsKey = selectedAppIds.join(",")
  const dimensionsKey = dimensions.join(",")
  const metricsKey = metrics.join(",")
  const commissionKey = commissionUsernames?.join(",") ?? ""

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
          dimensions,
          metrics,
          revenueSource,
          commissionUsernames,
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
    revenueSource,
    commissionKey,
    sortBy,
    sortDir,
    selectedAppIds,
    dimensions,
    metrics,
    commissionUsernames,
  ])

  return { data, loading, error }
}
