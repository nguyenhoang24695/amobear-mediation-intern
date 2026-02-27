"use client"

import { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"

interface CronParts {
  minute: string
  hour: string
  day: string
  month: string
  weekday: string
}

interface CronBuilderProps {
  cronExpression: string
  onChange: (cronExpression: string) => void
}

function parseCronExpression(cron: string): CronParts | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  
  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    weekday: parts[4],
  }
}

function buildCronExpression(parts: CronParts): string {
  return `${parts.minute} ${parts.hour} ${parts.day} ${parts.month} ${parts.weekday}`
}

export function CronBuilder({ cronExpression, onChange }: CronBuilderProps) {
  const initialParts = useMemo(() => {
    const parsed = parseCronExpression(cronExpression)
    return parsed || {
      minute: "*",
      hour: "*",
      day: "*",
      month: "*",
      weekday: "*",
    }
  }, [cronExpression])

  const [parts, setParts] = useState<CronParts>(initialParts)
  const [activeTab, setActiveTab] = useState("minutes")

  useEffect(() => {
    const parsed = parseCronExpression(cronExpression)
    if (parsed) {
      setParts(parsed)
    }
  }, [cronExpression])

  const updatePart = (field: keyof CronParts, value: string) => {
    const newParts = { ...parts, [field]: value }
    setParts(newParts)
    onChange(buildCronExpression(newParts))
  }

  // Minutes Tab
  const MinutesTab = () => {
    const initialMode: "every" | "specific" | "range" | "step" =
      parts.minute === "*" ? "every" :
      parts.minute.includes("/") && !parts.minute.includes(",") ? "step" :
      parts.minute.includes("-") && !parts.minute.includes(",") && !parts.minute.includes("/") ? "range" :
      // bất kỳ giá trị cụ thể nào (kể cả 1 số) đều là specific
      "specific"
    const [mode, setMode] = useState<"every" | "specific" | "range" | "step">(initialMode)
    const [specificMinutes, setSpecificMinutes] = useState<string[]>(() => {
      // nếu có nhiều giá trị, tách theo dấu phẩy
      if (parts.minute.includes(",")) {
        return parts.minute.split(",").filter(m => m && !m.includes("/") && !m.includes("-"))
      }
      // nếu chỉ là 1 số (vd "14") thì cũng coi là specific
      if (parts.minute !== "*" && !parts.minute.includes("/") && !parts.minute.includes("-")) {
        return [parts.minute]
      }
      return []
    })
    const [stepValue, setStepValue] = useState(
      parts.minute.includes("/") ? parts.minute.split("/")[1] : "5"
    )
    const [stepStart, setStepStart] = useState(
      parts.minute.includes("/") ? (parts.minute.split("/")[0] === "*" ? "0" : parts.minute.split("/")[0]) : "0"
    )
    const [rangeStart, setRangeStart] = useState(
      parts.minute.includes("-") && !parts.minute.includes("/") ? parts.minute.split("-")[0] : "0"
    )
    const [rangeEnd, setRangeEnd] = useState(
      parts.minute.includes("-") && !parts.minute.includes("/") ? parts.minute.split("-")[1] : "59"
    )

    const handleModeChange = (newMode: typeof mode) => {
      setMode(newMode)
      if (newMode === "every") {
        updatePart("minute", "*")
      } else if (newMode === "step") {
        updatePart("minute", `${stepStart}/${stepValue}`)
      } else if (newMode === "range") {
        updatePart("minute", `${rangeStart}-${rangeEnd}`)
      } else if (newMode === "specific") {
        // Don't update if specificMinutes is empty, let user select first
        if (specificMinutes.length > 0) {
          updatePart("minute", specificMinutes.join(","))
        }
      }
    }

    const toggleMinute = (minute: number, checked: boolean) => {
      const minuteStr = minute.toString()
      let newSpecific: string[]
      if (checked) {
        newSpecific = [...specificMinutes, minuteStr].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => Number(a) - Number(b))
        if (mode !== "specific") {
          setMode("specific")
        }
      } else {
        newSpecific = specificMinutes.filter((m) => m !== minuteStr)
      }
      setSpecificMinutes(newSpecific)
      const newMinuteValue = newSpecific.length > 0 ? newSpecific.join(",") : "*"
      updatePart("minute", newMinuteValue)
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={mode} onValueChange={handleModeChange}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every" id="min-every" />
              <Label htmlFor="min-every" className="cursor-pointer">
                Every minute
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="step" id="min-step" />
              <Label htmlFor="min-step" className="cursor-pointer">
                Every <span className="font-semibold">{stepValue || "N"}</span> minute(s) starting at minute <span className="font-semibold">{stepStart || "0"}</span>
              </Label>
            </div>
            {mode === "step" && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="min-step-interval" className="text-xs w-24">Every</Label>
                  <Input
                    id="min-step-interval"
                    type="number"
                    min="1"
                    max="59"
                    value={stepValue}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepValue(val)
                      updatePart("minute", `${stepStart}/${val}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">minute(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="min-step-start" className="text-xs w-24">Starting at</Label>
                  <Input
                    id="min-step-start"
                    type="number"
                    min="0"
                    max="59"
                    value={stepStart}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepStart(val)
                      updatePart("minute", `${val}/${stepValue}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">minute</span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="range" id="min-range" />
              <Label htmlFor="min-range" className="cursor-pointer">
                Range
              </Label>
            </div>
            {mode === "range" && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={rangeStart}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeStart(val)
                    updatePart("minute", `${val}-${rangeEnd}`)
                  }}
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={rangeEnd}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeEnd(val)
                    updatePart("minute", `${rangeStart}-${val}`)
                  }}
                  className="w-20"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="min-specific" />
              <Label htmlFor="min-specific" className="cursor-pointer">
                Specific minutes
              </Label>
            </div>
            <div className="ml-6">
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                  <div key={minute} className="flex items-center space-x-2">
                    <Checkbox
                      id={`min-${minute}`}
                      checked={specificMinutes.includes(minute.toString())}
                      onCheckedChange={(checked) => toggleMinute(minute, checked === true)}
                    />
                    <Label htmlFor={`min-${minute}`} className="cursor-pointer text-xs">
                      {minute}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  }

  // Hours Tab
  const HoursTab = () => {
    const initialMode: "every" | "specific" | "range" | "step" =
      parts.hour === "*" ? "every" :
      parts.hour.includes("/") && !parts.hour.includes(",") ? "step" :
      parts.hour.includes("-") && !parts.hour.includes(",") && !parts.hour.includes("/") ? "range" :
      "specific"
    const [mode, setMode] = useState<"every" | "specific" | "range" | "step">(initialMode)
    const [specificHours, setSpecificHours] = useState<string[]>(() => {
      if (parts.hour.includes(",")) {
        return parts.hour.split(",").filter(h => h && !h.includes("/") && !h.includes("-"))
      }
      if (parts.hour !== "*" && !parts.hour.includes("/") && !parts.hour.includes("-")) {
        return [parts.hour]
      }
      return []
    })
    const [stepValue, setStepValue] = useState(
      parts.hour.includes("/") ? parts.hour.split("/")[1] : "2"
    )
    const [stepStart, setStepStart] = useState(
      parts.hour.includes("/") ? (parts.hour.split("/")[0] === "*" ? "0" : parts.hour.split("/")[0]) : "0"
    )
    const [rangeStart, setRangeStart] = useState(
      parts.hour.includes("-") && !parts.hour.includes("/") ? parts.hour.split("-")[0] : "0"
    )
    const [rangeEnd, setRangeEnd] = useState(
      parts.hour.includes("-") && !parts.hour.includes("/") ? parts.hour.split("-")[1] : "23"
    )

    const handleModeChange = (newMode: typeof mode) => {
      setMode(newMode)
      if (newMode === "every") {
        updatePart("hour", "*")
      } else if (newMode === "step") {
        updatePart("hour", `${stepStart}/${stepValue}`)
      } else if (newMode === "range") {
        updatePart("hour", `${rangeStart}-${rangeEnd}`)
      } else if (newMode === "specific") {
        // Don't update if specificHours is empty, let user select first
        if (specificHours.length > 0) {
          updatePart("hour", specificHours.join(","))
        }
      }
    }

    const toggleHour = (hour: number, checked: boolean) => {
      const hourStr = hour.toString()
      let newSpecific: string[]
      if (checked) {
        newSpecific = [...specificHours, hourStr].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => Number(a) - Number(b))
        if (mode !== "specific") {
          setMode("specific")
        }
      } else {
        newSpecific = specificHours.filter((h) => h !== hourStr)
      }
      setSpecificHours(newSpecific)
      updatePart("hour", newSpecific.length > 0 ? newSpecific.join(",") : "*")
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={mode} onValueChange={handleModeChange}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every" id="hour-every" />
              <Label htmlFor="hour-every" className="cursor-pointer">
                Every hour
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="step" id="hour-step" />
              <Label htmlFor="hour-step" className="cursor-pointer">
                Every <span className="font-semibold">{stepValue || "N"}</span> hour(s) starting at hour <span className="font-semibold">{stepStart || "0"}</span>
              </Label>
            </div>
            {mode === "step" && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="hour-step-interval" className="text-xs w-24">Every</Label>
                  <Input
                    id="hour-step-interval"
                    type="number"
                    min="1"
                    max="23"
                    value={stepValue}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepValue(val)
                      updatePart("hour", `${stepStart}/${val}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">hour(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hour-step-start" className="text-xs w-24">Starting at</Label>
                  <Input
                    id="hour-step-start"
                    type="number"
                    min="0"
                    max="23"
                    value={stepStart}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepStart(val)
                      updatePart("hour", `${val}/${stepValue}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">hour</span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="range" id="hour-range" />
              <Label htmlFor="hour-range" className="cursor-pointer">
                Range
              </Label>
            </div>
            {mode === "range" && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={rangeStart}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeStart(val)
                    updatePart("hour", `${val}-${rangeEnd}`)
                  }}
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={rangeEnd}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeEnd(val)
                    updatePart("hour", `${rangeStart}-${val}`)
                  }}
                  className="w-20"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="hour-specific" />
              <Label htmlFor="hour-specific" className="cursor-pointer">
                Specific hours
              </Label>
            </div>
            <div className="ml-6">
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div key={hour} className="flex items-center space-x-2">
                    <Checkbox
                      id={`hour-${hour}`}
                      checked={specificHours.includes(hour.toString())}
                      onCheckedChange={(checked) => toggleHour(hour, checked === true)}
                    />
                    <Label htmlFor={`hour-${hour}`} className="cursor-pointer text-xs">
                      {hour}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  }

  // Day Tab (Day of Month)
  const DayTab = () => {
    const initialMode: "every" | "specific" | "range" | "step" =
      parts.day === "*" ? "every" :
      parts.day.includes("/") && !parts.day.includes(",") ? "step" :
      parts.day.includes("-") && !parts.day.includes(",") && !parts.day.includes("/") ? "range" :
      "specific"
    const [mode, setMode] = useState<"every" | "specific" | "range" | "step">(initialMode)
    const [specificDays, setSpecificDays] = useState<string[]>(() => {
      if (parts.day.includes(",")) {
        return parts.day.split(",").filter(d => d && !d.includes("/") && !d.includes("-"))
      }
      if (parts.day !== "*" && !parts.day.includes("/") && !parts.day.includes("-")) {
        return [parts.day]
      }
      return []
    })
    const [stepValue, setStepValue] = useState(
      parts.day.includes("/") ? parts.day.split("/")[1] : "1"
    )
    const [stepStart, setStepStart] = useState(
      parts.day.includes("/") ? (parts.day.split("/")[0] === "*" ? "1" : parts.day.split("/")[0]) : "1"
    )
    const [rangeStart, setRangeStart] = useState(
      parts.day.includes("-") && !parts.day.includes("/") ? parts.day.split("-")[0] : "1"
    )
    const [rangeEnd, setRangeEnd] = useState(
      parts.day.includes("-") && !parts.day.includes("/") ? parts.day.split("-")[1] : "31"
    )

    const handleModeChange = (newMode: typeof mode) => {
      setMode(newMode)
      if (newMode === "every") {
        updatePart("day", "*")
      } else if (newMode === "step") {
        updatePart("day", `${stepStart}/${stepValue}`)
      } else if (newMode === "range") {
        updatePart("day", `${rangeStart}-${rangeEnd}`)
      } else if (newMode === "specific") {
        // Don't update if specificDays is empty, let user select first
        if (specificDays.length > 0) {
          updatePart("day", specificDays.join(","))
        }
      }
    }

    const toggleDay = (day: number, checked: boolean) => {
      const dayStr = day.toString()
      let newSpecific: string[]
      if (checked) {
        newSpecific = [...specificDays, dayStr].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => Number(a) - Number(b))
        if (mode !== "specific") {
          setMode("specific")
        }
      } else {
        newSpecific = specificDays.filter((d) => d !== dayStr)
      }
      setSpecificDays(newSpecific)
      updatePart("day", newSpecific.length > 0 ? newSpecific.join(",") : "*")
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={mode} onValueChange={handleModeChange}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every" id="day-every" />
              <Label htmlFor="day-every" className="cursor-pointer">
                Every day
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="step" id="day-step" />
              <Label htmlFor="day-step" className="cursor-pointer">
                Every <span className="font-semibold">{stepValue || "N"}</span> day(s) starting at day <span className="font-semibold">{stepStart || "1"}</span>
              </Label>
            </div>
            {mode === "step" && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="day-step-interval" className="text-xs w-24">Every</Label>
                  <Input
                    id="day-step-interval"
                    type="number"
                    min="1"
                    max="31"
                    value={stepValue}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepValue(val)
                      updatePart("day", `${stepStart}/${val}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">day(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="day-step-start" className="text-xs w-24">Starting at</Label>
                  <Input
                    id="day-step-start"
                    type="number"
                    min="1"
                    max="31"
                    value={stepStart}
                    onChange={(e) => {
                      const val = e.target.value
                      setStepStart(val)
                      updatePart("day", `${val}/${stepValue}`)
                    }}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-500">day</span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="range" id="day-range" />
              <Label htmlFor="day-range" className="cursor-pointer">
                Range
              </Label>
            </div>
            {mode === "range" && (
              <div className="ml-6 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={rangeStart}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeStart(val)
                    updatePart("day", `${val}-${rangeEnd}`)
                  }}
                  className="w-20"
                />
                <span>to</span>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={rangeEnd}
                  onChange={(e) => {
                    const val = e.target.value
                    setRangeEnd(val)
                    updatePart("day", `${rangeStart}-${val}`)
                  }}
                  className="w-20"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="day-specific" />
              <Label htmlFor="day-specific" className="cursor-pointer">
                Specific days
              </Label>
            </div>
            <div className="ml-6">
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={specificDays.includes(day.toString())}
                      onCheckedChange={(checked) => toggleDay(day, checked === true)}
                    />
                    <Label htmlFor={`day-${day}`} className="cursor-pointer text-xs">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  }

  // Month Tab
  const MonthTab = () => {
    const months = [
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ]

    const [mode, setMode] = useState<"every" | "specific">(
      parts.month === "*" ? "every" : "specific"
    )
    const [specificMonths, setSpecificMonths] = useState<string[]>(
      parts.month !== "*" ? parts.month.split(",") : []
    )

    const handleModeChange = (newMode: typeof mode) => {
      setMode(newMode)
      if (newMode === "every") {
        updatePart("month", "*")
      } else {
        updatePart("month", specificMonths.length > 0 ? specificMonths.join(",") : "*")
      }
    }

    const toggleMonth = (month: string) => {
      const newSpecific = specificMonths.includes(month)
        ? specificMonths.filter((m) => m !== month)
        : [...specificMonths, month].sort((a, b) => Number(a) - Number(b))
      setSpecificMonths(newSpecific)
      updatePart("month", newSpecific.length > 0 ? newSpecific.join(",") : "*")
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={mode} onValueChange={handleModeChange}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every" id="month-every" />
              <Label htmlFor="month-every" className="cursor-pointer">
                Every month
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="month-specific" />
              <Label htmlFor="month-specific" className="cursor-pointer">
                Specific months
              </Label>
            </div>
            <div className="ml-6">
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {months.map((month) => (
                  <div key={month.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`month-${month.value}`}
                      checked={specificMonths.includes(month.value)}
                      onCheckedChange={() => toggleMonth(month.value)}
                    />
                    <Label htmlFor={`month-${month.value}`} className="cursor-pointer text-xs">
                      {month.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  }

  // Day of Week Tab
  const DayOfWeekTab = () => {
    const weekdays = [
      { value: "0", label: "Sunday" },
      { value: "1", label: "Monday" },
      { value: "2", label: "Tuesday" },
      { value: "3", label: "Wednesday" },
      { value: "4", label: "Thursday" },
      { value: "5", label: "Friday" },
      { value: "6", label: "Saturday" },
    ]

    const [mode, setMode] = useState<"every" | "specific">(
      parts.weekday === "*" ? "every" : "specific"
    )
    const [specificWeekdays, setSpecificWeekdays] = useState<string[]>(
      parts.weekday !== "*" ? parts.weekday.split(",") : []
    )

    const handleModeChange = (newMode: typeof mode) => {
      setMode(newMode)
      if (newMode === "every") {
        updatePart("weekday", "*")
      } else {
        updatePart("weekday", specificWeekdays.length > 0 ? specificWeekdays.join(",") : "*")
      }
    }

    const toggleWeekday = (weekday: string, checked: boolean) => {
      const newSpecific = checked
        ? [...specificWeekdays, weekday].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => Number(a) - Number(b))
        : specificWeekdays.filter((w) => w !== weekday)
      if (checked && mode !== "specific") {
        setMode("specific")
      }
      setSpecificWeekdays(newSpecific)
      updatePart("weekday", newSpecific.length > 0 ? newSpecific.join(",") : "*")
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={mode} onValueChange={handleModeChange}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="every" id="weekday-every" />
              <Label htmlFor="weekday-every" className="cursor-pointer">
                Every day of week
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="specific" id="weekday-specific" />
              <Label htmlFor="weekday-specific" className="cursor-pointer">
                Specific days of week
              </Label>
            </div>
            <div className="ml-6">
              <div className="space-y-2">
                {weekdays.map((weekday) => (
                  <div key={weekday.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weekday-${weekday.value}`}
                      checked={specificWeekdays.includes(weekday.value)}
                      onCheckedChange={(checked) => toggleWeekday(weekday.value, checked === true)}
                    />
                    <Label htmlFor={`weekday-${weekday.value}`} className="cursor-pointer">
                      {weekday.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="minutes">Minutes</TabsTrigger>
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="weekday">Day of Week</TabsTrigger>
            </TabsList>
            <TabsContent value="minutes" className="mt-4">
              <MinutesTab />
            </TabsContent>
            <TabsContent value="hours" className="mt-4">
              <HoursTab />
            </TabsContent>
            <TabsContent value="day" className="mt-4">
              <DayTab />
            </TabsContent>
            <TabsContent value="month" className="mt-4">
              <MonthTab />
            </TabsContent>
            <TabsContent value="weekday" className="mt-4">
              <DayOfWeekTab />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}

