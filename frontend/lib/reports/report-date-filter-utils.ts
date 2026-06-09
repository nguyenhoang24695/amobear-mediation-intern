import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { enUS } from "date-fns/locale"

export type ReportDateFilterMode = "preset" | "month" | "custom"

export const REPORT_DATE_PRESETS = [
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
] as const

export function resolvePresetDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = subDays(end, days - 1)
  return { start, end }
}

export function resolveMonthDateRange(month: Date): { start: Date; end: Date } {
  return { start: startOfMonth(month), end: endOfMonth(month) }
}

export function formatReportDateRangeLabel(start: Date, end: Date): string {
  return `${format(start, "M/d/yyyy", { locale: enUS })} – ${format(end, "M/d/yyyy", { locale: enUS })}`
}

export function toApiDateString(date: Date): string {
  return format(date, "yyyy-MM-dd")
}
