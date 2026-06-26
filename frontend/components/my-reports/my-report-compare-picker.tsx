"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  COMPARE_TO_PRESET_OPTIONS,
  resolveCompareDateRange,
  type CompareToPreset,
} from "@/lib/reports/my-report-compare-utils"
import { formatAdjustStyleDateRange } from "@/lib/reports/report-date-filter-utils"
import { resolveMyReportDateRange } from "@/components/my-reports/hooks/use-my-report-config"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"

export type MyReportComparePickerProps = {
  draft: MyReportConfig
  onApply: (patch: Partial<MyReportConfig>) => void
  onCancel: () => void
}

export function MyReportComparePicker({ draft, onApply, onCancel }: MyReportComparePickerProps) {
  const [preset, setPreset] = useState<CompareToPreset>(draft.compareToPreset)
  const [range, setRange] = useState<DateRange>(() => ({
    from: new Date(draft.compareCustomStart),
    to: new Date(draft.compareCustomEnd),
  }))

  const primaryRange = resolveMyReportDateRange(draft)

  const previewRange = useMemo(() => {
    if (preset === "none") return null
    return resolveCompareDateRange(
      primaryRange.start,
      primaryRange.end,
      preset,
      range.from,
      range.to ?? range.from,
    )
  }, [preset, primaryRange.end, primaryRange.start, range.from, range.to])

  const handleApply = () => {
    if (preset === "none") {
      onApply({ compareToPreset: "none" })
      return
    }
    if (preset === "custom") {
      if (!range.from || !range.to) return
      onApply({
        compareToPreset: "custom",
        compareCustomStart: range.from,
        compareCustomEnd: range.to,
      })
      return
    }
    const resolved = resolveCompareDateRange(primaryRange.start, primaryRange.end, preset)
    if (!resolved) return
    onApply({
      compareToPreset: preset,
      compareCustomStart: resolved.start,
      compareCustomEnd: resolved.end,
    })
  }

  return (
    <div className="flex w-[min(95vw,640px)] flex-col sm:flex-row">
      <div className="w-full shrink-0 border-b border-border sm:w-48 sm:border-b-0 sm:border-r">
        <div className="p-2">
          {COMPARE_TO_PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreset(option.id)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm",
                preset === option.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground hover:bg-muted/60",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {preset === "custom" ? (
          <Calendar
            mode="range"
            selected={range}
            onSelect={(next) => next && setRange(next)}
            numberOfMonths={2}
            locale={enUS}
            className="p-3"
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center p-6 text-sm text-muted-foreground">
            {preset === "none" ? (
              <p>Comparison disabled. Metrics show primary period only.</p>
            ) : previewRange ? (
              <p>
                Compare range:{" "}
                <span className="font-medium text-foreground">
                  {formatAdjustStyleDateRange(previewRange.start, previewRange.end)}
                </span>
              </p>
            ) : (
              <p>Select a comparison preset.</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="bg-primary hover:bg-primary/90" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
