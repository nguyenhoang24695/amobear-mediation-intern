"use client"

import { Fragment, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Download,
  RefreshCw,
  Search,
} from "lucide-react"
import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
} from "recharts"
import { format, subDays, startOfDay, isSameDay, parseISO } from "date-fns"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import type { AppHourlyPerformanceResponseDto } from "@/types/api"

export interface HourlyBucket {
  bucketStart: string
  revenue: number
  cost: number
}

interface DailyData {
  date: string
  dateLabel: string
  revenue: number
  cost: number
  net: number
  hourlyData: {
    hour: string
    revenue: number
    cost: number
    net: number
  }[]
}

interface DateRange {
  from: Date
  to: Date
}

interface AppPerformanceTabProps {
  appId: string
}

type PresetKey = "24h" | "7d" | "30d" | "custom"

const presets: { key: PresetKey; label: string }[] = [
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom range" },
]

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 flex-1" />
        ))}
      </div>
      <Skeleton className="h-[360px] w-full" />
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border border-dashed border-slate-200">
      <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
      <h3 className="text-base font-medium text-slate-700 mb-1">No data available</h3>
      <p className="text-sm text-slate-500 mb-4 text-center max-w-xs">
        There&apos;s no revenue or cost data for the selected time range. Try another range or sync data.
      </p>
      <Button variant="outline" size="sm" onClick={onReset} className="gap-2 bg-transparent">
        <RefreshCw className="w-4 h-4" />
        Reset Range
      </Button>
    </div>
  )
}

