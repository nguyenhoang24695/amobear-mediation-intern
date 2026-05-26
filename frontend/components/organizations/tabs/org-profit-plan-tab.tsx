"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addMonths, format, parse } from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Download, Loader2, Target, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Pagination as DataPagination } from "@/components/shared/pagination"
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

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value)
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function OrgProfitPlanTab({ orgId, canManage = false }: OrgProfitPlanTabProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"))
  const [teamFilter, setTeamFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportTeamProfitPlansResult | null>(null)
  const [exportingData, setExportingData] = useState(false)
  const [exportingTemplate, setExportingTemplate] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const planParams = teamFilter === "all" ? { from: month, to: month } : { from: month, to: month, teamId: teamFilter }

      const [teamList, planList] = await Promise.all([
        organizationsApi.getTeams(orgId),
        organizationsApi.getProfitPlans(orgId, planParams),
      ])
      setTeams(teamList)
      setPlans(planList)
      setCurrentPage(1)
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

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return plans

    return plans.filter((plan) =>
      [plan.appLabel, plan.appId, plan.appStoreId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [plans, searchQuery])

  const totals = useMemo(() => {
    const planned = filteredPlans.reduce((sum, plan) => sum + plan.plannedProfit, 0)
    const actual = filteredPlans.reduce((sum, plan) => sum + plan.actualProfit, 0)
    const completion = planned > 0 ? Math.round((actual / planned) * 10000) / 100 : null
    return { planned, actual, completion }
  }, [filteredPlans])

  const summaryStatus = getStatus(totals.completion)
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize))
  const paginatedPlans = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredPlans.slice(startIndex, startIndex + pageSize)
  }, [filteredPlans, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [month, teamFilter, pageSize, searchQuery])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

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

  const handleExportData = async () => {
    if (filteredPlans.length === 0) return

    setExportingData(true)
    try {
      const rows = [
        [
          "Month",
          "App",
          "App ID",
          "Platform",
          "App Store ID",
          "Planned Profit",
          "Actual Profit",
          "Completion Percent",
        ],
        ...filteredPlans.map((plan) => [
          plan.month,
          plan.appLabel,
          plan.appId,
          plan.appPlatform ?? "",
          plan.appStoreId ?? "",
          plan.plannedProfit,
          plan.actualProfit,
          plan.completionPercent == null ? "" : plan.completionPercent.toFixed(2),
        ]),
      ]

      const csv = rows
        .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
        .join("\n")

      const teamLabel =
        teamFilter === "all"
          ? "all-teams"
          : teams.find((team) => team.id === teamFilter)?.name || "team"

      const fileName = [
        "profit-plan",
        month,
        sanitizeFileNamePart(teamLabel),
        searchQuery.trim() ? "filtered" : null,
      ]
        .filter(Boolean)
        .join("-")

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `${fileName}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      toast({
        title: "Profit plans exported",
        description: `Downloaded ${filteredPlans.length} row(s) for ${formatMonthLabel(month)}.`,
      })
    } catch (err) {
      console.error("Failed to export profit plans:", err)
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export profit plan data.",
        variant: "destructive",
      })
    } finally {
      setExportingData(false)
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              <div className="space-y-1.5">
                <Label htmlFor="org-profit-search">Search app</Label>
                <Input
                  id="org-profit-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="App name, App ID, or Store ID"
                  className="w-full bg-white sm:w-[280px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    onClick={() => void handleExportData()}
                    disabled={loading || exportingData || filteredPlans.length === 0}
                  >
                    {exportingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export data
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Export the current month's visible profit plan data.
                </TooltipContent>
              </Tooltip>
              {canManage ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Download an Excel template for this month.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" className="bg-white" onClick={() => setImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Upload an Excel file to update this month's plans.
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}
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
                    <TableHead>App</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                        {searchQuery.trim()
                          ? "No profit plans match your search."
                          : "No profit plans found for the selected filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPlans.map((plan) => {
                      const status = getStatus(plan.completionPercent)
                      return (
                        <TableRow key={plan.id}>
                          <TableCell className="whitespace-nowrap text-sm text-slate-700">{plan.month}</TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{plan.appLabel}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {plan.appPlatform ?? "Unknown"} · {plan.appStoreId || plan.appId}
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
          )}

          {!loading && filteredPlans.length > 0 ? (
            <DataPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPlans.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="plans"
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={resetImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import profit plans</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx) with columns: Month, App ID, Planned Profit.
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
