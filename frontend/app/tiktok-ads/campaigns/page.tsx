import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokCampaignsPage } from "@/components/tiktok-ads/admin/tiktok-admin-pages"

export default function Page() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-campaigns" functionKey="view">
        <TikTokCampaignsPage />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
