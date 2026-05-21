export type PersonnelNodeType = "organization" | "department" | "member"
export type PersonnelStatus = "active" | "inactive" | "invited"

export interface PersonnelNode {
  id: string
  parentId: string | null
  type: PersonnelNodeType
  name: string
  title?: string
  department?: string
  email?: string
  status?: PersonnelStatus
  directReports?: number
  managerId?: string | null
  managerName?: string | null
  linkedUserId?: string
  children?: PersonnelNode[]
}

export interface OrgUserDropPayload {
  id: string
  name: string
  email: string
  status: string
  title?: string
}

export type PersonnelMemberPatch = Pick<
  PersonnelNode,
  "name" | "title" | "department" | "email" | "status"
>

export interface OrganizationPersonnelChartResponse {
  root: PersonnelNode | null
  updatedAt?: string | null
  updatedByUserId?: string | null
  updatedByName?: string | null
}

export interface PersonnelChartHistoryItem {
  id: number
  occurredAt: string
  actorName?: string | null
  actorRole?: string | null
  summary: string
  metadata?: Record<string, unknown> | null
}

export interface PersonnelChartHistoryPagedResult {
  items: PersonnelChartHistoryItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  maxViewable: number
}
