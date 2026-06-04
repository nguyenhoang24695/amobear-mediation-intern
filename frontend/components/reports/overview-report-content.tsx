"use client"

import { type CSSProperties, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { format, parse, parseISO } from "date-fns"
import { enUS } from "date-fns/locale"
import { ChevronDown, ChevronLeft, ChevronRight, Copy, GripVertical, Loader2, RefreshCw, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { GroupedTeamMultiSelect } from "@/components/reports/grouped-team-multi-select"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import { getTeamGroupSectionLabel } from "@/lib/organizations/team-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { organizationsApi, reportsApi, type OrgTeamGroup } from "@/lib/api/services"
import type {
  OverviewMetricId,
  OverviewParameterId,
  OverviewReportFilter,
  ProfitOverviewAppRow,
  ProfitOverviewMetricValues,
  ProfitOverviewMonthCell,
  ProfitOverviewReportResponse,
  ProfitOverviewSharedAppConflict,
  ProfitOverviewTeamRow,
} from "@/types/reports"

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const APPS_PER_PAGE = 20
const SHARED_APP_CONFLICTS_DISPLAY_MAX = 5

const OVERVIEW_METRICS: { id: OverviewMetricId; label: string }[] = [
  { id: "revenue", label: "Revenue" },
  { id: "cost", label: "Cost" },
  { id: "profit", label: "Profit" },
]

const DEFAULT_OVERVIEW_METRICS: OverviewMetricId[] = ["revenue", "cost", "profit"]

const OVERVIEW_PARAMETERS: { id: OverviewParameterId; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "actual", label: "Actual" },
  { id: "percent", label: "%" },
]

const DEFAULT_OVERVIEW_PARAMETERS: OverviewParameterId[] = ["plan", "actual", "percent"]

const PARAMETER_SIDEBAR_STYLES = {
  selected: "bg-emerald-50 text-emerald-900",
  accent: "bg-emerald-500",
  checkbox: "border-emerald-600 bg-emerald-600",
  header: "bg-emerald-50 text-emerald-900",
  border: "border-emerald-200",
} as const

const METRIC_TABLE_STYLES: Record<
  OverviewMetricId,
  { header: string; cell: string; cellSubtle: string; border: string }
> = {
  revenue: {
    header: "bg-sky-50 text-sky-900",
    cell: "bg-sky-50/35",
    cellSubtle: "bg-sky-50/55",
    border: "border-sky-200",
  },
  cost: {
    header: "bg-amber-50 text-amber-900",
    cell: "bg-amber-50/35",
    cellSubtle: "bg-amber-50/55",
    border: "border-amber-200",
  },
  profit: {
    header: "bg-emerald-50 text-emerald-900",
    cell: "bg-emerald-50/35",
    cellSubtle: "bg-emerald-50/55",
    border: "border-emerald-200",
  },
}

function metricColumnEndBorder(
  metricId: OverviewMetricId,
  isLastParameterInMetric: boolean,
  isLastMetricInMonth: boolean,
) {
  if (!isLastParameterInMetric) return ""
  if (isLastMetricInMonth) return "border-r-2 border-slate-300"
  return cn("border-r", METRIC_TABLE_STYLES[metricId].border)
}

function renderParameterCellContent(
  values: ProfitOverviewMetricValues,
  parameterId: OverviewParameterId,
) {
  switch (parameterId) {
    case "plan":
      return formatCurrency(values.plan)
    case "actual":
      return formatCurrency(values.actual)
    case "percent":
      return formatPercent(values.completionPercent)
    default:
      return "—"
  }
}

function parameterCellClassName(
  parameterId: OverviewParameterId,
  values: ProfitOverviewMetricValues,
) {
  if (parameterId === "percent") return getPercentClass(values.completionPercent)
  return "text-slate-700"
}

function currentYearRange() {
  const year = new Date().getFullYear()
  return yearRangeForOverview(String(year))
}

function yearRangeForOverview(year: string) {
  const now = new Date()
  const currentYear = String(now.getFullYear())
  const toMonth = year === currentYear
    ? String(now.getMonth() + 1).padStart(2, "0")
    : "12"
  return { from: `${year}-01`, to: `${year}-${toMonth}` }
}

function pickStringField(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

/** Chuẩn hóa payload API (camelCase hoặc PascalCase) — tránh set state undefined lên input controlled. */
function parseOverviewFilter(raw: unknown): OverviewReportFilter | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const from = pickStringField(record, "from", "From")
  const to = pickStringField(record, "to", "To")
  if (!from || !to || !MONTH_KEY_PATTERN.test(from) || !MONTH_KEY_PATTERN.test(to)) return null

  const teamIdsRaw = record.teamIds ?? record.TeamIds
  const teamIds = Array.isArray(teamIdsRaw)
    ? teamIdsRaw.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : []

  const selectedYear =
    pickStringField(record, "selectedYear", "SelectedYear") ?? from.slice(0, 4)

  return { from, to, selectedYear, teamIds }
}

function resolveYearInOptions(year: string, yearOptions: readonly string[]): string {
  if (yearOptions.includes(year)) return year
  return yearOptions[0] ?? String(new Date().getFullYear())
}

/** So team ids from org API and profit-overview API match in Set/has checks. */
function normalizeTeamId(teamId: string): string {
  return teamId.trim().toLowerCase()
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—"
  const safe = Number(value)
  return `$${safe.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—"
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
}

function getPercentClass(percent: number | null | undefined) {
  if (percent == null) return "text-slate-500"
  if (percent < 0 || percent < 50) return "text-red-600 font-medium"
  if (percent < 80) return "text-amber-600 font-medium"
  return "text-green-600 font-medium"
}

function formatLastUpdatedAt(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy · h:mm a")
  } catch {
    return value
  }
}

function formatAppStoreId(value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return "—"
  return trimmed.length > 35 ? `${trimmed.slice(0, 30)}....` : trimmed
}

interface TeamAppsCacheEntry {
  totalCount: number
  totalAppPages: number
  pages: Record<number, ProfitOverviewAppRow[]>
  loading: boolean
  loaded: boolean
  error?: string | null
}

function normalizeAppRows(apps: ProfitOverviewAppRow[]): ProfitOverviewAppRow[] {
  return apps.map((app) => ({
    ...app,
    months: normalizeMonthsRecord(app.months),
  }))
}

function getTeamAppCount(team: ProfitOverviewTeamRow, cache?: TeamAppsCacheEntry): number {
  if (cache && cache.totalCount > 0) return cache.totalCount
  return team.apps?.length ?? 0
}

async function prefetchTeamAppsPage1(
  teams: ProfitOverviewTeamRow[],
  loadPage: (teamId: string, page: number) => Promise<void>,
  concurrency = 4,
) {
  const targets = teams
  if (targets.length === 0) return

  let index = 0
  const worker = async () => {
    while (index < targets.length) {
      const team = targets[index]
      index += 1
      await loadPage(team.teamId, 1)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()),
  )
}

function formatMonthLabel(month: string): string {
  try {
    return format(parse(month, "yyyy-MM", new Date()), "MMM yyyy", { locale: enUS })
  } catch {
    return month
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
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
        </svg>
      )}
      {platform}
    </Badge>
  )
}

function emptyMetricValues(): ProfitOverviewMetricValues {
  return { plan: null, actual: null, completionPercent: null }
}

function normalizeMetricValues(raw: unknown): ProfitOverviewMetricValues {
  if (!raw || typeof raw !== "object") return emptyMetricValues()
  const record = raw as Record<string, unknown>
  const planRaw = record.plan ?? record.Plan
  const actualRaw = record.actual ?? record.Actual
  const completionRaw = record.completionPercent ?? record.CompletionPercent
  return {
    plan: planRaw == null || planRaw === "" ? null : Number(planRaw),
    actual: actualRaw == null || actualRaw === "" ? null : Number(actualRaw),
    completionPercent:
      completionRaw == null || completionRaw === ""
        ? null
        : Number(completionRaw),
  }
}

function normalizeMonthCell(raw: unknown): ProfitOverviewMonthCell {
  if (!raw || typeof raw !== "object") {
    return {
      revenue: emptyMetricValues(),
      cost: emptyMetricValues(),
      profit: emptyMetricValues(),
    }
  }

  const record = raw as Record<string, unknown>

  // Legacy API shape (profit only)
  if (
    "plannedProfit" in record ||
    "planned_profit" in record ||
    "actualProfit" in record ||
    "actual_profit" in record
  ) {
    const profit = normalizeMetricValues({
      plan: record.plannedProfit ?? record.planned_profit,
      actual: record.actualProfit ?? record.actual_profit,
      completionPercent: record.completionPercent ?? record.completion_percent,
    })
    return {
      revenue: emptyMetricValues(),
      cost: emptyMetricValues(),
      profit,
    }
  }

  return {
    revenue: normalizeMetricValues(record.revenue ?? record.Revenue),
    cost: normalizeMetricValues(record.cost ?? record.Cost),
    profit: normalizeMetricValues(record.profit ?? record.Profit),
  }
}

function normalizeMonthsRecord(
  months: Record<string, ProfitOverviewMonthCell> | undefined,
): Record<string, ProfitOverviewMonthCell> {
  if (!months) return {}
  return Object.fromEntries(
    Object.entries(months).map(([monthKey, cell]) => [monthKey, normalizeMonthCell(cell)]),
  )
}

function getAppMonthsFiltered(
  appMonths: Record<string, ProfitOverviewMonthCell>,
  teamMonths: Record<string, ProfitOverviewMonthCell>,
  monthKeys: string[],
): Record<string, ProfitOverviewMonthCell> {
  const result: Record<string, ProfitOverviewMonthCell> = {}
  for (const monthKey of monthKeys) {
    const teamCell = teamMonths[monthKey]
    const isTeamEmpty =
      !teamCell ||
      (teamCell.revenue.plan == null &&
        teamCell.revenue.actual == null &&
        teamCell.cost.plan == null &&
        teamCell.cost.actual == null &&
        teamCell.profit.plan == null &&
        teamCell.profit.actual == null)

    if (isTeamEmpty) {
      result[monthKey] = {
        revenue: emptyMetricValues(),
        cost: emptyMetricValues(),
        profit: emptyMetricValues(),
      }
    } else {
      result[monthKey] = appMonths[monthKey] || {
        revenue: emptyMetricValues(),
        cost: emptyMetricValues(),
        profit: emptyMetricValues(),
      }
    }
  }
  return result
}

function normalizeOverviewResponse(raw: ProfitOverviewReportResponse): ProfitOverviewReportResponse {
  return {
    ...raw,
    teams: (raw.teams ?? []).map((team) => ({
      ...team,
      months: normalizeMonthsRecord(team.months),
    })),
  }
}

function getMonthCell(
  months: Record<string, ProfitOverviewMonthCell>,
  month: string,
): ProfitOverviewMonthCell {
  return normalizeMonthCell(months[month])
}

function getMetricValues(
  cell: ProfitOverviewMonthCell,
  metricId: OverviewMetricId,
): ProfitOverviewMetricValues {
  return cell[metricId] ?? emptyMetricValues()
}

function TeamAppsPager({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * APPS_PER_PAGE + 1
  const end = Math.min(currentPage * APPS_PER_PAGE, totalItems)

  return (
    <div className="flex flex-col gap-2 py-1 text-sm sm:flex-row sm:flex-wrap sm:items-center">
      <span className="shrink-0 text-slate-500">
        Apps <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="tabular-nums text-slate-600">
          {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function OverviewMonthCells({
  months,
  monthKeys,
  selectedMetrics,
  selectedParameters,
  rowVariant = "team",
}: {
  months: Record<string, ProfitOverviewMonthCell>
  monthKeys: string[]
  selectedMetrics: OverviewMetricId[]
  selectedParameters: OverviewParameterId[]
  rowVariant?: "team" | "app"
}) {
  return (
    <>
      {monthKeys.map((month) => {
        const cell = getMonthCell(months, month)
        return (
          <Fragment key={month}>
            {selectedMetrics.map((metricId, metricIndex) => {
              const values = getMetricValues(cell, metricId)
              const isLastMetricInMonth = metricIndex === selectedMetrics.length - 1
              const metricStyle = METRIC_TABLE_STYLES[metricId]
              const bgClass = rowVariant === "app" ? metricStyle.cellSubtle : metricStyle.cell
              return (
                <Fragment key={`${month}-${metricId}`}>
                  {selectedParameters.map((parameterId, parameterIndex) => {
                    const isLastParameterInMetric = parameterIndex === selectedParameters.length - 1
                    const isFirstParameter = parameterIndex === 0
                    const minWidth =
                      parameterId === "percent" ? "min-w-[56px]" : "min-w-[80px]"
                    return (
                      <TableCell
                        key={`${month}-${metricId}-${parameterId}`}
                        className={cn(
                          minWidth,
                          "text-right text-sm tabular-nums",
                          isFirstParameter ? cn("border-l", metricStyle.border) : "",
                          metricColumnEndBorder(metricId, isLastParameterInMetric, isLastMetricInMonth),
                          bgClass,
                          parameterCellClassName(parameterId, values),
                        )}
                      >
                        {renderParameterCellContent(values, parameterId)}
                      </TableCell>
                    )
                  })}
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
    </>
  )
}

function SortableOverviewMetricItem({
  id,
  label,
  selected,
  onToggle,
}: {
  id: OverviewMetricId
  label: string
  selected: boolean
  onToggle: (id: OverviewMetricId) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !selected,
  })

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
      onClick={() => onToggle(id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
        selected ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400",
          selected ? "cursor-grab active:cursor-grabbing hover:bg-white/60" : "opacity-30",
        )}
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span className={cn("h-5 w-1 shrink-0 rounded-full", selected ? "bg-blue-500" : "bg-transparent")} />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
        )}
        aria-hidden
      >
        {selected ? <span className="text-[10px] leading-none">✓</span> : null}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
    </button>
  )
}

function SortableOverviewParameterItem({
  id,
  label,
  selected,
  onToggle,
}: {
  id: OverviewParameterId
  label: string
  selected: boolean
  onToggle: (id: OverviewParameterId) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !selected,
  })

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
      onClick={() => onToggle(id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
        selected ? PARAMETER_SIDEBAR_STYLES.selected : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400",
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
          "h-5 w-1 shrink-0 rounded-full",
          selected ? PARAMETER_SIDEBAR_STYLES.accent : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? PARAMETER_SIDEBAR_STYLES.checkbox : "border-slate-300 bg-white",
          selected ? "text-white" : "",
        )}
        aria-hidden
      >
        {selected ? <span className="text-[10px] leading-none">✓</span> : null}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
    </button>
  )
}

export function OverviewReportContent() {
  const defaultRange = useMemo(() => currentYearRange(), [])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [fromMonth, setFromMonth] = useState(defaultRange.from)
  const [toMonth, setToMonth] = useState(defaultRange.to)
  const [appliedFrom, setAppliedFrom] = useState(defaultRange.from)
  const [appliedTo, setAppliedTo] = useState(defaultRange.to)
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<ProfitOverviewReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFilterTeams, setLoadingFilterTeams] = useState(false)
  const [filterTeams, setFilterTeams] = useState<CommissionTeamOption[]>([])
  const [filterTeamGroups, setFilterTeamGroups] = useState<OrgTeamGroup[]>([])
  const [savingFilter, setSavingFilter] = useState(false)
  const [filterExpanded, setFilterExpanded] = useState(true)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(() => new Set())
  const [teamAppPageByTeamId, setTeamAppPageByTeamId] = useState<Record<string, number>>({})
  const [teamAppsCache, setTeamAppsCache] = useState<Record<string, TeamAppsCacheEntry>>({})
  const [sharedAppConflicts, setSharedAppConflicts] = useState<ProfitOverviewSharedAppConflict[]>([])
  const [metricOrder, setMetricOrder] = useState<OverviewMetricId[]>(DEFAULT_OVERVIEW_METRICS)
  const [selectedMetrics, setSelectedMetrics] = useState<OverviewMetricId[]>(DEFAULT_OVERVIEW_METRICS)
  const [parameterOrder, setParameterOrder] = useState<OverviewParameterId[]>(DEFAULT_OVERVIEW_PARAMETERS)
  const [selectedParameters, setSelectedParameters] = useState<OverviewParameterId[]>(
    DEFAULT_OVERVIEW_PARAMETERS,
  )
  const [metricsCollapsed, setMetricsCollapsed] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibleMetrics = useMemo(
    () =>
      metricOrder
        .filter((id) => selectedMetrics.includes(id))
        .map((id) => OVERVIEW_METRICS.find((metric) => metric.id === id))
        .filter((metric): metric is (typeof OVERVIEW_METRICS)[number] => metric != null),
    [metricOrder, selectedMetrics],
  )

  const visibleParameters = useMemo(
    () =>
      parameterOrder
        .filter((id) => selectedParameters.includes(id))
        .map((id) => OVERVIEW_PARAMETERS.find((parameter) => parameter.id === id))
        .filter((parameter): parameter is (typeof OVERVIEW_PARAMETERS)[number] => parameter != null),
    [parameterOrder, selectedParameters],
  )

  const colsPerMonth = visibleMetrics.length * visibleParameters.length

  const toggleMetric = (metricId: OverviewMetricId) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricId)) {
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== metricId)
      }
      return [...prev, metricId]
    })
  }

  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id) as OverviewMetricId
    const overId = String(over.id) as OverviewMetricId
    if (!selectedMetrics.includes(activeId) || !selectedMetrics.includes(overId)) return

    setMetricOrder((prev) => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const toggleParameter = (parameterId: OverviewParameterId) => {
    setSelectedParameters((prev) => {
      if (prev.includes(parameterId)) {
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== parameterId)
      }
      return [...prev, parameterId]
    })
  }

  const handleParameterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id) as OverviewParameterId
    const overId = String(over.id) as OverviewParameterId
    if (!selectedParameters.includes(activeId) || !selectedParameters.includes(overId)) return

    setParameterOrder((prev) => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(current - index))
  }, [])

  const selectYearValue = resolveYearInOptions(selectedYear, yearOptions)

  useEffect(() => {
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(selectYearValue)
    }
  }, [selectedYear, selectYearValue, yearOptions])

  const loadTeamApps = useCallback(
    async (teamId: string, page: number, range?: { from: string; to: string }) => {
      setTeamAppsCache((prev) => ({
        ...prev,
        [teamId]: {
          totalCount: prev[teamId]?.totalCount ?? 0,
          totalAppPages: prev[teamId]?.totalAppPages ?? 0,
          pages: prev[teamId]?.pages ?? {},
          loading: true,
          loaded: prev[teamId]?.loaded ?? false,
          error: null,
        },
      }))

      try {
        const response = await reportsApi.getProfitOverviewTeamApps(teamId, {
          from: range?.from ?? appliedFrom,
          to: range?.to ?? appliedTo,
          page,
          pageSize: APPS_PER_PAGE,
        })
        setTeamAppsCache((prev) => ({
          ...prev,
          [teamId]: {
            totalCount: response.totalCount,
            totalAppPages: response.totalAppPages,
            pages: {
              ...(prev[teamId]?.pages ?? {}),
              [page]: normalizeAppRows(response.apps ?? []),
            },
            loading: false,
            loaded: true,
            error: null,
          },
        }))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load team apps"
        setTeamAppsCache((prev) => ({
          ...prev,
          [teamId]: {
            totalCount: prev[teamId]?.totalCount ?? 0,
            totalAppPages: prev[teamId]?.totalAppPages ?? 0,
            pages: prev[teamId]?.pages ?? {},
            loading: false,
            loaded: true,
            error: message,
          },
        }))
      }
    },
    [appliedFrom, appliedTo],
  )

  const loadData = useCallback(
    async (range?: { from: string; to: string }, teamIdsOverride?: string[]) => {
      setLoading(true)
      setTeamAppsCache({})
      try {
        const from = range?.from ?? appliedFrom
        const to = range?.to ?? appliedTo
        const teamIds = teamIdsOverride ?? selectedTeamIds
        const response = await reportsApi.getProfitOverview({
          from,
          to,
          ...(teamIds.length > 0 ? { teamIds } : {}),
        })
        const normalized = normalizeOverviewResponse(response)
        setData(normalized)
        const normalizedTeamById = new Map(
          normalized.teams.map((team) => [normalizeTeamId(team.teamId), team]),
        )
        const filterTeamById = new Map(
          filterTeams.map((team) => [normalizeTeamId(team.teamId), team]),
        )
        const appPrefetchTeams =
          teamIds.length === 0
            ? normalized.teams
            : teamIds.map((teamId) => {
                const normalizedId = normalizeTeamId(teamId)
                const row = normalizedTeamById.get(normalizedId)
                if (row) return row
                const option = filterTeamById.get(normalizedId)
                return {
                  teamId,
                  teamName: option?.label ?? teamId,
                  months: {},
                } satisfies ProfitOverviewTeamRow
              })

        void reportsApi
          .getProfitOverviewSharedAppConflicts({
            from,
            to,
            ...(teamIds.length > 0 ? { teamIds } : {}),
          })
          .then(setSharedAppConflicts)
          .catch(() => setSharedAppConflicts([]))

        void prefetchTeamAppsPage1(
          appPrefetchTeams,
          (teamId, page) => loadTeamApps(teamId, page, { from, to }),
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load overview report"
        toast.error(message)
        setData(null)
        setSharedAppConflicts([])
      } finally {
        setLoading(false)
      }
    },
    [appliedFrom, appliedTo, selectedTeamIds, filterTeams, loadTeamApps],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await reportsApi.getOverviewFilter()
        if (cancelled) return
        const saved = parseOverviewFilter(raw)
        if (!saved) return
        const year = resolveYearInOptions(saved.selectedYear ?? saved.from.slice(0, 4), yearOptions)
        setFromMonth(saved.from)
        setToMonth(saved.to)
        setSelectedYear(year)
        setSelectedTeamIds(saved.teamIds)
      } catch {
        // Không chặn trang nếu chưa có filter đã lưu hoặc API lỗi.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [yearOptions])

  useEffect(() => {
    let cancelled = false
    const orgId = getCurrentUser()?.organization?.id
    if (!orgId) return

    setLoadingFilterTeams(true)
    void (async () => {
      try {
        const [teams, groups] = await Promise.all([
          organizationsApi.getTeams(orgId),
          organizationsApi.getTeamGroups(orgId).catch(() => [] as OrgTeamGroup[]),
        ])
        if (cancelled) return
        setFilterTeamGroups(groups)
        setFilterTeams(
          teams
            .filter((team) => team.isActive)
            .map(
              (team): CommissionTeamOption => ({
                teamId: team.id,
                label: team.name,
                teamGroup: team.teamGroup ?? null,
              }),
            )
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
        )
      } catch {
        if (!cancelled) setFilterTeams([])
      } finally {
        if (!cancelled) setLoadingFilterTeams(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const applyRange = async () => {
    if (fromMonth > toMonth) {
      toast.error("From month must be on or before to month.")
      return
    }
    setAppliedFrom(fromMonth)
    setAppliedTo(toMonth)
    setSelectedYear(fromMonth.slice(0, 4))
    await loadData({ from: fromMonth, to: toMonth }, selectedTeamIds)

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "smooth",
        })
      }
    }, 150)
  }

  const saveFilter = async () => {
    if (fromMonth > toMonth) {
      toast.error("From month must be on or before to month.")
      return
    }
    setSavingFilter(true)
    try {
      await reportsApi.saveOverviewFilter({
        from: fromMonth,
        to: toMonth,
        selectedYear,
        teamIds: selectedTeamIds,
      })
      toast.success("Filter saved to your settings.")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save filter"
      toast.error(message)
    } finally {
      setSavingFilter(false)
    }
  }

  const handleYearChange = (year: string) => {
    const range = yearRangeForOverview(year)
    setSelectedYear(year)
    setFromMonth(range.from)
    setToMonth(range.to)
  }

  const months = data?.months ?? []
  const allTeams = data?.teams ?? []

  useEffect(() => {
    if (filterTeams.length === 0) return
    const validIds = new Set(filterTeams.map((team) => normalizeTeamId(team.teamId)))
    setSelectedTeamIds((prev) => prev.filter((id) => validIds.has(normalizeTeamId(id))))
  }, [filterTeams])

  const teams = useMemo(() => {
    if (selectedTeamIds.length === 0) return allTeams

    const selected = new Set(selectedTeamIds.map(normalizeTeamId))
    const dataById = new Map(allTeams.map((team) => [normalizeTeamId(team.teamId), team]))

    const orderedCandidates =
      filterTeams.length > 0
        ? filterTeams.filter((team) => selected.has(normalizeTeamId(team.teamId)))
        : allTeams.filter((team) => selected.has(normalizeTeamId(team.teamId)))

    return orderedCandidates.map((candidate) => {
      const row = dataById.get(normalizeTeamId(candidate.teamId))
      if (row) return row
      return {
        teamId: candidate.teamId,
        teamName: "label" in candidate ? candidate.label : candidate.teamName,
        months: {},
      } satisfies ProfitOverviewTeamRow
    })
  }, [allTeams, selectedTeamIds, filterTeams])

  const [sharedAppWarningDismissed, setSharedAppWarningDismissed] = useState(false)
  const [sharedAppWarningCountdown, setSharedAppWarningCountdown] = useState(10)

  useEffect(() => {
    setSharedAppWarningDismissed(false)
  }, [sharedAppConflicts.length])

  useEffect(() => {
    if (sharedAppConflicts.length === 0 || sharedAppWarningDismissed) return

    setSharedAppWarningCountdown(10)
    const intervalId = window.setInterval(() => {
      setSharedAppWarningCountdown((prev) => {
        if (prev <= 1) {
          setSharedAppWarningDismissed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [sharedAppConflicts.length, sharedAppWarningDismissed])

  // Chỉ đồng bộ expanded rows theo dữ liệu đã load — không cắt selectedTeamIds theo allTeams
  // (allTeams có thể là tập con của filterTeams; cắt selection sau Apply gây reset về 1 team).
  useEffect(() => {
    if (allTeams.length === 0) return
    const validIds = new Set(allTeams.map((team) => normalizeTeamId(team.teamId)))
    setExpandedTeamIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (validIds.has(normalizeTeamId(id))) next.add(id)
      }
      return next
    })
  }, [allTeams])

  const toggleTeamExpanded = (teamId: string) => {
    const isExpanded = expandedTeamIds.has(teamId)
    if (isExpanded) {
      setExpandedTeamIds((prev) => {
        const next = new Set(prev)
        next.delete(teamId)
        return next
      })
      return
    }

    const page = 1
    setExpandedTeamIds((prev) => new Set(prev).add(teamId))
    setTeamAppPageByTeamId((pages) => ({ ...pages, [teamId]: page }))
    if (!teamAppsCache[teamId]?.pages[page]) {
      void loadTeamApps(teamId, page)
    }
  }

  const setTeamAppPage = (teamId: string, page: number) => {
    setTeamAppPageByTeamId((prev) => ({ ...prev, [teamId]: page }))
    const cache = teamAppsCache[teamId]
    if (!cache?.pages[page]) {
      void loadTeamApps(teamId, page)
    }
  }

  const copyAppStoreId = async (appStoreId: string | null | undefined) => {
    const value = appStoreId?.trim()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success("App Store ID copied.")
    } catch {
      toast.error("Failed to copy App Store ID.")
    }
  }

  useEffect(() => {
    if (allTeams.length === 0) return
    setTeamAppPageByTeamId((prev) => {
      const next: Record<string, number> = {}
      for (const team of allTeams) {
        const cache = teamAppsCache[team.teamId]
        const appCount = getTeamAppCount(team, cache)
        const maxPage = Math.max(1, Math.ceil(appCount / APPS_PER_PAGE))
        const current = prev[team.teamId] ?? 1
        next[team.teamId] = Math.min(Math.max(1, current), maxPage)
      }
      return next
    })
  }, [allTeams, teamAppsCache])

  return (
    <div className="space-y-6">
      <Card className="gap-0 overflow-hidden border-slate-200 py-0 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 [.border-b]:pb-2.5">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900">Overview Report</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              KPI plan vs actual by team (revenue, cost, profit). Expand a team for per-app detail.
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setFilterExpanded((prev) => !prev)}
                aria-label={filterExpanded ? "Collapse filters" : "Expand filters"}
                aria-expanded={filterExpanded}
              >
                {filterExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{filterExpanded ? "Hide filters" : "Show filters"}</TooltipContent>
          </Tooltip>
        </CardHeader>
        {filterExpanded ? (
          <CardContent className="flex flex-wrap items-end gap-3 px-4 py-3 [&_label]:leading-none">
            <div className="space-y-1">
              <Label htmlFor="overview-year" className="text-xs">
                Year
              </Label>
              <Select value={selectYearValue} onValueChange={handleYearChange}>
                <SelectTrigger id="overview-year" className="h-9 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="overview-from" className="text-xs">
                From
              </Label>
              <Input
                id="overview-from"
                type="month"
                value={fromMonth || defaultRange.from}
                onChange={(e) => setFromMonth(e.target.value || defaultRange.from)}
                className="h-9 w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="overview-to" className="text-xs">
                To
              </Label>
              <Input
                id="overview-to"
                type="month"
                value={toMonth || defaultRange.to}
                onChange={(e) => setToMonth(e.target.value || defaultRange.to)}
                className="h-9 w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="overview-teams" className="text-xs">
                Teams
              </Label>
              <GroupedTeamMultiSelect
                id="overview-teams"
                teams={filterTeams}
                teamGroups={filterTeamGroups}
                selectedTeamIds={selectedTeamIds}
                onSelectedTeamIdsChange={setSelectedTeamIds}
                disabled={loadingFilterTeams}
                placeholder="All teams"
                searchPlaceholder="Search teams..."
                emptySearchMessage="No teams found."
                emptyTeamsMessage="No teams found."
                triggerClassName="h-9 min-h-9 w-[200px] max-w-[200px]"
                popoverClassName="w-[320px] p-0"
              />
            </div>
            <Button
              type="button"
              className="h-9 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
              onClick={() => void applyRange()}
            >
              Apply
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={savingFilter}
                  onClick={() => void saveFilter()}
                  aria-label="Save filter"
                >
                  {savingFilter ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save current filter to your settings</TooltipContent>
            </Tooltip>
          </CardContent>
        ) : null}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data === null ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Select a period and click <span className="font-medium text-slate-700">Apply</span> to load the
            overview report.
          </CardContent>
        </Card>
      ) : allTeams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No teams available for this period.
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No teams match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            metricsCollapsed ? "xl:grid-cols-[1fr_3.5rem]" : "xl:grid-cols-[1fr_18rem]",
          )}
        >
          <Card className="overflow-hidden border-slate-200">
            <CardContent className="p-0">
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                Last update at:{" "}
                {data?.lastUpdatedAt ? (
                  <span className="text-slate-600">{formatLastUpdatedAt(data.lastUpdatedAt)}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </p>
              {sharedAppConflicts.length > 0 && !sharedAppWarningDismissed ? (
                <div
                  className="relative border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700"
                  role="alert"
                >
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    <span className="whitespace-nowrap text-[10px] text-red-600/80">
                      Auto close in {sharedAppWarningCountdown}s
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-700 hover:bg-red-100 hover:text-red-900"
                      aria-label="Dismiss warning"
                      onClick={() => setSharedAppWarningDismissed(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="pr-36 font-semibold text-red-800">
                    Warning: the same app appears under multiple teams in the same group
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {sharedAppConflicts
                      .slice(0, SHARED_APP_CONFLICTS_DISPLAY_MAX)
                      .map((conflict) => (
                        <li key={`${conflict.appStoreId}-${conflict.groupLabels.join("|")}`}>
                          <span className="font-medium">{conflict.appLabel}</span>{" "}
                          <span className="font-mono text-red-600/90">({conflict.appStoreId})</span>
                          {" — groups: "}
                          {conflict.groupLabels
                            .map((g) =>
                              getTeamGroupSectionLabel(g === "(No group)" ? null : g),
                            )
                            .join(", ")}
                          {" · teams: "}
                          {conflict.teamNames.join(", ")}
                        </li>
                      ))}
                  </ul>
                  {sharedAppConflicts.length > SHARED_APP_CONFLICTS_DISPLAY_MAX ? (
                    <p className="mt-1 pl-4 font-medium text-red-800">
                      +{sharedAppConflicts.length - SHARED_APP_CONFLICTS_DISPLAY_MAX} more
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div ref={scrollContainerRef} className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
                  <TableHeader>
                    <TableRow className="h-10 bg-slate-50/95 hover:bg-slate-50/95">
                      <TableHead
                        rowSpan={3}
                        className="sticky left-0 top-0 z-50 min-w-[280px] border-r bg-slate-50 align-bottom shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]"
                      >
                      </TableHead>
                      {months.map((month) => (
                        <TableHead
                          key={month}
                          colSpan={colsPerMonth}
                          className="sticky top-0 z-40 border-b border-r border-slate-200 bg-slate-50/95 text-center text-xs font-semibold text-slate-700"
                        >
                          {formatMonthLabel(month)}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="h-8 bg-slate-50/95 hover:bg-slate-50/95">
                      {months.map((month) =>
                        visibleMetrics.map((metric, metricIndex) => {
                          const isLastMetricInMonth = metricIndex === visibleMetrics.length - 1
                          const metricStyle = METRIC_TABLE_STYLES[metric.id]
                          return (
                            <TableHead
                              key={`${month}-${metric.id}-group`}
                              colSpan={visibleParameters.length}
                              className={cn(
                                "sticky top-10 z-40 border-t border-b border-l border-slate-200 text-center text-xs font-semibold",
                                metricStyle.header,
                                metricStyle.border,
                                metricColumnEndBorder(metric.id, true, isLastMetricInMonth),
                                "bg-slate-50/95",
                              )}
                            >
                              {metric.label}
                            </TableHead>
                          )
                        }),
                      )}
                    </TableRow>
                    <TableRow className="h-8 bg-slate-50/95 hover:bg-slate-50/95">
                      {months.map((month) =>
                        visibleMetrics.map((metric, metricIndex) => {
                          const isLastMetricInMonth = metricIndex === visibleMetrics.length - 1
                          const metricStyle = METRIC_TABLE_STYLES[metric.id]
                          return (
                            <Fragment key={`${month}-${metric.id}-subheads`}>
                              {visibleParameters.map((parameter, parameterIndex) => {
                                const isLastParameterInMetric =
                                  parameterIndex === visibleParameters.length - 1
                                const isFirstParameter = parameterIndex === 0
                                const minWidth =
                                  parameter.id === "percent" ? "min-w-[56px]" : "min-w-[80px]"
                                return (
                                  <TableHead
                                    key={`${month}-${metric.id}-${parameter.id}`}
                                    className={cn(
                                      minWidth,
                                      "sticky top-[72px] z-40 text-right text-xs font-medium",
                                      PARAMETER_SIDEBAR_STYLES.header,
                                      isFirstParameter ? cn("border-l", metricStyle.border) : "",
                                      metricColumnEndBorder(
                                        metric.id,
                                        isLastParameterInMetric,
                                        isLastMetricInMonth,
                                      ),
                                      "bg-slate-50/95",
                                    )}
                                  >
                                    {parameter.label}
                                  </TableHead>
                                )
                              })}
                            </Fragment>
                          )
                        }),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => {
                      const appsCache = teamAppsCache[team.teamId]
                      const appCount = getTeamAppCount(team, appsCache)
                      const firstPageApps = appsCache?.pages[1] ?? []
                      const appLoadError = appsCache?.error ?? null
                      const canExpand = firstPageApps.length > 0 || Boolean(appLoadError)
                      const expanded = expandedTeamIds.has(team.teamId)
                      const appPage = teamAppPageByTeamId[team.teamId] ?? 1
                      const totalAppPages = Math.max(1, appsCache?.totalAppPages ?? Math.ceil(appCount / APPS_PER_PAGE))
                      const safeAppPage = Math.min(appPage, totalAppPages)
                      const paginatedApps = appsCache?.pages[safeAppPage] ?? []
                      const appsLoading = expanded && (appsCache?.loading ?? false) && paginatedApps.length === 0

                      return (
                        <Fragment key={team.teamId}>
                          <TableRow className="hover:bg-slate-50/60">
                            <TableCell className="sticky left-0 z-20 min-w-[280px] border-r bg-white py-2 font-semibold text-slate-900 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]">
                              <div className="flex items-center gap-1">
                                {canExpand ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => toggleTeamExpanded(team.teamId)}
                                    aria-expanded={expanded}
                                    aria-label={
                                      expanded
                                        ? `Collapse apps for ${team.teamName}`
                                        : `Expand apps for ${team.teamName}`
                                    }
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                ) : (
                                  <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
                                )}
                                <span>{team.teamName}</span>
                              </div>
                            </TableCell>
                            <OverviewMonthCells
                              monthKeys={months}
                              months={team.months}
                              selectedMetrics={visibleMetrics.map((m) => m.id)}
                              selectedParameters={visibleParameters.map((p) => p.id)}
                            />
                          </TableRow>
                          {expanded && appsLoading ? (
                            <TableRow className="bg-slate-50/40 hover:bg-slate-50/60">
                              <TableCell className="sticky left-0 z-20 min-w-[280px] border-r bg-slate-50 py-4 pl-10 text-sm text-slate-500 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]">
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading apps…
                                </span>
                              </TableCell>
                              {months.map((month) =>
                                visibleMetrics.map((metric, metricIndex) => {
                                  const isLastMetricInMonth = metricIndex === visibleMetrics.length - 1
                                  const metricStyle = METRIC_TABLE_STYLES[metric.id]
                                  return (
                                    <TableCell
                                      key={`${team.teamId}-loading-${month}-${metric.id}`}
                                      colSpan={visibleParameters.length}
                                      className={cn(
                                        "border-l",
                                        metricStyle.cellSubtle,
                                        metricStyle.border,
                                        metricColumnEndBorder(metric.id, true, isLastMetricInMonth),
                                      )}
                                    />
                                  )
                                }),
                              )}
                            </TableRow>
                          ) : null}
                          {expanded && appLoadError ? (
                            <TableRow className="bg-red-50/40 hover:bg-red-50/60">
                              <TableCell className="sticky left-0 z-20 min-w-[280px] border-r bg-red-50 py-4 pl-10 text-sm text-red-700 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]">
                                Error loading apps: {appLoadError}
                              </TableCell>
                              {months.map((month) =>
                                visibleMetrics.map((metric, metricIndex) => {
                                  const isLastMetricInMonth = metricIndex === visibleMetrics.length - 1
                                  const metricStyle = METRIC_TABLE_STYLES[metric.id]
                                  return (
                                    <TableCell
                                      key={`${team.teamId}-error-${month}-${metric.id}`}
                                      colSpan={visibleParameters.length}
                                      className={cn(
                                        "border-l",
                                        metricStyle.cellSubtle,
                                        metricStyle.border,
                                        metricColumnEndBorder(metric.id, true, isLastMetricInMonth),
                                      )}
                                    />
                                  )
                                }),
                              )}
                            </TableRow>
                          ) : null}
                          {expanded &&
                            !appLoadError &&
                            !appsLoading &&
                            paginatedApps.map((app: ProfitOverviewAppRow) => (
                              <TableRow
                                key={`${team.teamId}-${app.appId}`}
                                className="bg-slate-50/40 hover:bg-slate-50/60"
                              >
                                <TableCell className="sticky left-0 z-20 min-w-[280px] border-r bg-slate-50 py-2 pl-10 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]">
                                  <div className="flex min-w-0 items-center justify-between gap-3">
                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                      <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                        {app.appIconUri ? (
                                          <AvatarImage
                                            src={app.appIconUri}
                                            alt={app.appLabel}
                                            className="rounded-lg object-cover"
                                          />
                                        ) : null}
                                        <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
                                          {app.appLabel?.trim()?.slice(0, 1)?.toUpperCase() || "A"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-900">
                                          {app.appLabel}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">
                                          <span className="font-mono" title={app.appStoreId ?? undefined}>
                                            {formatAppStoreId(app.appStoreId)}
                                          </span>
                                          {app.appStoreId ? (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="ml-1 inline-flex h-5 w-5 align-middle text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                              aria-label={`Copy App Store ID for ${app.appLabel}`}
                                              onClick={() => void copyAppStoreId(app.appStoreId)}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {renderPlatformBadge(app.appPlatform ?? "")}
                                    </div>
                                  </div>
                                </TableCell>
                                <OverviewMonthCells
                                  monthKeys={months}
                                  months={getAppMonthsFiltered(app.months, team.months, months)}
                                  selectedMetrics={visibleMetrics.map((m) => m.id)}
                                  selectedParameters={visibleParameters.map((p) => p.id)}
                                  rowVariant="app"
                                />
                              </TableRow>
                            ))}
                          {expanded && !appLoadError && appCount > APPS_PER_PAGE ? (
                            <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                              <TableCell className="sticky left-0 z-20 border-r bg-slate-50 py-2 pl-12 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]">
                                <TeamAppsPager
                                  currentPage={safeAppPage}
                                  totalPages={totalAppPages}
                                  totalItems={appCount}
                                  onPageChange={(page) => setTeamAppPage(team.teamId, page)}
                                />
                              </TableCell>
                              {months.map((month) =>
                                visibleMetrics.map((metric, metricIndex) => {
                                  const isLastMetricInMonth = metricIndex === visibleMetrics.length - 1
                                  const metricStyle = METRIC_TABLE_STYLES[metric.id]
                                  return (
                                    <TableCell
                                      key={`${team.teamId}-pager-${month}-${metric.id}`}
                                      colSpan={visibleParameters.length}
                                      className={cn(
                                        "border-l",
                                        metricStyle.cellSubtle,
                                        metricStyle.border,
                                        metricColumnEndBorder(metric.id, true, isLastMetricInMonth),
                                      )}
                                    />
                                  )
                                }),
                              )}
                            </TableRow>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-[320px] flex-col border-slate-200 xl:min-h-0">
            <CardHeader
              className={cn(
                "border-b border-slate-100",
                metricsCollapsed ? "p-2" : "pb-3",
              )}
            >
              <div
                className={cn(
                  "flex w-full items-center gap-2",
                  metricsCollapsed ? "justify-center" : "justify-between",
                )}
              >
                {metricsCollapsed ? null : <CardTitle className="text-base font-medium">Metrics</CardTitle>}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMetricsCollapsed((prev) => !prev)}
                  aria-label={metricsCollapsed ? "Expand metrics panel" : "Collapse metrics panel"}
                  aria-expanded={!metricsCollapsed}
                >
                  {metricsCollapsed ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {metricsCollapsed ? null : (
                <CardDescription>
                  Toggle metrics and parameters; drag selected items to reorder columns
                </CardDescription>
              )}
            </CardHeader>

            {metricsCollapsed ? (
              <CardContent className="flex flex-1 items-center justify-center p-2">
                <div
                  className={cn(
                    "select-none text-xs font-semibold uppercase tracking-wider text-slate-600",
                    "[writing-mode:vertical-rl] [text-orientation:mixed]",
                  )}
                >
                  Metrics
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="max-h-[min(70vh,640px)] flex-1">
                  <div className="space-y-1 p-4">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                      Metrics ({visibleMetrics.length})
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleMetricDragEnd}
                    >
                      <SortableContext items={metricOrder} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                          {metricOrder.map((metricId) => {
                            const metric = OVERVIEW_METRICS.find((item) => item.id === metricId)
                            if (!metric) return null
                            return (
                              <SortableOverviewMetricItem
                                key={metric.id}
                                id={metric.id}
                                label={metric.label}
                                selected={selectedMetrics.includes(metric.id)}
                                onToggle={toggleMetric}
                              />
                            )
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <div className="my-4 border-t border-slate-100" />

                    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-emerald-700">
                      Parameters ({visibleParameters.length})
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleParameterDragEnd}
                    >
                      <SortableContext items={parameterOrder} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                          {parameterOrder.map((parameterId) => {
                            const parameter = OVERVIEW_PARAMETERS.find((item) => item.id === parameterId)
                            if (!parameter) return null
                            return (
                              <SortableOverviewParameterItem
                                key={parameter.id}
                                id={parameter.id}
                                label={parameter.label}
                                selected={selectedParameters.includes(parameter.id)}
                                onToggle={toggleParameter}
                              />
                            )
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
