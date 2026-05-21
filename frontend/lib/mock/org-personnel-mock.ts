export type {
  PersonnelNodeType,
  PersonnelStatus,
  PersonnelNode,
  OrgUserDropPayload,
  PersonnelMemberPatch,
} from "@/lib/organizations/personnel-chart-types"

import type {
  PersonnelNode,
  OrgUserDropPayload,
  PersonnelMemberPatch,
  PersonnelStatus,
} from "@/lib/organizations/personnel-chart-types"
import {
  flattenPersonnelTree,
  collectDescendantIds,
  isChartDropTarget,
} from "@/lib/organizations/personnel-chart-tree-utils"

export { flattenPersonnelTree, collectDescendantIds, isChartDropTarget, movePersonnelNode } from "@/lib/organizations/personnel-chart-tree-utils"

export function chartNodeIdForOrgUser(userId: string): string {
  return `user-${userId}`
}

export function isOrgUserPlacedInTree(root: PersonnelNode, userId: string, email?: string): boolean {
  const normEmail = email?.trim().toLowerCase()
  return flattenPersonnelTree(root).some(
    (n) => n.linkedUserId === userId || (normEmail && n.email?.trim().toLowerCase() === normEmail),
  )
}

export function addOrgUserUnderNode(
  root: PersonnelNode,
  parentId: string,
  user: OrgUserDropPayload,
): PersonnelNode | null {
  if (isOrgUserPlacedInTree(root, user.id, user.email)) return null

  const parent = flattenPersonnelTree(root).find((n) => n.id === parentId)
  if (!parent || !isChartDropTarget(parent)) return null

  const newChild: PersonnelNode = {
    id: chartNodeIdForOrgUser(user.id),
    parentId,
    type: "member",
    name: user.name,
    email: user.email,
    status: (user.status === "inactive" || user.status === "invited"
      ? user.status
      : "active") as PersonnelStatus,
    title: user.title ?? "Team member",
    department: parent.department ?? parent.name,
    linkedUserId: user.id,
    managerId: parent.linkedUserId ?? parent.id,
    managerName: parent.name,
  }

  return appendChildToNode(root, parentId, newChild)
}

function appendChildToNode(
  root: PersonnelNode,
  parentId: string,
  child: PersonnelNode,
): PersonnelNode | null {
  if (root.id === parentId) {
    const nextChildren = [...(root.children ?? []), child]
    const reportCount = nextChildren.filter((c) => c.type === "member").length
    return {
      ...root,
      children: nextChildren,
      directReports: reportCount > 0 ? reportCount : root.directReports,
    }
  }
  if (!root.children?.length) return null
  let updated = false
  const children = root.children.map((c) => {
    const next = appendChildToNode(c, parentId, child)
    if (next) {
      updated = true
      return next
    }
    return c
  })
  return updated ? { ...root, children } : null
}

