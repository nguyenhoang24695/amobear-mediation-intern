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

function walkPersonnelTree(node: PersonnelNode, visit: (current: PersonnelNode) => void) {
  visit(node)
  for (const child of node.children ?? []) {
    walkPersonnelTree(child, visit)
  }
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

export function findPersonnelTeamNode(root: PersonnelNode, teamId: string): PersonnelNode | null {
  let found: PersonnelNode | null = null
  walkPersonnelTree(root, (current) => {
    if (!found && current.isTeamGroup && current.teamId === teamId) {
      found = current
    }
  })
  return found
}

export function findPersonnelTeamNodes(root: PersonnelNode, teamIds: Iterable<string>): PersonnelNode[] {
  const targetTeamIds = new Set(
    [...teamIds]
      .map((teamId) => teamId.trim())
      .filter(Boolean),
  )
  if (targetTeamIds.size === 0) return []

  const foundByTeamId = new Map<string, PersonnelNode>()
  walkPersonnelTree(root, (current) => {
    if (!current.isTeamGroup || !current.teamId) return
    if (targetTeamIds.has(current.teamId) && !foundByTeamId.has(current.teamId)) {
      foundByTeamId.set(current.teamId, current)
    }
  })
  return [...foundByTeamId.values()]
}

export function collectTeamIdsUnderPersonnelNode(node: PersonnelNode): string[] {
  const teamIds = new Set<string>()
  walkPersonnelTree(node, (current) => {
    if (current.isTeamGroup && current.teamId) {
      teamIds.add(current.teamId)
    }
  })
  return [...teamIds]
}

export function collectMembershipManagedTeams(
  root: PersonnelNode,
  membershipTeamIds: Iterable<string>,
): CommissionTeamOption[] {
  const teamNodes = findPersonnelTeamNodes(root, membershipTeamIds)
    .filter((node) => collectTeamIdsUnderPersonnelNode(node).length > 1)
  return mergeCommissionTeamOptions(...teamNodes.map((node) => collectTeamsUnderPersonnelNode(node)))
}

export function collectMembershipManagedTeamIds(
  root: PersonnelNode,
  membershipTeamIds: Iterable<string>,
): string[] {
  const teamNodes = findPersonnelTeamNodes(root, membershipTeamIds)
    .filter((node) => collectTeamIdsUnderPersonnelNode(node).length > 1)
  const uniqueTeamIds = new Set<string>()
  for (const node of teamNodes) {
    for (const teamId of collectTeamIdsUnderPersonnelNode(node)) {
      uniqueTeamIds.add(teamId)
    }
  }
  return [...uniqueTeamIds]
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
