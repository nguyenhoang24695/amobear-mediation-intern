"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
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
import {
  Filter,
  GripVertical,
  Loader2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { authApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { useIsMobile } from "@/hooks/use-mobile"
import { useDraggableVerticalFixed } from "@/hooks/use-draggable-vertical-fixed"
import { MyReportsTableActionBar, MyReportTableViewModeToggle, MyReportsToolbar } from "@/components/my-reports/my-reports-toolbar"
import { MyReportCharts } from "@/components/my-reports/my-report-charts"
import { exportReportTableExcel } from "@/lib/reports/export-report-table"
import {
  MY_REPORT_DIMENSION_IDS,
  getVisibleMetricTabs,
  resolveMetricIdsForSource,
  type MyReportMetricSourceTab,
} from "@/lib/reports/my-report-catalog-groups"
import { FormulaMetricEditor } from "@/components/my-reports/formula-metric-editor"
import { MyReportSaveDialog } from "@/components/my-reports/my-report-save-dialog"
import { MyReportPivotTable } from "@/components/my-reports/my-report-pivot-table"
import {
  applyCustomFormulasToRows,
  applyCustomFormulasToTotals,
  buildFormulaMetricCatalog,
} from "@/lib/reports/my-report-formula-utils"
import { deserializeMyReportConfig } from "@/lib/reports/my-report-config-serializer"
import { myReportSavedApi } from "@/lib/api/my-report-saved"
import {
  computeFilteredMetricTotals,
  filterReportRowsByColumnFilters,
  filterReportRowsForPivotView,
  hasActiveColumnFilters,
  type ColumnFilterCondition,
} from "@/lib/reports/column-filter-utils"
import { MyReportDataConfigurationPanel } from "@/components/my-reports/data-configuration-panel"
import { ExternalFilterTag } from "@/components/my-reports/external-filter-tag"
import { MyReportTable } from "@/components/my-reports/my-report-table"
import {
  useMyReportConfig,
  type MyReportTableViewMode,
} from "@/components/my-reports/hooks/use-my-report-config"
import { useMyReportQuery } from "@/components/my-reports/hooks/use-my-report-query"
import { buildExternalFilterTags } from "@/lib/reports/my-report-config-tag-utils"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import { loadScopedCommissionTeams } from "@/lib/reports/scoped-commission-teams"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import type { OrgTeamGroup } from "@/lib/api/services"
import type { App } from "@/types/api"
import { useMyReportTeamAppGroups } from "@/components/my-reports/hooks/use-my-report-team-app-groups"
import {
  resolveAppSelectionLabel,
  resolveMyReportAppPool,
  resolveTeamAppIdsForTeams,
} from "@/lib/reports/my-report-app-selection"
import { isCompareActive } from "@/lib/reports/my-report-compare-utils"

const MY_REPORT_MOBILE_STICKER_KEY = "my-report-mobile-filters-sticker-top-v1"

function MyReportTableViewShell({
  isTransitioning,
  children,
}: {
  isTransitioning: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-[280px]">
      <div
        className={cn(
          "transition-opacity duration-200",
          isTransitioning && "pointer-events-none select-none opacity-40",
        )}
        aria-busy={isTransitioning}
      >
        {children}
      </div>
      {isTransitioning ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-background/40"
          role="status"
          aria-live="polite"
          aria-label="Loading table view"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  )
}

function resolveTeamsSelectionLabel(
  teamIds: string[],
  teams: CommissionTeamOption[],
): string {
  if (teamIds.length === 0) return "All teams"
  if (teamIds.length === 1) {
    const team = teams.find((t) => t.teamId === teamIds[0])
    return team?.label ?? teamIds[0]
  }
  return `${teamIds.length} teams`
}

function buildFilterTagContext(
  config: MyReportConfig,
  permittedApps: App[],
  teamAppsUnion: App[],
  teams: CommissionTeamOption[],
) {
  const appPool = resolveMyReportAppPool(config.appSelectionMode, permittedApps, teamAppsUnion)
  return {
    selectedAppLabel: resolveAppSelectionLabel(
      config.selectedAppIds,
      appPool,
      config.appSelectionMode,
    ),
    selectedTeamsLabel: resolveTeamsSelectionLabel(config.selectedCommissionTeamIds, teams),
  }
}

function SortableDimensionItem({
  id,
  label,
}: {
  id: string
  label: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-2 rounded bg-muted/50 px-2 py-2"
    >
      <button type="button" className="cursor-grab touch-none text-muted-foreground/60" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm text-foreground">{label}</span>
    </div>
  )
}

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
      className="flex items-center gap-2 rounded bg-muted/50 px-2 py-2"
    >
      <button type="button" className="cursor-grab touch-none text-muted-foreground/60" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm text-foreground">{label}</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}


export function MyReportsContent() {
  const isMobile = useIsMobile()
  const canExportReports = hasScreenFunction("s-reports", "export-csv")
  const [reportTitle, setReportTitle] = useState("My Report")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTableOpen, setEditTableOpen] = useState(true)
  const [editTab, setEditTab] = useState<"dimensions" | "metrics">("metrics")
  const [metricTab, setMetricTab] = useState<MyReportMetricSourceTab>("summary")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [dataConfigOpen, setDataConfigOpen] = useState(false)
  const [autoApplied, setAutoApplied] = useState(false)
  const [columnFiltersByColumn, setColumnFiltersByColumn] = useState<
    Record<string, ColumnFilterCondition[]>
  >({})
  const [columnFiltersLive, setColumnFiltersLive] = useState(false)
  const [columnFiltersNeedReload, setColumnFiltersNeedReload] = useState(false)

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
    reorderDimensions,
    togglePinColumn,
    applySort,
    toggleConfigKey,
    resetConfigVisibility,
    hasPendingApply,
    loadConfig,
  } = useMyReportConfig(catalogDimensionsPlaceholder)

  const [isTableViewTransitioning, startTableViewTransition] = useTransition()
  const [tableViewOverlayVisible, setTableViewOverlayVisible] = useState(false)
  const tableViewOverlayStartedAtRef = useRef<number | null>(null)

  const handleTableViewModeChange = useCallback(
    (tableViewMode: MyReportTableViewMode) => {
      if (tableViewMode === draft.tableViewMode) return
      tableViewOverlayStartedAtRef.current = Date.now()
      setTableViewOverlayVisible(true)
      startTableViewTransition(() => {
        updateDraft({ tableViewMode })
      })
    },
    [draft.tableViewMode, updateDraft],
  )

  useEffect(() => {
    if (isTableViewTransitioning || !tableViewOverlayVisible) return

    const minOverlayMs = 200
    const startedAt = tableViewOverlayStartedAtRef.current ?? Date.now()
    const remainingMs = Math.max(0, minOverlayMs - (Date.now() - startedAt))
    const timer = window.setTimeout(() => {
      setTableViewOverlayVisible(false)
      tableViewOverlayStartedAtRef.current = null
    }, remainingMs)

    return () => window.clearTimeout(timer)
  }, [isTableViewTransitioning, tableViewOverlayVisible])

  const isTableViewLoading = isTableViewTransitioning || tableViewOverlayVisible

  const needsTeamAppGroups =
    draft.appSelectionMode === "by_team" ||
    applied?.appSelectionMode === "by_team" ||
    draft.selectedCommissionTeamIds.length > 0 ||
    (applied?.selectedCommissionTeamIds.length ?? 0) > 0
  const { groups: teamAppGroups, unionApps: teamAppsUnion } = useMyReportTeamAppGroups(
    filterTeams,
    needsTeamAppGroups,
  )

  const teamScopedAppIds = useMemo(
    () =>
      resolveTeamAppIdsForTeams(
        applied?.selectedCommissionTeamIds ?? draft.selectedCommissionTeamIds,
        teamAppGroups,
      ),
    [applied?.selectedCommissionTeamIds, draft.selectedCommissionTeamIds, teamAppGroups],
  )

  const {
    catalog,
    catalogLoading,
    catalogError,
    data,
    mergedRows,
    mergedTotals,
    compareTotals,
    totalsDeltaPct,
    loading,
    error,
    emptyAppIntersection,
    refetch,
  } = useMyReportQuery(applied, teamScopedAppIds)

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
  const formulaMetricCatalog = useMemo(
    () => buildFormulaMetricCatalog((applied ?? draft).customFormulas),
    [applied, draft.customFormulas],
  )
  const extendedMetricCatalog = useMemo(
    () => [...metricCatalog, ...formulaMetricCatalog],
    [metricCatalog, formulaMetricCatalog],
  )

  const visibleMetricTabs = useMemo(() => {
    const tabs = getVisibleMetricTabs(metricCatalog)
    return [...tabs, "custom" as const]
  }, [metricCatalog])

  useEffect(() => {
    if (!visibleMetricTabs.includes(metricTab)) {
      setMetricTab(visibleMetricTabs[0] ?? "summary")
    }
  }, [metricTab, visibleMetricTabs])

  const metricLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of extendedMetricCatalog) map.set(m.id, m.label)
    return map
  }, [extendedMetricCatalog])

  const compareActive = Boolean(applied && isCompareActive(applied.compareToPreset))

  const draftFilterContext = useMemo(
    () => buildFilterTagContext(draft, availableApps, teamAppsUnion, filterTeams),
    [draft, availableApps, teamAppsUnion, filterTeams],
  )

  const externalFilterTags = useMemo(() => {
    if (!applied) return []
    return buildExternalFilterTags(applied, draft, draftFilterContext)
  }, [applied, draft, draftFilterContext])

  const renderExternalFilterTags = () =>
    externalFilterTags.map((tag) => (
      <ExternalFilterTag
        key={tag.key}
        tag={tag}
        draft={draft}
        updateDraft={updateDraft}
        availableApps={availableApps}
        appsLoading={appsLoading}
        onToggleAppSelection={toggleAppSelection}
        filterTeams={filterTeams}
        filterTeamGroups={filterTeamGroups}
        loadingFilterTeams={loadingFilterTeams}
        teamAppsUnion={teamAppsUnion}
      />
    ))

  const displayConfig = applied ?? draft

  const formulaRows = useMemo(
    () =>
      applyCustomFormulasToRows(
        mergedRows,
        displayConfig.customFormulas,
        metricCatalog,
      ),
    [mergedRows, displayConfig.customFormulas, metricCatalog],
  )
  const formulaTotals = useMemo(
    () =>
      applyCustomFormulasToTotals(
        mergedTotals,
        displayConfig.customFormulas,
        metricCatalog,
      ),
    [mergedTotals, displayConfig.customFormulas, metricCatalog],
  )

  const tableRows = formulaRows
  const tableTotals = formulaTotals

  useEffect(() => {
    setColumnFiltersByColumn({})
    setColumnFiltersLive(false)
    setColumnFiltersNeedReload(false)
  }, [data, applied?.dimensions, applied?.metrics, applied?.startDate, applied?.endDate])

  const tableColumns = useMemo(() => {
    if (!displayConfig) return []
    const dims = displayConfig.dimensions.map((dimId) => {
      const dim = dimensionCatalog.find((d) => d.id === dimId)
      return { id: dimId, label: dim?.label ?? dimId, kind: "dimension" as const }
    })
    const metrics = displayConfig.metrics.map((metricId) => {
      const metric = extendedMetricCatalog.find((m) => m.id === metricId)
      return { id: metricId, label: metric?.label ?? metricId, kind: "metric" as const }
    })
    const formulaColumns = displayConfig.customFormulas.map((formula) => ({
      id: formula.id,
      label: formula.name,
      kind: "metric" as const,
    }))
    return [...dims, ...metrics, ...formulaColumns]
  }, [displayConfig, dimensionCatalog, extendedMetricCatalog])

  const metricTableColumns = useMemo(
    () => tableColumns.filter((column) => column.kind === "metric"),
    [tableColumns],
  )

  const activeDimensions = applied?.dimensions ?? draft.dimensions
  const usePivotTreeView =
    draft.tableViewMode === "pivot" && activeDimensions.length >= 2

  const displayTableRows = useMemo(() => {
    if (!columnFiltersLive || !hasActiveColumnFilters(columnFiltersByColumn)) return tableRows
    if (usePivotTreeView) {
      return filterReportRowsForPivotView(
        tableRows,
        columnFiltersByColumn,
        activeDimensions,
        metricTableColumns,
      ) as typeof tableRows
    }
    return filterReportRowsByColumnFilters(
      tableRows,
      columnFiltersByColumn,
      tableColumns,
    ) as typeof tableRows
  }, [
    tableRows,
    columnFiltersByColumn,
    columnFiltersLive,
    tableColumns,
    usePivotTreeView,
    activeDimensions,
    metricTableColumns,
  ])

  const displayTableTotals = useMemo(() => {
    if (!columnFiltersLive || !hasActiveColumnFilters(columnFiltersByColumn)) return tableTotals
    const computed = computeFilteredMetricTotals(
      displayTableRows,
      metricTableColumns.map((column) => column.id),
    )
    return { ...tableTotals, ...computed }
  }, [
    tableTotals,
    displayTableRows,
    columnFiltersLive,
    columnFiltersByColumn,
    metricTableColumns,
  ])

  const formulaMetricIds = displayConfig.customFormulas.map((formula) => formula.id)
  const hasColumnFilters = hasActiveColumnFilters(columnFiltersByColumn)
  const showColumnFilterReloadFab = hasColumnFilters

  const handleApplyColumnFilter = useCallback(
    (columnId: string, conditions: ColumnFilterCondition[]) => {
      const next = { ...columnFiltersByColumn }
      if (conditions.length === 0) delete next[columnId]
      else next[columnId] = conditions

      setColumnFiltersByColumn(next)
      setColumnFiltersLive(false)
      setColumnFiltersNeedReload(hasActiveColumnFilters(next))
    },
    [columnFiltersByColumn],
  )

  const handleReloadColumnFilters = useCallback(() => {
    if (columnFiltersNeedReload) {
      setColumnFiltersLive(true)
      setColumnFiltersNeedReload(false)
      return
    }
    if (columnFiltersLive) {
      setColumnFiltersLive(false)
      setColumnFiltersByColumn({})
      setColumnFiltersNeedReload(false)
      return
    }
    setColumnFiltersLive(true)
  }, [columnFiltersNeedReload, columnFiltersLive])

  const reloadColumnFiltersLabel =
    columnFiltersLive && !columnFiltersNeedReload ? "Show all rows" : "Reload Data"

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleMetricDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderMetrics(String(active.id), String(over.id))
  }

  const handleDimensionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderDimensions(String(active.id), String(over.id))
  }

  const handleDataConfigReset = useCallback(() => {
    resetConfigVisibility()
  }, [resetConfigVisibility])

  const handleLoadTemplate = useCallback(
    async (templateId: string) => {
      if (hasPendingApply) {
        const confirmed = window.confirm(
          "You have unapplied changes. Loading a template will replace the current configuration. Continue?",
        )
        if (!confirmed) return
      }

      try {
        const template = await myReportSavedApi.get(templateId)
        loadConfig(deserializeMyReportConfig(template.config))
        setReportTitle(template.name)
        toast.success(`Loaded template "${template.name}"`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load template")
      }
    },
    [hasPendingApply, loadConfig],
  )

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
      formulaMetricIds: applied.customFormulas.map((formula) => formula.id),
      dimensionCatalog,
      metricCatalog: extendedMetricCatalog,
      rows: tableRows,
      totals: tableTotals,
      filenamePrefix: "my-report",
      compareActive,
      compareTotals,
      totalsDeltaPct,
      rowCompare: tableRows.map((row) => row.__compare ?? {}),
      rowDeltaPct: tableRows.map((row) => row.__deltaPct ?? {}),
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
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-muted/60"
          >
            <Checkbox checked={checked} onCheckedChange={() => toggleMetric(id)} />
            <span className="text-sm text-foreground">{item.label}</span>
          </label>
        )
      })}
    </div>
  )

  const renderDataConfiguration = (closeOnApply = true) => (
    <MyReportDataConfigurationPanel
      draft={draft}
      onToggleConfigKey={toggleConfigKey}
      onReset={handleDataConfigReset}
      onApply={() => {
        applyDraft()
        if (closeOnApply) setDataConfigOpen(false)
      }}
      applyDisabled={loading}
      displayContext={draftFilterContext}
    />
  )

  const availableFormulaMetricIds = useMemo(
    () => [...new Set([...draft.metrics, ...metricCatalog.map((m) => m.id)])],
    [draft.metrics, metricCatalog],
  )

  const renderEditPanel = (embedded = false) => (
    <div
      className={cn(
        "flex flex-col bg-card",
        embedded ? "w-full" : "w-80 shrink-0 border-l border-border",
      )}
    >
      <div className="flex border-b border-border">
        {(["dimensions", "metrics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setEditTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize",
              editTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {editTab === "dimensions" ? (
            <>
              <MyReportTableViewModeToggle
                className="mb-4"
                tableViewMode={draft.tableViewMode}
                disabled={isTableViewLoading}
                onTableViewModeChange={handleTableViewModeChange}
              />
              {draft.tableViewMode === "pivot" && activeDimensions.length < 2 ? (
                <p className="mb-4 text-xs text-amber-700">
                  Pivot cần từ 2 dimensions trở lên (theo thứ tự bên dưới). Khi chưa đủ, bảng vẫn hiển thị
                  dạng Flat.
                </p>
              ) : draft.tableViewMode === "pivot" ? (
                <p className="mb-4 text-xs text-muted-foreground">
                  Pivot gom dữ liệu theo thứ tự dimension: cột đầu expand từng cấp, metrics được cộng dồn
                  trên frontend.
                </p>
              ) : null}
              <div className="space-y-1">
                {dimensionCatalog.map((dim) => (
                  <label
                    key={dim.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={draft.dimensions.includes(dim.id)}
                      onCheckedChange={() => toggleDimension(dim.id)}
                    />
                    <span className="text-sm text-foreground">{dim.label}</span>
                  </label>
                ))}
              </div>
              {draft.dimensions.length > 0 ? (
                <div className="mt-4 space-y-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Dimension order
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDimensionDragEnd}
                  >
                    <SortableContext items={draft.dimensions} strategy={verticalListSortingStrategy}>
                      {draft.dimensions.map((dimId) => (
                        <SortableDimensionItem
                          key={dimId}
                          id={dimId}
                          label={dimensionCatalog.find((d) => d.id === dimId)?.label ?? dimId}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {visibleMetricTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMetricTab(tab)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium capitalize",
                      metricTab === tab ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {metricTab === "custom" ? (
                <FormulaMetricEditor
                  formulas={draft.customFormulas}
                  availableMetricIds={availableFormulaMetricIds}
                  metricLabels={Object.fromEntries(
                    extendedMetricCatalog.map((metric) => [metric.id, metric.label]),
                  )}
                  onChange={(customFormulas) => updateDraft({ customFormulas })}
                />
              ) : (
                renderMetricPickerList(resolveMetricIdsForSource(metricCatalog, metricTab))
              )}
              <div className="mt-4 space-y-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                    {draft.customFormulas.map((formula) => (
                      <SortableMetricItem
                        key={formula.id}
                        id={formula.id}
                        label={formula.name}
                        onRemove={() =>
                          updateDraft({
                            customFormulas: draft.customFormulas.filter((f) => f.id !== formula.id),
                          })
                        }
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

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-6 pt-3 pb-1">
        <Link href="/reports" className="text-xs text-muted-foreground hover:text-primary">
          All reports
        </Link>
        <span className="mx-1.5 text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">My Reports</span>
      </div>

      <MyReportsToolbar
        reportTitle={reportTitle}
        isEditingTitle={isEditingTitle}
        onTitleChange={setReportTitle}
        onEditingTitleChange={setIsEditingTitle}
        canExport={canExportReports}
        exportDisabled={tableRows.length === 0}
        onExport={handleExport}
        onSave={() => setSaveDialogOpen(true)}
        onLoadTemplate={handleLoadTemplate}
        appliedConfig={applied}
        orgId={orgId}
      />

      <MyReportSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        config={draft}
        reportTitle={reportTitle}
        onSaved={(item) => {
          setReportTitle(item.name)
          toast.success(`Saved template "${item.name}"`)
        }}
      />

      {!isMobile ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          <Popover open={dataConfigOpen} onOpenChange={setDataConfigOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm hover:bg-muted/60"
              >
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Data Configuration</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="flex h-[min(80vh,560px)] w-[min(100vw-2rem,24rem)] flex-col overflow-hidden p-0"
              align="start"
              collisionPadding={16}
            >
              {renderDataConfiguration(true)}
            </PopoverContent>
          </Popover>
          {renderExternalFilterTags()}
        </div>
      ) : null}

      <MyReportsTableActionBar
        editTableOpen={editTableOpen}
        onEditTableToggle={() => setEditTableOpen((v) => !v)}
        chartsVisible={draft.chartsVisible}
        onChartsVisibleChange={(chartsVisible) => updateDraft({ chartsVisible })}
        loading={loading}
        hasPendingApply={hasPendingApply}
        onApply={handleApply}
        onRefresh={() => refetch?.()}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          {emptyAppIntersection ? (
            <div className="px-6 py-12 text-center text-sm text-amber-700">
              No apps match the intersection of selected teams and app filters. Adjust filters and
              click Apply.
            </div>
          ) : catalogLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : catalogError ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">{catalogError}</div>
          ) : !applied ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Configure filters and click <span className="font-medium text-foreground">Apply</span>.
            </div>
          ) : loading && tableRows.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-red-600">{error}</div>
          ) : tableRows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">No data for the selected filters.</div>
          ) : (
            <>
              {draft.chartsVisible ? (
                <MyReportCharts
                  rows={tableRows}
                  dimensions={displayConfig.dimensions}
                  metrics={displayConfig.metrics}
                  metricCatalog={metricCatalog}
                  dimensionCatalog={dimensionCatalog}
                  chartMetricIds={draft.chartMetricIds}
                  chartType={draft.chartType}
                  breakdownChartMetricIds={draft.breakdownChartMetricIds}
                  breakdownChartType={draft.breakdownChartType}
                  trendChartDimensionIds={draft.trendChartDimensionIds}
                  breakdownChartDimensionIds={draft.breakdownChartDimensionIds}
                  panelLayout={draft.panelLayout}
                  compareActive={compareActive}
                  onChartMetricIdsChange={(chartMetricIds) => updateDraft({ chartMetricIds })}
                  onChartTypeChange={(chartType) => updateDraft({ chartType })}
                  onBreakdownChartMetricIdsChange={(breakdownChartMetricIds) =>
                    updateDraft({ breakdownChartMetricIds })
                  }
                  onBreakdownChartTypeChange={(breakdownChartType) =>
                    updateDraft({ breakdownChartType })
                  }
                  onTrendChartDimensionIdsChange={(trendChartDimensionIds) =>
                    updateDraft({ trendChartDimensionIds })
                  }
                  onBreakdownChartDimensionIdsChange={(breakdownChartDimensionIds) =>
                    updateDraft({ breakdownChartDimensionIds })
                  }
                  onPanelLayoutChange={(panelLayout) => updateDraft({ panelLayout })}
                />
              ) : null}
              <MyReportTableViewShell isTransitioning={isTableViewLoading}>
                {usePivotTreeView ? (
                  <MyReportPivotTable
                    dimensions={activeDimensions}
                    dimensionCatalog={dimensionCatalog}
                    metricColumns={metricTableColumns}
                    rows={displayTableRows}
                    totals={displayTableTotals}
                    metricCatalog={extendedMetricCatalog}
                    compareActive={compareActive}
                    compareTotals={compareTotals}
                    totalsDeltaPct={totalsDeltaPct}
                    pinnedColumnIds={draft.pinnedColumnIds}
                    filtersByColumn={columnFiltersByColumn}
                    showReloadFab={showColumnFilterReloadFab}
                    reloadLabel={reloadColumnFiltersLabel}
                    onSortColumn={handleSortColumn}
                    onApplyColumnFilter={handleApplyColumnFilter}
                    onReloadData={handleReloadColumnFilters}
                    onTogglePin={togglePinColumn}
                  />
                ) : (
                  <MyReportTable
                    columns={tableColumns}
                    rows={displayTableRows}
                    totals={displayTableTotals}
                    metricCatalog={extendedMetricCatalog}
                    compareActive={compareActive}
                    compareTotals={compareTotals}
                    totalsDeltaPct={totalsDeltaPct}
                    pinnedColumnIds={draft.pinnedColumnIds}
                    filtersByColumn={columnFiltersByColumn}
                    filtersLive={columnFiltersLive}
                    showReloadFab={showColumnFilterReloadFab}
                    reloadLabel={reloadColumnFiltersLabel}
                    onSortColumn={handleSortColumn}
                    onApplyColumnFilter={handleApplyColumnFilter}
                    onReloadData={handleReloadColumnFilters}
                    onTogglePin={togglePinColumn}
                  />
                )}
              </MyReportTableViewShell>
            </>
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
                "flex cursor-grab flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-card px-1.5 py-3 shadow-lg active:cursor-grabbing",
                hasPendingApply && "ring-2 ring-primary/40",
              )}
              aria-label="Open filters and metrics"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
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
              <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
                <SheetTitle className="text-base">Data configuration</SheetTitle>
                <SheetDescription>
                  Toggle visible filters below; edit values from the filter tags.
                </SheetDescription>
              </SheetHeader>
              {externalFilterTags.length > 0 ? (
                <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-4 py-3">
                  {renderExternalFilterTags()}
                </div>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-4 p-0">
                    <div className="h-[min(55vh,420px)]">{renderDataConfiguration(false)}</div>
                    <div className="border-t border-border px-4 pb-4 pt-2">
                      {renderEditPanel(true)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t border-border p-4">
                <Button className="h-10 w-full bg-primary hover:bg-primary/90" onClick={handleApply} disabled={loading}>
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
