"use client"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { format, formatDistanceToNow } from "date-fns"
import type { ActivityLogDetail, ActivityLogListItem } from "@/lib/api/services"

interface ActivityLogDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: ActivityLogListItem | null
  log: ActivityLogDetail | null
  loading: boolean
  error: string | null
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return format(date, "PPpp")
}

function formatRelativeTime(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return formatDistanceToNow(date, { addSuffix: true })
}

function toJsonBlock(value: unknown) {
  if (value == null) return "No metadata"

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function statusBadgeClass(status?: string | null, severity?: string | null) {
  if (status === "failed" || severity === "error") {
    return "bg-red-100 text-red-700 hover:bg-red-100 border-red-200"
  }

  if (status === "pending") {
    return "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
  }

  return "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={mono ? "mt-1 break-all rounded bg-slate-50 px-2 py-1 font-mono text-sm text-slate-700" : "mt-1 text-sm text-slate-700"}>
        {value || "-"}
      </p>
    </div>
  )
}

export function ActivityLogDetailDialog({
  open,
  onOpenChange,
  preview,
  log,
  loading,
  error,
}: ActivityLogDetailDialogProps) {
  const displayLog = log
    ? {
        ...(preview ?? {}),
        ...log,
        startedAt: preview?.startedAt ?? log.startedAt,
        completedAt: preview?.completedAt ?? log.completedAt,
        eventCount: Math.max(preview?.eventCount ?? 0, log.eventCount ?? 0),
        milestones: preview?.milestones?.length ? preview.milestones : log.milestones,
      }
    : preview
  const detailLog = log

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Activity Log Detail</DialogTitle>
          <DialogDescription>
            Review the full context, target, and metadata for this system activity.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-2">
          {loading && !log ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-7 w-2/5" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : displayLog ? (
            <>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    {displayLog.domain}
                  </Badge>
                  <Badge variant="outline" className={statusBadgeClass(displayLog.status, displayLog.severity)}>
                    {displayLog.status}
                  </Badge>
                  {displayLog.targetType && (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      {displayLog.targetType}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{displayLog.summary}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(displayLog.occurredAt)}
                    {formatRelativeTime(displayLog.occurredAt) ? ` | ${formatRelativeTime(displayLog.occurredAt)}` : ""}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="Event Type" value={displayLog.eventType} mono />
                <DetailField label="Source" value={displayLog.source} />
                <DetailField label="Actor" value={displayLog.actorName || "System"} />
                <DetailField label="Actor Role" value={displayLog.actorRole} />
                <DetailField label="Target Name" value={displayLog.targetName} />
                <DetailField label="Target ID" value={displayLog.targetId} mono />
                <DetailField label="App ID" value={displayLog.appId?.toString()} mono />
                <DetailField label="Mediation Group ID" value={displayLog.mediationGroupId} mono />
                <DetailField label="Job Name" value={displayLog.jobName} mono />
                <DetailField label="Correlation ID" value={displayLog.correlationId} mono />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="Occurred At" value={formatDateTime(displayLog.occurredAt)} />
                <DetailField label="Started At" value={formatDateTime(displayLog.startedAt ?? displayLog.occurredAt)} />
                <DetailField label="Completed At" value={displayLog.completedAt ? formatDateTime(displayLog.completedAt) : "-"} />
                <DetailField label="Milestones" value={displayLog.eventCount?.toString()} />
                {detailLog ? <DetailField label="Recorded At" value={formatDateTime(detailLog.createdAt)} /> : null}
                {detailLog ? <DetailField label="Actor User ID" value={detailLog.actorUserId} mono /> : null}
                {detailLog ? <DetailField label="Organization ID" value={detailLog.organizationId} mono /> : null}
              </div>

              {displayLog.milestones.length > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Milestones</p>
                      <p className="text-xs text-slate-500">Timeline grouped into the selected activity row.</p>
                    </div>
                    <div className="space-y-2">
                      {displayLog.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{milestone.stage}</p>
                            <p className="text-xs text-slate-500">{formatDateTime(milestone.occurredAt)}</p>
                          </div>
                          <Badge variant="outline" className={statusBadgeClass(milestone.status, milestone.severity)}>
                            {milestone.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {detailLog && detailLog.refs.length > 0 ? (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Linked References</p>
                      <p className="text-xs text-slate-500">Additional entities attached to this activity record.</p>
                    </div>
                    <div className="space-y-2">
                      {detailLog.refs.map((ref) => (
                        <div
                          key={`${ref.refType}-${ref.refId}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {ref.refType}
                            </Badge>
                            <span className="text-sm font-medium text-slate-900">
                              {ref.refLabel || ref.refId}
                            </span>
                          </div>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500">{ref.refId}</p>
                          {ref.refKey && <p className="mt-1 text-xs text-slate-500">Key: {ref.refKey}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Metadata</p>
                  <p className="text-xs text-slate-500">Raw event payload captured for troubleshooting and audit.</p>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                  {toJsonBlock(displayLog.metadata)}
                </pre>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Select an activity log to see its details.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
