import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { ActivityLogCenterContent } from "@/components/activity-logs/activity-log-center-content"
import { UserRole } from "@/lib/enums/user-role"

export default function ActivityLogsPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.Admin, UserRole.SuperAdmin]}>
      <DashboardLayout>
        <ActivityLogCenterContent />
      </DashboardLayout>
    </RoleGuard>
  )
}
