"use client"

import type { CohortRow, CohortSource } from "@/types/app-dashboard"
import { cn } from "@/lib/utils"
import { formatCount, formatPercent } from "../format"

interface CohortTableProps {
  title: string
  subtitle: string
  source: CohortSource | undefined
  loading: boolean
  /** Nhãn cột, vd day=1 → "1D". */
  formatDayLabel?: (day: number) => string
  /** Empty-state khi không có data. */
  emptyLabel: string
  /** Ghi chú nhỏ dưới bảng (vd Adjust thiếu daily). */
  note?: string
}

const HEATMAP_BASE = "147, 51, 234" // tailwind purple-600 rgb
const MAX_VISIBLE_COHORT_ROWS = 7

export function CohortTable({
  title,
  subtitle,
  source,
  loading,
  formatDayLabel = (day) => `${day}D`,
  emptyLabel,
  note,
}: CohortTableProps) {
  const dayOffsets = source?.day_offsets ?? []
  const rows = source?.rows ?? []
  const maxValue = computeMax(rows)
  const constrainRows = rows.length > MAX_VISIBLE_COHORT_ROWS

  return (
    <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {loading && !source ? <CohortSkeleton /> : null}

      {!loading && source && rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
      ) : null}

      {source && rows.length > 0 ? (
        <div className={cn("mt-4 overflow-x-auto", constrainRows && "max-h-[324px] overflow-y-auto pr-1")}>
          <table className="min-w-full border-separate border-spacing-0 text-right text-sm">
            <thead className={cn(constrainRows && "sticky top-0 z-20 bg-card/90")}>
              <tr className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card/90 px-3 py-2 text-left">Install date</th>
                <th className="px-3 py-2 text-right">Users</th>
                {dayOffsets.map((day) => (
                  <th key={day} className="px-3 py-2 text-right">
                    {formatDayLabel(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CohortTableRow key={row.install_date} row={row} maxValue={maxValue} />
              ))}
              {source.total ? <CohortTableRow row={source.total} maxValue={maxValue} isTotal /> : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
    </section>
  )
}

function CohortTableRow({ row, maxValue, isTotal = false }: { row: CohortRow; maxValue: number; isTotal?: boolean }) {
  const labelClass = isTotal
    ? "sticky left-0 z-10 bg-card/90 px-3 py-2 text-left font-semibold text-foreground"
    : "sticky left-0 z-10 bg-card/90 px-3 py-2 text-left text-muted-foreground"

  return (
    <tr className={isTotal ? "border-t border-border/70" : undefined}>
      <td className={labelClass}>{row.install_date}</td>
      <td className={`px-3 py-2 text-right ${isTotal ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {formatCount(row.users)}
      </td>
      {row.retention.map((value, index) => (
        <td
          key={index}
          className={`px-3 py-2 text-right ${isTotal ? "font-semibold text-foreground" : "text-foreground"}`}
          style={value != null ? { backgroundColor: heatmapColor(value, maxValue) } : undefined}
        >
          {value == null ? "â€”" : formatPercent(value, value < 10 ? 2 : 1)}
        </td>
      ))}
    </tr>
  )
}

function CohortSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 6 }, (_, i) => i).map((i) => (
        <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  )
}

function computeMax(rows: CohortRow[]): number {
  let max = 0
  for (const row of rows) {
    for (const value of row.retention) {
      if (value != null && value > max) max = value
    }
  }
  return max
}

function heatmapColor(value: number, maxValue: number): string {
  if (maxValue <= 0 || value <= 0) return "transparent"
  // Tô đậm theo tỷ lệ value/max, opacity 0.08 → 0.85.
  const intensity = Math.min(1, value / maxValue)
  const alpha = 0.08 + intensity * 0.77
  return `rgba(${HEATMAP_BASE}, ${alpha.toFixed(3)})`
}
