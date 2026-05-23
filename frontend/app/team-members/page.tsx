import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { UserManagementContent } from "@/components/users/user-management-content"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

interface TeamMembersPageProps {
  searchParams: Promise<{ teamId?: string }>
}

export default async function TeamMembersPage({ searchParams }: TeamMembersPageProps) {
  const { teamId } = await searchParams
  const normalizedTeamId = teamId?.trim()

  if (!normalizedTeamId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Team ID is required</h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Open team members from a team detail page. The URL must include{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">?teamId=...</code>.
          </p>
          <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
            <Link href="/teams">Browse teams</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <UserManagementContent teamId={normalizedTeamId} />
    </DashboardLayout>
  )
}
