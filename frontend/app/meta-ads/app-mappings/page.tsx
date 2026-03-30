import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AppMappingsContent } from "@/components/meta-ads/app-mappings/app-mappings-content"

export default function MetaAppMappingsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-accounts" functionKey="view">
        <AppMappingsContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}