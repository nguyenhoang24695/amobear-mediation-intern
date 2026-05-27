"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { format, parse, parseISO } from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StringMultiSelectCombobox } from "@/components/shared/string-multi-select-combobox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { reportsApi } from "@/lib/api/services"
import type {
  OverviewMetricId,
  OverviewReportFilter,
  ProfitOverviewAppRow,
  ProfitOverviewMetricValues,
  ProfitOverviewMonthCell,
  ProfitOverviewReportResponse,
} from "@/types/reports"

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const APPS_PER_PAGE = 20

const OVERVIEW_METRICS: { id: OverviewMetricId; label: string }[] = [
  { id: "revenue", label: "Revenue" },
  { id: "cost", label: "Cost" },
  { id: "profit", label: "Profit" },
]

const DEFAULT_OVERVIEW_METRICS: OverviewMetricId[] = ["revenue", "cost", "profit"]

function currentYearRange() {
  const year = new Date().getFullYear()
  return { from: `${year}-01`, to: `${year}-12` }
}

function pickStringField(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

/** Chuẩn hóa payload API (camelCase hoặc PascalCase) — tránh set state undefined lên input controlled. */
function parseOverviewFilter(raw: unknown): OverviewReportFilter | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const from = pickStringField(record, "from", "From")
  const to = pickStringField(record, "to", "To")
  if (!from || !to || !MONTH_KEY_PATTERN.test(from) || !MONTH_KEY_PATTERN.test(to)) return null

  const teamIdsRaw = record.teamIds ?? record.TeamIds
  const teamIds = Array.isArray(teamIdsRaw)
    ? teamIdsRaw.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : []

  const selectedYear =
    pickStringField(record, "selectedYear", "SelectedYear") ?? from.slice(0, 4)

  return { from, to, selectedYear, teamIds }
}

function resolveYearInOptions(year: string, yearOptions: readonly string[]): string {
  if (yearOptions.includes(year)) return year
  return yearOptions[0] ?? String(new Date().getFullYear())
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value ?? 0)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—"
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}

function getPercentClass(percent: number | null | undefined) {
  if (percent == null) return "text-slate-500"
  if (percent < 0 || percent < 50) return "text-red-600 font-medium"
  if (percent < 80) return "text-amber-600 font-medium"
  return "text-green-600 font-medium"
}

function formatLastUpdatedAt(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy · h:mm a")
  } catch {
    return value
  }
}

function formatMonthLabel(month: string): string {
  try {
    return format(parse(month, "yyyy-MM", new Date()), "MMM yyyy", { locale: enUS })
  } catch {
    return month
  }
}

function renderPlatformBadge(platformValue: string) {
  const platform = platformValue || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isAndroid
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {isAndroid ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
        </svg>
      )}
      {platform}
    </Badge>
  )
}

function emptyMetricValues(): ProfitOverviewMetricValues {
  return { plan: 0, actual: 0, completionPercent: null }
}

function getMonthCell(
  months: Record<string, ProfitOverviewMonthCell>,
  month: string,
): ProfitOverviewMonthCell {
  return (
    months[month] ?? {
      revenue: emptyMetricValues(),
      cost: emptyMetricValues(),
      profit: emptyMetricValues(),
    }
  )
}

function getMetricValues(
  cell: ProfitOverviewMonthCell,
  metricId: OverviewMetricId,
): ProfitOverviewMetricValues {
  return cell[metricId]
}

