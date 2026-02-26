import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DataAccountDetailContent } from "@/components/data-accounts/data-account-detail-content"

export default async function DataAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <DataAccountDetailContent accountId={id} />
    </DashboardLayout>
  )
}
