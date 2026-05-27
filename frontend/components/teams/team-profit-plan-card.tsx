"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addMonths, format, parse } from "date-fns"
import { toast } from "sonner"
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  teamProfitApi,
  type TeamMonthlyProfitPlan,
} from "@/lib/api/services"
import { ChevronLeft, ChevronRight, Loader2, Target } from "lucide-react"

interface TeamProfitPlanCardProps {
  teamId: string
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value ?? 0)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export function TeamProfitPlanCard({ teamId }: TeamProfitPlanCardProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const monthPlans = await teamProfitApi.getPlans(teamId, { from: month, to: month })
      setPlans(monthPlans)
    } catch (err) {
      console.error("Failed to load team profit plans:", err)
      setPlans([])
      toast.error("Failed to load team profit plans")
    } finally {
      setLoading(false)
    }
  }, [teamId, month])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const totals = useMemo(() => {
    const planned = plans.reduce((sum, plan) => sum + plan.plannedProfit, 0)
    const actual = plans.reduce((sum, plan) => sum + plan.actualProfit, 0)
    const completion = planned > 0 ? Math.round((actual / planned) * 10000) / 100 : null
    return { planned, actual, completion }
  }, [plans])

  const summaryStatus = getStatus(totals.completion)
  const currentMonth = format(new Date(), "yyyy-MM")
  const canGoNextMonth = month < currentMonth

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-blue-600" />
              Monthly Profit Plan
            </CardTitle>
            <CardDescription>
              One planned profit target per app for the selected month.
            </CardDescription>
          </div>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading profit plans...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Total Planned</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(totals.planned)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Total Actual</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(totals.actual)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Overall Completion</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {totals.completion == null ? "—" : `${totals.completion.toFixed(2)}%`}
                </p>
                <Progress value={Math.max(0, Math.min(100, totals.completion ?? 0))} className="mt-3" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>App</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        No profit plans for this month yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => {
                      const status = getStatus(plan.completionPercent)
                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{plan.appLabel}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {plan.appPlatform ?? "Unknown"} · {plan.appStoreId || plan.admobAppId || "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(plan.plannedProfit)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(plan.actualProfit)}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={cn("w-fit", status.className)} variant="secondary">
                              {plan.completionPercent == null ? "—" : `${plan.completionPercent.toFixed(2)}%`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}

                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
