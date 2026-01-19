"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export type DateRangePreset = "today" | "7days" | "30days" | "custom"

export interface DateRange {
  from: Date
  to: Date
}

interface DashboardDateContextType {
  dateRange: DateRange
  preset: DateRangePreset
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
  // Default to 7days for Top Apps and Revenue Chart
  const [preset, setPresetState] = useState<DateRangePreset>("7days")
  const [dateRange, setDateRangeState] = useState<DateRange>(() => getPresetRange("7days"))
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
    // Trigger refresh by updating key
    setRefreshKey(prev => prev + 1)
  }, [])

  const refresh = useCallback(() => {
    // Same as apply - refresh current date range
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <DashboardDateContext.Provider
      value={{
        dateRange,
        preset,
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
