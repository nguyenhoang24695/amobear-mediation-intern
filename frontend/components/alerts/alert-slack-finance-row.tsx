"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SlackFinanceSnapshot } from "./alert-center-view-model"

const money2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function AlertSlackFinanceRow({
  fin,
  className,
}: {
  fin: SlackFinanceSnapshot
  className?: string
}) {
  const d = fin.ecpmDeltaPercent
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600", className)}>
      <span className="inline-flex items-center gap-1">
        <span>eCPM {money2.format(fin.ecpm)}</span>
        {d != null && d > 0 && (
          <TrendingUp className="w-3.5 h-3.5 shrink-0 text-green-600" aria-hidden />
        )}
        {d != null && d < 0 && (
          <TrendingDown className="w-3.5 h-3.5 shrink-0 text-red-600" aria-hidden />
        )}
        {d != null && d !== 0 && (
          <span className={d > 0 ? "text-green-700" : "text-red-700"}>{Math.abs(d).toFixed(1)}%</span>
        )}
      </span>
      <span>Cost {money2.format(fin.cost)}</span>
      <span>Revenue {money2.format(fin.revenue)}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium",
          fin.profit > 0 ? "text-green-700" : "text-red-700"
        )}
      >
        {fin.profit > 0 ? (
          <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
        )}
        Profit {money2.format(fin.profit)}
      </span>
    </div>
  )
}
