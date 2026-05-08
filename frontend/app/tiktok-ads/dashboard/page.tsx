import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokDashboard } from "@/components/tiktok-ads/dashboard/tiktok-dashboard"

export default function TikTokDashboardPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-campaigns" functionKey="view">
        <TikTokDashboard />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
