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
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Filter, GripVertical, Info, Loader2, RefreshCw, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { cn, copyTextToClipboard } from "@/lib/utils"
import {
  getActualProfitClass,
  getNetProfitMargin,
  getNetProfitMarginClass,
  getPercentClass,
} from "@/lib/metrics/profit-metric-styles"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { authApi, reportsApi, type OrgTeamGroup } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { useDraggableVerticalFixed } from "@/hooks/use-draggable-vertical-fixed"
import { useIsMobile } from "@/hooks/use-mobile"
import { loadScopedCommissionTeams } from "@/lib/reports/scoped-commission-teams"
import {
  DEFAULT_OVERVIEW_COLUMNS,
  OVERVIEW_COLUMNS,
  type OverviewColumnGroup,
  type OverviewColumnId,
} from "@/lib/reports/overview-column-config"
import type {
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
const OVERVIEW_MOBILE_FILTERS_STICKER_TOP_KEY = "overview-report-mobile-filters-sticker-top-v1"
const SHARED_APP_CONFLICTS_DISPLAY_MAX = 5

/** Sticky offsets — khớp h-10 (40px) + h-8 (32px) + h-8 (32px); TableHead mặc định h-10 phải override ở row 2–3. */
const OVERVIEW_STICKY_HEADER_ROW_2_TOP = "top-10"
const OVERVIEW_STICKY_HEADER_ROW_3_TOP = "top-[4.5rem]"
const OVERVIEW_STICKY_TOTAL_ROW_CLASS =
  "sticky top-[6.5rem] z-[35] bg-muted shadow-[0_4px_6px_-2px_rgba(15,23,42,0.12)]"
const OVERVIEW_STICKY_TOTAL_ROW_CELL_CLASS = "!h-10 min-h-10 max-h-10 py-0 box-border align-middle"
const OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS = "!h-8 min-h-8 max-h-8 py-0.5 box-border align-middle"

const OVERVIEW_COLUMN_STYLES: Record<
  OverviewColumnGroup,
  {
    sidebarSelected: string
    sidebarAccent: string
    sidebarCheckbox: string
    groupHeader: string
    header: string
    cell: string
    cellSubtle: string
    border: string
  }
> = {
  revenue: {
    sidebarSelected: "bg-sky-50 text-sky-900",
    sidebarAccent: "bg-sky-500",
    sidebarCheckbox: "border-sky-600 bg-sky-600",
    groupHeader: "bg-sky-50/80 text-sky-700",
    header: "bg-sky-50 text-sky-900",
    cell: "bg-sky-50/35",
    cellSubtle: "bg-sky-50/55",
    border: "border-sky-200",
  },
  performance: {
    sidebarSelected: "bg-emerald-50 text-emerald-900",
    sidebarAccent: "bg-emerald-500",
    sidebarCheckbox: "border-emerald-600 bg-emerald-600",
    groupHeader: "bg-emerald-50/80 text-emerald-700",
    header: "bg-emerald-50 text-emerald-900",
    cell: "bg-emerald-50/35",
    cellSubtle: "bg-emerald-50/55",
    border: "border-emerald-200",
  },
}

function formatNetProfitMarginDisplay(margin: number | null): string {
  if (margin == null) return "—"
  return `${Math.round(margin)}%`
}

function renderOverviewColumnContent(
  cell: ProfitOverviewMonthCell,
  columnId: OverviewColumnId,
): string {
  switch (columnId) {
    case "revenuePlan":
      return formatCurrency(cell.revenue.plan)
    case "revenueActual":
      return formatCurrency(cell.revenue.actual)
    case "revenuePercent":
      return formatPercent(cell.revenue.completionPercent)
    case "actualCost":
      return formatCurrency(cell.cost.actual)
    case "actualProfit":
      return formatCurrency(cell.profit.actual)
    case "netProfitMargin":
      return formatNetProfitMarginDisplay(
        getNetProfitMargin(cell.profit.actual, cell.revenue.actual),
      )
    default:
      return "—"
  }
}

function overviewColumnCellClassName(
  columnId: OverviewColumnId,
  cell: ProfitOverviewMonthCell,
): string {
  if (columnId === "revenuePercent") return getPercentClass(cell.revenue.completionPercent)
  if (columnId === "actualProfit") return getActualProfitClass(cell.profit.actual)
  if (columnId === "netProfitMargin") {
    return getNetProfitMarginClass(getNetProfitMargin(cell.profit.actual, cell.revenue.actual))
  }
  return "text-foreground"
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

function normalizeOverviewAppDedupeKey(app: ProfitOverviewAppRow): string {
  const storeId = app.appStoreId?.trim()
  if (storeId) return storeId.toLowerCase()
  return app.appId.trim().toLowerCase()
}

/** Mỗi app một lần (theo app_store_id / app_id) từ cache apps đã load của các team trong bảng. */
function collectDistinctDisplayedApps(
  teams: ProfitOverviewTeamRow[],
  teamAppsCache: Record<string, TeamAppsCacheEntry>,
): ProfitOverviewAppRow[] {
  const byKey = new Map<string, ProfitOverviewAppRow>()
  for (const team of teams) {
    const cache = teamAppsCache[team.teamId]
    if (!cache?.pages) continue
    for (const pageApps of Object.values(cache.pages)) {
      for (const app of pageApps) {
        const key = normalizeOverviewAppDedupeKey(app)
        if (!key || byKey.has(key)) continue
        byKey.set(key, app)
      }
    }
  }
  return Array.from(byKey.values())
}

async function prefetchAllTeamApps(
  teams: ProfitOverviewTeamRow[],
  loadPage: (teamId: string, page: number) => Promise<{ totalAppPages: number } | void>,
  concurrency = 3,
) {
  if (teams.length === 0) return

  let index = 0
  const worker = async () => {
    while (index < teams.length) {
      const team = teams[index]
      index += 1
      const first = await loadPage(team.teamId, 1)
      const totalPages = Math.max(1, first?.totalAppPages ?? 1)
      for (let page = 2; page <= totalPages; page += 1) {
        await loadPage(team.teamId, page)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, teams.length) }, () => worker()),
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
          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
          : "border-border bg-muted/50 text-foreground",
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

function sumNullableNumbers(values: (number | null | undefined)[]): number | null {
  const numbers = values
    .filter((value): value is number => value != null && Number.isFinite(Number(value)))
    .map(Number)
  if (numbers.length === 0) return null
  return numbers.reduce((sum, value) => sum + value, 0)
}

function aggregateMonthCells(cells: ProfitOverviewMonthCell[]): ProfitOverviewMonthCell {
  const revenuePlan = sumNullableNumbers(cells.map((cell) => cell.revenue.plan))
  const revenueActual = sumNullableNumbers(cells.map((cell) => cell.revenue.actual))
  const costActual = sumNullableNumbers(cells.map((cell) => cell.cost.actual))
  const profitActual = sumNullableNumbers(cells.map((cell) => cell.profit.actual))
  const completionPercent =
    revenuePlan != null && revenuePlan > 0 && revenueActual != null
      ? Math.round((revenueActual / revenuePlan) * 10000) / 100
      : null

  return {
    revenue: { plan: revenuePlan, actual: revenueActual, completionPercent },
    cost: { plan: null, actual: costActual, completionPercent: null },
    profit: { plan: null, actual: profitActual, completionPercent: null },
  }
}

function aggregateMonthsRecord(
  months: Record<string, ProfitOverviewMonthCell>,
  monthKeys: string[],
): ProfitOverviewMonthCell {
  return aggregateMonthCells(monthKeys.map((monthKey) => getMonthCell(months, monthKey)))
}

function buildColumnTotalsByMonth(
  monthKeys: string[],
  rows: Array<{ months: Record<string, ProfitOverviewMonthCell> }>,
): Record<string, ProfitOverviewMonthCell> {
  const result: Record<string, ProfitOverviewMonthCell> = {}
  for (const monthKey of monthKeys) {
    result[monthKey] = aggregateMonthCells(
      rows.map((row) => getMonthCell(row.months, monthKey)),
    )
  }
  return result
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
      <span className="shrink-0 text-muted-foreground">
        Apps <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
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
        <span className="tabular-nums text-muted-foreground">
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
  visibleColumns,
  rowVariant = "team",
  trailingCell,
  stickyTotalRowClass,
  asHeader = false,
}: {
  months: Record<string, ProfitOverviewMonthCell>
  monthKeys: string[]
  visibleColumns: (typeof OVERVIEW_COLUMNS)[number][]
  rowVariant?: "team" | "app" | "total"
  trailingCell?: ProfitOverviewMonthCell | null
  stickyTotalRowClass?: string
  asHeader?: boolean
}) {
  const CellComponent = asHeader ? TableHead : TableCell

  const renderCellGroup = (
    groupKey: string,
    cell: ProfitOverviewMonthCell,
    options?: { isTrailingTotal?: boolean },
  ) => (
    <Fragment key={groupKey}>
      {visibleColumns.map((column, columnIndex) => {
        const columnStyle = OVERVIEW_COLUMN_STYLES[column.group]
        const bgClass =
          rowVariant === "app"
            ? columnStyle.cellSubtle
            : rowVariant === "total"
              ? "bg-muted"
              : columnStyle.cell
        const isFirstColumn = columnIndex === 0
        const isLastColumnInGroup = columnIndex === visibleColumns.length - 1
        const isTrailingTotal = options?.isTrailingTotal ?? false
        const stickyTotalRow =
          rowVariant === "total" && stickyTotalRowClass
            ? cn(stickyTotalRowClass, OVERVIEW_STICKY_TOTAL_ROW_CELL_CLASS)
            : ""
        return (
          <CellComponent
            key={`${groupKey}-${column.id}`}
            className={cn(
              column.minWidthClass,
              "text-right text-sm tabular-nums",
              stickyTotalRow,
              isFirstColumn
                ? cn("border-l", isTrailingTotal ? "border-l-2 border-border" : columnStyle.border)
                : "",
              isLastColumnInGroup ? "border-r-2 border-border" : cn("border-r", columnStyle.border),
              bgClass,
              rowVariant === "total" ? "font-semibold" : "",
              overviewColumnCellClassName(column.id, cell),
            )}
          >
            {renderOverviewColumnContent(cell, column.id)}
          </CellComponent>
        )
      })}
    </Fragment>
  )

  return (
    <>
      {monthKeys.map((month) => renderCellGroup(month, getMonthCell(months, month)))}
      {trailingCell ? renderCellGroup("row-total", trailingCell, { isTrailingTotal: true }) : null}
    </>
  )
}

function SortableOverviewColumnItem({
  id,
  label,
  group,
  selected,
  onToggle,
}: {
  id: OverviewColumnId
  label: string
  group: OverviewColumnGroup
  selected: boolean
  onToggle: (id: OverviewColumnId) => void
}) {
  const groupStyle = OVERVIEW_COLUMN_STYLES[group]
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
        selected ? groupStyle.sidebarSelected : "text-foreground hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground",
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
          "h-5 w-1 shrink-0 rounded-full",
          selected ? groupStyle.sidebarAccent : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? cn(groupStyle.sidebarCheckbox, "text-primary-foreground") : "border-border bg-card",
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
  const canManageCommission = hasScreenFunction("s-commission", "manage")
  const storedCurrentUser = getCurrentUser()
  const { data: currentUserResponse } = useApi(
    () => authApi.getCurrentUser(),
    { cacheKey: `overview_report_current_user_${storedCurrentUser?.id ?? "anonymous"}` },
  )
  const currentUser = currentUserResponse?.data ?? storedCurrentUser
  const orgId = currentUser?.organization?.id
  const currentUserTeamIds = (currentUser?.teams ?? storedCurrentUser?.teams ?? [])
    .map((team) => team.id)
    .filter(Boolean)
  const currentUserTeamIdsKey = [...currentUserTeamIds].sort().join("|")

  const defaultRange = useMemo(() => currentYearRange(), [])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [teamsFilterInitialized, setTeamsFilterInitialized] = useState(false)
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
  const [columnOrder, setColumnOrder] = useState<OverviewColumnId[]>(DEFAULT_OVERVIEW_COLUMNS)
  const [selectedColumns, setSelectedColumns] = useState<OverviewColumnId[]>(DEFAULT_OVERVIEW_COLUMNS)
  const [metricsCollapsed, setMetricsCollapsed] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const isMobile = useIsMobile()
  const {
    containerRef: mobileFiltersStickerRef,
    topPx: mobileFiltersStickerTop,
    consumeDragClick: consumeMobileFiltersStickerDragClick,
    dragProps: mobileFiltersStickerDragProps,
  } = useDraggableVerticalFixed(OVERVIEW_MOBILE_FILTERS_STICKER_TOP_KEY)
  const overviewStickyFirstColWidth = isMobile
    ? "min-w-[112px] max-w-[112px] w-[112px]"
    : "min-w-[280px]"
  const overviewStickyNestedRowPadding = isMobile ? "pl-6" : "pl-10"
  const overviewStickyPagerPadding = isMobile ? "pl-7" : "pl-12"

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibleColumns = useMemo(
    () =>
      columnOrder
        .filter((id) => selectedColumns.includes(id))
        .map((id) => OVERVIEW_COLUMNS.find((column) => column.id === id))
        .filter((column): column is (typeof OVERVIEW_COLUMNS)[number] => column != null),
    [columnOrder, selectedColumns],
  )

  const visibleRevenueColumnCount = useMemo(
    () => visibleColumns.filter((column) => column.group === "revenue").length,
    [visibleColumns],
  )

  const visiblePerformanceColumnCount = useMemo(
    () => visibleColumns.filter((column) => column.group === "performance").length,
    [visibleColumns],
  )

  const colsPerMonth = visibleColumns.length

  const hasPendingApply = fromMonth !== appliedFrom || toMonth !== appliedTo
  const selectedColumnsCount = visibleColumns.length

  const toggleColumn = (columnId: OverviewColumnId) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnId)) {
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== columnId)
      }
      return [...prev, columnId]
    })
  }

  const handleColumnDragEndForGroup = (group: OverviewColumnGroup) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id) as OverviewColumnId
    const overId = String(over.id) as OverviewColumnId
    if (!selectedColumns.includes(activeId) || !selectedColumns.includes(overId)) return

    const activeColumn = OVERVIEW_COLUMNS.find((column) => column.id === activeId)
    const overColumn = OVERVIEW_COLUMNS.find((column) => column.id === overId)
    if (activeColumn?.group !== group || overColumn?.group !== group) return

    setColumnOrder((prev) => {
      const groupIds = prev.filter(
        (id) => OVERVIEW_COLUMNS.find((column) => column.id === id)?.group === group,
      )
      const otherIds = prev.filter(
        (id) => OVERVIEW_COLUMNS.find((column) => column.id === id)?.group !== group,
      )
      const oldIndex = groupIds.indexOf(activeId)
      const newIndex = groupIds.indexOf(overId)
      if (oldIndex < 0 || newIndex < 0) return prev
      const reorderedGroup = arrayMove(groupIds, oldIndex, newIndex)
      return group === "revenue" ? [...reorderedGroup, ...otherIds] : [...otherIds, ...reorderedGroup]
    })
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(current - index))
  }, [])

  const selectYearValue = resolveYearInOptions(selectedYear, yearOptions)

  const canScopeManagedTeams = canManageCommission || filterTeams.length > 0

  const resolveTeamIdsForApi = useCallback(
    (teamIds: string[]) => {
      if (teamIds.length > 0) return teamIds
      if (canScopeManagedTeams && filterTeams.length > 0) {
        return filterTeams.map((team) => team.teamId)
      }
      return teamIds
    },
    [canScopeManagedTeams, filterTeams],
  )

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
        return { totalAppPages: response.totalAppPages }
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
        return undefined
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
        const teamIds = resolveTeamIdsForApi(teamIdsOverride ?? selectedTeamIds)
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

        void prefetchAllTeamApps(
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
    [appliedFrom, appliedTo, selectedTeamIds, filterTeams, loadTeamApps, resolveTeamIdsForApi],
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
  }, [orgId, currentUser?.id, currentUser?.email, currentUserTeamIdsKey])

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

  const handleApplyFilters = async () => {
    await applyRange()
    if (isMobile) {
      setMobileFiltersOpen(false)
    }
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

  const distinctDisplayedApps = useMemo(
    () => collectDistinctDisplayedApps(teams, teamAppsCache),
    [teams, teamAppsCache],
  )
  const distinctDisplayedAppCount = distinctDisplayedApps.length

  const columnTotalsByMonth = useMemo(
    () => buildColumnTotalsByMonth(months, distinctDisplayedApps),
    [months, distinctDisplayedApps],
  )

  const grandTotalCell = useMemo(
    () => aggregateMonthCells(months.map((month) => columnTotalsByMonth[month])),
    [columnTotalsByMonth, months],
  )

  const [copiedAppStoreKey, setCopiedAppStoreKey] = useState<string | null>(null)
  const copiedAppStoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sharedAppWarningDismissed, setSharedAppWarningDismissed] = useState(false)
  const [sharedAppWarningCountdown, setSharedAppWarningCountdown] = useState(10)

  useEffect(() => {
    return () => {
      if (copiedAppStoreTimeoutRef.current) {
        clearTimeout(copiedAppStoreTimeoutRef.current)
      }
    }
  }, [])

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

  const copyAppStoreId = async (copyKey: string, appStoreId: string | null | undefined) => {
    const value = appStoreId?.trim()
    if (!value) return

    const copied = await copyTextToClipboard(value)
    if (copied) {
      if (copiedAppStoreTimeoutRef.current) {
        clearTimeout(copiedAppStoreTimeoutRef.current)
      }
      setCopiedAppStoreKey(copyKey)
      copiedAppStoreTimeoutRef.current = setTimeout(() => {
        setCopiedAppStoreKey(null)
        copiedAppStoreTimeoutRef.current = null
      }, 2000)
    } else {
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

  const renderOverviewFilterFields = () => (
    <>
      <div className="space-y-1">
        <Label htmlFor="overview-year" className="text-xs">
          Year
        </Label>
        <Select value={selectYearValue} onValueChange={handleYearChange}>
          <SelectTrigger id="overview-year" className={cn("h-9", isMobile ? "w-full" : "w-[120px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(isMobile && "z-[100]")}>
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
          className={cn("h-9", isMobile ? "w-full" : "w-[160px]")}
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
          className={cn("h-9", isMobile ? "w-full" : "w-[160px]")}
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
          placeholder={canScopeManagedTeams ? "Teams in your scope" : "All teams"}
          searchPlaceholder="Search teams..."
          emptySearchMessage="No teams found."
          emptyTeamsMessage="No teams found."
          triggerClassName={cn(
            "h-9 min-h-9",
            isMobile ? "w-full max-w-none" : "w-[200px] max-w-[200px]",
          )}
          popoverClassName={cn("w-[320px] p-0", isMobile && "z-[100]")}
          popoverModal={isMobile ? false : undefined}
        />
      </div>
    </>
  )

  const renderOverviewFilterActions = (mobileLayout = false) => (
    <>
      <Button
        type="button"
        className={cn("h-9 bg-primary hover:bg-primary/90", mobileLayout && "flex-1")}
        disabled={loading}
        onClick={() => void (mobileLayout ? handleApplyFilters() : applyRange())}
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
    </>
  )

  const renderOverviewFiltersBody = () => (
    <div
      className={cn(
        "gap-3 [&_label]:leading-none",
        isMobile ? "flex flex-col" : "flex flex-wrap items-end",
      )}
    >
      {renderOverviewFilterFields()}
      {renderOverviewFilterActions(isMobile)}
    </div>
  )

  const renderOverviewMobileFiltersAndMetricsBody = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 [&_label]:leading-none">{renderOverviewFilterFields()}</div>
      <div className="border-t border-border pt-4">{renderOverviewMetricsBody("px-0 py-0")}</div>
      <div className="flex gap-2 border-t border-border pt-4">{renderOverviewFilterActions(true)}</div>
    </div>
  )

  const renderOverviewMetricsBody = (className?: string) => {
    const groups: OverviewColumnGroup[] = ["revenue", "performance"]

    return (
      <div className={cn("space-y-4", className ?? "p-4")}>
        {groups.map((group, groupIndex) => {
          const groupColumnOrder = columnOrder.filter(
            (id) => OVERVIEW_COLUMNS.find((column) => column.id === id)?.group === group,
          )
          const visibleInGroup = groupColumnOrder.filter((id) => selectedColumns.includes(id)).length
          const groupLabel = group === "revenue" ? "Revenue" : "Performance"
          const groupHeadingClass =
            group === "revenue"
              ? "text-sky-700"
              : "text-emerald-700"

          return (
            <div key={group} className="space-y-1">
              {groupIndex > 0 ? <div className="mb-4 border-t border-border pt-4" /> : null}
              <div
                className={cn(
                  "mb-3 text-xs font-medium uppercase tracking-wider",
                  groupHeadingClass,
                )}
              >
                {groupLabel} ({visibleInGroup})
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEndForGroup(group)}
              >
                <SortableContext items={groupColumnOrder} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {groupColumnOrder.map((columnId) => {
                      const column = OVERVIEW_COLUMNS.find((item) => item.id === columnId)
                      if (!column) return null
                      return (
                        <SortableOverviewColumnItem
                          key={column.id}
                          id={column.id}
                          label={column.label}
                          group={column.group}
                          selected={selectedColumns.includes(column.id)}
                          onToggle={toggleColumn}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="gap-0 overflow-hidden border-border py-0 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5 [.border-b]:pb-2.5">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">Overview Report</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              KPI plan vs actual by team (revenue, cost, profit). Expand a team for per-app detail.
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 border-border bg-card text-foreground shadow-sm hover:border-border hover:bg-muted hover:text-foreground",
                  isMobile && "hidden",
                )}
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
        {!isMobile && filterExpanded ? (
          <CardContent className="flex flex-wrap items-end gap-3 px-4 py-3 [&_label]:leading-none">
            {renderOverviewFiltersBody()}
          </CardContent>
        ) : null}
      </Card>

      {isMobile ? (
        <>
          <div
            ref={mobileFiltersStickerRef}
            className="fixed right-0 z-40 flex touch-none flex-col items-end gap-2"
            style={
              mobileFiltersStickerTop == null
                ? { top: "50%", transform: "translateY(-50%)" }
                : { top: mobileFiltersStickerTop }
            }
          >
            <button
              type="button"
              {...mobileFiltersStickerDragProps}
              onClick={() => {
                if (consumeMobileFiltersStickerDragClick()) return
                setMobileFiltersOpen(true)
              }}
              className={cn(
                "flex cursor-grab flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-card px-1.5 py-3 shadow-lg active:cursor-grabbing",
                hasPendingApply && "ring-2 ring-blue-300",
              )}
              aria-label="Open filters and metrics. Drag up or down to reposition."
            >
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ writingMode: "vertical-rl" }}
              >
                Filters & Metrics
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
                <SheetTitle className="text-base">Filters & Metrics</SheetTitle>
                <SheetDescription>
                  Period, teams, and columns. Click Apply to refresh data.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                <div className="box-border min-w-0 max-w-full overflow-x-hidden p-4">
                  {renderOverviewMobileFiltersAndMetricsBody()}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data === null ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a period and click <span className="font-medium text-foreground">Apply</span> to load the
            overview report.
          </CardContent>
        </Card>
      ) : allTeams.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No teams available for this period.
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No teams match the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            !isMobile && (metricsCollapsed ? "xl:grid-cols-[1fr_3.5rem]" : "xl:grid-cols-[1fr_18rem]"),
          )}
        >
          <Card className="overflow-hidden border-border">
            <CardContent className="p-0">
              <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                Last update at:{" "}
                {data?.lastUpdatedAt ? (
                  <span className="text-muted-foreground">{formatLastUpdatedAt(data.lastUpdatedAt)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
              {sharedAppConflicts.length > 0 && !sharedAppWarningDismissed ? (
                <div
                  className="relative border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-700 dark:text-red-300"
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
                      className="h-7 w-7 text-red-700 hover:bg-red-500/20 hover:text-red-700 dark:text-red-300"
                      aria-label="Dismiss warning"
                      onClick={() => setSharedAppWarningDismissed(true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="pr-36 font-semibold text-red-700 dark:text-red-300">
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
                    <p className="mt-1 pl-4 font-medium text-red-700 dark:text-red-300">
                      +{sharedAppConflicts.length - SHARED_APP_CONFLICTS_DISPLAY_MAX} more
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div ref={scrollContainerRef} className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
                  <TableHeader>
                    <TableRow className="h-10 bg-muted/95 hover:bg-muted/95">
                      <TableHead
                        rowSpan={4}
                        className={cn(
                          "sticky left-0 top-0 z-50 border-r bg-muted/50 align-bottom px-2 pb-2 font-bold text-foreground shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]",
                          overviewStickyFirstColWidth,
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span>Total</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                  aria-label="How the Total row is calculated"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs text-xs leading-snug">
                                Tổng theo mỗi app một lần (distinct app_store_id) trong các team
                                được chọn — không cộng trùng khi cùng app xuất hiện ở nhiều team.
                                Hiện có {distinctDisplayedAppCount} app distinct trong tổng số liệu.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <span className="text-xs font-normal tabular-nums text-muted-foreground">
                            {distinctDisplayedAppCount} app distinct
                          </span>
                        </div>
                      </TableHead>
                      {months.map((month) => (
                        <TableHead
                          key={month}
                          colSpan={colsPerMonth}
                          className="sticky top-0 z-40 !h-10 border-b border-r border-border bg-muted/50 text-center text-xs font-semibold text-foreground"
                        >
                          {formatMonthLabel(month)}
                        </TableHead>
                      ))}
                      <TableHead
                        colSpan={colsPerMonth}
                        className="sticky top-0 z-40 !h-10 border-b border-l-2 border-r border-border bg-muted text-center text-xs font-semibold text-foreground"
                      >
                        Total
                      </TableHead>
                    </TableRow>
                    <TableRow className="h-8 bg-muted/95 hover:bg-muted/95">
                      {months.map((month) => (
                        <Fragment key={`${month}-groups`}>
                          {visibleRevenueColumnCount > 0 ? (
                            <TableHead
                              colSpan={visibleRevenueColumnCount}
                              className={cn(
                                "sticky z-40 border-b border-r border-l border-border text-center text-xs font-semibold",
                                OVERVIEW_STICKY_HEADER_ROW_2_TOP,
                                OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                                OVERVIEW_COLUMN_STYLES.revenue.groupHeader,
                                "bg-muted/50",
                              )}
                            >
                              Revenue
                            </TableHead>
                          ) : null}
                          {visiblePerformanceColumnCount > 0 ? (
                            <TableHead
                              colSpan={visiblePerformanceColumnCount}
                              className={cn(
                                "sticky z-40 border-b border-r border-border text-center text-xs font-semibold",
                                OVERVIEW_STICKY_HEADER_ROW_2_TOP,
                                OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                                OVERVIEW_COLUMN_STYLES.performance.groupHeader,
                                "bg-muted/50",
                              )}
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
                            className={cn(
                              "sticky z-40 border-b border-r border-l-2 border-border text-center text-xs font-semibold",
                              OVERVIEW_STICKY_HEADER_ROW_2_TOP,
                              OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                              OVERVIEW_COLUMN_STYLES.revenue.groupHeader,
                              "bg-muted",
                            )}
                          >
                            Revenue
                          </TableHead>
                        ) : null}
                        {visiblePerformanceColumnCount > 0 ? (
                          <TableHead
                            colSpan={visiblePerformanceColumnCount}
                            className={cn(
                              "sticky z-40 border-b border-r border-border text-center text-xs font-semibold",
                              OVERVIEW_STICKY_HEADER_ROW_2_TOP,
                              OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                              OVERVIEW_COLUMN_STYLES.performance.groupHeader,
                              "bg-muted",
                            )}
                          >
                            Performance
                          </TableHead>
                        ) : null}
                      </Fragment>
                    </TableRow>
                    <TableRow className="h-8 bg-muted/95 hover:bg-muted/95">
                      {months.map((month) => (
                        <Fragment key={`${month}-columns`}>
                          {visibleColumns.map((column, columnIndex) => {
                            const columnStyle = OVERVIEW_COLUMN_STYLES[column.group]
                            const isFirstColumn = columnIndex === 0
                            const isLastColumnInMonth = columnIndex === visibleColumns.length - 1
                            return (
                              <TableHead
                                key={`${month}-${column.id}`}
                                className={cn(
                                  column.minWidthClass,
                                  "sticky z-40 text-right text-xs font-medium",
                                  OVERVIEW_STICKY_HEADER_ROW_3_TOP,
                                  OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                                  columnStyle.header,
                                  isFirstColumn ? cn("border-l", columnStyle.border) : "",
                                  isLastColumnInMonth
                                    ? "border-r-2 border-border"
                                    : cn("border-r", columnStyle.border),
                                  "bg-muted/50",
                                )}
                              >
                                {column.label}
                              </TableHead>
                            )
                          })}
                        </Fragment>
                      ))}
                      <Fragment key="total-columns">
                        {visibleColumns.map((column, columnIndex) => {
                          const columnStyle = OVERVIEW_COLUMN_STYLES[column.group]
                          const isFirstColumn = columnIndex === 0
                          const isLastColumnInGroup = columnIndex === visibleColumns.length - 1
                          return (
                            <TableHead
                              key={`total-${column.id}`}
                              className={cn(
                                column.minWidthClass,
                                "sticky z-40 text-right text-xs font-medium",
                                OVERVIEW_STICKY_HEADER_ROW_3_TOP,
                                OVERVIEW_HEADER_SUB_ROW_HEAD_CLASS,
                                columnStyle.header,
                                isFirstColumn ? "border-l-2 border-border" : "",
                                isLastColumnInGroup
                                  ? "border-r-2 border-border"
                                  : cn("border-r", columnStyle.border),
                                "bg-muted",
                              )}
                            >
                              {column.label}
                            </TableHead>
                          )
                        })}
                      </Fragment>
                    </TableRow>
                    <TableRow className="h-10 bg-muted hover:bg-muted">
                      <OverviewMonthCells
                        monthKeys={months}
                        months={columnTotalsByMonth}
                        visibleColumns={visibleColumns}
                        rowVariant="total"
                        trailingCell={grandTotalCell}
                        stickyTotalRowClass={OVERVIEW_STICKY_TOTAL_ROW_CLASS}
                        asHeader
                      />
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
                          <TableRow className="hover:bg-muted/60">
                            <TableCell
                              className={cn(
                                "sticky left-0 z-20 border-r bg-card py-2 font-semibold text-foreground shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]",
                                overviewStickyFirstColWidth,
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-1">
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
                                <span className="min-w-0 flex-1 truncate" title={team.teamName}>
                                  {team.teamName}
                                </span>
                              </div>
                            </TableCell>
                            <OverviewMonthCells
                              monthKeys={months}
                              months={team.months}
                              visibleColumns={visibleColumns}
                              trailingCell={aggregateMonthsRecord(team.months, months)}
                            />
                          </TableRow>
                          {expanded && appsLoading ? (
                            <TableRow className="bg-muted/40 hover:bg-muted/60">
                              <TableCell
                                className={cn(
                                  "sticky left-0 z-20 border-r bg-muted/50 py-4 text-sm text-muted-foreground shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]",
                                  overviewStickyFirstColWidth,
                                  overviewStickyNestedRowPadding,
                                )}
                              >
                                <span className="inline-flex min-w-0 items-center gap-2 truncate">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading apps…
                                </span>
                              </TableCell>
                              {months.map((month) => (
                                <TableCell
                                  key={`${team.teamId}-loading-${month}`}
                                  colSpan={colsPerMonth}
                                  className="border-l border-r-2 border-border bg-muted/55"
                                />
                              ))}
                              <TableCell
                                colSpan={colsPerMonth}
                                className="border-l-2 border-r-2 border-border bg-muted/55"
                              />
                            </TableRow>
                          ) : null}
                          {expanded && appLoadError ? (
                            <TableRow className="bg-red-500/10 hover:bg-red-500/15">
                              <TableCell
                                className={cn(
                                  "sticky left-0 z-20 border-r bg-red-500/10 py-4 text-sm text-red-700 dark:text-red-300 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]",
                                  overviewStickyFirstColWidth,
                                  overviewStickyNestedRowPadding,
                                )}
                              >
                                <span className="block truncate" title={`Error loading apps: ${appLoadError}`}>
                                  Error loading apps: {appLoadError}
                                </span>
                              </TableCell>
                              {months.map((month) => (
                                <TableCell
                                  key={`${team.teamId}-error-${month}`}
                                  colSpan={colsPerMonth}
                                  className="border-l border-r-2 border-border bg-red-500/10"
                                />
                              ))}
                              <TableCell
                                colSpan={colsPerMonth}
                                className="border-l-2 border-r-2 border-border bg-red-500/10"
                              />
                            </TableRow>
                          ) : null}
                          {expanded &&
                            !appLoadError &&
                            !appsLoading &&
                            paginatedApps.map((app: ProfitOverviewAppRow) => {
                              const appStoreCopyKey = `${team.teamId}:${app.appStoreId ?? app.appId}`
                              const appStoreCopied = copiedAppStoreKey === appStoreCopyKey
                              const filteredAppMonths = getAppMonthsFiltered(app.months, team.months, months)

                              return (
                              <TableRow
                                key={`${team.teamId}-${app.appId}`}
                                className="bg-muted/40 hover:bg-muted/60"
                              >
                                <TableCell
                                  className={cn(
                                    "sticky left-0 z-20 border-r bg-muted/50 py-2 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]",
                                    overviewStickyFirstColWidth,
                                    overviewStickyNestedRowPadding,
                                  )}
                                >
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
                                        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                                          {app.appLabel?.trim()?.slice(0, 1)?.toUpperCase() || "A"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-foreground">
                                          {app.appLabel}
                                        </div>
                                        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                                          <span
                                            className="min-w-0 truncate font-mono"
                                            title={app.appStoreId ?? undefined}
                                          >
                                            {formatAppStoreId(app.appStoreId)}
                                          </span>
                                          {app.appStoreId ? (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                              aria-label={`Copy App Store ID for ${app.appLabel}`}
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                void copyAppStoreId(appStoreCopyKey, app.appStoreId)
                                              }}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          ) : null}
                                          {appStoreCopied ? (
                                            <span className="shrink-0 text-xs font-medium text-green-600">
                                              Copied!
                                            </span>
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
                                  months={filteredAppMonths}
                                  visibleColumns={visibleColumns}
                                  rowVariant="app"
                                  trailingCell={aggregateMonthsRecord(filteredAppMonths, months)}
                                />
                              </TableRow>
                              )
                            })}
                          {expanded && !appLoadError && appCount > APPS_PER_PAGE ? (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell
                                className={cn(
                                  "sticky left-0 z-20 border-r bg-muted/50 py-2 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.16)]",
                                  overviewStickyFirstColWidth,
                                  overviewStickyPagerPadding,
                                )}
                              >
                                <TeamAppsPager
                                  currentPage={safeAppPage}
                                  totalPages={totalAppPages}
                                  totalItems={appCount}
                                  onPageChange={(page) => setTeamAppPage(team.teamId, page)}
                                />
                              </TableCell>
                              {months.map((month) => (
                                <TableCell
                                  key={`${team.teamId}-pager-${month}`}
                                  colSpan={colsPerMonth}
                                  className="border-l border-r-2 border-border bg-muted/55"
                                />
                              ))}
                              <TableCell
                                colSpan={colsPerMonth}
                                className="border-l-2 border-r-2 border-border bg-muted/55"
                              />
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

          <Card className={cn("flex min-h-[320px] flex-col border-border xl:min-h-0", isMobile && "hidden")}>
            <CardHeader
              className={cn(
                "border-b border-border",
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
                  Toggle columns; drag selected items to reorder
                </CardDescription>
              )}
            </CardHeader>

            {metricsCollapsed ? (
              <CardContent className="flex flex-1 items-center justify-center p-2">
                <div
                  className={cn(
                    "select-none text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    "[writing-mode:vertical-rl] [text-orientation:mixed]",
                  )}
                >
                  Metrics
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <ScrollArea className="max-h-[min(70vh,640px)] flex-1">
                  {renderOverviewMetricsBody()}
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