function hashOrgSeed(orgId: string): number {
  let h = 0
  for (let i = 0; i < orgId.length; i++) {
    h = (h << 5) - h + orgId.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function countNodes(node: PersonnelNode): { headcount: number; departments: number } {
  let headcount = node.type === "member" ? 1 : 0
  let departments = node.type === "department" ? 1 : 0
  for (const child of node.children ?? []) {
    const sub = countNodes(child)
    headcount += sub.headcount
    departments += sub.departments
  }
  return { headcount, departments }
}

export function getPersonnelStats(root: PersonnelNode) {
  const { headcount, departments } = countNodes(root)
  return {
    headcount: headcount + (root.type === "organization" ? 1 : 0),
    departments,
  }
}

export function updatePersonnelNodeInTree(
  root: PersonnelNode,
  nodeId: string,
  patch: Partial<PersonnelNode>,
): PersonnelNode {
  if (root.id === nodeId) {
    return { ...root, ...patch }
  }
  if (!root.children?.length) return root
  return {
    ...root,
    children: root.children.map((c) => updatePersonnelNodeInTree(c, nodeId, patch)),
  }
}

/** Candidates to assign as manager (exclude self and descendants). */
export function getManagerCandidates(
  root: PersonnelNode,
  memberId: string,
): PersonnelNode[] {
  const target = flattenPersonnelTree(root).find((n) => n.id === memberId)
  if (!target) return []
  const excluded = new Set([memberId, ...collectDescendantIds(target)])
  return flattenPersonnelTree(root).filter(
    (n) => !excluded.has(n.id) && (n.type === "member" || n.type === "department"),
  )
}

export function filterPersonnelTree(
  node: PersonnelNode,
  query: string,
): PersonnelNode | null {
  const q = query.trim().toLowerCase()
  if (!q) return node

  const nameMatch =
    node.name.toLowerCase().includes(q) ||
    (node.title?.toLowerCase().includes(q) ?? false) ||
    (node.department?.toLowerCase().includes(q) ?? false) ||
    (node.email?.toLowerCase().includes(q) ?? false)

  const filteredChildren = (node.children ?? [])
    .map((c) => filterPersonnelTree(c, q))
    .filter((c): c is PersonnelNode => c !== null)

  if (nameMatch || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children }
  }
  return null
}

function buildEngineeringTeam(seed: number): PersonnelNode[] {
  const leads = [
    { name: "Minh Nguyen", title: "Engineering Manager" },
    { name: "Alex Chen", title: "Tech Lead" },
  ]
  const members = [
    { name: "Lan Tran", title: "Senior Developer" },
    { name: "David Park", title: "Developer" },
    { name: "Hana Sato", title: "QA Engineer" },
  ]
  const lead = leads[seed % leads.length]
  const extra = members.slice(0, 2 + (seed % 2))
  return [
    {
      id: `eng-lead-${seed}`,
      parentId: "dept-engineering",
      type: "member",
      name: lead.name,
      title: lead.title,
      department: "Engineering",
      email: `${lead.name.split(" ")[0].toLowerCase()}@preview.local`,
      status: "active",
      directReports: extra.length,
      children: extra.map((m, i) => ({
        id: `eng-m-${seed}-${i}`,
        parentId: `eng-lead-${seed}`,
        type: "member" as const,
        name: m.name,
        title: m.title,
        department: "Engineering",
        email: `${m.name.split(" ")[0].toLowerCase()}@preview.local`,
        status: (i % 3 === 0 ? "invited" : "active") as PersonnelStatus,
      })),
    },
  ]
}

function buildGrowthTeam(seed: number): PersonnelNode[] {
  return [
    {
      id: "growth-lead",
      parentId: "dept-growth",
      type: "member",
      name: seed % 2 === 0 ? "Sarah Kim" : "James Wilson",
      title: "Growth Lead",
      department: "Growth & UA",
      email: "growth.lead@preview.local",
      status: "active",
      directReports: 2,
      children: [
        {
          id: "growth-m1",
          parentId: "growth-lead",
          type: "member",
          name: "Emily Vo",
          title: "UA Specialist",
          department: "Growth & UA",
          email: "emily.vo@preview.local",
          status: "active",
        },
        {
          id: "growth-m2",
          parentId: "growth-lead",
          type: "member",
          name: "Tom Bradley",
          title: "Creative Strategist",
          department: "Growth & UA",
          email: "tom.bradley@preview.local",
          status: seed % 3 === 0 ? "inactive" : "active",
        },
      ],
    },
  ]
}

function buildOpsTeam(): PersonnelNode[] {
  return [
    {
      id: "ops-lead",
      parentId: "dept-operations",
      type: "member",
      name: "Priya Sharma",
      title: "Operations Manager",
      department: "Operations",
      email: "priya.sharma@preview.local",
      status: "active",
      directReports: 1,
      children: [
        {
          id: "ops-m1",
          parentId: "ops-lead",
          type: "member",
          name: "Chris Miller",
          title: "Data Analyst",
          department: "Operations",
          email: "chris.miller@preview.local",
          status: "active",
        },
      ],
    },
  ]
}

function buildProductTeam(seed: number): PersonnelNode[] {
  if (seed % 2 === 0) return []
  return [
    {
      id: "product-lead",
      parentId: "dept-product",
      type: "member",
      name: "Anna Lopez",
      title: "Product Manager",
      department: "Product",
      email: "anna.lopez@preview.local",
      status: "active",
      directReports: 1,
      children: [
        {
          id: "product-m1",
          parentId: "product-lead",
          type: "member",
          name: "Kevin O'Brien",
          title: "Product Designer",
          department: "Product",
          email: "kevin.obrien@preview.local",
          status: "active",
        },
      ],
    },
  ]
}

/**
 * Mock organizational tree for UX review (no backend).
 */
export function getMockOrgPersonnelTree(orgId: string, orgName = "Organization"): PersonnelNode {
  const seed = hashOrgSeed(orgId)
  const ceoName = seed % 2 === 0 ? "Nguyen Van A" : "Jordan Mitchell"
  const showProduct = seed % 3 !== 0

  const departments: PersonnelNode[] = [
    {
      id: "dept-engineering",
      parentId: "root",
      type: "department",
      name: "Engineering",
      title: "Department",
      department: "Engineering",
      status: "active",
      directReports: 1,
      children: buildEngineeringTeam(seed),
    },
    {
      id: "dept-growth",
      parentId: "root",
      type: "department",
      name: "Growth & UA",
      title: "Department",
      department: "Growth & UA",
      status: "active",
      directReports: 1,
      children: buildGrowthTeam(seed),
    },
    {
      id: "dept-operations",
      parentId: "root",
      type: "department",
      name: "Operations",
      title: "Department",
      department: "Operations",
      status: "active",
      directReports: 1,
      children: buildOpsTeam(),
    },
  ]

  if (showProduct) {
    departments.push({
      id: "dept-product",
      parentId: "root",
      type: "department",
      name: "Product",
      title: "Department",
      department: "Product",
      status: "active",
      directReports: seed % 2 === 0 ? 0 : 1,
      children: buildProductTeam(seed),
    })
  }

  return {
    id: "root",
    parentId: null,
    type: "organization",
    name: orgName,
    title: "Chief Executive Officer",
    department: "Executive",
    email: `${ceoName.split(" ")[0].toLowerCase()}.ceo@preview.local`,
    status: "active",
    directReports: departments.length,
    children: [
      {
        id: "ceo",
        parentId: "root",
        type: "member",
        name: ceoName,
        title: "CEO",
        department: "Executive",
        email: `${ceoName.split(" ")[0].toLowerCase()}.ceo@preview.local`,
        status: "active",
        directReports: departments.length,
        children: departments,
      },
    ],
  }
}
