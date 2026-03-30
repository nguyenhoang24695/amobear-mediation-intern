import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AlertDetailPageContent } from "@/components/alerts/alert-detail-page-content"

export default async function AlertCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <AlertDetailPageContent alertId={id} />
    </DashboardLayout>
  )
}

