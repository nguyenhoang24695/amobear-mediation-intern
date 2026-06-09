"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { reportsApi } from "@/lib/api/services"
import type { CustomReportCatalogResponse, CustomReportQueryResponse } from "@/types/reports"
import {
  type AppliedMyReportConfig,
  buildMyReportQueryRequest,
  resolveMyReportDateRange,
} from "@/components/my-reports/hooks/use-my-report-config"
import {
  buildCompareQueryDates,
  isCompareActive,
  mergeCompareRows,
  mergeCompareTotals,
  type CompareEnrichedRow,
} from "@/lib/reports/my-report-compare-utils"
import { resolveEffectiveAppIds } from "@/lib/reports/my-report-app-selection"

export type MyReportQueryResult = {
  catalog: CustomReportCatalogResponse | null
  catalogLoading: boolean
  catalogError: string | null
  data: CustomReportQueryResponse | null
  compareData: CustomReportQueryResponse | null
  mergedRows: CompareEnrichedRow[]
  mergedTotals: Record<string, string | number | null>
  compareTotals: Record<string, number | null>
  totalsDeltaPct: Record<string, number | null>
  loading: boolean
  error: string | null
  emptyAppIntersection: boolean
  refetch: (() => void) | undefined
}

export function useMyReportQuery(
  applied: AppliedMyReportConfig | null,
  teamScopedAppIds: string[] = [],
): MyReportQueryResult {
  const [catalog, setCatalog] = useState<CustomReportCatalogResponse | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const [data, setData] = useState<CustomReportQueryResponse | null>(null)
  const [compareData, setCompareData] = useState<CustomReportQueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emptyAppIntersection = useMemo(() => {
    if (!applied) return false
    const { emptyIntersection } = resolveEffectiveAppIds(
      applied.selectedAppIds,
      applied.selectedCommissionTeamIds,
      teamScopedAppIds,
    )
    return emptyIntersection
  }, [applied, teamScopedAppIds])

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

  const fetchReport = useCallback(
    async (config: AppliedMyReportConfig) => {
      const { emptyIntersection } = resolveEffectiveAppIds(
        config.selectedAppIds,
        config.selectedCommissionTeamIds,
        teamScopedAppIds,
      )
      if (emptyIntersection) {
        setData(null)
        setCompareData(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const primaryRequest = buildMyReportQueryRequest(config, { teamScopedAppIds })
        const compareDates =
          isCompareActive(config.compareToPreset) &&
          buildCompareQueryDates(
            resolveMyReportDateRange(config).start,
            resolveMyReportDateRange(config).end,
            config.compareToPreset,
            config.compareCustomStart,
            config.compareCustomEnd,
          )

        const compareRequest = compareDates
          ? buildMyReportQueryRequest(config, { teamScopedAppIds, dateOverride: compareDates })
          : null

        const [primaryResponse, compareResponse] = await Promise.all([
          reportsApi.query(primaryRequest),
          compareRequest ? reportsApi.query(compareRequest) : Promise.resolve(null),
        ])

        setData(primaryResponse)
        setCompareData(compareResponse)
      } catch (err: unknown) {
        setData(null)
        setCompareData(null)
        setError(err instanceof Error ? err.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    },
    [teamScopedAppIds],
  )

  useEffect(() => {
    if (!applied) return
    void fetchReport(applied)
  }, [applied, fetchReport])

  const merged = useMemo(() => {
    if (!data || !applied) {
      return {
        mergedRows: [] as CompareEnrichedRow[],
        mergedTotals: {} as Record<string, string | number | null>,
        compareTotals: {} as Record<string, number | null>,
        totalsDeltaPct: {} as Record<string, number | null>,
      }
    }

    if (!compareData || !isCompareActive(applied.compareToPreset)) {
      return {
        mergedRows: data.rows as CompareEnrichedRow[],
        mergedTotals: data.totals,
        compareTotals: {},
        totalsDeltaPct: {},
      }
    }

    const mergedRows = mergeCompareRows(
      data.rows,
      compareData.rows,
      applied.dimensions,
      applied.metrics,
    )
    const totalsMerge = mergeCompareTotals(data.totals, compareData.totals, applied.metrics)
    return {
      mergedRows,
      mergedTotals: totalsMerge.totals,
      compareTotals: totalsMerge.compareTotals,
      totalsDeltaPct: totalsMerge.deltaPct,
    }
  }, [applied, compareData, data])

  return {
    catalog,
    catalogLoading,
    catalogError,
    data,
    compareData,
    mergedRows: merged.mergedRows,
    mergedTotals: merged.mergedTotals,
    compareTotals: merged.compareTotals,
    totalsDeltaPct: merged.totalsDeltaPct,
    loading,
    error,
    emptyAppIntersection,
    refetch: applied ? () => fetchReport(applied) : undefined,
  }
}
