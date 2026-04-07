"use client"

import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MetaInsightsDailyDto } from "@/types/meta-ads"
import {
  formatChartAxisValue,
  formatChartDate,
  formatMetricValue,
  getDailyMetricValue,
  metaMetricColors,
  type MetaChartMetricKey,
} from "./meta-insights-utils"

const tabConfig: { key: MetaChartMetricKey; label: string }[] = [
  { key: "spend", label: "Spend" },
  { key: "installs", label: "Installs" },
  { key: "cpi", label: "CPI" },
  { key: "ctr", label: "CTR" },
  { key: "impressions", label: "Impressions" },
]

interface MetaSpendChartProps {
  daily: MetaInsightsDailyDto[]
  loading: boolean
}

export function MetaSpendChart({ daily, loading }: MetaSpendChartProps) {
  const [activeTab, setActiveTab] = useState<MetaChartMetricKey>("spend")

  const chartData = useMemo(() => {
    return daily.map((item) => ({
      date: item.date,
      label: formatChartDate(item.date),
      value: getDailyMetricValue(activeTab, item),
    }))
  }, [activeTab, daily])

  if (loading) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Performance Over Time</CardTitle>
          <CardDescription className="text-sm text-slate-500">No daily Meta insights are available for the selected filters.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const color = metaMetricColors[activeTab]

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">Performance Over Time</CardTitle>
          <CardDescription className="text-sm text-slate-500">Current-period Meta campaign metrics grouped by day.</CardDescription>
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MetaChartMetricKey)}>
          <TabsList className="grid h-auto grid-cols-2 gap-1 bg-slate-100 p-1 md:grid-cols-5">
            {tabConfig.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="px-3 py-1.5 text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="meta-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={52}
                tick={{ fontSize: 12, fill: "#64748B" }}
                tickFormatter={(value) => formatChartAxisValue(activeTab, Number(value))}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const value = Number(payload[0]?.value ?? 0)
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
                      <div className="text-sm font-medium text-slate-900">{label}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatMetricValue(activeTab, value)}</div>
                    </div>
                  )
                }}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#meta-chart-gradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
