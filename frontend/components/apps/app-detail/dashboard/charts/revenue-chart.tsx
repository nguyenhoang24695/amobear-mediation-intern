"use client"

import type { DashboardRangeInput, RevenueTrendSeries } from "@/types/app-dashboard"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { NoData } from "../empty-states"
import { formatUsd } from "../format"
import { useDashboardRevenueTrend } from "../hooks/use-dashboard-series"
import { ChartError, ChartHeader, ChartSkeleton, LegendItems } from "./_shared/chart-frame"
import { enumerateDateStrings, mapPoints } from "./_shared/date-series"

interface RevenueChartProps { appId: string; range: DashboardRangeInput }
interface RevenueChartRow { date: string; total: number | null; iaa: number | null; iap: number | null; sub: number | null; arpu: number | null }

const SERIES = [
  { key: "total", label: "Total", color: "#3b82f6", axis: "revenue" },
  { key: "iaa", label: "IAA", color: "#06b6d4", axis: "revenue" },
  { key: "iap", label: "IAP", color: "#ec4899", axis: "revenue" },
  { key: "sub", label: "SUB", color: "#a855f7", axis: "revenue" },
  { key: "arpu", label: "ARPU", color: "#0f172a", axis: "arpu" },
] as const

export function RevenueChart({ appId, range }: RevenueChartProps) {
  const { data, loading, error, refetch } = useDashboardRevenueTrend(appId, range)
  if (error) return <ChartError title="Revenue trend" message={error.message} onRetry={() => void refetch()} />

  const chartData = data ? buildRows(data) : []
  const hasValues = chartData.some((row) => SERIES.some((series) => row[series.key] != null))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <ChartHeader title="Revenue trend" subtitle="IAA via Adjust, purchases and subscriptions via Qonversion" />
      {loading && !data ? <ChartSkeleton /> : null}
      {!loading && data && !hasValues ? <NoData label="No revenue trend data for this range." /> : null}
      {data && hasValues ? (
        <div className="mt-4 h-[300px]"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(value) => formatUsd(Number(value))} tickLine={false} axisLine={false} />
            <YAxis yAxisId="arpu" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(value) => formatUsd(Number(value))} tickLine={false} axisLine={false} />
            <Tooltip content={<RevenueTooltip />} />
            {SERIES.map((series) => <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} yAxisId={series.axis} stroke={series.color} strokeWidth={2} strokeDasharray={series.key === "arpu" ? "4 4" : undefined} dot={false} connectNulls={false} />)}
          </LineChart>
        </ResponsiveContainer></div>
      ) : null}
      <LegendItems items={SERIES} className="mt-3" />
    </section>
  )
}

function buildRows(data: RevenueTrendSeries): RevenueChartRow[] {
  const dates = enumerateDateStrings(data.date_range.start_date_account_tz, data.date_range.end_date_account_tz)
  const total = mapPoints(data.series.total)
  const iaa = mapPoints(data.series.iaa)
  const iap = mapPoints(data.series.iap)
  const sub = mapPoints(data.series.sub)
  const arpu = mapPoints(data.series.arpu)
  return dates.map((date) => ({ date, total: total.get(date)?.value ?? null, iaa: iaa.get(date)?.value ?? null, iap: iap.get(date)?.value ?? null, sub: sub.get(date)?.value ?? null, arpu: arpu.get(date)?.value ?? null }))
}

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | null; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"><p className="mb-2 font-medium text-slate-700">{label}</p><div className="space-y-1">
    {payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-medium text-slate-950">{formatUsd(item.value)}</span></div>)}
  </div></div>
}
