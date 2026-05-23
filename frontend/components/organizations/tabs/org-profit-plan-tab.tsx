"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Loader2, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  organizationsApi,
  type OrgTeam,
  type TeamMonthlyProfitPlan,
} from "@/lib/api/services"

interface OrgProfitPlanTabProps {
  orgId: string
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

export function OrgProfitPlanTab({ orgId }: OrgProfitPlanTabProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [teamFilter, setTeamFilter] = useState("all")
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamList, planList] = await Promise.all([
        organizationsApi.getTeams(orgId),
        organizationsApi.getProfitPlans(orgId, {
          from: month,
          to: month,
          teamId: teamFilter === "all" ? undefined : teamFilter,
        }),
      ])
      setTeams(teamList)
      setPlans(planList)
    } catch (err) {
      console.error("Failed to load organization profit plans:", err)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [orgId, month, teamFilter])

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

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Target className="h-5 w-5 text-blue-600" />
              Profit Plan
            </CardTitle>
            <CardDescription>
              Monthly profit targets by app across teams in this organization.
            </CardDescription>
          </div>
          <Badge className={cn("w-fit", summaryStatus.className)}>{summaryStatus.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="org-profit-month">Month</Label>
            <Input
              id="org-profit-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-[180px] bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-profit-team">Team</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger id="org-profit-team" className="w-[220px] bg-white">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading profit plans...
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Month</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Assigned User</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                      No profit plans found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => {
                    const status = getStatus(plan.completionPercent)
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="whitespace-nowrap text-sm text-slate-700">{plan.month}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">{plan.teamName}</TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">{plan.appLabel}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {plan.appPlatform ?? "Unknown"} · {plan.appStoreId || plan.appId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {plan.assignedUserName ?? plan.assignedUserEmail ?? "—"}
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
        )}
      </CardContent>
    </Card>
  )
}
