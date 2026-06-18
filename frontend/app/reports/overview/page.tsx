import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { OverviewReportContent } from "@/components/reports/overview-report-content"

export default function OverviewReportPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-overview-report" functionKey="view">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <OverviewReportContent />
        </Suspense>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
