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
      className: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-50",
      badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200",
    }
  }

  if (normalized === "warning") {
    return {
      icon: AlertTriangle,
      className: "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-50",
      badgeClassName: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/40 dark:text-amber-200",
    }
  }

  return {
    icon: CircleDashed,
    className: "border-rose-200/80 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-50",
    badgeClassName: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/60 dark:bg-rose-900/40 dark:text-rose-200",
  }
}

function getCheckTone(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase()
  if (normalized === "passed") {
    return {
      className: "border-emerald-200/90 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-50",
      badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200",
      messageClassName: "text-emerald-800 dark:text-emerald-200",
      targetClassName: "text-emerald-700 dark:text-emerald-300",
    }
  }

  if (normalized === "warning") {
    return {
      className: "border-amber-200/90 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-50",
      badgeClassName: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/40 dark:text-amber-200",
      messageClassName: "text-amber-800 dark:text-amber-200",
      targetClassName: "text-amber-700 dark:text-amber-300",
    }
  }

  return {
    className: "border-rose-200/90 bg-rose-50/70 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-50",
    badgeClassName: "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/60 dark:bg-rose-900/40 dark:text-rose-200",
    messageClassName: "text-rose-800 dark:text-rose-200",
    targetClassName: "text-rose-700 dark:text-rose-300",
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
    <div className={cn("rounded-2xl border px-4 py-4 shadow-sm", tone.className, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-current/15 bg-background/70 p-1.5 shadow-sm">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold tracking-tight">Duplicate readiness</div>
            <div className="max-w-2xl text-sm leading-5 text-current/90">{readiness.summary}</div>
          </div>
        </div>
        <Badge className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", tone.badgeClassName)}>{toTitleCase(readiness.status)}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {readiness.checks.map((check) => {
          const checkTone = getCheckTone(check.status)

          return (
            <div key={check.key} className={cn("rounded-xl border px-3 py-2.5 text-sm shadow-sm", checkTone.className)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{check.label}</div>
                <Badge className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", checkTone.badgeClassName)}>{toTitleCase(check.status)}</Badge>
              </div>
              <div className={cn("mt-1 text-sm leading-5", checkTone.messageClassName)}>{check.message}</div>
              {check.targetId ? <div className={cn("mt-1 text-xs font-medium", checkTone.targetClassName)}>Target {check.targetId}</div> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
