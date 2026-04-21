"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
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
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
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
import { format, subDays, startOfDay, isSameDay, parseISO, addDays, isAfter } from "date-fns"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
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
  /** Có bucket revenue theo giờ và/hoặc cost từ bronze/gold theo API */
  hasData: boolean
  revenue: number | null
  /** Cost ngày: bronze.xmp_report (khi API có dailyUaCostByDate), không thì tổng hourly gold */
  cost: number | null
  net: number | null
  /** Tổng cost bronze vs tổng ua_cost gold hourly lệch (chỉ khi StarRocks trả alignment) */
  uaCostDailyVsHourlyMismatch: boolean
  hourlyData: {
    hour: string
    revenue: number | null
    cost: number | null
    net: number | null
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

function fmtUsd(value: number | null, signedPositive = false): string {
  if (value === null || Number.isNaN(value)) return "N/A"
  const sign = signedPositive && value >= 0 ? "+" : ""
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtMarginPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "N/A"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value}%`
}

function dayReprocessKey(reportDate: string, kind: "revenue" | "cost") {
  return `${reportDate}:${kind}`
}

export function AppPerformanceTab({ appId }: AppPerformanceTabProps) {
  const { toast } = useToast()
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
  /** `${yyyy-MM-dd}:revenue` | `:cost` → true while POST in flight */
  const [dayReprocessBusy, setDayReprocessBusy] = useState<Record<string, true>>({})

  const runDayReprocess = useCallback(
    async (reportDate: string, kind: "revenue" | "cost") => {
      const k = dayReprocessKey(reportDate, kind)
      setDayReprocessBusy((prev) => ({ ...prev, [k]: true }))
      try {
        const res =
          kind === "revenue"
            ? await structureApi.reprocessAppPerformanceDayRevenue(appId, reportDate)
            : await structureApi.reprocessAppPerformanceDayCost(appId, reportDate)
        toast({
          title: kind === "revenue" ? "Đã xếp hàng — Revenue" : "Đã xếp hàng — UA cost",
          description: res.message ?? `Hangfire job: ${res.jobId ?? "—"}`,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed"
        toast({ title: "Không thể xếp hàng job", description: msg, variant: "destructive" })
      } finally {
        setDayReprocessBusy((prev) => {
          const next = { ...prev }
          delete next[k]
          return next
        })
      }
    },
    [appId, toast],
  )

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

    const alignMap = new Map((perfResponse?.dailyUaCostByDate ?? []).map((x) => [x.reportDate, x]))
    const useBronzeDailyCost = Boolean(perfResponse?.starRocksEnabled && alignMap.size > 0)

    const fromD = startOfDay(apiRange.from)
    const toD = startOfDay(apiRange.to)
    const dateKeys: string[] = []
    for (let d = fromD; d <= toD; d = addDays(d, 1)) {
      dateKeys.push(format(d, "yyyy-MM-dd"))
    }

    return dateKeys.map((dateKey) => {
      const values = grouped[dateKey]
      const hasHourly = !!values && values.hourly.length > 0
      const align = alignMap.get(dateKey)

      const revenue = hasHourly ? Math.round(values!.revenue * 100) / 100 : null
      const hourlyCostRollup = hasHourly ? Math.round(values!.cost * 100) / 100 : null

      let cost: number | null = null
      if (useBronzeDailyCost && align) {
        cost = Math.round(Number(align.bronzeXmpReportCostSum) * 100) / 100
      } else if (hasHourly) {
        cost = hourlyCostRollup
      }

      const hasBronzeOrGold =
        align != null &&
        (Math.abs(Number(align.bronzeXmpReportCostSum)) > 1e-9 || Math.abs(Number(align.goldHourlyUaCostSum)) > 1e-9)
      const hasData =
        hasHourly || hasBronzeOrGold || (revenue != null && Math.abs(revenue) > 1e-9)

      const mismatch = align?.uaCostDailyVsHourlyMismatch === true

      if (!hasData) {
        return {
          date: dateKey,
          dateLabel: format(parseISO(dateKey), "MMM dd, yyyy"),
          hasData: false,
          revenue: null,
          cost: null,
          net: null,
          hourlyData: [],
          uaCostDailyVsHourlyMismatch: false,
        }
      }

      const net =
        revenue != null && cost != null ? Math.round((revenue - cost) * 100) / 100 : null

      return {
        date: dateKey,
        dateLabel: format(parseISO(dateKey), "MMM dd, yyyy"),
        hasData: true,
        revenue,
        cost,
        net,
        uaCostDailyVsHourlyMismatch: mismatch,
        hourlyData: hasHourly
          ? values!.hourly
              .sort((a, b) => new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime())
              .map((h) => ({
                hour: format(new Date(h.bucketStart), "HH:00"),
                revenue: h.revenue,
                cost: h.cost,
                net: Math.round((h.revenue - h.cost) * 100) / 100,
              }))
          : [],
      }
    })
  }, [data, apiRange.from, apiRange.to, perfResponse])

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

    const cmpNullable = (x: number | null, y: number | null): number => {
      const nx = x === null
      const ny = y === null
      if (nx && ny) return 0
      if (nx) return 1
      if (ny) return -1
      return x - y
    }

    filtered.sort((a, b) => {
      let cmp = 0
      switch (tableSortField) {
        case "date":
          cmp = a.date.localeCompare(b.date)
          break
        case "revenue":
          cmp = cmpNullable(a.revenue, b.revenue)
          break
        case "cost":
          cmp = cmpNullable(a.cost, b.cost)
          break
        case "net":
          cmp = cmpNullable(a.net, b.net)
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
        hasData: d.hasData,
        revenue: d.hasData ? d.revenue : null,
        cost: d.hasData ? d.cost : null,
        net: d.hasData ? d.net : null,
      }))
  }, [dailyData])

  const summary = useMemo(() => {
    const buckets = data.length
    const anyDayHasData = dailyData.some((d) => d.hasData)
    if (buckets === 0 && !anyDayHasData) {
      return {
        totalRevenue: null as number | null,
        totalCost: null as number | null,
        net: null as number | null,
        margin: null as number | null,
        buckets: 0,
        daysWithData: 0,
      }
    }
    const totalRevenue = dailyData.reduce((s, d) => s + (d.revenue ?? 0), 0)
    const totalCost = dailyData.reduce((s, d) => s + (d.cost ?? 0), 0)
    const net = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0
    const daysWithData = dailyData.filter((d) => d.hasData).length

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      net: Math.round(net * 100) / 100,
      margin: Math.round(margin * 10) / 10,
      buckets,
      daysWithData,
    }
  }, [data, dailyData])

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
                <p className="text-xl font-semibold text-slate-900">{fmtUsd(summary.totalRevenue)}</p>
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
                <p className="text-xl font-semibold text-slate-900">{fmtUsd(summary.totalCost)}</p>
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
                <p
                  className={`text-xl font-semibold ${
                    summary.net === null ? "text-slate-900" : summary.net >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {fmtUsd(summary.net, true)}
                </p>
              </div>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  summary.net === null
                    ? "bg-slate-100 text-slate-500"
                    : summary.net >= 0
                      ? "bg-green-50 text-green-600"
                      : "bg-red-50 text-red-600"
                }`}
              >
                {summary.net === null ? (
                  <BarChart3 className="w-4 h-4" />
                ) : summary.net >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge
                variant="outline"
                className={`text-xs ${
                  summary.margin === null
                    ? "bg-slate-50 text-slate-600 border-slate-200"
                    : summary.margin >= 0
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {summary.margin === null ? "N/A" : `${fmtMarginPct(summary.margin)} margin`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Data coverage</p>
                <p className="text-xl font-semibold text-slate-900">
                  {dailyData.length === 0 ? "N/A" : `${summary.daysWithData}/${dailyData.length}`}
                </p>
                <p className="text-xs text-slate-400">days with data · {summary.buckets} hourly buckets</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
          {chartData.length === 0 ? (
            <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No days in range
            </div>
          ) : (
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
                        const row = payload[0]?.payload as {
                          hasData?: boolean
                          revenue: number | null
                          cost: number | null
                          net: number | null
                        }
                        const revenue = row?.revenue ?? null
                        const cost = row?.cost ?? null
                        const net = row?.net ?? null
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[160px]">
                            <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Revenue:</span>
                                <span className="font-medium text-green-600">{fmtUsd(revenue)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">UA Cost:</span>
                                <span className="font-medium text-red-500">{fmtUsd(cost)}</span>
                              </div>
                              <div className="border-t border-slate-100 pt-1 mt-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">Net:</span>
                                  <span
                                    className={`font-semibold ${
                                      net === null ? "text-slate-700" : net >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {fmtUsd(net, true)}
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
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {showTable && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Daily Data Table</CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Click a row to expand hourly breakdown. Icon rerun (↻) cạnh Revenue / UA Cost để xếp hàng Hangfire chạy lại
                  dữ liệu cho đúng ngày đó — hover để xem chi tiết.
                </CardDescription>
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
                      const rowDay = startOfDay(parseISO(row.date))
                      const isRowFuture = isAfter(rowDay, startOfDay(new Date()))
                      const revBusy = !!dayReprocessBusy[dayReprocessKey(row.date, "revenue")]
                      const costBusy = !!dayReprocessBusy[dayReprocessKey(row.date, "cost")]
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
                            <TableCell className="text-right p-2 align-middle">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <span className="font-medium text-green-600 tabular-nums">{fmtUsd(row.revenue)}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Chạy lại revenue (AdMob + silver/gold cho ngày này)"
                                  aria-label="Chạy lại revenue cho ngày này"
                                  className="h-7 w-7 shrink-0 text-green-700 hover:text-green-800 hover:bg-green-50"
                                  disabled={isRowFuture || revBusy}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void runDayReprocess(row.date, "revenue")
                                  }}
                                >
                                  {revBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right p-2 align-middle">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <span className="font-medium text-red-500 tabular-nums">{fmtUsd(row.cost)}</span>
                                {row.uaCostDailyVsHourlyMismatch ? (
                                  <span
                                    className="inline-flex"
                                    title="Tổng cost ngày (bronze.xmp_report) khác tổng ua_cost theo giờ (gold.xmp_ua_cost_sync_hourly)"
                                  >
                                    <AlertCircle
                                      className="h-4 w-4 shrink-0 text-amber-500"
                                      aria-label="Cost ngày và tổng theo giờ không khớp"
                                    />
                                  </span>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title="Chạy lại UA cost (XMP cả ngày + gold hourly)"
                                  aria-label="Chạy lại UA cost cho ngày này"
                                  className="h-7 w-7 shrink-0 text-red-700 hover:text-red-800 hover:bg-red-50"
                                  disabled={isRowFuture || costBusy}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void runDayReprocess(row.date, "cost")
                                  }}
                                >
                                  {costBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold ${
                                row.net === null ? "text-slate-600" : row.net >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {fmtUsd(row.net, true)}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.hasData ? (
                                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                                  {row.hourlyData.length}h
                                </Badge>
                              ) : (
                                <span className="text-sm text-slate-500">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow className="bg-slate-50/50">
                              <TableCell colSpan={6} className="p-0">
                                <div className="px-4 py-3 ml-10 border-l-2 border-blue-200">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                    Hourly breakdown for {row.dateLabel}
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {row.hasData
                                      ? row.hourlyData.map((h) => (
                                          <div
                                            key={`${row.date}-${h.hour}`}
                                            className="bg-white border border-slate-200 rounded-md p-2 text-xs"
                                          >
                                            <p className="font-medium text-slate-700 mb-1">{h.hour}</p>
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-green-600">{fmtUsd(h.revenue)}</span>
                                              <span className="text-slate-300">/</span>
                                              <span className="text-red-500">{fmtUsd(h.cost)}</span>
                                            </div>
                                            <p
                                              className={`text-[10px] mt-0.5 ${
                                                h.net === null ? "text-slate-500" : h.net >= 0 ? "text-green-600" : "text-red-600"
                                              }`}
                                            >
                                              Net: {fmtUsd(h.net, true)}
                                            </p>
                                          </div>
                                        ))
                                      : Array.from({ length: 24 }, (_, i) => {
                                          const hour = `${String(i).padStart(2, "0")}:00`
                                          return (
                                            <div
                                              key={`${row.date}-${hour}-na`}
                                              className="bg-white border border-slate-200 rounded-md p-2 text-xs"
                                            >
                                              <p className="font-medium text-slate-700 mb-1">{hour}</p>
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="text-green-600">N/A</span>
                                                <span className="text-slate-300">/</span>
                                                <span className="text-red-500">N/A</span>
                                              </div>
                                              <p className="text-[10px] mt-0.5 text-slate-500">Net: N/A</p>
                                            </div>
                                          )
                                        })}
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
