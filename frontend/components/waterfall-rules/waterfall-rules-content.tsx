"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Download,
  Smartphone,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { ConfigsTable } from "./configs-table"
import type { AddAppToGroupPreset } from "./configs-table"
import { RulesTable } from "./rules-table"
import { RulesGroupedView } from "./rules-grouped-view"
import { CreateEditConfigDialog } from "./create-edit-config-dialog"
import { CreateEditRuleDialog } from "./create-edit-rule-dialog"
import { CreateEditGroupDialog } from "./create-edit-group-dialog"
import { useApi } from "@/hooks/use-api"
import { waterfallRecommendationSettingsApi, structureApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import type { WaterfallRecommendationConfigDto, WaterfallRecommendationRuleDto } from "@/types/api"

const SCREEN_WATERFALL_RULES = "s-waterfall-rules"
const FN_VIEW_CONFIGS = "view-configs"
const FN_MANAGE_CONFIGS = "manage-configs"
const FN_VIEW_RULES = "view-rules"
const FN_MANAGE_RULES = "manage-rules"

// --- Types ---
export interface AppConfig {
  id: string
  appId: string
  appName: string
  configGroupName?: string | null
  isGlobal: boolean
  platform?: string
  iconUrl?: string
  minRecommendations: number
  maxRecommendations: number
  minMatchRate: number
  minSoW: number
  ruleGroupId?: number | null
  ruleGroupName?: string | null
  updatedAt: string
}

export interface AppConfigGroup {
  appId: string
  appName: string
  isGlobal: boolean
  configs: AppConfig[]
}

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

// --- Mock Data (tạm thời, sau này sẽ thay bằng API) ---
const mockConfigs: AppConfig[] = [
  {
    id: "c1",
    appId: "global",
    appName: "Global",
    isGlobal: true,
    minRecommendations: 5,
    maxRecommendations: 20,
    minMatchRate: 3.0,
    minSoW: 0.9,
    updatedAt: "2026-02-25T10:00:00Z",
  },
]

const mockRules: WaterfallRule[] = [
  {
    id: "r1",
    name: "Remove Low SoW",
    displayOrder: 1,
    active: true,
    priority: "high",
    sowMin: null,
    sowMax: 1.0,
    matchRateMin: null,
    matchRateMax: 3.0,
    onlyOneInstance: null,
    isHighestFloor: null,
    actionType: "REMOVE",
    multiplier: null,
    useMidpoint: false,
    reasonTemplate: "SoW {sow}% is below threshold",
    groupId: null,
    groupName: null,
    updatedAt: "2026-02-25T08:00:00Z",
  },
]

export function WaterfallRulesContent() {
  const canViewConfigs = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_VIEW_CONFIGS)
  const canManageConfigs = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_MANAGE_CONFIGS)
  const canViewRules = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_VIEW_RULES)
  const canManageRules = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_MANAGE_RULES)

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"configs" | "rules">(canViewConfigs ? "configs" : "rules")

  if (!canViewConfigs && !canViewRules) {
    return <NoPermissionView />
  }

  // Fetch configs from API
  const { data: configsData, loading: configsLoading, refetch: refetchConfigs } = useApi(
    () => waterfallRecommendationSettingsApi.getAllConfigs(),
    { enabled: true, cacheKey: 'waterfall_recommendation_configs' }
  )
  const [appRuleGroupMap, setAppRuleGroupMap] = useState<Record<string, { groupId: number | null; groupName: string | null }>>({})

  // Fetch apps for app selection
  const { data: appsResponse } = useApi(
    () => structureApi.getApps(),
    { enabled: true, cacheKey: 'apps_list_for_waterfall_configs' }
  )

  useEffect(() => {
    const loadAppRuleGroupMappings = async () => {
      const appIds = Array.from(
        new Set(
          (configsData ?? [])
            .map((dto) => dto.appId)
            .filter((appId): appId is string => !!appId)
        )
      )

      if (appIds.length === 0) {
        setAppRuleGroupMap({})
        return
      }

      const results = await Promise.allSettled(
        appIds.map(async (appId) => {
          const mapping = await waterfallRecommendationSettingsApi.getAppRuleGroupMapping(appId)
          return { appId, mapping }
        })
      )

      const nextMap: Record<string, { groupId: number | null; groupName: string | null }> = {}
      for (const result of results) {
        if (result.status === "fulfilled") {
          nextMap[result.value.appId] = {
            groupId: result.value.mapping.groupId,
            groupName: result.value.mapping.groupName,
          }
        }
      }
      setAppRuleGroupMap(nextMap)
    }

    void loadAppRuleGroupMappings()
  }, [configsData])

  // Map backend DTOs to frontend AppConfig type
  const configs = useMemo<AppConfig[]>(() => {
    if (!configsData) return []
    const apps = appsResponse?.apps || []
    return configsData.map((dto) => {
      const isGlobal = !dto.appId
      const app = apps.find((a) => a.appId === dto.appId)
      return {
        id: dto.id.toString(),
        appId: dto.appId || "global",
        appName: isGlobal ? "Global" : (app?.displayName || app?.name || dto.appId || "Unknown"),
        configGroupName: dto.configGroupName ?? null,
        isGlobal,
        platform: app?.platform,
        iconUrl: app?.iconUri,
        minRecommendations: dto.minRecommendations,
        maxRecommendations: dto.maxRecommendations,
        minMatchRate: Number(dto.minMatchRatePercent),
        minSoW: Number(dto.minSowPercent),
        ruleGroupId: dto.appId ? (appRuleGroupMap[dto.appId]?.groupId ?? null) : null,
        ruleGroupName: dto.appId ? (appRuleGroupMap[dto.appId]?.groupName ?? null) : null,
        updatedAt: dto.updatedAt,
      }
    })
  }, [configsData, appsResponse, appRuleGroupMap])

  // Config state
  const [configSearch, setConfigSearch] = useState("")
  const [configTypeFilter, setConfigTypeFilter] = useState("all")
  const [editConfig, setEditConfig] = useState<AppConfig | null>(null)
  const [createConfigOpen, setCreateConfigOpen] = useState(false)
  const [createConfigPreset, setCreateConfigPreset] = useState<AddAppToGroupPreset | null>(null)
  const [createConfigMode, setCreateConfigMode] = useState<"default" | "add-to-group" | "edit-group">("default")
  const [editConfigGroupItems, setEditConfigGroupItems] = useState<AppConfig[] | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  // Fetch rules from API
  const { data: rulesData, loading: rulesLoading, refetch: refetchRules } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRules(),
    { enabled: true, cacheKey: 'waterfall_recommendation_rules' }
  )

  // Map backend DTOs to frontend WaterfallRule type
  const rules = useMemo<WaterfallRule[]>(() => {
    if (!rulesData) return []
    return rulesData.map((dto) => {
      // Map conditionIsHighestFloor: boolean? -> "yes" | "no" | "any" | null
      let isHighestFloor: "yes" | "no" | "any" | null = null
      if (dto.conditionIsHighestFloor === true) {
        isHighestFloor = "yes"
      } else if (dto.conditionIsHighestFloor === false) {
        isHighestFloor = "no"
      }

      return {
        id: dto.id.toString(),
        name: dto.name,
        displayOrder: dto.displayOrder,
        active: dto.isActive,
        priority: dto.priority as "high" | "medium" | "low",
        sowMin: dto.conditionSowMin ? Number(dto.conditionSowMin) : null,
        sowMax: dto.conditionSowMax ? Number(dto.conditionSowMax) : null,
        matchRateMin: dto.conditionMatchRateMin ? Number(dto.conditionMatchRateMin) : null,
        matchRateMax: dto.conditionMatchRateMax ? Number(dto.conditionMatchRateMax) : null,
        onlyOneInstance: dto.conditionOnlyOneInstance ?? null,
        isHighestFloor,
        actionType: dto.action,
        multiplier: dto.actionMultiplier ? Number(dto.actionMultiplier) : null,
        useMidpoint: dto.actionUseMidpoint,
        reasonTemplate: dto.reasonTemplate || "",
        groupId: dto.groupId ?? null,
        groupName: dto.groupName ?? null,
        updatedAt: dto.updatedAt,
      }
    })
  }, [rulesData])

  // Fetch rule groups
  const { data: ruleGroupsData, loading: ruleGroupsLoading, refetch: refetchRuleGroups } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRuleGroups(),
    { enabled: true, cacheKey: 'waterfall_recommendation_rule_groups' }
  )

  const ruleGroups = useMemo<RuleGroup[]>(() => {
    if (!ruleGroupsData) return []
    return ruleGroupsData.map((dto) => ({
      id: dto.id,
      name: dto.name,
      description: dto.description ?? null,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
      isDefault: dto.isDefault,
      color: dto.color ?? null,
      ruleCount: dto.ruleCount,
      appCount: dto.appCount,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    }))
  }, [ruleGroupsData])

  // Rule state
  const [ruleSearch, setRuleSearch] = useState("")
  const [ruleStatusFilter, setRuleStatusFilter] = useState("all")
  const [rulePriorityFilter, setRulePriorityFilter] = useState("all")
  const [ruleActionFilter, setRuleActionFilter] = useState("all")
  const [editRule, setEditRule] = useState<WaterfallRule | null>(null)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [savingRule, setSavingRule] = useState(false)
  const [createRuleGroupId, setCreateRuleGroupId] = useState<number | null | undefined>(undefined)

  // Group state
  const [editGroup, setEditGroup] = useState<RuleGroup | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)

  // Group configs by app
  const appConfigGroups = useMemo<AppConfigGroup[]>(() => {
    const map = new Map<string, AppConfigGroup>()
    for (const c of configs) {
      const key = c.appId
      if (!map.has(key)) {
        map.set(key, {
          appId: c.appId,
          appName: c.appName,
          isGlobal: c.isGlobal,
          configs: [],
        })
      }
      map.get(key)!.configs.push(c)
    }
    return Array.from(map.values())
  }, [configs])

  // Danh sách appId đã có config (app-specific). Dùng để chặn tạo thêm config cho cùng app.
  const appsWithConfig = useMemo(() => {
    return configs.filter((c) => !c.isGlobal).map((c) => c.appId)
  }, [configs])

  // Config stats
  const totalApps = appConfigGroups.length
  const totalConfigs = configs.length
  const appSpecificApps = appConfigGroups.filter((g) => !g.isGlobal).length
  const globalConfigExists = appConfigGroups.some((g) => g.isGlobal)

  // Rule stats
  const totalRules = rules.length
  const activeRulesCount = rules.filter((r) => r.active).length
  const inactiveRulesCount = rules.filter((r) => !r.active).length

  // Group stats
  const totalGroups = ruleGroups.length
  const activeGroupsCount = ruleGroups.filter((g) => g.isActive).length
  const inactiveGroupsCount = ruleGroups.filter((g) => !g.isActive).length

  // Config filters (filter the grouped data)
  const filteredGroups = useMemo(() => {
    return appConfigGroups.filter((g) => {
      if (configSearch) {
        const q = configSearch.toLowerCase()
        if (
          !g.appName.toLowerCase().includes(q) &&
          !(g.isGlobal && "global".includes(q))
        )
          return false
      }
      if (configTypeFilter === "app-specific" && g.isGlobal) return false
      if (configTypeFilter === "global" && !g.isGlobal) return false
      return true
    })
  }, [appConfigGroups, configSearch, configTypeFilter])

  // Rule filters
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (ruleSearch) {
        const q = ruleSearch.toLowerCase()
        if (!r.name.toLowerCase().includes(q)) return false
      }
      if (ruleStatusFilter === "active" && !r.active) return false
      if (ruleStatusFilter === "inactive" && r.active) return false
      if (rulePriorityFilter !== "all" && r.priority !== rulePriorityFilter)
        return false
      if (ruleActionFilter !== "all" && r.actionType !== ruleActionFilter)
        return false
      return true
    })
  }, [rules, ruleSearch, ruleStatusFilter, rulePriorityFilter, ruleActionFilter])

  // Config CRUD
  const handleSaveConfig = useCallback(
    async (targets: Array<Omit<AppConfig, "id" | "updatedAt">>) => {
      setSavingConfig(true)
      try {
        if (createConfigMode === "edit-group" && editConfigGroupItems && editConfigGroupItems.length > 0) {
          const data = targets[0]
          for (const item of editConfigGroupItems) {
            const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
              appId: item.isGlobal ? null : (item.appId === "global" ? null : item.appId),
              configGroupName: data.configGroupName ?? item.configGroupName ?? null,
              minRecommendations: data.minRecommendations,
              maxRecommendations: data.maxRecommendations,
              minMatchRatePercent: data.minMatchRate,
              minSowPercent: data.minSoW,
            }
            await waterfallRecommendationSettingsApi.updateConfig(Number(item.id), payload)
            if (!item.isGlobal) {
              await waterfallRecommendationSettingsApi.updateAppRuleGroupMapping(
                item.appId,
                data.ruleGroupId ?? null,
                "app"
              )
            }
          }
          toast({
            title: "Success",
            description: `Updated ${editConfigGroupItems.length} configurations in this group`,
          })
          setCreateConfigOpen(false)
          setCreateConfigPreset(null)
          setCreateConfigMode("default")
          setEditConfigGroupItems(null)
        } else if (editConfig) {
          const data = targets[0]
          const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
            appId: data.isGlobal ? null : (data.appId === "global" ? null : data.appId),
            configGroupName: data.configGroupName ?? editConfig.configGroupName ?? null,
            minRecommendations: data.minRecommendations,
            maxRecommendations: data.maxRecommendations,
            minMatchRatePercent: data.minMatchRate,
            minSowPercent: data.minSoW,
          }
          // Update existing config
          await waterfallRecommendationSettingsApi.updateConfig(Number(editConfig.id), payload)
          if (!data.isGlobal) {
            await waterfallRecommendationSettingsApi.updateAppRuleGroupMapping(
              data.appId,
              data.ruleGroupId ?? null,
              "app"
            )
          }
          toast({
            title: "Success",
            description: "Configuration updated successfully",
          })
          setEditConfig(null)
        } else {
          // Create new config(s) for one or more apps / global
          for (const data of targets) {
            const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
              appId: data.isGlobal ? null : (data.appId === "global" ? null : data.appId),
              configGroupName: data.configGroupName ?? null,
              minRecommendations: data.minRecommendations,
              maxRecommendations: data.maxRecommendations,
              minMatchRatePercent: data.minMatchRate,
              minSowPercent: data.minSoW,
            }
            await waterfallRecommendationSettingsApi.createConfig(payload)
            if (!data.isGlobal) {
              await waterfallRecommendationSettingsApi.updateAppRuleGroupMapping(
                data.appId,
                data.ruleGroupId ?? null,
                "app"
              )
            }
          }
          toast({
            title: "Success",
            description: targets.length > 1
              ? `Created ${targets.length} configurations successfully`
              : "Configuration created successfully",
          })
          setCreateConfigOpen(false)
          setCreateConfigPreset(null)
          setCreateConfigMode("default")
          setEditConfigGroupItems(null)
        }
        // Refetch configs from API
        await refetchConfigs()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to save configuration",
          variant: "destructive",
        })
      } finally {
        setSavingConfig(false)
      }
    },
    [createConfigMode, editConfigGroupItems, editConfig, toast, refetchConfigs]
  )

  const handleDeleteConfig = useCallback(async (id: string) => {
    try {
      await waterfallRecommendationSettingsApi.deleteConfig(Number(id))
      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      })
      await refetchConfigs()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete configuration",
        variant: "destructive",
      })
    }
  }, [toast, refetchConfigs])

  const handleDeleteApp = useCallback(async (appId: string) => {
    try {
      // Delete all configs for this app
      const configsToDelete = configs.filter((c) => c.appId === appId)
      await Promise.all(configsToDelete.map((c) => waterfallRecommendationSettingsApi.deleteConfig(Number(c.id))))
      toast({
        title: "Success",
        description: `Deleted ${configsToDelete.length} configuration(s) for ${appId === "global" ? "Global" : appId}`,
      })
      await refetchConfigs()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete configurations",
        variant: "destructive",
      })
    }
  }, [configs, toast, refetchConfigs])

  const handleMoveAppToGroup = useCallback(async (config: AppConfig, preset: AddAppToGroupPreset) => {
    try {
      const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
        appId: config.isGlobal ? null : (config.appId === "global" ? null : config.appId),
        configGroupName: preset.configGroupName ?? config.configGroupName ?? null,
        minRecommendations: preset.minRecommendations,
        maxRecommendations: preset.maxRecommendations,
        minMatchRatePercent: preset.minMatchRate,
        minSowPercent: preset.minSoW,
      }
      await waterfallRecommendationSettingsApi.updateConfig(Number(config.id), payload)
      if (!config.isGlobal) {
        await waterfallRecommendationSettingsApi.updateAppRuleGroupMapping(
          config.appId,
          preset.ruleGroupId ?? null,
          "app"
        )
      }
      toast({
        title: "Success",
        description: `${config.appName} moved to selected config group`,
      })
      await refetchConfigs()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to move app to selected config group",
        variant: "destructive",
      })
    }
  }, [toast, refetchConfigs])

  const handleRenameConfigGroup = useCallback(async (configsInGroup: AppConfig[], groupName: string | null) => {
    if (configsInGroup.length === 0) return
    try {
      await Promise.all(
        configsInGroup.map((config) => {
          const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
            appId: config.isGlobal ? null : (config.appId === "global" ? null : config.appId),
            configGroupName: groupName,
            minRecommendations: config.minRecommendations,
            maxRecommendations: config.maxRecommendations,
            minMatchRatePercent: config.minMatchRate,
            minSowPercent: config.minSoW,
          }
          return waterfallRecommendationSettingsApi.updateConfig(Number(config.id), payload)
        })
      )
      toast({
        title: "Success",
        description: "Config Group name updated",
      })
      await refetchConfigs()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update Config Group name",
        variant: "destructive",
      })
    }
  }, [toast, refetchConfigs])

  // Rule CRUD
  const handleSaveRule = useCallback(
    async (data: Omit<WaterfallRule, "id" | "updatedAt">) => {
      setSavingRule(true)
      try {
        // Map frontend type to backend DTO
        // Map isHighestFloor: "yes" | "no" | "any" | null -> boolean?
        let conditionIsHighestFloor: boolean | null = null
        if (data.isHighestFloor === "yes") {
          conditionIsHighestFloor = true
        } else if (data.isHighestFloor === "no") {
          conditionIsHighestFloor = false
        }

        const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
          displayOrder: data.displayOrder,
          name: data.name,
          isActive: data.active,
          conditionSowMin: data.sowMin,
          conditionSowMax: data.sowMax,
          conditionMatchRateMin: data.matchRateMin,
          conditionMatchRateMax: data.matchRateMax,
          conditionOnlyOneInstance: data.onlyOneInstance,
          conditionIsHighestFloor,
          action: data.actionType,
          actionMultiplier: data.multiplier,
          actionUseMidpoint: data.useMidpoint,
          reasonTemplate: data.reasonTemplate || null,
          priority: data.priority,
          groupId: data.groupId,
        }

        if (editRule) {
          // Update existing rule
          await waterfallRecommendationSettingsApi.updateRule(Number(editRule.id), payload)
          toast({
            title: "Success",
            description: "Rule updated successfully",
          })
          setEditRule(null)
        } else {
          // Create new rule
          await waterfallRecommendationSettingsApi.createRule(payload)
          toast({
            title: "Success",
            description: "Rule created successfully",
          })
          setCreateRuleOpen(false)
        }
        // Refetch rules from API
        await refetchRules()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to save rule",
          variant: "destructive",
        })
      } finally {
        setSavingRule(false)
      }
    },
    [editRule, toast, refetchRules]
  )

  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      await waterfallRecommendationSettingsApi.deleteRule(Number(id))
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      })
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete rule",
        variant: "destructive",
      })
    }
  }, [toast, refetchRules])

  const handleDuplicateRule = useCallback(
    async (id: string) => {
      const rule = rules.find((r) => r.id === id)
      if (!rule) return

      setSavingRule(true)
      try {
        // Map isHighestFloor
        let conditionIsHighestFloor: boolean | null = null
        if (rule.isHighestFloor === "yes") {
          conditionIsHighestFloor = true
        } else if (rule.isHighestFloor === "no") {
          conditionIsHighestFloor = false
        }

        const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
          displayOrder: Math.max(...rules.map((r) => r.displayOrder), 0) + 1,
          name: `${rule.name} (Copy)`,
          isActive: rule.active,
          conditionSowMin: rule.sowMin,
          conditionSowMax: rule.sowMax,
          conditionMatchRateMin: rule.matchRateMin,
          conditionMatchRateMax: rule.matchRateMax,
          conditionOnlyOneInstance: rule.onlyOneInstance,
          conditionIsHighestFloor,
          action: rule.actionType,
          actionMultiplier: rule.multiplier,
          actionUseMidpoint: rule.useMidpoint,
          reasonTemplate: rule.reasonTemplate || null,
          priority: rule.priority,
        }
        await waterfallRecommendationSettingsApi.createRule(payload)
        toast({
          title: "Success",
          description: "Rule duplicated successfully",
        })
        await refetchRules()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to duplicate rule",
          variant: "destructive",
        })
      } finally {
        setSavingRule(false)
      }
    },
    [rules, toast, refetchRules]
  )

  const handleToggleRule = useCallback(async (id: string) => {
    const rule = rules.find((r) => r.id === id)
    if (!rule) return

    try {
      // Map isHighestFloor
      let conditionIsHighestFloor: boolean | null = null
      if (rule.isHighestFloor === "yes") {
        conditionIsHighestFloor = true
      } else if (rule.isHighestFloor === "no") {
        conditionIsHighestFloor = false
      }

      const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
        displayOrder: rule.displayOrder,
        name: rule.name,
        isActive: !rule.active, // Toggle
        conditionSowMin: rule.sowMin,
        conditionSowMax: rule.sowMax,
        conditionMatchRateMin: rule.matchRateMin,
        conditionMatchRateMax: rule.matchRateMax,
        conditionOnlyOneInstance: rule.onlyOneInstance,
        conditionIsHighestFloor,
        action: rule.actionType,
        actionMultiplier: rule.multiplier,
        actionUseMidpoint: rule.useMidpoint,
        reasonTemplate: rule.reasonTemplate || null,
        priority: rule.priority,
      }
      await waterfallRecommendationSettingsApi.updateRule(Number(id), payload)
      toast({
        title: "Success",
        description: `Rule ${!rule.active ? "enabled" : "disabled"} successfully`,
      })
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to toggle rule",
        variant: "destructive",
      })
    }
  }, [rules, toast, refetchRules])

  // Group CRUD
  const handleSaveGroup = useCallback(
    async (data: {
      name: string
      description: string | null
      displayOrder: number
      isActive: boolean
      color: string | null
    }) => {
      setSavingGroup(true)
      try {
        const payload = {
          name: data.name,
          description: data.description,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
          color: data.color,
        }

        if (editGroup) {
          await waterfallRecommendationSettingsApi.updateRuleGroup(editGroup.id, payload)
          toast({
            title: "Success",
            description: "Group updated successfully",
          })
          setEditGroup(null)
        } else {
          await waterfallRecommendationSettingsApi.createRuleGroup(payload)
          toast({
            title: "Success",
            description: "Group created successfully",
          })
          setCreateGroupOpen(false)
        }
        await refetchRuleGroups()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to save group",
          variant: "destructive",
        })
      } finally {
        setSavingGroup(false)
      }
    },
    [editGroup, toast, refetchRuleGroups]
  )

  const handleDeleteGroup = useCallback(async (id: number) => {
    try {
      await waterfallRecommendationSettingsApi.deleteRuleGroup(id)
      toast({
        title: "Success",
        description: "Group deleted successfully",
      })
      await refetchRuleGroups()
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete group",
        variant: "destructive",
      })
    }
  }, [toast, refetchRuleGroups, refetchRules])

  const handleCreateRuleInGroup = useCallback((groupId?: number | null) => {
    setCreateRuleGroupId(groupId)
    setCreateRuleOpen(true)
  }, [])

  const handleMoveRule = useCallback(
    async (id: string, direction: "up" | "down") => {
      const sorted = [...rules].sort(
        (a, b) => a.displayOrder - b.displayOrder
      )
      const index = sorted.findIndex((r) => r.id === id)
      if (index === -1) return
      if (direction === "up" && index === 0) return
      if (direction === "down" && index === sorted.length - 1) return

      const swapIndex = direction === "up" ? index - 1 : index + 1
      const rule1 = sorted[index]
      const rule2 = sorted[swapIndex]
      const tempOrder = rule1.displayOrder
      rule1.displayOrder = rule2.displayOrder
      rule2.displayOrder = tempOrder

      // Update both rules via API
      try {
        const updatePromises = [rule1, rule2].map(async (rule) => {
          let conditionIsHighestFloor: boolean | null = null
          if (rule.isHighestFloor === "yes") {
            conditionIsHighestFloor = true
          } else if (rule.isHighestFloor === "no") {
            conditionIsHighestFloor = false
          }

          const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
            displayOrder: rule.displayOrder,
            name: rule.name,
            isActive: rule.active,
            conditionSowMin: rule.sowMin,
            conditionSowMax: rule.sowMax,
            conditionMatchRateMin: rule.matchRateMin,
            conditionMatchRateMax: rule.matchRateMax,
            conditionOnlyOneInstance: rule.onlyOneInstance,
            conditionIsHighestFloor,
            action: rule.actionType,
            actionMultiplier: rule.multiplier,
            actionUseMidpoint: rule.useMidpoint,
            reasonTemplate: rule.reasonTemplate || null,
            priority: rule.priority,
          }
          return waterfallRecommendationSettingsApi.updateRule(Number(rule.id), payload)
        })

        await Promise.all(updatePromises)
        toast({
          title: "Success",
          description: "Rule order updated successfully",
        })
        await refetchRules()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to move rule",
          variant: "destructive",
        })
      }
    },
    [rules, toast, refetchRules]
  )

  const handleBulkEnableRules = useCallback(async (ids: string[]) => {
    try {
      const updatePromises = ids.map(async (id) => {
        const rule = rules.find((r) => r.id === id)
        if (!rule || rule.active) return

        let conditionIsHighestFloor: boolean | null = null
        if (rule.isHighestFloor === "yes") {
          conditionIsHighestFloor = true
        } else if (rule.isHighestFloor === "no") {
          conditionIsHighestFloor = false
        }

        const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
          displayOrder: rule.displayOrder,
          name: rule.name,
          isActive: true,
          conditionSowMin: rule.sowMin,
          conditionSowMax: rule.sowMax,
          conditionMatchRateMin: rule.matchRateMin,
          conditionMatchRateMax: rule.matchRateMax,
          conditionOnlyOneInstance: rule.onlyOneInstance,
          conditionIsHighestFloor,
          action: rule.actionType,
          actionMultiplier: rule.multiplier,
          actionUseMidpoint: rule.useMidpoint,
          reasonTemplate: rule.reasonTemplate || null,
          priority: rule.priority,
        }
        return waterfallRecommendationSettingsApi.updateRule(Number(id), payload)
      })

      await Promise.all(updatePromises)
      toast({
        title: "Success",
        description: `${ids.length} rule(s) enabled successfully`,
      })
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to enable rules",
        variant: "destructive",
      })
    }
  }, [rules, toast, refetchRules])

  const handleBulkDisableRules = useCallback(async (ids: string[]) => {
    try {
      const updatePromises = ids.map(async (id) => {
        const rule = rules.find((r) => r.id === id)
        if (!rule || !rule.active) return

        let conditionIsHighestFloor: boolean | null = null
        if (rule.isHighestFloor === "yes") {
          conditionIsHighestFloor = true
        } else if (rule.isHighestFloor === "no") {
          conditionIsHighestFloor = false
        }

        const payload: Omit<WaterfallRecommendationRuleDto, 'id' | 'createdAt' | 'updatedAt'> = {
          displayOrder: rule.displayOrder,
          name: rule.name,
          isActive: false,
          conditionSowMin: rule.sowMin,
          conditionSowMax: rule.sowMax,
          conditionMatchRateMin: rule.matchRateMin,
          conditionMatchRateMax: rule.matchRateMax,
          conditionOnlyOneInstance: rule.onlyOneInstance,
          conditionIsHighestFloor,
          action: rule.actionType,
          actionMultiplier: rule.multiplier,
          actionUseMidpoint: rule.useMidpoint,
          reasonTemplate: rule.reasonTemplate || null,
          priority: rule.priority,
        }
        return waterfallRecommendationSettingsApi.updateRule(Number(id), payload)
      })

      await Promise.all(updatePromises)
      toast({
        title: "Success",
        description: `${ids.length} rule(s) disabled successfully`,
      })
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to disable rules",
        variant: "destructive",
      })
    }
  }, [rules, toast, refetchRules])

  const handleBulkDeleteRules = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => waterfallRecommendationSettingsApi.deleteRule(Number(id))))
      toast({
        title: "Success",
        description: `${ids.length} rule(s) deleted successfully`,
      })
      await refetchRules()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete rules",
        variant: "destructive",
      })
    }
  }, [toast, refetchRules])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl text-balance">
            Waterfall Rules
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage recommendation configurations and rules for waterfall
            optimization
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "configs" && canManageConfigs && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setCreateConfigPreset(null)
                setCreateConfigMode("default")
                setCreateConfigOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Config
            </Button>
          )}
          {activeTab === "rules" && canManageRules && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setCreateGroupOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          )}
          <Button 
            variant="ghost" 
            className="text-slate-600"
            onClick={() => {
              if (activeTab === "configs") {
                refetchConfigs()
                toast({
                  title: "Refreshed",
                  description: "Configurations refreshed",
                })
              } else {
                refetchRules()
                toast({
                  title: "Refreshed",
                  description: "Rules refreshed",
                })
              }
            }}
            disabled={activeTab === "configs" ? configsLoading : rulesLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(activeTab === "configs" ? configsLoading : rulesLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {canViewConfigs && (
            <button
              type="button"
              onClick={() => setActiveTab("configs")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "configs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              App Configs
              <Badge
                variant="secondary"
                className={`text-xs px-1.5 py-0 ${
                  activeTab === "configs"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalApps}
              </Badge>
            </button>
          )}
          {canViewRules && (
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "rules"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Rules
              <Badge
                variant="secondary"
                className={`text-xs px-1.5 py-0 ${
                  activeTab === "rules"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {activeRulesCount}/{totalRules}
              </Badge>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "configs" ? (
        <div className="space-y-6">
          {/* Config Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Apps
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {totalApps}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <Smartphone className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      Total Configs
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {totalConfigs}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      App-Specific
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {appSpecificApps}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <Smartphone className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Global Config
                    </p>
                    <p className="text-2xl font-bold text-slate-600 mt-1">
                      {globalConfigExists ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <Globe className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Config Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search apps..."
                  className="pl-9"
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                />
              </div>
              <Select
                value={configTypeFilter}
                onValueChange={setConfigTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="app-specific">App-Specific</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Configs Table */}
          <ConfigsTable
            groups={filteredGroups}
            onEditConfig={setEditConfig}
            onEditConfigGroup={(configs, preset) => {
              if (configs.length === 0) return
              setEditConfigGroupItems(configs)
              setCreateConfigPreset(preset)
              setCreateConfigMode("edit-group")
              setCreateConfigOpen(true)
              setEditConfig(null)
            }}
            onRenameConfigGroup={handleRenameConfigGroup}
            onDeleteConfig={handleDeleteConfig}
            onDeleteApp={handleDeleteApp}
            onMoveAppToGroup={handleMoveAppToGroup}
            onAddAppToGroup={(preset) => {
              setCreateConfigPreset(preset)
              setCreateConfigMode("add-to-group")
              setEditConfigGroupItems(null)
              setCreateConfigOpen(true)
              setEditConfig(null)
            }}
            hasFilters={configSearch !== "" || configTypeFilter !== "all"}
            onClearFilters={() => {
              setConfigSearch("")
              setConfigTypeFilter("all")
            }}
            onCreateNew={() => {
              setCreateConfigPreset(null)
              setCreateConfigMode("default")
              setEditConfigGroupItems(null)
              setCreateConfigOpen(true)
            }}
            canManage={canManageConfigs}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rule Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Groups
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {totalGroups}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {totalRules} rules
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <ListChecks className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Active Groups</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {activeGroupsCount}
                    </p>
                    <p className="text-xs text-green-500 mt-0.5">
                      {activeRulesCount} active rules
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Inactive Groups
                    </p>
                    <p className="text-2xl font-bold text-slate-600 mt-1">
                      {inactiveGroupsCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inactiveRulesCount} inactive rules
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <XCircle className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rule Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search rules..."
                  className="pl-9"
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                />
              </div>
              <Select
                value={ruleStatusFilter}
                onValueChange={setRuleStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={rulePriorityFilter}
                onValueChange={setRulePriorityFilter}
              >
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={ruleActionFilter}
                onValueChange={setRuleActionFilter}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="REMOVE">REMOVE</SelectItem>
                  <SelectItem value="KEEP">KEEP</SelectItem>
                  <SelectItem value="TEST REDUCE">TEST REDUCE</SelectItem>
                  <SelectItem value="INCREASE 10%">INCREASE 10%</SelectItem>
                  <SelectItem value="INCREASE 20%">INCREASE 20%</SelectItem>
                  <SelectItem value="ADD LAYER">ADD LAYER</SelectItem>
                  <SelectItem value="ADD HIGHER">ADD HIGHER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Rules Grouped View */}
          <RulesGroupedView
            rules={filteredRules}
            ruleGroups={ruleGroups}
            onEdit={setEditRule}
            onDelete={handleDeleteRule}
            onDuplicate={handleDuplicateRule}
            onToggle={handleToggleRule}
            hasFilters={
              ruleSearch !== "" ||
              ruleStatusFilter !== "all" ||
              rulePriorityFilter !== "all" ||
              ruleActionFilter !== "all"
            }
            onClearFilters={() => {
              setRuleSearch("")
              setRuleStatusFilter("all")
              setRulePriorityFilter("all")
              setRuleActionFilter("all")
            }}
            onCreateNew={handleCreateRuleInGroup}
            onCreateGroup={() => setCreateGroupOpen(true)}
            onEditGroup={setEditGroup}
            onDeleteGroup={handleDeleteGroup}
            canManage={canManageRules}
          />
        </div>
      )}

      {/* Create/Edit Config Dialog */}
      <CreateEditConfigDialog
        open={createConfigOpen || !!editConfig}
        onOpenChange={(open) => {
          if (!open) {
            setCreateConfigOpen(false)
            setEditConfig(null)
            setCreateConfigPreset(null)
            setCreateConfigMode("default")
            setEditConfigGroupItems(null)
          }
        }}
        config={editConfig}
        initialValues={createConfigPreset}
        mode={createConfigMode}
        groupEditConfigs={editConfigGroupItems ?? []}
        onSave={handleSaveConfig}
        saving={savingConfig}
        apps={appsResponse?.apps || []}
        appsWithConfig={appsWithConfig}
      />

      {/* Create/Edit Rule Dialog */}
      <CreateEditRuleDialog
        open={createRuleOpen || !!editRule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateRuleOpen(false)
            setEditRule(null)
            setCreateRuleGroupId(undefined)
          }
        }}
        rule={editRule}
        ruleGroups={ruleGroups}
        onSave={handleSaveRule}
        saving={savingRule}
        defaultGroupId={createRuleGroupId}
      />

      {/* Create/Edit Group Dialog */}
      <CreateEditGroupDialog
        open={createGroupOpen || !!editGroup}
        onOpenChange={(open) => {
          if (!open) {
            setCreateGroupOpen(false)
            setEditGroup(null)
          }
        }}
        group={editGroup}
        onSave={handleSaveGroup}
        saving={savingGroup}
        nextDisplayOrder={Math.max(...ruleGroups.map(g => g.displayOrder), 0) + 1}
      />
    </div>
  )
}


