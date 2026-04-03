"use client"

import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MetaCampaignDuplicateReadinessResultDto } from "@/types/meta-ads"

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
  if (normalized === "ready") {
    return {
      icon: CheckCircle2,
      className: "border-green-200 bg-green-50 text-green-800",
      badgeClassName: "border-green-200 bg-green-100 text-green-700",
    }
  }

  if (normalized === "warning") {
    return {
      icon: AlertTriangle,
      className: "border-amber-200 bg-amber-50 text-amber-800",
      badgeClassName: "border-amber-200 bg-amber-100 text-amber-700",
    }
  }

  return {
    icon: CircleDashed,
    className: "border-red-200 bg-red-50 text-red-800",
    badgeClassName: "border-red-200 bg-red-100 text-red-700",
  }
}

function getCheckTone(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase()
  if (normalized === "passed") {
    return {
      className: "border-green-200 bg-green-50 text-green-800",
      badgeClassName: "border-green-200 bg-green-100 text-green-700",
      messageClassName: "text-green-700",
      targetClassName: "text-green-600",
    }
  }

  if (normalized === "warning") {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      badgeClassName: "border-amber-200 bg-amber-100 text-amber-700",
      messageClassName: "text-amber-700",
      targetClassName: "text-amber-600",
    }
  }

  return {
    className: "border-red-200 bg-red-50 text-red-800",
    badgeClassName: "border-red-200 bg-red-100 text-red-700",
    messageClassName: "text-red-700",
    targetClassName: "text-red-600",
  }
}

interface Props {
  readiness: MetaCampaignDuplicateReadinessResultDto
  className?: string
}

export function DuplicateReadinessStatus({ readiness, className }: Props) {
  const tone = getTone(readiness.status)
  const Icon = tone.icon

  return (
    <div className={cn("rounded-lg border px-4 py-3", tone.className, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4" />
          <div className="space-y-1">
            <div className="text-sm font-semibold">Duplicate readiness</div>
            <div className="text-sm">{readiness.summary}</div>
          </div>
        </div>
        <Badge className={cn("border", tone.badgeClassName)}>{toTitleCase(readiness.status)}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.checks.map((check) => {
          const checkTone = getCheckTone(check.status)

          return (
            <div key={check.key} className={cn("rounded-md border px-3 py-2 text-sm", checkTone.className)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{check.label}</div>
                <Badge className={cn("border", checkTone.badgeClassName)}>{toTitleCase(check.status)}</Badge>
              </div>
              <div className={cn("mt-1", checkTone.messageClassName)}>{check.message}</div>
              {check.targetId ? <div className={cn("mt-1 text-xs", checkTone.targetClassName)}>Target {check.targetId}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
