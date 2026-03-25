import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RequestDetailContent } from "@/components/meta-ads/requests/request-detail-content"

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-requests" functionKey="view">
        <RequestDetailContent requestId={id} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}