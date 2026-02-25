"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { formatNextRunTime } from "@/lib/utils/cron"
import type { Job } from "./job-management-content"

interface JobDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job | null
}

export function JobDetailsDialog({ open, onOpenChange, job }: JobDetailsDialogProps) {
  if (!job) return null

  const nextRunTime = formatNextRunTime(job.cronExpression, job.timeZoneId, job.enabled)
  const createdAt = new Date(job.createdAt)
  const updatedAt = new Date(job.updatedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            View detailed information about this Hangfire job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Name */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Job Name
            </label>
            <p className="text-base font-semibold text-slate-900 mt-1">
              {job.displayName || job.jobId}
            </p>
          </div>

          <Separator />

          {/* Job ID & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Job ID
              </label>
              <p className="text-sm font-mono text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded">
                {job.jobId}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Status
              </label>
              <div className="mt-2">
                {job.enabled ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                    Disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Cron Expression
              </label>
              <p className="text-sm font-mono text-slate-700 mt-1 bg-slate-50 px-2 py-1 rounded">
                {job.cronExpression}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Timezone
                </label>
                <p className="text-sm text-slate-700 mt-1">
                  {job.timeZoneId}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Next Run Time
                </label>
                <p className="text-sm text-slate-700 mt-1 font-medium">
                  {nextRunTime}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Type Information */}
          {(job.jobTypeName || job.jobMethodName) && (
            <>
              <div className="space-y-3">
                {job.jobTypeName && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Job Type
                    </label>
                    <p className="text-sm text-slate-700 mt-1 break-all">
                      {job.jobTypeName}
                    </p>
                  </div>
                )}
                {job.jobMethodName && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Method Name
                    </label>
                    <p className="text-sm font-mono text-slate-700 mt-1">
                      {job.jobMethodName}
                    </p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Timestamps */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Created At
              </label>
              <p className="text-sm text-slate-700 mt-1">
                {format(createdAt, "PPpp")}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Updated At
              </label>
              <p className="text-sm text-slate-700 mt-1">
                {format(updatedAt, "PPpp")}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

