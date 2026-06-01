"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, DollarSign, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeDashboardRange } from "@/types/app-dashboard"
import type { DashboardRange, DashboardRangeInput, DashboardRangeSelection } from "@/types/app-dashboard"

interface DashboardFilterBarProps {
  range: DashboardRangeInput
  onRangeChange: (range: DashboardRangeSelection) => void
  /** Hiển thị badge GMT+7 · USD · {accountName}. Optional — slice 2 sẽ truyền data từ /summary meta. */
  accountDisplayName?: string
  /** Trigger refetch tất cả block. Slice 1 chưa dùng. */
  onRefresh?: () => void
  refreshing?: boolean
}

const PRESETS: ReadonlyArray<{ key: DashboardRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
] as const

export function DashboardFilterBar({
  range,
  onRangeChange,
  accountDisplayName,
  onRefresh,
  refreshing,
}: DashboardFilterBarProps) {
  const currentRange = normalizeDashboardRange(range)
  const defaultCustomRange = useMemo(() => getDefaultCustomRange(), [])
  const [draftStart, setDraftStart] = useState(currentRange.startDate ?? defaultCustomRange.startDate)
  const [draftEnd, setDraftEnd] = useState(currentRange.endDate ?? defaultCustomRange.endDate)

  useEffect(() => {
    if (currentRange.range !== "custom") return
    setDraftStart(currentRange.startDate ?? defaultCustomRange.startDate)
    setDraftEnd(currentRange.endDate ?? defaultCustomRange.endDate)
  }, [currentRange.range, currentRange.startDate, currentRange.endDate, defaultCustomRange])

  const customRangeValid = isDateString(draftStart) && isDateString(draftEnd) && draftStart <= draftEnd

  const selectPreset = (key: DashboardRange) => {
    if (key === "custom") {
      onRangeChange({ range: "custom", startDate: draftStart, endDate: draftEnd })
      return
    }

    onRangeChange({ range: key })
  }

  const applyCustomRange = () => {
    if (!customRangeValid) return
    onRangeChange({ range: "custom", startDate: draftStart, endDate: draftEnd })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {PRESETS.map((p) => {
            const active = p.key === currentRange.range
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPreset(p.key)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
                aria-pressed={active}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {currentRange.range === "custom" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <CalendarDays className="ml-2 h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={draftStart}
              max={draftEnd || defaultCustomRange.endDate}
              onChange={(event) => setDraftStart(event.target.value)}
              className="h-8 rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              aria-label="Custom start date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={draftEnd}
              min={draftStart || undefined}
              max={defaultCustomRange.endDate}
              onChange={(event) => setDraftEnd(event.target.value)}
              className="h-8 rounded-md border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
              aria-label="Custom end date"
            />
            <Button size="sm" className="h-8" onClick={applyCustomRange} disabled={!customRangeValid}>
              Apply
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-200 font-normal">
          <Clock className="h-3 w-3" />
          GMT+7
        </Badge>
        <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-200 font-normal">
          <DollarSign className="h-3 w-3" />
          USD
        </Badge>
        {accountDisplayName ? (
          <Badge variant="outline" className="bg-slate-50 border-slate-200 font-normal">
            {accountDisplayName}
          </Badge>
        ) : null}
        {onRefresh ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-transparent"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function getDefaultCustomRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
