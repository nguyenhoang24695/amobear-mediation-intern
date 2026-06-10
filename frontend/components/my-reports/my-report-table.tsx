"use client"

import { useMemo } from "react"
import { ArrowUpDown, Filter, MoreHorizontal, Pin, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ColumnFilterPopover } from "@/components/my-reports/column-filter-popover"
import {
  computeFilteredMetricTotals,
  filterReportRowsByColumnFilters,
  hasActiveColumnFilters,
  type ColumnFilterCondition,
  type ColumnKind,
} from "@/lib/reports/column-filter-utils"
import { formatDimensionCell, formatMetricValue } from "@/lib/reports/report-format-utils"
import type { CustomReportCatalogItem } from "@/types/reports"
import type { CompareEnrichedRow } from "@/lib/reports/my-report-compare-utils"

export type MyReportTableColumn = {
  id: string
  label: string
  kind: ColumnKind
}

export type MyReportTableProps = {
  columns: MyReportTableColumn[]
  rows: CompareEnrichedRow[]
  totals: Record<string, string | number | null>
  metricCatalog: CustomReportCatalogItem[]
  compareActive?: boolean
  compareTotals?: Record<string, number | null>
  totalsDeltaPct?: Record<string, number | null>
  pinnedColumnIds?: string[]
  filtersByColumn: Record<string, ColumnFilterCondition[]>
  filtersLive: boolean
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

function MetricCompareCell({
  row,
  metricId,
  metricCatalog,
  compareActive,
}: {
  row: CompareEnrichedRow
  metricId: string
  metricCatalog: CustomReportCatalogItem[]
  compareActive: boolean
}) {
  const current = formatMetricValue(row[metricId], metricId, metricCatalog)
  if (!compareActive) return <span>{current}</span>

  const previous = row.__compare?.[metricId]
  const delta = row.__deltaPct?.[metricId]
  const previousLabel =
    previous == null ? "—" : formatMetricValue(previous, metricId, metricCatalog)

  return (
    <div className="space-y-0.5">
      <div>{current}</div>
      <div className="text-xs font-normal text-gray-500">
        {previousLabel}{" "}
        <span
          className={cn(
            delta != null && delta > 0 && "text-emerald-600",
            delta != null && delta < 0 && "text-red-600",
          )}
        >
          ({formatDeltaPct(delta)})
        </span>
      </div>
    </div>
  )
}

export function MyReportTable({
  columns,
  rows,
  totals,
  metricCatalog,
  compareActive = false,
  compareTotals = {},
  totalsDeltaPct = {},
  pinnedColumnIds = [],
  filtersByColumn,
  filtersLive,
  showReloadFab,
  reloadLabel = "Reload Data",
  onSortColumn,
  onApplyColumnFilter,
  onReloadData,
  onTogglePin,
}: MyReportTableProps) {
  const metricColumns = useMemo(() => columns.filter((c) => c.kind === "metric"), [columns])

  const orderedColumns = useMemo(() => {
    if (pinnedColumnIds.length === 0) return columns
    const pinned = pinnedColumnIds
      .map((id) => columns.find((c) => c.id === id))
      .filter((c): c is MyReportTableColumn => Boolean(c))
    const pinnedSet = new Set(pinned.map((c) => c.id))
    const rest = columns.filter((c) => !pinnedSet.has(c.id))
    return [...pinned, ...rest]
  }, [columns, pinnedColumnIds])

  const stickyOffsets = useMemo(() => {
    const offsets = new Map<string, number>()
    let offset = 0
    for (const column of orderedColumns) {
      if (pinnedColumnIds.includes(column.id)) {
        offsets.set(column.id, offset)
        offset += column.kind === "dimension" ? 140 : 160
      }
    }
    return offsets
  }, [orderedColumns, pinnedColumnIds])

  const displayRows = useMemo(() => {
    if (!filtersLive || !hasActiveColumnFilters(filtersByColumn)) return rows
    return filterReportRowsByColumnFilters(rows, filtersByColumn, columns) as CompareEnrichedRow[]
  }, [rows, filtersByColumn, filtersLive, columns])

  const displayTotals = useMemo(() => {
    if (!filtersLive || !hasActiveColumnFilters(filtersByColumn)) return totals
    const metricIds = metricColumns.map((c) => c.id)
    const computed = computeFilteredMetricTotals(displayRows, metricIds)
    return { ...totals, ...computed }
  }, [totals, displayRows, filtersLive, filtersByColumn, metricColumns])

  const stickyClass = (columnId: string, bg: string) => {
    if (!pinnedColumnIds.includes(columnId)) return ""
    const left = stickyOffsets.get(columnId) ?? 0
    return cn("sticky z-20", bg)
  }

  const stickyStyle = (columnId: string): React.CSSProperties | undefined => {
    if (!pinnedColumnIds.includes(columnId)) return undefined
    return { left: stickyOffsets.get(columnId) ?? 0 }
  }

  if (rows.length === 0) return null

  return (
    <div className="relative">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white">
            {orderedColumns.map((column) => {
              const isPinned = pinnedColumnIds.includes(column.id)
              return (
                <th
                  key={column.id}
                  style={stickyStyle(column.id)}
                  className={cn(
                    "min-w-[120px] px-4 py-3 font-medium text-gray-700",
                    column.kind === "metric" ? "text-right" : "text-left",
                    stickyClass(column.id, "bg-white"),
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      column.kind === "metric" ? "justify-end" : "justify-start",
                    )}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-blue-600"
                      onClick={() => onSortColumn(column.id)}
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
            {orderedColumns.map((column) => {
              const savedConditions = filtersByColumn[column.id] ?? []
              const filterActive = savedConditions.length > 0
              return (
                <th
                  key={`filter-${column.id}`}
                  style={stickyStyle(column.id)}
                  className={cn("px-4 py-2", stickyClass(column.id, "bg-gray-50/60"))}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      column.kind === "metric" ? "justify-end" : "justify-start",
                    )}
                  >
                    <ColumnFilterPopover
                      columnLabel={column.label}
                      columnKind={column.kind}
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
          {displayRows.length === 0 ? (
            <tr>
              <td colSpan={orderedColumns.length} className="px-4 py-10 text-center text-sm text-gray-500">
                No rows match the column filters.
              </td>
            </tr>
          ) : (
            displayRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                {orderedColumns.map((column) => (
                  <td
                    key={`${idx}-${column.id}`}
                    style={stickyStyle(column.id)}
                    className={cn(
                      "px-4 py-3 text-gray-900",
                      column.kind === "metric" && "text-right tabular-nums",
                      stickyClass(column.id, "bg-white"),
                    )}
                  >
                    {column.kind === "dimension" ? (
                      formatDimensionCell(column.id, row)
                    ) : (
                      <MetricCompareCell
                        row={row}
                        metricId={column.id}
                        metricCatalog={metricCatalog}
                        compareActive={compareActive}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
          <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
            {orderedColumns.map((column, colIndex) => (
              <td
                key={`total-${column.id}`}
                style={stickyStyle(column.id)}
                className={cn(
                  "px-4 py-3 text-gray-900",
                  column.kind === "metric" && "text-right tabular-nums",
                  stickyClass(column.id, "bg-gray-100"),
                )}
              >
                {column.kind === "dimension" && colIndex === 0 ? (
                  "Total"
                ) : column.kind === "metric" ? (
                  compareActive ? (
                    <MetricCompareCell
                      row={{
                        [column.id]: displayTotals[column.id],
                        __compare: { [column.id]: compareTotals[column.id] ?? null },
                        __deltaPct: { [column.id]: totalsDeltaPct[column.id] ?? null },
                      }}
                      metricId={column.id}
                      metricCatalog={metricCatalog}
                      compareActive
                    />
                  ) : (
                    formatMetricValue(displayTotals[column.id], column.id, metricCatalog)
                  )
                ) : (
                  ""
                )}
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
