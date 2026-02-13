"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, Eye, Percent, Loader2 } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { useApi } from "@/hooks/use-api"
import { performanceApi, dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"

// Format number with commas
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`
  }
  return num.toFixed(0)
}

// Format currency
function formatCurrency(num: number): string {
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function MetricsRow() {
  const { refreshKey, appliedPreset } = useDashboardDate()

  // Chỉ dùng giá trị đã Apply
  const period = appliedPreset === 'today' ? 'today' : appliedPreset === '7days' ? '7days' : '30days'

  // Fetch metrics from cache
  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useApi(
    () => dashboardApi.getMetrics(period as 'today' | '7days' | '30days'),
    { enabled: true, cacheKey: `metrics_${period}` }
  )

  // Get today and yesterday dates for comparison (still needed for sparklines)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999)
  const yesterdayStart = new Date(yesterday)
  yesterdayStart.setHours(0, 0, 0, 0)

  const todayStr = todayStart.toISOString().split('T')[0]
  const yesterdayStr = yesterdayStart.toISOString().split('T')[0]

  // Fetch today's performance data (for sparklines only)
  const { data: todayData, loading: todayLoading, refetch: refetchToday } = useApi(
    () => performanceApi.getPerformanceData({
      startDate: todayStr,
      endDate: todayStr,
      pageSize: 1000,
    }),
    { enabled: true, cacheKey: `performance_today_${todayStr}` }
  )

  // Fetch yesterday's performance data (for comparison only)
  const { data: yesterdayData, loading: yesterdayLoading, refetch: refetchYesterday } = useApi(
    () => performanceApi.getPerformanceData({
      startDate: yesterdayStr,
      endDate: yesterdayStr,
      pageSize: 1000,
    }),
    { enabled: true, cacheKey: `performance_yesterday_${yesterdayStr}` }
  )

  // Refetch only when Apply/Refresh is clicked (one run per refreshKey change)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchMetrics()
      refetchToday()
      refetchYesterday()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on refreshKey to avoid multiple refetches
  }, [refreshKey])

  // Use cached metrics if available, otherwise calculate from raw data
  const metrics = useMemo(() => {
    // If we have cached metrics, use them (preferred)
    if (metricsData) {
      const m = metricsData as any
      const revenueSparkline = [{ value: m.revenueToday?.value || 0 }]
      const impressionsSparkline = [{ value: (m.impressions?.value || 0) / 1_000_000 }]
      const ecpmSparkline = [{ value: m.averageEcpm?.value || 0 }]
      const fillRateSparkline = [{ value: m.fillRate?.value || 0 }]

      return [
        {
          title: "Revenue Today",
          value: formatCurrency(m.revenueToday?.value || 0),
          change: `${(m.revenueToday?.change || 0) >= 0 ? '+' : ''}${(m.revenueToday?.change || 0).toFixed(1)}%`,
          trend: (m.revenueToday?.trend || 'up') as "up" | "down",
          icon: DollarSign,
          sparklineData: revenueSparkline,
          color: "#2563eb",
        },
        {
          title: "Average eCPM",
          value: formatCurrency(m.averageEcpm?.value || 0),
          change: `${(m.averageEcpm?.change || 0) >= 0 ? '+' : ''}${(m.averageEcpm?.change || 0).toFixed(1)}%`,
          trend: (m.averageEcpm?.trend || 'up') as "up" | "down",
          icon: Activity,
          sparklineData: ecpmSparkline,
          color: "#2563eb",
        },
        {
          title: "Impressions",
          value: formatNumber(m.impressions?.value || 0),
          change: `${(m.impressions?.change || 0) >= 0 ? '+' : ''}${(m.impressions?.change || 0).toFixed(1)}%`,
          trend: (m.impressions?.trend || 'up') as "up" | "down",
          icon: Eye,
          sparklineData: impressionsSparkline,
          color: "#2563eb",
        },
        {
          title: "Fill Rate",
          value: `${(m.fillRate?.value || 0).toFixed(1)}%`,
          change: `${(m.fillRate?.change || 0) >= 0 ? '+' : ''}${(m.fillRate?.change || 0).toFixed(1)}%`,
          trend: (m.fillRate?.trend || 'up') as "up" | "down",
          icon: Percent,
          sparklineData: fillRateSparkline,
          color: (m.fillRate?.trend || 'up') === 'up' ? "#2563eb" : "#ef4444",
        },
      ]
    }

    // Fallback: calculate from raw data if cache miss
    if (!todayData || !yesterdayData) {
      return null
    }

    // Calculate today's totals
    const todayRevenue = todayData.data.reduce((sum, d) => sum + (d.revenueMicros || 0), 0) / 1_000_000
    const todayImpressions = todayData.data.reduce((sum, d) => sum + (d.impressions || 0), 0)
    const todayEcpm = todayData.data.length > 0
      ? todayData.data.reduce((sum, d) => sum + (d.ecpmMicros || 0), 0) / todayData.data.length / 1_000_000
      : 0
    const todayFillRate = todayData.data.length > 0
      ? todayData.data.reduce((sum, d) => sum + (d.fillRate || 0), 0) / todayData.data.length
      : 0

    // Calculate yesterday's totals
    const yesterdayRevenue = yesterdayData.data.reduce((sum, d) => sum + (d.revenueMicros || 0), 0) / 1_000_000
    const yesterdayImpressions = yesterdayData.data.reduce((sum, d) => sum + (d.impressions || 0), 0)
    const yesterdayEcpm = yesterdayData.data.length > 0
      ? yesterdayData.data.reduce((sum, d) => sum + (d.ecpmMicros || 0), 0) / yesterdayData.data.length / 1_000_000
      : 0
    const yesterdayFillRate = yesterdayData.data.length > 0
      ? yesterdayData.data.reduce((sum, d) => sum + (d.fillRate || 0), 0) / yesterdayData.data.length
      : 0

    // Calculate changes
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0
    const impressionsChange = yesterdayImpressions > 0
      ? ((todayImpressions - yesterdayImpressions) / yesterdayImpressions) * 100
      : 0
    const ecpmChange = yesterdayEcpm > 0
      ? ((todayEcpm - yesterdayEcpm) / yesterdayEcpm) * 100
      : 0
    const fillRateChange = yesterdayFillRate > 0
      ? ((todayFillRate - yesterdayFillRate) / yesterdayFillRate) * 100
      : 0

    // Generate simple sparkline data
    const revenueSparkline = [{ value: todayRevenue }]
    const impressionsSparkline = [{ value: todayImpressions / 1_000_000 }]
    const ecpmSparkline = [{ value: todayEcpm }]
    const fillRateSparkline = [{ value: todayFillRate * 100 }]

    return [
      {
        title: "Revenue Today",
        value: formatCurrency(todayRevenue),
        change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
        trend: revenueChange >= 0 ? "up" as const : "down" as const,
        icon: DollarSign,
        sparklineData: revenueSparkline,
        color: "#2563eb",
      },
      {
        title: "Average eCPM",
        value: formatCurrency(todayEcpm),
        change: `${ecpmChange >= 0 ? '+' : ''}${ecpmChange.toFixed(1)}%`,
        trend: ecpmChange >= 0 ? "up" as const : "down" as const,
        icon: Activity,
        sparklineData: ecpmSparkline,
        color: "#2563eb",
      },
      {
        title: "Impressions",
        value: formatNumber(todayImpressions),
        change: `${impressionsChange >= 0 ? '+' : ''}${impressionsChange.toFixed(1)}%`,
        trend: impressionsChange >= 0 ? "up" as const : "down" as const,
        icon: Eye,
        sparklineData: impressionsSparkline,
        color: "#2563eb",
      },
      {
        title: "Fill Rate",
        value: `${(todayFillRate * 100).toFixed(1)}%`,
        change: `${fillRateChange >= 0 ? '+' : ''}${fillRateChange.toFixed(1)}%`,
        trend: fillRateChange >= 0 ? "up" as const : "down" as const,
        icon: Percent,
        sparklineData: fillRateSparkline,
        color: fillRateChange >= 0 ? "#2563eb" : "#ef4444",
      },
    ]
  }, [metricsData, todayData, yesterdayData])

  const isLoading = metricsLoading || todayLoading || yesterdayLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="text-center text-sm text-slate-500">No data available</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{metric.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{metric.value}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge
                    variant="secondary"
                    className={`px-1.5 py-0.5 text-xs font-medium ${
                      metric.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {metric.change}
                  </Badge>
                  <span className="text-xs text-slate-400">vs yesterday</span>
                </div>
              </div>
              <div className="w-20 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.sparklineData}>
                    <defs>
                      <linearGradient id={`gradient-${metric.title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${metric.title.replace(/\s+/g, '-')})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
