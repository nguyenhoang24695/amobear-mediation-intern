"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts"
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Eye,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock revenue over time data
const revenueData = [
  { date: "Jan 1", revenue: 380, ecpm: 4.2, fill: 92 },
  { date: "Jan 2", revenue: 420, ecpm: 4.5, fill: 93 },
  { date: "Jan 3", revenue: 395, ecpm: 4.3, fill: 91 },
  { date: "Jan 4", revenue: 450, ecpm: 4.8, fill: 94 },
  { date: "Jan 5", revenue: 480, ecpm: 5.1, fill: 95 },
  { date: "Jan 6", revenue: 520, ecpm: 5.4, fill: 96 },
  { date: "Jan 7", revenue: 490, ecpm: 5.2, fill: 94 },
  { date: "Jan 8", revenue: 510, ecpm: 5.3, fill: 95 },
  { date: "Jan 9", revenue: 550, ecpm: 5.6, fill: 96 },
  { date: "Jan 10", revenue: 580, ecpm: 5.8, fill: 97 },
  { date: "Jan 11", revenue: 560, ecpm: 5.7, fill: 96 },
  { date: "Jan 12", revenue: 590, ecpm: 5.9, fill: 97 },
  { date: "Jan 13", revenue: 620, ecpm: 6.1, fill: 98 },
  { date: "Jan 14", revenue: 600, ecpm: 6.0, fill: 97 },
]

// Mock network breakdown data
const networkBreakdownData = [
  { name: "AdMob Network", value: 35, color: "#FBBF24" },
  { name: "Meta AN", value: 25, color: "#3B82F6" },
  { name: "Unity Ads", value: 18, color: "#1E293B" },
  { name: "ironSource", value: 12, color: "#8B5CF6" },
  { name: "Others", value: 10, color: "#94A3B8" },
]

// Mock top performing sources
const topSourcesData = [
  {
    name: "AdMob Network",
    type: "Bidding",
    ecpm: 8.45,
    fill: 95.2,
    revenue: 4521,
    impressions: 535000,
    trend: 12.3,
  },
  {
    name: "Meta Audience Network",
    type: "Bidding",
    ecpm: 7.82,
    fill: 88.5,
    revenue: 3245,
    impressions: 415000,
    trend: 8.7,
  },
  {
    name: "Unity Ads",
    type: "Bidding",
    ecpm: 6.92,
    fill: 82.3,
    revenue: 2876,
    impressions: 415000,
    trend: -2.1,
  },
  {
    name: "ironSource",
    type: "Waterfall",
    ecpm: 5.34,
    fill: 76.1,
    revenue: 2134,
    impressions: 399000,
    trend: 5.4,
  },
  {
    name: "Vungle",
    type: "Waterfall",
    ecpm: 4.87,
    fill: 72.8,
    revenue: 1876,
    impressions: 385000,
    trend: 3.2,
  },
]

// Mock country breakdown
const countryData = [
  { country: "United States", code: "US", flag: "🇺🇸", revenue: 4200, ecpm: 8.2, percentage: 42 },
  { country: "United Kingdom", code: "GB", flag: "🇬🇧", revenue: 1850, ecpm: 6.5, percentage: 18 },
  { country: "Canada", code: "CA", flag: "🇨🇦", revenue: 1200, ecpm: 5.8, percentage: 12 },
  { country: "Germany", code: "DE", flag: "🇩🇪", revenue: 980, ecpm: 5.2, percentage: 10 },
  { country: "Australia", code: "AU", flag: "🇦🇺", revenue: 720, ecpm: 4.9, percentage: 7 },
  { country: "Others", code: "OT", flag: "🌍", revenue: 1050, ecpm: 3.2, percentage: 11 },
]

export function PerformanceTab() {
  const [dateRange, setDateRange] = useState("14d")
  const [chartMetric, setChartMetric] = useState("revenue")

  const summaryStats = [
    {
      label: "Total Revenue",
      value: "$12,450",
      change: 15.3,
      icon: DollarSign,
    },
    {
      label: "Avg eCPM",
      value: "$5.42",
      change: 8.2,
      icon: TrendingUp,
    },
    {
      label: "Fill Rate",
      value: "94.3%",
      change: 2.1,
      icon: Percent,
    },
    {
      label: "Impressions",
      value: "2.3M",
      change: 12.5,
      icon: Eye,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Performance Analytics</h2>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9 bg-white">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <stat.icon className="w-4 h-4" />
                {stat.label}
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    stat.change >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {stat.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stat.change >= 0 ? "+" : ""}
                  {stat.change}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue/eCPM Chart */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">
                Trends Over Time
              </CardTitle>
              <Tabs value={chartMetric} onValueChange={setChartMetric}>
                <TabsList className="h-8">
                  <TabsTrigger value="revenue" className="text-xs px-3 h-7">
                    Revenue
                  </TabsTrigger>
                  <TabsTrigger value="ecpm" className="text-xs px-3 h-7">
                    eCPM
                  </TabsTrigger>
                  <TabsTrigger value="fill" className="text-xs px-3 h-7">
                    Fill Rate
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickFormatter={(value) =>
                      chartMetric === "revenue"
                        ? `$${value}`
                        : chartMetric === "ecpm"
                          ? `$${value}`
                          : `${value}%`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [
                      chartMetric === "revenue"
                        ? `$${value}`
                        : chartMetric === "ecpm"
                          ? `$${value.toFixed(2)}`
                          : `${value}%`,
                      chartMetric === "revenue"
                        ? "Revenue"
                        : chartMetric === "ecpm"
                          ? "eCPM"
                          : "Fill Rate",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Network Breakdown Pie Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Revenue by Network
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={networkBreakdownData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {networkBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Share"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-slate-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Sources Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">
              Top Performing Ad Sources
            </CardTitle>
            <Button variant="link" className="h-auto p-0 text-blue-600 gap-1">
              View All
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-medium text-slate-500">
                    AD SOURCE
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    TYPE
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    eCPM
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    FILL RATE
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    REVENUE
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    IMPRESSIONS
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-right">
                    TREND
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSourcesData.map((source) => (
                  <TableRow key={source.name} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">
                      {source.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-0",
                          source.type === "Bidding"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {source.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${source.ecpm.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {source.fill.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${source.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {(source.impressions / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "flex items-center justify-end gap-1 font-medium",
                          source.trend >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {source.trend >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {source.trend >= 0 ? "+" : ""}
                        {source.trend}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Country Breakdown */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">
            Revenue by Country
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {countryData.map((country) => (
              <div key={country.code} className="flex items-center gap-4">
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {country.country}
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      ${country.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">
                      {country.percentage}%
                    </span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 w-16 text-right">
                  ${country.ecpm.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
