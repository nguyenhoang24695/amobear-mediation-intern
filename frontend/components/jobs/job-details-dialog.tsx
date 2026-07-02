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
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(92vw,42rem)] sm:max-w-[42rem]">
        <DialogHeader className="border-b border-border px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            View detailed information about this Hangfire job
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-6">
            {/* Job Name */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Job Name
              </label>
              <p className="mt-1 text-base font-semibold text-foreground">
                {job.displayName || job.jobId}
              </p>
            </div>

            <Separator />

            {/* Job ID & Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Job ID
                </label>
                <p className="mt-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-sm text-foreground break-all">
                  {job.jobId}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </label>
                <div className="mt-2">
                  {job.enabled ? (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="border-border bg-muted text-muted-foreground hover:bg-muted">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
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
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cron Expression
                </label>
                <p className="mt-1 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-sm text-foreground break-all">
                  {job.cronExpression}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Timezone
                  </label>
                  <p className="mt-1 text-sm text-foreground">
                    {job.timeZoneId}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Next Run Time
                  </label>
                  <p className="mt-1 text-sm font-medium text-foreground">
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
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Job Type
                      </label>
                      <p className="mt-1 break-all text-sm text-foreground">
                        {job.jobTypeName}
                      </p>
                    </div>
                  )}
                  {job.jobMethodName && (
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Method Name
                      </label>
                      <p className="mt-1 font-mono text-sm text-foreground break-all">
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
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created At
                </label>
                <p className="mt-1 text-sm text-foreground">
                  {format(createdAt, "PPpp")}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Updated At
                </label>
                <p className="mt-1 text-sm text-foreground">
                  {format(updatedAt, "PPpp")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

