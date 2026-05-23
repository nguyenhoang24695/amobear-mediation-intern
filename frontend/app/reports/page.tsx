import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { CustomReportBuilderContent } from "@/components/reports/custom-report-builder-content"

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-reports" functionKey="view">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <CustomReportBuilderContent />
        </Suspense>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
