import { endOfMonth, parse, parseISO, startOfMonth } from "date-fns"
import { enUS } from "date-fns/locale"
import { format } from "date-fns"
import type { App } from "@/types/api"
import type { CustomReportSaved } from "@/types/reports"

const FILTER_DATE_RANGE = "Date range"
const FILTER_APPS = "Apps"
const FILTER_COMMISSION_USER = "Commission User"
const FILTER_COMMISSION_TEAM = "Team"

export type DateFilterMode = "preset" | "month" | "custom"

export interface ApplySavedCustomReportOptions {
  report: CustomReportSaved
  setSaveReportName: (name: string) => void
  setSaveReportFolder?: (folder: string) => void
  setSavedReportId: (id: string) => void
  setIsPinned: (pinned: boolean) => void
  setSelectedParameters: (ids: string[]) => void
  setSelectedMetrics: (ids: string[]) => void
  setSelectedApps: (ids: string[]) => void
  setMetricFilters: (filters: CustomReportSaved["filters"]["metricFilters"]) => void
  setCommissionUser: (value: string) => void
  setCommissionTeam?: (value: string) => void
  setSortColumn: (column: string) => void
  setSortDirection: (dir: "asc" | "desc") => void
  setDateFilterMode: (mode: DateFilterMode) => void
  setActivePresetDays: (days: number) => void
  setStartDate: (date: Date) => void
  setEndDate: (date: Date) => void
  setSelectedMonth: (month: Date) => void
  setActiveFilters: (filters: Array<{ type: string; value: string }>) => void
  upsertActiveFilter: (
    filters: Array<{ type: string; value: string }>,
    type: string,
    value: string,
  ) => Array<{ type: string; value: string }>
  syncAppsActiveFilter: (appIds: string[], apps: App[]) => void
  availableApps: App[]
}

function parseReportDate(value: string): Date {
  const iso = parseISO(value)
  if (!Number.isNaN(iso.getTime())) return iso
  return parse(value, "yyyy-MM-dd", new Date())
}

export function applySavedCustomReport(options: ApplySavedCustomReportOptions) {
  const { report, availableApps, upsertActiveFilter, syncAppsActiveFilter } = options
  const { filters } = report

  options.setSaveReportName(report.name)
  options.setSaveReportFolder?.(report.folder ?? "")
  options.setSavedReportId(report.id)
  options.setIsPinned(Boolean(report.isPinned))
  options.setSelectedParameters([...report.dimensions])
  options.setSelectedMetrics([...report.metrics])
  options.setMetricFilters(filters.metricFilters ?? [])
  options.setCommissionUser(filters.commissionUser ?? "All")
  options.setCommissionTeam?.(filters.commissionTeamId ?? "All")
  options.setSortColumn(filters.sortBy ?? "date")
  options.setSortDirection(filters.sortDir === "asc" ? "asc" : "desc")

  const permittedAppIds = new Set(availableApps.map((a) => a.appId))
  const nextApps = (filters.appIds ?? []).filter((id) => permittedAppIds.has(id))
  options.setSelectedApps(nextApps)
  syncAppsActiveFilter(nextApps, availableApps)

  let activeFilters: Array<{ type: string; value: string }> = []

  if (filters.selectedMonth) {
    const [yearPart, monthPart] = filters.selectedMonth.split("-").map(Number)
    if (yearPart && monthPart) {
      const month = startOfMonth(new Date(yearPart, monthPart - 1, 1))
      options.setDateFilterMode("month")
      options.setSelectedMonth(month)
      const start = month
      const end = endOfMonth(month)
      options.setStartDate(start)
      options.setEndDate(end)
      activeFilters = upsertActiveFilter(
        activeFilters,
        FILTER_DATE_RANGE,
        format(month, "MMMM yyyy", { locale: enUS }),
      )
    }
  } else if (filters.activePresetDays && filters.activePresetDays > 0) {
    const days = filters.activePresetDays
    options.setDateFilterMode("preset")
    options.setActivePresetDays(days)
    options.setEndDate(new Date())
    options.setStartDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    activeFilters = upsertActiveFilter(activeFilters, FILTER_DATE_RANGE, `Last ${days} days`)
  } else if (filters.from && filters.to) {
    const from = parseReportDate(filters.from)
    const to = parseReportDate(filters.to)
    options.setDateFilterMode("custom")
    options.setActivePresetDays(0)
    options.setStartDate(from)
    options.setEndDate(to)
    const label = `${format(from, "M/d/yyyy", { locale: enUS })} – ${format(to, "M/d/yyyy", { locale: enUS })}`
    activeFilters = upsertActiveFilter(activeFilters, FILTER_DATE_RANGE, label)
  }

  const commissionLabel = filters.commissionUser && filters.commissionUser !== "All"
    ? filters.commissionUser
    : "All"
  if (commissionLabel !== "All") {
    activeFilters = upsertActiveFilter(activeFilters, FILTER_COMMISSION_USER, commissionLabel)
  }

  options.setActiveFilters(activeFilters)
}
