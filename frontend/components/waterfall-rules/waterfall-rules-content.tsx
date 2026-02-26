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
import { RulesTable } from "./rules-table"
import { CreateEditConfigDialog } from "./create-edit-config-dialog"
import { CreateEditRuleDialog } from "./create-edit-rule-dialog"
import { useApi } from "@/hooks/use-api"
import { waterfallRecommendationSettingsApi, structureApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { WaterfallRecommendationConfigDto } from "@/types/api"

// --- Types ---
export interface AppConfig {
  id: string
  appId: string
  appName: string
  isGlobal: boolean
  minRecommendations: number
  maxRecommendations: number
  minMatchRate: number
  minSoW: number
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
    updatedAt: "2026-02-25T08:00:00Z",
  },
]

export function WaterfallRulesContent() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"configs" | "rules">("configs")

  // Fetch configs from API
  const { data: configsData, loading: configsLoading, refetch: refetchConfigs } = useApi(
    () => waterfallRecommendationSettingsApi.getAllConfigs(),
    { enabled: true, cacheKey: 'waterfall_recommendation_configs' }
  )

  // Fetch apps for app selection
  const { data: appsResponse } = useApi(
    () => structureApi.getApps(),
    { enabled: true, cacheKey: 'apps_list_for_waterfall_configs' }
  )

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
        isGlobal,
        minRecommendations: dto.minRecommendations,
        maxRecommendations: dto.maxRecommendations,
        minMatchRate: Number(dto.minMatchRatePercent),
        minSoW: Number(dto.minSowPercent),
        updatedAt: dto.updatedAt,
      }
    })
  }, [configsData, appsResponse])

  // Config state
  const [configSearch, setConfigSearch] = useState("")
  const [configTypeFilter, setConfigTypeFilter] = useState("all")
  const [editConfig, setEditConfig] = useState<AppConfig | null>(null)
  const [createConfigOpen, setCreateConfigOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  // Rule state
  const [rules, setRules] = useState<WaterfallRule[]>(mockRules)
  const [ruleSearch, setRuleSearch] = useState("")
  const [ruleStatusFilter, setRuleStatusFilter] = useState("all")
  const [rulePriorityFilter, setRulePriorityFilter] = useState("all")
  const [ruleActionFilter, setRuleActionFilter] = useState("all")
  const [editRule, setEditRule] = useState<WaterfallRule | null>(null)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)

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

  // Config stats
  const totalApps = appConfigGroups.length
  const totalConfigs = configs.length
  const appSpecificApps = appConfigGroups.filter((g) => !g.isGlobal).length
  const globalConfigExists = appConfigGroups.some((g) => g.isGlobal)

  // Rule stats
  const totalRules = rules.length
  const activeRulesCount = rules.filter((r) => r.active).length
  const inactiveRulesCount = rules.filter((r) => !r.active).length

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
    async (data: Omit<AppConfig, "id" | "updatedAt">) => {
      setSavingConfig(true)
      try {
        const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
          appId: data.isGlobal ? null : (data.appId === "global" ? null : data.appId),
          minRecommendations: data.minRecommendations,
          maxRecommendations: data.maxRecommendations,
          minMatchRatePercent: data.minMatchRate,
          minSowPercent: data.minSoW,
        }

        if (editConfig) {
          // Update existing config
          await waterfallRecommendationSettingsApi.updateConfig(Number(editConfig.id), payload)
          toast({
            title: "Success",
            description: "Configuration updated successfully",
          })
          setEditConfig(null)
        } else {
          // Create new config
          await waterfallRecommendationSettingsApi.createConfig(payload)
          toast({
            title: "Success",
            description: "Configuration created successfully",
          })
          setCreateConfigOpen(false)
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
    [editConfig, toast, refetchConfigs]
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

  const handleDuplicateConfig = useCallback(
    async (id: string) => {
      const config = configs.find((c) => c.id === id)
      if (!config) return

      setSavingConfig(true)
      try {
        const payload: Omit<WaterfallRecommendationConfigDto, 'id' | 'createdAt' | 'updatedAt'> = {
          appId: config.isGlobal ? null : (config.appId === "global" ? null : config.appId),
          minRecommendations: config.minRecommendations,
          maxRecommendations: config.maxRecommendations,
          minMatchRatePercent: config.minMatchRate,
          minSowPercent: config.minSoW,
        }
        await waterfallRecommendationSettingsApi.createConfig(payload)
        toast({
          title: "Success",
          description: "Configuration duplicated successfully",
        })
        await refetchConfigs()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to duplicate configuration",
          variant: "destructive",
        })
      } finally {
        setSavingConfig(false)
      }
    },
    [configs, toast, refetchConfigs]
  )

  // Rule CRUD
  const handleSaveRule = useCallback(
    (data: Omit<WaterfallRule, "id" | "updatedAt">) => {
      if (editRule) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === editRule.id
              ? { ...r, ...data, updatedAt: new Date().toISOString() }
              : r
          )
        )
        setEditRule(null)
      } else {
        setRules((prev) => [
          ...prev,
          {
            ...data,
            id: `r${Date.now()}`,
            updatedAt: new Date().toISOString(),
          },
        ])
        setCreateRuleOpen(false)
      }
    },
    [editRule]
  )

  const handleDeleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleDuplicateRule = useCallback(
    (id: string) => {
      const rule = rules.find((r) => r.id === id)
      if (rule) {
        setRules((prev) => [
          ...prev,
          {
            ...rule,
            id: `r${Date.now()}`,
            name: `${rule.name} (Copy)`,
            displayOrder: Math.max(...prev.map((r) => r.displayOrder)) + 1,
            updatedAt: new Date().toISOString(),
          },
        ])
      }
    },
    [rules]
  )

  const handleToggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    )
  }, [])

  const handleMoveRule = useCallback(
    (id: string, direction: "up" | "down") => {
      const sorted = [...rules].sort(
        (a, b) => a.displayOrder - b.displayOrder
      )
      const index = sorted.findIndex((r) => r.id === id)
      if (index === -1) return
      if (direction === "up" && index === 0) return
      if (direction === "down" && index === sorted.length - 1) return

      const swapIndex = direction === "up" ? index - 1 : index + 1
      const tempOrder = sorted[index].displayOrder
      sorted[index].displayOrder = sorted[swapIndex].displayOrder
      sorted[swapIndex].displayOrder = tempOrder

      setRules(sorted)
    },
    [rules]
  )

  const handleBulkEnableRules = useCallback((ids: string[]) => {
    setRules((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, active: true } : r))
    )
  }, [])

  const handleBulkDisableRules = useCallback((ids: string[]) => {
    setRules((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, active: false } : r))
    )
  }, [])

  const handleBulkDeleteRules = useCallback((ids: string[]) => {
    setRules((prev) => prev.filter((r) => !ids.includes(r.id)))
  }, [])

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
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() =>
              activeTab === "configs"
                ? setCreateConfigOpen(true)
                : setCreateRuleOpen(true)
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === "configs" ? "Create Config" : "Create Rule"}
          </Button>
          <Button 
            variant="ghost" 
            className="text-slate-600"
            onClick={() => {
              refetchConfigs()
              toast({
                title: "Refreshed",
                description: "Configurations refreshed",
              })
            }}
            disabled={configsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${configsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
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
            onDeleteConfig={handleDeleteConfig}
            onDuplicateConfig={handleDuplicateConfig}
            onDeleteApp={handleDeleteApp}
            hasFilters={configSearch !== "" || configTypeFilter !== "all"}
            onClearFilters={() => {
              setConfigSearch("")
              setConfigTypeFilter("all")
            }}
            onCreateNew={() => setCreateConfigOpen(true)}
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
                      Total Rules
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {totalRules}
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
                    <p className="text-sm font-medium text-green-700">Active</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {activeRulesCount}
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
                      Inactive
                    </p>
                    <p className="text-2xl font-bold text-slate-600 mt-1">
                      {inactiveRulesCount}
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

          {/* Rules Table */}
          <RulesTable
            rules={filteredRules}
            allRules={rules}
            onEdit={setEditRule}
            onDelete={handleDeleteRule}
            onDuplicate={handleDuplicateRule}
            onToggle={handleToggleRule}
            onMove={handleMoveRule}
            onBulkEnable={handleBulkEnableRules}
            onBulkDisable={handleBulkDisableRules}
            onBulkDelete={handleBulkDeleteRules}
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
            onCreateNew={() => setCreateRuleOpen(true)}
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
          }
        }}
        config={editConfig}
        onSave={handleSaveConfig}
        saving={savingConfig}
        apps={appsResponse?.apps || []}
      />

      {/* Create/Edit Rule Dialog */}
      <CreateEditRuleDialog
        open={createRuleOpen || !!editRule}
        onOpenChange={(open) => {
          if (!open) {
            setCreateRuleOpen(false)
            setEditRule(null)
          }
        }}
        rule={editRule}
        onSave={handleSaveRule}
      />
    </div>
  )
}


