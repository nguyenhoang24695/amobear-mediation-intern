"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Loader2, Settings, Target, Upload } from "lucide-react"
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
import { RevenuePlanAppCell } from "@/components/organizations/revenue-plan-app-cell"
import { RevenuePlanImportPreviewDialog } from "@/components/organizations/revenue-plan-import-preview-dialog"
import { RevenuePlanPlannedCell } from "@/components/organizations/revenue-plan-planned-cell"
import { RevenuePlanColumnSidebar } from "@/components/organizations/revenue-plan-column-sidebar"
import { GroupedTeamMultiSelect } from "@/components/reports/grouped-team-multi-select"
import {
  countVisibleColumns,
  countVisibleColumnsInGroup,
  createDefaultColumnVisibility,
  REVENUE_PLAN_COLUMNS,
  type RevenuePlanColumnId,
  type RevenuePlanColumnVisibility,
} from "@/lib/revenue-plan/revenue-plan-column-config"
import { cn } from "@/lib/utils"
import {
  getActualProfitClass,
  getNetProfitMargin,
  getNetProfitMarginClass,
} from "@/lib/metrics/profit-metric-styles"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { authApi, organizationsApi, structureApi, type OrgTeam, type OrgTeamGroup, type TeamMonthlyProfitPlan } from "@/lib/api/services"
import { getCurrentUser } from "@/lib/auth"
import { buildTeamGroupSectionsFromOrg } from "@/lib/organizations/team-group"
import { loadScopedCommissionTeams } from "@/lib/reports/scoped-commission-teams"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import * as XLSX from "xlsx"

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

interface AggregatedPlanMetrics {
  plannedRevenue: number
  actualRevenue: number
  actualCost: number
  actualProfit: number
  completion: number | null
  netProfitMargin: number | null
  hasAnyPlan: boolean
}

function aggregatePlanMetrics(plans: (TeamMonthlyProfitPlan | undefined)[]): AggregatedPlanMetrics {
  const validPlans = plans.filter((plan): plan is TeamMonthlyProfitPlan => plan != null)
  const plannedRows = validPlans.filter(hasPlanData)
  const plannedRevenue = plannedRows.reduce((sum, plan) => sum + plan.plannedRevenue, 0)
  const actualRevenue = validPlans.reduce((sum, plan) => sum + plan.actualRevenue, 0)
  const actualCost = validPlans.reduce((sum, plan) => sum + plan.actualCost, 0)
  const actualProfit = validPlans.reduce((sum, plan) => sum + plan.actualProfit, 0)
  const completion =
    plannedRevenue > 0 ? Math.round((actualRevenue / plannedRevenue) * 10000) / 100 : null

  return {
    plannedRevenue,
    actualRevenue,
    actualCost,
    actualProfit,
    completion,
    netProfitMargin: getNetProfitMargin(actualProfit, actualRevenue),
    hasAnyPlan: plannedRows.length > 0,
  }
}

