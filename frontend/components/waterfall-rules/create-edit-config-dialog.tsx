"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search } from "lucide-react"
import { waterfallRecommendationSettingsApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import type { ConfigApplyMode, ConfigSaveRequest, WaterfallConfigItem } from "./waterfall-config-types"

interface CreateEditConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: WaterfallConfigItem | null
  onSave: (request: ConfigSaveRequest) => Promise<void>
  saving?: boolean
  apps?: App[]
  existingConfigs?: WaterfallConfigItem[]
  canManageApplyPolicies?: boolean
}

const APPLY_MODE_OPTIONS: Array<{
  value: ConfigApplyMode
  label: string
  description: string
}> = [
  {
    value: "keep_current",
    label: "Keep current",
    description: "Do not change mediation-group apply mode for the selected apps.",
  },
  {
    value: "semi_auto",
    label: "Semi-auto",
    description: "Create due alerts at the selected interval without auto-applying waterfall changes.",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Automatically apply actionable waterfall changes when the selected interval is due.",
  },
]

const DEFAULT_INTERVAL_DAYS = 7
const MIN_INTERVAL_DAYS = 1
const MAX_INTERVAL_DAYS = 30

function parseIntervalDays(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < MIN_INTERVAL_DAYS || parsed > MAX_INTERVAL_DAYS) {
    return null
  }
  return parsed
}

function formatIntervalLabel(intervalDays: number): string {
  return `${intervalDays}-day${intervalDays === 1 ? "" : "s"}`
}
function normalizeConfigName(configName: string) {
  return configName.trim().toLowerCase()
}

function getAppDisplayName(app: App) {
  return app.displayName || app.name || app.appId
}

function formatAppCount(count: number) {
  return `${count} app${count === 1 ? "" : "s"}`
}

