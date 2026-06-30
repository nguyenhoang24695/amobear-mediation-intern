"use client"

import type { DashboardRangeInput, UserTrendSeries } from "@/types/app-dashboard"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { NoData } from "../empty-states"
import { formatCount } from "../format"
import { useDashboardUserTrend } from "../hooks/use-dashboard-series"
import { ChartError, ChartHeader, ChartSkeleton, LegendItems } from "./_shared/chart-frame"
import { enumerateDateStrings, mapPoints } from "./_shared/date-series"

interface UserTrendChartProps { appId: string; range: DashboardRangeInput }
interface UserTrendChartRow { date: string; installs: number | null; new_users: number | null; total_users: number | null; returning_users: number | null }

const SERIES = [
  { key: "installs", label: "Installs", color: "#3b82f6" },
  { key: "new_users", label: "New users", color: "#10b981" },
  { key: "total_users", label: "Total users", color: "#8b5cf6" },
  { key: "returning_users", label: "Returning users", color: "#f59e0b" },
] as const

export function UserTrendChart({ appId, range }: UserTrendChartProps) {
  const { data, loading, error, refetch } = useDashboardUserTrend(appId, range)
  if (error) return <ChartError title="User trend" message={error.message} onRetry={() => void refetch()} />

  const chartData = data ? buildRows(data) : []
  const hasValues = chartData.some((row) => SERIES.some((series) => row[series.key] != null))

  return (
    <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <ChartHeader title="User trend" subtitle="Installs and Firebase users by day" />
      {loading && !data ? <ChartSkeleton /> : null}
      {!loading && data && !hasValues ? <NoData label="No user trend data for this range." /> : null}
      {data && hasValues ? (
        <div className="mt-4 h-[300px]"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCount} tickLine={false} axisLine={false} />
            <Tooltip content={<TrendTooltip />} />
            {SERIES.map((series) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2} dot={false} connectNulls={false} />)}
          </LineChart>
        </ResponsiveContainer></div>
      ) : null}
      <LegendItems items={SERIES} />
    </section>
  )
}

function buildRows(data: UserTrendSeries): UserTrendChartRow[] {
  const dates = enumerateDateStrings(data.date_range.start_date_account_tz, data.date_range.end_date_account_tz)
  const installs = mapPoints(data.series.installs)
  const newUsers = mapPoints(data.series.new_users)
  const totalUsers = mapPoints(data.series.total_users)
  const returningUsers = mapPoints(data.series.returning_users)
  return dates.map((date) => ({ date, installs: installs.get(date)?.value ?? null, new_users: newUsers.get(date)?.value ?? null, total_users: totalUsers.get(date)?.value ?? null, returning_users: returningUsers.get(date)?.value ?? null }))
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | null; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-border/70 bg-card/95 p-3 text-xs shadow-lg backdrop-blur"><p className="mb-2 font-medium text-foreground">{label}</p><div className="space-y-1">
    {payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-medium text-foreground">{formatCount(item.value)}</span></div>)}
  </div></div>
}
