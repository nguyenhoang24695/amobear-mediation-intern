"use client"

import { useCallback, useMemo, useState } from "react"
import { startOfMonth } from "date-fns"
import type { CustomReportCatalogItem, CustomReportQueryRequest } from "@/types/reports"
import {
  MY_REPORT_DEFAULT_DATE,
  MY_REPORT_DEFAULT_DIMENSIONS,
  MY_REPORT_DEFAULT_IAP_MODE,
  MY_REPORT_DEFAULT_METRICS,
  MY_REPORT_DEFAULT_REVENUE_SOURCE,
  MY_REPORT_DEFAULT_SORT,
} from "@/lib/reports/my-report-defaults"
import {
  type ReportDateFilterMode,
  resolveMonthDateRange,
  resolvePresetDateRange,
  toApiDateString,
} from "@/lib/reports/report-date-filter-utils"
import { MY_REPORT_DIMENSION_IDS } from "@/lib/reports/my-report-catalog-groups"

export type MyReportConfig = {
  dimensions: string[]
  metrics: string[]
  selectedAppIds: string[]
  selectedCommissionTeamIds: string[]
  revenueSource: string
  iapRevenueMode: number
  dateFilterMode: ReportDateFilterMode
  activePresetDays: number
  selectedMonth: Date
  startDate: Date
  endDate: Date
  sortBy: string
  sortDir: "asc" | "desc"
}

export type AppliedMyReportConfig = MyReportConfig

function cloneConfig(config: MyReportConfig): MyReportConfig {
  return {
    ...config,
    dimensions: [...config.dimensions],
    metrics: [...config.metrics],
    selectedAppIds: [...config.selectedAppIds],
    selectedCommissionTeamIds: [...config.selectedCommissionTeamIds],
    selectedMonth: new Date(config.selectedMonth),
    startDate: new Date(config.startDate),
    endDate: new Date(config.endDate),
  }
}

export function createDefaultMyReportConfig(): MyReportConfig {
  const { start, end } = resolvePresetDateRange(MY_REPORT_DEFAULT_DATE.activePresetDays)
  return {
    dimensions: [...MY_REPORT_DEFAULT_DIMENSIONS],
    metrics: [...MY_REPORT_DEFAULT_METRICS],
    selectedAppIds: [],
    selectedCommissionTeamIds: [],
    revenueSource: MY_REPORT_DEFAULT_REVENUE_SOURCE,
    iapRevenueMode: MY_REPORT_DEFAULT_IAP_MODE,
    dateFilterMode: MY_REPORT_DEFAULT_DATE.dateFilterMode,
    activePresetDays: MY_REPORT_DEFAULT_DATE.activePresetDays,
    selectedMonth: startOfMonth(new Date()),
    startDate: start,
    endDate: end,
    sortBy: MY_REPORT_DEFAULT_SORT.sortBy,
    sortDir: MY_REPORT_DEFAULT_SORT.sortDir,
  }
}

export function resolveMyReportDateRange(config: MyReportConfig): { start: Date; end: Date } {
  if (config.dateFilterMode === "month") {
    return resolveMonthDateRange(config.selectedMonth)
  }
  if (config.dateFilterMode === "preset") {
    return resolvePresetDateRange(config.activePresetDays)
  }
  return { start: config.startDate, end: config.endDate }
}

export function buildMyReportQueryRequest(
  config: AppliedMyReportConfig,
): CustomReportQueryRequest {
  const { start, end } = resolveMyReportDateRange(config)
  return {
    from: toApiDateString(start),
    to: toApiDateString(end),
    appIds: config.selectedAppIds,
    dimensions: config.dimensions,
    metrics: config.metrics,
    revenueSource: config.revenueSource,
    commissionTeamIds:
      config.selectedCommissionTeamIds.length > 0 ? config.selectedCommissionTeamIds : null,
    sortBy: config.sortBy,
    sortDir: config.sortDir,
    iapRevenueModeDefault: config.iapRevenueMode,
  }
}

export function useMyReportConfig(catalogDimensions: CustomReportCatalogItem[]) {
  const [draft, setDraft] = useState<MyReportConfig>(() => createDefaultMyReportConfig())
  const [applied, setApplied] = useState<AppliedMyReportConfig | null>(null)

  const allowedDimensionIds = useMemo(
    () =>
      new Set(
        (catalogDimensions.length > 0 ? catalogDimensions : MY_REPORT_DIMENSION_IDS.map((id) => ({ id })))
          .map((d) => d.id),
      ),
    [catalogDimensions],
  )

  const updateDraft = useCallback((patch: Partial<MyReportConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const applyDraft = useCallback(() => {
    setApplied(cloneConfig(draft))
  }, [draft])

  const toggleDimension = useCallback(
    (id: string) => {
      if (!allowedDimensionIds.has(id)) return
      setDraft((prev) => {
        const has = prev.dimensions.includes(id)
        if (has) {
          const next = prev.dimensions.filter((d) => d !== id)
          return { ...prev, dimensions: next.length > 0 ? next : ["date"] }
        }
        return { ...prev, dimensions: [...prev.dimensions, id] }
      })
    },
    [allowedDimensionIds],
  )

  const toggleMetric = useCallback((id: string) => {
    setDraft((prev) => {
      const has = prev.metrics.includes(id)
      if (has) {
        const next = prev.metrics.filter((m) => m !== id)
        return { ...prev, metrics: next.length > 0 ? next : prev.metrics }
      }
      return { ...prev, metrics: [...prev.metrics, id] }
    })
  }, [])

  const reorderMetrics = useCallback((activeId: string, overId: string) => {
    setDraft((prev) => {
      const oldIndex = prev.metrics.indexOf(activeId)
      const newIndex = prev.metrics.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
      const next = [...prev.metrics]
      next.splice(oldIndex, 1)
      next.splice(newIndex, 0, activeId)
      return { ...prev, metrics: next }
    })
  }, [])

  const setSort = useCallback((sortBy: string, sortDir?: "asc" | "desc") => {
    setDraft((prev) => ({
      ...prev,
      sortBy,
      sortDir:
        sortDir ??
        (prev.sortBy === sortBy && prev.sortDir === "desc" ? "asc" : "desc"),
    }))
  }, [])

  const applySort = useCallback((sortBy: string) => {
    setDraft((prev) => {
      const sortDir =
        prev.sortBy === sortBy && prev.sortDir === "desc" ? "asc" : "desc"
      const next = cloneConfig({ ...prev, sortBy, sortDir })
      setApplied(next)
      return next
    })
  }, [])

  const hasPendingApply = useMemo(() => {
    if (!applied) return true
    return JSON.stringify(draft) !== JSON.stringify(applied)
  }, [applied, draft])

  return {
    draft,
    applied,
    updateDraft,
    applyDraft,
    toggleDimension,
    toggleMetric,
    reorderMetrics,
    setSort,
    applySort,
    hasPendingApply,
  }
}

export function applyMonthToDraft(month: Date): Partial<MyReportConfig> {
  const { start, end } = resolveMonthDateRange(month)
  return {
    dateFilterMode: "month",
    selectedMonth: startOfMonth(month),
    startDate: start,
    endDate: end,
  }
}

export function applyPresetToDraft(days: number): Partial<MyReportConfig> {
  const { start, end } = resolvePresetDateRange(days)
  return {
    dateFilterMode: "preset",
    activePresetDays: days,
    startDate: start,
    endDate: end,
  }
}

export function applyCustomRangeToDraft(start: Date, end: Date): Partial<MyReportConfig> {
  return {
    dateFilterMode: "custom",
    startDate: start,
    endDate: end,
  }
}