function getAssignmentDisplay(params: {
  assignment: { configId: number; configName: string } | undefined
  currentConfigId?: number | null
  isSelected: boolean
}) {
  if (!params.assignment) {
    return {
      label: "Unassigned",
      detail: null,
      badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }

  if (params.assignment.configId === params.currentConfigId) {
    return {
      label: "Assigned here",
      detail: null,
      badgeClassName: "border border-blue-200 bg-blue-50 text-blue-700",
    }
  }

  if (params.isSelected) {
    return {
      label: "Will reassign",
      detail: `From ${params.assignment.configName}`,
      badgeClassName: "border border-amber-200 bg-amber-50 text-amber-800",
    }
  }

  return {
    label: "Assigned",
    detail: params.assignment.configName,
    badgeClassName: "border border-amber-200 bg-amber-50 text-amber-800",
  }
}

function buildConfirmContent(params: {
  configName: string
  isGlobalDefault: boolean
  appCount: number
  applyMode: ConfigApplyMode
  intervalDays: number | null
  replacesExistingGlobalDefault: boolean
  reassignedAppCount: number
}) {
  const baseDescription = params.isGlobalDefault
    ? params.replacesExistingGlobalDefault
      ? `This will save ${params.configName} as the global default config and replace the current global default in the same save. Every app without a direct rule config assignment will use this config after save.`
      : `This will save ${params.configName} as the global default config. Every app without a direct rule config assignment will use this config after save.`
    : params.appCount === 0
      ? `This will save ${params.configName} as a draft rule config. No apps will be affected until you assign apps later.`
      : `This will save ${params.configName} for ${formatAppCount(params.appCount)}. All selected apps will follow the new config after save.`
  const reassignmentDescription = params.reassignedAppCount > 0
    ? ` ${formatAppCount(params.reassignedAppCount)} currently assigned to another config will be moved to this config if you continue.`
    : ""
  const defaultConfirmLabel = params.reassignedAppCount > 0 ? "Save and Reassign Apps" : "Confirm Save"
  const defaultTitle = params.reassignedAppCount > 0 ? "Confirm app reassignment" : "Confirm config save"
  const intervalLabel = formatIntervalLabel(params.intervalDays ?? DEFAULT_INTERVAL_DAYS)

  if (!params.isGlobalDefault && params.appCount > 0 && params.applyMode === "semi_auto") {
    return {
      title: params.reassignedAppCount > 0 ? "Save, reassign apps, and switch to semi-auto?" : "Save config and switch to semi-auto?",
      description: `${baseDescription}${reassignmentDescription} Their mediation groups will switch to semi-auto mode, which creates due alerts on a ${intervalLabel} cycle but does not auto-apply waterfall changes. This does not apply waterfall immediately at save time.`,
      confirmLabel: params.reassignedAppCount > 0 ? "Save, Reassign, and Switch to Semi-auto" : "Save and Switch to Semi-auto",
    }
  }

  if (!params.isGlobalDefault && params.appCount > 0 && params.applyMode === "auto") {
    return {
      title: params.reassignedAppCount > 0 ? "Save, reassign apps, and switch to auto?" : "Save config and switch to auto?",
      description: `${baseDescription}${reassignmentDescription} Their mediation groups will switch to auto mode, which applies actionable waterfall changes automatically when the ${intervalLabel} cycle is due. This does not apply waterfall immediately at save time.`,
      confirmLabel: params.reassignedAppCount > 0 ? "Save, Reassign, and Switch to Auto" : "Save and Switch to Auto",
    }
  }

  return {
    title: defaultTitle,
    description: `${baseDescription}${reassignmentDescription}`,
    confirmLabel: defaultConfirmLabel,
  }
}

export function CreateEditConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  saving = false,
  apps = [],
  existingConfigs = [],
  canManageApplyPolicies = false,
}: CreateEditConfigDialogProps) {
  const [configName, setConfigName] = useState("")
  const [isGlobalDefault, setIsGlobalDefault] = useState(false)
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [minRecommendations, setMinRecommendations] = useState("5")
  const [maxRecommendations, setMaxRecommendations] = useState("20")
  const [minMatchRatePercent, setMinMatchRatePercent] = useState("3")
  const [minSowPercent, setMinSowPercent] = useState("0.9")
  const [ruleGroupId, setRuleGroupId] = useState("none")
  const [notes, setNotes] = useState("")
  const [appSearch, setAppSearch] = useState("")
  const [applyMode, setApplyMode] = useState<ConfigApplyMode>("keep_current")
  const [intervalDays, setIntervalDays] = useState(String(DEFAULT_INTERVAL_DAYS))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingRequest, setPendingRequest] = useState<ConfigSaveRequest | null>(null)
  const [ruleGroups, setRuleGroups] = useState<Array<{ id: number; name: string; isActive: boolean; color?: string | null }>>([])

  const appAssignmentMap = useMemo(() => {
    const map: Record<string, { configId: number; configName: string }> = {}

    for (const item of existingConfigs) {
      for (const appId of item.appIds) {
        map[appId] = { configId: item.id, configName: item.configName }
      }
    }

    return map
  }, [existingConfigs])

  const existingGlobalDefaultId = useMemo(() => {
    return existingConfigs.find((item) => item.isGlobalDefault)?.id ?? null
  }, [existingConfigs])

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false)
      setPendingRequest(null)
      return
    }

    setConfigName(config?.configName ?? "")
    setIsGlobalDefault(config?.isGlobalDefault ?? false)
    setSelectedAppIds(config?.appIds ?? [])
    setMinRecommendations(String(config?.minRecommendations ?? 5))
    setMaxRecommendations(String(config?.maxRecommendations ?? 20))
    setMinMatchRatePercent(String(config?.minMatchRatePercent ?? 3))
    setMinSowPercent(String(config?.minSowPercent ?? 0.9))
    setRuleGroupId(config?.ruleGroupId != null ? String(config.ruleGroupId) : "none")
    setNotes(config?.notes ?? "")
    setAppSearch("")
    setApplyMode("keep_current")
    setIntervalDays(String(DEFAULT_INTERVAL_DAYS))
    setErrors({})
    setConfirmOpen(false)
    setPendingRequest(null)
  }, [open, config])

  useEffect(() => {
    if (!open) return

    const loadRuleGroups = async () => {
      try {
        const groups = await waterfallRecommendationSettingsApi.getAllRuleGroups()
        setRuleGroups(
          groups.map((group) => ({
            id: group.id,
            name: group.name,
            isActive: group.isActive,
            color: group.color,
          }))
        )
      } catch {
        setRuleGroups([])
      }
    }

    void loadRuleGroups()
  }, [open])

  const sortedApps = useMemo(() => {
    const keyword = appSearch.trim().toLowerCase()
    const filteredApps = apps.filter((app) => {
      const appLabel = (app.displayName || app.name || app.appId).toLowerCase()
      if (!keyword) return true
      return appLabel.includes(keyword) || app.appId.toLowerCase().includes(keyword)
    })

    return [...filteredApps].sort((left, right) => {
      return getAppDisplayName(left).localeCompare(getAppDisplayName(right))
    })
  }, [appSearch, apps])

  const selectedApps = useMemo(() => {
    return apps.filter((app) => selectedAppIds.includes(app.appId))
  }, [apps, selectedAppIds])

  const selectedAppsAssignedElsewhere = useMemo(() => {
    return selectedApps
      .map((app) => {
        const assignment = appAssignmentMap[app.appId]
        if (!assignment || assignment.configId === config?.id) {
          return null
        }

        return {
          appId: app.appId,
          appName: getAppDisplayName(app),
          currentConfigName: assignment.configName,
        }
      })
      .filter((item): item is { appId: string; appName: string; currentConfigName: string } => item != null)
      .sort((left, right) => left.appName.localeCompare(right.appName))
  }, [appAssignmentMap, config?.id, selectedApps])

  const selectedRuleGroup = useMemo(() => {
    if (ruleGroupId === "none") return null
    return ruleGroups.find((group) => String(group.id) === ruleGroupId) ?? null
  }, [ruleGroupId, ruleGroups])

  const currentNameKey = config ? normalizeConfigName(config.configName) : null
  const parsedIntervalDays = useMemo(() => parseIntervalDays(intervalDays), [intervalDays])
  const shouldShowApplyMode = canManageApplyPolicies && !isGlobalDefault && selectedAppIds.length > 0
  const willReplaceExistingGlobalDefault = isGlobalDefault && existingGlobalDefaultId != null && existingGlobalDefaultId !== config?.id

  const toggleAppSelection = (appId: string, checked: boolean) => {
    setSelectedAppIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, appId]))
      }

      return current.filter((item) => item !== appId)
    })
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const trimmedName = configName.trim()
    const minRecommendationsValue = Number(minRecommendations)
    const maxRecommendationsValue = Number(maxRecommendations)
    const minMatchRateValue = Number(minMatchRatePercent)
    const minSowValue = Number(minSowPercent)

    if (!trimmedName) {
      nextErrors.configName = "Config name is required."
    } else {
      const normalizedName = normalizeConfigName(trimmedName)
      const duplicateConfig = existingConfigs.find((item) => {
        if (currentNameKey && normalizeConfigName(item.configName) === currentNameKey && item.id === config?.id) {
          return false
        }

        return normalizeConfigName(item.configName) === normalizedName
      })

      if (duplicateConfig) {
        nextErrors.configName = "Config name must be unique."
      }
    }

    if (
      Number.isNaN(minRecommendationsValue) ||
      Number.isNaN(maxRecommendationsValue) ||
      Number.isNaN(minMatchRateValue) ||
      Number.isNaN(minSowValue)
    ) {
      nextErrors.thresholds = "All thresholds must be valid numbers."
    } else {
      if (minRecommendationsValue < 1) {
        nextErrors.minRecommendations = "Min recommendations must be at least 1."
      }
      if (maxRecommendationsValue < minRecommendationsValue) {
        nextErrors.maxRecommendations = "Max recommendations must be greater than or equal to min recommendations."
      }
      if (minMatchRateValue < 0) {
        nextErrors.minMatchRatePercent = "Min match rate must be 0 or greater."
      }
      if (minSowValue < 0) {
        nextErrors.minSowPercent = "Min SoW must be 0 or greater."
      }
    }

    if (shouldShowApplyMode && applyMode !== "keep_current" && parsedIntervalDays == null) {
      nextErrors.intervalDays = `Interval must be a whole number between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS}.`
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleOpenConfirm = () => {
    if (!validate()) {
      return
    }

    const request: ConfigSaveRequest = {
      config: {
        configName: configName.trim(),
        isGlobalDefault,
        isActive: config?.isActive ?? true,
        minRecommendations: Number(minRecommendations),
        maxRecommendations: Number(maxRecommendations),
        minMatchRatePercent: Number(minMatchRatePercent),
        minSowPercent: Number(minSowPercent),
        notes: notes.trim() ? notes.trim() : null,
        ruleGroupId: ruleGroupId === "none" ? null : Number(ruleGroupId),
      },
      appIds: isGlobalDefault ? [] : Array.from(new Set(selectedAppIds)),
      applyMode: shouldShowApplyMode ? applyMode : "keep_current",
      intervalDays: shouldShowApplyMode && applyMode !== "keep_current" ? parsedIntervalDays : null,
    }

    setPendingRequest(request)
    setConfirmOpen(true)
  }

  const confirmContent = buildConfirmContent({
    configName: configName.trim() || "this config",
    isGlobalDefault,
    appCount: isGlobalDefault ? 0 : selectedAppIds.length,
    applyMode: shouldShowApplyMode ? applyMode : "keep_current",
    intervalDays: shouldShowApplyMode && applyMode !== "keep_current" ? parsedIntervalDays : null,
    replacesExistingGlobalDefault: willReplaceExistingGlobalDefault,
    reassignedAppCount: selectedAppsAssignedElsewhere.length,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[94vh] w-[70vw] max-h-[94vh] max-w-[70vw] flex-col gap-2 overflow-hidden p-3 sm:max-w-[70vw] sm:p-4">
          <DialogHeader className="shrink-0 gap-0.5 pr-8">
            <DialogTitle>{config ? "Edit Rule Config" : "Create Rule Config"}</DialogTitle>
            <DialogDescription className="text-xs leading-5">
              Create a reusable rule config, optionally assign apps, and keep one config as the global default fallback.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="grid h-full gap-3 lg:grid-cols-10">
              <div className="min-h-0 space-y-2 overflow-y-auto pb-6 pr-2 lg:col-span-4">
                <div className="space-y-2 rounded-xl border-2 border-blue-200 bg-blue-50/70 p-3">
                  <div className="space-y-1">
                    <Label htmlFor="config-name" className="text-slate-900">Config Name</Label>
                    <p className="text-xs text-slate-600">Choose a unique name so operators can identify this config quickly.</p>
                  </div>
                  <Input
                    id="config-name"
                    className="border-blue-200 bg-white shadow-sm"
                    value={configName}
                    onChange={(event) => setConfigName(event.target.value)}
                    placeholder="Revenue Recovery Tier A"
                  />
                  {errors.configName && <p className="text-sm text-red-600">{errors.configName}</p>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="is-global-default"
                      checked={isGlobalDefault}
                      onCheckedChange={(checked) => {
                        const nextValue = checked === true
                        setIsGlobalDefault(nextValue)
                        if (nextValue) {
                          setSelectedAppIds([])
                          setApplyMode("keep_current")
                          setIntervalDays(String(DEFAULT_INTERVAL_DAYS))
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="is-global-default">Use as Global Default</Label>
                      {willReplaceExistingGlobalDefault && (
                        <p className="text-sm text-amber-700">
                          Saving this config will replace the current global default in the same save.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="min-recommendations">Min Recommendations</Label>
                    <Input
                      id="min-recommendations"
                      type="number"
                      min={1}
                      value={minRecommendations}
                      onChange={(event) => setMinRecommendations(event.target.value)}
                    />
                    {errors.minRecommendations && <p className="text-sm text-red-600">{errors.minRecommendations}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max-recommendations">Max Recommendations</Label>
                    <Input
                      id="max-recommendations"
                      type="number"
                      min={1}
                      value={maxRecommendations}
                      onChange={(event) => setMaxRecommendations(event.target.value)}
                    />
                    {errors.maxRecommendations && <p className="text-sm text-red-600">{errors.maxRecommendations}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="min-match-rate">Min Match Rate %</Label>
                    <Input
                      id="min-match-rate"
                      type="number"
                      min={0}
                      step={0.1}
                      value={minMatchRatePercent}
                      onChange={(event) => setMinMatchRatePercent(event.target.value)}
                    />
                    {errors.minMatchRatePercent && <p className="text-sm text-red-600">{errors.minMatchRatePercent}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="min-sow">Min SoW %</Label>
                    <Input
                      id="min-sow"
                      type="number"
                      min={0}
                      step={0.01}
                      value={minSowPercent}
                      onChange={(event) => setMinSowPercent(event.target.value)}
                    />
                    {errors.minSowPercent && <p className="text-sm text-red-600">{errors.minSowPercent}</p>}
                  </div>
                </div>
                {errors.thresholds && <p className="text-sm text-red-600">{errors.thresholds}</p>}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-group">Rule Group</Label>
                    <Select value={ruleGroupId} onValueChange={setRuleGroupId}>
                      <SelectTrigger id="rule-group">
                        {selectedRuleGroup ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: selectedRuleGroup.color || "#94a3b8" }}
                            />
                            <span>{selectedRuleGroup.name}</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Default rule group" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default rule group</SelectItem>
                        {ruleGroups
                          .filter((group) => group.isActive)
                          .map((group) => (
                            <SelectItem key={group.id} value={String(group.id)}>
                              {group.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="apply-mode-interval">Interval (days)</Label>
                    <Input
                      id="apply-mode-interval"
                      type="number"
                      min={MIN_INTERVAL_DAYS}
                      max={MAX_INTERVAL_DAYS}
                      step={1}
                      value={intervalDays}
                      onChange={(event) => setIntervalDays(event.target.value)}
                      disabled={!shouldShowApplyMode || applyMode === "keep_current"}
                      className="bg-white disabled:bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">
                      {!canManageApplyPolicies
                        ? "You do not have permission to bulk update apply mode policies."
                        : isGlobalDefault
                          ? "Global default configs do not bulk-sync apply mode."
                          : selectedAppIds.length === 0
                            ? "Select at least one app to enable interval sync."
                            : applyMode === "keep_current"
                              ? "Choose Semi-auto or Auto to edit the interval."
                              : `Valid range: ${MIN_INTERVAL_DAYS}-${MAX_INTERVAL_DAYS} days. Current selection: ${parsedIntervalDays != null ? formatIntervalLabel(parsedIntervalDays) : "Invalid interval"}`}
                    </p>
                    {errors.intervalDays && <p className="text-sm text-red-600">{errors.intervalDays}</p>}
                  </div>
                </div>
                
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <h3 className="font-medium text-slate-900">Apply Mode Sync</h3>
                  {shouldShowApplyMode ? (
                    <div className="mt-1.5 space-y-2">
                      {APPLY_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setApplyMode(option.value)}
                          className={`w-full rounded-lg border px-3 py-1.5 text-left transition ${
                            applyMode === option.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="font-medium text-slate-900">{option.label}</div>
                          <div className="mt-0.5 text-xs leading-5 text-slate-500">{option.description}</div>
                        </button>
                      ))}

                    </div>
                  ) : (
                    <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {!canManageApplyPolicies
                        ? "You do not have permission to bulk update apply mode policies from this screen."
                        : isGlobalDefault
                          ? "Global default configs do not bulk-sync apply mode because they do not keep explicit app assignments."
                          : "Select at least one app to bulk-sync apply mode after save."}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes for operators or reviewers"
                    rows={1}
                  />
                </div>
              </div>

              <div className="min-h-0 space-y-2.5 overflow-hidden lg:col-span-6">
                <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 p-2.5">
                  <div className="shrink-0 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-900">App Assignments</h3>
                      <p className="text-sm text-slate-500">
                        {isGlobalDefault
                          ? "Global default configs do not keep explicit app assignments."
                          : `Selected ${formatAppCount(selectedAppIds.length)}.`}
                      </p>
                    </div>
                    {!isGlobalDefault && selectedAppIds.length > 0 && (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {formatAppCount(selectedAppIds.length)}
                      </Badge>
                    )}
                  </div>

                  {isGlobalDefault ? (
                    <div className="mt-3 shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      This config will be used only as fallback. Save it without app assignments.
                    </div>
                  ) : (
                    <div className="mt-2.5 flex min-h-0 flex-1 flex-col space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={appSearch}
                          onChange={(event) => setAppSearch(event.target.value)}
                          placeholder="Search apps by name or app id"
                          className="pl-9"
                        />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Selecting an app already assigned to another config will move that app to this config when you save.
                      </div>
                      {selectedAppsAssignedElsewhere.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                          <div className="font-medium">
                            {formatAppCount(selectedAppsAssignedElsewhere.length)} will be reassigned from another config on save.
                          </div>
                          <div className="mt-1 text-xs text-amber-800">
                            You will need to confirm the reassignment before saving.
                          </div>
                        </div>
                      )}
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {sortedApps.map((app) => {
                          const assignment = appAssignmentMap[app.appId]
                          const appName = getAppDisplayName(app)
                          const isChecked = selectedAppIds.includes(app.appId)
                          const assignmentDisplay = getAssignmentDisplay({
                            assignment,
                            currentConfigId: config?.id,
                            isSelected: isChecked,
                          })

                          return (
                            <label
                              key={app.appId}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${
                                isChecked
                                  ? "border-blue-200 bg-blue-50/40 hover:border-blue-300"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <Checkbox
                                className="shrink-0"
                                checked={isChecked}
                                onCheckedChange={(checked) => toggleAppSelection(app.appId, checked === true)}
                              />
                              <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                                <AvatarImage src={app.iconUri || "/placeholder.svg"} alt={appName} className="rounded-lg object-cover" />
                                <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                                  {appName.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate font-medium text-slate-900">{appName}</span>
                                      {app.platform && (
                                        <Badge variant="outline" className="text-slate-600">
                                          {app.platform}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-slate-500">{app.appId}</div>
                                  </div>
                                  <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-right">
                                    <Badge className={assignmentDisplay.badgeClassName}>{assignmentDisplay.label}</Badge>
                                    {assignmentDisplay.detail && (
                                      <div className="max-w-[11rem] truncate text-[11px] text-slate-500">
                                        {assignmentDisplay.detail}
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </label>
                          )
                        })}
                        {sortedApps.length === 0 && (
                          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                            No apps match this search.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-white/95 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleOpenConfirm} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : config ? (
                "Save Changes"
              ) : (
                "Create Config"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmContent.description}</AlertDialogDescription>
            {selectedAppsAssignedElsewhere.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-left text-sm text-amber-900">
                <div className="font-medium">
                  The following apps are currently assigned to another config and will be moved:
                </div>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {selectedAppsAssignedElsewhere.map((app) => (
                    <div
                      key={app.appId}
                      className="flex items-start gap-3 rounded-md border border-amber-200 bg-white px-3 py-2"
                    >
                      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                        <AvatarImage src={apps.find((item) => item.appId === app.appId)?.iconUri || "/placeholder.svg"} alt={app.appName} className="rounded-lg object-cover" />
                        <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                          {app.appName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900">{app.appName}</div>
                        <div className="mt-1 text-xs text-slate-500">{app.appId}</div>
                        <div className="mt-1 text-xs text-amber-800">Currently assigned to {app.currentConfigName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={saving || !pendingRequest}
              onClick={async () => {
                if (!pendingRequest) return
                await onSave(pendingRequest)
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                confirmContent.confirmLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

