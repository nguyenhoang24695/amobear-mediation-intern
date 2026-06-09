import type { App } from "@/types/api"
import type { MyReportAppSelectionMode } from "@/components/my-reports/hooks/use-my-report-config"
import type { MyReportTeamAppGroup } from "@/components/my-reports/hooks/use-my-report-team-app-groups"

export const MY_REPORT_APP_SELECTION_MODES = [
  { value: "permission" as const, label: "Permitted apps" },
  { value: "by_team" as const, label: "App by team" },
]

export function resolveTeamAppIdsForTeams(
  teamIds: string[],
  groups: MyReportTeamAppGroup[],
): string[] {
  if (teamIds.length === 0) return []
  const teamSet = new Set(teamIds)
  const ids = new Set<string>()
  for (const group of groups) {
    if (!teamSet.has(group.teamId)) continue
    for (const app of group.apps) {
      if (app.appId) ids.add(app.appId)
    }
  }
  return [...ids]
}

/** Intersect selected apps with team scope when both filters are active. */
export function resolveEffectiveAppIds(
  selectedAppIds: string[],
  selectedTeamIds: string[],
  teamScopedAppIds: string[],
): { appIds: string[]; emptyIntersection: boolean } {
  if (selectedTeamIds.length === 0 || teamScopedAppIds.length === 0) {
    return { appIds: selectedAppIds, emptyIntersection: false }
  }
  if (selectedAppIds.length === 0) {
    return { appIds: [], emptyIntersection: false }
  }
  const teamSet = new Set(teamScopedAppIds)
  const intersected = selectedAppIds.filter((id) => teamSet.has(id))
  return {
    appIds: intersected,
    emptyIntersection: intersected.length === 0,
  }
}

/** When picking apps by team, infer team ids from selected app ids. */
export function inferTeamIdsFromSelectedApps(
  selectedAppIds: string[],
  groups: MyReportTeamAppGroup[],
): string[] {
  if (selectedAppIds.length === 0) return []
  const selected = new Set(selectedAppIds)
  const teamIds: string[] = []
  for (const group of groups) {
    const hasAny = group.apps.some((app) => app.appId && selected.has(app.appId))
    if (hasAny) teamIds.push(group.teamId)
  }
  return teamIds
}
export function resolveMyReportAppPool(
  mode: MyReportAppSelectionMode,
  permittedApps: App[],
  teamAppsUnion: App[],
): App[] {
  return mode === "by_team" ? teamAppsUnion : permittedApps
}

export function resolveAppSelectionLabel(
  appIds: string[],
  pool: App[],
  mode?: MyReportAppSelectionMode,
): string {
  const total = pool.length
  let base: string
  if (appIds.length === 0) {
    base = total === 0 ? "No apps" : "All apps"
  } else if (appIds.length === 1) {
    const app = pool.find((a) => a.appId === appIds[0])
    base = app?.displayName ?? app?.name ?? appIds[0]
  } else if (total > 0 && appIds.length === total) {
    base = "All apps"
  } else {
    base = `${appIds.length} apps`
  }

  if (mode === "by_team") return `By team · ${base}`
  return base
}

export function appMatchesSearchQuery(app: App, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [app.displayName, app.name, app.appId, app.appStoreId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}
