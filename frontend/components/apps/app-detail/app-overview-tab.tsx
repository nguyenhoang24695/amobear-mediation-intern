"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Percent,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Clock,
  Hash,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { useApi } from "@/hooks/use-api"
import { structureApi, appMetricsApi, performanceApi, alertsApi } from "@/lib/api/services"
import type { App, PerformanceData } from "@/types/api"

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  amber: "bg-amber-50 text-amber-600",
  cyan: "bg-cyan-50 text-cyan-600",
}

interface AppOverviewTabProps {
  onNavigateToTab?: (tab: string) => void
}

export function AppOverviewTab({ onNavigateToTab }: AppOverviewTabProps) {
  const [chartMetric, setChartMetric] = useState<"revenue" | "ecpm" | "impressions">("revenue")
  const [dateRange, setDateRange] = useState("7d")

  const params = useParams()
  const appNumericId = Number((params as any)?.id)
  const hasValidAppId = !Number.isNaN(appNumericId)

  // Load app detail
  const { data: app } = useApi<App>(
    () => structureApi.getApp(appNumericId),
    {
      enabled: hasValidAppId,
      cacheKey: hasValidAppId ? `app_detail_${appNumericId}` : undefined,
    },
  )

  // Date range for chart
  const { chartStartDate, chartEndDate } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const end = new Date(today)
    const start = new Date(today)

    switch (dateRange) {
      case "14d":
        start.setDate(start.getDate() - 13)
        break
      case "30d":
        start.setDate(start.getDate() - 29)
        break
      case "90d":
        start.setDate(start.getDate() - 89)
        break
      case "7d":
      default:
        start.setDate(start.getDate() - 6)
        break
    }

    const toIsoDate = (d: Date) => d.toISOString().split("T")[0]

    return {
      chartStartDate: toIsoDate(start),
      chartEndDate: toIsoDate(end),
    }
  }, [dateRange])

  // Metrics for cards (today + last 7 days)
  const { data: metrics } = useApi(
    async () => {
      if (!app) return null

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split("T")[0]

      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 6)
      const last7Str = last7.toISOString().split("T")[0]

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthStartStr = monthStart.toISOString().split("T")[0]

      const [todayMetrics, last7Metrics, mtdMetrics] = await Promise.all([
        appMetricsApi.getAppMetrics(app.appId, { startDate: todayStr, endDate: todayStr }).catch(() => null),
        appMetricsApi.getAppMetrics(app.appId, { startDate: last7Str, endDate: todayStr }).catch(() => null),
        appMetricsApi.getAppMetrics(app.appId, { startDate: monthStartStr, endDate: todayStr }).catch(() => null),
      ])

      return { todayMetrics, last7Metrics, mtdMetrics }
    },
    {
      enabled: !!app,
      cacheKey: app ? `app_metrics_overview_${app.id}` : undefined,
    },
  )

  const statsCards = useMemo(() => {
    if (!metrics) return []

    const { todayMetrics, last7Metrics, mtdMetrics } = metrics

    const todayRevenue = todayMetrics?.totalRevenue ?? 0
    const mtdRevenue = mtdMetrics?.totalRevenue ?? 0
    const avgEcpm = last7Metrics?.avgEcpm ?? 0
    const impressions7d = last7Metrics?.totalImpressions ?? 0
    const fillRate7d = (last7Metrics?.avgFillRate ?? 0) * 100

    return [
      {
        label: "Revenue Today",
        value: `$${todayRevenue.toFixed(2)}`,
        change: 0,
        icon: DollarSign,
        color: "blue",
      },
      {
        label: "Revenue MTD",
        value: `$${mtdRevenue.toFixed(2)}`,
        change: 0,
        icon: DollarSign,
        color: "green",
      },
      {
        label: "eCPM (7d avg)",
        value: `$${avgEcpm.toFixed(2)}`,
        change: 0,
        icon: BarChart3,
        color: "purple",
      },
      {
        label: "Impressions (7d)",
        value: impressions7d.toLocaleString(),
        change: 0,
        icon: Eye,
        color: "amber",
      },
      {
        label: "Fill Rate (7d)",
        value: `${fillRate7d.toFixed(2)}%`,
        change: 0,
        icon: Percent,
        color: "cyan",
      },
    ]
  }, [metrics])

  // Performance data for chart (per-day)
  const { data: performance } = useApi(
    async () => {
      if (!app) return null

      const response = await performanceApi.getPerformanceData({
        appId: app.appId,
        startDate: chartStartDate,
        endDate: chartEndDate,
        page: 1,
        pageSize: 500,
      })

      return response
    },
    {
      enabled: !!app && !!chartStartDate && !!chartEndDate,
      cacheKey: app ? `app_perf_${app.id}_${chartStartDate}_${chartEndDate}` : undefined,
    },
  )

  const performanceData = useMemo(() => {
    if (!performance || !performance.data) return []

    const byDate = new Map<
      string,
      {
        revenue: number
        ecpm: number
        impressions: number
      }
    >()

    performance.data.forEach((row: PerformanceData) => {
      const dateKey = row.date.split("T")[0]
      const existing = byDate.get(dateKey) ?? { revenue: 0, ecpm: 0, impressions: 0 }

      const revenue = (row.revenueMicros ?? 0) / 1_000_000
      const impressions = row.impressions ?? 0
      const ecpm = row.ecpmMicros ? row.ecpmMicros / 1_000_000 : 0

      existing.revenue += revenue
      existing.impressions += impressions

      if (ecpm > 0) {
        existing.ecpm = ecpm
      }

      byDate.set(dateKey, existing)
    })

    const entries = Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))

    return entries.map(([date, values]) => {
      const d = new Date(date)
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      return {
        date: label,
        revenue: values.revenue,
        ecpm: values.ecpm,
        impressions: Math.round(values.impressions / 1000),
      }
    })
  }, [performance])

  // Active alerts for this app
  const { data: alerts } = useApi(
    async () => {
      if (!app) return null
      return alertsApi.getActiveAlerts({ appId: app.appId })
    },
    {
      enabled: !!app,
      cacheKey: app ? `app_alerts_${app.id}` : undefined,
    },
  )

  const metricConfig = {
    revenue: { key: "revenue", label: "Revenue", format: (v: number) => `$${v.toFixed(2)}`, color: "#2563eb" },
    ecpm: { key: "ecpm", label: "eCPM", format: (v: number) => `$${v.toFixed(2)}`, color: "#16a34a" },
    impressions: {
      key: "impressions",
      label: "Impressions",
      format: (v: number) => v.toLocaleString(),
      color: "#7c3aed",
    },
  }

  const config = metricConfig[chartMetric]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.length === 0 ? (
          <Card className="border-slate-200 col-span-2 lg:col-span-5">
            <CardContent className="p-6 flex items-center justify-center text-sm text-slate-500">
              Loading metrics...
            </CardContent>
          </Card>
        ) : (
          statsCards.map((stat, idx) => (
            <Card key={idx} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[stat.color]}`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {stat.change >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${stat.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stat.change > 0 ? "+" : ""}
                    {stat.change.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-400">vs previous</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Performance Chart Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Performance</CardTitle>
                  <CardDescription className="text-sm text-slate-500">Track key metrics over time</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-32 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="14d">Last 14 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Tabs value={chartMetric} onValueChange={(v) => setChartMetric(v as typeof chartMetric)}>
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
                  <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={config.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      dy={10}
                    />
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
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={config.key}
                      stroke={config.color}
                      strokeWidth={2}
                      fill="url(#colorMetric)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ad Format Performance Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Ad Format Performance</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Revenue distribution by format (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Detailed breakdown by ad format will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Ad Units Summary Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Ad Units Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700">Total ad units</span>
                  <span className="text-sm font-medium text-slate-900">
                    {app?.adUnitsCount ?? 0}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  View the Ad Units tab for detailed configuration and performance per unit.
                </p>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto mt-4 text-blue-600 gap-1"
                onClick={() => onNavigateToTab?.("ad-units")}
              >
                Manage Ad Units
                <ArrowRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Mediation Groups Summary Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Mediation Groups</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-500">
                View and manage mediation groups associated with this app in the Mediation Groups tab.
              </p>
              <Button
                variant="link"
                className="p-0 h-auto mt-4 text-blue-600 gap-1"
                onClick={() => onNavigateToTab?.("mediation-groups")}
              >
                View All Groups
                <ArrowRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Top Networks Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Top Networks</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Revenue contribution by network (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-slate-500">
                Network-level breakdown for this app will be available in a future update.
              </p>
            </CardContent>
          </Card>

          {/* Active Alerts Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Active Alerts</CardTitle>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {alerts?.data?.length ?? 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {!alerts || alerts.data.length === 0 ? (
                  <p className="text-sm text-slate-500">No active alerts for this app today.</p>
                ) : (
                  alerts.data.slice(0, 5).map((alert) => {
                    const isError = alert.severity === "CRITICAL" || alert.severity === "HIGH"
                    const triggeredTime = new Date(alert.triggeredAt).toLocaleString()
                    return (
                      <Link
                        key={alert.id}
                        href={`/alerts/${alert.id}`}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          isError ? "bg-red-50 hover:bg-red-100" : "bg-amber-50 hover:bg-amber-100"
                        }`}
                      >
                        {isError ? (
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm text-slate-700">{alert.message}</p>
                          <p className="text-xs text-slate-500 mt-1">{triggeredTime}</p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
              <Link href={app ? `/alerts?appId=${encodeURIComponent(app.appId)}` : "/alerts"}>
                <Button variant="link" className="p-0 h-auto mt-4 text-blue-600 gap-1">
                  View All Alerts
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {app ? new Date(app.createdAt).toLocaleDateString() : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Modified</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {app ? new Date(app.updatedAt).toLocaleDateString() : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">AdMob App ID</span>
                  </div>
                  <code className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                    {app?.appId ? app.appId.slice(-12) : "--"}
                  </code>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Revenue (MTD)</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {metrics?.mtdMetrics ? `$${metrics.mtdMetrics.totalRevenue.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
