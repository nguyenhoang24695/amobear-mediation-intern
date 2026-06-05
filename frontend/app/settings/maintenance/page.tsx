import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { UserRole } from "@/lib/enums/user-role"
import { MaintenanceManagementContent } from "@/components/settings/maintenance-management-content"

export default function MaintenanceManagementPage() {
  return (
    <RoleGuard allowedRoles={[UserRole.SuperAdmin]}>
      <DashboardLayout>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải…</div>}>
          <MaintenanceManagementContent />
        </Suspense>
      </DashboardLayout>
    </RoleGuard>
  )
}
