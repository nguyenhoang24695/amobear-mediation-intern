import { TeamDetailContent } from "@/components/teams/team-detail-content"

interface TeamDetailPageProps {
    params: Promise<{
        id: string
        teamId: string
    }>
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
    const { id: orgId, teamId } = await params

    return <TeamDetailContent orgId={orgId} teamId={teamId} />
}
