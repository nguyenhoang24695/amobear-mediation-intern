import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AdAccountsContent } from "@/components/meta-ads/ad-accounts/ad-accounts-content"

export default function MetaAdAccountsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-meta-accounts" functionKey="view">
        <AdAccountsContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}