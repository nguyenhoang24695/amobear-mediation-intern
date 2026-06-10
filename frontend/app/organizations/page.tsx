import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationListContent } from "@/components/organizations/organization-list-content"

export default function OrganizationsPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-orgs" functionKey="view">
        <OrganizationListContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
