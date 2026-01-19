"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { mapPresetToDateRangeType, formatDateForAPI } from "@/lib/utils/dashboard"
import type { DateRangeType } from "@/types/api"

const tabConfig = {
  revenue: { key: "revenue", label: "Revenue", format: (v: number) => `$${(v / 1000).toFixed(1)}k`, color: "#2563eb" },
  ecpm: { key: "ecpm", label: "eCPM", format: (v: number) => `$${v.toFixed(2)}`, color: "#16a34a" },
  impressions: {
    key: "impressions",
    label: "Impressions",
    format: (v: number) => `${v.toFixed(2)}M`,
    color: "#7c3aed",
  },
}

// Get day name from date
function getDayName(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[date.getDay()]
}

export function RevenueChart() {
  const [activeTab, setActiveTab] = useState<"revenue" | "ecpm" | "impressions">("revenue")
  const { dateRange, preset, refreshKey } = useDashboardDate()
  const config = tabConfig[activeTab]

  // Use dateRange from context (default: last7days, can be changed when Apply is clicked)
  const currentApiParams = useMemo(() => {
    // Default to 7days if no preset is set
    const effectivePreset = preset || '7days'
    
    if (effectivePreset === 'custom' && dateRange?.from && dateRange?.to) {
      return {
        range: 'custom' as DateRangeType,
        startDate: formatDateForAPI(dateRange.from),
        endDate: formatDateForAPI(dateRange.to),
        metric: activeTab,
      }
    }
    
    // Map preset to DateRangeType
    return {
      range: mapPresetToDateRangeType(effectivePreset),
      metric: activeTab,
    }
  }, [preset, dateRange, activeTab])

  // Calculate previous period for comparison (same range type)
  const previousApiParams = useMemo(() => {
    // For comparison, use the same range type but previous period
    // This is handled by the backend DateRangeBuilder
    return currentApiParams
  }, [currentApiParams])

  // Memoize API call functions
  const fetchChartData = useMemo(
    () => () => dashboardApi.getRevenueOverview(currentApiParams),
    [currentApiParams]
  )

  const fetchPreviousChartData = useMemo(
    () => () => activeTab === "revenue" ? dashboardApi.getRevenueOverview(previousApiParams) : Promise.resolve(null),
    [previousApiParams, activeTab]
  )

  // Build cache key based on params
  const cacheKey = useMemo(() => {
    const effectivePreset = preset || '7days'
    
    if (effectivePreset === 'custom' && dateRange?.from && dateRange?.to) {
      return `revenue_overview_custom_${formatDateForAPI(dateRange.from)}_${formatDateForAPI(dateRange.to)}_${activeTab}`
    }
    
    return `revenue_overview_${effectivePreset}_${activeTab}`
  }, [preset, dateRange, activeTab])

  // Fetch chart data
  const { data: revenueOverviewData, loading: chartLoading, refetch: refetchChart } = useApi(
    fetchChartData,
    { enabled: true, cacheKey }
  )

  // Fetch previous period data for comparison (only for revenue tab)
  const { data: previousRevenueOverviewData, loading: previousLoading, refetch: refetchPrevious } = useApi(
    fetchPreviousChartData,
    { enabled: activeTab === "revenue", cacheKey: `${cacheKey}_previous` }
  )

  // Only refetch when refreshKey changes (when Apply/Refresh button is clicked)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchChart()
      if (activeTab === "revenue") {
        refetchPrevious()
      }
    }
  }, [refreshKey, activeTab, refetchChart, refetchPrevious])

  // Process chart data from new API format
  const processedChartData = useMemo(() => {
    if (!revenueOverviewData?.data || revenueOverviewData.data.length === 0) return []

    // Map API data to chart format
    const mappedData = revenueOverviewData.data.map(item => {
      const dateObj = new Date(item.date)
      return {
        day: getDayName(dateObj),
        date: item.date,
        revenue: activeTab === 'revenue' ? item.value : 0,
        previousRevenue: activeTab === 'revenue' ? (item.comparisonValue || 0) : 0,
        ecpm: activeTab === 'ecpm' ? item.value : 0,
        impressions: activeTab === 'impressions' ? item.value : 0,
      }
    })

    return mappedData
  }, [revenueOverviewData, activeTab])

  const isLoading = chartLoading || (activeTab === "revenue" && previousLoading)

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Revenue Overview</CardTitle>
              <CardDescription className="text-sm text-slate-500">Last 7 days performance</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-9">
                <TabsTrigger value="revenue" className="text-xs px-3">Revenue</TabsTrigger>
                <TabsTrigger value="ecpm" className="text-xs px-3">eCPM</TabsTrigger>
                <TabsTrigger value="impressions" className="text-xs px-3">Impressions</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (processedChartData.length === 0) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Revenue Overview</CardTitle>
              <CardDescription className="text-sm text-slate-500">Last 7 days performance</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-9">
                <TabsTrigger value="revenue" className="text-xs px-3">Revenue</TabsTrigger>
                <TabsTrigger value="ecpm" className="text-xs px-3">eCPM</TabsTrigger>
                <TabsTrigger value="impressions" className="text-xs px-3">Impressions</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72 flex items-center justify-center text-sm text-slate-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Revenue Overview</CardTitle>
            <CardDescription className="text-sm text-slate-500">Performance metrics over time</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-9">
                <TabsTrigger value="revenue" className="text-xs px-3">
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="ecpm" className="text-xs px-3">
                  eCPM
                </TabsTrigger>
                <TabsTrigger value="impressions" className="text-xs px-3">
                  Impressions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={config.format}
                dx={-10}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3">
                        <p className="text-sm font-medium text-slate-900">{label}</p>
                        <p className="text-sm text-slate-600">
                          {config.label}:{" "}
                          <span className="font-semibold" style={{ color: config.color }}>
                            {config.format(payload[0].value as number)}
                          </span>
                        </p>
                        {activeTab === "revenue" && payload[1] && (
                          <p className="text-xs text-slate-400 mt-1">
                            Previous: {config.format(payload[1].value as number)}
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey={activeTab}
                stroke={config.color}
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
              {activeTab === "revenue" && (
                <Line
                  type="monotone"
                  dataKey="previousRevenue"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
