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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        {Array.from({ length: cardConfig.length }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4 sm:space-y-4 sm:p-5">
              <Skeleton className="h-4 w-20 sm:w-24" />
              <Skeleton className="h-8 w-24 sm:h-10 sm:w-32" />
              <Skeleton className="h-4 w-20 sm:h-5 sm:w-28" />
              <Skeleton className="h-12 w-full sm:h-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
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
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{item.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground sm:text-3xl">{formatMetricValue(item.key, current)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
                    <Badge
                      variant="secondary"
                      className={trend === "up" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}
                    >
                      {trend === "up" ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                      <span className="text-[11px] sm:text-xs">{`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</span>
                    </Badge>
                    <span className="text-[11px] text-muted-foreground sm:text-xs">vs previous period</span>
                  </div>
                </div>
                <div className="h-12 w-full shrink-0 sm:h-16 sm:w-24">
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
