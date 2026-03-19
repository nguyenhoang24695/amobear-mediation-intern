export interface WaterfallRule {
  id: string
  name: string
  displayOrder: number
  active: boolean
  priority: "high" | "medium" | "low"
  sowMin: number | null
  sowMax: number | null
  matchRateMin: number | null
  matchRateMax: number | null
  onlyOneInstance: boolean | null
  isHighestFloor: "yes" | "no" | "any" | null
  actionType: string
  multiplier: number | null
  useMidpoint: boolean
  reasonTemplate: string
  groupId: number | null
  groupName: string | null
  updatedAt: string
}

export interface RuleGroup {
  id: number
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  color: string | null
  ruleCount: number
  appCount: number
  createdAt: string
  updatedAt: string
}
