"use client"

import type { DashboardRangeInput } from "@/types/app-dashboard"
import { useDashboardRetention } from "../hooks/use-dashboard-series"
import { ChartError } from "./_shared/chart-frame"
import { CohortTable } from "../tables/cohort-table"

interface RetentionChartProps { appId: string; range: DashboardRangeInput }

/**
 * Slice 7.7: Retention hiển thị 2 bảng cohort riêng biệt.
 * - Firebase: daily 1D-7D (gold.retention_overview).
 * - Adjust: mốc 3D/7D/14D/... (cohort_non_cumulative_metrics_json) — không có daily.
 */
export function RetentionChart({ appId, range }: RetentionChartProps) {
  const { data, loading, error, refetch } = useDashboardRetention(appId, range)
  if (error) return <ChartError title="Retention" message={error.message} onRetry={() => void refetch()} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CohortTable
        title="Firebase retention"
        subtitle="Daily cohort retention by install date (Firebase)"
        source={data?.firebase}
        loading={loading}
        formatDayLabel={(day) => `${day}D`}
        emptyLabel="No Firebase retention data for this range."
      />
      <CohortTable
        title="Adjust retention"
        subtitle="Cohort retention by install date (Adjust)"
        source={data?.adjust}
        loading={loading}
        formatDayLabel={(day) => `${day}D`}
        emptyLabel="No Adjust cohort retention data for this range."
        note="Adjust chỉ tracking các mốc cohort 3D/7D/14D/21D/30D/45D/60D/90D/120D — không có daily 1D/2D/4D/5D/6D. Cột thưa với install date gần hôm nay là do cohort chưa đủ tuổi."
      />
    </div>
  )
}
