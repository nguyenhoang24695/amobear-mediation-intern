"use client"

import { DashboardFilterBar } from "./dashboard/dashboard-filter-bar"
import { AdjustReportTable } from "./dashboard/tables/adjust-report-table"
import { EngagementTrendChart } from "./dashboard/charts/engagement-trend-chart"
import { MetricCards } from "./dashboard/metric-cards"
import { RetentionChart } from "./dashboard/charts/retention-chart"
import { RevenueChart } from "./dashboard/charts/revenue-chart"
import { QONVERSION_PRODUCT_DAILY_CHARTS, QonversionProductDailyReportPanel } from "./dashboard/charts/qonversion-product-daily-chart"
import { QONVERSION_PRODUCT_TABLES } from "./dashboard/tables/qonversion-product-table"
import { TopCountryTable } from "./dashboard/tables/top-country-table"
import { UserTrendChart } from "./dashboard/charts/user-trend-chart"
import { DashboardRefreshProvider, useDashboardRefresh } from "./dashboard/hooks/use-dashboard-refresh"
import { useDashboardRange } from "./dashboard/hooks/use-dashboard-range"
import { useDashboardSummary } from "./dashboard/hooks/use-dashboard-summary"
import { dashboardRangeCacheKey } from "@/types/app-dashboard"

interface AppDashboardTabProps {
  appId: string
}

/**
 * Entry component cho tab "Dashboard" (PO Dashboard Metric — Phase 1).
 * Slice 1 (Foundation) chỉ render filter bar + placeholder các block.
 * Slice 2-6 sẽ thay placeholder bằng MetricCards / charts / tables.
 *
 * Xem docs/po-dashboard-metric/05_Slicing_Plan.md.
 */
export function AppDashboardTab({ appId }: AppDashboardTabProps) {
  const { range, setRange } = useDashboardRange()

  return (
    <DashboardRefreshProvider>
      <DashboardTabContent appId={appId} range={range} setRange={setRange} />
    </DashboardRefreshProvider>
  )
}

function DashboardTabContent({
  appId,
  range,
  setRange,
}: {
  appId: string
  range: ReturnType<typeof useDashboardRange>["range"]
  setRange: ReturnType<typeof useDashboardRange>["setRange"]
}) {
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDashboardSummary(appId, range)
  const { refreshAll, refreshing } = useDashboardRefresh()

  return (
    <div className="flex flex-col gap-6">
      <DashboardFilterBar
        range={range}
        onRangeChange={setRange}
        accountDisplayName={summary?.meta.admob_account.display_name}
        onRefresh={() => void refreshAll()}
        refreshing={refreshing || summaryLoading}
      />

      <MetricCards
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={refetchSummary}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserTrendChart appId={appId} range={range} />
        <EngagementTrendChart appId={appId} range={range} />
      </div>
      <RetentionChart appId={appId} range={range} />
      <RevenueChart appId={appId} range={range} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCountryTable appId={appId} range={range} metric="iaa" title="Top Country by IAA Revenue" />
        <TopCountryTable appId={appId} range={range} metric="iap_sub" title="Top Country by IAP + SUB Revenue" />
        <TopCountryTable appId={appId} range={range} metric="new_users" title="Top Country by New Users" />
        <TopCountryTable appId={appId} range={range} metric="total_users" title="Top Country by Total Users" />
      </div>

      <AdjustReportTable appId={appId} range={range} />

      <section className="space-y-4">
        <div>
        <h2 className="text-base font-semibold text-foreground">Qonversion report</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {QONVERSION_PRODUCT_DAILY_CHARTS.map((chart) => {
            const table = QONVERSION_PRODUCT_TABLES.find((item) => item.report === chart.report)
            if (!table) return null

            return (
              <QonversionProductDailyReportPanel
                key={chart.report}
                appId={appId}
                range={range}
                chart={chart}
                table={table}
              />
            )
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Active app: <code className="font-mono">{appId}</code> · range:{" "}
        <code className="font-mono">{dashboardRangeCacheKey(range)}</code>
      </p>
    </div>
  )
}
