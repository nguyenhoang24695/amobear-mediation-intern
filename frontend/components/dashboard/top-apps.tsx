"use client"

import { useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { mapPresetToDateRangeType, formatDateForAPI } from "@/lib/utils/dashboard"
import type { DateRangeType, TopApps } from "@/types/api"

// Format currency
function formatCurrency(num: number): string {
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TopApps() {
  const { dateRange, preset, refreshKey } = useDashboardDate()

  // Use dateRange from context (default: last7days, can be changed when Apply is clicked)
  const apiParams = useMemo((): {
    range: DateRangeType
    startDate?: string
    endDate?: string
    limit: number
  } => {
    // Default to 7days if no preset is set
    const effectivePreset = preset || '7days'
    
    if (effectivePreset === 'custom' && dateRange?.from && dateRange?.to) {
      return {
        range: 'custom' as DateRangeType,
        startDate: formatDateForAPI(dateRange.from),
        endDate: formatDateForAPI(dateRange.to),
        limit: 4,
      }
    }
    
    // Map preset to DateRangeType
    return {
      range: mapPresetToDateRangeType(effectivePreset),
      limit: 4,
    }
  }, [preset, dateRange])

  // Build cache key based on params
  const cacheKey = useMemo(() => {
    const effectivePreset = preset || '7days'
    
    if (effectivePreset === 'custom' && dateRange?.from && dateRange?.to) {
      return `topapps_custom_${formatDateForAPI(dateRange.from)}_${formatDateForAPI(dateRange.to)}`
    }
    
    return `topapps_${effectivePreset}`
  }, [preset, dateRange])

  // Fetch top apps from API
  const { data: topAppsResponse, loading, refetch: refetchTopApps } = useApi<TopApps>(
    () => dashboardApi.getTopApps(apiParams),
    { enabled: true, cacheKey }
  )

  // Only refetch when refreshKey changes (when Apply/Refresh button is clicked)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchTopApps()
    }
  }, [refreshKey, refetchTopApps])

  const topApps = useMemo(() => {
    if (!topAppsResponse?.apps) return []
    
    return topAppsResponse.apps.map((app) => ({
      id: app.appId.toString(),
      rank: app.rank,
      name: app.appName,
      icon: app.iconUrl || `/placeholder.svg`,
      revenue: formatCurrency(app.revenue),
      ecpm: formatCurrency(app.ecpm),
      trend: app.change >= 0 ? 'up' as const : 'down' as const,
    }))
  }, [topAppsResponse])

  const totalApps = topAppsResponse?.totalApps || 0

  if (loading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Top Apps by Revenue</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (topApps.length === 0) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Top Apps by Revenue</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-sm text-slate-500 py-8">No apps data available</div>
          <Link href="/apps">
            <Button variant="link" className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
              View All Apps
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Top Apps by Revenue</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {topApps.map((app) => (
            <Link
              key={app.rank}
              href={`/apps/${app.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer block"
            >
              <span className="text-sm font-semibold text-slate-400 w-5">{app.rank}</span>
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={app.icon || "/placeholder.svg"} className="rounded-lg" />
                <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs">
                  {app.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate hover:text-blue-600 transition-colors">
                  {app.name}
                </p>
                <p className="text-xs text-slate-500">eCPM: {app.ecpm}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{app.revenue}</p>
                <div className="flex items-center justify-end gap-0.5">
                  {app.trend === "up" ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/apps">
          <Button variant="link" className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
            View All {totalApps} Apps
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
