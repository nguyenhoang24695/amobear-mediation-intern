import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ActivityLogCenterContent } from "@/components/activity-logs/activity-log-center-content"

export default function ActivityLogsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-activity-logs" functionKey="view">
        <ActivityLogCenterContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
