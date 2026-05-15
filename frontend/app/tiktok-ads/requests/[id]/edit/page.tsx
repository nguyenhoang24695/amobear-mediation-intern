import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokRequestFormContent } from "@/components/tiktok-ads/requests/tiktok-request-content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-requests" functionKey="create">
        <TikTokRequestFormContent requestId={Number(id)} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
