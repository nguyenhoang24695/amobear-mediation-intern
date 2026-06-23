"use client"

import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Globe, RefreshCw, Search, Settings, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { structureApi, waterfallManagementApi, waterfallRecommendationSettingsApi } from "@/lib/api/services"
import type { App, WaterfallRecommendationConfigDto } from "@/types/api"
import { ConfigsTable } from "./configs-table"
import { CreateEditConfigDialog } from "./create-edit-config-dialog"
import type { ConfigApplyMode, ConfigSaveRequest, WaterfallConfigItem } from "./waterfall-config-types"

interface WaterfallConfigsPanelProps {
  canManageConfigs: boolean
  canManageApplyPolicies: boolean
}

function getAppName(app: App) {
  return app.displayName || app.name || app.appId
}

function getConfigApplyModeLabel(applyMode: ConfigApplyMode) {
  if (applyMode === "semi_auto") return "semi-auto"
  if (applyMode === "auto") return "auto"
  return "current mode"
}

function formatIntervalLabel(intervalDays: number) {
  return `${intervalDays}-day${intervalDays === 1 ? "" : "s"}`
}

export function WaterfallConfigsPanel({
  canManageConfigs,
  canManageApplyPolicies,
}: WaterfallConfigsPanelProps) {
  const { toast } = useToast()
  const [configSearch, setConfigSearch] = useState("")
  const [configScopeFilter, setConfigScopeFilter] = useState("all")
  const [editConfig, setEditConfig] = useState<WaterfallConfigItem | null>(null)
  const [createConfigOpen, setCreateConfigOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  const { data: configsData, loading: configsLoading, refetch: refetchConfigs } = useApi(
    () => waterfallRecommendationSettingsApi.getAllConfigs(),
    { enabled: true, cacheKey: "waterfall_recommendation_configs" }
  )

  const { data: appsResponse } = useApi(
    () => structureApi.getApps(),
    { enabled: true, cacheKey: "apps_list_for_waterfall_configs" }
  )

  const availableApps = appsResponse?.apps || []

  const configs = useMemo<WaterfallConfigItem[]>(() => {
    const appMap = new Map(availableApps.map((app) => [app.appId, app]))
    const mapApps = (appIds: string[]) =>
      appIds
        .map((appId) => {
          const app = appMap.get(appId)
          return {
            appId,
            appName: app ? getAppName(app) : appId,
            iconUrl: app?.iconUri,
            platform: app?.platform,
          }
        })
        .sort((left, right) => left.appName.localeCompare(right.appName))
    const directAssignedAppIds = new Set(
      (configsData ?? [])
        .filter((dto) => !dto.isGlobalDefault)
        .flatMap((dto) => dto.appIds)
    )
    return (configsData ?? []).map((dto) => {
      const assignedApps = mapApps(dto.appIds)
      const displayApps = dto.isGlobalDefault
        ? availableApps
            .filter((app) => !directAssignedAppIds.has(app.appId))
            .map((app) => ({
              appId: app.appId,
              appName: getAppName(app),
              iconUrl: app.iconUri,
              platform: app.platform,
            }))
            .sort((left, right) => left.appName.localeCompare(right.appName))
        : assignedApps
      return {
        id: dto.id,
        configName: dto.configName,
        isGlobalDefault: dto.isGlobalDefault,
        isActive: dto.isActive,
        minRecommendations: dto.minRecommendations,
        maxRecommendations: dto.maxRecommendations,
        minMatchRatePercent: Number(dto.minMatchRatePercent),
        minSowPercent: Number(dto.minSowPercent),
        notes: dto.notes ?? null,
        ruleGroupId: dto.ruleGroupId ?? null,
        ruleGroupName: dto.ruleGroupName ?? null,
        appCount: dto.appCount,
        appIds: dto.appIds,
        assignedApps,
        displayAppCount: displayApps.length,
        displayApps,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
      }
    })
  }, [availableApps, configsData])

  const filteredConfigs = useMemo(() => {
    const query = configSearch.trim().toLowerCase()

    return configs.filter((config) => {
      if (query) {
        const matchesQuery =
          config.configName.toLowerCase().includes(query) ||
          (config.notes ?? "").toLowerCase().includes(query) ||
          (config.ruleGroupName ?? "").toLowerCase().includes(query) ||
          config.displayApps.some((app) => app.appName.toLowerCase().includes(query) || app.appId.toLowerCase().includes(query))

        if (!matchesQuery) {
          return false
        }
      }

      if (configScopeFilter === "global" && !config.isGlobalDefault) return false
      if (configScopeFilter === "draft" && (config.isGlobalDefault || config.appCount > 0)) return false
      if (configScopeFilter === "assigned" && (config.isGlobalDefault || config.appCount === 0)) return false

      return true
    })
  }, [configScopeFilter, configSearch, configs])

  const totalConfigs = configs.length
  const totalAssignedApps = useMemo(() => new Set(configs.flatMap((config) => config.appIds)).size, [configs])
  const draftConfigCount = configs.filter((config) => !config.isGlobalDefault && config.appCount === 0).length
  const globalConfigExists = configs.some((config) => config.isGlobalDefault)

  const closeConfigEditor = useCallback(() => {
    setCreateConfigOpen(false)
    setEditConfig(null)
  }, [])

  const buildBaseSuccessMessage = useCallback(
    (request: ConfigSaveRequest) => {
      const base = editConfig
        ? `Config "${request.config.configName}" updated successfully.`
        : `Config "${request.config.configName}" created successfully.`

      if (request.config.isGlobalDefault) {
        return `${base} Apps without a direct config assignment will use it.`
      }

      if (request.appIds.length === 0) {
        return `${base} No apps are currently assigned.`
      }

      return `${base} Assigned ${request.appIds.length} app${request.appIds.length === 1 ? "" : "s"}.`
    },
    [editConfig]
  )

  const handleSaveConfig = useCallback(
    async (request: ConfigSaveRequest) => {
      setSavingConfig(true)
      const uniqueAppIds = Array.from(new Set(request.appIds.filter(Boolean)))
      const baseSuccessMessage = buildBaseSuccessMessage({ ...request, appIds: uniqueAppIds })

      let savedConfig: WaterfallRecommendationConfigDto | null = null

      try {
        if (editConfig) {
          savedConfig = await waterfallRecommendationSettingsApi.updateConfig(editConfig.id, request.config)
        } else {
          savedConfig = await waterfallRecommendationSettingsApi.createConfig(request.config)
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to save configuration",
          variant: "destructive",
        })
        setSavingConfig(false)
        return
      }

      const shouldReplaceAssignments = !request.config.isGlobalDefault && (editConfig != null || uniqueAppIds.length > 0)
      if (savedConfig && shouldReplaceAssignments) {
        try {
          await waterfallRecommendationSettingsApi.replaceConfigApps(savedConfig.id, { appIds: uniqueAppIds })
        } catch (error: any) {
          await refetchConfigs().catch(() => undefined)
          closeConfigEditor()
          toast({
            title: "Partial success",
            description: `${baseSuccessMessage} The config was saved, but replacing app assignments failed: ${error?.message || "Unknown error"}`,
            variant: "destructive",
          })
          setSavingConfig(false)
          return
        }
      }

      let matchedMediationGroupCount = 0
      let updatedMediationGroupCount = 0
      let skippedMediationGroupCount = 0
      let applyModeSyncError: string | null = null

      if (request.applyMode !== "keep_current" && uniqueAppIds.length > 0) {
        const targetIntervalDays = request.intervalDays ?? 7

        try {
          const previewResponses = await Promise.all(
            uniqueAppIds.map((appId) =>
              waterfallManagementApi.getBulkPolicyTargets({
                appId,
                targetApplyMode: request.applyMode,
                intervalDays: targetIntervalDays,
              })
            )
          )
          const mediationGroupIds = Array.from(
            new Set(
              previewResponses.flatMap((response) => response.targets.map((target) => target.mediationGroupId))
            )
          )
          matchedMediationGroupCount = mediationGroupIds.length

          if (mediationGroupIds.length > 0) {
            const response = await waterfallManagementApi.bulkUpdatePolicies({
              applyMode: request.applyMode,
              intervalDays: targetIntervalDays,
              mediationGroupIds,
            })
            updatedMediationGroupCount = response.updatedCount
            skippedMediationGroupCount = response.skippedCount
          }
        } catch (error) {
          applyModeSyncError = error instanceof Error
            ? error.message
            : "Failed to update apply mode for the matched mediation groups."
        }
      }
      await refetchConfigs().catch(() => undefined)
      closeConfigEditor()

      if (applyModeSyncError) {
        toast({
          title: "Partial success",
          description: `${baseSuccessMessage} Apply mode sync failed for ${getConfigApplyModeLabel(request.applyMode)} with a ${formatIntervalLabel(request.intervalDays ?? 7)} interval: ${applyModeSyncError}`,
          variant: "destructive",
        })
        setSavingConfig(false)
        return
      }

      if (request.applyMode === "keep_current" || uniqueAppIds.length === 0) {
        toast({ title: "Success", description: baseSuccessMessage })
        setSavingConfig(false)
        return
      }

      if (matchedMediationGroupCount === 0) {
        toast({
          title: "Success",
          description: `${baseSuccessMessage} No mediation groups matched the selected apps, so apply mode was not changed.`,
        })
        setSavingConfig(false)
        return
      }

      const modeLabel = getConfigApplyModeLabel(request.applyMode)
      const intervalLabel = formatIntervalLabel(request.intervalDays ?? 7)
      toast({
        title: "Success",
        description: `${baseSuccessMessage} Updated ${updatedMediationGroupCount} mediation groups to ${modeLabel} with a ${intervalLabel} interval${skippedMediationGroupCount > 0 ? `, skipped ${skippedMediationGroupCount}` : ""}.`,
      })
      setSavingConfig(false)
    },
    [buildBaseSuccessMessage, closeConfigEditor, editConfig, refetchConfigs, toast]
  )

  const handleDeleteConfig = useCallback(async (config: WaterfallConfigItem) => {
    try {
      await waterfallRecommendationSettingsApi.deleteConfig(config.id)
      toast({ title: "Success", description: `Config "${config.configName}" deleted successfully.` })
      await refetchConfigs()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete configuration",
        variant: "destructive",
      })
    }
  }, [refetchConfigs, toast])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Configs</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{totalConfigs}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white p-2.5">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Assigned Apps</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{totalAssignedApps}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <Smartphone className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Draft Configs</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{draftConfigCount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <Settings className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Global Default</p>
                <p className="mt-1 text-2xl font-bold text-slate-600">{globalConfigExists ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <Globe className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search configs, apps, notes..."
              className="pl-9"
              value={configSearch}
              onChange={(event) => setConfigSearch(event.target.value)}
            />
          </div>
          <Select value={configScopeFilter} onValueChange={setConfigScopeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Configs</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="global">Global Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canManageConfigs && (
            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              onClick={() => setCreateConfigOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Create Config
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-slate-600 sm:w-auto"
            onClick={() => {
              refetchConfigs()
              toast({ title: "Refreshed", description: "Configs refreshed" })
            }}
            disabled={configsLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${configsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="w-full bg-transparent sm:w-auto" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ConfigsTable
        configs={filteredConfigs}
        onEditConfig={(config) => {
          setEditConfig(config)
          setCreateConfigOpen(false)
        }}
        onDeleteConfig={handleDeleteConfig}
        hasFilters={configSearch !== "" || configScopeFilter !== "all"}
        onClearFilters={() => {
          setConfigSearch("")
          setConfigScopeFilter("all")
        }}
        onCreateNew={() => {
          setEditConfig(null)
          setCreateConfigOpen(true)
        }}
        canManage={canManageConfigs}
      />

      <CreateEditConfigDialog
        open={createConfigOpen || !!editConfig}
        onOpenChange={(open) => {
          if (!open) {
            closeConfigEditor()
          }
        }}
        config={editConfig}
        onSave={handleSaveConfig}
        saving={savingConfig}
        apps={availableApps}
        existingConfigs={configs}
        canManageApplyPolicies={canManageApplyPolicies}
      />
    </div>
  )
}
