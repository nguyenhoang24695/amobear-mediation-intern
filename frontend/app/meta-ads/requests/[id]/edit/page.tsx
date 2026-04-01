import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CreateRequestContent } from "@/components/meta-ads/create-request/create-request-content"

export default async function EditMetaCampaignRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-requests" functionKey="create">
        <CreateRequestContent requestId={Number(id)} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
