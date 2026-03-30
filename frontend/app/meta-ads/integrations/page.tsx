import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { IntegrationsContent } from "@/components/meta-ads/integrations/integrations-content"

export default function MetaIntegrationsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-accounts" functionKey="view">
        <IntegrationsContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}