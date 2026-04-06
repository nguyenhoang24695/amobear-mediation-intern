"use client"

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DimensionScores } from "@/types/api"
import { HealthTierBadge } from "./health-tier-badge"

const dimensionLabels: { key: keyof DimensionScores; label: string }[] = [
  { key: "revenueMonetization", label: "Revenue" },
  { key: "growthAcquisition", label: "Growth" },
  { key: "engagementRetention", label: "Engagement" },
  { key: "productContent", label: "Product" },
  { key: "adInfrastructure", label: "Ad Infra" },
  { key: "unitEconomics", label: "Unit Econ" },
  { key: "portfolioPosition", label: "Portfolio" },
  { key: "optimizationVelocity", label: "Velocity" },
]

interface HealthRadarChartProps {
  dimensionScores: DimensionScores
  benchmarkScores?: DimensionScores
  healthTier?: string | null
}

export function HealthRadarChart({
  dimensionScores,
  benchmarkScores,
  healthTier,
}: HealthRadarChartProps) {
  const data = dimensionLabels
    .filter((d) => dimensionScores[d.key] != null || benchmarkScores?.[d.key] != null)
    .map((d) => ({
      dimension: d.label,
      score: dimensionScores[d.key] ?? 0,
      benchmark: benchmarkScores?.[d.key] ?? undefined,
    }))

  if (data.length < 3) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
          Insufficient data — at least 3 dimensions required to render radar chart.
        </CardContent>
      </Card>
    )
  }

  const hasBenchmark = benchmarkScores && data.some((d) => d.benchmark != null)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Health Dimensions</CardTitle>
        <HealthTierBadge tier={healthTier} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickCount={5}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {hasBenchmark && (
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.1}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
