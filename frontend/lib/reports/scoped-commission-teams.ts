import { organizationsApi, type OrgTeam, type OrgTeamGroup } from "@/lib/api/services"
import type { PersonnelNode } from "@/lib/organizations/personnel-chart-types"
import {
  collectMembershipManagedTeams,
  collectTeamLeadTeamsFromChart,
  collectTeamLeadTeamsFromOrgTeams,
  collectTeamsUnderPersonnelNode,
  findCurrentPersonnelNode,
  mergeCommissionTeamOptions,
  type CommissionTeamOption,
} from "@/lib/reports/commission-team-utils"

export interface LoadScopedCommissionTeamsInput {
  orgId: string
  currentUserId?: string
  currentUserEmail?: string
  currentUserTeamIds: string[]
}

export interface LoadScopedCommissionTeamsResult {
  teams: CommissionTeamOption[]
  teamGroups: OrgTeamGroup[]
}

/** Danh sách team trong phạm vi quản lý — cùng logic Custom Report. */
export async function loadScopedCommissionTeams(
  input: LoadScopedCommissionTeamsInput,
): Promise<LoadScopedCommissionTeamsResult> {
  const { orgId, currentUserId, currentUserEmail, currentUserTeamIds } = input

  const [chart, orgTeams, teamGroups] = await Promise.all([
    organizationsApi.getPersonnelChart(orgId),
    organizationsApi.getTeams(orgId).catch(() => [] as OrgTeam[]),
    organizationsApi.getTeamGroups(orgId).catch(() => [] as OrgTeamGroup[]),
  ])

  if (!chart?.root) {
    return { teams: [], teamGroups }
  }

  const rawRoot = chart.root as PersonnelNode
  const currentNode = findCurrentPersonnelNode(rawRoot, currentUserId, currentUserEmail)
  const underManager = currentNode ? collectTeamsUnderPersonnelNode(currentNode) : []
  const memberManagedTeams = collectMembershipManagedTeams(rawRoot, currentUserTeamIds)
  const leadFromChart = currentUserId ? collectTeamLeadTeamsFromChart(rawRoot, currentUserId) : []
  const leadFromOrg = collectTeamLeadTeamsFromOrgTeams(orgTeams, currentUserId)
  const teamGroupById = new Map(orgTeams.map((team) => [team.id, team.teamGroup ?? null]))
  const merged = mergeCommissionTeamOptions(
    underManager,
    memberManagedTeams,
    leadFromChart,
    leadFromOrg,
  )

  return {
    teamGroups,
    teams: merged.map((team) => ({
      ...team,
      teamGroup: team.teamGroup ?? teamGroupById.get(team.teamId) ?? null,
    })),
  }
}
