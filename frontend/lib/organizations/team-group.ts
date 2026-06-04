export interface OrgTeamGroupDefinition {
  id: string
  name: string
  sortOrder: number
}

export type TeamGroupSection = { key: string | null; label: string }

export const UNCATEGORIZED_TEAM_GROUP_SECTION: TeamGroupSection = {
  key: null,
  label: "Uncategorized",
}

const CHART_CLUSTER_PALETTE = [
  "border-violet-300/90 bg-violet-50/25",
  "border-blue-300/90 bg-blue-50/25",
  "border-emerald-300/90 bg-emerald-50/25",
  "border-amber-300/90 bg-amber-50/25",
  "border-rose-300/90 bg-rose-50/25",
  "border-cyan-300/90 bg-cyan-50/25",
] as const

const UNCATEGORIZED_CHART_CLUSTER_CLASS = "border-dashed border-slate-300 bg-slate-50/30"

/** Sections from org-defined groups, then Uncategorized. */
export function buildTeamGroupSections(groups: OrgTeamGroupDefinition[]): TeamGroupSection[] {
  const sorted = [...groups].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  )
  return [...sorted.map((g) => ({ key: g.name, label: g.name })), UNCATEGORIZED_TEAM_GROUP_SECTION]
}

/** Include teams whose group name is not in definitions (legacy data) as extra sections. */
export function buildTeamGroupSectionsFromOrg(
  groups: OrgTeamGroupDefinition[],
  teams: { teamGroup?: string | null }[],
): TeamGroupSection[] {
  const base = buildTeamGroupSections(groups)
  const known = new Set(base.map((s) => s.key).filter((k): k is string => k != null))
  const orphanNames = new Set<string>()
  for (const team of teams) {
    const name = team.teamGroup?.trim()
    if (name && !known.has(name)) orphanNames.add(name)
  }
  const orphanSections = [...orphanNames]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((name) => ({ key: name, label: name }))
  if (orphanSections.length === 0) return base
  return [...base.slice(0, -1), ...orphanSections, UNCATEGORIZED_TEAM_GROUP_SECTION]
}

export function getTeamGroupSectionLabel(
  teamGroup: string | null | undefined,
  sections?: TeamGroupSection[],
): string {
  if (teamGroup == null || teamGroup.trim() === "") return UNCATEGORIZED_TEAM_GROUP_SECTION.label
  const match = sections?.find((s) => s.key === teamGroup)
  return match?.label ?? teamGroup
}

export function getTeamGroupChartClusterClass(label: string, sections?: TeamGroupSection[]): string {
  if (label === UNCATEGORIZED_TEAM_GROUP_SECTION.label) return UNCATEGORIZED_CHART_CLUSTER_CLASS
  const index = sections?.findIndex((s) => s.label === label) ?? -1
  if (index >= 0) return CHART_CLUSTER_PALETTE[index % CHART_CLUSTER_PALETTE.length]
  return CHART_CLUSTER_PALETTE[0]
}
