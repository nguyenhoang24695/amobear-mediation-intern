"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar, AlertTriangle } from "lucide-react"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"

interface HistoricalEntry {
  date: Date
  score: number | null
  anomalies: number
  /** True when a report exists for this day even if healthScore is null (e.g. persona digest). */
  hasReport?: boolean
}

interface HistoricalInsightsCalendarProps {
  data: HistoricalEntry[]
  selectedDate: Date
  onDateClick: (date: Date) => void
}

const getScoreColor = (score: number | null) => {
  if (score === -1) return "bg-indigo-400"
  if (score === null) return "bg-slate-100"
  if (score >= 80) return "bg-emerald-400"
  if (score >= 60) return "bg-blue-400"
  if (score >= 40) return "bg-amber-400"
  return "bg-red-400"
}

const getScoreHoverColor = (score: number | null) => {
  if (score === -1) return "hover:bg-indigo-500"
  if (score === null) return "hover:bg-slate-200"
  if (score >= 80) return "hover:bg-emerald-500"
  if (score >= 60) return "hover:bg-blue-500"
  if (score >= 40) return "hover:bg-amber-500"
  return "hover:bg-red-500"
}

export function HistoricalInsightsCalendar({
  data,
  selectedDate,
  onDateClick,
}: HistoricalInsightsCalendarProps) {
  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-800">
            Insight History (Last 30 Days)
          </h3>
        </div>

        {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-slate-100" />
            <span>No data</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-indigo-400" />
            <span>Insight (no score)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-red-400" />
            <span>0-39</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-amber-400" />
            <span>40-59</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-blue-400" />
            <span>60-79</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-400" />
            <span>80+</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <TooltipProvider>
        <div className="flex flex-wrap gap-1.5">
          {data.map((entry, index) => {
            const isSelected = isSameDay(entry.date, selectedDate)
            const hasInsight = entry.hasReport === true || entry.score !== null
            const scoreForColor = hasInsight && entry.score === null ? -1 : entry.score

            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDateClick(entry.date)}
                    className={cn(
                      "w-8 h-8 rounded-md transition-all relative",
                      getScoreColor(scoreForColor),
                      getScoreHoverColor(scoreForColor),
                      isSelected && "ring-2 ring-indigo-600 ring-offset-2",
                      !hasInsight && "cursor-default opacity-50"
                    )}
                  >
                    {entry.anomalies > 0 && hasInsight && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-2 h-2 text-white" />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-sm">
                      {format(entry.date, "EEEE, MMM d")}
                    </span>
                    {hasInsight ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Health Score:</span>
                          {entry.score === null ? (
                            <Badge className="text-xs bg-indigo-100 text-indigo-800">— (có báo cáo)</Badge>
                          ) : (
                          <Badge
                            className={cn(
                              "text-xs",
                              entry.score! >= 80 && "bg-emerald-100 text-emerald-700",
                              entry.score! >= 60 && entry.score! < 80 && "bg-blue-100 text-blue-700",
                              entry.score! >= 40 && entry.score! < 60 && "bg-amber-100 text-amber-700",
                              entry.score! < 40 && "bg-red-100 text-red-700"
                            )}
                          >
                            {entry.score}
                          </Badge>
                          )}
                        </div>
                        {entry.anomalies > 0 && (
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            {entry.anomalies} anomal{entry.anomalies === 1 ? "y" : "ies"} detected
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">No insight generated</span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </Card>
  )
}
