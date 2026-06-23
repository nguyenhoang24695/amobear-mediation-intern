import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserManagementContent } from "@/components/users/user-management-content"

export default function UsersPage() {
  return (
    <DashboardLayout>
      <UserManagementContent />
    </DashboardLayout>
  )
}
