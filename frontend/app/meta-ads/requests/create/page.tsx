import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CreateRequestContent } from "@/components/meta-ads/create-request/create-request-content"

export default function CreateMetaCampaignRequestPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-requests" functionKey="create">
        <CreateRequestContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}