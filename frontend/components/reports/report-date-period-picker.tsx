"use client"

import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { enUS } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  applyCustomRangeToDraft,
  applyPresetToDraft,
  type MyReportConfig,
} from "@/components/my-reports/hooks/use-my-report-config"
import {
  detectReportDatePeriodPresetId,
  formatReportDatePeriodFooterLabel,
  REPORT_DATE_PERIOD_PRESETS,
  type ReportDatePeriodPresetId,
} from "@/lib/reports/report-date-filter-utils"

export type ReportDatePeriodPickerProps = {
  config: Pick<MyReportConfig, "startDate" | "endDate">
  onApply: (patch: Partial<MyReportConfig>) => void
  onCancel: () => void
}

function buildDraftPatchFromRange(
  start: Date,
  end: Date,
  presetId: ReportDatePeriodPresetId | null,
): Partial<MyReportConfig> {
  const preset = presetId ? REPORT_DATE_PERIOD_PRESETS.find((p) => p.id === presetId) : null
  if (preset?.days) return applyPresetToDraft(preset.days)
  return applyCustomRangeToDraft(start, end)
}

export function ReportDatePeriodPicker({
  config,
  onApply,
  onCancel,
}: ReportDatePeriodPickerProps) {
  const [range, setRange] = useState<DateRange>(() => ({
    from: new Date(config.startDate),
    to: new Date(config.endDate),
  }))
  const [activePresetId, setActivePresetId] = useState<ReportDatePeriodPresetId | "custom" | null>(
    () => detectReportDatePeriodPresetId(config.startDate, config.endDate) ?? "custom",
  )

  useEffect(() => {
    setRange({ from: new Date(config.startDate), to: new Date(config.endDate) })
    setActivePresetId(detectReportDatePeriodPresetId(config.startDate, config.endDate) ?? "custom")
  }, [config.startDate, config.endDate])

  const footerLabel = useMemo(() => {
    if (!range.from || !range.to) return "Select a date range"
    return formatReportDatePeriodFooterLabel(range.from, range.to)
  }, [range.from, range.to])

  const canApply = Boolean(range.from && range.to)

  const handlePresetClick = (presetId: ReportDatePeriodPresetId) => {
    const preset = REPORT_DATE_PERIOD_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const { start, end } = preset.resolve()
    setRange({ from: start, to: end })
    setActivePresetId(presetId)
  }

  const handleCalendarSelect = (next: DateRange | undefined) => {
    if (!next?.from) return
    setRange(next)
    if (next.to) {
      setActivePresetId(detectReportDatePeriodPresetId(next.from, next.to) ?? "custom")
    } else {
      setActivePresetId("custom")
    }
  }

  const handleApply = () => {
    if (!range.from || !range.to) return
    const presetId = activePresetId === "custom" ? null : activePresetId
    onApply(buildDraftPatchFromRange(range.from, range.to, presetId))
  }

  return (
    <div className="flex w-[min(95vw,720px)] flex-col overflow-hidden rounded-md bg-card">
      <div className="flex min-h-0">
        <aside className="w-[148px] shrink-0 border-r border-border py-1">
          {REPORT_DATE_PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/50",
                activePresetId === preset.id && "bg-primary/10 font-medium text-primary",
              )}
              onClick={() => handlePresetClick(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </aside>

        <div className="min-w-0 flex-1 p-3">
          <Calendar
            mode="range"
            locale={enUS}
            weekStartsOn={1}
            numberOfMonths={2}
            captionLayout="dropdown"
            defaultMonth={range.from}
            selected={range}
            onSelect={handleCalendarSelect}
            className="p-0 [--cell-size:2rem]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-3">

        <span className="min-w-0 flex-1 truncate text-center text-sm text-muted-foreground">
          {footerLabel}
        </span>

        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" className="h-8 px-4" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8 bg-primary px-4 hover:bg-primary/90"
            disabled={!canApply}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
