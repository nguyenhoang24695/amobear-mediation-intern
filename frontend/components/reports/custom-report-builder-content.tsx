"use client"

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  Save,
  Search,
  ArrowUpDown,
  HelpCircle,
  Smartphone,
  Download,
  X,
  AlertCircle,
  Plus,
  Pencil,
  GripVertical,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { useCustomReportQuery } from "@/hooks/use-custom-report-query"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { authApi, organizationsApi, reportsApi, structureApi, teamMembersApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import type {
  CustomReportCatalogItem,
  CustomReportFilters,
  CustomReportMetricFilter,
  CustomReportSaved,
  SaveCustomReportRequest,
} from "@/types/reports"
import { applySavedCustomReport } from "@/lib/reports/apply-saved-custom-report"
import {
  collectMembershipManagedTeams,
  collectTeamLeadTeamsFromChart,
  collectTeamLeadTeamsFromOrgTeams,
  collectTeamsUnderPersonnelNode,
  mergeCommissionTeamOptions,
  type CommissionTeamOption,
} from "@/lib/reports/commission-team-utils"
import { notifyPinnedCustomReportsChanged } from "@/lib/reports/pinned-custom-reports"
import { toast } from "sonner"
import type { PersonnelNode } from "@/lib/organizations/personnel-chart-types"

const datePresets = [
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
] as const

type DateFilterMode = "preset" | "month" | "custom"

const FILTER_DATE_RANGE = "Date range"
const FILTER_APPS = "Apps"
const FILTER_COMMISSION_TEAM = "Team"
const FILTER_COMMISSION_MEMBER = "Team member"
const HIDDEN_PARAMETER_IDS = new Set(["publisher"])

const DEFAULT_PARAMETERS: CustomReportCatalogItem[] = [
  { id: "app", label: "App", category: "Core" },
  { id: "date", label: "Date", category: "Time" },
  { id: "platform", label: "Platform", category: "Core" },
]

const DEFAULT_METRICS: CustomReportCatalogItem[] = [
  { id: "estimated_revenue", label: "Estimated revenue", category: "Revenue", format: "currency" },
  { id: "observed_ecpm", label: "Observed eCPM", category: "Revenue", format: "currency" },
  { id: "requests", label: "Requests", category: "Volume", format: "number" },
  { id: "match_rate", label: "Match rate", category: "Performance", format: "percent" },
  { id: "matched_requests", label: "Matched requests", category: "Volume", format: "number" },
  { id: "show_rate", label: "Show rate", category: "Performance", format: "percent" },
  { id: "impressions", label: "Impressions", category: "Volume", format: "number" },
  { id: "arpdau_ads", label: "ARPDAU (ads)", category: "Revenue", format: "currency" },
  { id: "ua_cost", label: "UA cost", category: "Cost", format: "currency" },
  { id: "iap_net_revenue", label: "IAP net revenue", category: "Revenue", format: "currency" },
  { id: "total_revenue_usd", label: "Total revenue (IAA + IAP)", category: "Revenue", format: "currency" },
  { id: "profit", label: "Profit", category: "Revenue", format: "currency" },
]

const PARAMETER_COLUMN_WIDTHS: Record<string, number> = {
  app: 280,
  publisher: 280,
  app_store_id: 280,
  date: 140,
  platform: 140,
}

const DEFAULT_PARAMETER_COLUMN_WIDTH = 160
const METRIC_COLUMN_WIDTH = 168

interface ActiveFilter {
  type: string
  value: string
}

interface MetricRowSpanState {
  rowSpan: number
  hidden: boolean
}

interface AppliedReportQueryState {
  startDate: Date
  endDate: Date
  selectedAppIds: string[]
  dimensions: string[]
  metrics: string[]
  revenueSource: string
  metricFilters: CustomReportMetricFilter[]
  commissionTeamId?: string | null
}

interface CommissionMemberOption {
  userId: string
  email: string
  label: string
  isTeamLead: boolean
}

interface SortableReportFieldItemProps {
  id: string
  label: string
  selected: boolean
  selectedColorClass: string
  onToggle: () => void
}

const metricFilterConditions: Array<{ value: CustomReportMetricFilter["condition"]; label: string }> = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
]

function upsertActiveFilter(filters: ActiveFilter[], type: string, value: string): ActiveFilter[] {
  if (value === "All") return filters.filter((f) => f.type !== type)
  const existing = filters.find((f) => f.type === type)
  if (existing) return filters.map((f) => (f.type === type ? { type, value } : f))
  return [...filters, { type, value }]
}

function SortableReportFieldItem({
  id,
  label,
  selected,
  selectedColorClass,
  onToggle,
}: SortableReportFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !selected })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors text-left",
        selected ? selectedColorClass : "hover:bg-slate-50 text-slate-700",
      )}
    >
      <span
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center shrink-0 text-slate-400",
          selected ? "cursor-grab active:cursor-grabbing hover:bg-white/60" : "opacity-30",
        )}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span
        className={cn(
          "w-1 h-5 rounded-full shrink-0",
          selectedColorClass.includes("emerald") && selected ? "bg-emerald-500" : "",
          selectedColorClass.includes("blue") && selected ? "bg-blue-500" : "",
          !selected ? "bg-transparent" : "",
        )}
      />
      <span className="flex-1 leading-snug">{label}</span>
    </button>
  )
}

function formatMetricValue(
  value: number | string | null | undefined,
  metricId: string,
  metricCatalog: CustomReportCatalogItem[],
): string {
  if (value === undefined || value === null) return "—"
  const metric = metricCatalog.find((m) => m.id === metricId)
  if (!metric || typeof value === "string") return String(value)

  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return String(value)

  switch (metric.format) {
    case "currency":
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "percent":
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case "number":
      return num.toLocaleString("en-US")
    default:
      return String(num)
  }
}

function renderPlatformBadge(platformValue: string) {
  const platform = platformValue || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isAndroid
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {isAndroid ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
        </svg>
      )}
      {platform}
    </Badge>
  )
}

