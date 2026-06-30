"use client"

import type { DashboardRangeInput, EngagementTrendSeries } from "@/types/app-dashboard"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { NoData } from "../empty-states"
import { formatDecimal, formatMinutes } from "../format"
import { useDashboardEngagementTrend } from "../hooks/use-dashboard-series"
import { ChartError, ChartHeader, ChartSkeleton, LegendItems } from "./_shared/chart-frame"
import { enumerateDateStrings, mapPoints } from "./_shared/date-series"

interface EngagementTrendChartProps { appId: string; range: DashboardRangeInput }
interface EngagementTrendChartRow { date: string; avg_engagement_time_minutes: number | null; engaged_sessions_per_user: number | null }

const SERIES = [
  { key: "avg_engagement_time_minutes", label: "Avg engagement time", color: "#14b8a6", axis: "minutes" },
  { key: "engaged_sessions_per_user", label: "Engaged sessions / user", color: "#6366f1", axis: "sessions" },
] as const

export function EngagementTrendChart({ appId, range }: EngagementTrendChartProps) {
  const { data, loading, error, refetch } = useDashboardEngagementTrend(appId, range)
  if (error) return <ChartError title="Engagement trend" message={error.message} onRetry={() => void refetch()} />

  const chartData = data ? buildRows(data) : []
  const hasValues = chartData.some((row) => row.avg_engagement_time_minutes != null || row.engaged_sessions_per_user != null)

  return (
    <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <ChartHeader title="Engagement trend" subtitle="Firebase engagement quality by day" />
      {loading && !data ? <ChartSkeleton /> : null}
      {!loading && data && !hasValues ? <NoData label="No engagement trend data for this range." /> : null}
      {data && hasValues ? (
        <div className="mt-4 h-[300px]"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="minutes" tick={{ fontSize: 12 }} tickFormatter={formatMinutes} tickLine={false} axisLine={false} />
            <YAxis yAxisId="sessions" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(value) => formatDecimal(Number(value), 1)} tickLine={false} axisLine={false} />
            <Tooltip content={<EngagementTooltip />} />
            {SERIES.map((series) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} yAxisId={series.axis} stroke={series.color} strokeWidth={2} dot={false} connectNulls={false} />)}
          </LineChart>
        </ResponsiveContainer></div>
      ) : null}
      <LegendItems items={SERIES} />
    </section>
  )
}

function buildRows(data: EngagementTrendSeries): EngagementTrendChartRow[] {
  const dates = enumerateDateStrings(data.date_range.start_date_account_tz, data.date_range.end_date_account_tz)
  const avgMinutes = mapPoints(data.series.avg_engagement_time_minutes)
  const sessions = mapPoints(data.series.engaged_sessions_per_user)
  return dates.map((date) => ({ date, avg_engagement_time_minutes: avgMinutes.get(date)?.value ?? null, engaged_sessions_per_user: sessions.get(date)?.value ?? null }))
}

function EngagementTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; name?: string; value?: number | null; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-border/70 bg-card/95 p-3 text-xs shadow-lg backdrop-blur"><p className="mb-2 font-medium text-foreground">{label}</p><div className="space-y-1">
    {payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-medium text-foreground">{formatTooltipValue(item.dataKey, item.value)}</span></div>)}
  </div></div>
}

function formatTooltipValue(dataKey: string | undefined, value: number | null | undefined) {
  return dataKey === "avg_engagement_time_minutes" ? formatMinutes(value) : formatDecimal(value, 2)
}
