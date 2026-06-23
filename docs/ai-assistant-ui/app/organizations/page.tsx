import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OrganizationListContent } from "@/components/organizations/organization-list-content"

export default function OrganizationsPage() {
  return (
    <DashboardLayout>
      <OrganizationListContent />
    </DashboardLayout>
  )
}