function renderParameterCell(
  paramId: string,
  row: Record<string, string | number | null>,
  selectedParameters: string[],
) {
  if (paramId === "app") {
    const appName = String(row.app_display_name ?? row.app ?? "")
    const appIconUri = typeof row.app_icon_uri === "string" ? row.app_icon_uri : ""
    const appSub = String(row.app_sub ?? "").trim()
    const shouldShowAppSub =
      !selectedParameters.includes("platform") &&
      appSub.length > 0 &&
      appSub.toLowerCase() !== appName.trim().toLowerCase()
    return (
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        <Avatar className="h-10 w-10 rounded-lg shrink-0">
          {appIconUri ? <AvatarImage src={appIconUri} alt={appName} className="rounded-lg object-cover" /> : null}
          <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 truncate">{appName}</div>
          {shouldShowAppSub ? (
            <div className="text-xs text-slate-500 font-mono truncate" title={appSub}>
              {appSub}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (paramId === "platform") {
    return renderPlatformBadge(String(row.platform ?? ""))
  }

  if (paramId === "app_store_id") {
    const displayName = String(row.app_store_display_name ?? row.app_store_id ?? "")
    const storeId = String(row.app_store_id ?? "")
    const appIconUri = typeof row.app_icon_uri === "string" ? row.app_icon_uri : ""
    const storeSub = String(row.app_store_sub ?? "").trim()
    const shouldShowStoreSub =
      !selectedParameters.includes("platform") &&
      storeSub.length > 0 &&
      storeSub.toLowerCase() !== displayName.trim().toLowerCase()
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <Avatar className="h-10 w-10 rounded-lg shrink-0">
          {appIconUri ? <AvatarImage src={appIconUri} alt={displayName} className="rounded-lg object-cover" /> : null}
          <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{displayName}</div>
          {shouldShowStoreSub ? (
            <div className="text-xs text-slate-500 truncate">{storeSub}</div>
          ) : storeId && storeId.toLowerCase() !== displayName.trim().toLowerCase() ? (
            <div className="text-xs text-slate-500 font-mono truncate">{storeId}</div>
          ) : null}
        </div>
      </div>
    )
  }

  if (paramId === "publisher") {
    const displayName = String(row.publisher_display_name ?? row.publisher ?? "")
    const publisherId = String(row.publisher_id ?? row.publisher ?? "")
    const publisherSub = String(row.publisher_sub ?? "").trim()
    return (
      <div className="min-w-[180px]">
        <div className="text-sm font-medium text-slate-900 truncate">{displayName || "—"}</div>
        {publisherSub ? (
          <div className="text-xs text-slate-500 font-mono truncate">{publisherSub}</div>
        ) : publisherId && publisherId.toLowerCase() !== displayName.trim().toLowerCase() ? (
          <div className="text-xs text-slate-500 font-mono truncate">{publisherId}</div>
        ) : null}
      </div>
    )
  }

  return (
    <span className="text-sm text-slate-700 whitespace-nowrap">
      {String(row[paramId] ?? "—")}
    </span>
  )
}

function getParameterColumnWidth(paramId: string) {
  return PARAMETER_COLUMN_WIDTHS[paramId] ?? DEFAULT_PARAMETER_COLUMN_WIDTH
}

function getParameterStickyStyle(parameters: string[], index: number): CSSProperties {
  const left = parameters
    .slice(0, index)
    .reduce((sum, paramId) => sum + getParameterColumnWidth(paramId), 0)
  const width = getParameterColumnWidth(parameters[index])

  return {
    left,
    width,
    minWidth: width,
    maxWidth: width,
  }
}

function getMetricColumnStyle(): CSSProperties {
  return {
    minWidth: METRIC_COLUMN_WIDTH,
  }
}

function buildUaCostRowSpanMap(
  rows: Array<Record<string, string | number | null>>,
  selectedParameters: string[],
): Map<number, MetricRowSpanState> {
  const shouldMergeUaCost =
    selectedParameters.includes("date") &&
    (selectedParameters.includes("app") || selectedParameters.includes("app_store_id"))

  if (!shouldMergeUaCost || rows.length === 0) {
    return new Map()
  }

  const rowSpanMap = new Map<number, MetricRowSpanState>()
  let index = 0

  while (index < rows.length) {
    const row = rows[index]
    const dateKey = String(row.date ?? "").trim()
    const appStoreIdKey = String(row.app_store_id ?? row.app_id ?? row.app ?? "").trim()

    if (!dateKey || !appStoreIdKey) {
      index += 1
      continue
    }

    let end = index + 1
    while (end < rows.length) {
      const nextRow = rows[end]
      const nextDateKey = String(nextRow.date ?? "").trim()
      const nextAppStoreIdKey = String(nextRow.app_store_id ?? nextRow.app_id ?? nextRow.app ?? "").trim()
      if (nextDateKey !== dateKey || nextAppStoreIdKey !== appStoreIdKey) break
      end += 1
    }

    const span = end - index
    if (span > 1) {
      rowSpanMap.set(index, { rowSpan: span, hidden: false })
      for (let i = index + 1; i < end; i += 1) {
        rowSpanMap.set(i, { rowSpan: 0, hidden: true })
      }
    }

    index = end
  }

  return rowSpanMap
}

function findCurrentPersonnelNode(root: PersonnelNode, currentUserId?: string, currentUserEmail?: string): PersonnelNode | null {
  const normalizedEmail = currentUserEmail?.trim().toLowerCase()
  const isCurrentNode =
    (currentUserId && root.linkedUserId === currentUserId) ||
    (normalizedEmail && root.email?.trim().toLowerCase() === normalizedEmail)

  if (isCurrentNode) return root

  for (const child of root.children ?? []) {
    const found = findCurrentPersonnelNode(child, currentUserId, currentUserEmail)
    if (found) return found
  }

  return null
}

function getMetricFilterLabel(filter: CustomReportMetricFilter, metrics: CustomReportCatalogItem[]) {
  const metricLabel = metrics.find((metric) => metric.id === filter.metric)?.label ?? filter.metric
  const conditionLabel =
    metricFilterConditions.find((condition) => condition.value === filter.condition)?.label ?? filter.condition
  return `${metricLabel} ${conditionLabel} ${filter.value}`
}

function filterVisibleParameters(parameters: CustomReportCatalogItem[]): CustomReportCatalogItem[] {
  return parameters.filter((parameter) => !HIDDEN_PARAMETER_IDS.has(parameter.id))
}

function defaultCustomReportName(): string {
  return `Custom Report - ${format(new Date(), "yyyyMMdd")}`
}

function getMonthDateRange(month: Date): { start: Date; end: Date } {
  const start = startOfMonth(month)
  return {
    start,
    end: endOfMonth(month),
  }
}

function escapeExcelHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function CustomReportBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportIdFromUrl = searchParams.get("reportId")
  const folderFromUrl = searchParams.get("folder")

  const canCreateReports = hasScreenFunction("s-reports", "create")
  const canEditReports = hasScreenFunction("s-reports", "edit")
  const canDeleteReports = hasScreenFunction("s-reports", "delete")
  const canPinReports = hasScreenFunction("s-reports", "pin")
  const canManageReportFolders = hasScreenFunction("s-reports", "manage-folders")
  const canExportReports = hasScreenFunction("s-reports", "export-csv")
  const canManageCommission = hasScreenFunction("s-commission", "manage")
  const storedCurrentUser = getCurrentUser()
  const { data: currentUserResponse } = useApi(
    () => authApi.getCurrentUser(),
    { cacheKey: `reports_current_user_${storedCurrentUser?.id ?? "anonymous"}` },
  )
  const currentUser = currentUserResponse?.data ?? storedCurrentUser
  const orgId = currentUser?.organization?.id
  const currentUserId = currentUser?.id ?? storedCurrentUser?.id ?? "anonymous"
  const currentUserTeamIds = (currentUser?.teams ?? storedCurrentUser?.teams ?? [])
    .map((team) => team.id)
    .filter(Boolean)
  const currentUserTeamIdsKey = [...currentUserTeamIds].sort().join("|")

  const [catalogParameters, setCatalogParameters] = useState(DEFAULT_PARAMETERS)
  const [catalogMetrics, setCatalogMetrics] = useState(DEFAULT_METRICS)

  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("preset")
  const [activePresetDays, setActivePresetDays] = useState(30)
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false)

  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)
  const [appsInitialized, setAppsInitialized] = useState(false)

  const [selectedParameters, setSelectedParameters] = useState<string[]>(["app"])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "ua_cost",
    "total_revenue_usd",
    "profit",
  ])

  const [sidebarSearch, setSidebarSearch] = useState("")
  const [metricFilters, setMetricFilters] = useState<CustomReportMetricFilter[]>([])
  const [metricFilterPopoverOpen, setMetricFilterPopoverOpen] = useState(false)
  const [draftMetricFilterMetric, setDraftMetricFilterMetric] = useState("estimated_revenue")
  const [draftMetricFilterCondition, setDraftMetricFilterCondition] =
    useState<CustomReportMetricFilter["condition"]>("gt")
  const [draftMetricFilterValue, setDraftMetricFilterValue] = useState("")
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { type: FILTER_DATE_RANGE, value: "Last 30 days" },
  ])
  const [sortColumn, setSortColumn] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [commissionTeam, setCommissionTeam] = useState("")
  const [commissionTeams, setCommissionTeams] = useState<CommissionTeamOption[]>([])
  const [commissionMembers, setCommissionMembers] = useState<CommissionMemberOption[]>([])
  const [commissionMember, setCommissionMember] = useState("")
  const [memberPermittedAppIds, setMemberPermittedAppIds] = useState<string[] | null>(null)
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false)
  const [memberPermissionsLoading, setMemberPermissionsLoading] = useState(false)
  const canScopeManagedTeams = canManageCommission || commissionTeams.length > 0

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saveReportName, setSaveReportName] = useState(defaultCustomReportName)
  const [saveReportFolder, setSaveReportFolder] = useState("")
  const [availableFolders, setAvailableFolders] = useState<string[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [pinningReport, setPinningReport] = useState(false)
  const [deletingReport, setDeletingReport] = useState(false)
  const [appliedReportQuery, setAppliedReportQuery] = useState<AppliedReportQueryState | null>(null)
  const [loadingSavedReport, setLoadingSavedReport] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const loadedReportIdRef = useRef<string | null>(null)

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { cacheKey: `reports_apps_list_${currentUserId}` },
  )

  const availableApps = useMemo(() => {
    const apps = appsResponse?.apps ?? []
    return apps.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

  const appsForSelection = useMemo(() => {
    if (!canScopeManagedTeams) {
      return availableApps
    }
    if (!commissionTeam || memberPermittedAppIds === null) return []
    const allowed = new Set(memberPermittedAppIds)
    return availableApps.filter((app) => allowed.has(app.appId))
  }, [availableApps, canScopeManagedTeams, commissionTeam, memberPermittedAppIds])

  useEffect(() => {
    reportsApi.getCatalog().then((c) => {
      if (c.dimensions?.length) setCatalogParameters(filterVisibleParameters(c.dimensions))
      if (c.metrics?.length) setCatalogMetrics(c.metrics)
    }).catch(() => {
      /* use defaults */
    })
  }, [])

  useEffect(() => {
    setSelectedParameters((prev) => {
      const next = prev.filter((parameterId) => !HIDDEN_PARAMETER_IDS.has(parameterId))
      if (next.length === 0) return ["app"]
      return next.length === prev.length ? prev : next
    })
  }, [])

  useEffect(() => {
    if (appsInitialized || appsLoading || availableApps.length === 0) return
    if (reportIdFromUrl) return
    const initialIds = appsForSelection.map((app) => app.appId)
    if (initialIds.length > 0) {
      setSelectedApps(initialIds)
      syncAppsActiveFilter(initialIds, appsForSelection)
    }
    setAppsInitialized(true)
  }, [appsInitialized, appsLoading, appsForSelection, reportIdFromUrl])

  useEffect(() => {
    if (reportIdFromUrl || !folderFromUrl?.trim()) return
    setSaveReportFolder(folderFromUrl.trim())
  }, [reportIdFromUrl, folderFromUrl])

  useEffect(() => {
    if (!saveDialogOpen) {
      setIsCreatingFolder(false)
      setNewFolderName("")
      return
    }

    let cancelled = false
    setFoldersLoading(true)
    reportsApi
      .listFolders()
      .then((folders) => {
        if (cancelled) return
        const names = folders
          .map((folder) => folder.name.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
        setAvailableFolders(names)
      })
      .catch(() => {
        if (!cancelled) setAvailableFolders([])
      })
      .finally(() => {
        if (!cancelled) setFoldersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [saveDialogOpen])

  const applyLoadedSavedReport = useCallback(
    (report: CustomReportSaved) => {
      applySavedCustomReport({
        report,
        availableApps,
        setSaveReportName,
        setSaveReportFolder,
        setSavedReportId,
        setIsPinned,
        setSelectedParameters,
        setSelectedMetrics,
        setSelectedApps,
        setMetricFilters,
        setCommissionTeam,
        setCommissionMember,
        setSortColumn,
        setSortDirection,
        setDateFilterMode,
        setActivePresetDays,
        setStartDate,
        setEndDate,
        setSelectedMonth,
        setActiveFilters,
        upsertActiveFilter,
        syncAppsActiveFilter,
      })
      setAppsInitialized(true)
    },
    [availableApps],
  )

  useEffect(() => {
    if (!reportIdFromUrl || appsLoading) return
    if (loadedReportIdRef.current === reportIdFromUrl) return

    let cancelled = false
    const load = async () => {
      setLoadingSavedReport(true)
      try {
        const report = await reportsApi.getSaved(reportIdFromUrl)
        if (cancelled) return
        loadedReportIdRef.current = reportIdFromUrl
        applyLoadedSavedReport(report)
      } catch (err) {
        console.error("Failed to load saved report:", err)
        if (!cancelled) toast.error("Could not load saved report")
      } finally {
        if (!cancelled) setLoadingSavedReport(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reportIdFromUrl, appsLoading, applyLoadedSavedReport])

  useEffect(() => {
    if (appsLoading || availableApps.length === 0) return

    const permittedAppIds = new Set(appsForSelection.map((app) => app.appId))
    setSelectedApps((prev) => {
      const next = prev.filter((appId) => permittedAppIds.has(appId))
      if (next.length === prev.length) return prev
      syncAppsActiveFilter(next, appsForSelection)
      return next
    })
  }, [appsLoading, appsForSelection])

  useEffect(() => {
    if (!orgId) {
      setCommissionTeams([])
      setCommissionMembers([])
      setCommissionMember("")
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const [chart, orgTeams] = await Promise.all([
          organizationsApi.getPersonnelChart(orgId),
          organizationsApi.getTeams(orgId).catch(() => []),
        ])

        if (!chart?.root) {
          if (cancelled) return
          setCommissionTeams([])
          return
        }

        const rawRoot = chart.root
        if (cancelled) return

        const currentNode = findCurrentPersonnelNode(rawRoot, currentUser?.id, currentUser?.email)
        const underManager = currentNode ? collectTeamsUnderPersonnelNode(currentNode) : []
        const memberManagedTeams = collectMembershipManagedTeams(rawRoot, currentUserTeamIds)
        const leadFromChart = currentUser?.id
          ? collectTeamLeadTeamsFromChart(rawRoot, currentUser.id)
          : []
        const leadFromOrg = collectTeamLeadTeamsFromOrgTeams(orgTeams, currentUser?.id)
        setCommissionTeams(
          mergeCommissionTeamOptions(underManager, memberManagedTeams, leadFromChart, leadFromOrg),
        )
      } catch {
        if (cancelled) return
        setCommissionTeams([])
        setCommissionMembers([])
        setCommissionMember("")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [orgId, currentUser?.id, currentUser?.email, currentUserTeamIdsKey])

  useEffect(() => {
    if (!canScopeManagedTeams) return
    if (commissionTeams.length === 0) {
      setCommissionTeam("")
      setCommissionMembers([])
      setCommissionMember("")
      setMemberPermittedAppIds(null)
      setActiveFilters((prev) => prev.filter((filter) => filter.type !== FILTER_COMMISSION_TEAM))
      return
    }
    if (commissionTeams.some((team) => team.teamId === commissionTeam)) return
    setCommissionTeam(commissionTeams[0].teamId)
  }, [commissionTeam, commissionTeams])

  useEffect(() => {
    if (!canScopeManagedTeams || !commissionTeam) {
      setCommissionMembers([])
      setCommissionMember("")
      setMemberOptionsLoading(false)
      return
    }

    let cancelled = false
    setMemberOptionsLoading(true)
    teamMembersApi
      .filterTeamMembers({ teamId: commissionTeam, page: 1, pageSize: 500 })
      .then((response) => {
        if (cancelled) return
        const nextMembers = response.data.items
          .map((member): CommissionMemberOption | null => {
            const email = member.email?.trim()
            if (!email) return null
            const teamMeta = member.teams.find((team) => team.id === commissionTeam)
            return {
              userId: member.id,
              email,
              label: member.fullName ? `${member.fullName} (${email})` : email,
              isTeamLead: Boolean(teamMeta?.isTeamLead),
            }
          })
          .filter((member): member is CommissionMemberOption => Boolean(member))
          .sort((a, b) => {
            if (a.isTeamLead !== b.isTeamLead) return a.isTeamLead ? -1 : 1
            return a.label.localeCompare(b.label)
          })

        setCommissionMembers(nextMembers)
        if (nextMembers.length === 0) {
          setCommissionMember("")
          return
        }

        if (nextMembers.some((member) => member.userId === commissionMember)) {
          setCommissionMember(commissionMember)
          return
        }

        const defaultMember = nextMembers.find((member) => member.isTeamLead) ?? nextMembers[0]
        setCommissionMember(defaultMember.userId)
      })
      .catch(() => {
        if (!cancelled) {
          setCommissionMembers([])
          setCommissionMember("")
        }
      })
      .finally(() => {
        if (!cancelled) setMemberOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canScopeManagedTeams, commissionTeam, commissionMember])

  useEffect(() => {
    if (!canScopeManagedTeams || !commissionTeam) {
      setMemberPermittedAppIds(null)
      setMemberPermissionsLoading(false)
      return
    }

    let cancelled = false
    setMemberPermissionsLoading(true)
    reportsApi
      .getTeamApps(commissionTeam)
      .then((response) => {
        if (cancelled) return
        const appIds = [...new Set((response.admobAppIds ?? []).filter(Boolean))]
        setMemberPermittedAppIds(appIds)
      })
      .catch(() => {
        if (!cancelled) setMemberPermittedAppIds(null)
      })
      .finally(() => {
        if (!cancelled) setMemberPermissionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canScopeManagedTeams, commissionTeam])

  useEffect(() => {
    if (!canScopeManagedTeams || !commissionTeam || memberPermittedAppIds === null) return
    const permitted = appsForSelection.map((app) => app.appId)
    setSelectedApps(permitted)
    syncAppsActiveFilter(permitted, appsForSelection)
  }, [canScopeManagedTeams, commissionTeam, memberPermittedAppIds, appsForSelection])

  useEffect(() => {
    if (!commissionTeam) return
    const label = commissionTeams.find((team) => team.teamId === commissionTeam)?.label
    if (!label) return
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_TEAM, label))
  }, [commissionTeam, commissionTeams])

  useEffect(() => {
    if (!commissionMember) return
    const label = commissionMembers.find((member) => member.userId === commissionMember)?.label
    if (!label) return
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_MEMBER, label))
  }, [commissionMember, commissionMembers])

  const currentReportQuery = useMemo<AppliedReportQueryState>(
    () => ({
      startDate,
      endDate,
      selectedAppIds: [...selectedApps],
      dimensions: [...selectedParameters],
      metrics: [...selectedMetrics],
      revenueSource: "All",
      metricFilters: [...metricFilters],
      commissionTeamId: canScopeManagedTeams ? commissionTeam || null : null,
    }),
    [
      startDate,
      endDate,
      selectedApps,
      selectedParameters,
      selectedMetrics,
      metricFilters,
      canScopeManagedTeams,
      commissionTeam,
    ],
  )

  const hasPendingApply = useMemo(() => {
    if (!appliedReportQuery) return true

    const normalize = (state: AppliedReportQueryState) =>
      JSON.stringify({
        startDate: format(state.startDate, "yyyy-MM-dd"),
        endDate: format(state.endDate, "yyyy-MM-dd"),
        selectedAppIds: [...state.selectedAppIds].sort(),
        dimensions: state.dimensions,
        metrics: state.metrics,
        revenueSource: state.revenueSource,
        metricFilters: state.metricFilters,
        commissionTeamId: state.commissionTeamId ?? null,
      })

    return normalize(currentReportQuery) !== normalize(appliedReportQuery)
  }, [currentReportQuery, appliedReportQuery])

  useEffect(() => {
    setAppliedReportQuery(null)
  }, [reportIdFromUrl])

  const handleApplyFilters = () => {
    setAppliedReportQuery(currentReportQuery)
  }

  const { data: reportData, loading: reportLoading, error: reportError } = useCustomReportQuery({
    startDate: appliedReportQuery?.startDate ?? startDate,
    endDate: appliedReportQuery?.endDate ?? endDate,
    selectedAppIds: appliedReportQuery?.selectedAppIds ?? [],
    dimensions: appliedReportQuery?.dimensions ?? [],
    metrics: appliedReportQuery?.metrics ?? [],
    revenueSource: appliedReportQuery?.revenueSource ?? "All",
    metricFilters: appliedReportQuery?.metricFilters ?? [],
    commissionUsernames: null,
    commissionTeamId: appliedReportQuery?.commissionTeamId ?? null,
    sortBy: sortColumn,
    sortDir: sortDirection,
    enabled: Boolean(appliedReportQuery) && (appliedReportQuery?.selectedAppIds.length ?? 0) > 0,
  })

  const dateSelectValue =
    dateFilterMode === "month"
      ? "month"
      : dateFilterMode === "custom"
        ? "custom"
        : activePresetDays === 7
          ? "7"
          : activePresetDays === 30
            ? "30"
            : activePresetDays === 90
              ? "90"
              : "30"

  const toggleParameter = (paramId: string) => {
    setSelectedParameters((prev) =>
      prev.includes(paramId) ? prev.filter((id) => id !== paramId) : [...prev, paramId],
    )
  }

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId],
    )
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const selectedAppLabels = appsForSelection
    .filter((a) => selectedApps.includes(a.appId))
    .map((a) => a.displayName || a.name)

  const dateRangeLabel =
    dateFilterMode === "month"
      ? format(selectedMonth, "MMMM yyyy", { locale: enUS })
      : dateFilterMode === "preset" && activePresetDays > 0
        ? `Last ${activePresetDays} days`
        : `${format(startDate, "M/d/yyyy", { locale: enUS })} – ${format(endDate, "M/d/yyyy", { locale: enUS })}`

  const maxSelectableMonth = format(new Date(), "yyyy-MM")

  const filteredParameters = useMemo(() => {
    if (!sidebarSearch.trim()) return catalogParameters
    const q = sidebarSearch.toLowerCase()
    return catalogParameters.filter((p) => p.label.toLowerCase().includes(q))
  }, [sidebarSearch, catalogParameters])

  const filteredMetrics = useMemo(() => {
    if (!sidebarSearch.trim()) return catalogMetrics
    const q = sidebarSearch.toLowerCase()
    return catalogMetrics.filter((m) => m.label.toLowerCase().includes(q))
  }, [sidebarSearch, catalogMetrics])

  const orderedFilteredParameters = useMemo(() => {
    const visibleIds = new Set(filteredParameters.map((item) => item.id))
    const selected = selectedParameters
      .filter((id) => visibleIds.has(id))
      .map((id) => filteredParameters.find((item) => item.id === id))
      .filter((item): item is CustomReportCatalogItem => Boolean(item))
    const unselected = filteredParameters.filter((item) => !selectedParameters.includes(item.id))
    return [...selected, ...unselected]
  }, [filteredParameters, selectedParameters])

  const orderedFilteredMetrics = useMemo(() => {
    const visibleIds = new Set(filteredMetrics.map((item) => item.id))
    const selected = selectedMetrics
      .filter((id) => visibleIds.has(id))
      .map((id) => filteredMetrics.find((item) => item.id === id))
      .filter((item): item is CustomReportCatalogItem => Boolean(item))
    const unselected = filteredMetrics.filter((item) => !selectedMetrics.includes(item.id))
    return [...selected, ...unselected]
  }, [filteredMetrics, selectedMetrics])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleParameterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (!selectedParameters.includes(activeId) || !selectedParameters.includes(overId)) return

    setSelectedParameters((prev) => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const buildSaveReportPayload = (name: string): SaveCustomReportRequest => {
    const filters: CustomReportFilters = {
      from: format(startDate, "yyyy-MM-dd"),
      to: format(endDate, "yyyy-MM-dd"),
      appIds: selectedApps,
      revenueSource: "All",
      metricFilters,
      commissionUser: canScopeManagedTeams ? commissionMember || null : null,
      commissionTeamId: canScopeManagedTeams ? commissionTeam || null : null,
      sortBy: sortColumn,
      sortDir: sortDirection,
      activePresetDays: dateFilterMode === "preset" && activePresetDays > 0 ? activePresetDays : null,
      selectedMonth: dateFilterMode === "month" ? format(selectedMonth, "yyyy-MM") : null,
    }
    return {
      name: name.trim(),
      folder: saveReportFolder.trim() || null,
      filters,
      dimensions: [...selectedParameters],
      metrics: [...selectedMetrics],
    }
  }

  const persistSavedReport = async (name: string) => {
    const payload = buildSaveReportPayload(name)
    if (savedReportId) {
      return reportsApi.updateSaved(savedReportId, payload)
    }
    return reportsApi.createSaved(payload)
  }

  const handleSaveReportClick = () => {
    if (savedReportId ? !canEditReports : !canCreateReports) {
      toast.error(savedReportId ? "You do not have permission to update reports." : "You do not have permission to save reports.")
      return
    }

    if (selectedParameters.length === 0 || selectedMetrics.length === 0) {
      toast.error("Select at least one parameter and one metric before saving.")
      return
    }
    if (selectedApps.length === 0) {
      toast.error("Select at least one app before saving.")
      return
    }
    if (savedReportId) {
      void handleConfirmSaveReport(saveReportName)
      return
    }
    setSaveReportName(defaultCustomReportName())
    setSaveDialogOpen(true)
  }

  const handleConfirmSaveReport = async (nameOverride?: string) => {
    if (savedReportId ? !canEditReports : !canCreateReports) {
      toast.error(savedReportId ? "You do not have permission to update reports." : "You do not have permission to save reports.")
      return
    }

    const name = (nameOverride ?? saveReportName).trim()
    if (!name) {
      toast.error("Report name is required.")
      return
    }

    const isUpdate = Boolean(savedReportId)
    setSavingReport(true)
    try {
      const saved = await persistSavedReport(name)
      setSavedReportId(saved.id)
      setSaveReportName(saved.name)
      setSaveReportFolder(saved.folder ?? "")
      setIsPinned(Boolean(saved.isPinned))
      loadedReportIdRef.current = saved.id
      setSaveDialogOpen(false)
      invalidateCache("custom_reports_saved_list")
      invalidateCache("custom_reports_folders_list")
      toast.success(isUpdate ? "Report updated" : "Report saved")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save report"
      toast.error(message)
    } finally {
      setSavingReport(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!canManageReportFolders) {
      toast.error("You do not have permission to manage report folders.")
      return
    }

    const name = newFolderName.trim()
    if (!name) {
      toast.error("Folder name is required.")
      return
    }

    setCreatingFolder(true)
    try {
      const folder = await reportsApi.createFolder(name)
      const normalizedName = folder.name.trim()
      setAvailableFolders((prev) =>
        [...new Set([...prev, normalizedName])].sort((a, b) => a.localeCompare(b)),
      )
      setSaveReportFolder(normalizedName)
      setNewFolderName("")
      setIsCreatingFolder(false)
      invalidateCache("custom_reports_folders_list")
      toast.success("Folder created")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create folder"
      toast.error(message)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleTogglePin = async () => {
    if (!savedReportId) return
    if (!canPinReports) {
      toast.error("You do not have permission to pin reports.")
      return
    }
    setPinningReport(true)
    try {
      const nextPinned = !isPinned
      const updated = await reportsApi.setPinned(savedReportId, nextPinned)
      setIsPinned(updated.isPinned)
      notifyPinnedCustomReportsChanged()
      toast.success(updated.isPinned ? "Pinned to sidebar" : "Unpinned from sidebar")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update pin"
      toast.error(message)
    } finally {
      setPinningReport(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!savedReportId) return
    if (!canDeleteReports) {
      toast.error("You do not have permission to delete reports.")
      return
    }

    setDeletingReport(true)
    try {
      await reportsApi.deleteSaved(savedReportId)
      if (isPinned) notifyPinnedCustomReportsChanged()
      invalidateCache("custom_reports_saved_list")
      invalidateCache("custom_reports_folders_list")
      setDeleteDialogOpen(false)
      toast.success("Report deleted")
      router.push("/reports")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete report"
      toast.error(message)
    } finally {
      setDeletingReport(false)
    }
  }

  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (!selectedMetrics.includes(activeId) || !selectedMetrics.includes(overId)) return

    setSelectedMetrics((prev) => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const applyDatePreset = (days: number) => {
    setDateFilterMode("preset")
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
    setActivePresetDays(days)
    setDatePopoverOpen(false)
    setMonthPopoverOpen(false)
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, `Last ${days} days`))
  }

  const applySelectedMonth = (month: Date) => {
    const normalized = startOfMonth(month)
    const { start, end } = getMonthDateRange(normalized)
    setDateFilterMode("month")
    setSelectedMonth(normalized)
    setStartDate(start)
    setEndDate(end)
    setMonthPopoverOpen(false)
    setDatePopoverOpen(false)
    setActiveFilters((prev) =>
      upsertActiveFilter(prev, FILTER_DATE_RANGE, format(normalized, "MMMM yyyy", { locale: enUS })),
    )
  }

  const onCustomDateSelect = (range: DateRange | undefined) => {
    if (range?.from) setStartDate(range.from)
    if (range?.to) setEndDate(range.to)
    if (range?.from && range?.to) {
      setDateFilterMode("custom")
      const label = `${format(range.from, "M/d/yyyy", { locale: enUS })} – ${format(range.to, "M/d/yyyy", { locale: enUS })}`
      setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, label))
    }
  }

  const handleDateSelectChange = (value: string) => {
    if (value === "month") {
      applySelectedMonth(selectedMonth)
      setMonthPopoverOpen(true)
      return
    }
    if (value === "custom") {
      setDateFilterMode("custom")
      setDatePopoverOpen(true)
      return
    }
    applyDatePreset(Number(value))
  }

  const handleMonthInputChange = (value: string) => {
    if (!value) return
    const [yearPart, monthPart] = value.split("-").map(Number)
    if (!yearPart || !monthPart) return
    applySelectedMonth(new Date(yearPart, monthPart - 1, 1))
  }

  const handleCommissionTeamChange = (value: string) => {
    setCommissionTeam(value)
    setCommissionMembers([])
    setCommissionMember("")
    setMemberPermittedAppIds(null)
    const label = commissionTeams.find((team) => team.teamId === value)?.label ?? value
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_TEAM, label))
  }

  const handleCommissionMemberChange = (value: string) => {
    setCommissionMember(value)
    setMemberPermittedAppIds(null)
    const label = commissionMembers.find((member) => member.userId === value)?.label ?? value
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_MEMBER, label))
  }

  const addMetricFilter = () => {
    const value = Number(draftMetricFilterValue)
    if (!draftMetricFilterMetric || Number.isNaN(value)) return

    setMetricFilters((prev) => [
      ...prev,
      {
        metric: draftMetricFilterMetric,
        condition: draftMetricFilterCondition,
        value,
      },
    ])
    setDraftMetricFilterValue("")
    setMetricFilterPopoverOpen(false)
  }

  const removeMetricFilter = (index: number) => {
    setMetricFilters((prev) => prev.filter((_, i) => i !== index))
  }

  const syncAppsActiveFilter = (appIds: string[], apps: App[]) => {
    const value =
      appIds.length === 0
        ? "None selected"
        : appIds.length === apps.length
          ? "All apps"
          : appIds.length === 1
            ? apps.find((a) => a.appId === appIds[0])?.displayName ??
              apps.find((a) => a.appId === appIds[0])?.name ??
              "1 app"
            : `${appIds.length} apps`
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_APPS, value))
  }

  const toggleAppWithFilter = (appId: string) => {
    setSelectedApps((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
      syncAppsActiveFilter(next, appsForSelection)
      return next
    })
  }

  const removeFilter = (type: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.type !== type))
    switch (type) {
      case FILTER_DATE_RANGE:
        setDateFilterMode("preset")
        setEndDate(new Date())
        setStartDate(subDays(new Date(), 30))
        setActivePresetDays(30)
        setDatePopoverOpen(false)
        setMonthPopoverOpen(false)
        break
      case FILTER_APPS:
        if (canScopeManagedTeams) {
          const ids = appsForSelection.map((app) => app.appId)
          setSelectedApps(ids)
          syncAppsActiveFilter(ids, appsForSelection)
        } else {
          setSelectedApps(availableApps.map((app) => app.appId))
          syncAppsActiveFilter(availableApps.map((app) => app.appId), availableApps)
        }
        break
      case FILTER_COMMISSION_TEAM:
      case FILTER_COMMISSION_MEMBER:
        break
    }
  }

  const clearAllFilters = () => {
    applyDatePreset(30)
    const pool = canScopeManagedTeams ? appsForSelection : availableApps
    const firstId = pool[0]?.appId
    if (firstId) {
      setSelectedApps([firstId])
      syncAppsActiveFilter([firstId], pool)
    }
    setMetricFilters([])
    const nextFilters = [{ type: FILTER_DATE_RANGE, value: "Last 30 days" }]
    const teamLabel = commissionTeams.find((team) => team.teamId === commissionTeam)?.label
    const memberLabel = commissionMembers.find((member) => member.userId === commissionMember)?.label
    const withTeamFilter = teamLabel
      ? upsertActiveFilter(nextFilters, FILTER_COMMISSION_TEAM, teamLabel)
      : nextFilters
    setActiveFilters(
      memberLabel
        ? upsertActiveFilter(withTeamFilter, FILTER_COMMISSION_MEMBER, memberLabel)
        : withTeamFilter,
    )
  }

  const appsTriggerLabel =
    selectedAppLabels.length === 0
      ? appsLoading || memberPermissionsLoading
        ? "Loading apps..."
        : canScopeManagedTeams && memberPermittedAppIds?.length === 0
          ? "No permitted apps"
          : "Select apps"
      : selectedAppLabels.length === 1
        ? selectedAppLabels[0]
        : selectedAppLabels.length === appsForSelection.length
          ? "All apps"
          : `${selectedAppLabels.length} apps`

  const reportPageTitle = loadingSavedReport && reportIdFromUrl
    ? "Loading report..."
    : savedReportId && saveReportName.trim()
      ? saveReportName.trim()
      : "Custom Report"

  const displayedParameters = appliedReportQuery?.dimensions ?? []
  const displayedMetrics = appliedReportQuery?.metrics ?? []

  const folderSelectOptions = useMemo(() => {
    const current = saveReportFolder.trim()
    return current && !availableFolders.includes(current)
      ? [...availableFolders, current].sort((a, b) => a.localeCompare(b))
      : availableFolders
  }, [availableFolders, saveReportFolder])

  const tableRows = reportData?.rows ?? []
  const tableTotals = reportData?.totals ?? {}
  const uaCostRowSpanMap = useMemo(
    () => buildUaCostRowSpanMap(tableRows, displayedParameters),
    [tableRows, displayedParameters],
  )

  const handleExportExcel = () => {
    if (!canExportReports) {
      toast.error("You do not have permission to export reports.")
      return
    }

    if (tableRows.length === 0) return

    const parameterHeaders = displayedParameters.map((paramId) => {
      const param = catalogParameters.find((p) => p.id === paramId)
      return param?.label ?? paramId
    })
    const metricHeaders = displayedMetrics.map((metricId) => {
      const metric = catalogMetrics.find((m) => m.id === metricId)
      return metric?.label ?? metricId
    })

    const getParameterDisplayValue = (paramId: string, row: Record<string, string | number | null>) => {
      if (paramId === "app") return row.app_display_name ?? row.app ?? ""
      if (paramId === "publisher") return row.publisher_display_name ?? row.publisher ?? ""
      if (paramId === "app_store_id") return row.app_store_display_name ?? row.app_store_id ?? ""
      return row[paramId] ?? ""
    }

    const headerHtml = [...parameterHeaders, ...metricHeaders]
      .map((header) => `<th>${escapeExcelHtml(header)}</th>`)
      .join("")

    const totalHtml = [
      ...displayedParameters.map((_, index) => (index === 0 ? "Total" : "")),
      ...displayedMetrics.map((metricId) => formatMetricValue(tableTotals[metricId], metricId, catalogMetrics)),
    ]
      .map((value) => `<td>${escapeExcelHtml(value)}</td>`)
      .join("")

    const rowsHtml = tableRows
      .map((row) => {
        const parameterCells = displayedParameters.map((paramId) =>
          escapeExcelHtml(getParameterDisplayValue(paramId, row)),
        )
        const metricCells = displayedMetrics.map((metricId) =>
          escapeExcelHtml(formatMetricValue(row[metricId], metricId, catalogMetrics)),
        )
        return `<tr>${[...parameterCells, ...metricCells].map((value) => `<td>${value}</td>`).join("")}</tr>`
      })
      .join("")

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; white-space: nowrap; }
    th { background: #f1f5f9; font-weight: 700; }
    .total td { background: #f8fafc; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>
      <tr class="total">${totalHtml}</tr>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `custom-report-${format(new Date(), "yyyyMMdd-HHmm")}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const tableContent = !appliedReportQuery ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-slate-600">
        Adjust filters, then click Apply to load report data.
      </p>
    </div>
  ) : reportLoading ? (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  ) : reportError ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8 gap-2">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm text-red-600">{reportError}</p>
    </div>
  ) : displayedParameters.length === 0 || displayedMetrics.length === 0 ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-slate-600">
        Select at least one parameter and one metric in the right panel to view the report.
      </p>
    </div>
  ) : tableRows.length === 0 ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-slate-600">No data for the selected filters.</p>
    </div>
  ) : (
    <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
      <TableHeader>
        <TableRow className="border-b-0">
          {displayedParameters.map((paramId, index) => {
            const param = catalogParameters.find((p) => p.id === paramId)
            return (
              <TableHead
                key={paramId}
                className={cn(
                  "sticky top-0 z-50 bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 whitespace-nowrap",
                  index === 0 && "pl-5",
                  index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                )}
                style={{ ...getParameterStickyStyle(displayedParameters, index), top: 0 }}
                onClick={() => handleSort(paramId)}
              >
                <div className="flex items-center gap-1">
                  {param?.label}
                  {sortColumn === paramId && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                  <HelpCircle className="h-3 w-3 text-slate-300" />
                </div>
              </TableHead>
            )
          })}
          {displayedMetrics.map((metricId, index) => {
            const metric = catalogMetrics.find((m) => m.id === metricId)
            return (
              <TableHead
                key={metricId}
                className={cn(
                  "sticky top-0 z-40 bg-white text-xs font-medium text-slate-600 text-right cursor-pointer hover:bg-slate-50 whitespace-nowrap",
                  index === displayedMetrics.length - 1 && "pr-5",
                )}
                style={{ ...getMetricColumnStyle(), top: 0 }}
                onClick={() => handleSort(metricId)}
              >
                <div className="flex items-center justify-end gap-1">
                  {metric?.label}
                  {sortColumn === metricId && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                  <HelpCircle className="h-3 w-3 text-slate-300" />
                </div>
              </TableHead>
            )
          })}
        </TableRow>
        <TableRow className="border-b border-slate-200 bg-slate-100">
          {displayedParameters.map((paramId, index) => (
            <TableHead
              key={`total-p-${paramId}`}
              className={cn(
                "sticky top-10 z-50 bg-slate-100 py-3",
                index === 0 && "pl-5",
                index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={{ ...getParameterStickyStyle(displayedParameters, index), top: "2.5rem" }}
            >
              {index === 0 ? (
                <span className="text-sm font-bold text-slate-900">Total</span>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </TableHead>
          ))}
          {displayedMetrics.map((metricId, index) => (
            <TableHead
              key={`total-${metricId}`}
              className={cn(
                "sticky top-10 z-40 bg-slate-100 py-3 text-right text-sm font-bold text-slate-900 whitespace-nowrap",
                index === displayedMetrics.length - 1 && "pr-5",
              )}
              style={{ ...getMetricColumnStyle(), top: "2.5rem" }}
            >
              {formatMetricValue(tableTotals[metricId], metricId, catalogMetrics)}
            </TableHead>
          ))}
        </TableRow>
        <TableRow className="border-b">
          {displayedParameters.map((paramId, index) => (
            <TableHead
              key={`bar-p-${paramId}`}
              className={cn(
                "sticky top-20 z-50 h-1 bg-white p-0",
                index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={{ ...getParameterStickyStyle(displayedParameters, index), top: "5rem" }}
            >
              <div className="h-1 bg-emerald-500" />
            </TableHead>
          ))}
          {displayedMetrics.map((metricId) => (
            <TableHead
              key={`bar-m-${metricId}`}
              className="sticky top-20 z-40 h-1 bg-white p-0"
              style={{ ...getMetricColumnStyle(), top: "5rem" }}
            >
              <div className="h-1 bg-blue-500" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableRows.map((row, idx) => (
          <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
            {displayedParameters.map((paramId, index) => (
              <TableCell
                key={paramId}
                className={cn(
                  "sticky z-20 py-2",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                  index === 0 && "pl-5",
                  index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                )}
                style={getParameterStickyStyle(displayedParameters, index)}
              >
                {renderParameterCell(paramId, row, displayedParameters)}
              </TableCell>
            ))}
            {displayedMetrics.map((metricId, index) => {
              if (metricId === "ua_cost") {
                const spanState = uaCostRowSpanMap.get(idx)
                if (spanState?.hidden) return null

                return (
                  <TableCell
                    key={metricId}
                    rowSpan={spanState?.rowSpan}
                    className={cn(
                      "text-sm text-right text-slate-700 py-2 whitespace-nowrap align-middle",
                      index === displayedMetrics.length - 1 && "pr-5",
                    )}
                    style={getMetricColumnStyle()}
                  >
                    {formatMetricValue(row[metricId], metricId, catalogMetrics)}
                  </TableCell>
                )
              }

              return (
                <TableCell
                  key={metricId}
                  className={cn(
                    "text-sm text-right text-slate-700 py-2 whitespace-nowrap",
                    index === displayedMetrics.length - 1 && "pr-5",
                  )}
                  style={getMetricColumnStyle()}
                >
                  {formatMetricValue(row[metricId], metricId, catalogMetrics)}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </table>
  )

  return (
    <div className="flex flex-col gap-6">
      <Dialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          if (!savingReport) setSaveDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{savedReportId ? "Edit report" : "Save report"}</DialogTitle>
            <DialogDescription>
              {savedReportId
                ? "Update the report name or folder."
                : "Save the current filters, parameters, and metrics for quick access later."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="save-report-name">Report name</Label>
            <Input
              id="save-report-name"
              value={saveReportName}
              onChange={(e) => setSaveReportName(e.target.value)}
              placeholder={defaultCustomReportName()}
              maxLength={200}
              disabled={savingReport}
            />
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="save-report-folder">Folder (optional)</Label>
                {canManageReportFolders ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={savingReport || creatingFolder}
                    onClick={() => {
                      setIsCreatingFolder((prev) => !prev)
                      setNewFolderName("")
                    }}
                    title="Create new folder"
                    aria-label="Create new folder"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <Select
                value={saveReportFolder.trim() || "__none"}
                onValueChange={(value) => setSaveReportFolder(value === "__none" ? "" : value)}
                disabled={savingReport || foldersLoading || creatingFolder}
              >
                <SelectTrigger id="save-report-folder" className="bg-white">
                  <SelectValue placeholder={foldersLoading ? "Loading folders..." : "Select folder"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No folder</SelectItem>
                  {folderSelectOptions.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManageReportFolders && isCreatingFolder ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    maxLength={100}
                    disabled={savingReport || creatingFolder}
                  />
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={savingReport || creatingFolder || !newFolderName.trim()}
                    onClick={() => void handleCreateFolder()}
                  >
                    {creatingFolder ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={savingReport || creatingFolder}
                    onClick={() => {
                      setIsCreatingFolder(false)
                      setNewFolderName("")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingReport}
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={savingReport || !saveReportName.trim()}
              onClick={() => void handleConfirmSaveReport()}
            >
              {savingReport ? "Saving…" : savedReportId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deletingReport) setDeleteDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete report</DialogTitle>
            <DialogDescription>
              {savedReportId
                ? `Delete "${saveReportName.trim() || "this report"}"? This action cannot be undone.`
                : "Delete this report? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingReport}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingReport}
              onClick={() => void handleDeleteReport()}
            >
              {deletingReport ? "Deleting…" : "Delete report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {reportIdFromUrl ? (
            <Button
              type="button"
              variant="ghost"
              className="mb-2 h-8 px-2 text-slate-600 hover:text-slate-900"
              onClick={() => router.push("/reports")}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Reports
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{reportPageTitle}</h1>
            {savedReportId && canEditReports ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                disabled={savingReport || loadingSavedReport}
                onClick={() => setSaveDialogOpen(true)}
                title="Edit report name"
                aria-label="Edit report name"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Build ad activity reports with custom parameters and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedReportId && canDeleteReports ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={deletingReport || savingReport || loadingSavedReport || pinningReport}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
          {savedReportId && canPinReports ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={pinningReport || savingReport || loadingSavedReport || deletingReport}
              onClick={() => void handleTogglePin()}
              title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
              aria-label={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          ) : null}
          {(savedReportId ? canEditReports : canCreateReports) ? (
            <Button
              className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
              type="button"
              disabled={savingReport || loadingSavedReport || deletingReport}
              onClick={handleSaveReportClick}
            >
              <Save className="w-4 h-4" />
              {savingReport ? "Saving…" : savedReportId ? "Update report" : "Save report"}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <CardDescription>Date range, apps, and report criteria. Click Apply to refresh data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <Select value={dateSelectValue} onValueChange={handleDateSelectChange}>
              <SelectTrigger className="w-44 h-10 bg-white">
                <CalendarIcon className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="month">Select month</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>

            {dateFilterMode === "month" && (
              <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 bg-white border-slate-200" type="button">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-2">
                    <Label htmlFor="report-month-picker" className="text-sm font-medium text-slate-700">
                      Month
                    </Label>
                    <Input
                      id="report-month-picker"
                      type="month"
                      className="h-10 w-[220px]"
                      max={maxSelectableMonth}
                      value={format(selectedMonth, "yyyy-MM")}
                      onChange={(e) => handleMonthInputChange(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      {format(startDate, "M/d/yyyy", { locale: enUS })} –{" "}
                      {format(endDate, "M/d/yyyy", { locale: enUS })}
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {dateFilterMode === "custom" && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 bg-white border-slate-200" type="button">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-1 p-2 border-b border-slate-100">
                    {datePresets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={activePresetDays === preset.days ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-7 text-xs",
                          activePresetDays === preset.days && "bg-blue-600 hover:bg-blue-700",
                        )}
                        onClick={() => applyDatePreset(preset.days)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Calendar
                    mode="range"
                    locale={enUS}
                    selected={{ from: startDate, to: endDate }}
                    onSelect={onCustomDateSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            {canScopeManagedTeams && (
              <>
                <Select value={commissionTeam} onValueChange={handleCommissionTeamChange}>
                  <SelectTrigger className="w-52 h-10 bg-white" disabled={commissionTeams.length === 0}>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {commissionTeams.map((team) => (
                      <SelectItem key={team.teamId} value={team.teamId}>
                        {team.label}
                      </SelectItem>
                    ))}
                    {commissionTeams.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-slate-500">
                        No teams under you or as team lead
                      </div>
                    ) : null}
                  </SelectContent>
                </Select>

                <div className="hidden">
                  <Select value={commissionMember} onValueChange={handleCommissionMemberChange}>
                    <SelectTrigger
                      className="w-64 h-10 bg-white"
                      disabled={!commissionTeam || commissionMembers.length === 0 || memberOptionsLoading}
                    >
                      <SelectValue placeholder={memberOptionsLoading ? "Loading team members..." : "Select team member"} />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionMembers.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.label}
                        </SelectItem>
                      ))}
                      {!memberOptionsLoading && commissionMembers.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-slate-500">
                          No team members found
                        </div>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-w-[11rem] max-w-[280px] justify-between bg-white border-slate-200 font-normal"
                  type="button"
                  disabled={appsLoading || memberPermissionsLoading}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{appsTriggerLabel}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search app name, App ID, or Store ID..." />
                  <CommandList>
                    <CommandEmpty>No apps found.</CommandEmpty>
                    <CommandGroup>
                      <div className="flex gap-2 px-2 py-1.5 border-b border-slate-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const ids = appsForSelection.map((a) => a.appId)
                            setSelectedApps(ids)
                            syncAppsActiveFilter(ids, appsForSelection)
                          }}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedApps([])
                            syncAppsActiveFilter([], appsForSelection)
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                      {commissionTeam && commissionMember && memberPermittedAppIds !== null && appsForSelection.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          No permitted apps for the selected team member.
                        </div>
                      ) : null}
                      {appsForSelection.map((app) => (
                        <CommandItem
                          key={app.appId}
                          value={[
                            app.displayName || "",
                            app.name || "",
                            app.appId || "",
                            app.appStoreId || "",
                          ].join(" ")}
                          onSelect={() => toggleAppWithFilter(app.appId)}
                          className="cursor-pointer"
                        >
                          <Checkbox checked={selectedApps.includes(app.appId)} className="mr-2" />
                          <Avatar className="h-8 w-8 rounded-lg mr-2">
                            <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs">
                              {(app.displayName || app.name).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {app.displayName || app.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {app.platform} · {app.appStoreId || app.appId}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={metricFilterPopoverOpen} onOpenChange={setMetricFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 bg-white" type="button">
                  <Plus className="w-4 h-4" />
                  Add filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[560px] p-4" align="start">
                <div className="space-y-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_7rem_10rem] gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1.5">Metric</div>
                    <Select value={draftMetricFilterMetric} onValueChange={setDraftMetricFilterMetric}>
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogMetrics.map((metric) => (
                          <SelectItem key={metric.id} value={metric.id}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1.5">Condition</div>
                    <Select
                      value={draftMetricFilterCondition}
                      onValueChange={(value) =>
                        setDraftMetricFilterCondition(value as CustomReportMetricFilter["condition"])
                      }
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {metricFilterConditions.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1.5">Value</div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={draftMetricFilterValue}
                      onChange={(event) => setDraftMetricFilterValue(event.target.value)}
                      placeholder="Value"
                      className="h-10 bg-white"
                    />
                  </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setMetricFilterPopoverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={addMetricFilter}
                      disabled={!draftMetricFilterMetric || draftMetricFilterValue.trim() === ""}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
              type="button"
              disabled={loadingSavedReport || reportLoading || !hasPendingApply}
              onClick={handleApplyFilters}
            >
              <Search className="w-4 h-4" />
              Apply
            </Button>
          </div>

          {(activeFilters.length > 0 || metricFilters.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
              <span className="text-sm text-slate-500">Active filters:</span>
              {activeFilters
                .filter((filter) => filter.type !== FILTER_COMMISSION_MEMBER)
                .map((filter) => (
                <Badge
                  key={filter.type}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
                >
                  {filter.type}: {filter.value}
                  {filter.type !== FILTER_COMMISSION_TEAM && filter.type !== FILTER_COMMISSION_MEMBER ? (
                    <button
                      type="button"
                      onClick={() => removeFilter(filter.type)}
                      className="ml-1 hover:bg-blue-100 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </Badge>
              ))}
              {metricFilters.map((filter, index) => (
                <Badge
                  key={`${filter.metric}-${filter.condition}-${filter.value}-${index}`}
                  variant="secondary"
                  className="bg-purple-50 text-purple-700 border border-purple-200 gap-1 pr-1"
                >
                  {getMetricFilterLabel(filter, catalogMetrics)}
                  <button
                    type="button"
                    onClick={() => removeMetricFilter(index)}
                    className="ml-1 hover:bg-purple-100 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_18rem] gap-6">
        <Card className="border-slate-200 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-medium">Report results</CardTitle>
                <CardDescription>
                  {dateRangeLabel}
                  {selectedAppLabels.length > 0 && ` · ${appsTriggerLabel}`}
                </CardDescription>
              </div>
              {canExportReports ? (
                <Button
                  variant="outline"
                  className="h-10 gap-2 bg-transparent sm:self-start"
                  type="button"
                  onClick={handleExportExcel}
                  disabled={reportLoading || tableRows.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(70vh,720px)] overflow-auto">
              {tableContent}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 flex flex-col min-h-[320px] xl:min-h-0">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-medium">Parameters & Metrics</CardTitle>
            <CardDescription>Choose columns to display in the table</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-0 min-h-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search parameters or metrics..."
                  className="pl-9 h-10 bg-white border-slate-200"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1 max-h-[min(70vh,640px)]">
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Parameters ({selectedParameters.length})
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleParameterDragEnd}>
                  <SortableContext items={orderedFilteredParameters.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {orderedFilteredParameters.map((param) => (
                        <SortableReportFieldItem
                          key={param.id}
                          id={param.id}
                          label={param.label}
                          selected={selectedParameters.includes(param.id)}
                          selectedColorClass="bg-emerald-50 text-emerald-800"
                          onToggle={() => toggleParameter(param.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Metrics ({selectedMetrics.length})
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMetricDragEnd}>
                  <SortableContext items={orderedFilteredMetrics.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                      {orderedFilteredMetrics.map((metric) => (
                        <SortableReportFieldItem
                          key={metric.id}
                          id={metric.id}
                          label={metric.label}
                          selected={selectedMetrics.includes(metric.id)}
                          selectedColorClass="bg-blue-50 text-blue-800"
                          onToggle={() => toggleMetric(metric.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
