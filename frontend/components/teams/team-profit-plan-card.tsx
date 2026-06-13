"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addMonths, format, parse } from "date-fns"
import { toast } from "sonner"
import { RevenuePlanAppCell } from "@/components/organizations/revenue-plan-app-cell"
import { RevenuePlanPlannedCell } from "@/components/organizations/revenue-plan-planned-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { canEditTeamRevenuePlan } from "@/lib/revenue-plan/team-revenue-plan-permissions"
import { REVENUE_PLAN_COLUMNS } from "@/lib/revenue-plan/revenue-plan-column-config"
import {
  authApi,
  teamProfitApi,
  type TeamMonthlyProfitPlan,
} from "@/lib/api/services"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, Target } from "lucide-react"

interface TeamProfitPlanCardProps {
  teamId: string
}

const EMPTY_PLAN_ID = "00000000-0000-0000-0000-000000000000"
const REVENUE_COLUMNS = REVENUE_PLAN_COLUMNS.filter((column) => column.group === "revenue")
const PERFORMANCE_COLUMNS = REVENUE_PLAN_COLUMNS.filter((column) => column.group === "performance")
const METRIC_COLUMN_COUNT = REVENUE_PLAN_COLUMNS.length

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value ?? 0)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function hasPlanData(plan?: TeamMonthlyProfitPlan | null): boolean {
  if (!plan) return false
  if (plan.id && plan.id !== EMPTY_PLAN_ID) return true
  return plan.plannedRevenue > 0
}

function getNetProfitMargin(actualProfit: number, actualRevenue: number): number | null {
  if (actualRevenue <= 0) return null
  return (actualProfit / actualRevenue) * 100
}

function formatNetProfitMarginDisplay(margin: number | null): string {
  if (margin == null) return "—"
  return `${Math.round(margin)}%`
}

function formatNetProfitMarginTooltip(margin: number | null): string {
  if (margin == null) return "No revenue"
  return `${margin.toFixed(2)}%`
}

function getStatus(completion?: number | null) {
  if (completion == null) return { label: "No target", className: "bg-slate-100 text-slate-600" }
  if (completion >= 100) return { label: "Achieved", className: "bg-green-100 text-green-700" }
  if (completion >= 80) return { label: "On track", className: "bg-blue-100 text-blue-700" }
  return { label: "Behind", className: "bg-amber-100 text-amber-700" }
}

