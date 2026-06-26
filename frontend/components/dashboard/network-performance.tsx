"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { formatDateForAPI } from "@/lib/utils/dashboard"
import type { DateRangeType } from "@/types/api"

// Network colors mapping
const networkColors: Record<string, string> = {
  "admob_bidding": "#2563eb",
  "admob_waterfall": "#0ea5e9",
  "meta": "#8b5cf6",
  "unity": "#f59e0b",
  "applovin": "#10b981",
  "ironsource": "#ef4444",
  "vungle": "#64748b",
  "chartboost": "#06b6d4",
  "mintegral": "#84cc16",
  "pangle": "#f97316",
}

function formatCurrency(num: number): string {
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function NetworkPerformance() {
  const { refreshKey, appliedPreset, appliedDateRange } = useDashboardDate()

  const rangeType = appliedPreset === 'today' ? 'today' : appliedPreset === '7days' ? 'last7days' : appliedPreset === '30days' ? 'last30days' : 'custom'

  // Chỉ dùng giá trị đã Apply — tránh gọi API khi chỉ đổi date picker. formatDateForAPI tránh lệch ngày UTC.
  const apiParams = useMemo(() => {
    if (appliedPreset === 'custom' && appliedDateRange.from && appliedDateRange.to) {
      return {
        range: 'custom' as const,
        startDate: formatDateForAPI(appliedDateRange.from),
        endDate: formatDateForAPI(appliedDateRange.to),
      }
    }
    return {
      range: rangeType as DateRangeType,
    }
  }, [appliedPreset, appliedDateRange, rangeType])

  const networkCacheKey = useMemo(() => {
    if (appliedPreset === 'custom' && appliedDateRange.from && appliedDateRange.to) {
      return `network_revenue_custom_${formatDateForAPI(appliedDateRange.from)}_${formatDateForAPI(appliedDateRange.to)}`
    }
    return `network_revenue_${appliedPreset}`
  }, [appliedPreset, appliedDateRange])

  // Fetch revenue by network từ API
  const { data: networkData, loading, refetch: refetchNetwork } = useApi(
    () => dashboardApi.getRevenueByNetwork(apiParams),
    { enabled: true, cacheKey: networkCacheKey }
  )

  // Refetch only when Apply/Refresh is clicked (one run per refreshKey change)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchNetwork()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on refreshKey to avoid multiple refetches
  }, [refreshKey])

  const networks = useMemo(() => {
    if (!networkData?.networks) return []

    // Chỉ lấy Top 5 theo Revenue (giảm dần)
    return [...networkData.networks]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((network) => ({
        name: network.networkName,
        percentage: network.percentage,
        revenue: formatCurrency(network.revenue),
        color: networkColors[network.networkId.toLowerCase()] || "#64748b",
      }))
  }, [networkData])

  const totalRevenue = networkData?.totalRevenue ? formatCurrency(networkData.totalRevenue) : "$0.00"

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold ">Revenue by Ad Network</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (networks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold ">Revenue by Ad Network</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="py-8 text-center text-sm text-muted-foreground">No network data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold ">Revenue by Ad Network</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {networks.map((network) => (
            <div key={network.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: network.color }} />
                  <span className="text-sm font-medium ">{network.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm ">{network.revenue}</span>
                  <span className="text-sm font-semibold  w-12 text-right">{network.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${network.percentage}%`,
                    backgroundColor: network.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm ">Total Revenue</span>
            <span className="text-lg font-bold text-foreground">{totalRevenue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
