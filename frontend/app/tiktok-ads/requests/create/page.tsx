import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokRequestFormContent } from "@/components/tiktok-ads/requests/tiktok-request-content"

export default function Page() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-requests" functionKey="create">
        <TikTokRequestFormContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
