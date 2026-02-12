import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationListContent } from "@/components/organizations/organization-list-content"
import { RoleGuard } from "@/components/auth/role-guard"
import { UserRole } from "@/lib/enums/user-role"

export default function OrganizationsPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.Admin, UserRole.SuperAdmin]}>
      <DashboardLayout>
        <OrganizationListContent />
      </DashboardLayout>
    </RoleGuard>
  )
}
