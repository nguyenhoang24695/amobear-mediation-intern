"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addMonths, format, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Download, Loader2, Target, Upload, UserPlus } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import {
  organizationsApi,
  type ImportTeamProfitPlansResult,
  type OrgTeam,
  type TeamMonthlyProfitPlan,
} from "@/lib/api/services"

interface OrgProfitPlanTabProps {
  orgId: string
  canManage?: boolean
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

function formatMonthLabel(month: string): string {
  return format(parseMonthValue(month), "MMMM yyyy", { locale: enUS })
}

function isUnassignedPlan(plan: TeamMonthlyProfitPlan) {
  return !plan.teamId
}

export function OrgProfitPlanTab({ orgId, canManage = false }: OrgProfitPlanTabProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [teamFilter, setTeamFilter] = useState("all")
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlans, setAssignPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [assignTeamId, setAssignTeamId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(() => new Set())

  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportTeamProfitPlansResult | null>(null)
  const [exportingTemplate, setExportingTemplate] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const planParams =
        teamFilter === "all"
          ? { from: month, to: month }
          : teamFilter === "unassigned"
            ? { from: month, to: month, unassigned: true }
            : { from: month, to: month, teamId: teamFilter }

      const [teamList, planList] = await Promise.all([
        organizationsApi.getTeams(orgId),
        organizationsApi.getProfitPlans(orgId, planParams),
      ])
      setTeams(teamList)
      setPlans(planList)
      setSelectedPlanIds(new Set())
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

  const openAssignDialog = (plansToAssign: TeamMonthlyProfitPlan[]) => {
    setAssignPlans(plansToAssign)
    const teamIds = [...new Set(plansToAssign.map((p) => p.teamId).filter(Boolean))]
    setAssignTeamId(
      teamIds.length === 1 && teamIds[0] ? teamIds[0]! : teams[0]?.id ?? "",
    )
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (assignPlans.length === 0 || !assignTeamId) return
    setAssigning(true)
    try {
      if (assignPlans.length === 1) {
        const plan = assignPlans[0]
        await organizationsApi.assignProfitPlanTeam(orgId, plan.month, plan.appId, assignTeamId)
        toast({
          title: "Updated",
          description: "Profit plan team has been updated.",
        })
      } else {
        const result = await organizationsApi.bulkAssignProfitPlanTeam(orgId, {
          teamId: assignTeamId,
          items: assignPlans.map((plan) => ({ month: plan.month, appId: plan.appId })),
        })
        if (result.failed > 0) {
          toast({
            title: "Partially assigned",
            description: `${result.succeeded} succeeded, ${result.failed} failed.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Updated",
            description: `${result.succeeded} profit plan team assignment(s) updated.`,
          })
        }
      }

      setAssignOpen(false)
      setAssignPlans([])
      await loadData()
    } catch (err) {
      console.error("Failed to assign profit plan:", err)
      toast({
        title: "Assign failed",
        description: err instanceof Error ? err.message : "Could not assign profit plan to team.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const result = await organizationsApi.importProfitPlans(orgId, importFile)
      setImportResult(result)
      toast({
        title: "Import completed",
        description: `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`,
      })
      await loadData()
    } catch (err) {
      console.error("Failed to import profit plans:", err)
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Could not import profit plans.",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const resetImportDialog = (open: boolean) => {
    setImportOpen(open)
    if (!open) {
      setImportFile(null)
      setImportResult(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleExportTemplate = async () => {
    setExportingTemplate(true)
    try {
      const { blob } = await organizationsApi.exportProfitPlanTemplate(orgId, month)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `profit-plan-template-${month}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      toast({
        title: "Template exported",
        description: `Downloaded profit plan template for ${month}.`,
      })
    } catch (err) {
      console.error("Failed to export profit plan template:", err)
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export profit plan template.",
        variant: "destructive",
      })
    } finally {
      setExportingTemplate(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-6">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 shrink-0 text-blue-600" />
                Profit Plan
              </CardTitle>
              <CardDescription className="mt-1.5">
                Monthly profit targets by app across teams in this organization.
              </CardDescription>
            </div>

            <div className="flex flex-col items-start gap-1 lg:items-center">
              <div className="flex items-center gap-1">
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
                <Input
                  id="org-profit-month"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="h-9 w-[148px] bg-white"
                  aria-label="Select month"
                />
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
              </div>
            </div>

            <div className="flex items-center lg:justify-end">
              <Badge className={cn("w-fit", summaryStatus.className)}>{summaryStatus.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <Label htmlFor="org-profit-team">Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="org-profit-team" className="w-[220px] bg-white">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  <SelectItem value="unassigned">Unassigned Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white"
                  onClick={() => void handleExportTemplate()}
                  disabled={exportingTemplate}
                >
                  {exportingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export template
                </Button>
                <Button type="button" variant="outline" className="bg-white" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Excel
                </Button>
              </div>
            ) : null}
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

          {canManage && selectedPlans.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-sm text-blue-900">{selectedPlans.length} plan(s) selected</span>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => openAssignDialog(selectedPlans)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Assign / change team
              </Button>
              <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => setSelectedPlanIds(new Set())}>
                Clear
              </Button>
            </div>
          ) : null}

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
                    {canManage ? (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allPlansSelected}
                          onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                          disabled={plans.length === 0}
                          aria-label="Select all plans"
                        />
                      </TableHead>
                    ) : null}
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
                      <TableCell
                        colSpan={canManage ? 8 : 7}
                        className="py-10 text-center text-sm text-slate-500"
                      >
                        No profit plans found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => {
                      const status = getStatus(plan.completionPercent)
                      const unassigned = isUnassignedPlan(plan)
                      const isSelected = selectedPlanIds.has(plan.id)
                      return (
                        <TableRow key={plan.id} data-state={isSelected ? "selected" : undefined}>
                          {canManage ? (
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => togglePlanSelection(plan.id, checked === true)}
                                aria-label={`Select ${plan.appLabel}`}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell className="whitespace-nowrap text-sm text-slate-700">{plan.month}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-900">
                            {unassigned ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                Unassigned
                              </Badge>
                            ) : (
                              plan.teamName
                            )}
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

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign / change team</DialogTitle>
            <DialogDescription>
              {assignPlans.length === 1
                ? `Set team for ${assignPlans[0]?.appLabel ?? "app"} (${assignPlans[0]?.month}). Current: ${
                    assignPlans[0]?.teamName || "Unassigned"
                  }.`
                : `Set team for ${assignPlans.length} profit plans.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-team">Team</Label>
            <Select value={assignTeamId} onValueChange={setAssignTeamId}>
              <SelectTrigger id="assign-team" className="bg-white">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAssign()} disabled={assigning || !assignTeamId || assignPlans.length === 0}>
              {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={resetImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import profit plans</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx) with columns: Month, App ID, Planned Profit, Assigned User Email
              (optional), Team Name (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(event) => {
                setImportFile(event.target.files?.[0] ?? null)
                setImportResult(null)
              }}
            />
            {importResult && importResult.errors.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {importResult.errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => resetImportDialog(false)} disabled={importing}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleImport()} disabled={importing || !importFile}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
