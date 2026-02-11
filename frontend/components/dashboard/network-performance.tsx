"use client"

import { useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
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
  const { refreshKey, preset, dateRange } = useDashboardDate()

  // Map preset to DateRangeType for API
  const rangeType = preset === 'today' ? 'today' : preset === '7days' ? 'last7days' : preset === '30days' ? 'last30days' : 'custom'
  
  // Prepare API params
  const apiParams = useMemo(() => {
    if (preset === 'custom' && dateRange.from && dateRange.to) {
      return {
        range: 'custom' as const,
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
      }
    }
    return {
      range: rangeType as DateRangeType,
    }
  }, [preset, dateRange, rangeType])

  // Fetch revenue by network from new API
  const { data: networkData, loading, refetch: refetchNetwork } = useApi(
    () => dashboardApi.getRevenueByNetwork(apiParams),
    { enabled: true, cacheKey: `network_revenue_${preset}_${dateRange.from?.toISOString()}_${dateRange.to?.toISOString()}` }
  )

  // Only refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      refetchNetwork()
    }
  }, [refreshKey, refetchNetwork])

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
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Revenue by Ad Network</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (networks.length === 0) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Revenue by Ad Network</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-sm text-slate-500 py-8">No network data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Revenue by Ad Network</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {networks.map((network) => (
            <div key={network.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: network.color }} />
                  <span className="text-sm font-medium text-slate-700">{network.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{network.revenue}</span>
                  <span className="text-sm font-semibold text-slate-900 w-12 text-right">{network.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total Revenue</span>
            <span className="text-lg font-bold text-slate-900">{totalRevenue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
