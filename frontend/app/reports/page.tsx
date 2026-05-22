import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { CustomReportBuilderContent } from "@/components/reports/custom-report-builder-content"

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-reports" functionKey="view">
        <CustomReportBuilderContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
