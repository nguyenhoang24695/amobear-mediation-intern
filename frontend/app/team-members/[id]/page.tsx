import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserDetailContent } from "@/components/users/user-detail-content"

interface TeamMemberDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ teamId?: string }>
}

export default async function TeamMemberDetailPage({ params, searchParams }: TeamMemberDetailPageProps) {
  const { id } = await params
  const { teamId } = await searchParams
  const normalizedTeamId = teamId?.trim()
  const backHref = normalizedTeamId
    ? `/team-members?teamId=${encodeURIComponent(normalizedTeamId)}`
    : "/teams"

  return (
    <DashboardLayout>
      <UserDetailContent userId={id} backHref={backHref} />
    </DashboardLayout>
  )
}

