"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export type DateRangePreset = "today" | "7days" | "30days" | "custom"

export interface DateRange {
  from: Date
  to: Date
}

interface DashboardDateContextType {
  /** Giá trị đang chọn trên UI (chưa Apply) */
  dateRange: DateRange
  preset: DateRangePreset
  /** Chỉ thay đổi khi bấm Apply/Refresh — dùng cho API và cacheKey để tránh gọi API khi chỉ đổi date picker */
  appliedDateRange: DateRange
  appliedPreset: DateRangePreset
  refreshKey: number
  setDateRange: (range: DateRange) => void
  setPreset: (preset: DateRangePreset) => void
  applyDateRange: () => void
  refresh: () => void
}

const DashboardDateContext = createContext<DashboardDateContextType | undefined>(undefined)

const getPresetRange = (preset: DateRangePreset): DateRange => {
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  
  switch (preset) {
    case "today":
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      return { from: todayStart, to: today }
    case "7days":
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // Include today, so 6 days ago
      sevenDaysAgo.setHours(0, 0, 0, 0)
      return { from: sevenDaysAgo, to: today }
    case "30days":
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29) // Include today, so 29 days ago
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      return { from: thirtyDaysAgo, to: today }
    default:
      return { from: today, to: today }
  }
}

export function DashboardDateProvider({ children }: { children: ReactNode }) {
  const defaultPreset: DateRangePreset = "7days"
  const defaultRange = getPresetRange(defaultPreset)

  // UI state: thay đổi ngay khi user đổi select/calendar (chưa Apply)
  const [preset, setPresetState] = useState<DateRangePreset>(defaultPreset)
  const [dateRange, setDateRangeState] = useState<DateRange>(() => defaultRange)

  // Applied state: chỉ cập nhật khi bấm Apply hoặc Refresh — dùng cho API để tránh flood
  const [appliedPreset, setAppliedPreset] = useState<DateRangePreset>(defaultPreset)
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>(() => defaultRange)
  const [refreshKey, setRefreshKey] = useState(0)

  const setPreset = useCallback((newPreset: DateRangePreset) => {
    setPresetState(newPreset)
    if (newPreset !== "custom") {
      setDateRangeState(getPresetRange(newPreset))
    }
  }, [])

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range)
    setPresetState("custom")
  }, [])

  const applyDateRange = useCallback(() => {
    setAppliedPreset(preset)
    setAppliedDateRange({ from: new Date(dateRange.from), to: new Date(dateRange.to) })
    setRefreshKey(prev => prev + 1)
  }, [preset, dateRange])

  const refresh = useCallback(() => {
    setAppliedPreset(preset)
    setAppliedDateRange({ from: new Date(dateRange.from), to: new Date(dateRange.to) })
    setRefreshKey(prev => prev + 1)
  }, [preset, dateRange])

  return (
    <DashboardDateContext.Provider
      value={{
        dateRange,
        preset,
        appliedDateRange,
        appliedPreset,
        setDateRange,
        setPreset,
        applyDateRange,
        refresh,
        refreshKey,
      }}
    >
      {children}
    </DashboardDateContext.Provider>
  )
}

export function useDashboardDate() {
  const context = useContext(DashboardDateContext)
  if (context === undefined) {
    throw new Error("useDashboardDate must be used within a DashboardDateProvider")
  }
  return context
}
