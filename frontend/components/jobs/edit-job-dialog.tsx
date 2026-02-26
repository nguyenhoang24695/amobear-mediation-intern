"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import type { Job } from "./job-management-content"
import { CronBuilder } from "./cron-builder"

interface EditJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
  onSave: (data: {
    displayName: string
    cronExpression: string
    timeZoneId: string
    enabled: boolean
  }) => Promise<void>
}

export function EditJobDialog({
  open,
  onOpenChange,
  job,
  onSave,
}: EditJobDialogProps) {
  const [displayName, setDisplayName] = useState(job.displayName || job.jobId)
  const [cronExpression, setCronExpression] = useState(job.cronExpression)
  const [timeZoneId, setTimeZoneId] = useState(job.timeZoneId)
  const [enabled, setEnabled] = useState(job.enabled)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setDisplayName(job.displayName || job.jobId)
    setCronExpression(job.cronExpression)
    setTimeZoneId(job.timeZoneId)
    setEnabled(job.enabled)
    setErrors({})
    setSaving(false)
  }, [job, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!displayName.trim()) newErrors.displayName = "Display name is required"
    if (!cronExpression.trim())
      newErrors.cronExpression = "Cron expression is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({ displayName, cronExpression, timeZoneId, enabled })
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job Schedule</DialogTitle>
          <DialogDescription>
            Update the schedule and settings for this job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-display-name">
              Display Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Performance Sync"
            />
            {errors.displayName && (
              <p className="text-xs text-red-500">{errors.displayName}</p>
            )}
          </div>

          {/* Cron Expression */}
          <div className="space-y-2">
            <Label htmlFor="edit-cron">
              Cron Expression <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-cron"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 */2 * * *"
              className="font-mono"
            />
            <p className="text-xs text-slate-500">
              Cron format: minute hour day month weekday
            </p>
            <p className="text-xs text-slate-400">
              {'Example: 0 */2 * * * (every 2 hours)'}
            </p>
            {errors.cronExpression && (
              <p className="text-xs text-red-500">{errors.cronExpression}</p>
            )}
          </div>

          {/* Cron Builder */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label>Generate Cron Expression</Label>
              <p className="text-xs text-slate-500">
                Use this interface to generate cron expressions based on engine.
              </p>
            </div>
            <CronBuilder
              cronExpression={cronExpression}
              onChange={(newCron) => setCronExpression(newCron)}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="edit-timezone">Timezone</Label>
            <Select value={timeZoneId} onValueChange={setTimeZoneId}>
              <SelectTrigger id="edit-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Ho_Chi_Minh">
                  Asia/Ho_Chi_Minh
                </SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  America/Los_Angeles
                </SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enabled Switch */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label htmlFor="edit-enabled" className="cursor-pointer">
                Enabled
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Whether this job runs on schedule
              </p>
            </div>
            <Switch
              id="edit-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
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

