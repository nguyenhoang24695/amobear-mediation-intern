"use client"

import type { CustomReportCatalogItem } from "@/types/reports"
import { formatMetricValue } from "@/lib/reports/report-format-utils"
import type { PivotResult } from "@/lib/reports/pivot-utils"
import { cn } from "@/lib/utils"

export type MyReportPivotTableProps = {
  pivot: PivotResult
  metricId: string
  metricCatalog: CustomReportCatalogItem[]
}

export function MyReportPivotTable({ pivot, metricId, metricCatalog }: MyReportPivotTableProps) {
  return (
    <div className="overflow-auto px-6 pb-6">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
              Row
            </th>
            {pivot.columns.map((column) => (
              <th key={column.id} className="px-3 py-2 text-right font-medium text-gray-700">
                {column.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-semibold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {pivot.rows.map((row) => (
            <tr key={row.rowKey} className="border-b border-gray-100 hover:bg-gray-50/60">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-800">
                {row.rowLabel}
              </td>
              {pivot.columns.map((column) => (
                <td key={column.id} className="px-3 py-2 text-right tabular-nums text-gray-700">
                  {formatMetricValue(row.cells[column.id], metricId, metricCatalog)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-900">
                {formatMetricValue(row.rowTotal, metricId, metricCatalog)}
              </td>
            </tr>
          ))}
          <tr className={cn("border-t border-gray-200 bg-gray-50 font-semibold")}>
            <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-gray-900">Total</td>
            {pivot.columns.map((column) => (
              <td key={column.id} className="px-3 py-2 text-right tabular-nums text-gray-900">
                {formatMetricValue(pivot.colTotals[column.id], metricId, metricCatalog)}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums text-gray-900">
              {formatMetricValue(pivot.grandTotal, metricId, metricCatalog)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
