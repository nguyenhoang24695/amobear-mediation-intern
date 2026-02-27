import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PermissionManagementContent } from "@/components/permissions/permission-management-content"

export default function PermissionsPage() {
  return (
    <DashboardLayout>
      <PermissionManagementContent />
    </DashboardLayout>
  )
}
