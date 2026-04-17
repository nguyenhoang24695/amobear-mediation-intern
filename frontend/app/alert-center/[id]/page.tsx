import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AlertCenterEntryGuard } from "@/components/auth/alert-center-entry-guard"
import { AlertDetailPageContent } from "@/components/alerts/alert-detail-page-content"

export default async function AlertCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <AlertCenterEntryGuard>
        <AlertDetailPageContent alertId={id} />
      </AlertCenterEntryGuard>
    </DashboardLayout>
  )
}