export function AppPerformanceTab({ appId }: AppPerformanceTabProps) {
  const [preset, setPreset] = useState<PresetKey>("7d")
  const [customRange, setCustomRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [showTable] = useState(true)
  const [tableSortField, setTableSortField] = useState<"date" | "revenue" | "cost" | "net">("date")
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc")
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [tableFilterDate, setTableFilterDate] = useState<Date | undefined>(undefined)
  const [tableSearchDate, setTableSearchDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  /** Calendar date range for API (gold tables use report_date). */
  const apiRange = useMemo(() => {
    const now = new Date()
    const endD = startOfDay(now)
    if (preset === "custom") {
      let from = startOfDay(customRange.from)
      let to = startOfDay(customRange.to)
      if (to > endD) to = endD
      if (from > to) from = to
      return {
        start: format(from, "yyyy-MM-dd"),
        end: format(to, "yyyy-MM-dd"),
        from,
        to,
      }
    }
    let startD: Date
    switch (preset) {
      case "24h":
        startD = startOfDay(subDays(now, 1))
        break
      case "30d":
        startD = startOfDay(subDays(now, 29))
        break
      case "7d":
      default:
        startD = startOfDay(subDays(now, 6))
        break
    }
    return {
      start: format(startD, "yyyy-MM-dd"),
      end: format(endD, "yyyy-MM-dd"),
      from: startD,
      to: endD,
    }
  }, [preset, customRange])

  const fetchPerf = useMemo(
    () => () => structureApi.getAppPerformanceHourly(appId, apiRange.start, apiRange.end),
    [appId, apiRange.start, apiRange.end],
  )

  const cacheKey = `app_perf_hourly_${appId}_${apiRange.start}_${apiRange.end}`
  const { data: perfResponse, loading, error } = useApi<AppHourlyPerformanceResponseDto>(fetchPerf, {
    enabled: !!appId,
    cacheKey,
  })

  const data: HourlyBucket[] = useMemo(() => {
    if (!perfResponse?.buckets?.length) return []
    return perfResponse.buckets.map((b) => ({
      bucketStart: b.bucketStart,
      revenue: Number(b.revenue),
      cost: Number(b.cost),
    }))
  }, [perfResponse])

  const dailyData = useMemo<DailyData[]>(() => {
    const grouped: Record<string, { revenue: number; cost: number; hourly: HourlyBucket[] }> = {}

    for (const bucket of data) {
      const bucketDate = new Date(bucket.bucketStart)
      const dateKey = format(bucketDate, "yyyy-MM-dd")

      if (!grouped[dateKey]) {
        grouped[dateKey] = { revenue: 0, cost: 0, hourly: [] }
      }
      grouped[dateKey].revenue += bucket.revenue
      grouped[dateKey].cost += bucket.cost
      grouped[dateKey].hourly.push(bucket)
    }

    return Object.entries(grouped).map(([dateKey, values]) => ({
      date: dateKey,
      dateLabel: format(parseISO(dateKey), "MMM dd, yyyy"),
      revenue: Math.round(values.revenue * 100) / 100,
      cost: Math.round(values.cost * 100) / 100,
      net: Math.round((values.revenue - values.cost) * 100) / 100,
      hourlyData: values.hourly
        .sort((a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime())
        .map((h) => ({
          hour: format(new Date(h.bucketStart), "HH:00"),
          revenue: h.revenue,
          cost: h.cost,
          net: Math.round((h.revenue - h.cost) * 100) / 100,
        })),
    }))
  }, [data])

  const filteredTableData = useMemo(() => {
    let filtered = [...dailyData]

    if (tableFilterDate) {
      filtered = filtered.filter((d) => isSameDay(parseISO(d.date), tableFilterDate))
    }

    if (tableSearchDate.trim()) {
      const search = tableSearchDate.toLowerCase()
      filtered = filtered.filter(
        (d) => d.date.includes(search) || d.dateLabel.toLowerCase().includes(search),
      )
    }

    filtered.sort((a, b) => {
      let cmp = 0
      switch (tableSortField) {
        case "date":
          cmp = a.date.localeCompare(b.date)
          break
        case "revenue":
          cmp = a.revenue - b.revenue
          break
        case "cost":
          cmp = a.cost - b.cost
          break
        case "net":
          cmp = a.net - b.net
          break
      }
      return tableSortDir === "asc" ? cmp : -cmp
    })

    return filtered
  }, [dailyData, tableFilterDate, tableSearchDate, tableSortField, tableSortDir])

  const totalPages = Math.ceil(filteredTableData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTableData.slice(start, start + pageSize)
  }, [filteredTableData, currentPage])

  const chartData = useMemo(() => {
    return dailyData
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        label: format(parseISO(d.date), "MMM dd"),
        revenue: d.revenue,
        cost: d.cost,
        net: d.net,
      }))
  }, [dailyData])

  const summary = useMemo(() => {
    const totalRevenue = data.reduce((sum, b) => sum + b.revenue, 0)
    const totalCost = data.reduce((sum, b) => sum + b.cost, 0)
    const net = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      net: Math.round(net * 100) / 100,
      margin: Math.round(margin * 10) / 10,
      buckets: data.length,
    }
  }, [data])

  const handlePresetChange = (value: PresetKey) => {
    setPreset(value)
    setCurrentPage(1)
    setExpandedDates(new Set())
  }

  const handleCustomRangeApply = (range: DateRange) => {
    setCustomRange({ from: range.from, to: range.to })
    setPreset("custom")
    setCurrentPage(1)
  }

  const toggleTableSort = (field: typeof tableSortField) => {
    if (tableSortField === field) {
      setTableSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setTableSortField(field)
      setTableSortDir("desc")
    }
    setCurrentPage(1)
  }

  const toggleExpandDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const SortIcon = ({ field }: { field: typeof tableSortField }) => {
    if (tableSortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />
    return tableSortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const rangeLabel = `${format(apiRange.from, "MMM dd, yyyy")} – ${format(apiRange.to, "MMM dd, yyyy")}`
  const starRocksEnabled = perfResponse?.starRocksEnabled ?? false

  if (loading && perfResponse == null && !error) {
    return <ChartSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load performance</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      {!starRocksEnabled && perfResponse != null ? (
        <Alert>
          <AlertTitle>StarRocks unavailable</AlertTitle>
          <AlertDescription>
            Hourly revenue and UA cost require StarRocks. Configure the connection or run sync jobs — figures
            below may be empty.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Revenue vs UA Cost</h2>
          <p className="text-sm text-slate-500">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetKey)}>
            <SelectTrigger className="w-[160px] h-9 text-sm bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  Pick dates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customRange.from, to: customRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) handleCustomRangeApply({ from: range.from, to: range.to })
                  }}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent text-sm" disabled title="Export (coming soon)">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {loading && perfResponse != null ? (
        <div className="text-sm text-slate-500">Refreshing…</div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
                <p className="text-xl font-semibold text-slate-900">${summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total UA Cost</p>
                <p className="text-xl font-semibold text-slate-900">${summary.totalCost.toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Net (Revenue - Cost)</p>
                <p className={`text-xl font-semibold ${summary.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {summary.net >= 0 ? "+" : ""}${summary.net.toLocaleString()}
                </p>
              </div>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${summary.net >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
              >
                {summary.net >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge
                variant="outline"
                className={`text-xs ${summary.margin >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
              >
                {summary.margin >= 0 ? "+" : ""}
                {summary.margin}% margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Data coverage</p>
                <p className="text-xl font-semibold text-slate-900">{dailyData.length}</p>
                <p className="text-xs text-slate-400">days · {summary.buckets} hourly buckets</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.length === 0 ? (
        <EmptyState onReset={() => handlePresetChange("7d")} />
      ) : (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Daily Breakdown</CardTitle>
                <CardDescription className="text-sm text-slate-500">Revenue and UA cost by day</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v) => `$${v}`}
                    dx={-5}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const revenue = payload.find((p) => p.dataKey === "revenue")?.value as number
                        const cost = payload.find((p) => p.dataKey === "cost")?.value as number
                        const net = revenue - cost
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[160px]">
                            <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Revenue:</span>
                                <span className="font-medium text-green-600">${revenue?.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">UA Cost:</span>
                                <span className="font-medium text-red-500">${cost?.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-slate-100 pt-1 mt-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">Net:</span>
                                  <span className={`font-semibold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {net >= 0 ? "+" : ""}${net.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span className="text-sm text-slate-600 capitalize">{value}</span>}
                  />
                  <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} name="Revenue" />
                  <Bar yAxisId="left" dataKey="cost" fill="#ef4444" radius={[3, 3, 0, 0]} name="UA Cost" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="net"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Net"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {showTable && data.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Daily Data Table</CardTitle>
                <CardDescription className="text-sm text-slate-500">Click a row to expand hourly breakdown</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search date..."
                    className="pl-8 h-8 w-40 text-sm"
                    value={tableSearchDate}
                    onChange={(e) => {
                      setTableSearchDate(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-transparent text-xs">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {tableFilterDate ? format(tableFilterDate, "MMM dd") : "Filter date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={tableFilterDate}
                      onSelect={(date) => {
                        setTableFilterDate(date)
                        setCurrentPage(1)
                      }}
                      disabled={(date) => date > new Date() || date < apiRange.from || date > apiRange.to}
                    />
                  </PopoverContent>
                </Popover>
                {(tableFilterDate || tableSearchDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-slate-500"
                    onClick={() => {
                      setTableFilterDate(undefined)
                      setTableSearchDate("")
                      setCurrentPage(1)
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-40">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                        onClick={() => toggleTableSort("date")}
                      >
                        Date
                        <SortIcon field="date" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-slate-900 ml-auto"
                        onClick={() => toggleTableSort("revenue")}
                      >
                        Revenue
                        <SortIcon field="revenue" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-slate-900 ml-auto"
                        onClick={() => toggleTableSort("cost")}
                      >
                        UA Cost
                        <SortIcon field="cost" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-slate-900 ml-auto"
                        onClick={() => toggleTableSort("net")}
                      >
                        Net
                        <SortIcon field="net" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-20">
                      <span className="text-xs font-medium uppercase tracking-wide">Hours</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        No data matches your filter
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row) => {
                      const isExpanded = expandedDates.has(row.date)
                      return (
                        <Fragment key={row.date}>
                          <TableRow
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => toggleExpandDate(row.date)}
                          >
                            <TableCell className="w-10">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">{row.dateLabel}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">${row.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium text-red-500">${row.cost.toFixed(2)}</TableCell>
                            <TableCell className={`text-right font-semibold ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.net >= 0 ? "+" : ""}${row.net.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                                {row.hourlyData.length}h
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="bg-slate-50/50">
                              <TableCell colSpan={6} className="p-0">
                                <div className="px-4 py-3 ml-10 border-l-2 border-blue-200">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                    Hourly breakdown for {row.dateLabel}
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {row.hourlyData.map((h) => (
                                      <div
                                        key={`${row.date}-${h.hour}`}
                                        className="bg-white border border-slate-200 rounded-md p-2 text-xs"
                                      >
                                        <p className="font-medium text-slate-700 mb-1">{h.hour}</p>
                                        <div className="flex items-center justify-between">
                                          <span className="text-green-600">${h.revenue.toFixed(2)}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="text-red-500">${h.cost.toFixed(2)}</span>
                                        </div>
                                        <p className={`text-[10px] mt-0.5 ${h.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                                          Net: {h.net >= 0 ? "+" : ""}${h.net.toFixed(2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredTableData.length)} of{" "}
                  {filteredTableData.length} days
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="icon"
                        className={`h-8 w-8 ${currentPage === pageNum ? "bg-blue-600 text-white" : "bg-transparent"}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
