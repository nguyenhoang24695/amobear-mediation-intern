"use client"

import { useMemo } from "react"
import { format, parseISO } from "date-fns"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import type { AppGrowthTodayResponseDto } from "@/types/api"

interface AppPerformanceTodayGrowthTabProps {
  appId: string
}

function fmtUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatSyncedAtLabel(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "HH:mm")
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] w-full" />
}

function CumulativeChart({
  title,
  description,
  reportDate,
  points,
  valueKey,
  strokeColor,
  emptyHint,
}: {
  title: string
  description: string
  reportDate: string
  points: { label: string; value: number; syncedAt: string }[]
  valueKey: string
  strokeColor: string
  emptyHint: string
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
        <CardDescription className="text-sm text-slate-500">
          {description}
          {reportDate ? ` · ${reportDate}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {points.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
            {emptyHint}
          </div>
        ) : (
          <div className="h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `$${v}`}
                  dx={-5}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as { label: string; value: number; syncedAt: string }
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[140px]">
                        <p className="text-xs text-slate-500 mb-1">
                          {row.syncedAt ? format(parseISO(row.syncedAt), "MMM dd, HH:mm") : row.label}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: strokeColor }}>
                          {fmtUsd(row.value)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Legend verticalAlign="top" height={28} />
                <Line
                  type="monotone"
                  dataKey={valueKey}
                  stroke={strokeColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: strokeColor }}
                  activeDot={{ r: 5 }}
                  name="Cumulative"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AppPerformanceTodayGrowthTab({ appId }: AppPerformanceTodayGrowthTabProps) {
  const fetchGrowth = useMemo(
    () => () => structureApi.getAppPerformanceGrowthToday(appId),
    [appId],
  )

  const cacheKey = `app_perf_growth_today_${appId}`
  const { data, loading, error } = useApi<AppGrowthTodayResponseDto>(fetchGrowth, {
    enabled: !!appId,
    cacheKey,
  })

  const revenueChartData = useMemo(() => {
    return (data?.revenuePoints ?? []).map((p) => ({
      label: formatSyncedAtLabel(p.syncedAt),
      value: Number(p.value),
      syncedAt: p.syncedAt,
    }))
  }, [data?.revenuePoints])

  const costChartData = useMemo(() => {
    return (data?.costPoints ?? []).map((p) => ({
      label: formatSyncedAtLabel(p.syncedAt),
      value: Number(p.value),
      syncedAt: p.syncedAt,
    }))
  }, [data?.costPoints])

  if (loading && data == null && !error) {
    return (
      <div className="flex flex-col gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load today growth</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Today Growth</h2>
        <p className="text-sm text-slate-500 mt-1">
          Cumulative totals sau mỗi lần job sync hôm nay — revenue (UTC) và UA cost (local server).
          {data?.latestRevenue != null ? (
            <span className="ml-2 text-green-700 font-medium">Revenue: {fmtUsd(data.latestRevenue)}</span>
          ) : null}
          {data?.latestCost != null ? (
            <span className="ml-2 text-red-600 font-medium">Cost: {fmtUsd(data.latestCost)}</span>
          ) : null}
        </p>
      </div>

      <CumulativeChart
        title="Cumulative Revenue Chart"
        description="Tổng estimated earnings (bronze.admob_revenue_table) theo từng lần sync"
        reportDate={data?.revenueReportDate ?? ""}
        points={revenueChartData}
        valueKey="value"
        strokeColor="#22c55e"
        emptyHint="Chưa có snapshot revenue hôm nay. Chờ job performance-sync-admob-revenue-today hoặc chạy sync thủ công."
      />

      <CumulativeChart
        title="Cumulative Cost Chart"
        description="Tổng XMP cost (bronze.xmp_report) theo store package của app"
        reportDate={data?.costReportDate ?? ""}
        points={costChartData}
        valueKey="value"
        strokeColor="#ef4444"
        emptyHint="Chưa có snapshot UA cost hôm nay. Chờ job xmp-sync-job-today hoặc kiểm tra mapping package / app store id."
      />
    </div>
  )
}
