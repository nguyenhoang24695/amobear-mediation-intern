"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const tierConfig: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  A: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  B: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  C: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  D: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  F: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
}

interface HealthTierBadgeProps {
  tier: string | null | undefined
  className?: string
}

export function HealthTierBadge({ tier, className }: HealthTierBadgeProps) {
  if (!tier) return null

  const key = tier.toUpperCase().charAt(0)
  const config = tierConfig[key] ?? { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-xs px-2 py-0.5",
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {key}-Tier
    </Badge>
  )
}
