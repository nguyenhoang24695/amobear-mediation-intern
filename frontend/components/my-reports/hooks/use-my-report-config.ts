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
import { resolveEffectiveAppIds } from "@/lib/reports/my-report-app-selection"
import { MY_REPORT_DIMENSION_IDS } from "@/lib/reports/my-report-catalog-groups"
import type { CompareToPreset } from "@/lib/reports/my-report-compare-utils"
import {
  MY_REPORT_DEFAULT_ENABLED_CONFIG_KEYS,
  MY_REPORT_LOCKED_CONFIG_KEYS,
  normalizeEnabledConfigKeys,
  resetEnabledConfigKeys,
  type MyReportConfigKey,
} from "@/lib/reports/my-report-data-config-catalog"

export type MyReportAppSelectionMode = "permission" | "by_team"

export type MyReportChartType =
  | "line"
  | "combo"
  | "bar"
  | "stacked-bar"
  | "area"
  | "scorecard"
  | "pie"

/** Side-by-side vs stacked layout for the two chart panels. */
export type MyReportPanelLayout = "side-by-side" | "stacked"

export type MyReportTableViewMode = "flat" | "pivot"

export type CustomFormulaMetric = {
  id: string
  name: string
  expression: string
  color?: string
}

export type MyReportConfig = {
  dimensions: string[]
  metrics: string[]
  selectedAppIds: string[]
  appSelectionMode: MyReportAppSelectionMode
  selectedCommissionTeamIds: string[]
  revenueSource: string
  iapRevenueMode: number
  iapRevenueModeOverrides: Record<string, number>
  compareToPreset: CompareToPreset
  compareCustomStart: Date
  compareCustomEnd: Date
  pinnedColumnIds: string[]
  chartsVisible: boolean
  chartMetricIds: string[]
  chartType: MyReportChartType
  breakdownChartMetricIds: string[]
  breakdownChartType: MyReportChartType
  trendChartDimensionIds: string[]
  breakdownChartDimensionIds: string[]
  panelLayout: MyReportPanelLayout
  dateFilterMode: ReportDateFilterMode
  activePresetDays: number
  selectedMonth: Date
  startDate: Date
  endDate: Date
  sortBy: string
  sortDir: "asc" | "desc"
  enabledConfigKeys: MyReportConfigKey[]
  customFormulas: CustomFormulaMetric[]
  tableViewMode: MyReportTableViewMode
  pivotRowDim: string
  pivotColDim: string
  pivotMetricId: string
}

export type AppliedMyReportConfig = MyReportConfig

/** View-only fields — toggle without Apply or re-fetch. */
export const MY_REPORT_VIEW_ONLY_CONFIG_KEYS = [
  "tableViewMode",
  "chartsVisible",
] as const satisfies readonly (keyof MyReportConfig)[]

function stripViewOnlyConfigKeys(config: MyReportConfig): Omit<MyReportConfig, (typeof MY_REPORT_VIEW_ONLY_CONFIG_KEYS)[number]> {
  const next = { ...config }
  for (const key of MY_REPORT_VIEW_ONLY_CONFIG_KEYS) {
    delete (next as Partial<MyReportConfig>)[key]
  }
  return next as Omit<MyReportConfig, (typeof MY_REPORT_VIEW_ONLY_CONFIG_KEYS)[number]>
}

function cloneConfig(config: MyReportConfig): MyReportConfig {
  return {
    ...config,
    dimensions: [...config.dimensions],
    metrics: [...config.metrics],
    selectedAppIds: [...config.selectedAppIds],
    selectedCommissionTeamIds: [...config.selectedCommissionTeamIds],
    enabledConfigKeys: [...config.enabledConfigKeys],
    iapRevenueModeOverrides: { ...config.iapRevenueModeOverrides },
    compareCustomStart: new Date(config.compareCustomStart),
    compareCustomEnd: new Date(config.compareCustomEnd),
    pinnedColumnIds: [...config.pinnedColumnIds],
    chartMetricIds: [...config.chartMetricIds],
    breakdownChartMetricIds: [...config.breakdownChartMetricIds],
    trendChartDimensionIds: [...config.trendChartDimensionIds],
    breakdownChartDimensionIds: [...config.breakdownChartDimensionIds],
    selectedMonth: new Date(config.selectedMonth),
    startDate: new Date(config.startDate),
    endDate: new Date(config.endDate),
    customFormulas: config.customFormulas.map((formula) => ({ ...formula })),
  }
}

