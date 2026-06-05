import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AdmobAppMappingsContent } from "@/components/admob-ads/app-mappings/app-mappings-content"

export default function AdmobAppMappingsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-apps" functionKey="view">
        <AdmobAppMappingsContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
