"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingUp } from "lucide-react"
import type { UserQuota } from "./ai-assistant-content"
import Link from "next/link"

interface QuotaStatusBarProps {
  quota: UserQuota
  provider: "claude" | "gemini" | "chatgpt"
}

const providerLabels = {
  claude: "Claude",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
}

const providerColors = {
  claude: "text-amber-600",
  gemini: "text-blue-600",
  chatgpt: "text-emerald-600",
}

export function QuotaStatusBar({ quota, provider }: QuotaStatusBarProps) {
  const dailyPercentage = (quota.dailyTokensUsed / quota.dailyTokensLimit) * 100
  const isWarning = dailyPercentage >= 60
  const isCritical = dailyPercentage >= 90

  return (
    <div className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-sm">
      <div className="flex items-center gap-6">
        {/* Quota Progress */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Quota:</span>
          <div className="flex items-center gap-2">
            <Progress
              value={dailyPercentage}
              className={cn(
                "w-24 h-2",
                isCritical
                  ? "[&>div]:bg-red-500"
                  : isWarning
                  ? "[&>div]:bg-amber-500"
                  : "[&>div]:bg-blue-500"
              )}
            />
            <span
              className={cn(
                "font-medium",
                isCritical
                  ? "text-red-600"
                  : isWarning
                  ? "text-amber-600"
                  : "text-slate-700"
              )}
            >
              {(quota.dailyTokensUsed / 1000).toFixed(0)}K/{(quota.dailyTokensLimit / 1000).toFixed(0)}K tokens today
            </span>
          </div>
        </div>

        {/* Provider */}
        <div className="flex items-center gap-1">
          <span className={cn("font-medium", providerColors[provider])}>
            {providerLabels[provider]}
          </span>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-1 text-slate-500">
          <span>${quota.dailyCostUsed.toFixed(2)}/${quota.dailyCostLimit.toFixed(2)}</span>
        </div>

        {/* Warning */}
        {quota.warning && (
          <div className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">{quota.warning}</span>
          </div>
        )}
      </div>

      {/* Usage link */}
      <Link
        href="/ai-assistant/usage"
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
      >
        <TrendingUp className="h-3 w-3" />
        View Usage
      </Link>
    </div>
  )
}