function buildColumnTotalsByMonth(
  monthKeys: string[],
  appRows: AppPlanRow[],
): Record<string, AggregatedPlanMetrics> {
  const result: Record<string, AggregatedPlanMetrics> = {}
  for (const monthKey of monthKeys) {
    result[monthKey] = aggregatePlanMetrics(appRows.map((row) => row.months[monthKey]))
  }
  return result
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
  if (!plan) return false
  if (plan.id && plan.id !== EMPTY_PLAN_ID) return true
  return plan.plannedRevenue > 0
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

function resolveEffectiveTeamIds(
  selectedTeamIds: string[],
  filterTeams: CommissionTeamOption[],
  canScopeManagedTeams: boolean,
): string[] {
  if (selectedTeamIds.length > 0) return selectedTeamIds
  if (canScopeManagedTeams && filterTeams.length > 0) {
    return filterTeams.map((team) => team.teamId)
  }
  return []
}

function isAllTeamsSelected(
  selectedTeamIds: string[],
  filterTeams: CommissionTeamOption[],
): boolean {
  if (filterTeams.length === 0) return selectedTeamIds.length === 0
  return selectedTeamIds.length === 0 || selectedTeamIds.length === filterTeams.length
}

async function fetchOrganizationProfitPlans(
  orgId: string,
  from: string,
  to: string,
  teamIds: string[],
): Promise<TeamMonthlyProfitPlan[]> {
  if (teamIds.length === 0) {
    return organizationsApi.getProfitPlans(orgId, { from, to })
  }
  if (teamIds.length === 1) {
    return organizationsApi.getProfitPlans(orgId, { from, to, teamId: teamIds[0] })
  }

  const lists = await Promise.all(
    teamIds.map((teamId) => organizationsApi.getProfitPlans(orgId, { from, to, teamId })),
  )
  const merged = new Map<string, TeamMonthlyProfitPlan>()
  for (const list of lists) {
    for (const plan of list) {
      merged.set(`${plan.appStoreId.toLowerCase()}|${plan.month}`, plan)
    }
  }
  return [...merged.values()]
}

function mapFilterTeamsToOrgTeams(filterTeams: CommissionTeamOption[]): OrgTeam[] {
  return filterTeams.map((team) => ({
    id: team.teamId,
    name: team.label,
    teamGroup: team.teamGroup ?? null,
    isActive: true,
    memberCount: 0,
    createdAt: "",
    updatedAt: "",
  }))
}

const APP_COLUMN_CLASS =
  "sticky left-0 z-10 min-w-[148px] max-w-[148px] border-r bg-white px-2 py-1.5 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]"

const APP_HEADER_CLASS =
  "sticky left-0 top-0 z-30 min-w-[148px] max-w-[148px] border-r border-slate-200 bg-slate-50/95 px-2 align-bottom shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]"

const METRIC_HEADER_CLASS =
  "sticky top-[72px] z-20 border-r border-slate-200 bg-slate-50/95 text-right text-xs font-medium text-slate-600"

function renderMonthMetricCell(
  columnId: RevenuePlanColumnId,
  plan: TeamMonthlyProfitPlan | undefined,
  hasPlan: boolean,
  netProfitMargin: number | null,
  isFirst: boolean,
  isLast: boolean,
) {
  const column = REVENUE_PLAN_COLUMNS.find((item) => item.id === columnId)
  if (!column) return null

  const status = getStatus(hasPlan ? plan?.completionPercent : null)
  const edgeBorderClass = cn(
    isFirst && "border-l border-slate-200",
    isLast && "border-r border-slate-200",
  )

  switch (columnId) {
    case "planned":
      return null
    case "actual":
      return (
        <TableCell
          key={columnId}
          className={cn(column.minWidthClass, edgeBorderClass, "text-right text-sm tabular-nums")}
        >
          {plan ? formatCurrency(plan.actualRevenue) : "—"}
        </TableCell>
      )
    case "completion":
      return (
        <TableCell key={columnId} className={cn(column.minWidthClass, edgeBorderClass, "text-right")}>
          {hasPlan ? (
            <Badge className={cn("w-fit", status.className)} variant="secondary">
              {plan?.completionPercent == null ? "—" : `${plan.completionPercent.toFixed(2)}%`}
            </Badge>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </TableCell>
      )
    case "actualCost":
      return (
        <TableCell
          key={columnId}
          className={cn(column.minWidthClass, edgeBorderClass, "text-right text-sm tabular-nums")}
        >
          {plan ? formatCurrency(plan.actualCost) : "—"}
        </TableCell>
      )
    case "actualProfit":
      return (
        <TableCell
          key={columnId}
          className={cn(
            column.minWidthClass,
            edgeBorderClass,
            "text-right text-sm tabular-nums",
            plan ? getActualProfitClass(plan.actualProfit) : "text-slate-500",
          )}
        >
          {plan ? formatCurrency(plan.actualProfit) : "—"}
        </TableCell>
      )
    case "netProfitMargin":
      return (
        <TableCell
          key={columnId}
          className={cn(
            column.minWidthClass,
            edgeBorderClass,
            "text-right text-sm tabular-nums",
            plan ? getNetProfitMarginClass(netProfitMargin) : "text-slate-500",
          )}
        >
          {plan ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
                  {formatNetProfitMarginDisplay(netProfitMargin)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{formatNetProfitMarginTooltip(netProfitMargin)}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </TableCell>
      )
    default:
      return null
  }
}

function renderAggregatedMetricCell(
  columnId: RevenuePlanColumnId,
  metrics: AggregatedPlanMetrics,
  isFirst: boolean,
  isLast: boolean,
  options?: { isTrailingTotal?: boolean; isTotalRow?: boolean },
) {
  const column = REVENUE_PLAN_COLUMNS.find((item) => item.id === columnId)
  if (!column) return null

  const status = getStatus(metrics.hasAnyPlan ? metrics.completion : null)
  const edgeBorderClass = cn(
    isFirst && cn("border-l", options?.isTrailingTotal ? "border-l-2 border-slate-400" : "border-slate-200"),
    isLast && "border-r border-slate-200",
  )
  const cellClassName = cn(
    column.minWidthClass,
    edgeBorderClass,
    "text-right text-sm tabular-nums",
    options?.isTotalRow ? "bg-slate-100/80 font-semibold" : options?.isTrailingTotal ? "bg-slate-50/80" : "",
  )

  switch (columnId) {
    case "planned":
      return (
        <TableCell key={columnId} className={cellClassName}>
          {metrics.hasAnyPlan ? formatCurrency(metrics.plannedRevenue) : "—"}
        </TableCell>
      )
    case "actual":
      return (
        <TableCell key={columnId} className={cellClassName}>
          {formatCurrency(metrics.actualRevenue)}
        </TableCell>
      )
    case "completion":
      return (
        <TableCell key={columnId} className={cn(column.minWidthClass, edgeBorderClass, "text-right", options?.isTotalRow && "bg-slate-100/80")}>
          {metrics.hasAnyPlan && metrics.completion != null ? (
            <Badge className={cn("w-fit font-semibold", status.className)} variant="secondary">
              {metrics.completion.toFixed(2)}%
            </Badge>
          ) : (
            <span className={cn("text-sm", options?.isTotalRow ? "font-semibold text-slate-400" : "text-slate-400")}>—</span>
          )}
        </TableCell>
      )
    case "actualCost":
      return (
        <TableCell key={columnId} className={cellClassName}>
          {formatCurrency(metrics.actualCost)}
        </TableCell>
      )
    case "actualProfit":
      return (
        <TableCell
          key={columnId}
          className={cn(cellClassName, getActualProfitClass(metrics.actualProfit))}
        >
          {formatCurrency(metrics.actualProfit)}
        </TableCell>
      )
    case "netProfitMargin":
      return (
        <TableCell
          key={columnId}
          className={cn(cellClassName, getNetProfitMarginClass(metrics.netProfitMargin))}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2">
                {formatNetProfitMarginDisplay(metrics.netProfitMargin)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{formatNetProfitMarginTooltip(metrics.netProfitMargin)}</TooltipContent>
          </Tooltip>
        </TableCell>
      )
    default:
      return null
  }
}

function renderAggregatedMetricGroup(
  groupKey: string,
  metrics: AggregatedPlanMetrics,
  visibleColumns: (typeof REVENUE_PLAN_COLUMNS)[number][],
  options?: { isTrailingTotal?: boolean; isTotalRow?: boolean },
) {
  return (
    <Fragment key={groupKey}>
      {visibleColumns.map((column, index) =>
        renderAggregatedMetricCell(
          column.id,
          metrics,
          index === 0,
          index === visibleColumns.length - 1,
          options,
        ),
      )}
    </Fragment>
  )
}

export function OrgProfitPlanTab({ orgId, canManage = false }: OrgProfitPlanTabProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storedCurrentUser = getCurrentUser()
  const { data: currentUserResponse } = useApi(
    () => authApi.getCurrentUser(),
    { cacheKey: `org_profit_plan_current_user_${storedCurrentUser?.id ?? "anonymous"}` },
  )
  const currentUser = currentUserResponse?.data ?? storedCurrentUser
  const currentUserTeamIds = (currentUser?.teams ?? storedCurrentUser?.teams ?? [])
    .map((team) => team.id)
    .filter(Boolean)
  const currentUserTeamIdsKey = [...currentUserTeamIds].sort().join("|")

  const [monthRange, setMonthRange] = useState<MonthRange>(() => createDefaultMonthRange())
  const { startMonth, endMonth } = monthRange
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [teamsFilterInitialized, setTeamsFilterInitialized] = useState(false)
  const [filterTeams, setFilterTeams] = useState<CommissionTeamOption[]>([])
  const [filterTeamGroups, setFilterTeamGroups] = useState<OrgTeamGroup[]>([])
  const [loadingFilterTeams, setLoadingFilterTeams] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
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
  const [columnSidebarOpen, setColumnSidebarOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<RevenuePlanColumnVisibility>(() =>
    createDefaultColumnVisibility(),
  )

  const visibleColumnCount = useMemo(
    () => countVisibleColumns(columnVisibility),
    [columnVisibility],
  )
  const visibleRevenueColumnCount = useMemo(
    () => countVisibleColumnsInGroup(columnVisibility, "revenue"),
    [columnVisibility],
  )
  const visiblePerformanceColumnCount = useMemo(
    () => countVisibleColumnsInGroup(columnVisibility, "performance"),
    [columnVisibility],
  )
  const visibleColumns = useMemo(
    () => REVENUE_PLAN_COLUMNS.filter((column) => columnVisibility[column.id]),
    [columnVisibility],
  )

  const canScopeManagedTeams = canManage || filterTeams.length > 0
  const effectiveTeamIds = useMemo(
    () => resolveEffectiveTeamIds(selectedTeamIds, filterTeams, canScopeManagedTeams),
    [selectedTeamIds, filterTeams, canScopeManagedTeams],
  )
  const teamGroupSections = useMemo(
    () => buildTeamGroupSectionsFromOrg(filterTeamGroups, filterTeams),
    [filterTeamGroups, filterTeams],
  )
  const teamsForImport = useMemo(() => mapFilterTeamsToOrgTeams(filterTeams), [filterTeams])
  const importInitialTeamFilter = useMemo(() => {
    if (selectedTeamIds.length === 1) return selectedTeamIds[0]
    return "all"
  }, [selectedTeamIds])

  useEffect(() => {
    if (!orgId) {
      setFilterTeams([])
      setFilterTeamGroups([])
      return
    }

    let cancelled = false
    setLoadingFilterTeams(true)
    void (async () => {
      try {
        const { teams, teamGroups } = await loadScopedCommissionTeams({
          orgId,
          currentUserId: currentUser?.id,
          currentUserEmail: currentUser?.email,
          currentUserTeamIds,
        })
        if (cancelled) return

        if (canManage && teams.length === 0) {
          const orgTeams = await organizationsApi.getTeams(orgId)
          if (cancelled) return
          setFilterTeamGroups(teamGroups)
          setFilterTeams(
            orgTeams.map((team) => ({
              teamId: team.id,
              label: team.name,
              teamGroup: team.teamGroup ?? null,
            })),
          )
          return
        }

        setFilterTeamGroups(teamGroups)
        setFilterTeams(teams)
      } catch {
        if (!cancelled) {
          setFilterTeams([])
          setFilterTeamGroups([])
        }
      } finally {
        if (!cancelled) setLoadingFilterTeams(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [orgId, currentUser?.id, currentUser?.email, currentUserTeamIdsKey, canManage])

  useEffect(() => {
    if (!canScopeManagedTeams) return
    setSelectedTeamIds((prev) => {
      const valid = prev.filter((id) => filterTeams.some((team) => team.teamId === id))
      return valid.length === prev.length ? prev : valid
    })
  }, [canScopeManagedTeams, filterTeams])

  useEffect(() => {
    if (!canScopeManagedTeams || teamsFilterInitialized) return
    if (filterTeams.length === 0) return
    if (selectedTeamIds.length > 0) {
      setTeamsFilterInitialized(true)
      return
    }
    setSelectedTeamIds(filterTeams.map((team) => team.teamId))
    setTeamsFilterInitialized(true)
  }, [canScopeManagedTeams, teamsFilterInitialized, filterTeams, selectedTeamIds.length])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const planList = await fetchOrganizationProfitPlans(
        orgId,
        startMonth,
        endMonth,
        effectiveTeamIds,
      )
      setPlans(planList)
      setCurrentPage(1)
    } catch (err) {
      console.error("Failed to load organization profit plans:", err)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [orgId, startMonth, endMonth, effectiveTeamIds])

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

  const columnTotalsByMonth = useMemo(
    () => buildColumnTotalsByMonth(monthKeys, appRows),
    [monthKeys, appRows],
  )

  const grandTotalMetrics = useMemo(
    () => aggregatePlanMetrics(appRows.flatMap((row) => monthKeys.map((monthKey) => row.months[monthKey]))),
    [appRows, monthKeys],
  )

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
  }, [startMonth, endMonth, selectedTeamIds, pageSizeOption, searchQuery])

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

      const teamList =
        filterTeams.length > 0
          ? mapFilterTeamsToOrgTeams(filterTeams)
          : await organizationsApi.getTeams(orgId)
      const [appsResponse, planList, ...teamPlanLists] = await Promise.all([
        structureApi.getApps(),
        fetchOrganizationProfitPlans(orgId, fromMonth, toMonth, effectiveTeamIds),
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

  const handlePlannedRevenueSaved = useCallback((appStoreId: string, month: string, plannedRevenue: number) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.appStoreId !== appStoreId || plan.month !== month) return plan
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

  const exportTeamSelectionBlocked =
    canScopeManagedTeams &&
    selectedTeamIds.length > 1 &&
    !isAllTeamsSelected(selectedTeamIds, filterTeams)

  const handleExportData = async () => {
    if (appRows.length === 0) return
    if (exportTeamSelectionBlocked) {
      toast({
        title: "Export not available",
        description: "Select one team or all teams in your scope to export.",
        variant: "destructive",
      })
      return
    }

    setExportingData(true)
    try {
      const exportTeamId =
        effectiveTeamIds.length === 1 ? effectiveTeamIds[0] : undefined
      const exportParams = {
        from: startMonth,
        to: endMonth,
        teamId: exportTeamId,
        search: searchQuery.trim() || undefined,
      }

      const { blob } = await organizationsApi.exportProfitPlansData(orgId, exportParams)

      const teamLabel =
        exportTeamId == null
          ? "all-teams"
          : filterTeams.find((team) => team.teamId === exportTeamId)?.label || "team"

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
          <div className="flex min-h-0 gap-0">
            <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {canScopeManagedTeams ? (
                <div className="space-y-1.5">
                  <Label htmlFor="org-profit-team">Teams</Label>
                  <GroupedTeamMultiSelect
                    id="org-profit-team"
                    teams={filterTeams}
                    teamGroupSections={teamGroupSections}
                    selectedTeamIds={selectedTeamIds}
                    onSelectedTeamIdsChange={setSelectedTeamIds}
                    disabled={loadingFilterTeams}
                    placeholder="Teams in your scope"
                    searchPlaceholder="Search teams..."
                    emptySearchMessage="No teams found."
                    emptyTeamsMessage="No teams under you or as team lead"
                    triggerClassName="w-full max-w-none sm:w-[220px] sm:max-w-[280px]"
                  />
                </div>
              ) : null}
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
                    disabled={loading || exportingData || appRows.length === 0 || exportTeamSelectionBlocked}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={columnSidebarOpen ? "secondary" : "outline"}
                    size="icon"
                    className="h-9 w-9 shrink-0 bg-white"
                    onClick={() => setColumnSidebarOpen((open) => !open)}
                    aria-label={columnSidebarOpen ? "Hide column settings" : "Show column settings"}
                    aria-pressed={columnSidebarOpen}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Configure visible columns</TooltipContent>
              </Tooltip>
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
                          colSpan={visibleColumnCount}
                          className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50/95 text-center text-xs font-semibold text-slate-700"
                          style={{ minWidth: `${Math.max(visibleColumnCount * 80, 160)}px` }}
                        >
                          {formatMonthTableHeader(month)}
                        </TableHead>
                      ))}
                      <TableHead
                        colSpan={visibleColumnCount}
                        className="sticky top-0 z-20 border-b border-l-2 border-r border-slate-400 bg-slate-100/95 text-center text-xs font-semibold text-slate-800"
                        style={{ minWidth: `${Math.max(visibleColumnCount * 80, 160)}px` }}
                      >
                        Total
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      {monthKeys.map((month) => (
                        <Fragment key={`${month}-groups`}>
                          {visibleRevenueColumnCount > 0 ? (
                            <TableHead
                              colSpan={visibleRevenueColumnCount}
                              className="sticky top-10 z-20 border-b border-r border-l border-slate-200 bg-blue-50/80 text-center text-xs font-semibold text-blue-700"
                            >
                              Revenue
                            </TableHead>
                          ) : null}
                          {visiblePerformanceColumnCount > 0 ? (
                            <TableHead
                              colSpan={visiblePerformanceColumnCount}
                              className="sticky top-10 z-20 border-b border-r border-slate-200 bg-emerald-50/80 text-center text-xs font-semibold text-emerald-700"
                            >
                              Performance
                            </TableHead>
                          ) : null}
                        </Fragment>
                      ))}
                      <Fragment key="total-groups">
                        {visibleRevenueColumnCount > 0 ? (
                          <TableHead
                            colSpan={visibleRevenueColumnCount}
                            className="sticky top-10 z-20 border-b border-r border-l-2 border-slate-400 bg-blue-50/90 text-center text-xs font-semibold text-blue-700"
                          >
                            Revenue
                          </TableHead>
                        ) : null}
                        {visiblePerformanceColumnCount > 0 ? (
                          <TableHead
                            colSpan={visiblePerformanceColumnCount}
                            className="sticky top-10 z-20 border-b border-r border-slate-200 bg-emerald-50/90 text-center text-xs font-semibold text-emerald-700"
                          >
                            Performance
                          </TableHead>
                        ) : null}
                      </Fragment>
                    </TableRow>
                    <TableRow className="bg-slate-50/95 hover:bg-slate-50/95">
                      {monthKeys.map((month) => (
                        <Fragment key={`${month}-metrics`}>
                          {visibleColumns.map((column, index) => (
                            <TableHead
                              key={`${month}-${column.id}`}
                              className={cn(
                                METRIC_HEADER_CLASS,
                                column.minWidthClass,
                                index === 0 && "border-l",
                                index === visibleColumns.length - 1 && "border-r",
                              )}
                            >
                              {column.label}
                            </TableHead>
                          ))}
                        </Fragment>
                      ))}
                      <Fragment key="total-columns">
                        {visibleColumns.map((column, index) => (
                          <TableHead
                            key={`total-${column.id}`}
                            className={cn(
                              METRIC_HEADER_CLASS,
                              column.minWidthClass,
                              index === 0 && "border-l-2 border-slate-400",
                              index === visibleColumns.length - 1 && "border-r",
                              "bg-slate-100/95",
                            )}
                          >
                            {column.label}
                          </TableHead>
                        ))}
                      </Fragment>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={1 + monthKeys.length * visibleColumnCount + visibleColumnCount}
                          className="py-10 text-center text-sm text-slate-500"
                        >
                          {searchQuery.trim()
                            ? "No revenue plans match your search."
                            : "No revenue plans found for the selected filters."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                          <TableCell
                            className={cn(APP_COLUMN_CLASS, "bg-slate-100 font-bold text-slate-900")}
                          >
                            Total
                          </TableCell>
                          {monthKeys.map((month) =>
                            renderAggregatedMetricGroup(
                              month,
                              columnTotalsByMonth[month],
                              visibleColumns,
                              { isTotalRow: true },
                            ),
                          )}
                          {renderAggregatedMetricGroup(
                            "row-total",
                            grandTotalMetrics,
                            visibleColumns,
                            { isTrailingTotal: true, isTotalRow: true },
                          )}
                        </TableRow>
                        {paginatedAppRows.map((row) => {
                          const rowTotalMetrics = aggregatePlanMetrics(
                            monthKeys.map((monthKey) => row.months[monthKey]),
                          )

                          return (
                        <TableRow key={row.appStoreId} className="hover:bg-slate-50/60">
                          <TableCell className={APP_COLUMN_CLASS}>
                            <RevenuePlanAppCell
                              appLabel={row.appLabel}
                              appStoreId={row.appStoreId}
                              admobAppId={row.admobAppId}
                              appPlatform={row.appPlatform}
                              appIconUri={row.appIconUri}
                            />
                          </TableCell>
                          {monthKeys.map((month) => {
                            const plan = row.months[month]
                            const hasPlan = hasPlanData(plan)
                            const netProfitMargin =
                              plan == null
                                ? null
                                : getNetProfitMargin(plan.actualProfit, plan.actualRevenue)
                            return (
                              <Fragment key={`${row.appStoreId}-${month}`}>
                                {visibleColumns.map((column, index) => {
                                  const edgeBorderClass = cn(
                                    index === 0 && "border-l border-slate-200",
                                    index === visibleColumns.length - 1 && "border-r border-slate-200",
                                  )

                                  if (column.id === "planned") {
                                    return (
                                      <RevenuePlanPlannedCell
                                        key={column.id}
                                        orgId={orgId}
                                        appStoreId={row.appStoreId}
                                        month={month}
                                        plannedRevenue={plan?.plannedRevenue ?? 0}
                                        hasPlan={hasPlan}
                                        canEdit={canManage}
                                        className={column.minWidthClass}
                                        edgeBorderClass={edgeBorderClass}
                                        onSaved={handlePlannedRevenueSaved}
                                      />
                                    )
                                  }

                                  return renderMonthMetricCell(
                                    column.id,
                                    plan,
                                    hasPlan,
                                    netProfitMargin,
                                    index === 0,
                                    index === visibleColumns.length - 1,
                                  )
                                })}
                              </Fragment>
                            )
                          })}
                          {renderAggregatedMetricGroup(
                            `${row.appStoreId}-total`,
                            rowTotalMetrics,
                            visibleColumns,
                            { isTrailingTotal: true },
                          )}
                        </TableRow>
                          )
                        })}
                      </>
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

            </div>

            {columnSidebarOpen ? (
              <RevenuePlanColumnSidebar
                visibility={columnVisibility}
                onChange={setColumnVisibility}
                className="max-h-[min(70vh,720px)] self-start"
              />
            ) : null}
          </div>

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
        teams={teamsForImport}
        teamAppStoreIdsByTeamId={importTeamAppStoreIds}
        initialTeamFilter={importInitialTeamFilter}
        onOpenChange={resetImportPreviewDialog}
        onConfirm={handleConfirmImport}
      />
      </>
  )
}
