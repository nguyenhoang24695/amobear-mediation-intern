"use client"

import { useCallback, useEffect, useState } from "react"
import { reportsApi } from "@/lib/api/services"
import type { CustomReportCatalogResponse, CustomReportQueryResponse } from "@/types/reports"
import {
  type AppliedMyReportConfig,
  buildMyReportQueryRequest,
} from "@/components/my-reports/hooks/use-my-report-config"

export function useMyReportQuery(applied: AppliedMyReportConfig | null) {
  const [catalog, setCatalog] = useState<CustomReportCatalogResponse | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [data, setData] = useState<CustomReportQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCatalogLoading(true)
    reportsApi
      .getCatalog()
      .then((response) => {
        if (!cancelled) {
          setCatalog(response)
          setCatalogError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "Failed to load catalog")
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fetchReport = useCallback(async (config: AppliedMyReportConfig) => {
    setLoading(true)
    setError(null)
    try {
      const response = await reportsApi.query(buildMyReportQueryRequest(config))
      setData(response)
    } catch (err: unknown) {
      setData(null)
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!applied) return
    void fetchReport(applied)
  }, [applied, fetchReport])

  return {
    catalog,
    catalogLoading,
    catalogError,
    data,
    loading,
    error,
    refetch: applied ? () => fetchReport(applied) : undefined,
  }
}
