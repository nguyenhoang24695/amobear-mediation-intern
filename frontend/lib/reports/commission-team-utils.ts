import type { OrgTeam } from "@/lib/api/services"
import type { TeamMember } from "@/types/api"
import type { PersonnelNode } from "@/lib/organizations/personnel-chart-types"

export interface CommissionUserOption {
  email: string
  label: string
}

export function mapTeamMembersToCommissionUsers(members: TeamMember[]): CommissionUserOption[] {
  const byEmail = new Map<string, CommissionUserOption>()
  for (const member of members) {
    const rawEmail = member.email?.trim()
    if (!rawEmail) continue
    const normalized = rawEmail.toLowerCase()
    if (byEmail.has(normalized)) continue
    byEmail.set(normalized, {
      email: rawEmail,
      label: member.fullName ? `${member.fullName} (${rawEmail})` : rawEmail,
    })
  }
  return [...byEmail.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export interface CommissionTeamOption {
  teamId: string
  label: string
}

/** Teams placed under the current user in the personnel chart (team group nodes). */
export function collectTeamsUnderPersonnelNode(node: PersonnelNode): CommissionTeamOption[] {
  const byId = new Map<string, CommissionTeamOption>()

  const walk = (current: PersonnelNode) => {
    if (current.isTeamGroup && current.teamId) {
      byId.set(current.teamId, {
        teamId: current.teamId,
        label: current.teamName ?? current.name,
      })
    }
    for (const child of current.children ?? []) walk(child)
  }

  walk(node)
  return [...byId.values()]
}

/** Teams where the current user is team lead (anywhere in the org chart). */
export function collectTeamLeadTeamsFromChart(
  root: PersonnelNode,
  currentUserId: string,
): CommissionTeamOption[] {
  const byId = new Map<string, CommissionTeamOption>()

  const walk = (current: PersonnelNode) => {
    if (current.teamId && current.isTeamLead && current.linkedUserId === currentUserId) {
      byId.set(current.teamId, {
        teamId: current.teamId,
        label: current.teamName ?? current.name,
      })
    }
    for (const child of current.children ?? []) walk(child)
  }

  walk(root)
  return [...byId.values()]
}

export function mergeCommissionTeamOptions(
  ...groups: CommissionTeamOption[][]
): CommissionTeamOption[] {
  const byId = new Map<string, CommissionTeamOption>()
  for (const group of groups) {
    for (const team of group) {
      if (!byId.has(team.teamId)) byId.set(team.teamId, team)
    }
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
}

/** Teams where userId on OrgTeam matches current user (team lead from master data). */
export function collectTeamLeadTeamsFromOrgTeams(
  orgTeams: OrgTeam[],
  currentUserId?: string,
): CommissionTeamOption[] {
  if (!currentUserId) return []
  return orgTeams
    .filter((team) => team.userId === currentUserId)
    .map((team) => ({ teamId: team.id, label: team.name }))
}
