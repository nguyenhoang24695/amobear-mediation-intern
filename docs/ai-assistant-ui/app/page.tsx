import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricsRow } from "@/components/dashboard/metrics-row"
import { AlertSummary } from "@/components/dashboard/alert-summary"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopApps } from "@/components/dashboard/top-apps"
import { NetworkPerformance } from "@/components/dashboard/network-performance"
import { RecentActivities } from "@/components/dashboard/recent-activities"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Section 1: Key Metrics */}
        <MetricsRow />

        {/* Section 2: Alert Summary */}
        <AlertSummary />

        {/* Section 3: Revenue & Top Apps (60/40) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RevenueChart />
          </div>
          <div className="lg:col-span-2">
            <TopApps />
          </div>
        </div>

        {/* Section 4: Network Performance & Activities (50/50) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NetworkPerformance />
          <RecentActivities />
        </div>
      </div>
    </DashboardLayout>
  )
}
