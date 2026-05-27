"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { format, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  OverviewReportFilter,
  ProfitOverviewAppRow,
  ProfitOverviewMonthCell,
  ProfitOverviewReportResponse,
} from "@/types/reports"

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

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

function formatMonthLabel(month: string): string {
  try {
    return format(parse(month, "yyyy-MM", new Date()), "MMM yyyy", { locale: enUS })
  } catch {
    return month
  }
}

function getCell(
  months: Record<string, ProfitOverviewMonthCell>,
  month: string,
): ProfitOverviewMonthCell {
  return (
    months[month] ?? {
      plannedProfit: 0,
      actualProfit: 0,
      completionPercent: null,
    }
  )
}

function OverviewMonthCells({
  months,
  monthKeys,
}: {
  months: Record<string, ProfitOverviewMonthCell>
  monthKeys: string[]
}) {
  return (
    <>
      {monthKeys.map((month) => {
        const cell = getCell(months, month)
        return (
          <Fragment key={month}>
            <TableCell className="text-right text-sm tabular-nums text-slate-700">
              {formatCurrency(cell.plannedProfit)}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-slate-700">
              {formatCurrency(cell.actualProfit)}
            </TableCell>
            <TableCell
              className={cn(
                "border-r text-right text-sm tabular-nums",
                getPercentClass(cell.completionPercent),
              )}
            >
              {formatPercent(cell.completionPercent)}
            </TableCell>
          </Fragment>
        )
      })}
    </>
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
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            KPI profit plan vs actual by team. Expand a team to see plan and actual per app.
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
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead
                      rowSpan={2}
                      className="sticky left-0 z-20 min-w-[220px] border-r bg-slate-50 align-bottom"
                    >
                      Team
                    </TableHead>
                    {months.map((month) => (
                      <TableHead
                        key={month}
                        colSpan={3}
                        className="border-r text-center text-xs font-semibold text-slate-700"
                      >
                        {formatMonthLabel(month)}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                    {months.map((month) => (
                      <Fragment key={`${month}-subheads`}>
                        <TableHead className="min-w-[88px] text-right text-xs text-slate-500">
                          Plan
                        </TableHead>
                        <TableHead className="min-w-[88px] text-right text-xs text-slate-500">
                          Actual
                        </TableHead>
                        <TableHead className="min-w-[64px] border-r text-right text-xs text-slate-500">
                          %
                        </TableHead>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => {
                    const apps = team.apps ?? []
                    const canExpand = apps.length > 0
                    const expanded = expandedTeamIds.has(team.teamId)

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
                          <OverviewMonthCells monthKeys={months} months={team.months} />
                        </TableRow>
                        {expanded &&
                          apps.map((app: ProfitOverviewAppRow) => (
                            <TableRow
                              key={`${team.teamId}-${app.appId}`}
                              className="bg-slate-50/40 hover:bg-slate-50/60"
                            >
                              <TableCell className="sticky left-0 z-10 border-r bg-slate-50/80 py-2 pl-12 text-sm text-slate-700">
                                {app.appLabel}
                              </TableCell>
                              <OverviewMonthCells monthKeys={months} months={app.months} />
                            </TableRow>
                          ))}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
