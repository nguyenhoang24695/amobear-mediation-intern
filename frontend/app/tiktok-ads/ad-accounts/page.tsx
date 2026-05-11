import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokAdAccountsPage } from "@/components/tiktok-ads/admin/tiktok-admin-pages"

export default function Page() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-accounts" functionKey="view">
        <TikTokAdAccountsPage />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
