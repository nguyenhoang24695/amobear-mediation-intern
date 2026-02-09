import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserManagementContent } from "@/components/users/user-management-content"

export default function TeamMembersPage() {
  return (
    <DashboardLayout>
      <UserManagementContent />
    </DashboardLayout>
  )
}

