import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { AdmobMonitoringContent } from "@/components/monitoring/admob/admob-monitoring-content"

export default function AdmobMonitoringPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-monitoring-admob" functionKey="view">
        <AdmobMonitoringContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
