import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserDetailContent } from "@/components/users/user-detail-content"

export default async function TeamMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <DashboardLayout>
      <UserDetailContent userId={id} />
    </DashboardLayout>
  )
}

