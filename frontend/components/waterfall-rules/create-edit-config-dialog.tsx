"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Smartphone, Globe, Search } from "lucide-react"
import { waterfallRecommendationSettingsApi } from "@/lib/api/services"
import type { AppConfig } from "./waterfall-rules-content"

interface CreateEditConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AppConfig | null
  /**
   * onSave nhận danh sách target configs:
   * - Edit: 1 phần tử (app hiện tại)
   * - Create: 1..n app (multi-select)
   */
  onSave: (targets: Array<Omit<AppConfig, "id" | "updatedAt">>) => Promise<void>
  saving?: boolean
  apps?: Array<{ id: number; appId: string; name: string; displayName?: string; platform?: string; iconUri?: string }>
  /** Danh sách appId đã có config (app-specific). Dùng để chặn tạo trùng app. */
  appsWithConfig?: string[]
}

export function CreateEditConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  saving = false,
  apps = [],
  appsWithConfig = [],
}: CreateEditConfigDialogProps) {
  const isEditing = !!config

  // Map apps to dropdown format
  const availableApps = useMemo(() => {
    return apps.map((app) => ({
      id: app.appId,
      name: app.displayName || app.name || app.appId,
      platform: app.platform,
      iconUrl: app.iconUri,
    }))
  }, [apps])

  // Create mode: only show apps that do not have config yet.
  const selectableApps = useMemo(() => {
    if (isEditing) return availableApps
    return availableApps.filter((app) => !appsWithConfig.includes(app.id))
  }, [isEditing, availableApps, appsWithConfig])

  // Create mode: cho phép multi-select app; Edit mode: chỉ hiển thị app hiện tại (không đổi).
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [isGlobal, setIsGlobal] = useState(false)
  const [minRec, setMinRec] = useState("5")
  const [maxRec, setMaxRec] = useState("20")
  const [minMatchRate, setMinMatchRate] = useState("3.0")
  const [minSoW, setMinSoW] = useState("0.9")
  const [ruleGroupId, setRuleGroupId] = useState<string>("none")
  const [ruleGroups, setRuleGroups] = useState<Array<{ id: number; name: string; isActive: boolean; color?: string | null }>>([])
  const [appSearch, setAppSearch] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (config) {
        // Edit mode: khóa app, chỉ hiển thị thông tin; không đổi appId/isGlobal.
        setSelectedAppIds(config.isGlobal ? [] : [config.appId])
        setIsGlobal(config.isGlobal)
        setMinRec(String(config.minRecommendations))
        setMaxRec(String(config.maxRecommendations))
        setMinMatchRate(String(config.minMatchRate))
        setMinSoW(String(config.minSoW))
        setRuleGroupId(config.ruleGroupId != null ? String(config.ruleGroupId) : "none")
      } else {
        setSelectedAppIds([])
        setIsGlobal(false)
        setMinRec("5")
        setMaxRec("20")
        setMinMatchRate("3.0")
        setMinSoW("0.9")
        setRuleGroupId("none")
      }
      setAppSearch("")
      setErrors({})
    }
  }, [open, config])

  useEffect(() => {
    if (!open) return
    const loadRuleGroups = async () => {
      try {
        const groups = await waterfallRecommendationSettingsApi.getAllRuleGroups()
        setRuleGroups(groups.map((g) => ({ id: g.id, name: g.name, isActive: g.isActive, color: g.color })))
      } catch {
        setRuleGroups([])
      }
    }
    void loadRuleGroups()
  }, [open])

  const selectedRuleGroup = useMemo(() => {
    if (ruleGroupId === "none") return null
    return ruleGroups.find((group) => String(group.id) === ruleGroupId) ?? null
  }, [ruleGroupId, ruleGroups])

  const displayedApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase()
    if (!q) return selectableApps
    return availableApps.filter(
      (app) => app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)
    )
  }, [selectableApps, availableApps, appSearch])

  const selectedApps = availableApps.filter((a) => selectedAppIds.includes(a.id))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!isGlobal && !isEditing && selectedAppIds.length === 0)
      errs.app = "Select at least one app or mark as global"
    // Nếu đang tạo mới (không phải edit) và chọn app đã có config thì chặn.
    if (!isEditing && !isGlobal && selectedAppIds.length > 0) {
      const conflicted = selectedAppIds.filter((id) => appsWithConfig.includes(id))
      if (conflicted.length > 0) {
        errs.app = "Some selected apps are no longer available for configuration."
      }
    }
    const min = Number(minRec)
    const max = Number(maxRec)
    if (!min || min < 1 || min > 100) errs.minRec = "Must be 1-100"
    if (!max || max < 1 || max > 100) errs.maxRec = "Must be 1-100"
    if (min && max && min > max) errs.maxRec = "Max must be >= Min"
    const mr = Number(minMatchRate)
    if (Number.isNaN(mr) || mr < 0 || mr > 100)
      errs.minMatchRate = "Must be 0-100"
    const sw = Number(minSoW)
    if (Number.isNaN(sw) || sw < 0 || sw > 100) errs.minSoW = "Must be 0-100"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    try {
      if (isEditing && config) {
        // Edit: chỉ cập nhật config hiện tại (không đổi app/global)
        await onSave([
          {
            appId: config.appId,
            appName: config.appName,
            isGlobal: config.isGlobal,
            minRecommendations: Number(minRec),
            maxRecommendations: Number(maxRec),
            minMatchRate: Number(minMatchRate),
            minSoW: Number(minSoW),
            ruleGroupId: config.isGlobal ? null : (ruleGroupId === "none" ? null : Number(ruleGroupId)),
            ruleGroupName: null,
          },
        ])
      } else {
        // Create: có thể tạo cho Global hoặc cho nhiều app.
        if (isGlobal) {
          await onSave([
            {
              appId: "global",
              appName: "Global",
              isGlobal: true,
              minRecommendations: Number(minRec),
              maxRecommendations: Number(maxRec),
              minMatchRate: Number(minMatchRate),
              minSoW: Number(minSoW),
              ruleGroupId: null,
              ruleGroupName: null,
            },
          ])
        } else {
          const payloads = selectedApps.map((app) => ({
            appId: app.id,
            appName: app.name,
            isGlobal: false,
            minRecommendations: Number(minRec),
            maxRecommendations: Number(maxRec),
            minMatchRate: Number(minMatchRate),
            minSoW: Number(minSoW),
            ruleGroupId: ruleGroupId === "none" ? null : Number(ruleGroupId),
            ruleGroupName: null,
          }))
          await onSave(payloads)
        }
      }
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Configuration" : "Create Configuration"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the recommendation configuration settings."
              : "Set up a new recommendation configuration for an app."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* App Selection */}
          <div className="space-y-2">
            <Label>App</Label>

            {isEditing && config ? (
              // Edit mode: chỉ hiển thị thông tin app, không cho đổi
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                  {config.isGlobal ? (
                    <Globe className="w-4 h-4 text-slate-500" />
                  ) : config.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={config.iconUrl}
                      alt={config.appName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Smartphone className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {config.isGlobal ? "Global (All Apps)" : config.appName}
                  </p>
                  {!config.isGlobal && (
                    <>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {config.appId}
                      </p>
                      {config.platform && (
                        <p className="text-[11px] text-slate-400">
                          {config.platform}
                        </p>
                      )}
                    </>
                  )}
                  {config.isGlobal && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Default configuration applied to all apps
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="global-check"
                    checked={isGlobal}
                    onCheckedChange={(checked) => {
                      setIsGlobal(!!checked)
                      if (checked) setSelectedAppIds([])
                    }}
                  />
                  <label
                    htmlFor="global-check"
                    className="text-sm text-slate-700 cursor-pointer"
                  >
                    Global (All Apps)
                  </label>
                </div>

                {!isGlobal && (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search app name or App ID..."
                        className="pl-9"
                        value={appSearch}
                        onChange={(e) => setAppSearch(e.target.value)}
                      />
                    </div>
                    <div className="border rounded-md border-slate-200 max-h-52 overflow-y-auto p-2 space-y-1">
                      {displayedApps.map((app) => {
                        const hasConfig = appsWithConfig.includes(app.id)
                        const disabled = !isEditing && hasConfig
                        const checked = selectedAppIds.includes(app.id)
                        return (
                          <div
                            key={app.id}
                            className="flex items-center gap-3 px-1 py-0.5 rounded hover:bg-slate-50"
                          >
                            <Checkbox
                              id={`app-${app.id}`}
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) => {
                                const v = value === true
                                setSelectedAppIds((prev) => {
                                  if (v) {
                                    if (prev.includes(app.id)) return prev
                                    return [...prev, app.id]
                                  } else {
                                    return prev.filter((id) => id !== app.id)
                                  }
                                })
                              }}
                            />
                            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                              {app.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={app.iconUrl}
                                  alt={app.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Smartphone className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <label
                              htmlFor={`app-${app.id}`}
                              className={`flex-1 text-sm cursor-pointer ${
                                disabled ? "text-slate-400" : "text-slate-700"
                              }`}
                            >
                              <span className="block">
                                {app.name}
                                {hasConfig ? " (already has config)" : ""}
                              </span>
                              <span className="block text-xs text-slate-400">
                                {app.id}
                              </span>
                              {app.platform && (
                                <span className="block text-[11px] text-slate-400">
                                  {app.platform}
                                </span>
                              )}
                            </label>
                          </div>
                        )
                      })}
                      {displayedApps.length === 0 &&
                        (selectableApps.length === 0 ? (
                          <p className="text-xs text-slate-500 px-1 py-2">
                            All apps already have a configuration.
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 px-1 py-2">
                            No apps match your search.
                          </p>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Select one or more apps this configuration applies to.
                    </p>
                  </>
                )}

                {errors.app && (
                  <p className="text-xs text-red-600">{errors.app}</p>
                )}
              </>
            )}
          </div>

          {/* Min/Max Recommendations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-rec">Min Recommendations</Label>
              <Input
                id="min-rec"
                type="number"
                min={1}
                max={100}
                value={minRec}
                onChange={(e) => setMinRec(e.target.value)}
              />
              {errors.minRec && (
                <p className="text-xs text-red-600">{errors.minRec}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-rec">Max Recommendations</Label>
              <Input
                id="max-rec"
                type="number"
                min={1}
                max={100}
                value={maxRec}
                onChange={(e) => setMaxRec(e.target.value)}
              />
              {errors.maxRec && (
                <p className="text-xs text-red-600">{errors.maxRec}</p>
              )}
            </div>
          </div>

          {/* Min Match Rate + Min SoW */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-mr">Min Match Rate %</Label>
              <Input
                id="min-mr"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={minMatchRate}
                onChange={(e) => setMinMatchRate(e.target.value)}
              />
              {errors.minMatchRate && (
                <p className="text-xs text-red-600">{errors.minMatchRate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-sow">Min SoW %</Label>
              <Input
                id="min-sow"
                type="number"
                step={0.01}
                min={0}
                max={100}
                value={minSoW}
                onChange={(e) => setMinSoW(e.target.value)}
              />
              {errors.minSoW && (
                <p className="text-xs text-red-600">{errors.minSoW}</p>
              )}
            </div>
          </div>

          {/* Rule Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="rule-group">Rule Group</Label>
            <Select
              value={ruleGroupId}
              onValueChange={setRuleGroupId}
              disabled={(!isEditing && isGlobal) || (isEditing && !!config?.isGlobal)}
            >
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
                  <SelectValue placeholder="No specific group" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific group</SelectItem>
                {ruleGroups
                  .filter((group) => group.isActive)
                  .map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: group.color || "#94a3b8" }}
                        />
                        <span>{group.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {(!isEditing && isGlobal) || (isEditing && !!config?.isGlobal)
                ? "Global config does not use app-level rule group mapping."
                : "Assign a rule group for selected app(s)."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


