"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, Eye, Percent, Loader2 } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import type { DateRangeType } from "@/types/api"

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
  const { refreshKey } = useDashboardDate()
  
  // Always use "today" for metrics cards
  const apiParams = useMemo(() => {
    return {
      range: 'today' as DateRangeType,
    }
  }, [])

  // Fetch key metrics from new API (always "today")
  const { data: keyMetricsData, loading: metricsLoading, refetch: refetchMetrics } = useApi(
    () => dashboardApi.getKeyMetrics(apiParams),
    { enabled: true, cacheKey: `key_metrics_today` }
  )

  // Only refetch when refreshKey changes (when Apply/Refresh button is clicked)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchMetrics()
    }
  }, [refreshKey, refetchMetrics])

  // Process key metrics from API
  const metrics = useMemo(() => {
    if (!keyMetricsData) {
      return null
    }

    const m = keyMetricsData

    // Convert sparkline array to chart format
    const sparklineToChartData = (sparkline: number[]) => {
      return sparkline.map((value, index) => ({ value }))
    }

    return [
      {
        title: "Revenue Today",
        value: m.revenue.formattedValue,
        change: `${m.revenue.change >= 0 ? '+' : ''}${m.revenue.change.toFixed(1)}%`,
        trend: m.revenue.changeDirection as "up" | "down",
        icon: DollarSign,
        sparklineData: sparklineToChartData(m.revenue.sparkline),
        color: "#2563eb",
      },
      {
        title: "Average eCPM",
        value: m.averageEcpm.formattedValue,
        change: `${m.averageEcpm.change >= 0 ? '+' : ''}${m.averageEcpm.change.toFixed(1)}%`,
        trend: m.averageEcpm.changeDirection as "up" | "down",
        icon: Activity,
        sparklineData: sparklineToChartData(m.averageEcpm.sparkline),
        color: "#2563eb",
      },
      {
        title: "Impressions",
        value: m.impressions.formattedValue,
        change: `${m.impressions.change >= 0 ? '+' : ''}${m.impressions.change.toFixed(1)}%`,
        trend: m.impressions.changeDirection as "up" | "down",
        icon: Eye,
        sparklineData: sparklineToChartData(m.impressions.sparkline),
        color: "#2563eb",
      },
      {
        title: "Fill Rate",
        value: m.fillRate.formattedValue,
        change: `${m.fillRate.change >= 0 ? '+' : ''}${m.fillRate.change.toFixed(1)}%`,
        trend: m.fillRate.changeDirection as "up" | "down",
        icon: Percent,
        sparklineData: sparklineToChartData(m.fillRate.sparkline),
        color: m.fillRate.changeDirection === 'up' ? "#2563eb" : "#ef4444",
      },
    ]
  }, [keyMetricsData])

  const isLoading = metricsLoading

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
