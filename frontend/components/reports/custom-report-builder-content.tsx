"use client"

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
import { cn, copyTextToClipboard } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
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
  ChevronRight,
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
  Filter,
  Layers,
  Columns3,
  MoreHorizontal,
  Copy,
} from "lucide-react"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { useDraggableVerticalFixed } from "@/hooks/use-draggable-vertical-fixed"
import { useIsMobile } from "@/hooks/use-mobile"
import { useCustomReportQuery } from "@/hooks/use-custom-report-query"
import { sortCustomReportRows } from "@/lib/reports/custom-report-sort"
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
import { appMatchesSearchQuery } from "@/lib/reports/my-report-app-selection"
import {
  collectMembershipManagedTeams,
  collectTeamLeadTeamsFromChart,
  collectTeamLeadTeamsFromOrgTeams,
  collectTeamsUnderPersonnelNode,
  findCurrentPersonnelNode,
  mergeCommissionTeamOptions,
  type CommissionTeamOption,
} from "@/lib/reports/commission-team-utils"
import { mergeTeamLeadCachesToApps } from "@/lib/reports/team-scope-apps"
import { buildTeamGroupSectionsFromOrg } from "@/lib/organizations/team-group"
import type { OrgTeamGroup } from "@/lib/api/services"
import { GroupedTeamMultiSelect } from "@/components/reports/grouped-team-multi-select"
import {
  GroupedMemberMultiSelect,
  type CommissionMemberOption,
  type MemberGroupSection,
} from "@/components/reports/grouped-member-multi-select"
import {
  CustomReportRowExpandPanel,
  type CustomReportRowExpandMetric,
  type CustomReportRowExpandParameter,
} from "@/components/reports/custom-report-row-expand-panel"
import { useCustomReportUserAppGroups } from "@/components/reports/hooks/use-custom-report-user-app-groups"
import { notifyPinnedCustomReportsChanged } from "@/lib/reports/pinned-custom-reports"
import { escapeExcelHtml, formatMetricValue } from "@/lib/reports/report-format-utils"
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
  { id: "adjust_network_impressions", label: "Adjust network impressions", category: "Adjust", format: "number" },
  { id: "adjust_network_clicks", label: "Adjust network clicks", category: "Adjust", format: "number" },
  { id: "adjust_installs", label: "Adjust installs", category: "Adjust", format: "number" },
  { id: "adjust_network_installs", label: "Adjust network installs", category: "Adjust", format: "number" },
  { id: "adjust_ctr", label: "Adjust CTR", category: "Adjust", format: "percent" },
  { id: "adjust_click_conversion_rate", label: "Adjust click CVR", category: "Adjust", format: "percent" },
  { id: "adjust_impression_conversion_rate", label: "Adjust impression CVR", category: "Adjust", format: "percent" },
  { id: "adjust_network_cost", label: "Adjust network cost", category: "Adjust", format: "currency" },
  { id: "adjust_network_ecpi", label: "Adjust network eCPI", category: "Adjust", format: "currency" },
  { id: "adjust_network_ecpm", label: "Adjust network eCPM", category: "Adjust", format: "currency" },
  { id: "adjust_ecpc", label: "Adjust eCPC", category: "Adjust", format: "currency" },
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

const MOBILE_APP_COLUMN_WIDTH = 52
const MOBILE_DATE_COLUMN_WIDTH = 72
const MOBILE_PLATFORM_COLUMN_WIDTH = 40
const CUSTOM_REPORT_MOBILE_STICKERS_TOP_KEY = "custom-report-mobile-stickers-top-v1"
const CUSTOM_REPORT_MOBILE_STICKERS_BOTTOM_SAFE_AREA = 128

const DEFAULT_PARAMETER_COLUMN_WIDTH = 160
const METRIC_COLUMN_WIDTH = 168

const APP_STORE_MERGED_METRIC_IDS = new Set([
  "ua_cost",
  "adjust_network_impressions",
  "adjust_network_clicks",
  "adjust_installs",
  "adjust_network_installs",
  "adjust_ctr",
  "adjust_click_conversion_rate",
  "adjust_impression_conversion_rate",
  "adjust_network_cost",
  "adjust_network_ecpi",
  "adjust_network_ecpm",
  "adjust_ecpc",
])

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

type AppSelectorViewMode = "flat" | "by_user"

function upsertActiveFilter(filters: ActiveFilter[], type: string, value: string): ActiveFilter[] {
  if (value === "All") return filters.filter((f) => f.type !== type)
  const existing = filters.find((f) => f.type === type)
  if (existing) return filters.map((f) => (f.type === type ? { type, value } : f))
  return [...filters, { type, value }]
}

function collectTeamLeadMemberIds(
  members: CommissionMemberOption[],
  teamIds: string[],
): string[] {
  const ids: string[] = []
  for (const teamId of teamIds) {
    const lead = members.find((member) => member.teamId === teamId && member.isTeamLead)
    if (lead) ids.push(lead.userId)
  }
  return [...new Set(ids)]
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
        selected ? selectedColorClass : "hover:bg-muted/50 text-foreground",
      )}
    >
      <span
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center shrink-0 text-muted-foreground",
          selected ? "cursor-grab active:cursor-grabbing hover:bg-card/60" : "opacity-30",
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
          selectedColorClass.includes("blue") && selected ? "bg-primary/100" : "",
          !selected ? "bg-transparent" : "",
        )}
      />
      <span className="flex-1 leading-snug">{label}</span>
    </button>
  )
}

function renderPlatformIcon(isAndroid: boolean, className?: string) {
  return isAndroid ? (
    <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  ) : (
    <svg className={cn("h-3 w-3", className)} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
    </svg>
  )
}

function renderPlatformBadge(
  platformValue: string,
  isMobile = false,
  options?: { large?: boolean },
) {
  const platform = platformValue || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"

  if (options?.large) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-2 px-4 py-2 text-base font-semibold",
          isAndroid
            ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
            : "border-border bg-muted/50 text-foreground",
        )}
      >
        {renderPlatformIcon(isAndroid, "h-5 w-5")}
        {platform}
      </Badge>
    )
  }

  if (isMobile) {
    return (
      <div className="flex justify-center" title={platform}>
        <Badge
          variant="outline"
          className={cn(
            "h-7 w-7 shrink-0 justify-center p-0",
            isAndroid
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-border bg-muted/50 text-foreground",
          )}
        >
          {renderPlatformIcon(isAndroid)}
        </Badge>
      </div>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isAndroid
          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
          : "border-border bg-muted/50 text-foreground",
      )}
    >
      {renderPlatformIcon(isAndroid)}
      {platform}
    </Badge>
  )
}

function CopyableAppStoreId({
  appStoreId,
  breakAll = false,
  ariaLabel,
}: {
  appStoreId: string
  breakAll?: boolean
  ariaLabel?: string
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  const value = appStoreId.trim()
  if (!value) return null

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const copiedOk = await copyTextToClipboard(value)
    if (!copiedOk) {
      toast.error("Failed to copy App Store ID.")
      return
    }
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    setCopied(true)
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false)
      copiedTimeoutRef.current = null
    }, 2000)
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn("min-w-0 font-mono", breakAll ? "break-all" : "truncate")}
        title={value}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={ariaLabel ?? "Copy App Store ID"}
        onClick={(event) => {
          void handleCopy(event)
        }}
      >
        <Copy className="h-3 w-3" />
      </Button>
      {copied ? <span className="shrink-0 text-xs font-medium text-green-600">Copied!</span> : null}
    </div>
  )
}

