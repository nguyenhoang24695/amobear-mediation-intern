import { getCurrentUser, hasScreenFunction, type AuthUser } from "@/lib/auth"
import { hasSuperAdminRole } from "@/lib/enums/user-role"

const SCREEN_ORGS = "s-orgs"
const FN_MANAGE_TEAMS = "manage-teams"

/** super_admin, Manage Organization Teams, or team lead of the target team. */
export function canRemoveUserFromTeam(
  teamId: string,
  currentUser: AuthUser | null = getCurrentUser(),
): boolean {
  if (!currentUser || !teamId) return false

  if (hasSuperAdminRole(currentUser.role, currentUser.roles)) return true
  if (hasScreenFunction(SCREEN_ORGS, FN_MANAGE_TEAMS)) return true

  return currentUser.teams?.some((team) => team.id === teamId && team.isTeamLead) ?? false
}
