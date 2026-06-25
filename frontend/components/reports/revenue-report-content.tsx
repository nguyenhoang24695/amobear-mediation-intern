"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DollarSign,
  TrendingUp,
  CalendarIcon,
  Download,
  Clock,
  Star,
  Smartphone,
  Lightbulb,
  BarChart3,
  LineChart,
  AreaChartIcon,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { RevenueMainChart } from "./revenue-main-chart"
import { BreakdownByApp } from "./breakdown-by-app"
import { BreakdownByNetwork } from "./breakdown-by-network"
import { BreakdownByFormat } from "./breakdown-by-format"
import { BreakdownByCountry } from "./breakdown-by-country"

const datePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "Custom", value: "custom" },
]

const summaryCards = [
  {
    label: "Total Revenue",
    value: "$128,456.78",
    change: 12.3,
    icon: DollarSign,
    color: "blue",
  },
  {
    label: "Average Daily",
    value: "$4,284.56",
    change: 8.1,
    icon: TrendingUp,
    color: "green",
  },
  {
    label: "Best Day",
    value: "Dec 15",
    subValue: "$6,234",
    icon: Star,
    color: "amber",
  },
  {
    label: "Top App",
    value: "Weather Plus",
    subValue: "$28,456",
    icon: Smartphone,
    color: "purple",
  },
]

const insights = [
  {
    type: "positive",
    message: "Revenue increased 12.3% compared to previous period",
  },
  {
    type: "info",
    message: "AdMob Bidding contributed 35% of total revenue",
  },
  {
    type: "highlight",
    message: "US market shows highest eCPM at $8.92",
  },
]

const colorMap: Record<string, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-green-500/10 text-green-700 dark:text-green-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  purple: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
}

export function RevenueReportContent() {
  const [datePreset, setDatePreset] = useState("30d")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 11, 1),
    to: new Date(2024, 11, 31),
  })
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [compareEnabled, setCompareEnabled] = useState(true)
  const [grouping, setGrouping] = useState("day")
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("area")
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["revenue"])
  const [breakdownTab, setBreakdownTab] = useState("app")

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value)
    if (value === "custom") {
      setShowCustomDate(true)
    } else {
      setShowCustomDate(false)
    }
  }

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== metric))
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric])
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Revenue Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Analyze your ad revenue across apps and networks</p>
        </div>
      </div>

      {/* Report Controls Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
              <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
                <div className="flex items-center gap-2">
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-40 h-9">
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {datePresets.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {datePreset === "custom" && (
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                            </>
                          ) : (
                            format(dateRange.from, "MMM d, yyyy")
                          )
                        ) : (
                          "Pick dates"
                        )}
                      </Button>
                    </PopoverTrigger>
                  )}
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Compare Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
              <Switch id="compare" checked={compareEnabled} onCheckedChange={setCompareEnabled} className="scale-90" />
              <Label htmlFor="compare" className="text-sm text-muted-foreground cursor-pointer">
                Compare to previous period
              </Label>
            </div>

            {/* Grouping */}
            <Select value={grouping} onValueChange={setGrouping}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">By Day</SelectItem>
                <SelectItem value="week">By Week</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Schedule Report */}
            <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent">
              <Clock className="w-4 h-4" />
              Schedule Report
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90">
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileIcon className="w-4 h-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <Card key={idx} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                  {card.subValue && <p className="text-sm text-muted-foreground mt-0.5">{card.subValue}</p>}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              {card.change !== undefined && (
                <div className="flex items-center gap-1 mt-3">
                  {card.change > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${card.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {card.change > 0 ? "+" : ""}
                    {card.change}%
                  </span>
                  <span className="text-sm text-muted-foreground">vs previous period</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart Section */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Revenue Over Time</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {compareEnabled && "Dashed line shows previous period"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Chart Type Selector */}
              <div className="flex items-center bg-muted rounded-md p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 ${
                    chartType === "line" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setChartType("line")}
                >
                  <LineChart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 ${
                    chartType === "bar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 ${
                    chartType === "area" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setChartType("area")}
                >
                  <AreaChartIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Metrics Toggle */}
              <div className="flex items-center gap-1">
                {[
                  { key: "revenue", label: "Revenue", color: "bg-primary" },
                  { key: "ecpm", label: "eCPM", color: "bg-green-600" },
                  { key: "impressions", label: "Impressions", color: "bg-purple-600" },
                  { key: "fillRate", label: "Fill Rate", color: "bg-amber-500" },
                ].map((metric) => (
                  <Button
                    key={metric.key}
                    variant="outline"
                    size="sm"
                    className={`h-8 px-3 gap-2 ${
                      selectedMetrics.includes(metric.key)
                        ? "border-border bg-muted/50"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => toggleMetric(metric.key)}
                  >
                    <div className={`w-2 h-2 rounded-full ${metric.color}`} />
                    {metric.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <RevenueMainChart chartType={chartType} selectedMetrics={selectedMetrics} compareEnabled={compareEnabled} />
        </CardContent>
      </Card>

      {/* Breakdown Section */}
      <Card className="border-border">
        <CardHeader className="pb-0">
          <Tabs value={breakdownTab} onValueChange={setBreakdownTab}>
            <TabsList className="h-10">
              <TabsTrigger value="app" className="px-4">
                By App
              </TabsTrigger>
              <TabsTrigger value="network" className="px-4">
                By Network
              </TabsTrigger>
              <TabsTrigger value="format" className="px-4">
                By Format
              </TabsTrigger>
              <TabsTrigger value="country" className="px-4">
                By Country
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          {breakdownTab === "app" && <BreakdownByApp />}
          {breakdownTab === "network" && <BreakdownByNetwork />}
          {breakdownTab === "format" && <BreakdownByFormat />}
          {breakdownTab === "country" && <BreakdownByCountry />}
        </CardContent>
      </Card>

      {/* Insights Card */}
      <Card className="border-border bg-muted/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold text-foreground">Auto-Generated Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-card/60 rounded-lg border border-border">
                {insight.type === "positive" && <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                {insight.type === "info" && <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />}
                {insight.type === "highlight" && <Star className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
                <p className="text-sm text-foreground">{insight.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
