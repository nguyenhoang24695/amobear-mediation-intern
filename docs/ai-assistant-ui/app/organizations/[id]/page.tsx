import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationDetailContent } from "@/components/organizations/organization-detail-content"

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <OrganizationDetailContent orgId={id} />
    </DashboardLayout>
  )
}
