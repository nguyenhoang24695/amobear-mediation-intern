"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import {
  ArrowUpDown,
  BarChart2,
  ChevronDown,
  Download,
  Filter,
  GripVertical,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  SlidersHorizontal,
  Star,
  Table2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GroupedTeamMultiSelect } from "@/components/reports/grouped-team-multi-select"
import { cn } from "@/lib/utils"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { authApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { useIsMobile } from "@/hooks/use-mobile"
import { useDraggableVerticalFixed } from "@/hooks/use-draggable-vertical-fixed"
import { exportReportTableExcel } from "@/lib/reports/export-report-table"
import {
  MY_REPORT_ADMOB_METRIC_IDS,
  MY_REPORT_DIMENSION_IDS,
  MY_REPORT_SUMMARY_METRIC_IDS,
} from "@/lib/reports/my-report-catalog-groups"
import {
  IAP_REVENUE_MODE_OPTIONS,
  REVENUE_SOURCE_OPTIONS,
} from "@/lib/reports/my-report-defaults"
import {
  formatReportDateRangeLabel,
  REPORT_DATE_PRESETS,
} from "@/lib/reports/report-date-filter-utils"
import {
  applyCustomRangeToDraft,
  applyMonthToDraft,
  applyPresetToDraft,
  resolveMyReportDateRange,
  useMyReportConfig,
} from "@/components/my-reports/hooks/use-my-report-config"
import { useMyReportQuery } from "@/components/my-reports/hooks/use-my-report-query"
import { formatDimensionCell, formatMetricValue } from "@/lib/reports/report-format-utils"
import { loadScopedCommissionTeams } from "@/lib/reports/scoped-commission-teams"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import type { OrgTeamGroup } from "@/lib/api/services"
import type { App } from "@/types/api"

const MY_REPORT_MOBILE_STICKER_KEY = "my-report-mobile-filters-sticker-top-v1"

function SortableMetricItem({
  id,
  label,
  onRemove,
}: {
  id: string
  label: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-2 rounded bg-gray-50 px-2 py-2"
    >
      <button type="button" className="cursor-grab touch-none text-gray-300" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm text-gray-700">{label}</span>
      <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function FilterTag({
  label,
  value,
  showChevron = true,
}: {
  label?: string
  value: string
  showChevron?: boolean
}) {
  return (
    <span className="inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm">
      {label ? <span className="text-gray-600">{label}</span> : null}
      <span className="truncate font-medium text-blue-600">{value}</span>
      {showChevron ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : null}
    </span>
  )
}

function Phase2DisabledButton({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className={cn("cursor-not-allowed opacity-50", className)}
          >
            {children}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming in Phase 2</TooltipContent>
    </Tooltip>
  )
}

export function MyReportsContent() {
  const isMobile = useIsMobile()
  const canExportReports = hasScreenFunction("s-reports", "export-csv")
  const [reportTitle, setReportTitle] = useState("My Report")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTableOpen, setEditTableOpen] = useState(true)
  const [editTab, setEditTab] = useState<"dimensions" | "metrics">("metrics")
  const [metricTab, setMetricTab] = useState<"summary" | "admob">("summary")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)
  const [autoApplied, setAutoApplied] = useState(false)

  const {
    containerRef: mobileStickerRef,
    topPx: mobileStickerTop,
    consumeDragClick: consumeMobileStickerDragClick,
    dragProps: mobileStickerDragProps,
  } = useDraggableVerticalFixed(MY_REPORT_MOBILE_STICKER_KEY)

  const { data: appsResponse, loading: appsLoading } = useApi(() => structureApi.getApps(), {
    cacheKey: "my_reports_apps",
  })
  const availableApps = useMemo(() => {
    const apps = appsResponse?.apps ?? []
    return apps.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

  const storedUser = getCurrentUser()
  const { data: currentUserResponse } = useApi(
    () => authApi.getCurrentUser(),
    { cacheKey: "my_reports_current_user" },
  )
  const currentUser = currentUserResponse?.data ?? storedUser
  const orgId = currentUser?.organization?.id
  const currentUserTeamIds = (currentUser?.teams ?? storedUser?.teams ?? [])
    .map((team) => team.id)
    .filter(Boolean)
  const currentUserTeamIdsKey = [...currentUserTeamIds].sort().join("|")

  const [filterTeams, setFilterTeams] = useState<CommissionTeamOption[]>([])
  const [filterTeamGroups, setFilterTeamGroups] = useState<OrgTeamGroup[]>([])
  const [loadingFilterTeams, setLoadingFilterTeams] = useState(false)

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
        setFilterTeams(teams)
        setFilterTeamGroups(teamGroups)
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

  const catalogDimensionsPlaceholder = useMemo(
    () => MY_REPORT_DIMENSION_IDS.map((id) => ({ id, label: id, category: "" })),
    [],
  )

  const {
    draft,
    applied,
    updateDraft,
    applyDraft,
    toggleDimension,
    toggleMetric,
    reorderMetrics,
    applySort,
    hasPendingApply,
  } = useMyReportConfig(catalogDimensionsPlaceholder)

  const { catalog, catalogLoading, catalogError, data, loading, error, refetch } =
    useMyReportQuery(applied)

  useEffect(() => {
    if (autoApplied || catalogLoading || catalogError) return
    applyDraft()
    setAutoApplied(true)
  }, [autoApplied, applyDraft, catalogLoading, catalogError])

  const dimensionCatalog = useMemo(() => {
    const fromApi = catalog?.dimensions ?? []
    return fromApi.filter((d) => (MY_REPORT_DIMENSION_IDS as readonly string[]).includes(d.id))
  }, [catalog?.dimensions])

  const metricCatalog = catalog?.metrics ?? []

  const metricLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of metricCatalog) map.set(m.id, m.label)
    return map
  }, [metricCatalog])

  const dateRangeLabel = useMemo(() => {
    const { start, end } = resolveMyReportDateRange(draft)
    return formatReportDateRangeLabel(start, end)
  }, [draft])

  const selectedAppLabel = useMemo(() => {
    if (draft.selectedAppIds.length === 0) return "All apps"
    if (draft.selectedAppIds.length === 1) {
      const app = availableApps.find((a) => a.appId === draft.selectedAppIds[0])
      return app?.displayName ?? draft.selectedAppIds[0]
    }
    return `${draft.selectedAppIds.length} apps`
  }, [availableApps, draft.selectedAppIds])

  const iapModeLabel =
    IAP_REVENUE_MODE_OPTIONS.find((o) => o.value === draft.iapRevenueMode)?.label ?? "70% of Gross"

  const tableRows = data?.rows ?? []
  const tableTotals = data?.totals ?? {}

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderMetrics(String(active.id), String(over.id))
  }

  const handleApply = useCallback(() => {
    applyDraft()
    setMobileFiltersOpen(false)
  }, [applyDraft])

  const handleExport = () => {
    if (!canExportReports) {
      toast.error("You do not have permission to export reports.")
      return
    }
    if (!applied || tableRows.length === 0) return
    exportReportTableExcel({
      dimensions: applied.dimensions,
      metrics: applied.metrics,
      dimensionCatalog,
      metricCatalog,
      rows: tableRows,
      totals: tableTotals,
      filenamePrefix: "my-report",
    })
  }

  const handleSortColumn = (columnId: string) => {
    applySort(columnId)
  }

  const toggleAppSelection = (appId: string) => {
    updateDraft({
      selectedAppIds: draft.selectedAppIds.includes(appId)
        ? draft.selectedAppIds.filter((id) => id !== appId)
        : [...draft.selectedAppIds, appId],
    })
  }

  const renderMetricPickerList = (ids: readonly string[]) => (
    <div className="space-y-1">
      {ids.map((id) => {
        const item = metricCatalog.find((m) => m.id === id)
        if (!item) return null
        const checked = draft.metrics.includes(id)
        return (
          <label
            key={id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
          >
            <Checkbox checked={checked} onCheckedChange={() => toggleMetric(id)} />
            <span className="text-sm text-gray-700">{item.label}</span>
          </label>
        )
      })}
    </div>
  )

  const renderFilterFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">Date range</Label>
        <Select
          value={
            draft.dateFilterMode === "month"
              ? "month"
              : draft.dateFilterMode === "custom"
                ? "custom"
                : String(draft.activePresetDays)
          }
          onValueChange={(value) => {
            if (value === "month") {
              updateDraft(applyMonthToDraft(draft.selectedMonth))
              return
            }
            if (value === "custom") {
              updateDraft({ dateFilterMode: "custom" })
              return
            }
            updateDraft(applyPresetToDraft(Number(value)))
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(isMobile && "z-[100]")}>
            {REPORT_DATE_PRESETS.map((p) => (
              <SelectItem key={p.id} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="month">Select month</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        {draft.dateFilterMode === "month" ? (
          <Input
            type="month"
            className="h-9"
            value={format(draft.selectedMonth, "yyyy-MM")}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number)
              if (y && m) updateDraft(applyMonthToDraft(new Date(y, m - 1, 1)))
            }}
          />
        ) : null}
        {draft.dateFilterMode === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              className="h-9"
              value={format(draft.startDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (!e.target.value) return
                const start = new Date(`${e.target.value}T00:00:00`)
                updateDraft(applyCustomRangeToDraft(start, draft.endDate))
              }}
            />
            <Input
              type="date"
              className="h-9"
              value={format(draft.endDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (!e.target.value) return
                const end = new Date(`${e.target.value}T00:00:00`)
                updateDraft(applyCustomRangeToDraft(draft.startDate, end))
              }}
            />
          </div>
        ) : null}
        <p className="text-xs text-gray-500">{dateRangeLabel}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">Apps</Label>
        <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen} modal={isMobile ? false : undefined}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 w-full justify-between font-normal">
              <span className="truncate">{selectedAppLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-72 p-0", isMobile && "z-[100]")} align="start">
            <ScrollArea className="max-h-64">
              <div className="p-2">
                {appsLoading ? (
                  <p className="px-2 py-4 text-sm text-gray-500">Loading apps…</p>
                ) : (
                  availableApps.map((app: App) => (
                    <label
                      key={app.appId}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={
                          draft.selectedAppIds.length === 0 ||
                          draft.selectedAppIds.includes(app.appId)
                        }
                        onCheckedChange={() => {
                          if (draft.selectedAppIds.length === 0) {
                            updateDraft({
                              selectedAppIds: availableApps
                                .map((a) => a.appId)
                                .filter((id) => id !== app.appId),
                            })
                          } else {
                            toggleAppSelection(app.appId)
                          }
                        }}
                      />
                      <span className="truncate text-sm">{app.displayName ?? app.appId}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">Teams</Label>
        <GroupedTeamMultiSelect
          teams={filterTeams}
          teamGroups={filterTeamGroups}
          selectedTeamIds={draft.selectedCommissionTeamIds}
          onSelectedTeamIdsChange={(ids) => updateDraft({ selectedCommissionTeamIds: ids })}
          disabled={loadingFilterTeams}
          placeholder="Teams in your scope"
          searchPlaceholder="Search teams..."
          emptySearchMessage="No teams found."
          emptyTeamsMessage="No teams under you or as team lead"
          triggerClassName="h-9 w-full max-w-none"
          popoverClassName={cn("w-[320px] p-0", isMobile && "z-[100]")}
          popoverModal={isMobile ? false : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">IAP Revenue Mode</Label>
        <Select
          value={String(draft.iapRevenueMode)}
          onValueChange={(v) => updateDraft({ iapRevenueMode: Number(v) })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(isMobile && "z-[100]")}>
            {IAP_REVENUE_MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-500">Revenue source</Label>
        <Select
          value={draft.revenueSource}
          onValueChange={(v) => updateDraft({ revenueSource: v })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={cn(isMobile && "z-[100]")}>
            {REVENUE_SOURCE_OPTIONS.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderEditPanel = (embedded = false) => (
    <div
      className={cn(
        "flex flex-col bg-white",
        embedded ? "w-full" : "w-80 shrink-0 border-l border-gray-200",
      )}
    >
      <div className="flex border-b border-gray-200">
        {(["dimensions", "metrics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setEditTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize",
              editTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {editTab === "dimensions" ? (
            <div className="space-y-1">
              {dimensionCatalog.map((dim) => (
                <label
                  key={dim.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={draft.dimensions.includes(dim.id)}
                    onCheckedChange={() => toggleDimension(dim.id)}
                  />
                  <span className="text-sm text-gray-700">{dim.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-3 flex gap-2">
                {(["summary", "admob"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMetricTab(tab)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium capitalize",
                      metricTab === tab ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {metricTab === "summary"
                ? renderMetricPickerList(MY_REPORT_SUMMARY_METRIC_IDS)
                : renderMetricPickerList(MY_REPORT_ADMOB_METRIC_IDS)}
              <div className="mt-4 space-y-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Column order
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMetricDragEnd}>
                  <SortableContext items={draft.metrics} strategy={verticalListSortingStrategy}>
                    {draft.metrics.map((metricId) => (
                      <SortableMetricItem
                        key={metricId}
                        id={metricId}
                        label={metricLabelById.get(metricId) ?? metricId}
                        onRemove={() => toggleMetric(metricId)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  const displayConfig = applied ?? draft

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-6 pt-3 pb-1">
        <Link href="/reports" className="text-xs text-gray-500 hover:text-blue-600">
          All reports
        </Link>
        <span className="mx-1.5 text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-600">My Reports</span>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          {isEditingTitle ? (
            <input
              autoFocus
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              className="border-b-2 border-blue-500 bg-transparent text-2xl font-semibold outline-none"
            />
          ) : (
            <h1 className="truncate text-2xl font-semibold text-gray-900">{reportTitle}</h1>
          )}
          <button type="button" onClick={() => setIsEditingTitle(true)} className="rounded p-1 hover:bg-gray-100">
            <Pencil className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Phase2DisabledButton className="rounded-md p-2 hover:bg-gray-100">
            <Star className="h-5 w-5 text-gray-400" />
          </Phase2DisabledButton>
          <Phase2DisabledButton className="rounded-md p-2 hover:bg-gray-100">
            <Mail className="h-5 w-5 text-gray-400" />
          </Phase2DisabledButton>
          <Phase2DisabledButton className="rounded-md p-2 hover:bg-gray-100">
            <Share2 className="h-5 w-5 text-gray-400" />
          </Phase2DisabledButton>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={!canExportReports || tableRows.length === 0}
            onClick={handleExport}
          >
            <Download className="h-5 w-5 text-gray-400" />
          </Button>
          <Phase2DisabledButton className="rounded-md p-2 hover:bg-gray-100">
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </Phase2DisabledButton>
          <Phase2DisabledButton className="ml-2 h-9 rounded-md bg-blue-600 px-5 text-sm font-medium text-white">
            Save
          </Phase2DisabledButton>
        </div>
      </div>

      {!isMobile ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm hover:border-gray-300">
                <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">Data configuration</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              {renderFilterFields()}
            </PopoverContent>
          </Popover>
          <FilterTag label="App" value={selectedAppLabel} />
          <FilterTag value={dateRangeLabel} showChevron={false} />
          <Phase2DisabledButton>
            <FilterTag label="Compare to" value="No comparison" />
          </Phase2DisabledButton>
          <FilterTag label="IAP Revenue Mode" value={iapModeLabel} />
          <FilterTag label="Revenue source" value={draft.revenueSource} />
        </div>
      ) : null}

      <div className="flex items-center justify-between border-y border-gray-100 bg-gray-50/50 px-6 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-9 gap-1.5", editTableOpen && "border-2 border-blue-600 text-blue-600")}
            onClick={() => setEditTableOpen((v) => !v)}
          >
            <Table2 className="h-4 w-4" />
            Edit table
          </Button>
          <Phase2DisabledButton className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 text-sm font-medium">
            <BarChart2 className="h-4 w-4" />
            Charts
          </Phase2DisabledButton>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch?.()}>
            <RefreshCw className={cn("h-4 w-4 text-gray-500", loading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {hasPendingApply ? (
            <Badge variant="secondary" className="text-xs">
              Unapplied changes
            </Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700"
            disabled={loading}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          {catalogLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : catalogError ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">{catalogError}</div>
          ) : !applied ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Configure filters and click <span className="font-medium text-gray-700">Apply</span>.
            </div>
          ) : loading && tableRows.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">{error}</div>
          ) : tableRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">No data for the selected filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  {displayConfig.dimensions.map((dimId) => {
                    const dim = dimensionCatalog.find((d) => d.id === dimId)
                    return (
                      <th
                        key={dimId}
                        className="sticky left-0 z-10 min-w-[120px] bg-white px-4 py-3 text-left font-medium text-gray-700"
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-blue-600"
                          onClick={() => handleSortColumn(dimId)}
                        >
                          {dim?.label ?? dimId}
                          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </th>
                    )
                  })}
                  {displayConfig.metrics.map((metricId) => {
                    const metric = metricCatalog.find((m) => m.id === metricId)
                    return (
                      <th
                        key={metricId}
                        className="min-w-[120px] px-4 py-3 text-right font-medium text-gray-700"
                      >
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-end gap-1 hover:text-blue-600"
                          onClick={() => handleSortColumn(metricId)}
                        >
                          {metric?.label ?? metricId}
                          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                    {displayConfig.dimensions.map((dimId, dimIndex) => (
                      <td
                        key={`${idx}-${dimId}`}
                        className={cn(
                          "px-4 py-3 text-gray-900",
                          dimIndex === 0 && "sticky left-0 z-10 bg-white",
                        )}
                      >
                        {formatDimensionCell(dimId, row)}
                      </td>
                    ))}
                    {displayConfig.metrics.map((metricId) => (
                      <td key={`${idx}-${metricId}`} className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {formatMetricValue(row[metricId], metricId, metricCatalog)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                  {displayConfig.dimensions.map((dimId, dimIndex) => (
                    <td
                      key={`total-${dimId}`}
                      className={cn("px-4 py-3 text-gray-900", dimIndex === 0 && "sticky left-0 z-10 bg-gray-100")}
                    >
                      {dimIndex === 0 ? "Total" : ""}
                    </td>
                  ))}
                  {displayConfig.metrics.map((metricId) => (
                    <td key={`total-${metricId}`} className="px-4 py-3 text-right tabular-nums">
                      {formatMetricValue(tableTotals[metricId], metricId, metricCatalog)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
        {editTableOpen && !isMobile ? renderEditPanel() : null}
      </div>

      {isMobile ? (
        <>
          <div
            ref={mobileStickerRef}
            className="fixed right-0 z-40 flex touch-none flex-col items-end"
            style={
              mobileStickerTop == null
                ? { top: "50%", transform: "translateY(-50%)" }
                : { top: mobileStickerTop }
            }
          >
            <button
              type="button"
              {...mobileStickerDragProps}
              onClick={() => {
                if (consumeMobileStickerDragClick()) return
                setMobileFiltersOpen(true)
              }}
              className={cn(
                "flex cursor-grab flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-slate-200 bg-white px-1.5 py-3 shadow-lg active:cursor-grabbing",
                hasPendingApply && "ring-2 ring-blue-300",
              )}
              aria-label="Open filters and metrics"
            >
              <Filter className="h-4 w-4 text-slate-600" />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                style={{ writingMode: "vertical-rl" }}
              >
                Filters & Metrics
              </span>
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[10px] font-semibold">
                {draft.metrics.length}
              </Badge>
            </button>
          </div>

          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent
              side="right"
              className="flex h-[100dvh] max-h-[100dvh] w-[min(100vw-1rem,22rem)] flex-col gap-0 overflow-hidden p-0"
            >
              <SheetHeader className="shrink-0 border-b border-slate-100 px-4 py-4 text-left">
                <SheetTitle className="text-base">Filters & Metrics</SheetTitle>
                <SheetDescription>Period, apps, teams, metrics. Click Apply to refresh.</SheetDescription>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 p-4">
                  {renderFilterFields()}
                  <div className="border-t border-slate-100 pt-4">{renderEditPanel(true)}</div>
                </div>
              </ScrollArea>
              <div className="shrink-0 border-t border-slate-100 p-4">
                <Button className="h-10 w-full bg-blue-600 hover:bg-blue-700" onClick={handleApply} disabled={loading}>
                  Apply
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}
    </div>
  )
}
