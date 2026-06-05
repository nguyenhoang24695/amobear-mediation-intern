"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, Eye, Percent, Loader2 } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { mapPresetToDateRangeType, formatDateForAPI } from "@/lib/utils/dashboard"
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
  const { refreshKey, appliedPreset, appliedDateRange } = useDashboardDate()

  // Chỉ dùng giá trị đã Apply — tránh gọi API khi chỉ đổi date picker
  const apiParams = useMemo(() => {
    const effectivePreset = appliedPreset || "7days"
    if (effectivePreset === "custom" && appliedDateRange?.from && appliedDateRange?.to) {
      return {
        range: "custom" as DateRangeType,
        startDate: formatDateForAPI(appliedDateRange.from),
        endDate: formatDateForAPI(appliedDateRange.to),
      }
    }
    return {
      range: mapPresetToDateRangeType(effectivePreset) as DateRangeType,
    }
  }, [appliedPreset, appliedDateRange])

  const cacheKey = useMemo(() => {
    const effectivePreset = appliedPreset || "7days"
    if (effectivePreset === "custom" && appliedDateRange?.from && appliedDateRange?.to) {
      return `key_metrics_custom_${formatDateForAPI(appliedDateRange.from)}_${formatDateForAPI(appliedDateRange.to)}`
    }
    return `key_metrics_${effectivePreset}`
  }, [appliedPreset, appliedDateRange])

  // Fetch key metrics theo range đã chọn
  const { data: keyMetricsData, loading: metricsLoading, refetch: refetchMetrics } = useApi(
    () => dashboardApi.getKeyMetrics(apiParams),
    { enabled: true, cacheKey }
  )

  // Refetch when user clicks Apply or Refresh in dashboard date picker (refreshKey increments)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchMetrics()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when refreshKey changes
  }, [refreshKey])

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

    const periodLabel = appliedPreset === "today" ? "Today" : appliedPreset === "30days" ? "30 days" : appliedPreset === "custom" ? "Custom" : "7 days"
    return [
      {
        title: `Revenue (${periodLabel})`,
        value: m.revenue.formattedValue,
        change: `${m.revenue.change >= 0 ? '+' : ''}${m.revenue.change.toFixed(1)}%`,
        trend: m.revenue.changeDirection as "up" | "down",
        icon: DollarSign,
        sparklineData: sparklineToChartData(m.revenue.sparkline),
        color: "#2563eb",
      },
      {
        title: `Average eCPM (${periodLabel})`,
        value: m.averageEcpm.formattedValue,
        change: `${m.averageEcpm.change >= 0 ? '+' : ''}${m.averageEcpm.change.toFixed(1)}%`,
        trend: m.averageEcpm.changeDirection as "up" | "down",
        icon: Activity,
        sparklineData: sparklineToChartData(m.averageEcpm.sparkline),
        color: "#2563eb",
      },
      {
        title: `Impressions (${periodLabel})`,
        value: m.impressions.formattedValue,
        change: `${m.impressions.change >= 0 ? '+' : ''}${m.impressions.change.toFixed(1)}%`,
        trend: m.impressions.changeDirection as "up" | "down",
        icon: Eye,
        sparklineData: sparklineToChartData(m.impressions.sparkline),
        color: "#2563eb",
      },
      {
        title: `Fill Rate (${periodLabel})`,
        value: m.fillRate.formattedValue,
        change: `${m.fillRate.change >= 0 ? '+' : ''}${m.fillRate.change.toFixed(1)}%`,
        trend: m.fillRate.changeDirection as "up" | "down",
        icon: Percent,
        sparklineData: sparklineToChartData(m.fillRate.sparkline),
        color: m.fillRate.changeDirection === 'up' ? "#2563eb" : "#ef4444",
      },
    ]
  }, [keyMetricsData, appliedPreset])

  const isLoading = metricsLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3 sm:p-4 lg:p-6">
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="text-center text-sm text-slate-500">No data available</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium leading-tight text-slate-500 sm:text-sm">{metric.title}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl lg:text-3xl">{metric.value}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`px-1.5 py-0.5 text-[10px] font-medium sm:text-xs ${
                      metric.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="mr-0.5 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-0.5 h-3 w-3" />
                    )}
                    {metric.change}
                  </Badge>
                  <span className="hidden text-xs text-slate-400 sm:inline">vs previous period</span>
                </div>
              </div>
              <div className="hidden h-12 w-20 shrink-0 sm:block">
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