function renderParameterCell(
  paramId: string,
  row: Record<string, string | number | null>,
  selectedParameters: string[],
  isMobile = false,
  forExpandPanel = false,
  expandPanelCentered = false,
) {
  const tableIsMobile = forExpandPanel ? false : isMobile

  if (paramId === "app") {
    const appName = String(row.app_display_name ?? row.app ?? "")
    const appIconUri = typeof row.app_icon_uri === "string" ? row.app_icon_uri : ""
    const appSub = String(row.app_sub ?? "").trim()
    const shouldShowAppSub =
      !selectedParameters.includes("platform") &&
      appSub.length > 0 &&
      appSub.toLowerCase() !== appName.trim().toLowerCase()
    return (
      <div
        className={cn(
          "flex min-w-0 max-w-full items-center gap-2",
          tableIsMobile ? "justify-center" : "",
        )}
        title={tableIsMobile ? appName : undefined}
      >
        <Avatar className={cn("shrink-0 rounded-lg", tableIsMobile ? "h-9 w-9" : "h-10 w-10")}>
          {appIconUri ? <AvatarImage src={appIconUri} alt={appName} className="rounded-lg object-cover" /> : null}
          <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        {!tableIsMobile ? (
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "text-sm font-medium text-foreground",
                forExpandPanel ? "break-words" : "truncate",
              )}
            >
              {appName}
            </div>
            {shouldShowAppSub ? (
              <CopyableAppStoreId
                appStoreId={appSub}
                breakAll={forExpandPanel}
                ariaLabel={`Copy App Store ID for ${appName}`}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (paramId === "platform") {
    return renderPlatformBadge(String(row.platform ?? ""), tableIsMobile, {
      large: expandPanelCentered,
    })
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
      <div className={cn("flex min-w-0 max-w-full items-center gap-2", forExpandPanel ? "" : "min-w-[180px]")}>
        <Avatar className="h-10 w-10 rounded-lg shrink-0">
          {appIconUri ? <AvatarImage src={appIconUri} alt={displayName} className="rounded-lg object-cover" /> : null}
          <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-sm font-medium text-foreground",
              forExpandPanel ? "break-words" : "truncate",
            )}
          >
            {displayName}
          </div>
          {shouldShowStoreSub ? (
            <div className={cn("text-xs text-muted-foreground", forExpandPanel ? "break-all" : "truncate")}>
              {storeSub}
            </div>
          ) : storeId && storeId.toLowerCase() !== displayName.trim().toLowerCase() ? (
            <div className={cn("text-xs text-muted-foreground font-mono", forExpandPanel ? "break-all" : "truncate")}>
              {storeId}
            </div>
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
      <div className={cn(forExpandPanel ? "min-w-0 max-w-full" : "min-w-[180px]")}>
        <div
          className={cn(
            "text-sm font-medium text-foreground",
            forExpandPanel ? "break-words" : "truncate",
          )}
        >
          {displayName || "—"}
        </div>
        {publisherSub ? (
          <div className={cn("text-xs text-muted-foreground font-mono", forExpandPanel ? "break-all" : "truncate")}>
            {publisherSub}
          </div>
        ) : publisherId && publisherId.toLowerCase() !== displayName.trim().toLowerCase() ? (
          <div className={cn("text-xs text-muted-foreground font-mono", forExpandPanel ? "break-all" : "truncate")}>
            {publisherId}
          </div>
        ) : null}
      </div>
    )
  }

  if (paramId === "date") {
    return (
      <span
        className={cn(
          "tabular-nums",
          expandPanelCentered
            ? "text-lg font-semibold text-foreground md:text-xl"
            : "text-foreground",
          forExpandPanel && !expandPanelCentered ? "break-words text-sm" : "",
          !forExpandPanel && "whitespace-nowrap",
          !forExpandPanel && (tableIsMobile ? "text-xs" : "text-sm"),
        )}
      >
        {String(row.date ?? "—")}
      </span>
    )
  }

  return (
    <span className={cn("text-sm text-foreground", forExpandPanel ? "break-words" : "whitespace-nowrap")}>
      {String(row[paramId] ?? "—")}
    </span>
  )
}

function buildRowExpandPanelProps(
  row: Record<string, string | number | null>,
  rowIndex: number,
  displayedParameters: string[],
  displayedMetrics: string[],
  catalogParameters: CustomReportCatalogItem[],
  catalogMetrics: CustomReportCatalogItem[],
): {
  rowIndex: number
  parameters: CustomReportRowExpandParameter[]
  metrics: CustomReportRowExpandMetric[]
} {
  return {
    rowIndex,
    parameters: displayedParameters.map((paramId) => {
      const param = catalogParameters.find((p) => p.id === paramId)
      const isCenteredPrimary = paramId === "date" || paramId === "platform"
      return {
        id: paramId,
        label: param?.label ?? paramId,
        content: renderParameterCell(paramId, row, displayedParameters, false, true),
        desktopContent: isCenteredPrimary
          ? renderParameterCell(paramId, row, displayedParameters, false, true, true)
          : undefined,
      }
    }),
    metrics: displayedMetrics.map((metricId) => {
      const metric = catalogMetrics.find((m) => m.id === metricId)
      return {
        id: metricId,
        label: metric?.label ?? metricId,
        value: formatMetricValue(row[metricId], metricId, catalogMetrics),
      }
    }),
  }
}

function getParameterColumnWidth(paramId: string, isMobile = false) {
  if (isMobile && paramId === "app") return MOBILE_APP_COLUMN_WIDTH
  if (isMobile && paramId === "date") return MOBILE_DATE_COLUMN_WIDTH
  if (isMobile && paramId === "platform") return MOBILE_PLATFORM_COLUMN_WIDTH
  return PARAMETER_COLUMN_WIDTHS[paramId] ?? DEFAULT_PARAMETER_COLUMN_WIDTH
}

function getParameterHorizontalPaddingClass(
  paramId: string,
  index: number,
  isMobile: boolean,
): string | undefined {
  if (isMobile) {
    if (paramId === "app") return "px-1.5"
    if (paramId === "date" || paramId === "platform") return "px-1"
    return undefined
  }
  return index === 0 ? "pl-5" : undefined
}

function getParameterStickyStyle(parameters: string[], index: number, isMobile = false): CSSProperties {
  const left = parameters
    .slice(0, index)
    .reduce((sum, paramId) => sum + getParameterColumnWidth(paramId, isMobile), 0)
  const width = getParameterColumnWidth(parameters[index], isMobile)

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

function buildAppStoreMergedMetricRowSpanMap(
  rows: Array<Record<string, string | number | null>>,
  selectedParameters: string[],
): Map<number, MetricRowSpanState> {
  const shouldMergeMetrics =
    selectedParameters.includes("date") &&
    (selectedParameters.includes("app") || selectedParameters.includes("app_store_id"))

  if (!shouldMergeMetrics || rows.length === 0) {
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

export function CustomReportBuilderContent() {
  const isMobile = useIsMobile()
  const {
    containerRef: mobileStickersRef,
    topPx: mobileStickersTop,
    consumeDragClick: consumeMobileStickersDragClick,
    dragProps: mobileStickersDragProps,
  } = useDraggableVerticalFixed(CUSTOM_REPORT_MOBILE_STICKERS_TOP_KEY, {
    capture: true,
    bottomSafeAreaPx: CUSTOM_REPORT_MOBILE_STICKERS_BOTTOM_SAFE_AREA,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportIdFromUrl = searchParams.get("reportId")
  const isNewReportFromUrl = searchParams.get("new") === "1"
  const folderFromUrl = searchParams.get("folder")
  const showBackToReports = Boolean(reportIdFromUrl || isNewReportFromUrl)

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
  const [appSelectorViewMode, setAppSelectorViewMode] = useState<AppSelectorViewMode>("flat")
  const [appListSearch, setAppListSearch] = useState("")
  const [appsInitialized, setAppsInitialized] = useState(false)

  const [selectedParameters, setSelectedParameters] = useState<string[]>(["app"])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "total_revenue_usd",
    "ua_cost",
    "profit",
  ])

  const [sidebarSearch, setSidebarSearch] = useState("")
  const [mobileColumnsOpen, setMobileColumnsOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileReportActionsOpen, setMobileReportActionsOpen] = useState(false)
  const [filtersCardOpen, setFiltersCardOpen] = useState(true)
  const [parametersMetricsCollapsed, setParametersMetricsCollapsed] = useState(false)
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const reportResultsRef = useRef<HTMLDivElement>(null)
  const [tableViewportWidth, setTableViewportWidth] = useState(0)
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

  const [selectedCommissionTeamIds, setSelectedCommissionTeamIds] = useState<string[]>([])
  const [teamsInitialized, setTeamsInitialized] = useState(false)
  const [commissionTeams, setCommissionTeams] = useState<CommissionTeamOption[]>([])
  const [orgTeamGroups, setOrgTeamGroups] = useState<OrgTeamGroup[]>([])
  const [commissionMembers, setCommissionMembers] = useState<CommissionMemberOption[]>([])
  const [selectedCommissionMemberIds, setSelectedCommissionMemberIds] = useState<string[]>([])
  const pendingMemberRestoreRef = useRef<{ userIds?: string[]; emails?: string[] } | null>(null)
  const [teamScopeApps, setTeamScopeApps] = useState<App[] | null>(null)
  const [teamScopeAppsLoading, setTeamScopeAppsLoading] = useState(false)
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false)
  const canScopeManagedTeams = canManageCommission || commissionTeams.length > 0
  const appSelectorDisabled =
    canScopeManagedTeams &&
    (selectedCommissionTeamIds.length === 0 || teamScopeAppsLoading || teamScopeApps === null)

  const syncTeamsActiveFilter = useCallback((teamIds: string[], teams: CommissionTeamOption[]) => {
    const labels = teams
      .filter((team) => teamIds.includes(team.teamId))
      .map((team) => team.label)
    const value =
      teamIds.length === 0
        ? "None selected"
        : teamIds.length === teams.length
          ? "All teams"
          : teamIds.length === 1
            ? labels[0] ?? "1 team"
            : `${teamIds.length} teams`
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_TEAM, value))
  }, [])

  const syncMembersActiveFilter = useCallback(
    (memberIds: string[], members: CommissionMemberOption[]) => {
      const uniqueMemberIds = [...new Set(members.map((member) => member.userId))]
      const labelByUserId = new Map<string, string>()
      for (const member of members) {
        if (!labelByUserId.has(member.userId)) labelByUserId.set(member.userId, member.label)
      }
      const value =
        memberIds.length === 0
          ? "Select members"
          : memberIds.length === uniqueMemberIds.length
            ? "All members"
            : memberIds.length === 1
              ? labelByUserId.get(memberIds[0]) ?? "1 member"
              : `${memberIds.length} members`
      setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_MEMBER, value))
    },
    [],
  )

  const handleCommissionMemberIdsChange = useCallback(
    (memberIds: string[]) => {
      setSelectedCommissionMemberIds(memberIds)
      syncMembersActiveFilter(memberIds, commissionMembers)
    },
    [commissionMembers, syncMembersActiveFilter],
  )

  const commissionTeamGroupSections = useMemo(
    () => buildTeamGroupSectionsFromOrg(orgTeamGroups, commissionTeams),
    [orgTeamGroups, commissionTeams],
  )

  const commissionMemberGroupSections = useMemo((): MemberGroupSection[] => {
    const sectionMap = new Map<string, MemberGroupSection>()
    for (const member of commissionMembers) {
      const existing = sectionMap.get(member.teamId)
      if (existing) {
        if (!existing.members.some((item) => item.userId === member.userId)) {
          existing.members.push(member)
        }
      } else {
        sectionMap.set(member.teamId, {
          teamId: member.teamId,
          teamLabel: member.teamLabel,
          members: [member],
        })
      }
    }
    return selectedCommissionTeamIds
      .map((teamId) => sectionMap.get(teamId))
      .filter((section): section is MemberGroupSection => Boolean(section))
      .map((section) => ({
        ...section,
        members: [...section.members].sort((a, b) => {
          if (a.isTeamLead !== b.isTeamLead) return a.isTeamLead ? -1 : 1
          return a.label.localeCompare(b.label)
        }),
      }))
  }, [commissionMembers, selectedCommissionTeamIds])

  const uniqueCommissionMemberCount = useMemo(
    () => new Set(commissionMembers.map((member) => member.userId)).size,
    [commissionMembers],
  )

  const handleCommissionTeamIdsChange = useCallback(
    (teamIds: string[]) => {
      setSelectedCommissionTeamIds(teamIds)
      syncTeamsActiveFilter(teamIds, commissionTeams)
      if (teamIds.length === 0) {
        pendingMemberRestoreRef.current = null
      }
    },
    [commissionTeams, syncTeamsActiveFilter],
  )

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
  const prevCommissionTeamIdsRef = useRef<string[]>([])
  const prevCommissionTeamIdsForMembersRef = useRef<string[]>([])

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
    if (selectedCommissionTeamIds.length === 0 || teamScopeApps === null) return []
    return teamScopeApps
  }, [availableApps, canScopeManagedTeams, selectedCommissionTeamIds, teamScopeApps])

  const byUserAppsEnabled =
    canScopeManagedTeams &&
    appSelectorViewMode === "by_user" &&
    selectedCommissionMemberIds.length > 0

  const {
    groups: userAppGroups,
    unionApps: userAppUnionApps,
    loading: userAppsLoading,
    error: userAppsError,
  } = useCustomReportUserAppGroups(
    selectedCommissionMemberIds,
    commissionMembers,
    appsForSelection,
    byUserAppsEnabled,
  )

  const appsPoolForSelector = useMemo(() => {
    if (byUserAppsEnabled && userAppUnionApps.length > 0) return userAppUnionApps
    return appsForSelection
  }, [byUserAppsEnabled, userAppUnionApps, appsForSelection])

  const filteredFlatApps = useMemo(
    () => appsForSelection.filter((app) => appMatchesSearchQuery(app, appListSearch)),
    [appsForSelection, appListSearch],
  )

  const filteredUserAppGroups = useMemo(
    () =>
      userAppGroups
        .map((group) => ({
          ...group,
          apps: group.apps.filter((app) => appMatchesSearchQuery(app, appListSearch)),
        }))
        .filter((group) => group.apps.length > 0),
    [userAppGroups, appListSearch],
  )

  useEffect(() => {
    if (!appPopoverOpen) setAppListSearch("")
  }, [appPopoverOpen])

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
    if (appsInitialized || reportIdFromUrl) return
    if (canScopeManagedTeams) {
      if (selectedCommissionTeamIds.length === 0 || teamScopeApps === null) return
    } else if (appsLoading || availableApps.length === 0) {
      return
    }
    const initialIds = appsForSelection.map((app) => app.appId)
    if (initialIds.length > 0) {
      setSelectedApps(initialIds)
      syncAppsActiveFilter(initialIds, appsForSelection)
    }
    setAppsInitialized(true)
  }, [
    appsInitialized,
    appsLoading,
    availableApps.length,
    appsForSelection,
    reportIdFromUrl,
    canScopeManagedTeams,
    selectedCommissionTeamIds.length,
    teamScopeApps,
  ])

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
        setSelectedCommissionTeamIds,
        restoreCommissionMembersFromReport: (filters) => {
          if (filters.commissionUsernames?.length) {
            pendingMemberRestoreRef.current = {
              emails: filters.commissionUsernames.filter(Boolean),
            }
          } else if (filters.commissionUser) {
            pendingMemberRestoreRef.current = { userIds: [filters.commissionUser] }
          }
        },
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
        skipAppPermissionFilter: Boolean(
          report.filters.commissionTeamIds?.length ||
            report.filters.commissionTeamId,
        ),
      })
      setAppsInitialized(true)
      setTeamsInitialized(true)
    },
    [availableApps],
  )

  useEffect(() => {
    if (!reportIdFromUrl) return
    if (loadedReportIdRef.current === reportIdFromUrl) return

    let cancelled = false
    const load = async () => {
      setLoadingSavedReport(true)
      try {
        const report = await reportsApi.getSaved(reportIdFromUrl)
        if (cancelled) return
        loadedReportIdRef.current = reportIdFromUrl
        prevCommissionTeamIdsRef.current =
          report.filters.commissionTeamIds?.filter(Boolean) ??
          (report.filters.commissionTeamId ? [report.filters.commissionTeamId] : [])
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
  }, [reportIdFromUrl, applyLoadedSavedReport])

  useEffect(() => {
    if (canScopeManagedTeams) {
      if (teamScopeApps === null) return
    } else if (appsLoading || availableApps.length === 0) {
      return
    }

    const permittedAppIds = new Set(appsForSelection.map((app) => app.appId))
    setSelectedApps((prev) => {
      const next = prev.filter((appId) => permittedAppIds.has(appId))
      if (next.length === prev.length) return prev
      syncAppsActiveFilter(next, appsForSelection)
      return next
    })
  }, [appsLoading, appsForSelection, canScopeManagedTeams, teamScopeApps, availableApps.length])

  useEffect(() => {
    if (!orgId) {
      setCommissionTeams([])
      setCommissionMembers([])
      setSelectedCommissionMemberIds([])
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const [chart, orgTeams, teamGroups] = await Promise.all([
          organizationsApi.getPersonnelChart(orgId),
          organizationsApi.getTeams(orgId).catch(() => []),
          organizationsApi.getTeamGroups(orgId).catch(() => []),
        ])
        if (cancelled) return
        setOrgTeamGroups(teamGroups)

        if (!chart?.root) {
          if (cancelled) return
          setCommissionTeams([])
          return
        }

        const rawRoot = chart.root

        const currentNode = findCurrentPersonnelNode(rawRoot, currentUser?.id, currentUser?.email)
        const underManager = currentNode ? collectTeamsUnderPersonnelNode(currentNode) : []
        const memberManagedTeams = collectMembershipManagedTeams(rawRoot, currentUserTeamIds)
        const leadFromChart = currentUser?.id
          ? collectTeamLeadTeamsFromChart(rawRoot, currentUser.id)
          : []
        const leadFromOrg = collectTeamLeadTeamsFromOrgTeams(orgTeams, currentUser?.id)
        const teamGroupById = new Map(orgTeams.map((team) => [team.id, team.teamGroup ?? null]))
        const merged = mergeCommissionTeamOptions(
          underManager,
          memberManagedTeams,
          leadFromChart,
          leadFromOrg,
        )
        setCommissionTeams(
          merged.map((team) => ({
            ...team,
            teamGroup: team.teamGroup ?? teamGroupById.get(team.teamId) ?? null,
          })),
        )
      } catch {
        if (cancelled) return
        setCommissionTeams([])
        setCommissionMembers([])
        setSelectedCommissionMemberIds([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [orgId, currentUser?.id, currentUser?.email, currentUserTeamIdsKey])

  useEffect(() => {
    if (!canScopeManagedTeams) return
    if (commissionTeams.length === 0) {
      setSelectedCommissionTeamIds([])
      setCommissionMembers([])
      setSelectedCommissionMemberIds([])
      setTeamScopeApps(null)
      setActiveFilters((prev) =>
        prev.filter(
          (filter) => filter.type !== FILTER_COMMISSION_TEAM && filter.type !== FILTER_COMMISSION_MEMBER,
        ),
      )
      return
    }
    setSelectedCommissionTeamIds((prev) => {
      const valid = prev.filter((id) => commissionTeams.some((team) => team.teamId === id))
      return valid.length === prev.length ? prev : valid
    })
  }, [canScopeManagedTeams, commissionTeams])

  useEffect(() => {
    if (!canScopeManagedTeams || teamsInitialized || reportIdFromUrl) return
    if (commissionTeams.length === 0) return
    const ids = commissionTeams.map((team) => team.teamId)
    setSelectedCommissionTeamIds(ids)
    syncTeamsActiveFilter(ids, commissionTeams)
    setTeamsInitialized(true)
  }, [canScopeManagedTeams, teamsInitialized, commissionTeams, reportIdFromUrl, syncTeamsActiveFilter])

  useEffect(() => {
    if (!canScopeManagedTeams || selectedCommissionTeamIds.length === 0) {
      setCommissionMembers([])
      setSelectedCommissionMemberIds([])
      setMemberOptionsLoading(false)
      prevCommissionTeamIdsForMembersRef.current = []
      setActiveFilters((prev) => prev.filter((filter) => filter.type !== FILTER_COMMISSION_MEMBER))
      return
    }

    const prevTeamIds = [...prevCommissionTeamIdsForMembersRef.current]
    const prevTeamKey = [...prevTeamIds].sort().join("|")
    const nextTeamKey = [...selectedCommissionTeamIds].sort().join("|")
    const teamsChanged = prevTeamKey !== nextTeamKey
    prevCommissionTeamIdsForMembersRef.current = selectedCommissionTeamIds

    let cancelled = false
    setMemberOptionsLoading(true)

    Promise.all(
      selectedCommissionTeamIds.map(async (teamId) => {
        const teamLabel = commissionTeams.find((team) => team.teamId === teamId)?.label ?? "Team"
        const response = await teamMembersApi.filterTeamMembers({ teamId, page: 1, pageSize: 500 })
        return response.data.items
          .map((member): CommissionMemberOption | null => {
            const email = member.email?.trim()
            if (!email) return null
            const teamMeta = member.teams.find((team) => team.id === teamId)
            return {
              userId: member.id,
              email,
              label: member.fullName?.trim() || email,
              isTeamLead: Boolean(teamMeta?.isTeamLead),
              teamId,
              teamLabel,
            }
          })
          .filter((member): member is CommissionMemberOption => Boolean(member))
          .sort((a, b) => {
            if (a.isTeamLead !== b.isTeamLead) return a.isTeamLead ? -1 : 1
            return a.label.localeCompare(b.label)
          })
      }),
    )
      .then((memberGroups) => {
        if (cancelled) return
        const nextMembers = memberGroups.flat()
        setCommissionMembers(nextMembers)

        const allMemberIds = [...new Set(nextMembers.map((member) => member.userId))]
        if (allMemberIds.length === 0) {
          setSelectedCommissionMemberIds([])
          return
        }

        const pending = pendingMemberRestoreRef.current
        if (pending) {
          pendingMemberRestoreRef.current = null
          let restored: string[] = []
          if (pending.emails?.length) {
            const emailSet = new Set(pending.emails.map((email) => email.toLowerCase()))
            restored = allMemberIds.filter((userId) => {
              const member = nextMembers.find((item) => item.userId === userId)
              return member && emailSet.has(member.email.toLowerCase())
            })
          } else if (pending.userIds?.length) {
            restored = pending.userIds.filter((userId) => allMemberIds.includes(userId))
          }
          const teamLeadIds = collectTeamLeadMemberIds(nextMembers, selectedCommissionTeamIds)
          const nextIds =
            restored.length > 0
              ? restored
              : teamLeadIds.length > 0
                ? teamLeadIds
                : allMemberIds
          setSelectedCommissionMemberIds(nextIds)
          syncMembersActiveFilter(nextIds, nextMembers)
          return
        }

        if (teamsChanged) {
          const addedTeamIds = selectedCommissionTeamIds.filter((teamId) => !prevTeamIds.includes(teamId))
          setSelectedCommissionMemberIds((prev) => {
            const pruned = prev.filter((userId) => allMemberIds.includes(userId))
            let nextIds: string[]
            if (prevTeamIds.length === 0) {
              nextIds = collectTeamLeadMemberIds(nextMembers, selectedCommissionTeamIds)
            } else if (addedTeamIds.length > 0) {
              const newLeadIds = collectTeamLeadMemberIds(nextMembers, addedTeamIds)
              nextIds = [...new Set([...pruned, ...newLeadIds])]
            } else {
              nextIds = pruned
            }
            syncMembersActiveFilter(nextIds, nextMembers)
            return nextIds
          })
          return
        }

        setSelectedCommissionMemberIds((prev) => {
          const pruned = prev.filter((userId) => allMemberIds.includes(userId))
          if (pruned.length > 0) {
            syncMembersActiveFilter(pruned, nextMembers)
            return pruned
          }
          const teamLeadIds = collectTeamLeadMemberIds(nextMembers, selectedCommissionTeamIds)
          const nextIds = teamLeadIds.length > 0 ? teamLeadIds : allMemberIds
          syncMembersActiveFilter(nextIds, nextMembers)
          return nextIds
        })
      })
      .catch(() => {
        if (!cancelled) {
          setCommissionMembers([])
          setSelectedCommissionMemberIds([])
        }
      })
      .finally(() => {
        if (!cancelled) setMemberOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canScopeManagedTeams, selectedCommissionTeamIds, commissionTeams, syncMembersActiveFilter])

  useEffect(() => {
    if (!canScopeManagedTeams || selectedCommissionTeamIds.length === 0) {
      setTeamScopeApps(null)
      setTeamScopeAppsLoading(false)
      return
    }

    let cancelled = false
    setTeamScopeAppsLoading(true)
    Promise.all(selectedCommissionTeamIds.map((teamId) => reportsApi.getTeamApps(teamId)))
      .then((responses) => {
        if (cancelled) return
        setTeamScopeApps(mergeTeamLeadCachesToApps(responses))
      })
      .catch(() => {
        if (!cancelled) setTeamScopeApps([])
      })
      .finally(() => {
        if (!cancelled) setTeamScopeAppsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canScopeManagedTeams, selectedCommissionTeamIds])

  useEffect(() => {
    if (!canScopeManagedTeams) return
    if (selectedCommissionTeamIds.length === 0) {
      prevCommissionTeamIdsRef.current = []
      setSelectedApps([])
      syncAppsActiveFilter([], appsForSelection)
      return
    }
    if (teamScopeApps === null) return

    const prevTeamKey = [...prevCommissionTeamIdsRef.current].sort().join("|")
    const nextTeamKey = [...selectedCommissionTeamIds].sort().join("|")
    const teamsChanged = prevTeamKey !== nextTeamKey
    prevCommissionTeamIdsRef.current = selectedCommissionTeamIds

    const permitted = appsForSelection.map((app) => app.appId)
    const permittedSet = new Set(permitted)
    setSelectedApps((prev) => {
      const pruned = prev.filter((id) => permittedSet.has(id))
      const next =
        teamsChanged && pruned.length === 0 && permitted.length > 0 ? permitted : pruned
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev
      }
      syncAppsActiveFilter(next, appsForSelection)
      return next
    })
  }, [canScopeManagedTeams, selectedCommissionTeamIds, teamScopeApps, appsForSelection])

  useEffect(() => {
    if (selectedCommissionTeamIds.length === 0) {
      setActiveFilters((prev) => prev.filter((filter) => filter.type !== FILTER_COMMISSION_TEAM))
      return
    }
    syncTeamsActiveFilter(selectedCommissionTeamIds, commissionTeams)
  }, [selectedCommissionTeamIds, commissionTeams, syncTeamsActiveFilter])

  useEffect(() => {
    if (selectedCommissionMemberIds.length === 0 || commissionMembers.length === 0) {
      setActiveFilters((prev) => prev.filter((filter) => filter.type !== FILTER_COMMISSION_MEMBER))
      return
    }
    syncMembersActiveFilter(selectedCommissionMemberIds, commissionMembers)
  }, [selectedCommissionMemberIds, commissionMembers, syncMembersActiveFilter])

  const currentReportQuery = useMemo<AppliedReportQueryState>(
    () => ({
      startDate,
      endDate,
      selectedAppIds: [...selectedApps],
      dimensions: [...selectedParameters],
      metrics: [...selectedMetrics],
      revenueSource: "All",
      metricFilters: [...metricFilters],
    }),
    [
      startDate,
      endDate,
      selectedApps,
      selectedParameters,
      selectedMetrics,
      metricFilters,
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
      })

    return normalize(currentReportQuery) !== normalize(appliedReportQuery)
  }, [currentReportQuery, appliedReportQuery])

  useEffect(() => {
    setAppliedReportQuery(null)
  }, [reportIdFromUrl])

  const scrollToReportResultsOnMobile = useCallback(() => {
    if (!isMobile) return
    window.requestAnimationFrame(() => {
      reportResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [isMobile])

  const handleApplyFilters = () => {
    setAppliedReportQuery(currentReportQuery)
    if (isMobile) {
      setMobileFiltersOpen(false)
      setMobileColumnsOpen(false)
    }
    scrollToReportResultsOnMobile()
  }

  const { data: reportData, loading: reportLoading, error: reportError } = useCustomReportQuery({
    startDate: appliedReportQuery?.startDate ?? startDate,
    endDate: appliedReportQuery?.endDate ?? endDate,
    selectedAppIds: appliedReportQuery?.selectedAppIds ?? [],
    dimensions: appliedReportQuery?.dimensions ?? [],
    metrics: appliedReportQuery?.metrics ?? [],
    revenueSource: appliedReportQuery?.revenueSource ?? "All",
    metricFilters: appliedReportQuery?.metricFilters ?? [],
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

  const selectedAppLabels = appsPoolForSelector
    .filter((a) => selectedApps.includes(a.appId))
    .map((a) => a.displayName || a.name)

  const dateRangeLabel =
    dateFilterMode === "month"
      ? format(selectedMonth, "MMMM yyyy", { locale: enUS })
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
      commissionTeamIds: canScopeManagedTeams
        ? selectedCommissionTeamIds.length > 0
          ? selectedCommissionTeamIds
          : null
        : null,
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
      syncAppsActiveFilter(next, appsPoolForSelector)
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
          if (selectedCommissionTeamIds.length > 0 && appsForSelection.length > 0) {
            const ids = appsForSelection.map((app) => app.appId)
            setSelectedApps(ids)
            syncAppsActiveFilter(ids, appsForSelection)
          }
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
    const teamLabels = commissionTeams
      .filter((team) => selectedCommissionTeamIds.includes(team.teamId))
      .map((team) => team.label)
    const teamFilterValue =
      selectedCommissionTeamIds.length === 0
        ? ""
        : selectedCommissionTeamIds.length === commissionTeams.length
          ? "All teams"
          : selectedCommissionTeamIds.length === 1
            ? teamLabels[0] ?? "1 team"
            : `${selectedCommissionTeamIds.length} teams`
    const memberFilterValue =
      selectedCommissionMemberIds.length === 0
        ? ""
        : selectedCommissionMemberIds.length === uniqueCommissionMemberCount
          ? "All members"
          : selectedCommissionMemberIds.length === 1
            ? commissionMembers.find((member) => member.userId === selectedCommissionMemberIds[0])?.label ??
              "1 member"
            : `${selectedCommissionMemberIds.length} members`
    const withTeamFilter = teamFilterValue
      ? upsertActiveFilter(nextFilters, FILTER_COMMISSION_TEAM, teamFilterValue)
      : nextFilters
    setActiveFilters(
      memberFilterValue
        ? upsertActiveFilter(withTeamFilter, FILTER_COMMISSION_MEMBER, memberFilterValue)
        : withTeamFilter,
    )
  }

  const selectedCommissionTeamLabels = commissionTeams
    .filter((team) => selectedCommissionTeamIds.includes(team.teamId))
    .map((team) => team.label)

  const teamsTriggerLabel =
    selectedCommissionTeamLabels.length === 0
      ? commissionTeams.length === 0
        ? "No teams available"
        : "Select teams"
      : selectedCommissionTeamLabels.length === 1
        ? selectedCommissionTeamLabels[0]
        : selectedCommissionTeamLabels.length === commissionTeams.length
          ? "All teams"
          : `${selectedCommissionTeamLabels.length} teams`

  const membersTriggerLabel =
    selectedCommissionTeamIds.length === 0
      ? "Select teams first"
      : memberOptionsLoading
        ? "Loading members..."
        : uniqueCommissionMemberCount === 0
          ? "No members found"
          : selectedCommissionMemberIds.length === 0
            ? "Select members"
            : selectedCommissionMemberIds.length === 1
              ? commissionMembers.find((member) => member.userId === selectedCommissionMemberIds[0])?.label ??
                "1 member"
              : selectedCommissionMemberIds.length === uniqueCommissionMemberCount
                ? "All members"
                : `${selectedCommissionMemberIds.length} members`

  const appsTriggerLabel =
    selectedAppLabels.length === 0
      ? appSelectorDisabled
        ? selectedCommissionTeamIds.length === 0
          ? "Select teams first"
          : "Loading apps..."
        : appsLoading
          ? "Loading apps..."
          : canScopeManagedTeams && teamScopeApps !== null && teamScopeApps.length === 0
            ? "No apps for selected teams"
            : "Select apps"
      : selectedAppLabels.length === 1
        ? selectedAppLabels[0]
        : selectedAppLabels.length === appsPoolForSelector.length
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

  const tableRows = useMemo(
    () => sortCustomReportRows(reportData?.rows ?? [], sortColumn, sortDirection),
    [reportData?.rows, sortColumn, sortDirection],
  )
  const tableTotals = reportData?.totals ?? {}
  const appStoreMergedMetricRowSpanMap = useMemo(
    () => buildAppStoreMergedMetricRowSpanMap(tableRows, displayedParameters),
    [tableRows, displayedParameters],
  )

  const sharedPanelProps = useMemo(() => {
    if (tableRows.length === 0) return null

    const rowIndex = expandedRowIndex ?? 0
    const row = tableRows[rowIndex]
    if (!row) return null

    return buildRowExpandPanelProps(
      row,
      expandedRowIndex ?? rowIndex,
      displayedParameters,
      displayedMetrics,
      catalogParameters,
      catalogMetrics,
    )
  }, [
    expandedRowIndex,
    tableRows,
    displayedParameters,
    displayedMetrics,
    catalogParameters,
    catalogMetrics,
  ])

  const isPanelVisible = expandedRowIndex !== null

  const toggleRowExpand = useCallback((idx: number) => {
    setExpandedRowIndex((current) => (current === idx ? null : idx))
  }, [])

  useEffect(() => {
    setExpandedRowIndex(null)
  }, [tableRows, displayedParameters, displayedMetrics])

  useLayoutEffect(() => {
    const node = tableScrollRef.current
    if (!node) return

    const syncViewportWidth = () => {
      setTableViewportWidth(node.clientWidth)
    }

    syncViewportWidth()
    const observer = new ResizeObserver(syncViewportWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [appliedReportQuery, reportLoading, reportError, tableRows.length])

  const tableColumnCount = displayedParameters.length + displayedMetrics.length

  const handleExportExcel = () => {
    if (!canExportReports) {
      toast.error("You do not have permission to export reports.")
      return
    }

    if (tableRows.length === 0) return

    type ExportParamColumn =
      | { kind: "param"; paramId: string }
      | { kind: "app_store_id"; paramId: "app" }

    const exportParamColumns: ExportParamColumn[] = []
    for (const paramId of displayedParameters) {
      exportParamColumns.push({ kind: "param", paramId })
      if (paramId === "app" && !displayedParameters.includes("app_store_id")) {
        exportParamColumns.push({ kind: "app_store_id", paramId: "app" })
      }
    }

    const parameterHeaders = exportParamColumns.map((col) => {
      if (col.kind === "app_store_id") return "App Store ID"
      const param = catalogParameters.find((p) => p.id === col.paramId)
      return param?.label ?? col.paramId
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

    const getAppStoreIdExportValue = (row: Record<string, string | number | null>) =>
      String(row.app_store_id ?? row.app_id ?? row.app ?? "").trim()

    const headerHtml = [...parameterHeaders, ...metricHeaders]
      .map((header) => `<th>${escapeExcelHtml(header)}</th>`)
      .join("")

    const totalHtml = [
      ...exportParamColumns.map((_, index) => (index === 0 ? "Total" : "")),
      ...displayedMetrics.map((metricId) => formatMetricValue(tableTotals[metricId], metricId, catalogMetrics)),
    ]
      .map((value) => `<td>${escapeExcelHtml(value)}</td>`)
      .join("")

    const rowsHtml = tableRows
      .map((row) => {
        const parameterCells = exportParamColumns.map((col) => {
          if (col.kind === "app_store_id") return escapeExcelHtml(getAppStoreIdExportValue(row))
          return escapeExcelHtml(getParameterDisplayValue(col.paramId, row))
        })
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
      <p className="text-sm text-muted-foreground">
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
      <p className="text-sm text-muted-foreground">
        Select at least one parameter and one metric in the right panel to view the report.
      </p>
    </div>
  ) : tableRows.length === 0 ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
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
                  "sticky top-0 z-50 cursor-pointer bg-card text-xs font-medium text-muted-foreground whitespace-nowrap hover:bg-muted/50",
                  getParameterHorizontalPaddingClass(paramId, index, isMobile),
                  index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                )}
                style={{ ...getParameterStickyStyle(displayedParameters, index, isMobile), top: 0 }}
                onClick={() => handleSort(paramId)}
              >
                <div
                  className={cn(
                    "flex items-center gap-1",
                    isMobile && (paramId === "app" || paramId === "platform") && "justify-center",
                    isMobile && paramId === "date" && "text-xs",
                  )}
                >
                  {isMobile && paramId === "app" ? (
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : isMobile && paramId === "platform" ? (
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : (
                    param?.label
                  )}
                  {sortColumn === paramId && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  {!isMobile || (paramId !== "app" && paramId !== "date" && paramId !== "platform") ? (
                    <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                  ) : null}
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
                  "sticky top-0 z-40 bg-card text-xs font-medium text-muted-foreground text-right cursor-pointer hover:bg-muted/50 whitespace-nowrap",
                  index === displayedMetrics.length - 1 && "pr-5",
                )}
                style={{ ...getMetricColumnStyle(), top: 0 }}
                onClick={() => handleSort(metricId)}
              >
                <div className="flex items-center justify-end gap-1">
                  {metric?.label}
                  {sortColumn === metricId && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                </div>
              </TableHead>
            )
          })}
        </TableRow>
        <TableRow className="border-b border-border bg-muted">
          {displayedParameters.map((paramId, index) => (
            <TableHead
              key={`total-p-${paramId}`}
              className={cn(
                "sticky top-10 z-50 bg-muted py-3",
                getParameterHorizontalPaddingClass(paramId, index, isMobile),
                index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={{ ...getParameterStickyStyle(displayedParameters, index, isMobile), top: "2.5rem" }}
            >
              {index === 0 ? (
                <span
                  className={cn(
                    "text-sm font-bold text-foreground",
                    isMobile && paramId === "app" && "sr-only",
                  )}
                >
                  Total
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableHead>
          ))}
          {displayedMetrics.map((metricId, index) => (
            <TableHead
              key={`total-${metricId}`}
              className={cn(
                "sticky top-10 z-40 bg-muted py-3 text-right text-sm font-bold text-foreground whitespace-nowrap",
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
                "sticky top-20 z-50 h-1 bg-card p-0",
                index === displayedParameters.length - 1 && "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
              )}
              style={{ ...getParameterStickyStyle(displayedParameters, index, isMobile), top: "5rem" }}
            >
              <div className="h-1 bg-emerald-500" />
            </TableHead>
          ))}
          {displayedMetrics.map((metricId) => (
            <TableHead
              key={`bar-m-${metricId}`}
              className="sticky top-20 z-40 h-1 bg-card p-0"
              style={{ ...getMetricColumnStyle(), top: "5rem" }}
            >
              <div className="h-1 bg-primary/100" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {(() => {
          const renderTableDataRow = (
            row: Record<string, string | number | null>,
            idx: number,
          ) => {
            const isExpanded = expandedRowIndex === idx
            const rowBgClass = idx % 2 === 0 ? "bg-card" : "bg-muted/50"
            const stickyCellBgClass = isExpanded
              ? "bg-primary/10"
              : idx % 2 === 0
                ? "bg-card"
                : "bg-muted/50"

            return (
              <TableRow key={idx} className={cn(rowBgClass, isExpanded && "bg-primary/15")}>
                {displayedParameters.map((paramId, index) => (
                  <TableCell
                    key={paramId}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} row ${idx + 1} details`}
                    className={cn(
                      "sticky z-20 cursor-pointer py-2 transition-colors",
                      stickyCellBgClass,
                      "hover:bg-primary/15",
                      isExpanded && "bg-primary/10",
                      getParameterHorizontalPaddingClass(paramId, index, isMobile),
                      index === displayedParameters.length - 1 &&
                        "shadow-[6px_0_10px_-10px_rgba(15,23,42,0.7)]",
                    )}
                    style={getParameterStickyStyle(displayedParameters, index, isMobile)}
                    onClick={() => toggleRowExpand(idx)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        toggleRowExpand(idx)
                      }
                    }}
                  >
                    {renderParameterCell(paramId, row, displayedParameters, isMobile)}
                  </TableCell>
                ))}
                {displayedMetrics.map((metricId, index) => {
                  if (APP_STORE_MERGED_METRIC_IDS.has(metricId)) {
                    const spanState = appStoreMergedMetricRowSpanMap.get(idx)
                    if (spanState?.hidden) return null

                    return (
                      <TableCell
                        key={metricId}
                        rowSpan={spanState?.rowSpan}
                        className={cn(
                          "text-sm text-right text-foreground py-2 whitespace-nowrap align-middle",
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
                        "text-sm text-right text-foreground py-2 whitespace-nowrap",
                        index === displayedMetrics.length - 1 && "pr-5",
                      )}
                      style={getMetricColumnStyle()}
                    >
                      {formatMetricValue(row[metricId], metricId, catalogMetrics)}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          }

          const sharedExpandPanelRow = sharedPanelProps ? (
            <TableRow
              key="shared-expand-panel"
              className={cn("bg-primary/10", !isPanelVisible && "hidden")}
              aria-hidden={!isPanelVisible}
            >
              <TableCell colSpan={tableColumnCount} className="p-0">
                <div
                  className="sticky left-0 z-30 min-w-0 max-w-full overflow-hidden"
                  style={
                    tableViewportWidth > 0
                      ? { width: tableViewportWidth, maxWidth: tableViewportWidth }
                      : undefined
                  }
                >
                  <CustomReportRowExpandPanel
                    key="shared-expand-panel-content"
                    {...sharedPanelProps}
                  />
                </div>
              </TableCell>
            </TableRow>
          ) : null

          if (!isPanelVisible) {
            return (
              <>
                {tableRows.map((row, idx) => renderTableDataRow(row, idx))}
                {sharedExpandPanelRow}
              </>
            )
          }

          const expandedIdx = expandedRowIndex
          return (
            <>
              {tableRows
                .slice(0, expandedIdx + 1)
                .map((row, idx) => renderTableDataRow(row, idx))}
              {sharedExpandPanelRow}
              {tableRows
                .slice(expandedIdx + 1)
                .map((row, offsetIdx) => renderTableDataRow(row, expandedIdx + 1 + offsetIdx))}
            </>
          )
        })()}
      </TableBody>
    </table>
  )

  const renderAppSelectorRow = (app: App, rowKey?: string) => {
    const primaryLabel = app.displayName || app.name || app.appId
    const storeId = app.appStoreId?.trim()
    const secondaryLine =
      storeId && storeId !== primaryLabel
        ? storeId
        : app.appId !== primaryLabel
          ? app.appId
          : null

    return (
      <CommandItem
        key={rowKey ?? app.appId}
        value={[
          app.displayName || "",
          app.name || "",
          app.appId || "",
          app.appStoreId || "",
        ].join(" ")}
        onSelect={() => toggleAppWithFilter(app.appId)}
        className={cn(
          "cursor-pointer overflow-hidden",
          isMobile
            ? "!grid w-full max-w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 px-2 py-2"
            : "min-w-0 w-full",
        )}
      >
        <Checkbox checked={selectedApps.includes(app.appId)} className="shrink-0" />
        <Avatar className="h-7 w-7 shrink-0 rounded-lg">
          {app.iconUri?.trim() ? (
            <AvatarImage src={app.iconUri.trim()} alt={primaryLabel} className="rounded-lg object-cover" />
          ) : null}
          <AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-[10px]">
            {primaryLabel.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-w-full overflow-hidden">
          <p className="truncate text-sm font-medium leading-tight" title={primaryLabel}>
            {primaryLabel}
          </p>
          {isMobile ? (
            secondaryLine ? (
              <p className="truncate text-xs leading-tight text-muted-foreground" title={secondaryLine}>
                {secondaryLine}
              </p>
            ) : null
          ) : (
            <>
              <p className="truncate text-xs leading-tight text-muted-foreground" title={app.appId}>
                {app.appId}
              </p>
              {storeId ? (
                <p
                  className="truncate font-mono text-[11px] leading-tight text-muted-foreground"
                  title={storeId}
                >
                  {storeId}
                </p>
              ) : null}
            </>
          )}
        </div>
      </CommandItem>
    )
  }

  const renderAppSelectorList = () => {
    const isByUserView = canScopeManagedTeams && appSelectorViewMode === "by_user"
    const listSearchActive = appListSearch.trim().length > 0

    return (
      <Command
        shouldFilter={false}
        className={cn(
          isMobile
            ? "flex h-full w-full max-w-full min-w-0 flex-col overflow-hidden rounded-none [&_[data-slot=command-input-wrapper]]:max-w-full [&_[data-slot=command-input-wrapper]]:min-w-0"
            : undefined,
        )}
      >
        {canScopeManagedTeams ? (
          <div className="flex gap-1 border-b border-border bg-muted/80 px-2 py-1.5">
            <button
              type="button"
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                appSelectorViewMode === "flat"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setAppSelectorViewMode("flat")}
            >
              Flat
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                appSelectorViewMode === "by_user"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setAppSelectorViewMode("by_user")}
            >
              Group By User
            </button>
          </div>
        ) : null}
        <CommandInput
          value={appListSearch}
          onValueChange={setAppListSearch}
          placeholder={isMobile ? "Search apps..." : "Search app name, App ID, or Store ID..."}
          className={cn(isMobile && "min-w-0 shrink-0 truncate")}
        />
        <CommandList
          className={cn(
            isMobile
              ? "max-h-none min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto"
              : "max-h-[300px]",
          )}
        >
          <CommandGroup
            className={cn(
              isMobile &&
                "w-full max-w-full min-w-0 overflow-x-hidden p-0 [&_[cmdk-item]]:max-w-full [&_[cmdk-item]]:min-w-0",
            )}
          >
            <div className="flex gap-2 border-b border-border px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const ids = appsPoolForSelector.map((a) => a.appId)
                  setSelectedApps(ids)
                  syncAppsActiveFilter(ids, appsPoolForSelector)
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
                  syncAppsActiveFilter([], appsPoolForSelector)
                }}
              >
                Clear
              </Button>
            </div>
            {isByUserView ? (
              selectedCommissionMemberIds.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">Select team members first.</div>
              ) : userAppsLoading ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">Loading apps by user…</div>
              ) : userAppsError ? (
                <div className="px-3 py-4 text-sm text-red-600">{userAppsError}</div>
              ) : listSearchActive && filteredUserAppGroups.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">No apps match your search.</div>
              ) : userAppGroups.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  No permitted apps for the selected members.
                </div>
              ) : (
                filteredUserAppGroups.map((group) => (
                  <div key={group.userId} className="pb-1">
                    <div className="sticky top-0 z-[1] bg-card px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.userLabel}
                    </div>
                    {group.apps.map((app) => renderAppSelectorRow(app, `${group.userId}-${app.appId}`))}
                  </div>
                ))
              )
            ) : selectedCommissionTeamIds.length > 0 &&
              teamScopeApps !== null &&
              appsForSelection.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No apps linked to the selected teams.
              </div>
            ) : listSearchActive && filteredFlatApps.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">No apps match your search.</div>
            ) : (
              filteredFlatApps.map((app) => renderAppSelectorRow(app))
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    )
  }

  const renderAppSelectorTrigger = (options?: { toggleOnClick?: boolean }) => (
    <Button
      variant="outline"
      className={cn(
        "h-10 w-full justify-between border-border bg-card font-normal sm:min-w-[11rem] sm:max-w-[280px]",
        isMobile ? "max-w-full min-w-0" : "max-w-none",
      )}
      type="button"
      disabled={appSelectorDisabled || (!canScopeManagedTeams && appsLoading)}
      aria-expanded={options?.toggleOnClick ? appPopoverOpen : undefined}
      onClick={
        options?.toggleOnClick
          ? () => {
              if (appSelectorDisabled || (!canScopeManagedTeams && appsLoading)) return
              setAppPopoverOpen((open) => !open)
            }
          : undefined
      }
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{appsTriggerLabel}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
  )

  const renderMetricFilterFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem]">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Metric</div>
          <Select value={draftMetricFilterMetric} onValueChange={setDraftMetricFilterMetric}>
            <SelectTrigger className="h-10 bg-card">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className={cn(isMobile && "z-[100]")}>
              {catalogMetrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  {metric.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Condition</div>
          <Select
            value={draftMetricFilterCondition}
            onValueChange={(value) =>
              setDraftMetricFilterCondition(value as CustomReportMetricFilter["condition"])
            }
          >
            <SelectTrigger className="h-10 bg-card">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent className={cn(isMobile && "z-[100]")}>
              {metricFilterConditions.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  {condition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Value</div>
          <Input
            type="number"
            inputMode="decimal"
            value={draftMetricFilterValue}
            onChange={(event) => setDraftMetricFilterValue(event.target.value)}
            placeholder="Value"
            className="h-10 bg-card"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          type="button"
          className="w-full sm:w-auto"
          onClick={() => setMetricFilterPopoverOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
          onClick={addMetricFilter}
          disabled={!draftMetricFilterMetric || draftMetricFilterValue.trim() === ""}
        >
          Apply
        </Button>
      </div>
    </div>
  )

  const renderFiltersBody = () => (
    <>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={dateSelectValue} onValueChange={handleDateSelectChange}>
                  <SelectTrigger className="h-10 w-full bg-card sm:w-44">
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent className={cn(isMobile && "z-[100]")}>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="month">Select month</SelectItem>
                    <SelectItem value="custom">Custom…</SelectItem>
                  </SelectContent>
                </Select>
    
                {dateFilterMode === "month" && (
                  <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen} modal={!isMobile}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full border-border bg-card sm:w-auto" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={cn("w-auto p-4", isMobile && "z-[100]")} align="start">
                      <div className="space-y-2">
                        <Label htmlFor="report-month-picker" className="text-sm font-medium text-foreground">
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
                        <p className="text-xs text-muted-foreground">
                          {format(startDate, "M/d/yyyy", { locale: enUS })} –{" "}
                          {format(endDate, "M/d/yyyy", { locale: enUS })}
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
    
                {dateFilterMode === "preset" ? (
                  <Button
                    variant="outline"
                    type="button"
                    disabled
                    className="h-10 w-full cursor-default border-border bg-muted/50 text-muted-foreground disabled:opacity-100 sm:w-auto"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    {dateRangeLabel}
                  </Button>
                ) : null}
    
                {dateFilterMode === "custom" ? (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen} modal={!isMobile}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full border-border bg-card sm:w-auto" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={cn("w-auto p-0", isMobile && "z-[100]")} align="start">
                      <div className="flex gap-1 border-b border-border p-2">
                        {datePresets.map((preset) => (
                          <Button
                            key={preset.id}
                            type="button"
                            variant={activePresetDays === preset.days ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "h-7 text-xs",
                              activePresetDays === preset.days && "bg-primary hover:bg-primary/90",
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
                ) : null}
    
                {canScopeManagedTeams && (
                  <>
                    <GroupedTeamMultiSelect
                      teams={commissionTeams}
                      teamGroupSections={commissionTeamGroupSections}
                      selectedTeamIds={selectedCommissionTeamIds}
                      onSelectedTeamIdsChange={handleCommissionTeamIdsChange}
                      disabled={commissionTeams.length === 0}
                      triggerLabel={teamsTriggerLabel}
                      showUsersIcon
                      emptyTeamsMessage="No teams under you or as team lead"
                      triggerClassName="w-full min-w-0 max-w-full sm:min-w-[11rem] sm:max-w-[280px]"
                      popoverModal={isMobile ? false : undefined}
                      popoverClassName={cn("w-[320px] p-0", isMobile && "z-[100]")}
                    />

                    <GroupedMemberMultiSelect
                      sections={commissionMemberGroupSections}
                      selectedMemberIds={selectedCommissionMemberIds}
                      onSelectedMemberIdsChange={handleCommissionMemberIdsChange}
                      disabled={selectedCommissionTeamIds.length === 0}
                      loading={memberOptionsLoading}
                      triggerLabel={membersTriggerLabel}
                      showUserIcon
                      placeholder="Select members"
                      emptyMembersMessage="No members in selected teams"
                      triggerClassName="w-full min-w-0 max-w-full sm:min-w-[11rem] sm:max-w-[280px]"
                      popoverModal={isMobile ? false : undefined}
                      popoverClassName={cn("w-[320px] p-0", isMobile && "z-[100]")}
                    />
                  </>
                )}
    
                {isMobile ? (
                  <div className="w-full max-w-full min-w-0 overflow-x-hidden">
                    {renderAppSelectorTrigger({ toggleOnClick: true })}
                    {appPopoverOpen ? (
                      <div className="mt-2 h-[220px] w-full max-w-full min-w-0 overflow-x-hidden overflow-y-hidden rounded-md border border-border bg-card">
                        {renderAppSelectorList()}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Popover
                    open={appPopoverOpen}
                    onOpenChange={(open) => {
                      if (appSelectorDisabled) return
                      setAppPopoverOpen(open)
                    }}
                  >
                    <PopoverTrigger asChild>{renderAppSelectorTrigger()}</PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      {renderAppSelectorList()}
                    </PopoverContent>
                  </Popover>
                )}

                {isMobile ? (
                  <Collapsible
                    open={metricFilterPopoverOpen}
                    onOpenChange={setMetricFilterPopoverOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="h-10 w-full gap-2 bg-card sm:w-auto" type="button">
                        <Plus className="h-4 w-4" />
                        Add filter
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 rounded-md border border-border bg-card p-4">
                      {renderMetricFilterFields()}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Popover open={metricFilterPopoverOpen} onOpenChange={setMetricFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full gap-2 bg-card sm:w-auto" type="button">
                        <Plus className="h-4 w-4" />
                        Add filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[calc(100vw-2rem)] max-w-[560px] p-4"
                      align="start"
                      side="bottom"
                      collisionPadding={16}
                    >
                      {renderMetricFilterFields()}
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  className="h-10 w-full gap-2 bg-primary hover:bg-primary/90 sm:w-auto"
                  type="button"
                  disabled={loadingSavedReport || reportLoading || !hasPendingApply}
                  onClick={handleApplyFilters}
                >
                  <Search className="w-4 h-4" />
                  Apply
                </Button>
              </div>
    
              {(activeFilters.length > 0 || metricFilters.length > 0) && (
                <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border pt-1">
                  <span className="shrink-0 text-sm text-muted-foreground">Active filters:</span>
                  {activeFilters
                    .filter((filter) => filter.type !== FILTER_COMMISSION_MEMBER)
                    .map((filter) => (
                    <Badge
                      key={filter.type}
                      variant="secondary"
                      className="max-w-full gap-1 border border-primary/30 bg-primary/10 pr-1 text-primary"
                    >
                      <span className="truncate">
                        {filter.type}: {filter.value}
                      </span>
                      {filter.type !== FILTER_COMMISSION_TEAM && filter.type !== FILTER_COMMISSION_MEMBER ? (
                        <button
                          type="button"
                          onClick={() => removeFilter(filter.type)}
                          className="ml-1 rounded p-0.5 hover:bg-primary/15"
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
                      className="gap-1 border border-purple-500/30 bg-purple-500/10 pr-1 text-purple-700 dark:text-purple-300"
                    >
                      {getMetricFilterLabel(filter, catalogMetrics)}
                      <button
                        type="button"
                        onClick={() => removeMetricFilter(index)}
                        className="ml-1 rounded p-0.5 hover:bg-purple-500/20"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
    </>
  )

  const renderParametersMetricsBody = (scrollAreaClassName: string) => (
    <>
      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search parameters or metrics..."
            className="h-10 border-border bg-card pl-9"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className={scrollAreaClassName}>
        <div className="border-b border-border p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Parameters ({selectedParameters.length})
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleParameterDragEnd}>
            <SortableContext
              items={orderedFilteredParameters.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
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
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Metrics ({selectedMetrics.length})
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMetricDragEnd}>
            <SortableContext
              items={orderedFilteredMetrics.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {orderedFilteredMetrics.map((metric) => (
                  <SortableReportFieldItem
                    key={metric.id}
                    id={metric.id}
                    label={metric.label}
                    selected={selectedMetrics.includes(metric.id)}
                    selectedColorClass="bg-primary/10 text-primary"
                    onToggle={() => toggleMetric(metric.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    </>
  )

  const selectedColumnsCount = selectedParameters.length + selectedMetrics.length
  const activeFiltersCount =
    activeFilters.filter((filter) => filter.type !== FILTER_COMMISSION_MEMBER).length +
    metricFilters.length

  const showSaveReportButton = savedReportId ? canEditReports : canCreateReports
  const showDeleteReportButton = Boolean(savedReportId && canDeleteReports)
  const showPinReportButton = Boolean(savedReportId && canPinReports)
  const hasReportActions = showSaveReportButton || showDeleteReportButton || showPinReportButton
  const reportActionsDisabled =
    deletingReport || savingReport || loadingSavedReport || pinningReport

  const desktopToolbarButtonClass = (tone: "default" | "danger" | "active" | "primary") =>
    cn(
      "flex h-auto shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5",
      tone === "danger" && "text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-300",
      tone === "active" && "bg-muted/70 text-primary hover:bg-muted/80 hover:text-primary",
      tone === "primary" && "text-primary hover:bg-primary/10 hover:text-primary",
      tone === "default" && "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  const renderReportActionButtons = (layout: "desktop" | "mobile") => {
    const isDesktop = layout === "desktop"
    const toolbarLabelClass = "text-[10px] font-medium leading-none"
    const mobileButtonClass = (tone: "default" | "danger" | "primary" | "active") =>
      cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        tone === "danger" && "text-red-600 hover:bg-red-500/10",
        tone === "primary" && "border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90",
        tone === "active" && "border-primary/30 bg-primary/10 text-primary",
        tone === "default" && "text-muted-foreground hover:bg-muted/50",
      )

    return (
      <>
        {showDeleteReportButton ? (
          isDesktop ? (
            <Button
              type="button"
              variant="ghost"
              className={desktopToolbarButtonClass("danger")}
              disabled={reportActionsDisabled}
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete report"
              aria-label="Delete report"
            >
              <Trash2 className="h-4 w-4" />
              <span className={toolbarLabelClass}>Delete</span>
            </Button>
          ) : (
            <button
              type="button"
              className={mobileButtonClass("danger")}
              disabled={reportActionsDisabled}
              onClick={() => {
                setDeleteDialogOpen(true)
                setMobileReportActionsOpen(false)
              }}
              title="Delete report"
              aria-label="Delete report"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )
        ) : null}
        {showPinReportButton ? (
          isDesktop ? (
            <Button
              type="button"
              variant="ghost"
              className={desktopToolbarButtonClass(isPinned ? "active" : "default")}
              disabled={reportActionsDisabled}
              onClick={() => void handleTogglePin()}
              title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
              aria-label={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              <span className={toolbarLabelClass}>{isPinned ? "Unpin" : "Pin"}</span>
            </Button>
          ) : (
            <button
              type="button"
              className={mobileButtonClass(isPinned ? "active" : "default")}
              disabled={reportActionsDisabled}
              onClick={() => {
                void handleTogglePin()
                setMobileReportActionsOpen(false)
              }}
              title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
              aria-label={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
            >
              {isPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
            </button>
          )
        ) : null}
        {showSaveReportButton ? (
          isDesktop ? (
            <Button
              type="button"
              variant="ghost"
              className={desktopToolbarButtonClass("primary")}
              disabled={savingReport || loadingSavedReport || deletingReport}
              onClick={handleSaveReportClick}
              title={savedReportId ? "Update report" : "Save report"}
              aria-label={savedReportId ? "Update report" : "Save report"}
            >
              <Save className="h-4 w-4" />
              <span className={toolbarLabelClass}>
                {savingReport ? "Saving…" : savedReportId ? "Update" : "Save"}
              </span>
            </Button>
          ) : (
            <button
              type="button"
              className={mobileButtonClass("primary")}
              disabled={savingReport || loadingSavedReport || deletingReport}
              onClick={() => {
                handleSaveReportClick()
                setMobileReportActionsOpen(false)
              }}
              title={savedReportId ? "Update report" : "Save report"}
              aria-label={savedReportId ? "Update report" : "Save report"}
            >
              <Save className="h-5 w-5" />
            </button>
          )
        ) : null}
      </>
    )
  }

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
                <SelectTrigger id="save-report-folder" className="bg-card">
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
                    className="bg-primary hover:bg-primary/90"
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
              className="bg-primary hover:bg-primary/90"
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

      <div className="flex flex-col gap-4">
        {showBackToReports ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-fit px-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/reports")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Reports
          </Button>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-foreground">{reportPageTitle}</h1>
            {savedReportId && canEditReports ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={savingReport || loadingSavedReport}
                onClick={() => setSaveDialogOpen(true)}
                title="Edit report name"
                aria-label="Edit report name"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasReportActions ? (
              <div className="hidden items-center gap-1 md:flex">{renderReportActionButtons("desktop")}</div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "flex h-auto shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5",
                isMobile && "hidden",
                filtersCardOpen
                  ? "bg-muted/70 text-primary hover:bg-muted/80 hover:text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => setFiltersCardOpen((open) => !open)}
              title={filtersCardOpen ? "Hide filters" : "Show filters"}
              aria-label={filtersCardOpen ? "Hide filters" : "Show filters"}
              aria-pressed={filtersCardOpen}
            >
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-none">Filter</span>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Build ad activity reports with custom parameters and metrics
        </p>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isMobile && "hidden",
          filtersCardOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "origin-top transition-transform duration-300 ease-in-out",
              filtersCardOpen ? "translate-y-0" : "-translate-y-2",
            )}
          >
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <CardDescription>Date range, apps, and report criteria. Click Apply to refresh data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{renderFiltersBody()}</CardContent>
      </Card>
          </div>
        </div>
      </div>

      <div
        ref={reportResultsRef}
        className={cn(
          "relative grid scroll-mt-16 grid-cols-1 gap-6 xl:items-start",
          parametersMetricsCollapsed ? "xl:grid-cols-[1fr_3.5rem]" : "xl:grid-cols-[1fr_18rem]",
        )}
      >
        <Card
          className={cn(
            "flex flex-col overflow-hidden border-border",
            isMobile && "max-h-[95dvh]",
            !isMobile && "xl:h-[min(75vh,760px)]",
          )}
        >
          <CardHeader className="shrink-0 border-b border-border pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-medium">Report results</CardTitle>
                <CardDescription>
                  {dateRangeLabel}
                  {selectedAppLabels.length > 0 && ` · ${appsTriggerLabel}`}
                  {tableRows.length > 0 ? " · Click a parameter cell to expand row details" : ""}
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
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div
              ref={tableScrollRef}
              className={cn(
                "min-h-0 flex-1 overflow-auto",
                isMobile ? "max-h-[calc(95dvh-5.5rem)]" : "max-h-[min(70vh,720px)]",
              )}
            >
              {tableContent}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "flex flex-col border-border",
            isMobile ? "hidden" : "flex xl:h-[min(75vh,760px)]",
          )}
        >
          <CardHeader className="shrink-0 border-b border-border px-3 py-3 min-h-[4.5rem]">
            <div
              className={cn(
                "flex w-full items-center gap-2",
                parametersMetricsCollapsed ? "justify-center" : "justify-between",
              )}
            >
              <CardTitle
                className={cn(
                  "text-base font-medium",
                  parametersMetricsCollapsed && "sr-only",
                )}
              >
                Parameters & Metrics
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setParametersMetricsCollapsed((prev) => !prev)}
                aria-label={
                  parametersMetricsCollapsed
                    ? "Expand parameters and metrics panel"
                    : "Collapse parameters and metrics panel"
                }
                aria-expanded={!parametersMetricsCollapsed}
              >
                {parametersMetricsCollapsed ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardDescription
              className={cn(parametersMetricsCollapsed && "sr-only")}
            >
              Choose columns to display in the table
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            {parametersMetricsCollapsed ? (
              <div className="flex flex-1 items-center justify-center p-2">
                <div
                  className={cn(
                    "select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    "[writing-mode:vertical-rl] [text-orientation:mixed]",
                  )}
                >
                  Parameters & Metrics
                </div>
              </div>
            ) : (
              renderParametersMetricsBody("min-h-0 flex-1")
            )}
          </CardContent>
        </Card>

        {isMobile ? (
          <>
            <div
              ref={mobileStickersRef}
              className="fixed right-0 z-40 flex touch-none cursor-grab flex-col items-end gap-2 active:cursor-grabbing"
              style={
                mobileStickersTop == null
                  ? { top: "50%", transform: "translateY(-50%)" }
                  : { top: mobileStickersTop }
              }
              {...mobileStickersDragProps}
            >
              {hasReportActions ? (
                <div className="flex flex-row-reverse items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (consumeMobileStickersDragClick()) return
                      setMobileReportActionsOpen((open) => !open)
                    }}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-l-xl border border-r-0 border-border bg-card shadow-lg",
                      mobileReportActionsOpen && "ring-2 ring-blue-300",
                    )}
                    aria-label={
                      mobileReportActionsOpen
                        ? "Hide report actions. Drag the sticker group up or down to reposition."
                        : "Show report actions. Drag the sticker group up or down to reposition."
                    }
                    aria-expanded={mobileReportActionsOpen}
                  >
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </button>
                  {mobileReportActionsOpen ? (
                    <div className="flex items-center gap-2.5 rounded-l-xl border border-r-0 border-border bg-card px-2.5 py-2 shadow-lg">
                      {renderReportActionButtons("mobile")}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (consumeMobileStickersDragClick()) return
                  setMobileFiltersOpen(true)
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-card px-1.5 py-3 shadow-lg",
                  hasPendingApply && "ring-2 ring-blue-300",
                )}
                aria-label="Open filters. Drag the sticker group up or down to reposition."
              >
                <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ writingMode: "vertical-rl" }}
                >
                  Filter
                </span>
                {activeFiltersCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 justify-center px-1 text-[10px] font-semibold"
                  >
                    {activeFiltersCount}
                  </Badge>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (consumeMobileStickersDragClick()) return
                  setMobileColumnsOpen(true)
                }}
                className="flex flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-card px-1.5 py-3 shadow-lg"
                aria-label="Open parameters and metrics. Drag the sticker group up or down to reposition."
              >
                <Columns3 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ writingMode: "vertical-rl" }}
                >
                  Columns
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 justify-center px-1 text-[10px] font-semibold"
                >
                  {selectedColumnsCount}
                </Badge>
              </button>
            </div>

            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetContent
                side="right"
                className="flex h-[100dvh] max-h-[100dvh] w-[min(100vw-1rem,22rem)] flex-col gap-0 overflow-hidden p-0"
              >
                <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="text-base">Filters</SheetTitle>
                  <SheetDescription>
                    Date range, apps, and report criteria. Click Apply to refresh data.
                  </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="box-border w-full min-w-0 max-w-full space-y-4 p-4 [&_*]:min-w-0">
                    {renderFiltersBody()}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={mobileColumnsOpen} onOpenChange={setMobileColumnsOpen}>
              <SheetContent
                side="right"
                className="flex w-[min(100vw-1.5rem,20rem)] flex-col gap-0 p-0"
              >
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="text-base">Parameters & Metrics</SheetTitle>
                  <SheetDescription>Choose columns to display in the table</SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col">
                  {renderParametersMetricsBody("min-h-0 flex-1")}
                  <div className="shrink-0 border-t border-border bg-card p-4">
                    <Button
                      className="h-10 w-full gap-2 bg-primary hover:bg-primary/90"
                      type="button"
                      disabled={loadingSavedReport || reportLoading || !hasPendingApply}
                      onClick={handleApplyFilters}
                    >
                      <Search className="h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : null}
      </div>
    </div>
  )
}
