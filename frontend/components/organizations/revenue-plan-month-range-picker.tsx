"use client"

import { useEffect, useMemo, useState } from "react"
import { addMonths, format, parse, startOfMonth, subMonths } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarRange, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type MonthRange = {
  startMonth: string
  endMonth: string
}

export type MonthRangePresetId = "last3" | "last6" | "lastYear" | "thisYear"

type MonthRangePreset = {
  id: MonthRangePresetId
  label: string
  resolve: () => MonthRange
}

function parseMonthValue(month: string): Date {
  const parsed = parse(month, "yyyy-MM", new Date())
  return Number.isNaN(parsed.getTime()) ? startOfMonth(new Date()) : parsed
}

function toMonthKey(date: Date): string {
  return format(startOfMonth(date), "yyyy-MM")
}

function normalizeMonthRange(startMonth: string, endMonth: string): MonthRange {
  if (startMonth > endMonth) {
    return { startMonth: endMonth, endMonth: startMonth }
  }
  return { startMonth, endMonth }
}

function formatMonthLabel(month: string): string {
  return format(parseMonthValue(month), "MMMM yyyy", { locale: enUS })
}

export function enumerateMonthKeys(startMonth: string, endMonth: string): string[] {
  const range = normalizeMonthRange(startMonth, endMonth)
  const keys: string[] = []
  let cursor = parseMonthValue(range.startMonth)
  const end = parseMonthValue(range.endMonth)
  while (cursor <= end) {
    keys.push(toMonthKey(cursor))
    cursor = addMonths(cursor, 1)
  }
  return keys
}

export function formatMonthTableHeader(month: string): string {
  return format(parseMonthValue(month), "MMM yyyy", { locale: enUS })
}

export function formatMonthRangeLabel({ startMonth, endMonth }: MonthRange): string {
  if (startMonth === endMonth) return formatMonthLabel(startMonth)
  return `${formatMonthLabel(startMonth)} – ${formatMonthLabel(endMonth)}`
}

export function shiftMonthRange(range: MonthRange, delta: number): MonthRange {
  return normalizeMonthRange(
    format(addMonths(parseMonthValue(range.startMonth), delta), "yyyy-MM"),
    format(addMonths(parseMonthValue(range.endMonth), delta), "yyyy-MM"),
  )
}

function currentMonthRange(): MonthRange {
  const current = toMonthKey(new Date())
  return { startMonth: current, endMonth: current }
}

const MONTH_RANGE_PRESETS: readonly MonthRangePreset[] = [
  {
    id: "last3",
    label: "Last 3 Months",
    resolve: () => {
      const end = startOfMonth(new Date())
      return normalizeMonthRange(toMonthKey(subMonths(end, 2)), toMonthKey(end))
    },
  },
  {
    id: "last6",
    label: "Last 6 Months",
    resolve: () => {
      const end = startOfMonth(new Date())
      return normalizeMonthRange(toMonthKey(subMonths(end, 5)), toMonthKey(end))
    },
  },
  {
    id: "lastYear",
    label: "Last Year",
    resolve: () => {
      const year = new Date().getFullYear() - 1
      return { startMonth: `${year}-01`, endMonth: `${year}-12` }
    },
  },
  {
    id: "thisYear",
    label: "This Year",
    resolve: () => {
      const year = new Date().getFullYear()
      return { startMonth: `${year}-01`, endMonth: `${year}-12` }
    },
  },
]

function detectMonthRangePresetId(range: MonthRange): MonthRangePresetId | null {
  const normalized = normalizeMonthRange(range.startMonth, range.endMonth)
  for (const preset of MONTH_RANGE_PRESETS) {
    const resolved = preset.resolve()
    if (
      resolved.startMonth === normalized.startMonth &&
      resolved.endMonth === normalized.endMonth
    ) {
      return preset.id
    }
  }
  return null
}

export type RevenuePlanMonthRangePickerProps = {
  value: MonthRange
  onChange: (range: MonthRange) => void
  className?: string
}

export function RevenuePlanMonthRangePicker({
  value,
  onChange,
  className,
}: RevenuePlanMonthRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MonthRange>(() => normalizeMonthRange(value.startMonth, value.endMonth))
  const [activePresetId, setActivePresetId] = useState<MonthRangePresetId | "custom" | null>(() =>
    detectMonthRangePresetId(value) ?? "custom",
  )

  useEffect(() => {
    if (!open) return
    const normalized = normalizeMonthRange(value.startMonth, value.endMonth)
    setDraft(normalized)
    setActivePresetId(detectMonthRangePresetId(normalized) ?? "custom")
  }, [open, value.startMonth, value.endMonth])

  const footerLabel = useMemo(() => formatMonthRangeLabel(draft), [draft])

  const handlePresetClick = (presetId: MonthRangePresetId) => {
    const preset = MONTH_RANGE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    const next = preset.resolve()
    setDraft(next)
    setActivePresetId(presetId)
  }

  const handleDraftMonthChange = (field: "startMonth" | "endMonth", nextValue: string) => {
    if (!nextValue) return
    const next = normalizeMonthRange(
      field === "startMonth" ? nextValue : draft.startMonth,
      field === "endMonth" ? nextValue : draft.endMonth,
    )
    setDraft(next)
    setActivePresetId(detectMonthRangePresetId(next) ?? "custom")
  }

  const handleApply = () => {
    onChange(normalizeMonthRange(draft.startMonth, draft.endMonth))
    setOpen(false)
  }

  const handleCancel = () => {
    setDraft(normalizeMonthRange(value.startMonth, value.endMonth))
    setActivePresetId(detectMonthRangePresetId(value) ?? "custom")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-9 min-w-[220px] justify-between bg-white px-3 font-normal", className)}
          aria-label="Select month range"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate text-sm text-slate-900">{formatMonthRangeLabel(value)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex w-[min(95vw,560px)] flex-col overflow-hidden rounded-md bg-white">
          <div className="flex min-h-0">
            <aside className="w-[148px] shrink-0 border-r border-slate-100 py-1">
              {MONTH_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50",
                    activePresetId === preset.id && "bg-blue-50 font-medium text-blue-600",
                  )}
                  onClick={() => handlePresetClick(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </aside>

            <div className="min-w-0 flex-1 space-y-4 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="revenue-plan-start-month">Start Month</Label>
                <Input
                  id="revenue-plan-start-month"
                  type="month"
                  value={draft.startMonth}
                  onChange={(event) => handleDraftMonthChange("startMonth", event.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revenue-plan-end-month">End Month</Label>
                <Input
                  id="revenue-plan-end-month"
                  type="month"
                  value={draft.endMonth}
                  onChange={(event) => handleDraftMonthChange("endMonth", event.target.value)}
                  className="h-9 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-center text-sm text-slate-600">{footerLabel}</span>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" className="h-8 px-4" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" className="h-8 bg-blue-600 px-4 hover:bg-blue-700" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function createDefaultMonthRange(): MonthRange {
  return currentMonthRange()
}
