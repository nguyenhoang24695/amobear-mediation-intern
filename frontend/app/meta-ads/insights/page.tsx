import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetaInsightsDashboard } from "@/components/meta-ads/insights/meta-insights-dashboard"

export default function MetaInsightsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-campaigns" functionKey="view">
        <MetaInsightsDashboard />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
