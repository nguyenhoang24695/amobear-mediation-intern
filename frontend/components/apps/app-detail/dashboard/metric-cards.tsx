"use client"

import { AlertCircle, MousePointerClick, Timer, Users, UserPlus, WalletCards, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DashboardSummary } from "@/types/app-dashboard"
import { AdjustAdRevenueMissing, AdjustNotConfigured, FirebaseNotConfigured, QonversionNotConfigured } from "./empty-states"
import { formatCount, formatDecimal, formatMinutes, formatPercent, formatUsd } from "./format"

interface MetricCardsProps {
  summary: DashboardSummary | null
  loading: boolean
  error: Error | null
  onRetry: () => Promise<DashboardSummary>
}

const CARD_SKELETONS = Array.from({ length: 9 }, (_, index) => index)

export function MetricCards({ summary, loading, error, onRetry }: MetricCardsProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Could not load dashboard summary</p>
            <p className="mt-1 text-red-700">{error.message}</p>
          </div>
          <Button variant="outline" size="sm" className="bg-white" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARD_SKELETONS.map((item) => (
          <div key={item} className="h-[118px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-8 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-3 w-36 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  const metrics = summary?.metrics
  const warnings = new Set(summary?.meta.warnings ?? [])
  const cards = [
    {
      label: "Installs",
      value: formatCount(metrics?.installs),
      helper: "Adjust installs",
      icon: UserPlus,
    },
    {
      label: "New users",
      value: formatCount(metrics?.new_users),
      helper: "Firebase new users",
      icon: Users,
    },
    {
      label: "Install-to-open rate",
      value: formatPercent(metrics?.install_to_open_rate, 2),
      helper: "New users / installs",
      icon: MousePointerClick,
    },
    {
      label: "Users not opened",
      value: formatCount(metrics?.users_not_opened),
      helper: "Installs minus new users",
      icon: AlertCircle,
    },
    {
      label: "Total users",
      value: formatCount(metrics?.total_users),
      helper: "Firebase DAU total",
      icon: Users,
    },
    {
      label: "Returning users",
      value: formatCount(metrics?.returning_users),
      helper: "Total users minus new users",
      icon: Users,
    },
    {
      label: "Avg engagement time",
      value: formatMinutes(metrics?.avg_engagement_time_minutes),
      helper: "Per active user",
      icon: Timer,
    },
    {
      label: "Engaged sessions / user",
      value: formatDecimal(metrics?.engaged_sessions_per_user, 2),
      helper: "Sessions per active user",
      icon: MousePointerClick,
    },
    {
      label: "Total revenue",
      value: formatUsd(metrics?.total_revenue_usd),
      helper: "Adjust IAA + Qon IAP/SUB",
      icon: WalletCards,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {warnings.size > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {warnings.has("adjust_not_configured") ? <AdjustNotConfigured /> : null}
          {warnings.has("adjust_ad_revenue_missing") ? <AdjustAdRevenueMissing /> : null}
          {warnings.has("firebase_not_configured") ? <FirebaseNotConfigured /> : null}
          {warnings.has("qonversion_not_configured") ? <QonversionNotConfigured /> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 truncate text-xs text-slate-500">{helper}</p>
    </div>
  )
}
