"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  teamProfitApi,
  type TeamMonthlyProfitPlan,
  type TeamProfitAppOption,
  type TeamProfitMemberOption,
} from "@/lib/api/services"
import { Loader2, Plus, Target, Trash2, UserPlus } from "lucide-react"

interface TeamProfitPlanCardProps {
  teamId: string
}

interface DraftPlanRow {
  appId: string
  plannedProfit: string
  assignedUserId: string
}

const EMPTY_DRAFT: DraftPlanRow = {
  appId: "",
  plannedProfit: "",
  assignedUserId: "none",
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

export function TeamProfitPlanCard({ teamId }: TeamProfitPlanCardProps) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [appOptions, setAppOptions] = useState<TeamProfitAppOption[]>([])
  const [memberOptions, setMemberOptions] = useState<TeamProfitMemberOption[]>([])
  const [draft, setDraft] = useState<DraftPlanRow>(EMPTY_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(() => new Set())
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState("none")
  const [assigning, setAssigning] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [options, members, monthPlans] = await Promise.all([
        teamProfitApi.getAppOptions(teamId),
        teamProfitApi.getMemberOptions(teamId),
        teamProfitApi.getPlans(teamId, { from: month, to: month }),
      ])
      setAppOptions(options)
      setMemberOptions(members)
      setPlans(monthPlans)
      setSelectedPlanIds(new Set())
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

  const usedAppIds = useMemo(() => new Set(plans.map((plan) => plan.appId)), [plans])
  const availableApps = useMemo(
    () => appOptions.filter((app) => !usedAppIds.has(app.appId)),
    [appOptions, usedAppIds],
  )

  const totals = useMemo(() => {
    const planned = plans.reduce((sum, plan) => sum + plan.plannedProfit, 0)
    const actual = plans.reduce((sum, plan) => sum + plan.actualProfit, 0)
    const completion = planned > 0 ? Math.round((actual / planned) * 10000) / 100 : null
    return { planned, actual, completion }
  }, [plans])

  const summaryStatus = getStatus(totals.completion)

  const selectedPlans = useMemo(
    () => plans.filter((plan) => selectedPlanIds.has(plan.id)),
    [plans, selectedPlanIds],
  )
  const allPlansSelected = plans.length > 0 && selectedPlans.length === plans.length

  const togglePlanSelection = (planId: string, checked: boolean) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(planId)
      else next.delete(planId)
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedPlanIds(new Set())
      return
    }
    setSelectedPlanIds(new Set(plans.map((plan) => plan.id)))
  }

  const handleBulkAssignUser = async () => {
    if (selectedPlans.length === 0) return
    setAssigning(true)
    try {
      const result = await teamProfitApi.bulkAssignUser(teamId, {
        assignedUserId: assignUserId === "none" ? null : assignUserId,
        items: selectedPlans.map((plan) => ({ month: plan.month, appId: plan.appId })),
      })

      if (result.failed > 0) {
        toast.error(`${result.succeeded} assigned, ${result.failed} failed`)
      } else {
        toast.success(
          assignUserId === "none"
            ? `Unassigned user from ${result.succeeded} plan(s)`
            : `Assigned user to ${result.succeeded} plan(s)`,
        )
      }

      setAssignOpen(false)
      setAssignUserId("none")
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign user"
      toast.error(message)
    } finally {
      setAssigning(false)
    }
  }

  const handleSaveDraft = async () => {
    const value = Number(draft.plannedProfit)
    if (!draft.appId) {
      toast.error("Select an app")
      return
    }
    if (Number.isNaN(value) || value < 0) {
      toast.error("Planned profit must be a non-negative number")
      return
    }

    setSaving(true)
    try {
      await teamProfitApi.upsertPlan(teamId, month, {
        appId: draft.appId,
        plannedProfit: value,
        assignedUserId: draft.assignedUserId === "none" ? null : draft.assignedUserId,
      })
      setDraft(EMPTY_DRAFT)
      await loadData()
      toast.success("Profit plan saved")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profit plan"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (appId: string) => {
    setDeletingAppId(appId)
    try {
      await teamProfitApi.deletePlan(teamId, month, appId)
      await loadData()
      toast.success("Profit plan removed")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete profit plan"
      toast.error(message)
    } finally {
      setDeletingAppId(null)
    }
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Target className="h-4 w-4 text-blue-600" />
              Monthly Profit Plan
            </CardTitle>
            <CardDescription>
              One planned profit target per app for the selected month.
            </CardDescription>
          </div>
          <Badge className={cn("w-fit", summaryStatus.className)}>{summaryStatus.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[10rem_1fr] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="team-profit-month">Month</Label>
            <Input
              id="team-profit-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="bg-white"
            />
          </div>
        </div>

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

            {selectedPlans.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <span className="text-sm text-blue-900">{selectedPlans.length} plan(s) selected</span>
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setAssignUserId(memberOptions[0]?.userId ?? "none")
                    setAssignOpen(true)
                  }}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Assign user
                </Button>
                <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => setSelectedPlanIds(new Set())}>
                  Clear
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPlansSelected}
                        onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                        disabled={plans.length === 0}
                        aria-label="Select all plans"
                      />
                    </TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Assigned User</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        No profit plans for this month yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => {
                      const status = getStatus(plan.completionPercent)
                      const isSelected = selectedPlanIds.has(plan.id)
                      return (
                        <TableRow key={plan.id} data-state={isSelected ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => togglePlanSelection(plan.id, checked === true)}
                              aria-label={`Select ${plan.appLabel}`}
                            />
                          </TableCell>
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
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-600"
                              disabled={deletingAppId === plan.appId}
                              onClick={() => void handleDelete(plan.appId)}
                            >
                              {deletingAppId === plan.appId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}

                  <TableRow className="bg-slate-50/60">
                    <TableCell />
                    <TableCell>
                      <Select
                        value={draft.appId || "none"}
                        onValueChange={(value) =>
                          setDraft((prev) => ({ ...prev, appId: value === "none" ? "" : value }))
                        }
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Select app" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>
                            Select app
                          </SelectItem>
                          {availableApps.map((app) => (
                            <SelectItem key={app.appId} value={app.appId}>
                              {app.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.assignedUserId}
                        onValueChange={(value) => setDraft((prev) => ({ ...prev, assignedUserId: value }))}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Assign user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {memberOptions.map((member) => (
                            <SelectItem key={member.userId} value={member.userId}>
                              {member.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={draft.plannedProfit}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, plannedProfit: event.target.value }))
                        }
                        placeholder="0.00"
                        className="h-9 bg-white text-right"
                      />
                    </TableCell>
                    <TableCell colSpan={2} />
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        className="h-9 w-9 bg-blue-600 hover:bg-blue-700"
                        disabled={saving || availableApps.length === 0}
                        onClick={() => void handleSaveDraft()}
                        title="Add plan"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign user to plans</DialogTitle>
            <DialogDescription>
              Assign a team member to {selectedPlans.length} selected profit plan(s) for {month}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-assign-user">Team member</Label>
            <Select value={assignUserId} onValueChange={setAssignUserId}>
              <SelectTrigger id="bulk-assign-user" className="bg-white">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {memberOptions.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleBulkAssignUser()} disabled={assigning || selectedPlans.length === 0}>
              {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
