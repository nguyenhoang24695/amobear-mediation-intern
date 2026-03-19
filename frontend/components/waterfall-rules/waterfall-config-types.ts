import type { UpsertWaterfallRecommendationConfigDto } from "@/types/api"

export interface AssignedAppSummary {
  appId: string
  appName: string
  iconUrl?: string
  platform?: string
}

export interface WaterfallConfigItem {
  id: number
  configName: string
  isGlobalDefault: boolean
  isActive: boolean
  minRecommendations: number
  maxRecommendations: number
  minMatchRatePercent: number
  minSowPercent: number
  notes?: string | null
  ruleGroupId?: number | null
  ruleGroupName?: string | null
  appCount: number
  appIds: string[]
  assignedApps: AssignedAppSummary[]
  displayAppCount: number
  displayApps: AssignedAppSummary[]
  createdAt: string
  updatedAt: string
}

export type ConfigApplyMode = "keep_current" | "semi_auto" | "auto"

export interface ConfigSaveRequest {
  config: UpsertWaterfallRecommendationConfigDto
  appIds: string[]
  applyMode: ConfigApplyMode
}
