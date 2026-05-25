import { teamMembersApi } from "@/lib/api/services"
import type { OrgTeam } from "@/lib/api/services"
import type { TeamMember } from "@/types/api"
import { chartNodeIdForTeam } from "@/lib/mock/org-personnel-mock"
import type { PersonnelNode, PersonnelStatus } from "@/lib/organizations/personnel-chart-types"

function statusFromMember(status?: string): PersonnelStatus {
  return (status === "inactive" || status === "invited" ? status : "active") as PersonnelStatus
}

/** Persisted chart: team container only — no embedded members. */
export function stripTeamMemberChildrenForPersist(node: PersonnelNode): PersonnelNode {
  if (node.isTeamGroup && node.teamId) {
    return {
      ...node,
      children: undefined,
      directReports: undefined,
      isTeamLead: undefined,
    }
  }

  const children = (node.children ?? []).map(stripTeamMemberChildrenForPersist)
  return {
    ...node,
    children: children.length > 0 ? children : undefined,
  }
}

function buildTeamMemberNodes(
  teamId: string,
  teamName: string,
  teamChartId: string,
  parent: PersonnelNode,
  members: TeamMember[],
  leadUserId?: string | null,
): PersonnelNode[] {
  const lead =
    members.find((m) => m.id === leadUserId) ??
    members.find((m) => m.teams.some((t) => t.id === teamId && t.isTeamLead)) ??
    members[0]

  if (!lead) return []

  const nonLeadMembers = members.filter((m) => m.id !== lead.id)

  const leadNode: PersonnelNode = {
    id: `team-${teamId}-lead-${lead.id}`,
    parentId: teamChartId,
    type: "member",
    name: lead.fullName || lead.email,
    email: lead.email,
    status: statusFromMember(lead.status),
    title: "Team Lead",
    department: teamName,
    linkedUserId: lead.id,
    managerId: parent.linkedUserId ?? parent.id,
    managerName: parent.name,
    teamId,
    teamName,
    isTeamLead: true,
    directReports: nonLeadMembers.length > 0 ? nonLeadMembers.length : undefined,
    children:
      nonLeadMembers.length > 0
        ? nonLeadMembers.map((member) => ({
            id: `team-${teamId}-member-${member.id}`,
            parentId: `team-${teamId}-lead-${lead.id}`,
            type: "member" as const,
            name: member.fullName || member.email,
            email: member.email,
            status: statusFromMember(member.status),
            title: member.teams.find((t) => t.id === teamId)?.role ?? "Team member",
            department: teamName,
            linkedUserId: member.id,
            managerId: lead.id,
            managerName: lead.fullName || lead.email,
            teamId,
            teamName,
          }))
        : undefined,
  }

  return [leadNode]
}

async function hydrateTeamNode(
  node: PersonnelNode,
  parent: PersonnelNode | null,
  orgTeamsById: Map<string, OrgTeam>,
): Promise<PersonnelNode> {
  if (!node.isTeamGroup || !node.teamId) {
    const children = node.children?.length
      ? await Promise.all(
          node.children.map((child) => hydrateTeamNode(child, node, orgTeamsById)),
        )
      : undefined
    return {
      ...node,
      children: children && children.length > 0 ? children : undefined,
    }
  }

  const teamId = node.teamId
  const teamMeta = orgTeamsById.get(teamId)
  const teamName = node.teamName ?? teamMeta?.name ?? node.name
  const teamChartId = chartNodeIdForTeam(teamId)
  const chartParent =
    parent ??
    ({
      id: node.parentId ?? "",
      name: node.managerName ?? "",
      linkedUserId: node.managerId ?? undefined,
    } as PersonnelNode)

  let members: TeamMember[] = []
  try {
    const response = await teamMembersApi.filterTeamMembers({
      teamId,
      page: 1,
      pageSize: 500,
      status: "active",
    })
    members = response.data?.items ?? []
  } catch {
    members = []
  }

  const hydratedChildren = buildTeamMemberNodes(
    teamId,
    teamName,
    teamChartId,
    chartParent,
    members,
    teamMeta?.userId,
  )

  return {
    ...node,
    id: teamChartId,
    name: teamName,
    teamName,
    title: teamMeta?.memberCount
      ? `${teamMeta.memberCount} members`
      : node.title ?? `${members.length} members`,
    children: hydratedChildren.length > 0 ? hydratedChildren : undefined,
    directReports: hydratedChildren.length > 0 ? 1 : undefined,
  }
}

/** Load team lead + members from teams / team_members for display only. */
export async function hydrateTeamGroupsInTree(
  root: PersonnelNode,
  orgTeamsById: Map<string, OrgTeam>,
): Promise<PersonnelNode> {
  return hydrateTeamNode(root, null, orgTeamsById)
}
