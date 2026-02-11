import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserManagementContent } from "@/components/users/user-management-content"

interface TeamMembersPageProps {
  searchParams: Promise<{ teamId?: string }>
}

export default async function TeamMembersPage({ searchParams }: TeamMembersPageProps) {
  const { teamId } = await searchParams

  return (
    <DashboardLayout>
      <UserManagementContent teamId={teamId} />
    </DashboardLayout>
  )
}

