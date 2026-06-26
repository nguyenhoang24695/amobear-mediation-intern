"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { MetaInsightsDailyDto, MetaInsightsOverviewDto } from "@/types/meta-ads"
import {
  calculateChange,
  formatMetricValue,
  getDailyMetricValue,
  getOverviewMetricCurrent,
  getOverviewMetricPrevious,
  metaMetricColors,
  type MetaCardMetricKey,
} from "./meta-insights-utils"

const cardConfig: { key: MetaCardMetricKey; label: string }[] = [
  { key: "spend", label: "Total Spend" },
  { key: "revenue", label: "Revenue" },
  { key: "installs", label: "Installs" },
  { key: "cpi", label: "CPI" },
  { key: "ctr", label: "CTR" },
  { key: "roasD7", label: "ROAS D7" },
  { key: "roasD30", label: "ROAS D30" },
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
]

interface MetaKpiCardsProps {
  overview: MetaInsightsOverviewDto | null
  daily: MetaInsightsDailyDto[]
  loading: boolean
}

export function MetaKpiCards({ overview, daily, loading }: MetaKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        {Array.from({ length: cardConfig.length }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
      {cardConfig.map((item) => {
        const current = overview ? getOverviewMetricCurrent(item.key, overview) : 0
        const previous = overview ? getOverviewMetricPrevious(item.key, overview) : 0
        const change = calculateChange(current, previous)
        const chartData = daily.map((point, index) => ({ id: index, value: getDailyMetricValue(item.key, point) ?? 0 }))
        const trend = change >= 0 ? "up" : "down"
        const color = metaMetricColors[item.key]
        const gradientId = `meta-${item.key}-gradient`

        return (
          <Card key={item.key}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{formatMetricValue(item.key, current)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={trend === "up" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}
                    >
                      {trend === "up" ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                      {`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs previous period</span>
                  </div>
                </div>
                <div className="h-16 w-24 shrink-0">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No trend</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
