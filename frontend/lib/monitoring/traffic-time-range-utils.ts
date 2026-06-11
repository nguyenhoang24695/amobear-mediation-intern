import { format } from "date-fns"

export type TrafficTimePresetId =
  | "today"
  | "yesterday"
  | "15m"
  | "30m"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "1d"
  | "2d"
  | "7d"
  | "14d"
  | "custom"

export type TrafficTimeRangeValue = {
  from: string
  to: string
}

export type TrafficTimePreset = {
  id: TrafficTimePresetId
  label: string
  shorthand: string
  resolve: () => { from: Date; to: Date }
}

function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function subtractMinutes(date: Date, minutes: number) {
  const next = new Date(date)
  next.setMinutes(next.getMinutes() - minutes)
  return next
}

function subtractHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() - hours)
  return next
}

function subtractDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() - days)
  return next
}

export const TRAFFIC_TIME_PRESETS: readonly TrafficTimePreset[] = [
  {
    id: "today",
    label: "Today",
    shorthand: "today",
    resolve: () => {
      const now = new Date()
      return { from: startOfLocalDay(now), to: now }
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    shorthand: "yesterday",
    resolve: () => {
      const day = subtractDays(new Date(), 1)
      return { from: startOfLocalDay(day), to: endOfLocalDay(day) }
    },
  },
  {
    id: "15m",
    label: "Last 15 minutes",
    shorthand: "15m",
    resolve: () => {
      const to = new Date()
      return { from: subtractMinutes(to, 15), to }
    },
  },
  {
    id: "30m",
    label: "Last 30 minutes",
    shorthand: "30m",
    resolve: () => {
      const to = new Date()
      return { from: subtractMinutes(to, 30), to }
    },
  },
  {
    id: "1h",
    label: "Last 1 hour",
    shorthand: "1h",
    resolve: () => {
      const to = new Date()
      return { from: subtractHours(to, 1), to }
    },
  },
  {
    id: "3h",
    label: "Last 3 hours",
    shorthand: "3h",
    resolve: () => {
      const to = new Date()
      return { from: subtractHours(to, 3), to }
    },
  },
  {
    id: "6h",
    label: "Last 6 hours",
    shorthand: "6h",
    resolve: () => {
      const to = new Date()
      return { from: subtractHours(to, 6), to }
    },
  },
  {
    id: "12h",
    label: "Last 12 hours",
    shorthand: "12h",
    resolve: () => {
      const to = new Date()
      return { from: subtractHours(to, 12), to }
    },
  },
  {
    id: "1d",
    label: "Last 1 day",
    shorthand: "1d",
    resolve: () => {
      const to = new Date()
      return { from: subtractDays(to, 1), to }
    },
  },
  {
    id: "2d",
    label: "Last 2 days",
    shorthand: "2d",
    resolve: () => {
      const to = new Date()
      return { from: subtractDays(to, 2), to }
    },
  },
  {
    id: "7d",
    label: "Last 7 days",
    shorthand: "7d",
    resolve: () => {
      const to = new Date()
      return { from: subtractDays(to, 7), to }
    },
  },
  {
    id: "14d",
    label: "Last 14 days",
    shorthand: "14d",
    resolve: () => {
      const to = new Date()
      return { from: subtractDays(to, 14), to }
    },
  },
] as const

export function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultTrafficTimeRange(): TrafficTimeRangeValue {
  const to = new Date()
  const from = subtractDays(to, 7)
  return { from: toDateTimeLocalValue(from), to: toDateTimeLocalValue(to) }
}

export function trafficTimeRangeToDates(value: TrafficTimeRangeValue) {
  const from = new Date(value.from)
  const to = new Date(value.to)
  return { from, to }
}

export function isTrafficTimeRangeValid(value: TrafficTimeRangeValue, maxDays = 90) {
  const { from, to } = trafficTimeRangeToDates(value)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false
  if (from.getTime() > to.getTime()) return false
  const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  return spanDays <= maxDays
}

export function localInputToIso(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function parseRelativeTrafficTimeInput(input: string): { from: Date; to: Date } | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  const preset = TRAFFIC_TIME_PRESETS.find((item) => item.shorthand === trimmed || item.id === trimmed)
  if (preset) return preset.resolve()

  const match = trimmed.match(/^(\d+)\s*(m|h|d|w)$/)
  if (!match) return null

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const to = new Date()
  const from = new Date(to)
  const unit = match[2]
  if (unit === "m") from.setMinutes(from.getMinutes() - amount)
  else if (unit === "h") from.setHours(from.getHours() - amount)
  else if (unit === "d") from.setDate(from.getDate() - amount)
  else if (unit === "w") from.setDate(from.getDate() - amount * 7)

  return { from, to }
}

function isSameMinute(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
    && a.getHours() === b.getHours()
    && a.getMinutes() === b.getMinutes()
  )
}

export function detectTrafficTimePresetId(value: TrafficTimeRangeValue): TrafficTimePresetId | "custom" {
  const { from, to } = trafficTimeRangeToDates(value)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "custom"

  for (const preset of TRAFFIC_TIME_PRESETS) {
    const resolved = preset.resolve()
    if (isSameMinute(from, resolved.from) && isSameMinute(to, resolved.to)) {
      return preset.id
    }
  }

  return "custom"
}

export function formatTrafficTimeRangeLabel(value: TrafficTimeRangeValue) {
  const presetId = detectTrafficTimePresetId(value)
  if (presetId !== "custom") {
    const preset = TRAFFIC_TIME_PRESETS.find((item) => item.id === presetId)
    if (preset) return preset.label
  }

  const { from, to } = trafficTimeRangeToDates(value)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Select time range"
  return `${format(from, "MMM d, HH:mm")} – ${format(to, "MMM d, HH:mm")}`
}

export function splitDateTimeLocal(value: string) {
  if (!value || !value.includes("T")) {
    return { date: "", time: "" }
  }
  const [date, time] = value.split("T")
  return { date, time: time.slice(0, 5) }
}

export function mergeDateTimeLocal(date: string, time: string) {
  if (!date) return ""
  return `${date}T${time || "00:00"}`
}
