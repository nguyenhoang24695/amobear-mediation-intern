import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { MyReportsContent } from "@/components/my-reports/my-reports-content"

export default function MyReportsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-my-reports" functionKey="view">
        <MyReportsContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
