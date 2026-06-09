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
import { MyReportsTableActionBar, MyReportsToolbar } from "@/components/my-reports/my-reports-toolbar"
import { MyReportCharts } from "@/components/my-reports/my-report-charts"
import { exportReportTableExcel } from "@/lib/reports/export-report-table"
import {
  MY_REPORT_ADJUST_METRIC_IDS,
  MY_REPORT_ADMOB_METRIC_IDS,
  MY_REPORT_DIMENSION_IDS,
  MY_REPORT_SUMMARY_METRIC_IDS,
} from "@/lib/reports/my-report-catalog-groups"
import { MyReportDataConfigurationPanel } from "@/components/my-reports/data-configuration-panel"
import { ExternalFilterTag } from "@/components/my-reports/external-filter-tag"
import { MyReportTable } from "@/components/my-reports/my-report-table"
import {
  useMyReportConfig,
} from "@/components/my-reports/hooks/use-my-report-config"
import { useMyReportQuery } from "@/components/my-reports/hooks/use-my-report-query"
import { buildExternalFilterTags } from "@/lib/reports/my-report-config-tag-utils"
import {
  hasActiveColumnFilters,
  type ColumnFilterCondition,
} from "@/lib/reports/column-filter-utils"
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
      className="flex items-center gap-2 rounded bg-gray-50 px-2 py-2"
    >
      <button type="button" className="cursor-grab touch-none text-gray-300" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 truncate text-sm text-gray-700">{label}</span>
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


export function MyReportsContent() {
  const isMobile = useIsMobile()
  const canExportReports = hasScreenFunction("s-reports", "export-csv")
  const [reportTitle, setReportTitle] = useState("My Report")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTableOpen, setEditTableOpen] = useState(true)
  const [editTab, setEditTab] = useState<"dimensions" | "metrics">("metrics")
  const [metricTab, setMetricTab] = useState<"summary" | "admob" | "adjust">("summary")
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
  } = useMyReportConfig(catalogDimensionsPlaceholder)

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

  const metricLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of metricCatalog) map.set(m.id, m.label)
    return map
  }, [metricCatalog])

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

  const tableRows = mergedRows
  const tableTotals = mergedTotals

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
      const metric = metricCatalog.find((m) => m.id === metricId)
      return { id: metricId, label: metric?.label ?? metricId, kind: "metric" as const }
    })
    return [...dims, ...metrics]
  }, [displayConfig, dimensionCatalog, metricCatalog])

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
    setColumnFiltersLive((live) => !live)
  }, [columnFiltersNeedReload])

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
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
          >
            <Checkbox checked={checked} onCheckedChange={() => toggleMetric(id)} />
            <span className="text-sm text-gray-700">{item.label}</span>
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
            <>
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
              {draft.dimensions.length > 0 ? (
                <div className="mt-4 space-y-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
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
                {(["summary", "admob", "adjust"] as const).map((tab) => (
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
                : metricTab === "admob"
                  ? renderMetricPickerList(MY_REPORT_ADMOB_METRIC_IDS)
                  : renderMetricPickerList(MY_REPORT_ADJUST_METRIC_IDS)}
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

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-6 pt-3 pb-1">
        <Link href="/reports" className="text-xs text-gray-500 hover:text-blue-600">
          All reports
        </Link>
        <span className="mx-1.5 text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-600">My Reports</span>
      </div>

      <MyReportsToolbar
        reportTitle={reportTitle}
        isEditingTitle={isEditingTitle}
        onTitleChange={setReportTitle}
        onEditingTitleChange={setIsEditingTitle}
        canExport={canExportReports}
        exportDisabled={tableRows.length === 0}
        onExport={handleExport}
        appliedConfig={applied}
        orgId={orgId}
      />

      {!isMobile ? (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          <Popover open={dataConfigOpen} onOpenChange={setDataConfigOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm hover:border-gray-300"
              >
                <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">Data Configuration</span>
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
            <>
              {draft.chartsVisible ? (
                <MyReportCharts
                  rows={tableRows}
                  dimensions={displayConfig.dimensions}
                  metrics={displayConfig.metrics}
                  metricCatalog={metricCatalog}
                  dimensionCatalog={dimensionCatalog}
                  chartMetricId={draft.chartMetricId}
                  chartType={draft.chartType}
                  breakdownChartMetricId={draft.breakdownChartMetricId}
                  breakdownChartType={draft.breakdownChartType}
                  trendChartDimensionIds={draft.trendChartDimensionIds}
                  breakdownChartDimensionIds={draft.breakdownChartDimensionIds}
                  panelLayout={draft.panelLayout}
                  compareActive={compareActive}
                  onChartMetricChange={(metricId) => updateDraft({ chartMetricId: metricId })}
                  onChartTypeChange={(chartType) => updateDraft({ chartType })}
                  onBreakdownChartMetricChange={(metricId) =>
                    updateDraft({ breakdownChartMetricId: metricId })
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
              <MyReportTable
                columns={tableColumns}
                rows={tableRows}
                totals={tableTotals}
                metricCatalog={metricCatalog}
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
                <SheetTitle className="text-base">Data configuration</SheetTitle>
                <SheetDescription>
                  Toggle visible filters below; edit values from the filter tags.
                </SheetDescription>
              </SheetHeader>
              {externalFilterTags.length > 0 ? (
                <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
                  {renderExternalFilterTags()}
                </div>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-4 p-0">
                    <div className="h-[min(55vh,420px)]">{renderDataConfiguration(false)}</div>
                    <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                      {renderEditPanel(true)}
                    </div>
                  </div>
                </div>
              </div>
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
