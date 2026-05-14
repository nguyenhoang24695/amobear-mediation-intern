import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TikTokCampaignDetailContent } from "@/components/tiktok-ads/campaigns/tiktok-campaign-detail-content"

export default async function TikTokCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-tiktok-campaigns" functionKey="view">
        <TikTokCampaignDetailContent campaignId={id} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
