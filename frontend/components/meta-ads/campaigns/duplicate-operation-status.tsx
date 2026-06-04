"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MetaCampaignDuplicateOperationDto } from "@/types/meta-ads"

function toTitleCase(value?: string | null) {
  if (!value) return "Unknown"
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getTone(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase()
  if (normalized === "completed") {
    return {
      icon: CheckCircle2,
      className: "border-green-200 bg-green-50 text-green-800",
      badgeClassName: "border-green-200 bg-green-100 text-green-700",
    }
  }

  if (normalized === "completed_with_errors") {
    return {
      icon: AlertTriangle,
      className: "border-amber-200 bg-amber-50 text-amber-800",
      badgeClassName: "border-amber-200 bg-amber-100 text-amber-700",
    }
  }

  if (normalized === "failed") {
    return {
      icon: AlertTriangle,
      className: "border-red-200 bg-red-50 text-red-800",
      badgeClassName: "border-red-200 bg-red-100 text-red-700",
    }
  }

  return {
    icon: Loader2,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    badgeClassName: "border-blue-200 bg-blue-100 text-blue-700",
  }
}

interface Props {
  operation: MetaCampaignDuplicateOperationDto
  className?: string
}

export function DuplicateOperationStatus({ operation, className }: Props) {
  const tone = getTone(operation.status)
  const Icon = tone.icon
  const latestLog = operation.logs[operation.logs.length - 1]
  const normalizedStatus = operation.status.trim().toLowerCase()
  const isRunning = normalizedStatus !== "failed" && normalizedStatus !== "completed" && normalizedStatus !== "completed_with_errors"
  const items = operation.items ?? []
  const requestedCopies = Math.max(1, operation.requestedCopies ?? items.length ?? 1)
  const completedCopies = operation.completedCopies ?? items.filter((item) => item.status.trim().toLowerCase() === "completed").length
  const failedCopies = operation.failedCopies ?? items.filter((item) => item.status.trim().toLowerCase() === "failed").length

  return (
    <div className={cn("rounded-lg border px-4 py-3", tone.className, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={cn("mt-0.5 h-4 w-4", isRunning && "animate-spin")} />
          <div className="space-y-1">
            <div className="text-sm font-semibold">Meta duplicate operation</div>
            <div className="text-sm">
              {operation.failureSummary ?? latestLog?.summaryMessage ?? "Meta is processing the duplicate request."}
            </div>
          </div>
        </div>
        <Badge className={cn("border", tone.badgeClassName)}>{toTitleCase(operation.status)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-current/80">
        <span>Operation #{operation.id}</span>
        <span>Correlation {operation.correlationId}</span>
        <span>{completedCopies}/{requestedCopies} completed</span>
        {failedCopies > 0 ? <span>{failedCopies} failed</span> : null}
        {operation.metaAsyncStatus ? <span>Meta {toTitleCase(operation.metaAsyncStatus)}</span> : null}
        {operation.newExternalCampaignId ? <span>Meta Campaign {operation.newExternalCampaignId}</span> : null}
      </div>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2 text-xs">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-current/15 bg-white/60 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 font-medium">
                  Copy {item.copyIndex}: <span className="break-all">{item.campaignName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("border text-[11px]", tone.badgeClassName)}>{toTitleCase(item.status)}</Badge>
                  {item.campaignId ? (
                    <ButtonLink campaignId={item.campaignId} />
                  ) : null}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-current/75">
                {item.externalCampaignId ? <span>Meta {item.externalCampaignId}</span> : null}
                {item.metaAsyncStatus ? <span>Batch {toTitleCase(item.metaAsyncStatus)}</span> : null}
              </div>
              {item.failureSummary ? <div className="mt-1 break-words text-red-700">{item.failureSummary}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ButtonLink({ campaignId }: { campaignId: number }) {
  return (
    <Link href={`/meta-ads/campaigns/${campaignId}`} className="inline-flex items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline">
      Open
      <ExternalLink className="h-3 w-3" />
    </Link>
  )
}
