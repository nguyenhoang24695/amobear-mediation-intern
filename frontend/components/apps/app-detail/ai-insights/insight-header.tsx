"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Sparkles,
  Clock,
  Cpu,
} from "lucide-react"
import { format, isAfter, startOfDay } from "date-fns"

interface InsightHeaderProps {
  selectedDate: Date
  onPrevDay: () => void
  onNextDay: () => void
  onDateSelect: (date: Date) => void
  isToday: boolean
  generatedAt: string | null
  generationTime: number | null
  model: string | null
  onRegenerate: () => void
}

export function InsightHeader({
  selectedDate,
  onPrevDay,
  onNextDay,
  onDateSelect,
  isToday,
  generatedAt,
  generationTime,
  model,
  onRegenerate,
}: InsightHeaderProps) {
  const today = startOfDay(new Date())
  const isNextDisabled = isAfter(startOfDay(selectedDate), today) || isToday

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
      {/* Left: Title and Date Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">AI Insights</h2>
            <p className="text-xs text-slate-500">Daily performance analysis</p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevDay}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 gap-2 px-3 font-medium bg-transparent"
              >
                <CalendarIcon className="w-4 h-4" />
                {format(selectedDate, "MMM d, yyyy")}
                {isToday && (
                  <Badge className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5">
                    Today
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateSelect(date)}
                disabled={(date) => isAfter(startOfDay(date), today)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNextDay}
            disabled={isNextDisabled}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right: Generation Info and Actions */}
      <div className="flex items-center gap-4">
        {generatedAt && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Generated {format(new Date(generatedAt), "h:mm a")}
              </span>
            </div>
            {generationTime && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300">|</span>
                <span>{generationTime}s</span>
              </div>
            )}
            {model && (
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>{model}</span>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
          onClick={onRegenerate}
        >
          <RefreshCw className="w-4 h-4" />
          Re-generate
        </Button>
      </div>
    </div>
  )
}
