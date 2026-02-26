"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Loader2 } from "lucide-react"
import type { AppConfig } from "./waterfall-rules-content"

interface CreateEditConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AppConfig | null
  onSave: (data: Omit<AppConfig, "id" | "updatedAt">) => Promise<void>
  saving?: boolean
  apps?: Array<{ id: number; appId: string; name: string; displayName?: string }>
}

export function CreateEditConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
  saving = false,
  apps = [],
}: CreateEditConfigDialogProps) {
  const isEditing = !!config

  // Map apps to dropdown format
  const availableApps = useMemo(() => {
    return apps.map((app) => ({
      id: app.appId,
      name: app.displayName || app.name || app.appId,
    }))
  }, [apps])

  const [selectedAppId, setSelectedAppId] = useState("")
  const [isGlobal, setIsGlobal] = useState(false)
  const [minRec, setMinRec] = useState("5")
  const [maxRec, setMaxRec] = useState("20")
  const [minMatchRate, setMinMatchRate] = useState("3.0")
  const [minSoW, setMinSoW] = useState("0.9")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (config) {
        setSelectedAppId(config.appId)
        setIsGlobal(config.isGlobal)
        setMinRec(String(config.minRecommendations))
        setMaxRec(String(config.maxRecommendations))
        setMinMatchRate(String(config.minMatchRate))
        setMinSoW(String(config.minSoW))
      } else {
        setSelectedAppId("")
        setIsGlobal(false)
        setMinRec("5")
        setMaxRec("20")
        setMinMatchRate("3.0")
        setMinSoW("0.9")
      }
      setErrors({})
    }
  }, [open, config])

  const selectedApp = availableApps.find((a) => a.id === selectedAppId)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!isGlobal && !selectedAppId)
      errs.app = "Select an app or mark as global"
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
      await onSave({
        appId: isGlobal ? "global" : selectedAppId,
        appName: isGlobal ? "Global" : (selectedApp?.name ?? ""),
        isGlobal,
        minRecommendations: Number(minRec),
        maxRecommendations: Number(maxRec),
        minMatchRate: Number(minMatchRate),
        minSoW: Number(minSoW),
      })
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
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="global-check"
                checked={isGlobal}
                onCheckedChange={(checked) => {
                  setIsGlobal(!!checked)
                  if (checked) setSelectedAppId("")
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
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an app" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApps.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Select the app this configuration applies to.
                </p>
              </>
            )}
            {errors.app && (
              <p className="text-xs text-red-600">{errors.app}</p>
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

          {/* Min Match Rate */}
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
            <p className="text-xs text-slate-500">
              Minimum match rate percentage threshold
            </p>
            {errors.minMatchRate && (
              <p className="text-xs text-red-600">{errors.minMatchRate}</p>
            )}
          </div>

          {/* Min SoW */}
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
            <p className="text-xs text-slate-500">
              Minimum Share of Wallet percentage threshold
            </p>
            {errors.minSoW && (
              <p className="text-xs text-red-600">{errors.minSoW}</p>
            )}
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


