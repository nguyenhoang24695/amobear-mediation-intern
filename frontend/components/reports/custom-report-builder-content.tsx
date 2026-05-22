"use client"

import { type CSSProperties, useEffect, useMemo, useState } from "react"
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
  Save,
  Search,
  ArrowUpDown,
  HelpCircle,
  Smartphone,
  Download,
  X,
  AlertCircle,
  Plus,
  GripVertical,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { useApi } from "@/hooks/use-api"
import { useCustomReportQuery } from "@/hooks/use-custom-report-query"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { organizationsApi, reportsApi, structureApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import type { CustomReportCatalogItem, CustomReportMetricFilter } from "@/types/reports"
import type { PersonnelNode } from "@/lib/organizations/personnel-chart-types"

const datePresets = [
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
] as const

const FILTER_DATE_RANGE = "Date range"
const FILTER_APPS = "Apps"
const FILTER_COMMISSION_USER = "Commission User"

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
]

const PARAMETER_COLUMN_WIDTHS: Record<string, number> = {
  app: 280,
  date: 140,
  platform: 140,
}

const DEFAULT_PARAMETER_COLUMN_WIDTH = 160
const METRIC_COLUMN_WIDTH = 168

interface ActiveFilter {
  type: string
  value: string
}

interface CommissionUserOption {
  email: string
  label: string
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
    const shouldShowAppSub = !selectedParameters.includes("platform") && Boolean(row.app_sub)
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <Avatar className="h-10 w-10 rounded-lg shrink-0">
          {appIconUri ? <AvatarImage src={appIconUri} alt={appName} className="rounded-lg object-cover" /> : null}
          <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{appName}</div>
          {shouldShowAppSub ? (
            <div className="text-xs text-slate-500">{String(row.app_sub ?? "")}</div>
          ) : null}
        </div>
      </div>
    )
  }

  if (paramId === "platform") {
    return renderPlatformBadge(String(row.platform ?? ""))
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

function getSubordinateCommissionUsers(node: PersonnelNode): CommissionUserOption[] {
  const byEmail = new Map<string, CommissionUserOption>()

  const walk = (current: PersonnelNode) => {
    for (const child of current.children ?? []) {
      if (child.type === "member" && child.email) {
        const email = child.email.trim()
        const normalized = email.toLowerCase()
        if (!byEmail.has(normalized)) {
          byEmail.set(normalized, {
            email,
            label: child.name ? `${child.name} (${email})` : email,
          })
        }
      }
      walk(child)
    }
  }

  walk(node)
  return [...byEmail.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function getMetricFilterLabel(filter: CustomReportMetricFilter, metrics: CustomReportCatalogItem[]) {
  const metricLabel = metrics.find((metric) => metric.id === filter.metric)?.label ?? filter.metric
  const conditionLabel =
    metricFilterConditions.find((condition) => condition.value === filter.condition)?.label ?? filter.condition
  return `${metricLabel} ${conditionLabel} ${filter.value}`
}

export function CustomReportBuilderContent() {
  const canManageCommission = hasScreenFunction("s-commission", "manage")
  const currentUser = getCurrentUser()
  const orgId = currentUser?.organization?.id
  const currentUserId = currentUser?.id ?? "anonymous"

  const [catalogParameters, setCatalogParameters] = useState(DEFAULT_PARAMETERS)
  const [catalogMetrics, setCatalogMetrics] = useState(DEFAULT_METRICS)

  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [activePresetDays, setActivePresetDays] = useState(30)

  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)
  const [appsInitialized, setAppsInitialized] = useState(false)

  const [selectedParameters, setSelectedParameters] = useState<string[]>(["app", "date"])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "estimated_revenue",
    "observed_ecpm",
    "requests",
    "match_rate",
    "matched_requests",
    "show_rate",
    "impressions",
  ])

  const [sidebarSearch, setSidebarSearch] = useState("")
  const [commissionUser, setCommissionUser] = useState("All")
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

  const [commissionUsers, setCommissionUsers] = useState<CommissionUserOption[]>([])

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { cacheKey: `reports_apps_list_${currentUserId}` },
  )

  const availableApps = useMemo(() => {
    const apps = appsResponse?.apps ?? []
    return apps.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

  useEffect(() => {
    reportsApi.getCatalog().then((c) => {
      if (c.dimensions?.length) setCatalogParameters(c.dimensions)
      if (c.metrics?.length) setCatalogMetrics(c.metrics)
    }).catch(() => {
      /* use defaults */
    })
  }, [])

  useEffect(() => {
    if (appsInitialized || appsLoading || availableApps.length === 0) return
    const firstId = availableApps[0]?.appId
    if (firstId) {
      setSelectedApps([firstId])
      syncAppsActiveFilter([firstId], availableApps)
    }
    setAppsInitialized(true)
  }, [appsInitialized, appsLoading, availableApps])

  useEffect(() => {
    if (appsLoading || availableApps.length === 0) return

    const permittedAppIds = new Set(availableApps.map((app) => app.appId))
    setSelectedApps((prev) => {
      const next = prev.filter((appId) => permittedAppIds.has(appId))
      if (next.length === prev.length) return prev
      syncAppsActiveFilter(next, availableApps)
      return next
    })
  }, [appsLoading, availableApps])

  useEffect(() => {
    if (!canManageCommission || !orgId) return
    organizationsApi
      .getPersonnelChart(orgId)
      .then((chart) => {
        if (!chart?.root) {
          setCommissionUsers([])
          return
        }

        const currentNode = findCurrentPersonnelNode(chart.root, currentUser?.id, currentUser?.email)
        setCommissionUsers(currentNode ? getSubordinateCommissionUsers(currentNode) : [])
      })
      .catch(() => setCommissionUsers([]))
  }, [canManageCommission, orgId, currentUser?.id, currentUser?.email])

  useEffect(() => {
    if (commissionUser === "All") return
    if (commissionUsers.some((user) => user.email === commissionUser)) return
    setCommissionUser("All")
    setActiveFilters((prev) => prev.filter((filter) => filter.type !== FILTER_COMMISSION_USER))
  }, [commissionUser, commissionUsers])

  const commissionUsernamesForQuery = useMemo((): string[] | null => {
    if (!canManageCommission) return null
    if (commissionUser === "All") return null
    return [commissionUser]
  }, [canManageCommission, commissionUser])

  const { data: reportData, loading: reportLoading, error: reportError } = useCustomReportQuery({
    startDate,
    endDate,
    selectedAppIds: selectedApps,
    dimensions: selectedParameters,
    metrics: selectedMetrics,
    revenueSource: "All",
    metricFilters,
    commissionUsernames: commissionUsernamesForQuery,
    sortBy: sortColumn,
    sortDir: sortDirection,
    enabled: selectedApps.length > 0,
  })

  const dateSelectValue =
    activePresetDays === 7 ? "7" : activePresetDays === 30 ? "30" : activePresetDays === 90 ? "90" : "custom"

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

  const selectedAppLabels = availableApps
    .filter((a) => selectedApps.includes(a.appId))
    .map((a) => a.displayName || a.name)

  const dateRangeLabel =
    activePresetDays > 0
      ? `Last ${activePresetDays} days`
      : `${format(startDate, "M/d/yyyy", { locale: enUS })} – ${format(endDate, "M/d/yyyy", { locale: enUS })}`

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
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
    setActivePresetDays(days)
    setDatePopoverOpen(false)
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, `Last ${days} days`))
  }

  const onCustomDateSelect = (range: DateRange | undefined) => {
    if (range?.from) setStartDate(range.from)
    if (range?.to) setEndDate(range.to)
    if (range?.from && range?.to) {
      setActivePresetDays(0)
      const label = `${format(range.from, "M/d/yyyy", { locale: enUS })} – ${format(range.to, "M/d/yyyy", { locale: enUS })}`
      setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, label))
    }
  }

  const handleDateSelectChange = (value: string) => {
    if (value === "custom") {
      setActivePresetDays(0)
      setDatePopoverOpen(true)
      return
    }
    applyDatePreset(Number(value))
  }

  const handleCommissionUserChange = (value: string) => {
    setCommissionUser(value)
    const label =
      value === "All"
        ? "All"
        : commissionUsers.find((u) => u.email === value)?.label ?? value
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_USER, label))
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
      syncAppsActiveFilter(next, availableApps)
      return next
    })
  }

  const removeFilter = (type: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.type !== type))
    switch (type) {
      case FILTER_DATE_RANGE:
        applyDatePreset(30)
        break
      case FILTER_APPS:
        if (availableApps[0]?.appId) {
          setSelectedApps([availableApps[0].appId])
          syncAppsActiveFilter([availableApps[0].appId], availableApps)
        }
        break
      case FILTER_COMMISSION_USER:
        setCommissionUser("All")
        break
    }
  }

  const clearAllFilters = () => {
    applyDatePreset(30)
    const firstId = availableApps[0]?.appId
    if (firstId) {
      setSelectedApps([firstId])
      syncAppsActiveFilter([firstId], availableApps)
    }
    setCommissionUser("All")
    setMetricFilters([])
    setActiveFilters([{ type: FILTER_DATE_RANGE, value: "Last 30 days" }])
  }

  const appsTriggerLabel =
    selectedAppLabels.length === 0
      ? appsLoading
        ? "Loading apps..."
        : "Select apps"
      : selectedAppLabels.length === 1
        ? selectedAppLabels[0]
        : selectedAppLabels.length === availableApps.length
          ? "All apps"
          : `${selectedAppLabels.length} apps`

  const tableRows = reportData?.rows ?? []
  const tableTotals = reportData?.totals ?? {}

  const tableContent = reportLoading ? (
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
  ) : selectedParameters.length === 0 || selectedMetrics.length === 0 ? (
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
    <Table className="min-w-max border-separate border-spacing-0">
      <TableHeader className="sticky top-0 z-30 bg-white">
        <TableRow className="border-b-0">
          {selectedParameters.map((paramId, index) => {
            const param = catalogParameters.find((p) => p.id === paramId)
            return (
              <TableHead
                key={paramId}
                className={cn(
                  "sticky z-40 bg-white text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 whitespace-nowrap",
                  index === selectedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                )}
                style={getParameterStickyStyle(selectedParameters, index)}
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
          {selectedMetrics.map((metricId) => {
            const metric = catalogMetrics.find((m) => m.id === metricId)
            return (
              <TableHead
                key={metricId}
                className="text-xs font-medium text-slate-600 text-right cursor-pointer hover:bg-slate-50 whitespace-nowrap"
                style={getMetricColumnStyle()}
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
          {selectedParameters.map((paramId, index) => (
            <TableHead
              key={`total-p-${paramId}`}
              className={cn(
                "sticky z-40 bg-slate-100 py-3",
                index === selectedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={getParameterStickyStyle(selectedParameters, index)}
            >
              {index === 0 ? (
                <span className="text-sm font-bold text-slate-900">Total</span>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </TableHead>
          ))}
          {selectedMetrics.map((metricId) => (
            <TableHead
              key={`total-${metricId}`}
              className="bg-slate-100 py-3 text-right text-sm font-bold text-slate-900 whitespace-nowrap"
              style={getMetricColumnStyle()}
            >
              {formatMetricValue(tableTotals[metricId], metricId, catalogMetrics)}
            </TableHead>
          ))}
        </TableRow>
        <TableRow className="border-b">
          {selectedParameters.map((paramId, index) => (
            <TableHead
              key={`bar-p-${paramId}`}
              className={cn(
                "sticky z-40 h-1 bg-white p-0",
                index === selectedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={getParameterStickyStyle(selectedParameters, index)}
            >
              <div className="h-1 bg-emerald-500" />
            </TableHead>
          ))}
          {selectedMetrics.map((metricId) => (
            <TableHead key={`bar-m-${metricId}`} className="h-1 p-0" style={getMetricColumnStyle()}>
              <div className="h-1 bg-blue-500" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableRows.map((row, idx) => (
          <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
            {selectedParameters.map((paramId, index) => (
              <TableCell
                key={paramId}
                className={cn(
                  "sticky z-20 py-2",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                  index === selectedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                )}
                style={getParameterStickyStyle(selectedParameters, index)}
              >
                {renderParameterCell(paramId, row, selectedParameters)}
              </TableCell>
            ))}
            {selectedMetrics.map((metricId) => (
              <TableCell
                key={metricId}
                className="text-sm text-right text-slate-700 py-2 whitespace-nowrap"
                style={getMetricColumnStyle()}
              >
                {formatMetricValue(row[metricId], metricId, catalogMetrics)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Custom Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build ad activity reports with custom parameters and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 gap-2 bg-transparent" type="button">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700" type="button">
            <Save className="w-4 h-4" />
            Save report
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <CardDescription>Date range, apps, and report criteria</CardDescription>
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
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>

            {(dateSelectValue === "custom" || activePresetDays === 0) && (
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

            <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-w-[11rem] max-w-[280px] justify-between bg-white border-slate-200 font-normal"
                  type="button"
                  disabled={appsLoading}
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
                  <CommandInput placeholder="Search apps..." />
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
                            const ids = availableApps.map((a) => a.appId)
                            setSelectedApps(ids)
                            syncAppsActiveFilter(ids, availableApps)
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
                            syncAppsActiveFilter([], availableApps)
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                      {availableApps.map((app) => (
                        <CommandItem
                          key={app.appId}
                          value={app.displayName || app.name}
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

            {canManageCommission && (
              <Select value={commissionUser} onValueChange={handleCommissionUserChange}>
                <SelectTrigger className="w-52 h-10 bg-white">
                  <SelectValue placeholder="Commission User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {commissionUsers.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.label}
                    </SelectItem>
                  ))}
                  {commissionUsers.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-slate-500">
                      No subordinate users found
                    </div>
                  ) : null}
                </SelectContent>
              </Select>
            )}

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
          </div>

          {(activeFilters.length > 0 || metricFilters.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
              <span className="text-sm text-slate-500">Active filters:</span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.type}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
                >
                  {filter.type}: {filter.value}
                  <button
                    type="button"
                    onClick={() => removeFilter(filter.type)}
                    className="ml-1 hover:bg-blue-100 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
            <CardTitle className="text-base font-medium">Report results</CardTitle>
            <CardDescription>
              {dateRangeLabel}
              {selectedAppLabels.length > 0 && ` · ${appsTriggerLabel}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[min(70vh,720px)]">
            {tableContent}
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
