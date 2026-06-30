"use client"

import type { DashboardRangeInput } from "@/types/app-dashboard"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { NoData } from "../empty-states"
import { useQonversionProductSeries } from "../hooks/use-qonversion-product-series"
import type { QonversionProductTableConfig } from "../tables/qonversion-product-table"
import { QonversionProductTable } from "../tables/qonversion-product-table"
import { ChartError, ChartHeader, ChartSkeleton, LegendItems } from "./_shared/chart-frame"
import {
  buildQonversionDailyChartData,
  formatQonversionDailyValue,
  hasQonversionDailyValues,
  QONVERSION_PRODUCT_DAILY_CHARTS,
  type QonversionDailyChartData,
  type QonversionDailyChartRow,
  type QonversionDailyMetricConfig,
  type QonversionDailySeries,
  type QonversionProductDailyChartConfig,
} from "./qonversion-product-daily-chart-data"

interface QonversionProductDailyChartProps extends QonversionProductDailyChartConfig {
  appId: string
  range: DashboardRangeInput
}

interface QonversionProductDailyReportPanelProps {
  appId: string
  range: DashboardRangeInput
  chart: QonversionProductDailyChartConfig
  table: QonversionProductTableConfig
}

interface TooltipPayload {
  dataKey?: string
  value?: number | null
  color?: string
  payload?: QonversionDailyChartRow
}

const EMPTY_LABEL = "No Qonversion daily data for this app/range."

export { QONVERSION_PRODUCT_DAILY_CHARTS }

export function QonversionProductDailyReportPanel({
  appId,
  range,
  chart,
  table,
}: QonversionProductDailyReportPanelProps) {
  return (
    <div className="space-y-4">
      <QonversionProductDailyChart appId={appId} range={range} {...chart} />
      <QonversionProductTable appId={appId} range={range} {...table} />
    </div>
  )
}

export function QonversionProductDailyChart({ appId, range, ...config }: QonversionProductDailyChartProps) {
  const { data, loading, error, refetch } = useQonversionProductSeries(appId, range, config.report)

  if (error) return <ChartError title={config.title} message={error.message} onRetry={() => void refetch()} />

  const rows = data?.rows ?? []
  const isQonversionNotConfigured = data?.meta.warnings.includes("qonversion_charts_not_configured") ?? false
  const primaryData = isQonversionNotConfigured
    ? { rows: [], series: [] }
    : buildQonversionDailyChartData(rows, config.primaryMetric)
  const secondaryData = config.secondaryMetric && !isQonversionNotConfigured
    ? buildQonversionDailyChartData(rows, config.secondaryMetric)
    : null
  const hasValues = hasQonversionDailyValues(primaryData) || (secondaryData ? hasQonversionDailyValues(secondaryData) : false)

  return (
    <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <ChartHeader title={config.title} subtitle={config.subtitle} />
      {loading && !data ? <ChartSkeleton height={320} /> : null}
      {!loading && data && !hasValues ? <NoData label={EMPTY_LABEL} /> : null}
      {data && hasValues ? (
        <div className="mt-4 space-y-5">
          {hasQonversionDailyValues(primaryData) ? <DailyMetricChart data={primaryData} metric={config.primaryMetric} /> : null}
          {config.secondaryMetric && secondaryData && hasQonversionDailyValues(secondaryData) ? (
            <DailyMetricChart data={secondaryData} metric={config.secondaryMetric} />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function DailyMetricChart({ data, metric }: { data: QonversionDailyChartData; metric: QonversionDailyMetricConfig }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        <LegendItems items={data.series} className="justify-end" />
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {metric.additive ? <DailyStackedBarChart data={data} metric={metric} /> : <DailyLineChart data={data} metric={metric} />}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DailyStackedBarChart({ data, metric }: { data: QonversionDailyChartData; metric: QonversionDailyMetricConfig }) {
  return (
    <BarChart data={data.rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
      <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatQonversionDailyValue(Number(value), metric.valueType)} tickLine={false} axisLine={false} />
      <Tooltip content={<DailyTooltip metric={metric} series={data.series} />} cursor={{ fill: "hsl(var(--muted))" }} />
      {data.series.map((series) => (
        <Bar key={series.key} dataKey={series.key} name={series.label} stackId="product" fill={series.color} maxBarSize={34} />
      ))}
    </BarChart>
  )
}

function DailyLineChart({ data, metric }: { data: QonversionDailyChartData; metric: QonversionDailyMetricConfig }) {
  return (
    <LineChart data={data.rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatQonversionDailyValue(Number(value), metric.valueType)} tickLine={false} axisLine={false} />
      <Tooltip content={<DailyTooltip metric={metric} series={data.series} />} />
      {data.series.map((series) => (
        <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2} dot={false} connectNulls={false} />
      ))}
    </LineChart>
  )
}

function DailyTooltip({
  active,
  payload,
  metric,
  series,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  metric: QonversionDailyMetricConfig
  series: QonversionDailySeries[]
}) {
  const row = payload?.[0]?.payload
  if (!active || !payload?.length || !row) return null

  return (
    <div className="max-w-[360px] rounded-xl border border-border/70 bg-card/95 p-3 text-xs shadow-lg backdrop-blur">
      <p className="mb-2 font-medium text-foreground">{row.reportDate}</p>
      <div className="space-y-1">
        {payload.map((item) => {
          const itemSeries = series.find((seriesItem) => seriesItem.key === item.dataKey)
          if (!itemSeries) return null
          return (
            <div key={itemSeries.key} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground" title={itemSeries.productId}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: itemSeries.color }} />
                <span className="truncate">{itemSeries.isOther ? "Other products" : itemSeries.productId}</span>
              </span>
              <span className="font-medium text-foreground">
                {formatQonversionDailyValue(item.value, metric.valueType)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
