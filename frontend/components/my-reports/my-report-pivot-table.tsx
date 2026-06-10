"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Filter, Minus, MoreHorizontal, Pin, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ColumnFilterPopover } from "@/components/my-reports/column-filter-popover"
import { formatMetricValue } from "@/lib/reports/report-format-utils"
import {
  PIVOT_DIMENSION_COLUMN_ID,
  type ColumnFilterCondition,
} from "@/lib/reports/column-filter-utils"
import {
  buildPivotDimensionHeader,
  buildPivotTree,
  flattenVisiblePivotNodes,
  type PivotTreeNode,
} from "@/lib/reports/pivot-utils"
import type { CompareEnrichedRow } from "@/lib/reports/my-report-compare-utils"
import type { CustomReportCatalogItem } from "@/types/reports"
import type { MyReportTableColumn } from "@/components/my-reports/my-report-table"

export type MyReportPivotTableProps = {
  dimensions: string[]
  dimensionCatalog: CustomReportCatalogItem[]
  metricColumns: MyReportTableColumn[]
  rows: CompareEnrichedRow[]
  totals: Record<string, string | number | null>
  metricCatalog: CustomReportCatalogItem[]
  compareActive?: boolean
  compareTotals?: Record<string, number | null>
  totalsDeltaPct?: Record<string, number | null>
  pinnedColumnIds?: string[]
  filtersByColumn: Record<string, ColumnFilterCondition[]>
  showReloadFab: boolean
  reloadLabel?: string
  onSortColumn: (columnId: string) => void
  onApplyColumnFilter: (columnId: string, conditions: ColumnFilterCondition[]) => void
  onReloadData: () => void
  onTogglePin?: (columnId: string) => void
}

function FilterIconButton({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex">
      <Filter className={cn("h-4 w-4", active ? "text-blue-600" : "text-gray-400")} />
      {active ? (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
      ) : null}
    </span>
  )
}

function formatDeltaPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function PivotMetricCell({
  metricId,
  value,
  compareValue,
  deltaPct,
  metricCatalog,
  compareActive,
  bold,
}: {
  metricId: string
  value: number | null
  compareValue: number | null
  deltaPct: number | null
  metricCatalog: CustomReportCatalogItem[]
  compareActive: boolean
  bold?: boolean
}) {
  const current = formatMetricValue(value, metricId, metricCatalog)
  if (!compareActive) {
    return <span className={cn(bold && "font-semibold")}>{current}</span>
  }

  const previousLabel =
    compareValue == null ? "—" : formatMetricValue(compareValue, metricId, metricCatalog)

  return (
    <div className={cn("space-y-0.5", bold && "font-semibold")}>
      <div>{current}</div>
      <div className="text-xs font-normal text-gray-500">
        {previousLabel}{" "}
        <span
          className={cn(
            deltaPct != null && deltaPct > 0 && "text-emerald-600",
            deltaPct != null && deltaPct < 0 && "text-red-600",
          )}
        >
          ({formatDeltaPct(deltaPct)})
        </span>
      </div>
    </div>
  )
}

function PivotTreeRow({
  node,
  orderedMetricColumns,
  pinnedColumnIds,
  stickyOffsets,
  metricCatalog,
  compareActive,
  expandedKeys,
  onToggleExpand,
}: {
  node: PivotTreeNode
  orderedMetricColumns: MyReportTableColumn[]
  pinnedColumnIds: string[]
  stickyOffsets: Map<string, number>
  metricCatalog: CustomReportCatalogItem[]
  compareActive: boolean
  expandedKeys: Set<string>
  onToggleExpand: (key: string) => void
}) {
  const hasChildren = !node.isLeaf && node.children.length > 0
  const isExpanded = expandedKeys.has(node.key)
  const indentPx = 12 + node.depth * 20

  const stickyClass = (columnId: string, bg: string) => {
    if (columnId === PIVOT_DIMENSION_COLUMN_ID) {
      return cn("sticky left-0 z-20", bg)
    }
    if (!pinnedColumnIds.includes(columnId)) return ""
    return cn("sticky z-20", bg)
  }

  const stickyStyle = (columnId: string): React.CSSProperties | undefined => {
    if (columnId === PIVOT_DIMENSION_COLUMN_ID) {
      return { left: 0 }
    }
    if (!pinnedColumnIds.includes(columnId)) return undefined
    return { left: stickyOffsets.get(columnId) ?? 0 }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td
        style={{ paddingLeft: `${indentPx}px`, ...stickyStyle(PIVOT_DIMENSION_COLUMN_ID) }}
        className={cn(
          "min-w-[220px] bg-white px-3 py-2.5",
          stickyClass(PIVOT_DIMENSION_COLUMN_ID, "bg-white"),
        )}
      >
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-gray-500 hover:text-gray-800"
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
              onClick={() => onToggleExpand(node.key)}
            >
              {isExpanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          ) : (
            <span className="inline-block h-6 w-6 shrink-0" aria-hidden />
          )}
          <span className={cn("truncate text-gray-900", hasChildren && "font-semibold")}>
            {node.label}
          </span>
        </div>
      </td>
      {orderedMetricColumns.map((column) => (
        <td
          key={column.id}
          style={stickyStyle(column.id)}
          className={cn(
            "px-3 py-2.5 text-right tabular-nums text-gray-900",
            stickyClass(column.id, "bg-white"),
          )}
        >
          <PivotMetricCell
            metricId={column.id}
            value={node.metrics[column.id] ?? null}
            compareValue={node.compare[column.id] ?? null}
            deltaPct={node.deltaPct[column.id] ?? null}
            metricCatalog={metricCatalog}
            compareActive={compareActive}
            bold={hasChildren}
          />
        </td>
      ))}
    </tr>
  )
}

