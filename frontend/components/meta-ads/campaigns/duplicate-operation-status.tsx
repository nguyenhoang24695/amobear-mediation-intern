"use client"

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
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

  return (
    <div className={cn("rounded-lg border px-4 py-3", tone.className, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={cn("mt-0.5 h-4 w-4", operation.status.trim().toLowerCase() !== "failed" && operation.status.trim().toLowerCase() !== "completed" && "animate-spin")} />
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
        {operation.metaAsyncStatus ? <span>Meta {toTitleCase(operation.metaAsyncStatus)}</span> : null}
        {operation.newExternalCampaignId ? <span>Meta Campaign {operation.newExternalCampaignId}</span> : null}
      </div>
    </div>
  )
}
