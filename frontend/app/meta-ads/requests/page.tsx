import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RequestListContent } from "@/components/meta-ads/requests/request-list-content"

export default function MetaRequestsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-requests" functionKey="view">
        <RequestListContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}