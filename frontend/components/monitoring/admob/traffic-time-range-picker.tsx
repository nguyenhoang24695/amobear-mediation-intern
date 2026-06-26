"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, ChevronDown, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  detectTrafficTimePresetId,
  formatTrafficTimeRangeLabel,
  isTrafficTimeRangeValid,
  mergeDateTimeLocal,
  parseRelativeTrafficTimeInput,
  splitDateTimeLocal,
  toDateTimeLocalValue,
  TRAFFIC_TIME_PRESETS,
  type TrafficTimePresetId,
  type TrafficTimeRangeValue,
} from "@/lib/monitoring/traffic-time-range-utils"

type TrafficTimeRangePickerProps = {
  value: TrafficTimeRangeValue
  onChange: (value: TrafficTimeRangeValue) => void
  maxDays?: number
  className?: string
}

function TrafficTimeRangePanel({
  value,
  onApply,
  onCancel,
  maxDays = 90,
}: {
  value: TrafficTimeRangeValue
  onApply: (value: TrafficTimeRangeValue) => void
  onCancel: () => void
  maxDays?: number
}) {
  const [draft, setDraft] = useState<TrafficTimeRangeValue>(value)
  const [relativeInput, setRelativeInput] = useState("")
  const [activePresetId, setActivePresetId] = useState<TrafficTimePresetId | "custom">(
    () => detectTrafficTimePresetId(value),
  )

  useEffect(() => {
    setDraft(value)
    setActivePresetId(detectTrafficTimePresetId(value))
    setRelativeInput("")
  }, [value])

  const startParts = splitDateTimeLocal(draft.from)
  const endParts = splitDateTimeLocal(draft.to)
  const isValid = isTrafficTimeRangeValid(draft, maxDays)

  const validationMessage = useMemo(() => {
    const from = new Date(draft.from)
    const to = new Date(draft.to)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Enter valid start and end times."
    if (from.getTime() > to.getTime()) return "Start time must be before end time."
    const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    if (spanDays > maxDays) return `Date range must not exceed ${maxDays} days.`
    return null
  }, [draft.from, draft.to, maxDays])

  const applyPreset = (presetId: TrafficTimePresetId) => {
    const preset = TRAFFIC_TIME_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    const resolved = preset.resolve()
    setDraft({ from: toDateTimeLocalValue(resolved.from), to: toDateTimeLocalValue(resolved.to) })
    setActivePresetId(presetId)
    setRelativeInput("")
  }

  const applyRelativeInput = () => {
    const resolved = parseRelativeTrafficTimeInput(relativeInput)
    if (!resolved) return
    setDraft({
      from: toDateTimeLocalValue(resolved.from),
      to: toDateTimeLocalValue(resolved.to),
    })
    setActivePresetId(detectTrafficTimePresetId({
      from: toDateTimeLocalValue(resolved.from),
      to: toDateTimeLocalValue(resolved.to),
    }))
  }

  const updateDraftPart = (side: "from" | "to", part: "date" | "time", nextValue: string) => {
    const current = side === "from" ? draft.from : draft.to
    const parts = splitDateTimeLocal(current)
    const merged = mergeDateTimeLocal(
      part === "date" ? nextValue : parts.date,
      part === "time" ? nextValue : parts.time,
    )
    const nextDraft = side === "from" ? { ...draft, from: merged } : { ...draft, to: merged }
    setDraft(nextDraft)
    setActivePresetId(detectTrafficTimePresetId(nextDraft))
  }

  return (
    <div className="flex w-[min(95vw,760px)] flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
      <div className="flex min-h-0">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <Input
              value={relativeInput}
              onChange={(event) => setRelativeInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  applyRelativeInput()
                }
              }}
              placeholder="Relative time (15m, 1h, 1d, 1w)"
              className="h-9 text-sm"
            />
          </div>
          <div className="max-h-[320px] overflow-auto py-1">
            {TRAFFIC_TIME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  activePresetId === preset.id && "bg-primary/10 font-medium text-primary",
                )}
                onClick={() => applyPreset(preset.id)}
              >
                <span>{preset.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{preset.shorthand}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-4">
          <h3 className="text-sm font-semibold text-foreground">Start and end times</h3>

          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start time</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type="date"
                      value={startParts.date}
                      onChange={(event) => updateDraftPart("from", "date", event.target.value)}
                      className="h-10 pr-10"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Date format: yyyy-mm-dd</p>
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type="time"
                      step={60}
                      value={startParts.time}
                      onChange={(event) => updateDraftPart("from", "time", event.target.value)}
                      className="h-10 pr-10"
                    />
                    <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End time</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type="date"
                      value={endParts.date}
                      onChange={(event) => updateDraftPart("to", "date", event.target.value)}
                      className="h-10 pr-10"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Date format: yyyy-mm-dd</p>
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type="time"
                      step={60}
                      value={endParts.time}
                      onChange={(event) => updateDraftPart("to", "time", event.target.value)}
                      className="h-10 pr-10"
                    />
                    <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {validationMessage ?? formatTrafficTimeRangeLabel(draft)}
        </span>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" className="h-8 px-4" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8 px-4"
            disabled={!isValid}
            onClick={() => onApply(draft)}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TrafficTimeRangePicker({ value, onChange, maxDays = 90, className }: TrafficTimeRangePickerProps) {
  const [open, setOpen] = useState(false)
  const label = formatTrafficTimeRangeLabel(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:border-ring/60 hover:bg-accent/30",
            className,
          )}
        >
          <span className="truncate text-left">
            <span className="text-muted-foreground">Created </span>
            <span className="font-medium text-primary">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
        {open ? (
          <TrafficTimeRangePanel
            value={value}
            maxDays={maxDays}
            onApply={(nextValue) => {
              onChange(nextValue)
              setOpen(false)
            }}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
