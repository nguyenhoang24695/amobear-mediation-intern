"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DateRangePreset = "today" | "7days" | "30days" | "custom"

export interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  presets?: DateRangePreset[]
  defaultPreset?: DateRangePreset
  className?: string
}

const getPresetRange = (preset: DateRangePreset): DateRange => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "7days":
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // Include today, so 6 days ago
      return { from: sevenDaysAgo, to: today }
    case "30days":
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29) // Include today, so 29 days ago
      return { from: thirtyDaysAgo, to: today }
    default:
      return { from: today, to: today }
  }
}

/** Detect xem DateRange có khớp với preset nào không (so sánh số ngày) */
function detectPreset(range: DateRange): DateRangePreset {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fromTime = new Date(range.from)
  fromTime.setHours(0, 0, 0, 0)
  const toTime = new Date(range.to)
  toTime.setHours(0, 0, 0, 0)
  const diffDays = Math.round((toTime.getTime() - fromTime.getTime()) / 86_400_000)
  const toIsToday = toTime.getTime() === today.getTime()
  if (toIsToday && diffDays === 0) return "today"
  if (toIsToday && diffDays === 6) return "7days"
  if (toIsToday && diffDays === 29) return "30days"
  return "custom"
}

export function DateRangePicker({
  value,
  onChange,
  presets = ["today", "7days", "30days", "custom"],
  defaultPreset,
  className,
}: DateRangePickerProps) {
  const initialPreset = React.useMemo(() => {
    if (value) return detectPreset(value)
    return defaultPreset ?? "7days"
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial preset only

  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>(initialPreset)
  const [isCustomOpen, setIsCustomOpen] = React.useState(false)

  // Initialize with default range if no value provided
  React.useEffect(() => {
    if (!value && onChange) {
      const preset = defaultPreset ?? "7days"
      onChange(getPresetRange(preset))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initialize default range once

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    if (preset !== "custom") {
      const range = getPresetRange(preset)
      onChange?.(range)
    } else {
      setIsCustomOpen(true)
    }
  }

  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range && range.from && range.to) {
      onChange?.(range)
      setIsCustomOpen(false)
    }
  }

  const displayRange = value || getPresetRange(selectedPreset)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={selectedPreset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.includes("today") && (
            <SelectItem value="today">Today</SelectItem>
          )}
          {presets.includes("7days") && (
            <SelectItem value="7days">Last 7 days</SelectItem>
          )}
          {presets.includes("30days") && (
            <SelectItem value="30days">Last 30 days</SelectItem>
          )}
          {presets.includes("custom") && (
            <SelectItem value="custom">Custom range</SelectItem>
          )}
        </SelectContent>
      </Select>

      {selectedPreset === "custom" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal h-9",
                !displayRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayRange?.from ? (
                displayRange.to ? (
                  <>
                    {format(displayRange.from, "LLL dd, y")} -{" "}
                    {format(displayRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(displayRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={displayRange?.from}
              selected={displayRange}
              onSelect={handleCustomDateChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      {selectedPreset !== "custom" && displayRange && (
        <span className="text-sm text-slate-500">
          {format(displayRange.from, "MMM dd")} - {format(displayRange.to, "MMM dd, yyyy")}
        </span>
      )}
    </div>
  )
}
