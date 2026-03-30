import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CampaignDetailContent } from "@/components/meta-ads/campaigns/campaign-detail-content"

export default async function MetaCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-campaigns" functionKey="view">
        <CampaignDetailContent campaignId={id} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
