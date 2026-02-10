import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserDetailContent } from "@/components/users/user-detail-content"

export default async function OrganizationUserDetailPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
    const { id, userId } = await params

    return (
        <DashboardLayout>
            <UserDetailContent
                userId={userId}
                backHref={`/organizations/${id}?tab=users`}
            />
        </DashboardLayout>
    )
}
