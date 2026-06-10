import {
  differenceInCalendarDays,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import { formatAdjustStyleDateRange } from "@/lib/reports/report-date-filter-utils"
import { toApiDateString } from "@/lib/reports/report-date-filter-utils"

export type CompareToPreset =
  | "none"
  | "previous_period"
  | "day_ago"
  | "week_ago"
  | "month_ago"
  | "quarter_ago"
  | "year_ago"
  | "custom"

export const COMPARE_TO_PRESET_OPTIONS: readonly {
  id: CompareToPreset
  label: string
}[] = [
  { id: "none", label: "No comparison" },
  { id: "previous_period", label: "Previous period" },
  { id: "day_ago", label: "Day ago" },
  { id: "week_ago", label: "Week ago" },
  { id: "month_ago", label: "Month ago" },
  { id: "quarter_ago", label: "Quarter ago" },
  { id: "year_ago", label: "Year ago" },
  { id: "custom", label: "Custom date" },
]

export function isCompareActive(preset: CompareToPreset): boolean {
  return preset !== "none"
}

export function resolveCompareDateRange(
  primaryStart: Date,
  primaryEnd: Date,
  preset: CompareToPreset,
  customStart?: Date,
  customEnd?: Date,
): { start: Date; end: Date } | null {
  if (preset === "none") return null
  if (preset === "custom") {
    if (!customStart || !customEnd) return null
    return { start: customStart, end: customEnd }
  }

  const start = new Date(primaryStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(primaryEnd)
  end.setHours(0, 0, 0, 0)

  switch (preset) {
    case "previous_period": {
      const spanDays = differenceInCalendarDays(end, start) + 1
      const compareEnd = subDays(start, 1)
      const compareStart = subDays(compareEnd, spanDays - 1)
      return { start: compareStart, end: compareEnd }
    }
    case "day_ago":
      return { start: subDays(start, 1), end: subDays(end, 1) }
    case "week_ago":
      return { start: subWeeks(start, 1), end: subWeeks(end, 1) }
    case "month_ago":
      return { start: subMonths(start, 1), end: subMonths(end, 1) }
    case "quarter_ago":
      return { start: subMonths(start, 3), end: subMonths(end, 3) }
    case "year_ago":
      return { start: subYears(start, 1), end: subYears(end, 1) }
    default:
      return null
  }
}

export function formatCompareRangeLabel(
  primaryStart: Date,
  primaryEnd: Date,
  preset: CompareToPreset,
  customStart?: Date,
  customEnd?: Date,
): string {
  if (preset === "none") return "No comparison"
  const option = COMPARE_TO_PRESET_OPTIONS.find((o) => o.id === preset)
  if (preset !== "custom") return option?.label ?? "Compare"
  const range = resolveCompareDateRange(primaryStart, primaryEnd, preset, customStart, customEnd)
  if (!range) return "Custom date"
  return formatAdjustStyleDateRange(range.start, range.end)
}

export function buildDimensionRowKey(
  row: Record<string, string | number | null>,
  dimensions: string[],
): string {
  return dimensions.map((dim) => String(row[dim] ?? "")).join("\u001f")
}

export type CompareEnrichedRow = Record<string, string | number | null> & {
  __compare?: Record<string, number | null>
  __deltaPct?: Record<string, number | null>
}

export function computeDeltaPercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function toNumeric(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function mergeCompareRows(
  primaryRows: Record<string, string | number | null>[],
  compareRows: Record<string, string | number | null>[],
  dimensions: string[],
  metrics: string[],
): CompareEnrichedRow[] {
  const compareByKey = new Map<string, Record<string, string | number | null>>()
  for (const row of compareRows) {
    compareByKey.set(buildDimensionRowKey(row, dimensions), row)
  }

  return primaryRows.map((row) => {
    const key = buildDimensionRowKey(row, dimensions)
    const compareRow = compareByKey.get(key)
    const __compare: Record<string, number | null> = {}
    const __deltaPct: Record<string, number | null> = {}

    for (const metricId of metrics) {
      const current = toNumeric(row[metricId])
      const previous = compareRow ? toNumeric(compareRow[metricId]) : null
      __compare[metricId] = previous
      __deltaPct[metricId] = computeDeltaPercent(current, previous)
    }

    return { ...row, __compare, __deltaPct }
  })
}

export function mergeCompareTotals(
  primaryTotals: Record<string, string | number | null>,
  compareTotals: Record<string, string | number | null> | null,
  metrics: string[],
): {
  totals: Record<string, string | number | null>
  compareTotals: Record<string, number | null>
  deltaPct: Record<string, number | null>
} {
  const compare: Record<string, number | null> = {}
  const deltaPct: Record<string, number | null> = {}

  for (const metricId of metrics) {
    const current = toNumeric(primaryTotals[metricId])
    const previous = compareTotals ? toNumeric(compareTotals[metricId]) : null
    compare[metricId] = previous
    deltaPct[metricId] = computeDeltaPercent(current, previous)
  }

  return { totals: primaryTotals, compareTotals: compare, deltaPct }
}

export function buildCompareQueryDates(
  primaryStart: Date,
  primaryEnd: Date,
  preset: CompareToPreset,
  customStart?: Date,
  customEnd?: Date,
): { from: string; to: string } | null {
  const range = resolveCompareDateRange(primaryStart, primaryEnd, preset, customStart, customEnd)
  if (!range) return null
  return { from: toApiDateString(range.start), to: toApiDateString(range.end) }
}