function parseMonthValue(month: string): Date {
  const parsed = parse(month, "yyyy-MM", new Date())
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function shiftMonth(month: string, delta: number): string {
  return format(addMonths(parseMonthValue(month), delta), "yyyy-MM")
}

function TeamProfitPlanMetricCell({
  columnId,
  plan,
  month,
  hasPlan,
  netProfitMargin,
  canEdit,
  teamId,
  onPlannedSaved,
}: {
  columnId: (typeof REVENUE_PLAN_COLUMNS)[number]["id"]
  plan: TeamMonthlyProfitPlan
  month: string
  hasPlan: boolean
  netProfitMargin: number | null
  canEdit: boolean
  teamId: string
  onPlannedSaved: (appStoreId: string, month: string, plannedRevenue: number) => void
}) {
  const column = REVENUE_PLAN_COLUMNS.find((item) => item.id === columnId)
  if (!column) return null

  const status = getStatus(hasPlan ? plan.completionPercent : null)
  const cellClassName = cn(column.minWidthClass, "text-right text-sm tabular-nums")

  switch (columnId) {
    case "planned":
      return (
        <RevenuePlanPlannedCell
          teamId={teamId}
          appStoreId={plan.appStoreId}
          month={month}
          plannedRevenue={plan.plannedRevenue}
          hasPlan={hasPlan}
          canEdit={canEdit}
          className={column.minWidthClass}
          onSaved={onPlannedSaved}
        />
      )
    case "actual":
      return <TableCell className={cellClassName}>{formatCurrency(plan.actualRevenue)}</TableCell>
    case "completion":
      return (
        <TableCell className={cn(column.minWidthClass, "text-right")}>
          {hasPlan ? (
            <Badge className={cn("w-fit", status.className)} variant="secondary">
              {plan.completionPercent == null ? "—" : `${plan.completionPercent.toFixed(2)}%`}
            </Badge>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </TableCell>
      )
    case "actualCost":
      return <TableCell className={cellClassName}>{formatCurrency(plan.actualCost)}</TableCell>
    case "actualProfit":
      return <TableCell className={cellClassName}>{formatCurrency(plan.actualProfit)}</TableCell>
    case "netProfitMargin":
      return (
        <TableCell className={cellClassName}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
                {formatNetProfitMarginDisplay(netProfitMargin)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{formatNetProfitMarginTooltip(netProfitMargin)}</TooltipContent>
          </Tooltip>
        </TableCell>
      )
    default:
      return null
  }
}

export function TeamProfitPlanCard({ teamId }: TeamProfitPlanCardProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    let cancelled = false

    const resolveCanEdit = (user: ReturnType<typeof getCurrentUser>) => {
      if (!cancelled) {
        setCanEdit(canEditTeamRevenuePlan(teamId, user))
      }
    }

    resolveCanEdit(getCurrentUser())

    void authApi.getCurrentUser().then((response) => {
      if (response.success && response.data) {
        resolveCanEdit({ teams: response.data.teams })
      }
    })

    return () => {
      cancelled = true
    }
  }, [teamId])

  const handlePlannedRevenueSaved = useCallback((appStoreId: string, savedMonth: string, plannedRevenue: number) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.appStoreId !== appStoreId || plan.month !== savedMonth) return plan
        const completion =
          plannedRevenue > 0 ? Math.round((plan.actualRevenue / plannedRevenue) * 10000) / 100 : null
        return {
          ...plan,
          plannedRevenue,
          completionPercent: completion,
        }
      }),
    )
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const monthPlans = await teamProfitApi.getPlans(teamId, { from: month, to: month })
      setPlans(monthPlans)
    } catch (err) {
      console.error("Failed to load team revenue plans:", err)
      setPlans([])
      toast.error("Failed to load team revenue plans")
    } finally {
      setLoading(false)
    }
  }, [teamId, month])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const totals = useMemo(() => {
    const plannedRows = plans.filter(hasPlanData)
    const planned = plannedRows.reduce((sum, plan) => sum + plan.plannedRevenue, 0)
    const actualRevenue = plans.reduce((sum, plan) => sum + plan.actualRevenue, 0)
    const actualCost = plans.reduce((sum, plan) => sum + plan.actualCost, 0)
    const actualProfit = plans.reduce((sum, plan) => sum + plan.actualProfit, 0)
    const completion = planned > 0 ? Math.round((actualRevenue / planned) * 10000) / 100 : null
    const netProfitMargin = getNetProfitMargin(actualProfit, actualRevenue)
    return { planned, actualRevenue, actualCost, actualProfit, completion, netProfitMargin }
  }, [plans])

  const summaryStatus = getStatus(totals.completion)
  const currentMonth = format(new Date(), "yyyy-MM")
  const canGoNextMonth = month < currentMonth

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-blue-600" />
              Monthly Revenue Plan
            </CardTitle>
            <CardDescription>
              Monthly revenue targets per app for the selected month.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "Collapse revenue plan" : "Expand revenue plan"}
            aria-expanded={expanded}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <div className="hidden min-w-0 lg:block" aria-hidden />
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 bg-white"
                onClick={() => setMonth((current) => shiftMonth(current, -1))}
                aria-label="Previous month"
                title="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-1.5">
                <Label htmlFor="team-profit-month" className="sr-only">
                  Month
                </Label>
                <Input
                  id="team-profit-month"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="w-[148px] bg-white text-center"
                />
              </div>
              {canGoNextMonth ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-white"
                  onClick={() => setMonth((current) => shiftMonth(current, 1))}
                  aria-label="Next month"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex lg:justify-end">
              <Badge className={cn("w-fit", summaryStatus.className)}>{summaryStatus.label}</Badge>
            </div>
          </div>
        ) : null}
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading revenue plans...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead rowSpan={2} className="min-w-[220px] align-bottom">
                      App
                    </TableHead>
                    <TableHead
                      colSpan={REVENUE_COLUMNS.length}
                      className="border-l border-slate-200 bg-blue-50/80 text-center text-xs font-semibold text-blue-700"
                    >
                      Revenue
                    </TableHead>
                    <TableHead
                      colSpan={PERFORMANCE_COLUMNS.length}
                      className="border-l border-slate-200 bg-emerald-50/80 text-center text-xs font-semibold text-emerald-700"
                    >
                      Performance
                    </TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {REVENUE_PLAN_COLUMNS.map((column, index) => (
                      <TableHead
                        key={column.id}
                        className={cn(
                          column.minWidthClass,
                          "text-right text-xs font-medium text-slate-600",
                          index === 0 && "border-l border-slate-200",
                          index === REVENUE_PLAN_COLUMNS.length - 1 && "border-r border-slate-200",
                        )}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={1 + METRIC_COLUMN_COUNT}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No revenue plans for this month yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      <TableRow className="bg-slate-50/90 font-semibold hover:bg-slate-50/90">
                        <TableCell className="text-sm text-slate-900">Total</TableCell>
                        {REVENUE_PLAN_COLUMNS.map((column) => {
                          const cellClassName = cn(column.minWidthClass, "text-right text-sm tabular-nums")
                          switch (column.id) {
                            case "planned":
                              return (
                                <TableCell key={column.id} className={cellClassName}>
                                  {formatCurrency(totals.planned)}
                                </TableCell>
                              )
                            case "actual":
                              return (
                                <TableCell key={column.id} className={cellClassName}>
                                  {formatCurrency(totals.actualRevenue)}
                                </TableCell>
                              )
                            case "completion": {
                              const status = getStatus(totals.completion)
                              return (
                                <TableCell key={column.id} className={cn(column.minWidthClass, "text-right")}>
                                  {totals.completion == null ? (
                                    <span className="text-sm font-normal text-slate-400">—</span>
                                  ) : (
                                    <Badge className={cn("w-fit font-semibold", status.className)} variant="secondary">
                                      {totals.completion.toFixed(2)}%
                                    </Badge>
                                  )}
                                </TableCell>
                              )
                            }
                            case "actualCost":
                              return (
                                <TableCell key={column.id} className={cellClassName}>
                                  {formatCurrency(totals.actualCost)}
                                </TableCell>
                              )
                            case "actualProfit":
                              return (
                                <TableCell key={column.id} className={cellClassName}>
                                  {formatCurrency(totals.actualProfit)}
                                </TableCell>
                              )
                            case "netProfitMargin":
                              return (
                                <TableCell key={column.id} className={cellClassName}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
                                        {formatNetProfitMarginDisplay(totals.netProfitMargin)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {formatNetProfitMarginTooltip(totals.netProfitMargin)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              )
                            default:
                              return null
                          }
                        })}
                      </TableRow>
                      {plans.map((plan) => {
                        const hasPlan = hasPlanData(plan)
                        const netProfitMargin = getNetProfitMargin(plan.actualProfit, plan.actualRevenue)
                        const rowKey = `${plan.month}-${plan.appStoreId || plan.admobAppId || plan.appLabel}`
                        return (
                          <TableRow key={rowKey}>
                            <TableCell>
                              <RevenuePlanAppCell
                                appLabel={plan.appLabel}
                                appStoreId={plan.appStoreId}
                                admobAppId={plan.admobAppId}
                                appPlatform={plan.appPlatform}
                                appIconUri={plan.appIconUri}
                              />
                            </TableCell>
                            {REVENUE_PLAN_COLUMNS.map((column) => (
                              <TeamProfitPlanMetricCell
                                key={column.id}
                                columnId={column.id}
                                plan={plan}
                                month={month}
                                hasPlan={hasPlan}
                                netProfitMargin={netProfitMargin}
                                canEdit={canEdit}
                                teamId={teamId}
                                onPlannedSaved={handlePlannedRevenueSaved}
                              />
                            ))}
                          </TableRow>
                        )
                      })}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  )
}
