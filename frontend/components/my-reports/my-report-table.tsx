"use client"

import { useMemo } from "react"
import { ArrowUpDown, Filter, MoreHorizontal, RefreshCw } from "lucide-react"
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

export type MyReportTableColumn = {
  id: string
  label: string
  kind: ColumnKind
}

export type MyReportTableProps = {
  columns: MyReportTableColumn[]
  rows: Record<string, string | number | null>[]
  totals: Record<string, string | number | null>
  metricCatalog: CustomReportCatalogItem[]
  sortBy?: string
  filtersByColumn: Record<string, ColumnFilterCondition[]>
  filtersLive: boolean
  showReloadFab: boolean
  reloadLabel?: string
  onSortColumn: (columnId: string) => void
  onApplyColumnFilter: (columnId: string, conditions: ColumnFilterCondition[]) => void
  onReloadData: () => void
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

export function MyReportTable({
  columns,
  rows,
  totals,
  metricCatalog,
  filtersByColumn,
  filtersLive,
  showReloadFab,
  reloadLabel = "Reload Data",
  onSortColumn,
  onApplyColumnFilter,
  onReloadData,
}: MyReportTableProps) {
  const metricColumns = useMemo(() => columns.filter((c) => c.kind === "metric"), [columns])

  const displayRows = useMemo(() => {
    if (!filtersLive || !hasActiveColumnFilters(filtersByColumn)) return rows
    return filterReportRowsByColumnFilters(rows, filtersByColumn, columns)
  }, [rows, filtersByColumn, filtersLive, columns])

  const displayTotals = useMemo(() => {
    if (!filtersLive || !hasActiveColumnFilters(filtersByColumn)) return totals
    const metricIds = metricColumns.map((c) => c.id)
    const computed = computeFilteredMetricTotals(displayRows, metricIds)
    return { ...totals, ...computed }
  }, [totals, displayRows, filtersLive, filtersByColumn, metricColumns])

  if (rows.length === 0) return null

  return (
    <div className="relative">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-white">
            {columns.map((column, index) => (
              <th
                key={column.id}
                className={cn(
                  "min-w-[120px] px-4 py-3 font-medium text-gray-700",
                  column.kind === "metric" ? "text-right" : "text-left",
                  index === 0 && column.kind === "dimension" && "sticky left-0 z-20 bg-white",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-blue-600",
                    column.kind === "metric" && "w-full justify-end",
                  )}
                  onClick={() => onSortColumn(column.id)}
                >
                  {column.label}
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </th>
            ))}
          </tr>
          <tr className="border-b border-gray-200 bg-gray-50/60">
            {columns.map((column, index) => {
              const savedConditions = filtersByColumn[column.id] ?? []
              const filterActive = savedConditions.length > 0
              return (
                <th
                  key={`filter-${column.id}`}
                  className={cn(
                    "px-4 py-2",
                    index === 0 && column.kind === "dimension" && "sticky left-0 z-20 bg-gray-50/60",
                  )}
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
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-500">
                No rows match the column filters.
              </td>
            </tr>
          ) : (
            displayRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                {columns.map((column, colIndex) => (
                  <td
                    key={`${idx}-${column.id}`}
                    className={cn(
                      "px-4 py-3 text-gray-900",
                      column.kind === "metric" && "text-right tabular-nums",
                      colIndex === 0 &&
                        column.kind === "dimension" &&
                        "sticky left-0 z-10 bg-white",
                    )}
                  >
                    {column.kind === "dimension"
                      ? formatDimensionCell(column.id, row)
                      : formatMetricValue(row[column.id], column.id, metricCatalog)}
                  </td>
                ))}
              </tr>
            ))
          )}
          <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
            {columns.map((column, colIndex) => (
              <td
                key={`total-${column.id}`}
                className={cn(
                  "px-4 py-3 text-gray-900",
                  column.kind === "metric" && "text-right tabular-nums",
                  colIndex === 0 &&
                    column.kind === "dimension" &&
                    "sticky left-0 z-10 bg-gray-100",
                )}
              >
                {column.kind === "dimension" && colIndex === 0
                  ? "Total"
                  : column.kind === "metric"
                    ? formatMetricValue(displayTotals[column.id], column.id, metricCatalog)
                    : ""}
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
