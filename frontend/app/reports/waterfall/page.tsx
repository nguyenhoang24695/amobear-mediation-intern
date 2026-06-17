import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { WaterfallReportContent } from "@/components/reports/waterfall-report-content"

export default function WaterfallReportPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-waterfall-report" functionKey="view">
        <WaterfallReportContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
