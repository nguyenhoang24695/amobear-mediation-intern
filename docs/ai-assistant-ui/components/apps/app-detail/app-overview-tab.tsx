"use client"

import Link from "next/link"
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
  RectangleHorizontal,
  Square,
  Gift,
  LayoutGrid,
} from "lucide-react"
import { useState } from "react"
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

// Mock data
const statsCards = [
  { label: "Revenue Today", value: "$1,234.56", change: 12.3, icon: DollarSign, color: "blue" },
  { label: "Revenue MTD", value: "$28,456.78", change: 8.7, icon: DollarSign, color: "green" },
  { label: "eCPM", value: "$4.82", change: 5.2, icon: BarChart3, color: "purple" },
  { label: "Impressions Today", value: "256K", change: 10.1, icon: Eye, color: "amber" },
  { label: "Fill Rate", value: "95.8%", change: 0.3, icon: Percent, color: "cyan" },
]

const performanceData = [
  { date: "Jan 1", revenue: 1050, previousRevenue: 980, ecpm: 4.2, impressions: 250 },
  { date: "Jan 2", revenue: 1120, previousRevenue: 1020, ecpm: 4.35, impressions: 258 },
  { date: "Jan 3", revenue: 980, previousRevenue: 1100, ecpm: 4.1, impressions: 239 },
  { date: "Jan 4", revenue: 1280, previousRevenue: 1050, ecpm: 4.52, impressions: 283 },
  { date: "Jan 5", revenue: 1350, previousRevenue: 1120, ecpm: 4.68, impressions: 288 },
  { date: "Jan 6", revenue: 1180, previousRevenue: 1080, ecpm: 4.45, impressions: 265 },
  { date: "Jan 7", revenue: 1234, previousRevenue: 1150, ecpm: 4.82, impressions: 256 },
]

const adFormatData = [
  { name: "Rewarded", value: 45, color: "#f59e0b" },
  { name: "Interstitial", value: 30, color: "#8b5cf6" },
  { name: "Banner", value: 20, color: "#3b82f6" },
  { name: "Native", value: 5, color: "#22c55e" },
]

const adUnitsSummary = [
  { format: "Banner", count: 4, active: 4, icon: RectangleHorizontal },
  { format: "Interstitial", count: 3, active: 3, icon: Square },
  { format: "Rewarded", count: 3, active: 2, icon: Gift },
  { format: "Native", count: 2, active: 2, icon: LayoutGrid },
]

const mediationGroups = [
  { id: "1", name: "US Banner - High Value", format: "Banner", status: "Active" },
  { id: "2", name: "EU Interstitial - Gaming", format: "Interstitial", status: "Active" },
  { id: "3", name: "Global Rewarded - Default", format: "Rewarded", status: "Active" },
]

const networkPerformance = [
  { name: "AdMob", value: 42, color: "#facc15" },
  { name: "Unity Ads", value: 25, color: "#1e293b" },
  { name: "ironSource", value: 18, color: "#9333ea" },
  { name: "AppLovin", value: 15, color: "#ef4444" },
]

const activeAlerts = [
  { id: "1", type: "warning", message: "Fill rate dropped below 90% for Banner ads", time: "2 hours ago" },
  { id: "2", type: "error", message: "ironSource integration error detected", time: "4 hours ago" },
]

const quickInfo = {
  createdDate: "Jan 15, 2024",
  lastModified: "Jan 7, 2025",
  admobAppId: "ca-app-pub-1234567890123456~1234567890",
  lifetimeRevenue: "$142,567.89",
}

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

  const metricConfig = {
    revenue: { key: "revenue", label: "Revenue", format: (v: number) => `$${v.toLocaleString()}`, color: "#2563eb" },
    ecpm: { key: "ecpm", label: "eCPM", format: (v: number) => `$${v.toFixed(2)}`, color: "#16a34a" },
    impressions: { key: "impressions", label: "Impressions", format: (v: number) => `${v}K`, color: "#7c3aed" },
  }

  const config = metricConfig[chartMetric]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((stat, idx) => (
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
                {stat.change > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${stat.change > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stat.change > 0 ? "+" : ""}
                  {stat.change}%
                </span>
                <span className="text-xs text-slate-400">vs yesterday</span>
              </div>
            </CardContent>
          </Card>
        ))}
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
              <CardDescription className="text-sm text-slate-500">Revenue distribution by format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={adFormatData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {adFormatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2">
                                <p className="text-sm font-medium">{payload[0].name}</p>
                                <p className="text-sm text-slate-600">{payload[0].value}%</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {adFormatData.map((format, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: format.color }} />
                        <span className="text-sm text-slate-700">{format.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${format.value}%`, backgroundColor: format.color }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-10 text-right">{format.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
              <div className="space-y-3">
                {adUnitsSummary.map((unit, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigateToTab?.("ad-units")}
                    className="w-full flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <unit.icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{unit.format}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{unit.count}</span>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {unit.active} active
                      </Badge>
                    </div>
                  </button>
                ))}
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
              <div className="space-y-2">
                {mediationGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/mediation/${group.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm text-blue-600 hover:underline">{group.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.format}
                    </Badge>
                  </Link>
                ))}
              </div>
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
              <CardDescription className="text-sm text-slate-500">Revenue contribution %</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={networkPerformance} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      width={70}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-md p-2">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-sm text-slate-600">{payload[0].value}% of revenue</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {networkPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Active Alerts</CardTitle>
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  {activeAlerts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/alert-center/${alert.id}`}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      alert.type === "error" ? "bg-red-50 hover:bg-red-100" : "bg-amber-50 hover:bg-amber-100"
                    }`}
                  >
                    {alert.type === "error" ? (
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-slate-700">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/alert-center">
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
                  <span className="text-sm font-medium text-slate-900">{quickInfo.createdDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Modified</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{quickInfo.lastModified}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">AdMob App ID</span>
                  </div>
                  <code className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                    {quickInfo.admobAppId.slice(-12)}
                  </code>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Lifetime Revenue</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{quickInfo.lifetimeRevenue}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
