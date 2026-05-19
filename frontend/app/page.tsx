"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricsRow } from "@/components/dashboard/metrics-row"
import { AlertSummary } from "@/components/dashboard/alert-summary"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopApps } from "@/components/dashboard/top-apps"
import { NetworkPerformance } from "@/components/dashboard/network-performance"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { AuthGuard } from "@/components/auth/auth-guard"
import { getCurrentUser, getUserDisplayName, hasScreenFunction } from "@/lib/auth"

const SCREEN_DASHBOARD = "s-dashboard"
const FUNCTION_VIEW = "view"
const FUNCTION_DASHBOARD_METRICS = "view-metrics"
const FUNCTION_VIEW_ALERT_SUMMARY = "view-alert-summary"
const FUNCTION_VIEW_REVENUE_TOP_APPS = "view-revenue-top-apps"
const FUNCTION_NETWORK_PERFORMANCE_ACTIVITIES = "view-network-performance-activities"

function canViewDashboard(): boolean {
  return hasScreenFunction(SCREEN_DASHBOARD, FUNCTION_VIEW)
}

export default function DashboardPage() {
  const showCards = canViewDashboard()
  const canViewMetrics = hasScreenFunction(SCREEN_DASHBOARD, FUNCTION_DASHBOARD_METRICS)
  const canViewAlertSummary = hasScreenFunction(SCREEN_DASHBOARD, FUNCTION_VIEW_ALERT_SUMMARY)
  const canViewRevenueTopApps = hasScreenFunction(SCREEN_DASHBOARD, FUNCTION_VIEW_REVENUE_TOP_APPS)
  const canViewNetworkActivities = hasScreenFunction(SCREEN_DASHBOARD, FUNCTION_NETWORK_PERFORMANCE_ACTIVITIES)
  const hasAnyDashboardSection =
    canViewMetrics || canViewAlertSummary || canViewRevenueTopApps || canViewNetworkActivities
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
            {!hasAnyDashboardSection && (
              <p className="text-base text-muted-foreground">
                You currently do not have permission to view dashboard sections.
              </p>
            )}

            {/* Section 1: Key Metrics */}
            {canViewMetrics && <MetricsRow />}

            {/* Section 2: Alert Summary */}
            {canViewAlertSummary && <AlertSummary />}

            {/* Section 3: Revenue & Top Apps (60/40) */}
            {canViewRevenueTopApps && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                  <RevenueChart />
                </div>
                <div className="lg:col-span-2">
                  <TopApps />
                </div>
              </div>
            )}

            {/* Section 4: Network Performance & Activities (50/50) */}
            {canViewNetworkActivities && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NetworkPerformance />
                <RecentActivities />
              </div>
            )}
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  )
}
