"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Activity, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { admobMonitoringApi } from "@/lib/api/admob-monitoring"
import type {
  AdmobApiTrafficBucket,
  AdmobApiTrafficChartResponse,
  AdmobApiTrafficChartType,
  AdmobApiTrafficDimension,
  AdmobApiTrafficUnit,
} from "@/types/admob-monitoring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const SERIES_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#6366f1", "#22c55e", "#ec4899", "#eab308", "#64748b", "#94a3b8"]

const BUCKET_OPTIONS: Array<{ value: AdmobApiTrafficBucket; label: string }> = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
]

const CHART_TYPE_OPTIONS: Array<{ value: AdmobApiTrafficChartType; label: string }> = [
  { value: "line", label: "Line Chart" },
  { value: "bar", label: "Bar Chart" },
]

const DIMENSION_OPTIONS: Array<{ value: AdmobApiTrafficDimension; label: string; description: string }> = [
  { value: "none", label: "Total", description: "Single series — total API calls" },
  { value: "publisher", label: "Publisher", description: "Stack by admob_publisher_id" },
  { value: "type", label: "Type", description: "Stack by call type" },
  { value: "http_status", label: "HTTP status", description: "Stack by response_http_status" },
]

const UNIT_OPTIONS: Array<{ value: AdmobApiTrafficUnit; label: string; description: string }> = [
  { value: "count", label: "Count", description: "Number of API calls per bucket" },
  { value: "tps", label: "TPS", description: "Calls per second (count ÷ bucket duration)" },
]

function bucketSeconds(bucket: AdmobApiTrafficBucket | string) {
  if (bucket === "minute") return 60
  if (bucket === "hour") return 3600
  return 86400
}

function toTrafficUnitValue(count: number, unit: AdmobApiTrafficUnit, bucket: AdmobApiTrafficBucket | string) {
  if (unit === "count") return count
  return count / bucketSeconds(bucket)
}

function formatTrafficValue(value: number, unit: AdmobApiTrafficUnit) {
  if (unit === "count") return formatCount(value)
  if (value >= 100) return value.toFixed(1)
  if (value >= 1) return value.toFixed(2)
  return value.toFixed(3)
}

function defaultCreatedFromLocal() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return toDateTimeLocalValue(date)
}

function defaultCreatedToLocal() {
  return toDateTimeLocalValue(new Date())
}

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localInputToIso(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function formatBucketLabel(value: string, bucket: AdmobApiTrafficBucket | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (bucket === "day") return format(date, "MMM d, yyyy")
  if (bucket === "minute") return format(date, "MMM d HH:mm")
  return format(date, "MMM d HH:00")
}

function formatCallTypeLabel(value: string) {
  return value.replace(/^job:performance-sync-/, "sync:").replace(/^job:/, "")
}

function formatSeriesLabel(seriesKey: string, dimension: AdmobApiTrafficDimension | string) {
  if (dimension === "type") return formatCallTypeLabel(seriesKey)
  if (dimension === "http_status") return seriesKey === "none" ? "No HTTP response" : seriesKey
  return seriesKey
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value ?? 0)
}

type ChartRow = Record<string, string | number> & {
  bucketStart: string
  label: string
  count: number
}