export function MyReportPivotTable({
  dimensions,
  dimensionCatalog,
  metricColumns,
  rows,
  totals,
  metricCatalog,
  compareActive = false,
  compareTotals = {},
  totalsDeltaPct = {},
  pinnedColumnIds = [],
  filtersByColumn,
  showReloadFab,
  reloadLabel = "Reload Data",
  onSortColumn,
  onApplyColumnFilter,
  onReloadData,
  onTogglePin,
}: MyReportPivotTableProps) {
  const dimensionHeader = useMemo(
    () => buildPivotDimensionHeader(dimensions, dimensionCatalog),
    [dimensions, dimensionCatalog],
  )

  const dimensionFilterOptions = useMemo(
    () =>
      dimensions.map((id) => ({
        id,
        label: dimensionCatalog.find((d) => d.id === id)?.label ?? id,
      })),
    [dimensions, dimensionCatalog],
  )

  const orderedMetricColumns = useMemo(() => {
    if (pinnedColumnIds.length === 0) return metricColumns
    const pinned = pinnedColumnIds
      .map((id) => metricColumns.find((c) => c.id === id))
      .filter((c): c is MyReportTableColumn => Boolean(c))
    const pinnedSet = new Set(pinned.map((c) => c.id))
    const rest = metricColumns.filter((c) => !pinnedSet.has(c.id))
    return [...pinned, ...rest]
  }, [metricColumns, pinnedColumnIds])

  const stickyOffsets = useMemo(() => {
    const offsets = new Map<string, number>()
    offsets.set(PIVOT_DIMENSION_COLUMN_ID, 0)
    let offset = 220
    for (const column of orderedMetricColumns) {
      if (pinnedColumnIds.includes(column.id)) {
        offsets.set(column.id, offset)
        offset += 160
      }
    }
    return offsets
  }, [orderedMetricColumns, pinnedColumnIds])

  const metricIds = useMemo(() => metricColumns.map((column) => column.id), [metricColumns])

  const tree = useMemo(
    () => buildPivotTree(rows, dimensions, metricIds),
    [rows, dimensions, metricIds],
  )

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setExpandedKeys(new Set())
  }, [dimensions, rows])

  const visibleNodes = useMemo(
    () => flattenVisiblePivotNodes(tree, expandedKeys),
    [tree, expandedKeys],
  )

  const handleToggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSortColumn = (columnId: string) => {
    if (columnId === PIVOT_DIMENSION_COLUMN_ID) {
      onSortColumn(dimensions[0] ?? columnId)
      return
    }
    onSortColumn(columnId)
  }

  const isPivotDimensionPinned = pinnedColumnIds.includes(PIVOT_DIMENSION_COLUMN_ID)

  const stickyClass = (columnId: string, bg: string) => {
    if (columnId === PIVOT_DIMENSION_COLUMN_ID) {
      return cn("sticky left-0 z-20", bg)
    }
    if (!pinnedColumnIds.includes(columnId)) return ""
    return cn("sticky z-20", bg)
  }

  const stickyStyle = (columnId: string): React.CSSProperties | undefined => {
    if (columnId === PIVOT_DIMENSION_COLUMN_ID) {
      return { left: 0 }
    }
    if (!pinnedColumnIds.includes(columnId)) return undefined
    return { left: stickyOffsets.get(columnId) ?? 0 }
  }

  if (rows.length === 0 || tree.length === 0) return null

  return (
    <div className="relative px-6 pb-6">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white">
            <th
              style={stickyStyle(PIVOT_DIMENSION_COLUMN_ID)}
              className={cn(
                "min-w-[220px] px-3 py-3 text-left font-medium text-gray-700",
                stickyClass(PIVOT_DIMENSION_COLUMN_ID, "bg-white"),
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-blue-600"
                  onClick={() => handleSortColumn(PIVOT_DIMENSION_COLUMN_ID)}
                >
                  {dimensionHeader}
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {onTogglePin ? (
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100",
                      isPivotDimensionPinned && "text-blue-600",
                    )}
                    onClick={() => onTogglePin(PIVOT_DIMENSION_COLUMN_ID)}
                    aria-label={isPivotDimensionPinned ? "Unpin column" : "Pin column"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </th>
            {orderedMetricColumns.map((column) => {
              const isPinned = pinnedColumnIds.includes(column.id)
              return (
                <th
                  key={column.id}
                  style={stickyStyle(column.id)}
                  className={cn(
                    "min-w-[120px] px-3 py-3 text-right font-medium text-gray-700",
                    stickyClass(column.id, "bg-white"),
                  )}
                >
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                      onClick={() => handleSortColumn(column.id)}
                    >
                      {column.label}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    {onTogglePin ? (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100",
                          isPinned && "text-blue-600",
                        )}
                        onClick={() => onTogglePin(column.id)}
                        aria-label={isPinned ? "Unpin column" : "Pin column"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </th>
              )
            })}
          </tr>
          <tr className="border-b border-gray-200 bg-gray-50/60">
            <th
              style={stickyStyle(PIVOT_DIMENSION_COLUMN_ID)}
              className={cn("px-3 py-2", stickyClass(PIVOT_DIMENSION_COLUMN_ID, "bg-gray-50/60"))}
            >
              <div className="flex items-center gap-1">
                <ColumnFilterPopover
                  columnLabel={dimensionHeader}
                  columnKind="dimension"
                  active={(filtersByColumn[PIVOT_DIMENSION_COLUMN_ID] ?? []).length > 0}
                  savedConditions={filtersByColumn[PIVOT_DIMENSION_COLUMN_ID] ?? []}
                  dimensionOptions={dimensionFilterOptions}
                  onApply={(conditions) =>
                    onApplyColumnFilter(PIVOT_DIMENSION_COLUMN_ID, conditions)
                  }
                  trigger={
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100"
                      aria-label={`Filter ${dimensionHeader}`}
                    >
                      <FilterIconButton
                        active={(filtersByColumn[PIVOT_DIMENSION_COLUMN_ID] ?? []).length > 0}
                      />
                    </button>
                  }
                />
                <button
                  type="button"
                  disabled
                  className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded opacity-40"
                  aria-hidden
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </th>
            {orderedMetricColumns.map((column) => {
              const savedConditions = filtersByColumn[column.id] ?? []
              const filterActive = savedConditions.length > 0
              return (
                <th
                  key={`filter-${column.id}`}
                  style={stickyStyle(column.id)}
                  className={cn("px-3 py-2", stickyClass(column.id, "bg-gray-50/60"))}
                >
                  <div className="flex items-center justify-end gap-1">
                    <ColumnFilterPopover
                      columnLabel={column.label}
                      columnKind="metric"
                      active={filterActive}
                      savedConditions={savedConditions}
                      onApply={(conditions) => onApplyColumnFilter(column.id, conditions)}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100"
                          aria-label={`Filter ${column.label}`}
                        >
                          <FilterIconButton active={filterActive} />
                        </button>
                      }
                    />
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded opacity-40"
                      aria-hidden
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {visibleNodes.length === 0 ? (
            <tr>
              <td
                colSpan={orderedMetricColumns.length + 1}
                className="px-4 py-10 text-center text-sm text-gray-500"
              >
                No rows match the column filters.
              </td>
            </tr>
          ) : (
            visibleNodes.map((node) => (
              <PivotTreeRow
                key={node.key}
                node={node}
                orderedMetricColumns={orderedMetricColumns}
                pinnedColumnIds={pinnedColumnIds}
                stickyOffsets={stickyOffsets}
                metricCatalog={metricCatalog}
                compareActive={compareActive}
                expandedKeys={expandedKeys}
                onToggleExpand={handleToggleExpand}
              />
            ))
          )}
          <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
            <td
              style={stickyStyle(PIVOT_DIMENSION_COLUMN_ID)}
              className={cn(
                "px-3 py-3 text-gray-900",
                stickyClass(PIVOT_DIMENSION_COLUMN_ID, "bg-gray-100"),
              )}
            >
              Total
            </td>
            {orderedMetricColumns.map((column) => (
              <td
                key={column.id}
                style={stickyStyle(column.id)}
                className={cn(
                  "px-3 py-3 text-right tabular-nums text-gray-900",
                  stickyClass(column.id, "bg-gray-100"),
                )}
              >
                <PivotMetricCell
                  metricId={column.id}
                  value={
                    typeof totals[column.id] === "number"
                      ? totals[column.id]
                      : totals[column.id] == null
                        ? null
                        : Number(totals[column.id])
                  }
                  compareValue={compareTotals[column.id] ?? null}
                  deltaPct={totalsDeltaPct[column.id] ?? null}
                  metricCatalog={metricCatalog}
                  compareActive={compareActive}
                  bold
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {showReloadFab ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center">
          <Button
            type="button"
            className="pointer-events-auto h-10 gap-2 rounded-full bg-blue-600 px-5 shadow-lg hover:bg-blue-700"
            onClick={onReloadData}
          >
            <RefreshCw className="h-4 w-4" />
            {reloadLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
