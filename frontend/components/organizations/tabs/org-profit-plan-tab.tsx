"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, ImageIcon, Loader2, Target, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  createDefaultMonthRange,
  enumerateMonthKeys,
  formatMonthRangeLabel,
  formatMonthTableHeader,
  RevenuePlanMonthRangePicker,
  shiftMonthRange,
  type MonthRange,
} from "@/components/organizations/revenue-plan-month-range-picker"
import {
  buildImportItemsFromPreview,
  extractMonthKeysFromWorkbook,
  parseRevenuePlanImportWorkbook,
  type RevenuePlanImportPreview,
} from "@/lib/revenue-plan/revenue-plan-import-parser"
import { RevenuePlanImportPreviewDialog } from "@/components/organizations/revenue-plan-import-preview-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  organizationsApi,
  structureApi,
  type OrgTeam,
  type TeamMonthlyProfitPlan,
} from "@/lib/api/services"
import * as XLSX from "xlsx"

const METRICS_PER_MONTH = 6
const REVENUE_COLUMNS_PER_MONTH = 3
const PAGE_SIZE_OPTIONS = [30, 100, "all"] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]
const EMPTY_PLAN_ID = "00000000-0000-0000-0000-000000000000"

interface AppPlanRow {
  appStoreId: string
  appLabel: string
  appPlatform?: string | null
  appIconUri?: string | null
  admobAppId?: string | null
  months: Record<string, TeamMonthlyProfitPlan>
}

interface OrgProfitPlanTabProps {
  orgId: string
  canManage?: boolean
}

