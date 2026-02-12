import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationDetailContent } from "@/components/organizations/organization-detail-content"
import { RoleGuard } from "@/components/auth/role-guard"
import { UserRole } from "@/lib/enums/user-role"

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={[UserRole.Admin, UserRole.SuperAdmin]}>
      <DashboardLayout>
        <OrganizationDetailContent orgId={id} />
      </DashboardLayout>
    </RoleGuard>
  )
}
