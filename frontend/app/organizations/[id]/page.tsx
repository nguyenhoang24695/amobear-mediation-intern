import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationDetailContent } from "@/components/organizations/organization-detail-content"

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-orgs" functionKey="view-details">
        <OrganizationDetailContent orgId={id} />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
