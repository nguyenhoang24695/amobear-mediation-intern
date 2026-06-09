import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns"
import { enUS } from "date-fns/locale"

export type ReportDateFilterMode = "preset" | "month" | "custom"

export const REPORT_DATE_PRESETS = [
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
] as const

export type ReportDatePeriodPresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "last14"
  | "last30"
  | "last3months"
  | "lastMonth"
  | "lastWeek"
  | "thisMonth"
  | "thisWeek"

export type ReportDatePeriodPreset = {
  id: ReportDatePeriodPresetId
  label: string
  days?: number
  resolve: () => { start: Date; end: Date }
}

function normalizeDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function today(): Date {
  return normalizeDay(new Date())
}

/** Preset sidebar cho Date Period picker (Adjust-style). */
export const REPORT_DATE_PERIOD_PRESETS: readonly ReportDatePeriodPreset[] = [
  {
    id: "today",
    label: "Today",
    resolve: () => {
      const t = today()
      return { start: t, end: t }
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    resolve: () => {
      const y = subDays(today(), 1)
      return { start: y, end: y }
    },
  },
  {
    id: "last7",
    label: "Last 7 Days",
    days: 7,
    resolve: () => {
      const end = today()
      return { start: subDays(end, 6), end }
    },
  },
  {
    id: "last14",
    label: "Last 14 Days",
    days: 14,
    resolve: () => {
      const end = today()
      return { start: subDays(end, 13), end }
    },
  },
  {
    id: "last30",
    label: "Last 30 Days",
    days: 30,
    resolve: () => {
      const end = today()
      return { start: subDays(end, 29), end }
    },
  },
  {
    id: "last3months",
    label: "Last 3 Months",
    resolve: () => {
      const end = today()
      return { start: startOfMonth(subMonths(end, 2)), end }
    },
  },
  {
    id: "lastMonth",
    label: "Last Month",
    resolve: () => {
      const m = subMonths(today(), 1)
      return { start: startOfMonth(m), end: endOfMonth(m) }
    },
  },
  {
    id: "lastWeek",
    label: "Last Week",
    resolve: () => {
      const ref = subWeeks(today(), 1)
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      }
    },
  },
  {
    id: "thisMonth",
    label: "This Month",
    resolve: () => {
      const end = today()
      return { start: startOfMonth(end), end }
    },
  },
  {
    id: "thisWeek",
    label: "This Week",
    resolve: () => {
      const end = today()
      return { start: startOfWeek(end, { weekStartsOn: 1 }), end }
    },
  },
]

export function resolvePresetDateRange(days: number): { start: Date; end: Date } {
  const end = today()
  const start = subDays(end, days - 1)
  return { start, end }
}

export function resolveMonthDateRange(month: Date): { start: Date; end: Date } {
  return { start: startOfMonth(month), end: endOfMonth(month) }
}

export function formatReportDateRangeLabel(start: Date, end: Date): string {
  return `${format(start, "M/d/yyyy", { locale: enUS })} – ${format(end, "M/d/yyyy", { locale: enUS })}`
}

export function formatReportDatePeriodFooterLabel(start: Date, end: Date): string {
  return `${format(start, "dd MMM", { locale: enUS })} - ${format(end, "dd MMM", { locale: enUS })}`
}

export function detectReportDatePeriodPresetId(
  start: Date,
  end: Date,
): ReportDatePeriodPresetId | null {
  const s = normalizeDay(start)
  const e = normalizeDay(end)
  for (const preset of REPORT_DATE_PERIOD_PRESETS) {
    const range = preset.resolve()
    if (isSameDay(range.start, s) && isSameDay(range.end, e)) return preset.id
  }
  return null
}

export function toApiDateString(date: Date): string {
  return format(date, "yyyy-MM-dd")
}