function formatCurrency(value: number | null | undefined) {
  const safe = Number(value ?? 0)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

function hasPlanData(plan?: TeamMonthlyProfitPlan | null): boolean {
  return Boolean(plan?.id && plan.id !== EMPTY_PLAN_ID)
}

function getStatus(completion?: number | null) {
  if (completion == null) return { label: "No target", className: "bg-slate-100 text-slate-600" }
  if (completion >= 100) return { label: "Achieved", className: "bg-green-100 text-green-700" }
  if (completion >= 80) return { label: "On track", className: "bg-blue-100 text-blue-700" }
  return { label: "Behind", className: "bg-amber-100 text-amber-700" }
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function renderPlatformIcon(platformValue?: string | null, className?: string) {
  const isAndroid = (platformValue ?? "").toUpperCase() === "ANDROID"
  if (isAndroid) {
    return (
      <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    )
  }

  return (
    <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
    </svg>
  )
}

function renderPlatformBadge(platformValue?: string | null) {
  const platform = platformValue?.trim() || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 shrink-0 gap-1 px-1.5 text-[10px] font-medium",
        isAndroid
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
      title={platform}
    >
      {renderPlatformIcon(platform)}
    </Badge>
  )
}

function RevenuePlanAppCell({ row }: { row: AppPlanRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0 rounded-md">
        {row.appIconUri ? (
          <AvatarImage src={row.appIconUri} alt={row.appLabel} className="rounded-md object-cover" />
        ) : null}
        <AvatarFallback className="rounded-md bg-slate-100">
          <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-900" title={row.appLabel}>
          {row.appLabel}
        </div>
        <div
          className="truncate font-mono text-[10px] text-slate-500"
          title={row.appStoreId || row.admobAppId || undefined}
        >
          {row.appStoreId || row.admobAppId || "—"}
        </div>
      </div>
      {renderPlatformBadge(row.appPlatform)}
    </div>
  )
}

const APP_COLUMN_CLASS =
  "sticky left-0 z-10 min-w-[148px] max-w-[148px] border-r bg-white px-2 py-1.5 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]"

const APP_HEADER_CLASS =
  "sticky left-0 top-0 z-30 min-w-[148px] max-w-[148px] border-r border-slate-200 bg-slate-50/95 px-2 align-bottom shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]"

export function OrgProfitPlanTab({ orgId, canManage = false }: OrgProfitPlanTabProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [monthRange, setMonthRange] = useState<MonthRange>(() => createDefaultMonthRange())
  const { startMonth, endMonth } = monthRange
  const [teamFilter, setTeamFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [teams, setTeams] = useState<OrgTeam[]>([])
  const [plans, setPlans] = useState<TeamMonthlyProfitPlan[]>([])
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSizeOption, setPageSizeOption] = useState<PageSizeOption>(100)

  const [importOpen, setImportOpen] = useState(false)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<RevenuePlanImportPreview | null>(null)
  const [importTeamAppStoreIds, setImportTeamAppStoreIds] = useState<Record<string, Set<string>>>({})
  const [parsingImport, setParsingImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [exportingTemplate, setExportingTemplate] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const planParams =
        teamFilter === "all"
          ? { from: startMonth, to: endMonth }
          : { from: startMonth, to: endMonth, teamId: teamFilter }

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
  }, [orgId, startMonth, endMonth, teamFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredPlans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return plans

    return plans.filter((plan) =>
      [plan.appLabel, plan.appStoreId, plan.admobAppId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [plans, searchQuery])

  const monthKeys = useMemo(
    () => enumerateMonthKeys(startMonth, endMonth),
    [startMonth, endMonth],
  )

  const appRows = useMemo(() => {
    const map = new Map<string, AppPlanRow>()
    for (const plan of filteredPlans) {
      const existing = map.get(plan.appStoreId)
      if (existing) {
        existing.months[plan.month] = plan
        if (!existing.appIconUri && plan.appIconUri) existing.appIconUri = plan.appIconUri
        continue
      }
      map.set(plan.appStoreId, {
        appStoreId: plan.appStoreId,
        appLabel: plan.appLabel,
        appPlatform: plan.appPlatform,
        appIconUri: plan.appIconUri,
        admobAppId: plan.admobAppId,
        months: { [plan.month]: plan },
      })
    }
    return Array.from(map.values()).sort((a, b) => a.appLabel.localeCompare(b.appLabel))
  }, [filteredPlans])

  const overallCompletion = useMemo(() => {
    const plannedRows = filteredPlans.filter(hasPlanData)
    const planned = plannedRows.reduce((sum, plan) => sum + plan.plannedRevenue, 0)
    const actual = plannedRows.reduce((sum, plan) => sum + plan.actualRevenue, 0)
    return planned > 0 ? Math.round((actual / planned) * 10000) / 100 : null
  }, [filteredPlans])

  const summaryStatus = getStatus(overallCompletion)
  const effectivePageSize = pageSizeOption === "all" ? Math.max(appRows.length, 1) : pageSizeOption
  const totalPages = Math.max(1, Math.ceil(appRows.length / effectivePageSize))
  const pageStart = appRows.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1
  const pageEnd = Math.min(currentPage * effectivePageSize, appRows.length)
  const paginatedAppRows = useMemo(() => {
    const startIndex = (currentPage - 1) * effectivePageSize
    return appRows.slice(startIndex, startIndex + effectivePageSize)
  }, [appRows, currentPage, effectivePageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [startMonth, endMonth, teamFilter, pageSizeOption, searchQuery])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleImportFileSelected = async (file: File | null) => {
    if (!file) {
      setImportPreview(null)
      return
    }

    setParsingImport(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false })
      const monthKeys = extractMonthKeysFromWorkbook(workbook)
      const fromMonth = monthKeys[0] ?? startMonth
      const toMonth = monthKeys[monthKeys.length - 1] ?? endMonth

      const teamList = teams.length > 0 ? teams : await organizationsApi.getTeams(orgId)
      const [appsResponse, planList, ...teamPlanLists] = await Promise.all([
        structureApi.getApps(),
        organizationsApi.getProfitPlans(orgId, { from: fromMonth, to: toMonth }),
        ...teamList.map((team) =>
          organizationsApi.getProfitPlans(orgId, { from: fromMonth, to: toMonth, teamId: team.id }),
        ),
      ])

      const teamAppStoreIdsByTeamId: Record<string, Set<string>> = {}
      teamList.forEach((team, index) => {
        teamAppStoreIdsByTeamId[team.id] = new Set(
          teamPlanLists[index].map((plan) => plan.appStoreId.toLowerCase()),
        )
      })
      setImportTeamAppStoreIds(teamAppStoreIdsByTeamId)
      if (teams.length === 0) setTeams(teamList)

      const knownAppStoreIds = new Set(
        appsResponse.apps
          .map((app) => app.appStoreId?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value)),
      )

      const currentPlannedRevenueByStoreMonth = new Map<string, number>()
      for (const plan of planList) {
        if (!hasPlanData(plan)) continue
        currentPlannedRevenueByStoreMonth.set(
          `${plan.appStoreId.toLowerCase()}|${plan.month}`,
          plan.plannedRevenue,
        )
      }

      const preview = parseRevenuePlanImportWorkbook(workbook, {
        fileName: file.name,
        knownAppStoreIds,
        currentPlannedRevenueByStoreMonth,
      })

      setImportPreview(preview)
      setImportOpen(false)
      setImportPreviewOpen(true)
    } catch (err) {
      console.error("Failed to parse profit plan import file:", err)
      toast({
        title: "Could not read Excel file",
        description: err instanceof Error ? err.message : "Failed to parse the selected file.",
        variant: "destructive",
      })
      setImportPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } finally {
      setParsingImport(false)
    }
  }

  const handleConfirmImport = async (preview: RevenuePlanImportPreview) => {
    const items = buildImportItemsFromPreview(preview)
    if (items.length === 0) return

    setImporting(true)
    try {
      const result = await organizationsApi.importProfitPlanItems(orgId, items)
      toast({
        title: "Import completed",
        description: `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`,
      })
      setImportPreviewOpen(false)
      resetImportState()
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

  const resetImportState = () => {
    setImportPreview(null)
    setImportTeamAppStoreIds({})
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const resetImportDialog = (open: boolean) => {
    setImportOpen(open)
    if (!open && !importPreviewOpen) resetImportState()
  }

  const resetImportPreviewDialog = (open: boolean) => {
    setImportPreviewOpen(open)
    if (!open) {
      resetImportState()
    }
  }

  const handleExportTemplate = async () => {
    setExportingTemplate(true)
    try {
      const { blob } = await organizationsApi.exportProfitPlanTemplate(orgId, {
        from: startMonth,
        to: endMonth,
      })
      const monthLabel =
        startMonth === endMonth ? startMonth : `${startMonth}_to_${endMonth}`
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `revenue-plan-template-${monthLabel}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      toast({
        title: "Template exported",
        description: `Downloaded revenue plan template for ${formatMonthRangeLabel(monthRange)}.`,
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
    if (appRows.length === 0) return

    setExportingData(true)
    try {
      const exportParams =
        teamFilter === "all"
          ? {
              from: startMonth,
              to: endMonth,
              search: searchQuery.trim() || undefined,
            }
          : {
              from: startMonth,
              to: endMonth,
              teamId: teamFilter,
              search: searchQuery.trim() || undefined,
            }

      const { blob } = await organizationsApi.exportProfitPlansData(orgId, exportParams)

      const teamLabel =
        teamFilter === "all"
          ? "all-teams"
          : teams.find((team) => team.id === teamFilter)?.name || "team"

      const monthLabel =
        startMonth === endMonth ? startMonth : `${startMonth}_to_${endMonth}`

      const fileName = [
        "revenue-plan",
        monthLabel,
        sanitizeFileNamePart(teamLabel),
        searchQuery.trim() ? "filtered" : null,
      ]
        .filter(Boolean)
        .join("-")

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `${fileName}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      toast({
        title: "Revenue plans exported",
        description: `Downloaded ${appRows.length} app row(s) for ${formatMonthRangeLabel(monthRange)}.`,
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
                Revenue Plan
              </CardTitle>
              <CardDescription className="mt-1.5">
                Monthly revenue targets by app across teams in this organization.
              </CardDescription>
            </div>

            <div className="flex flex-col items-start gap-1 lg:items-center">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-white"
                  onClick={() => setMonthRange((current) => shiftMonthRange(current, -1))}
                  aria-label="Previous month"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <RevenuePlanMonthRangePicker value={monthRange} onChange={setMonthRange} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-white"
                  onClick={() => setMonthRange((current) => shiftMonthRange(current, 1))}
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
                  placeholder="App name, App Store ID, or AdMob App ID"
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
                    disabled={loading || exportingData || appRows.length === 0}
                  >
                    {exportingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export data
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Export the visible revenue plan data for the selected month range.
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
                      Download an Excel template for the end month in the selected range.
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
                      Upload an Excel file to update revenue plans in the selected range.
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading revenue plans...
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
                  <TableHeader>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      <TableHead rowSpan={3} className={APP_HEADER_CLASS}>
                        App
                      </TableHead>
                      {monthKeys.map((month) => (
                        <TableHead
                          key={month}
                          colSpan={METRICS_PER_MONTH}
                          className="sticky top-0 z-20 min-w-[480px] border-b border-r border-slate-200 bg-slate-50/95 text-center text-xs font-semibold text-slate-700"
                        >
                          {formatMonthTableHeader(month)}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      {monthKeys.map((month) => (
                        <Fragment key={`${month}-groups`}>
                          <TableHead
                            colSpan={REVENUE_COLUMNS_PER_MONTH}
                            className="sticky top-10 z-20 border-b border-r border-l border-slate-200 bg-blue-50/80 text-center text-xs font-semibold text-blue-700"
                          >
                            Revenue
                          </TableHead>
                          <TableHead
                            colSpan={REVENUE_COLUMNS_PER_MONTH}
                            className="sticky top-10 z-20 border-b border-r border-slate-200 bg-emerald-50/80 text-center text-xs font-semibold text-emerald-700"
                          >
                            Performance
                          </TableHead>
                        </Fragment>
                      ))}
                    </TableRow>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      {monthKeys.map((month) => (
                        <Fragment key={`${month}-metrics`}>
                          <TableHead className="sticky top-[72px] z-20 min-w-[80px] border-l border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Planned
                          </TableHead>
                          <TableHead className="sticky top-[72px] z-20 min-w-[80px] border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Actual
                          </TableHead>
                          <TableHead className="sticky top-[72px] z-20 min-w-[88px] border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Completion
                          </TableHead>
                          <TableHead className="sticky top-[72px] z-20 min-w-[88px] border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Actual Cost
                          </TableHead>
                          <TableHead className="sticky top-[72px] z-20 min-w-[88px] border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Actual Profit
                          </TableHead>
                          <TableHead className="sticky top-[72px] z-20 min-w-[104px] border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600">
                            Net Profit Margin
                          </TableHead>
                        </Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={1 + monthKeys.length * METRICS_PER_MONTH}
                          className="py-10 text-center text-sm text-slate-500"
                        >
                          {searchQuery.trim()
                            ? "No revenue plans match your search."
                            : "No revenue plans found for the selected filters."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAppRows.map((row) => (
                        <TableRow key={row.appStoreId} className="hover:bg-slate-50/60">
                          <TableCell className={APP_COLUMN_CLASS}>
                            <RevenuePlanAppCell row={row} />
                          </TableCell>
                          {monthKeys.map((month) => {
                            const plan = row.months[month]
                            const hasPlan = hasPlanData(plan)
                            const status = getStatus(hasPlan ? plan?.completionPercent : null)
                            const netProfitMargin =
                              plan == null
                                ? null
                                : getNetProfitMargin(plan.actualProfit, plan.actualRevenue)
                            return (
                              <Fragment key={`${row.appStoreId}-${month}`}>
                                <TableCell className="min-w-[80px] border-l border-slate-200 text-right text-sm tabular-nums">
                                  {hasPlan ? formatCurrency(plan.plannedRevenue) : "—"}
                                </TableCell>
                                <TableCell className="min-w-[80px] text-right text-sm tabular-nums">
                                  {plan ? formatCurrency(plan.actualRevenue) : "—"}
                                </TableCell>
                                <TableCell className="min-w-[88px] border-r border-slate-200 text-right">
                                  {hasPlan ? (
                                    <Badge className={cn("w-fit", status.className)} variant="secondary">
                                      {plan.completionPercent == null
                                        ? "—"
                                        : `${plan.completionPercent.toFixed(2)}%`}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="min-w-[88px] text-right text-sm tabular-nums">
                                  {plan ? formatCurrency(plan.actualCost) : "—"}
                                </TableCell>
                                <TableCell className="min-w-[88px] text-right text-sm tabular-nums">
                                  {plan ? formatCurrency(plan.actualProfit) : "—"}
                                </TableCell>
                                <TableCell className="min-w-[104px] border-r border-slate-200 text-right text-sm tabular-nums">
                                  {plan ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
                                          {formatNetProfitMarginDisplay(netProfitMargin)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        {formatNetProfitMarginTooltip(netProfitMargin)}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                              </Fragment>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </table>
              </div>
              {appRows.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <Select
                      value={pageSizeOption === "all" ? "all" : String(pageSizeOption)}
                      onValueChange={(value) => {
                        setPageSizeOption(value === "all" ? "all" : (Number(value) as 30 | 100))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 w-20 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option === "all" ? "All" : option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <span>
                      {pageStart}-{pageEnd} of {appRows.length}
                    </span>
                    {pageSizeOption !== "all" && totalPages > 1 ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-white"
                          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                          disabled={currentPage <= 1}
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-16 text-center">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-white"
                          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                          disabled={currentPage >= totalPages}
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={resetImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import profit plans</DialogTitle>
            <DialogDescription>
              Upload an Excel template with App Store ID, App Name, Platform, and monthly Planned Revenue columns (MM/yyyy).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              disabled={parsingImport}
              onChange={(event) => {
                void handleImportFileSelected(event.target.files?.[0] ?? null)
              }}
            />
            {parsingImport ? (
              <div className="flex items-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reading file and preparing preview...
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => resetImportDialog(false)} disabled={parsingImport}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RevenuePlanImportPreviewDialog
        open={importPreviewOpen}
        preview={importPreview}
        importing={importing}
        teams={teams}
        teamAppStoreIdsByTeamId={importTeamAppStoreIds}
        initialTeamFilter={teamFilter}
        onOpenChange={resetImportPreviewDialog}
        onConfirm={handleConfirmImport}
      />
      </>
  )
}
