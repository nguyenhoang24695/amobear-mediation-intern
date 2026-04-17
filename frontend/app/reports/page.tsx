import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { RevenueReportContent } from "@/components/reports/revenue-report-content"

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-reports" functionKey="view">
        <RevenueReportContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
