import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CampaignListContent } from "@/components/meta-ads/campaigns/campaign-list-content"

export default function MetaCampaignsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-campaigns" functionKey="view">
        <CampaignListContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
