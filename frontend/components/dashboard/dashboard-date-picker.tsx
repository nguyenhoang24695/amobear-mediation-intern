"use client"

import * as React from "react"
import { CalendarIcon, RefreshCw } from "lucide-react"
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
import { useDashboardDate, type DateRangePreset } from "@/contexts/dashboard-date-context"

export function DashboardDatePicker() {
  const { dateRange, preset, setDateRange, setPreset, applyDateRange, refresh } = useDashboardDate()
  const [isCustomOpen, setIsCustomOpen] = React.useState(false)

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset)
    if (newPreset !== "custom") {
      setIsCustomOpen(false)
    } else {
      setIsCustomOpen(true)
    }
  }

  const handleCustomDateChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range && range.from && range.to) {
      // Ensure times are set correctly
      const from = new Date(range.from)
      from.setHours(0, 0, 0, 0)
      const to = new Date(range.to)
      to.setHours(23, 59, 59, 999)
      setDateRange({ from, to })
    }
  }

  const displayRange = dateRange

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[140px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7days">Last 7 days</SelectItem>
          <SelectItem value="30days">Last 30 days</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal h-9 text-sm",
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

      {preset !== "custom" && displayRange && (
        <span className="text-sm text-muted-foreground">
          {format(displayRange.from, "MMM dd")} - {format(displayRange.to, "MMM dd, yyyy")}
        </span>
      )}

      <Button
        onClick={applyDateRange}
        className="h-9 px-4 text-sm"
      >
        Apply
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 bg-transparent"
        onClick={refresh}
        title="Refresh data"
      >
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
