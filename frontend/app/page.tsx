"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricsRow } from "@/components/dashboard/metrics-row"
import { AlertSummary } from "@/components/dashboard/alert-summary"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopApps } from "@/components/dashboard/top-apps"
import { NetworkPerformance } from "@/components/dashboard/network-performance"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { AuthGuard } from "@/components/auth/auth-guard"
import { getCurrentUser, getUserDisplayName } from "@/lib/auth"

const SCREEN_DASHBOARD = "s-dashboard"
const FUNCTION_VIEW = "view"

function canViewDashboard(): boolean {
  const user = getCurrentUser()
  if (!user?.rolePermissions) return false
  return (user.rolePermissions[SCREEN_DASHBOARD] ?? []).includes(FUNCTION_VIEW)
}

export default function DashboardPage() {
  const showCards = canViewDashboard()
  const user = getCurrentUser()
  const displayName = getUserDisplayName(user ?? null)

  return (
    <AuthGuard>
      <DashboardLayout>
        {!showCards ? (
          <div className="flex flex-col gap-6">
            <p className="text-2xl text-muted-foreground">
              Welcome, <span className="font-bold text-black">{displayName}</span>.
            </p>
          </div>
        ) : (
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
        )}
      </DashboardLayout>
    </AuthGuard>
  )
}
