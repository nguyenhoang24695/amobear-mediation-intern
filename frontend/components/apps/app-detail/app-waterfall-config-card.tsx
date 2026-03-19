"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { waterfallRecommendationSettingsApi } from "@/lib/api/services"
import type { App } from "@/types/api"

interface AppWaterfallConfigCardProps {
  app: App | null | undefined
  canManage: boolean
  refreshKey?: number
}

function getSourceLabel(source: string) {
  if (source === "direct") return "Direct"
  if (source === "global") return "Global Default"
  return "Appsettings"
}

function getSourceBadgeClass(source: string) {
  if (source === "direct") return "bg-blue-100 text-blue-700"
  if (source === "global") return "bg-emerald-100 text-emerald-700"
  return "bg-slate-100 text-slate-700"
}

export function AppWaterfallConfigCard({ app, canManage, refreshKey = 0 }: AppWaterfallConfigCardProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState("inherit")
  const [saving, setSaving] = useState(false)

  const { data: effectiveConfigData, refetch: refetchEffectiveConfig } = useApi(
    async () => {
      if (!app?.appId) return null
      return waterfallRecommendationSettingsApi.getConfig(app.appId)
    },
    {
      enabled: !!app?.appId,
      cacheKey: app?.appId ? `app_overview_waterfall_config_${app.appId}_${refreshKey}` : undefined,
    }
  )

  const { data: allConfigs, refetch: refetchAllConfigs } = useApi(
    () => waterfallRecommendationSettingsApi.getAllConfigs(),
    {
      enabled: dialogOpen,
      cacheKey: "all_configs_for_app_overview_assignment",
    }
  )

  const assignableConfigs = useMemo(() => {
    return (allConfigs ?? []).filter((config) => !config.isGlobalDefault)
  }, [allConfigs])

  useEffect(() => {
    if (!dialogOpen) return
    setSelectedConfigId(
      effectiveConfigData?.directlyAssignedConfigId != null
        ? String(effectiveConfigData.directlyAssignedConfigId)
        : "inherit"
    )
  }, [dialogOpen, effectiveConfigData?.directlyAssignedConfigId])

  const handleSave = async () => {
    if (!app?.appId) return

    setSaving(true)
    try {
      if (selectedConfigId === "inherit") {
        if (effectiveConfigData?.directlyAssignedConfigId != null) {
          const directConfig = assignableConfigs.find((config) => config.id === effectiveConfigData.directlyAssignedConfigId)
          if (!directConfig) {
            throw new Error("Could not load the current direct config assignment.")
          }

          await waterfallRecommendationSettingsApi.replaceConfigApps(directConfig.id, {
            appIds: directConfig.appIds.filter((appId) => appId !== app.appId),
          })
        }
      } else {
        const targetConfig = assignableConfigs.find((config) => config.id === Number(selectedConfigId))
        if (!targetConfig) {
          throw new Error("Selected config is no longer available.")
        }

        await waterfallRecommendationSettingsApi.replaceConfigApps(targetConfig.id, {
          appIds: Array.from(new Set([...targetConfig.appIds, app.appId])),
        })
      }

      await Promise.all([refetchEffectiveConfig(), refetchAllConfigs().catch(() => undefined)])
      setDialogOpen(false)
      toast({ title: "Saved", description: "Waterfall config assignment updated for this app." })
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.message || "Could not update app waterfall config assignment.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Waterfall Config</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Effective config resolution for this app.
              </CardDescription>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-transparent"
                onClick={() => setDialogOpen(true)}
                disabled={!app?.appId}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {effectiveConfigData?.config ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Source</span>
                <Badge variant="secondary" className={getSourceBadgeClass(effectiveConfigData.source)}>
                  {getSourceLabel(effectiveConfigData.source)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Config</span>
                <span className="text-right text-sm font-medium text-slate-900">
                  {effectiveConfigData.config.configName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Recommendations</span>
                <span className="text-sm font-medium text-slate-900">
                  {effectiveConfigData.config.minRecommendations} - {effectiveConfigData.config.maxRecommendations}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Min Match Rate</span>
                <span className="text-sm font-medium text-slate-900">
                  {Number(effectiveConfigData.config.minMatchRatePercent).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Min SoW</span>
                <span className="text-sm font-medium text-slate-900">
                  {Number(effectiveConfigData.config.minSowPercent).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Rule Group</span>
                <span className="text-right text-sm font-medium text-slate-900">
                  {effectiveConfigData.config.ruleGroupName || "Default rule group"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No waterfall config data available for this app.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign App Rule Config</DialogTitle>
            <DialogDescription>
              Choose a direct config for this app, or clear the assignment so it uses the global default or appsettings fallback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-900">Current effective source</span>
              <div>
                <Badge variant="secondary" className={getSourceBadgeClass(effectiveConfigData?.source || "appsettings")}>
                  {getSourceLabel(effectiveConfigData?.source || "appsettings")}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-900">Direct assignment</span>
              <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                <SelectTrigger>
                  <SelectValue placeholder="Use fallback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Use fallback (global default or appsettings)</SelectItem>
                  {assignableConfigs.map((config) => (
                    <SelectItem key={config.id} value={String(config.id)}>
                      {config.configName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Choosing a config here moves this app into that config. Global default configs are not selectable as direct assignments.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