function TeamAppsPager({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * APPS_PER_PAGE + 1
  const end = Math.min(currentPage * APPS_PER_PAGE, totalItems)

  return (
    <div className="flex flex-col gap-2 py-1 text-sm sm:flex-row sm:flex-wrap sm:items-center">
      <span className="shrink-0 text-slate-500">
        Apps <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="tabular-nums text-slate-600">
          {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function OverviewMonthCells({
  months,
  monthKeys,
  selectedMetrics,
}: {
  months: Record<string, ProfitOverviewMonthCell>
  monthKeys: string[]
  selectedMetrics: OverviewMetricId[]
}) {
  return (
    <>
      {monthKeys.map((month) => {
        const cell = getMonthCell(months, month)
        return (
          <Fragment key={month}>
            {selectedMetrics.map((metricId, metricIndex) => {
              const values = getMetricValues(cell, metricId)
              const isLastMetric = metricIndex === selectedMetrics.length - 1
              return (
                <Fragment key={`${month}-${metricId}`}>
                  <TableCell className="min-w-[80px] text-right text-sm tabular-nums text-slate-700">
                    {formatCurrency(values.plan)}
                  </TableCell>
                  <TableCell className="min-w-[80px] text-right text-sm tabular-nums text-slate-700">
                    {formatCurrency(values.actual)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "min-w-[56px] text-right text-sm tabular-nums",
                      isLastMetric && "border-r",
                      getPercentClass(values.completionPercent),
                    )}
                  >
                    {formatPercent(values.completionPercent)}
                  </TableCell>
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
    </>
  )
}

function OverviewMetricToggle({
  id,
  label,
  selected,
  onToggle,
}: {
  id: OverviewMetricId
  label: string
  selected: boolean
  onToggle: (id: OverviewMetricId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        selected ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {selected ? <span className="text-[10px] leading-none">✓</span> : null}
      </span>
      {label}
    </button>
  )
}

export function OverviewReportContent() {
  const defaultRange = useMemo(() => currentYearRange(), [])
  const [fromMonth, setFromMonth] = useState(defaultRange.from)
  const [toMonth, setToMonth] = useState(defaultRange.to)
  const [appliedFrom, setAppliedFrom] = useState(defaultRange.from)
  const [appliedTo, setAppliedTo] = useState(defaultRange.to)
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<ProfitOverviewReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterReady, setFilterReady] = useState(false)
  const [savingFilter, setSavingFilter] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(() => new Set())
  const [teamAppPageByTeamId, setTeamAppPageByTeamId] = useState<Record<string, number>>({})
  const [selectedMetrics, setSelectedMetrics] = useState<OverviewMetricId[]>(DEFAULT_OVERVIEW_METRICS)

  const visibleMetrics = useMemo(
    () => OVERVIEW_METRICS.filter((metric) => selectedMetrics.includes(metric.id)),
    [selectedMetrics],
  )

  const colsPerMonth = visibleMetrics.length * 3

  const toggleMetric = (metricId: OverviewMetricId) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricId)) {
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== metricId)
      }
      return [...prev, metricId]
    })
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(current - index))
  }, [])

  const selectYearValue = resolveYearInOptions(selectedYear, yearOptions)

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(selectYearValue)
    }
  }, [selectedYear, selectYearValue, yearOptions])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await reportsApi.getProfitOverview({
        from: appliedFrom,
        to: appliedTo,
      })
      setData(response)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load overview report"
      toast.error(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [appliedFrom, appliedTo])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await reportsApi.getOverviewFilter()
        if (cancelled) return
        const saved = parseOverviewFilter(raw)
        if (!saved) return
        const year = resolveYearInOptions(saved.selectedYear ?? saved.from.slice(0, 4), yearOptions)
        setFromMonth(saved.from)
        setToMonth(saved.to)
        setAppliedFrom(saved.from)
        setAppliedTo(saved.to)
        setSelectedYear(year)
        setSelectedTeamIds(saved.teamIds)
      } catch {
        // Không chặn trang nếu chưa có filter đã lưu hoặc API lỗi.
      } finally {
        if (!cancelled) setFilterReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [yearOptions])

  useEffect(() => {
    if (!filterReady) return
    void loadData()
  }, [loadData, filterReady])

  const applyRange = () => {
    if (fromMonth > toMonth) {
      toast.error("From month must be on or before to month.")
      return
    }
    setAppliedFrom(fromMonth)
    setAppliedTo(toMonth)
    setSelectedYear(fromMonth.slice(0, 4))
  }

  const saveFilter = async () => {
    if (fromMonth > toMonth) {
      toast.error("From month must be on or before to month.")
      return
    }
    setSavingFilter(true)
    try {
      await reportsApi.saveOverviewFilter({
        from: fromMonth,
        to: toMonth,
        selectedYear,
        teamIds: selectedTeamIds,
      })
      toast.success("Filter saved to your settings.")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save filter"
      toast.error(message)
    } finally {
      setSavingFilter(false)
    }
  }

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    const from = `${year}-01`
    const to = `${year}-12`
    setFromMonth(from)
    setToMonth(to)
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const months = data?.months ?? []
  const allTeams = data?.teams ?? []

  const teamOptions = useMemo(
    () =>
      allTeams.map((team) => ({
        value: team.teamId,
        label: team.teamName,
      })),
    [allTeams],
  )

  const teams = useMemo(() => {
    if (selectedTeamIds.length === 0) return allTeams
    const selected = new Set(selectedTeamIds)
    return allTeams.filter((team) => selected.has(team.teamId))
  }, [allTeams, selectedTeamIds])

  useEffect(() => {
    if (allTeams.length === 0) return
    const validIds = new Set(allTeams.map((team) => team.teamId))
    setSelectedTeamIds((prev) => prev.filter((id) => validIds.has(id)))
    setExpandedTeamIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (validIds.has(id)) next.add(id)
      }
      return next
    })
  }, [allTeams])

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
        setTeamAppPageByTeamId((pages) => ({ ...pages, [teamId]: 1 }))
      }
      return next
    })
  }

  const setTeamAppPage = (teamId: string, page: number) => {
    setTeamAppPageByTeamId((prev) => ({ ...prev, [teamId]: page }))
  }

  useEffect(() => {
    if (allTeams.length === 0) return
    setTeamAppPageByTeamId((prev) => {
      const next: Record<string, number> = {}
      for (const team of allTeams) {
        const appCount = team.apps?.length ?? 0
        const maxPage = Math.max(1, Math.ceil(appCount / APPS_PER_PAGE))
        const current = prev[team.teamId] ?? 1
        next[team.teamId] = Math.min(Math.max(1, current), maxPage)
      }
      return next
    })
  }, [allTeams])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            KPI plan vs actual by team (revenue, cost, profit). Expand a team for per-app detail.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void loadData()}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="overview-year">Year</Label>
            <Select value={selectYearValue} onValueChange={handleYearChange}>
              <SelectTrigger id="overview-year" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overview-from">From</Label>
            <Input
              id="overview-from"
              type="month"
              value={fromMonth || defaultRange.from}
              onChange={(e) => setFromMonth(e.target.value || defaultRange.from)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overview-to">To</Label>
            <Input
              id="overview-to"
              type="month"
              value={toMonth || defaultRange.to}
              onChange={(e) => setToMonth(e.target.value || defaultRange.to)}
              className="w-[160px]"
            />
          </div>
          <div className="min-w-[240px] flex-1 space-y-2">
            <Label htmlFor="overview-teams">Teams</Label>
            <StringMultiSelectCombobox
              id="overview-teams"
              options={teamOptions}
              values={selectedTeamIds}
              onChange={setSelectedTeamIds}
              disabled={loading || teamOptions.length === 0}
              placeholder="All teams"
              searchPlaceholder="Search teams..."
              emptyMessage="No teams found."
              triggerClassName="min-w-[240px]"
            />
          </div>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={applyRange}>
            Apply
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={savingFilter}
                onClick={() => void saveFilter()}
                aria-label="Save filter"
              >
                {savingFilter ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save current filter to your settings</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : allTeams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No teams available for this period.
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No teams match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_18rem]">
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="p-0">
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                Last update at:{" "}
                {data?.lastUpdatedAt ? (
                  <span className="text-slate-600">{formatLastUpdatedAt(data.lastUpdatedAt)}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </p>
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead
                        rowSpan={3}
                        className="sticky left-0 z-20 min-w-[360px] border-r bg-slate-50 align-bottom"
                      >
                        App
                      </TableHead>
                      {months.map((month) => (
                        <TableHead
                          key={month}
                          colSpan={colsPerMonth}
                          className="border-r text-center text-xs font-semibold text-slate-700"
                        >
                          {formatMonthLabel(month)}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      {months.map((month) =>
                        visibleMetrics.map((metric, metricIndex) => (
                          <TableHead
                            key={`${month}-${metric.id}-group`}
                            colSpan={3}
                            className={cn(
                              "border-b text-center text-xs font-medium text-slate-600",
                              metricIndex === visibleMetrics.length - 1 && "border-r",
                            )}
                          >
                            {metric.label}
                          </TableHead>
                        )),
                      )}
                    </TableRow>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                      {months.map((month) =>
                        visibleMetrics.map((metric, metricIndex) => (
                          <Fragment key={`${month}-${metric.id}-subheads`}>
                            <TableHead className="min-w-[80px] text-right text-xs text-slate-500">
                              Plan
                            </TableHead>
                            <TableHead className="min-w-[80px] text-right text-xs text-slate-500">
                              Actual
                            </TableHead>
                            <TableHead
                              className={cn(
                                "min-w-[56px] text-right text-xs text-slate-500",
                                metricIndex === visibleMetrics.length - 1 && "border-r",
                              )}
                            >
                              %
                            </TableHead>
                          </Fragment>
                        )),
                      )}
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {teams.map((team) => {
                    const apps = team.apps ?? []
                    const canExpand = apps.length > 0
                    const expanded = expandedTeamIds.has(team.teamId)
                    const appPage = teamAppPageByTeamId[team.teamId] ?? 1
                    const totalAppPages = Math.max(1, Math.ceil(apps.length / APPS_PER_PAGE))
                    const safeAppPage = Math.min(appPage, totalAppPages)
                    const paginatedApps = apps.slice(
                      (safeAppPage - 1) * APPS_PER_PAGE,
                      safeAppPage * APPS_PER_PAGE,
                    )

                    return (
                      <Fragment key={team.teamId}>
                        <TableRow className="hover:bg-slate-50/60">
                          <TableCell className="sticky left-0 z-10 border-r bg-white py-2 font-semibold text-slate-900">
                            <div className="flex items-center gap-1">
                              {canExpand ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => toggleTeamExpanded(team.teamId)}
                                  aria-expanded={expanded}
                                  aria-label={
                                    expanded
                                      ? `Collapse apps for ${team.teamName}`
                                      : `Expand apps for ${team.teamName}`
                                  }
                                >
                                  {expanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
                              )}
                              <span>{team.teamName}</span>
                            </div>
                          </TableCell>
                          <OverviewMonthCells
                            monthKeys={months}
                            months={team.months}
                            selectedMetrics={visibleMetrics.map((m) => m.id)}
                          />
                        </TableRow>
                        {expanded &&
                          paginatedApps.map((app: ProfitOverviewAppRow) => (
                            <TableRow
                              key={`${team.teamId}-${app.appId}`}
                              className="bg-slate-50/40 hover:bg-slate-50/60"
                            >
                              <TableCell className="sticky left-0 z-10 border-r bg-slate-50/80 py-2 pl-12">
                                <div className="flex min-w-0 items-center justify-between gap-3">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                      {app.appIconUri ? (
                                        <AvatarImage
                                          src={app.appIconUri}
                                          alt={app.appLabel}
                                          className="rounded-lg object-cover"
                                        />
                                      ) : null}
                                      <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
                                        {app.appLabel?.trim()?.slice(0, 1)?.toUpperCase() || "A"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-slate-900">
                                        {app.appLabel}
                                      </div>
                                      <div className="truncate text-xs text-slate-500">
                                        <span className="font-mono">{app.appStoreId || "—"}</span>
                                        <span className="mx-1">·</span>
                                        <span className="font-mono">{app.appId}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {renderPlatformBadge(app.appPlatform ?? "")}
                                  </div>
                                </div>
                              </TableCell>
                              <OverviewMonthCells
                                monthKeys={months}
                                months={app.months}
                                selectedMetrics={visibleMetrics.map((m) => m.id)}
                              />
                            </TableRow>
                          ))}
                        {expanded && apps.length > APPS_PER_PAGE ? (
                          <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                            <TableCell className="sticky left-0 z-10 border-r bg-slate-50/95 py-2 pl-12 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]">
                              <TeamAppsPager
                                currentPage={safeAppPage}
                                totalPages={totalAppPages}
                                totalItems={apps.length}
                                onPageChange={(page) => setTeamAppPage(team.teamId, page)}
                              />
                            </TableCell>
                            {months.map((month) => (
                              <TableCell
                                key={`${team.teamId}-pager-${month}`}
                                colSpan={colsPerMonth}
                                className="border-r bg-slate-50/30"
                              />
                            ))}
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-[320px] flex-col border-slate-200 xl:min-h-0">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-medium">Metrics</CardTitle>
              <CardDescription>Choose metrics shown per month (Plan / Actual / %)</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <ScrollArea className="max-h-[min(70vh,640px)] flex-1">
                <div className="space-y-1 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                    Metrics ({visibleMetrics.length})
                  </div>
                  {OVERVIEW_METRICS.map((metric) => (
                    <OverviewMetricToggle
                      key={metric.id}
                      id={metric.id}
                      label={metric.label}
                      selected={selectedMetrics.includes(metric.id)}
                      onToggle={toggleMetric}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