export function AdmobMonitoringTrafficChartTab() {
  const [createdFrom, setCreatedFrom] = useState(defaultCreatedFromLocal)
  const [createdTo, setCreatedTo] = useState(defaultCreatedToLocal)
  const [callType, setCallType] = useState("all")
  const [publisherId, setPublisherId] = useState("all")
  const [responseHttpStatus, setResponseHttpStatus] = useState("all")
  const [bucketMode, setBucketMode] = useState<AdmobApiTrafficBucket>("hour")
  const [chartType, setChartType] = useState<AdmobApiTrafficChartType>("line")
  const [chartUnit, setChartUnit] = useState<AdmobApiTrafficUnit>("count")
  const [chartDimension, setChartDimension] = useState<AdmobApiTrafficDimension>("none")

  const [callTypeOptions, setCallTypeOptions] = useState<string[]>([])
  const [publisherOptions, setPublisherOptions] = useState<string[]>([])
  const [httpStatusOptions, setHttpStatusOptions] = useState<(number | null)[]>([])

  const [chart, setChart] = useState<AdmobApiTrafficChartResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)

  const queryParams = useMemo(
    () => ({
      createdFrom: localInputToIso(createdFrom),
      createdTo: localInputToIso(createdTo),
      callType: callType === "all" ? undefined : callType,
      publisherId: publisherId === "all" ? undefined : publisherId,
      responseHttpStatus: responseHttpStatus === "all" ? undefined : responseHttpStatus,
      bucket: bucketMode,
      dimension: chartDimension,
    }),
    [bucketMode, callType, chartDimension, createdFrom, createdTo, publisherId, responseHttpStatus],
  )

  const loadFilterOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const options = await admobMonitoringApi.getApiTrafficFilterOptions({
        createdFrom: queryParams.createdFrom,
        createdTo: queryParams.createdTo,
      })
      setCallTypeOptions(options.callTypes ?? [])
      setPublisherOptions(options.publishers ?? [])
      setHttpStatusOptions(options.httpStatuses ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load filter options"
      toast.error(message)
    } finally {
      setLoadingOptions(false)
    }
  }, [queryParams.createdFrom, queryParams.createdTo])

  const loadChart = useCallback(async () => {
    setLoading(true)
    try {
      const response = await admobMonitoringApi.getApiTrafficChart(queryParams)
      setChart(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load API traffic chart"
      toast.error(message)
      setChart(null)
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    void loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    void loadChart()
  }, [loadChart])

  const seriesKeys = useMemo(() => chart?.series ?? [], [chart?.series])
  const activeDimension = (chart?.dimension ?? chartDimension) as AdmobApiTrafficDimension
  const isStacked = activeDimension !== "none" && seriesKeys.length > 0

  const chartRows = useMemo<ChartRow[]>(() => {
    if (!chart?.points?.length) return []
    const bucket = chart.bucket as AdmobApiTrafficBucket
    return chart.points.map((point) => {
      const row: ChartRow = {
        bucketStart: point.bucketStart,
        label: formatBucketLabel(point.bucketStart, bucket),
        count: toTrafficUnitValue(point.count, chartUnit, bucket),
      }
      if (isStacked) {
        for (const key of seriesKeys) {
          row[key] = toTrafficUnitValue(point.breakdown?.[key] ?? 0, chartUnit, bucket)
        }
      }
      return row
    })
  }, [chart, chartUnit, isStacked, seriesKeys])

  const seriesSummary = useMemo(() => {
    if (!chart?.points?.length || !isStacked) return [] as Array<{ key: string; value: number }>
    const bucket = chart.bucket as AdmobApiTrafficBucket
    const totals = new Map<string, number>()
    for (const key of seriesKeys) totals.set(key, 0)
    for (const point of chart.points) {
      for (const key of seriesKeys) {
        totals.set(key, (totals.get(key) ?? 0) + (point.breakdown?.[key] ?? 0))
      }
    }
    return [...totals.entries()]
      .map(([key, count]) => ({
        key,
        value:
          chartUnit === "tps"
            ? toTrafficUnitValue(count, "tps", bucket) / chart.points.length
            : count,
      }))
      .sort((a, b) => b.value - a.value)
  }, [chart, chartUnit, isStacked, seriesKeys])

  const totalSummaryValue = useMemo(() => {
    if (!chart) return null
    if (chartUnit === "count") return chart.totalCalls
    const bucket = chart.bucket as AdmobApiTrafficBucket
    if (!chart.points.length) return 0
    const avgCountPerBucket = chart.totalCalls / chart.points.length
    return toTrafficUnitValue(avgCountPerBucket, "tps", bucket)
  }, [chart, chartUnit])

  const applyFilters = () => {
    void loadFilterOptions()
    void loadChart()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Query <code className="text-xs">admob_mediation_report_api_logs</code> by created_at, call type, publisher, and HTTP status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="traffic-created-from">Created from</Label>
              <Input
                id="traffic-created-from"
                type="datetime-local"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="traffic-created-to">Created to</Label>
              <Input
                id="traffic-created-to"
                type="datetime-local"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {callTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatCallTypeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Publisher</Label>
              <Select value={publisherId} onValueChange={setPublisherId}>
                <SelectTrigger>
                  <SelectValue placeholder="All publishers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All publishers</SelectItem>
                  {publisherOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>HTTP status</Label>
              <Select value={responseHttpStatus} onValueChange={setResponseHttpStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {httpStatusOptions.map((option) => {
                    const value = option == null ? "null" : String(option)
                    return (
                      <SelectItem key={value} value={value}>
                        {option == null ? "No HTTP response" : String(option)}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={applyFilters} disabled={loading || loadingOptions}>
                {loading || loadingOptions ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-600" />
              API call traffic
            </CardTitle>
            <CardDescription>
              Volume of AdMob <code className="text-xs">mediationReport:generate</code> calls over time
              {chart ? ` · grouped by ${chart.bucket}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                {BUCKET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={bucketMode === option.value ? "default" : "ghost"}
                    className={cn("h-8 px-3", bucketMode !== option.value && "text-slate-600")}
                    onClick={() => setBucketMode(option.value)}
                    disabled={loading}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                {CHART_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={chartType === option.value ? "default" : "ghost"}
                    className={cn("h-8 px-3", chartType !== option.value && "text-slate-600")}
                    onClick={() => setChartType(option.value)}
                    disabled={loading}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            {chart && totalSummaryValue != null ? (
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {chartUnit === "tps" ? "Avg TPS" : "Total"}: {formatTrafficValue(totalSummaryValue, chartUnit)}
                {chartUnit === "tps" ? "/s" : ""}
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            <div className="min-w-0 flex-1 p-4">
              {loading ? (
                <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading chart…
                  </span>
                </div>
              ) : !chartRows.length ? (
                <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                  No API log entries for the selected filters.
                </div>
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <TrafficChartPlot
                      chartType={chartType}
                      chartRows={chartRows}
                      chartUnit={chartUnit}
                      isStacked={isStacked}
                      seriesKeys={seriesKeys}
                      activeDimension={activeDimension}
                    />
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <aside className="w-full border-t border-slate-200 bg-slate-50/80 p-4 lg:w-72 lg:border-t-0 lg:border-l">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Unit</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {UNIT_OPTIONS.map((option) => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={chartUnit === option.value ? "default" : "outline"}
                          className={cn(
                            "h-10 w-full",
                            chartUnit !== option.value && "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                          onClick={() => setChartUnit(option.value)}
                        >
                          {option.label}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        {option.description}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Dimension</h3>
                  <p className="mt-1 text-xs text-slate-500">Break down stacked bars by series.</p>
                </div>

                <RadioGroup
                  value={chartDimension}
                  onValueChange={(value) => setChartDimension(value as AdmobApiTrafficDimension)}
                  className="space-y-2"
                >
                  {DIMENSION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`traffic-dimension-${option.value}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                        chartDimension === option.value
                          ? "border-blue-200 bg-blue-50/70"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <RadioGroupItem value={option.value} id={`traffic-dimension-${option.value}`} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>

                {isStacked && seriesSummary.length > 0 ? (
                  <div className="space-y-2 border-t border-slate-200 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Series</p>
                    <div className="max-h-48 space-y-1 overflow-auto">
                      {seriesSummary.map((item, index) => (
                        <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2 text-slate-700">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
                            />
                            <span className="truncate" title={formatSeriesLabel(item.key, activeDimension)}>
                              {formatSeriesLabel(item.key, activeDimension)}
                            </span>
                          </span>
                          <span className="font-medium text-slate-900">
                            {formatTrafficValue(item.value, chartUnit)}
                            {chartUnit === "tps" ? "/s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TrafficChartPlot({
  chartType,
  chartRows,
  chartUnit,
  isStacked,
  seriesKeys,
  activeDimension,
}: {
  chartType: AdmobApiTrafficChartType
  chartRows: ChartRow[]
  chartUnit: AdmobApiTrafficUnit
  isStacked: boolean
  seriesKeys: string[]
  activeDimension: AdmobApiTrafficDimension | string
}) {
  const margin = { top: 8, right: 16, left: 0, bottom: 0 }
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis
        tick={{ fontSize: 12 }}
        tickFormatter={(value) => formatTrafficValue(Number(value), chartUnit)}
        tickLine={false}
        axisLine={false}
        allowDecimals={chartUnit === "tps"}
      />
      <RechartsTooltip content={<TrafficTooltip dimension={activeDimension} unit={chartUnit} />} />
    </>
  )

  if (chartType === "line") {
    return (
      <LineChart data={chartRows} margin={margin}>
        {axes}
        {isStacked ? (
          <>
            {seriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={formatSeriesLabel(key, activeDimension)}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => String(value)} />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="count"
            name={chartUnit === "tps" ? "TPS" : "API calls"}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
      </LineChart>
    )
  }

  return (
    <BarChart data={chartRows} margin={margin}>
      {axes}
      {isStacked ? (
        <>
          {seriesKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={formatSeriesLabel(key, activeDimension)}
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
              stackId="traffic"
              radius={index === seriesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => String(value)} />
        </>
      ) : (
        <Bar dataKey="count" name={chartUnit === "tps" ? "TPS" : "API calls"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
      )}
    </BarChart>
  )
}

function TrafficTooltip({
  active,
  payload,
  label,
  dimension,
  unit,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  label?: string
  dimension: AdmobApiTrafficDimension | string
  unit: AdmobApiTrafficUnit
}) {
  if (!active || !payload?.length) return null

  const entries = payload
    .filter((item) => typeof item.value === "number" && item.value > 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  const total = entries.reduce((sum, item) => sum + (item.value ?? 0), 0)
  const totalLabel = unit === "tps" ? "Total TPS" : "Total calls"
  const valueSuffix = unit === "tps" ? "/s" : ""

  return (
    <div className="max-w-xs rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-slate-700">{label}</p>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-slate-600">{totalLabel}</span>
        <span className="font-medium text-slate-950">
          {formatTrafficValue(total, unit)}
          {valueSuffix}
        </span>
      </div>
      {dimension !== "none" && entries.length > 0 ? (
        <div className="space-y-1 border-t border-slate-100 pt-2">
          {entries.map((item) => (
            <div key={String(item.dataKey ?? item.name)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="font-medium text-slate-950">
                {formatTrafficValue(item.value ?? 0, unit)}
                {valueSuffix}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
