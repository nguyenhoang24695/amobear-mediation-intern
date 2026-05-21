import type { OrgUserDropPayload, PersonnelNode } from "@/lib/organizations/personnel-chart-types"

export const PERSONNEL_DRAG_TYPE = "personnel-org-user" as const
export const PERSONNEL_CHART_NODE_DRAG_TYPE = "personnel-chart-node" as const

export type PersonnelDragData = {
  type: typeof PERSONNEL_DRAG_TYPE
  user: OrgUserDropPayload
}

export type PersonnelChartNodeDragData = {
  type: typeof PERSONNEL_CHART_NODE_DRAG_TYPE
  node: PersonnelNode
}

export function paletteDraggableId(userId: string): string {
  return `palette-user-${userId}`
}

export function chartDropId(nodeId: string): string {
  return `chart-drop-${nodeId}`
}

export function parsePaletteDraggableId(id: string): string | null {
  if (!id.startsWith("palette-user-")) return null
  return id.slice("palette-user-".length)
}

export function parseChartDropId(id: string): string | null {
  if (!id.startsWith("chart-drop-")) return null
  return id.slice("chart-drop-".length)
}

export function chartNodeDraggableId(nodeId: string): string {
  return `chart-node-${nodeId}`
}

export function parseChartNodeDraggableId(id: string): string | null {
  if (!id.startsWith("chart-node-")) return null
  return id.slice("chart-node-".length)
}
