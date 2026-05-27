"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { format, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import { Loader2, RefreshCw } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { reportsApi } from "@/lib/api/services"
import type { ProfitOverviewMonthCell, ProfitOverviewReportResponse } from "@/types/reports"

function currentYearRange() {
  const year = new Date().getFullYear()
  return { from: `${year}-01`, to: `${year}-12` }
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

function getCell(row: ProfitOverviewReportResponse["teams"][number], month: string): ProfitOverviewMonthCell {
  return (
    row.months[month] ?? {
      plannedProfit: 0,
      actualProfit: 0,
      completionPercent: null,
    }
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(current - index))
  }, [])

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
    void loadData()
  }, [loadData])

  const applyRange = () => {
    if (fromMonth > toMonth) {
      toast.error("From month must be on or before to month.")
      return
    }
    setAppliedFrom(fromMonth)
    setAppliedTo(toMonth)
    setSelectedYear(fromMonth.slice(0, 4))
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
  const teams = data?.teams ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            KPI profit plan vs actual by team (team lead apps). Each month shows Plan, Actual, and %.
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
            <Select value={selectedYear} onValueChange={handleYearChange}>
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
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overview-to">To</Label>
            <Input
              id="overview-to"
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={applyRange}>
            Apply
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : teams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No teams available for this period.
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
                      Team / Leader
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
                    const leaderLabel =
                      team.leadName?.trim() ||
                      team.leadEmail?.trim() ||
                      "No team lead"

                    return (
                      <Fragment key={team.teamId}>
                        <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                          <TableCell className="sticky left-0 z-10 border-r bg-slate-50 py-2 font-semibold text-slate-900">
                            {team.teamName}
                          </TableCell>
                          {months.map((month) => (
                            <TableCell
                              key={`${team.teamId}-${month}-spacer`}
                              colSpan={3}
                              className="border-r bg-slate-50"
                            />
                          ))}
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50">
                          <TableCell className="sticky left-0 z-10 border-r bg-white py-2 pl-6 text-sm text-slate-700">
                            {leaderLabel}
                          </TableCell>
                          {months.map((month) => {
                            const cell = getCell(team, month)
                            return (
                              <Fragment key={`${team.teamId}-${month}`}>
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
                        </TableRow>
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
