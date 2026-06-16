import type { AuthUser } from "@/lib/auth"
import { hasScreenFunction } from "@/lib/auth"

const SCREEN_ORGS = "s-orgs"
const FN_MANAGE_PROFIT_PLAN = "manage-profit-plan"

export type TeamMembership = {
  id: string
  name?: string
  role: string
  isTeamLead?: boolean
}

export function getTeamMembership(
  teamId: string,
  teams?: TeamMembership[] | null,
): TeamMembership | null {
  return teams?.find((team) => team.id === teamId) ?? null
}

export function getTeamMembershipRole(
  teamId: string,
  teams?: TeamMembership[] | null,
): string | null {
  return getTeamMembership(teamId, teams)?.role?.trim().toLowerCase() ?? null
}

/**
 * Team members page — inline Revenue Plan edit when user is:
 * - org Revenue Plan manager (manage-profit-plan), or
 * - team Admin, or
 * - team lead of the team.
 */
export function canEditTeamRevenuePlan(
  teamId: string,
  user: Pick<AuthUser, "teams"> | null | undefined,
): boolean {
  if (hasScreenFunction(SCREEN_ORGS, FN_MANAGE_PROFIT_PLAN)) {
    return true
  }

  const membership = getTeamMembership(teamId, user?.teams)
  if (!membership) return false

  if (membership.isTeamLead) return true

  return membership.role?.trim().toLowerCase() === "admin"
}
