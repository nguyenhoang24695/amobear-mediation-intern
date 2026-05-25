import type { PersonnelNode } from "./personnel-chart-types"
import { stripTeamMemberChildrenForPersist } from "./personnel-chart-team-utils"

export function flattenPersonnelTree(node: PersonnelNode): PersonnelNode[] {
  const list: PersonnelNode[] = [node]
  for (const child of node.children ?? []) {
    list.push(...flattenPersonnelTree(child))
  }
  return list
}

export function collectDescendantIds(node: PersonnelNode): Set<string> {
  const ids = new Set<string>()
  const walk = (n: PersonnelNode) => {
    for (const child of n.children ?? []) {
      ids.add(child.id)
      walk(child)
    }
  }
  walk(node)
  return ids
}

/** Valid drop parent when dragging users from palette or reparenting chart nodes. */
export function isChartDropTarget(node: PersonnelNode): boolean {
  return (
    node.type === "organization" || node.type === "member" || node.type === "department"
  )
}

/** Strip volatile fields for dirty comparison */
export function normalizePersonnelTreeForCompare(node: PersonnelNode): PersonnelNode {
  return {
    id: node.id,
    parentId: node.parentId,
    type: node.type,
    name: node.name,
    title: node.title ?? undefined,
    department: node.department ?? undefined,
    email: node.email ?? undefined,
    status: node.status ?? undefined,
    managerId: node.managerId ?? undefined,
    managerName: node.managerName ?? undefined,
    linkedUserId: node.linkedUserId ?? undefined,
    isTeamGroup: node.isTeamGroup ?? undefined,
    teamId: node.teamId ?? undefined,
    teamName: node.teamName ?? undefined,
    isTeamLead: node.isTeamLead ?? undefined,
    children: (node.children ?? []).map(normalizePersonnelTreeForCompare),
  }
}

export function personnelTreesEqual(a: PersonnelNode, b: PersonnelNode): boolean {
  const left = stripTeamMemberChildrenForPersist(a)
  const right = stripTeamMemberChildrenForPersist(b)
  return (
    JSON.stringify(normalizePersonnelTreeForCompare(left)) ===
    JSON.stringify(normalizePersonnelTreeForCompare(right))
  )
}

function detachSubtree(root: PersonnelNode, nodeId: string): { tree: PersonnelNode; subtree: PersonnelNode | null } {
  if (root.id === nodeId) {
    return { tree: root, subtree: root }
  }
  if (!root.children?.length) {
    return { tree: root, subtree: null }
  }

  let detached: PersonnelNode | null = null
  const children: PersonnelNode[] = []

  for (const child of root.children) {
    if (child.id === nodeId) {
      detached = child
      continue
    }
    const result = detachSubtree(child, nodeId)
    if (result.subtree) {
      detached = result.subtree
      children.push(result.tree)
    } else {
      children.push(child)
    }
  }

  if (!detached) return { tree: root, subtree: null }

  return {
    tree: {
      ...root,
      children: children.length > 0 ? children : undefined,
    },
    subtree: detached,
  }
}

function attachUnderParent(
  root: PersonnelNode,
  parentId: string,
  subtree: PersonnelNode,
  parentNode: PersonnelNode,
): PersonnelNode | null {
  const updatedChild: PersonnelNode = {
    ...subtree,
    parentId,
    department: parentNode.department ?? parentNode.name,
    managerId: parentNode.linkedUserId ?? parentNode.id,
    managerName: parentNode.name,
  }

  if (root.id === parentId) {
    const nextChildren = [...(root.children ?? []), updatedChild]
    const reportCount = nextChildren.filter(
      (c) => c.type === "member" || c.type === "department",
    ).length
    return {
      ...root,
      children: nextChildren,
      directReports: reportCount > 0 ? reportCount : root.directReports,
    }
  }

  if (!root.children?.length) return null

  let updated = false
  const children = root.children.map((c) => {
    const next = attachUnderParent(c, parentId, subtree, parentNode)
    if (next) {
      updated = true
      return next
    }
    return c
  })

  return updated ? { ...root, children } : null
}

function refreshDirectReports(node: PersonnelNode): PersonnelNode {
  const children = (node.children ?? []).map(refreshDirectReports)
  const memberReports = children.filter((c) => c.type === "member").length
  const departmentReports = children.filter((c) => c.type === "department").length
  const reportCount = memberReports + departmentReports
  return {
    ...node,
    children: children.length > 0 ? children : undefined,
    directReports: reportCount > 0 ? reportCount : undefined,
  }
}

/**
 * Move a node (and its subtree) under a new parent. Returns null if invalid (cycle, same parent, etc.).
 */
export function movePersonnelNode(
  root: PersonnelNode,
  nodeId: string,
  newParentId: string,
): PersonnelNode | null {
  if (nodeId === newParentId) return null

  const target = flattenPersonnelTree(root).find((n) => n.id === nodeId)
  const newParent = flattenPersonnelTree(root).find((n) => n.id === newParentId)
  if (!target || !newParent || !isChartDropTarget(newParent)) return null

  if (target.type === "organization") return null

  const descendants = collectDescendantIds(target)
  if (descendants.has(newParentId) || newParentId === nodeId) return null

  if (target.parentId === newParentId) return null

  const { tree: withoutNode, subtree } = detachSubtree(root, nodeId)
  if (!subtree || subtree.id === root.id && root.type === "organization" && nodeId === root.id) {
    return null
  }

  const attached = attachUnderParent(withoutNode, newParentId, subtree, newParent)
  if (!attached) return null

  return refreshDirectReports(attached)
}

/** All member names in the subtree below this node (not including the node itself). */
export function getMemberDescendantNames(node: PersonnelNode): string[] {
  const names: string[] = []
  const walk = (n: PersonnelNode) => {
    for (const child of n.children ?? []) {
      if (child.type === "member") names.push(child.name)
      walk(child)
    }
  }
  walk(node)
  return names
}

/** Clear all personnel under the organization root (keeps the org node). */
export function clearOrganizationPersonnelChildren(root: PersonnelNode): PersonnelNode | null {
  if (root.type !== "organization") return null
  return refreshDirectReports({
    ...root,
    children: undefined,
    directReports: 0,
  })
}

/** Remove a member node and its entire subtree from the chart. */
export function removePersonnelNodeFromTree(
  root: PersonnelNode,
  nodeId: string,
): PersonnelNode | null {
  const target = flattenPersonnelTree(root).find((n) => n.id === nodeId)
  if (!target || target.type !== "member") return null

  const { tree, subtree } = detachSubtree(root, nodeId)
  if (!subtree) return null

  return refreshDirectReports(tree)
}
