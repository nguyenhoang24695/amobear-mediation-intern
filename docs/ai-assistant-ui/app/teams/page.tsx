import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { TeamManagementContent } from "@/components/teams/team-management-content"

export default function TeamsPage() {
  return (
    <DashboardLayout>
      <TeamManagementContent />
    </DashboardLayout>
  )
}