export function createDefaultMyReportConfig(): MyReportConfig {
  const { start, end } = resolvePresetDateRange(MY_REPORT_DEFAULT_DATE.activePresetDays)
  return {
    dimensions: [...MY_REPORT_DEFAULT_DIMENSIONS],
    metrics: [...MY_REPORT_DEFAULT_METRICS],
    selectedAppIds: [],
    appSelectionMode: "permission",
    selectedCommissionTeamIds: [],
    revenueSource: MY_REPORT_DEFAULT_REVENUE_SOURCE,
    iapRevenueMode: MY_REPORT_DEFAULT_IAP_MODE,
    iapRevenueModeOverrides: {},
    compareToPreset: "none" as CompareToPreset,
    compareCustomStart: start,
    compareCustomEnd: end,
    pinnedColumnIds: [],
    chartsVisible: false,
    chartMetricIds: [MY_REPORT_DEFAULT_METRICS[0]],
    chartType: "line",
    breakdownChartMetricIds: [MY_REPORT_DEFAULT_METRICS[0]],
    breakdownChartType: "line",
    trendChartDimensionIds: ["date"],
    breakdownChartDimensionIds: ["date", "app"],
    panelLayout: "side-by-side",
    dateFilterMode: MY_REPORT_DEFAULT_DATE.dateFilterMode,
    activePresetDays: MY_REPORT_DEFAULT_DATE.activePresetDays,
    selectedMonth: startOfMonth(new Date()),
    startDate: start,
    endDate: end,
    sortBy: MY_REPORT_DEFAULT_SORT.sortBy,
    sortDir: MY_REPORT_DEFAULT_SORT.sortDir,
    enabledConfigKeys: [...MY_REPORT_DEFAULT_ENABLED_CONFIG_KEYS],
    customFormulas: [],
    tableViewMode: "flat",
    pivotRowDim: MY_REPORT_DEFAULT_DIMENSIONS[0] ?? "date",
    pivotColDim: "app",
    pivotMetricId: MY_REPORT_DEFAULT_METRICS[0] ?? "ua_cost",
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
  options?: {
    teamScopedAppIds?: string[]
    dateOverride?: { from: string; to: string }
  },
): CustomReportQueryRequest {
  const { start, end } = options?.dateOverride
    ? { start: new Date(options.dateOverride.from), end: new Date(options.dateOverride.to) }
    : resolveMyReportDateRange(config)

  const teamScoped = options?.teamScopedAppIds ?? []
  const { appIds, emptyIntersection } = resolveEffectiveAppIds(
    config.selectedAppIds,
    config.selectedCommissionTeamIds,
    teamScoped,
  )

  const overrideEntries = Object.entries(config.iapRevenueModeOverrides).filter(
    ([, rate]) => rate != null && Number.isFinite(rate),
  )

  return {
    from: options?.dateOverride?.from ?? toApiDateString(start),
    to: options?.dateOverride?.to ?? toApiDateString(end),
    appIds: emptyIntersection ? [] : appIds,
    dimensions: config.dimensions,
    metrics: config.metrics,
    revenueSource: config.revenueSource,
    commissionTeamIds:
      config.selectedCommissionTeamIds.length > 0 ? config.selectedCommissionTeamIds : null,
    sortBy: config.sortBy,
    sortDir: config.sortDir,
    iapRevenueModeDefault: config.iapRevenueMode,
    iapRevenueModeOverrides:
      overrideEntries.length > 0 ? Object.fromEntries(overrideEntries) : null,
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

  const loadConfig = useCallback((config: MyReportConfig, applyImmediately = true) => {
    const next = cloneConfig(config)
    setDraft(next)
    if (applyImmediately) setApplied(cloneConfig(next))
  }, [])

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

  const reorderDimensions = useCallback((activeId: string, overId: string) => {
    setDraft((prev) => {
      const oldIndex = prev.dimensions.indexOf(activeId)
      const newIndex = prev.dimensions.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
      const next = [...prev.dimensions]
      next.splice(oldIndex, 1)
      next.splice(newIndex, 0, activeId)
      return { ...prev, dimensions: next }
    })
  }, [])

  const togglePinColumn = useCallback((columnId: string) => {
    setDraft((prev) => {
      const has = prev.pinnedColumnIds.includes(columnId)
      return {
        ...prev,
        pinnedColumnIds: has
          ? prev.pinnedColumnIds.filter((id) => id !== columnId)
          : [...prev.pinnedColumnIds, columnId],
      }
    })
  }, [])

  const reorderPinnedColumns = useCallback((activeId: string, overId: string) => {
    setDraft((prev) => {
      const oldIndex = prev.pinnedColumnIds.indexOf(activeId)
      const newIndex = prev.pinnedColumnIds.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev
      const next = [...prev.pinnedColumnIds]
      next.splice(oldIndex, 1)
      next.splice(newIndex, 0, activeId)
      return { ...prev, pinnedColumnIds: next }
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

  const toggleConfigKey = useCallback((key: MyReportConfigKey) => {
    if (MY_REPORT_LOCKED_CONFIG_KEYS.includes(key)) return
    setDraft((prev) => {
      const current = normalizeEnabledConfigKeys(prev.enabledConfigKeys)
      const has = current.includes(key)
      const next = has ? current.filter((k) => k !== key) : [...current, key]
      return { ...prev, enabledConfigKeys: normalizeEnabledConfigKeys(next) }
    })
  }, [])

  const resetConfigVisibility = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      enabledConfigKeys: resetEnabledConfigKeys(),
    }))
  }, [])

  const hasPendingApply = useMemo(() => {
    if (!applied) return true
    return (
      JSON.stringify(stripViewOnlyConfigKeys(draft)) !==
      JSON.stringify(stripViewOnlyConfigKeys(applied))
    )
  }, [applied, draft])

  return {
    draft,
    applied,
    updateDraft,
    applyDraft,
    toggleDimension,
    toggleMetric,
    reorderMetrics,
    reorderDimensions,
    togglePinColumn,
    reorderPinnedColumns,
    setSort,
    applySort,
    toggleConfigKey,
    resetConfigVisibility,
    hasPendingApply,
    loadConfig,
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
