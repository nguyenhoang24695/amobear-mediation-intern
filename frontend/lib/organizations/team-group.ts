export const TEAM_GROUP_VALUES = [
  "Administration",
  "Platform",
  "Production",
  "Business",
] as const

export type TeamGroupValue = (typeof TEAM_GROUP_VALUES)[number]

export const TEAM_GROUP_UNCATEGORIZED = null

export const TEAM_GROUP_SECTIONS: { key: TeamGroupValue | null; label: string }[] = [
  ...TEAM_GROUP_VALUES.map((v) => ({ key: v, label: v })),
  { key: null, label: "Uncategorized" },
]

export function isTeamGroupValue(value: string | null | undefined): value is TeamGroupValue {
  return value != null && (TEAM_GROUP_VALUES as readonly string[]).includes(value)
}

/** Org chart bordered cluster styles keyed by section label. */
export const TEAM_GROUP_CHART_CLUSTER_CLASS: Record<string, string> = {
  Administration: "border-violet-300/90 bg-violet-50/25",
  Platform: "border-blue-300/90 bg-blue-50/25",
  Production: "border-emerald-300/90 bg-emerald-50/25",
  Business: "border-amber-300/90 bg-amber-50/25",
  Uncategorized: "border-dashed border-slate-300 bg-slate-50/30",
}

export function getTeamGroupChartClusterClass(label: string): string {
  return TEAM_GROUP_CHART_CLUSTER_CLASS[label] ?? TEAM_GROUP_CHART_CLUSTER_CLASS.Uncategorized
}
