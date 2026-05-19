"use client"

import type React from "react"
import {
  Gift,
  Globe,
  LayoutGrid,
  RectangleHorizontal,
  Smartphone,
  Square,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CountryFlagTooltipCell } from "@/components/shared/country-display"

/** Mini mapping network → emoji / màu — đồng bộ tab Mediation Groups deprecated & bronze. */
const networkLogos: Record<string, { emoji?: string; color: string }> = {
  admob: { emoji: "📱", color: "bg-yellow-400" },
  "ca-app-pub": { emoji: "📱", color: "bg-yellow-400" },
  unity: { emoji: "🎮", color: "bg-slate-800" },
  ironsource: { emoji: "⚡", color: "bg-purple-600" },
  applovin: { emoji: "🔴", color: "bg-red-500" },
  vungle: { emoji: "💎", color: "bg-blue-500" },
  meta: { emoji: "📘", color: "bg-blue-600" },
  facebook: { emoji: "📘", color: "bg-blue-600" },
  chartboost: { emoji: "📊", color: "bg-green-500" },
  mintegral: { emoji: "🌐", color: "bg-orange-500" },
  pangle: { emoji: "🇨🇳", color: "bg-red-600" },
  adcolony: { emoji: "🏢", color: "bg-indigo-500" },
  tapjoy: { emoji: "🎯", color: "bg-pink-500" },
}

const networkColors: Record<string, string> = {
  admob: "bg-yellow-400",
  "ca-app-pub": "bg-yellow-400",
  unity: "bg-slate-800",
  ironsource: "bg-purple-600",
  applovin: "bg-red-500",
  vungle: "bg-blue-500",
  meta: "bg-blue-600",
  facebook: "bg-blue-600",
}

const formatIcons: Record<string, React.ElementType> = {
  BANNER: RectangleHorizontal,
  INTERSTITIAL: Square,
  REWARDED: Gift,
  REWARDED_INTERSTITIAL: Gift,
  NATIVE: LayoutGrid,
  APP_OPEN: Smartphone,
  Banner: RectangleHorizontal,
  Interstitial: Square,
  Rewarded: Gift,
  Native: LayoutGrid,
  "App Open": Smartphone,
}

const formatColors: Record<string, string> = {
  BANNER: "bg-blue-50 text-blue-700 border-blue-200",
  INTERSTITIAL: "bg-purple-50 text-purple-700 border-purple-200",
  REWARDED: "bg-amber-50 text-amber-700 border-amber-200",
  REWARDED_INTERSTITIAL: "bg-amber-50 text-amber-700 border-amber-200",
  NATIVE: "bg-green-50 text-green-700 border-green-200",
  APP_OPEN: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Banner: "bg-blue-50 text-blue-700 border-blue-200",
  Interstitial: "bg-purple-50 text-purple-700 border-purple-200",
  Rewarded: "bg-amber-50 text-amber-700 border-amber-200",
  Native: "bg-green-50 text-green-700 border-green-200",
  "App Open": "bg-cyan-50 text-cyan-700 border-cyan-200",
}

export function formatAdFormatDisplay(format?: string | null): string {
  if (!format) return "Unknown"
  return format
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function getMediationNetworkDisplayName(adSourceId?: string | null, title?: string | null): string {
  if (title) return title
  if (!adSourceId) return "Unknown"
  const idLower = adSourceId.toLowerCase()
  if (idLower.includes("admob") || idLower.includes("ca-app-pub")) return "AdMob"
  if (idLower.includes("unity")) return "Unity Ads"
  if (idLower.includes("ironsource")) return "ironSource"
  if (idLower.includes("applovin")) return "AppLovin"
  if (idLower.includes("vungle")) return "Vungle"
  if (idLower.includes("meta") || idLower.includes("facebook")) return "Meta AN"
  return adSourceId
}

export function getMediationNetworkBadge(adSourceId?: string | null): { emoji?: string; color: string; name: string } {
  if (!adSourceId) {
    return { color: "bg-slate-400", name: "Unknown" }
  }
  const idLower = adSourceId.toLowerCase()
  for (const [key, info] of Object.entries(networkLogos)) {
    if (idLower.includes(key.toLowerCase())) {
      return { emoji: info.emoji, color: info.color, name: getMediationNetworkDisplayName(adSourceId) }
    }
  }
  for (const [key, color] of Object.entries(networkColors)) {
    if (idLower.includes(key.toLowerCase())) {
      return { color, name: getMediationNetworkDisplayName(adSourceId) }
    }
  }
  return { color: "bg-slate-400", name: getMediationNetworkDisplayName(adSourceId) }
}

export interface AdSourceInfoLike {
  adSourceId: string
  title?: string | null
}

export function MediationGroupFormatBadge({ format }: { format?: string | null }) {
  const f = format || "Unknown"
  const FormatIcon = formatIcons[f] ?? RectangleHorizontal
  const formatDisplay = formatAdFormatDisplay(f)
  return (
    <Badge variant="outline" className={cn("gap-1", formatColors[f] || formatColors.BANNER)}>
      <FormatIcon className="w-3 h-3" />
      {formatDisplay}
    </Badge>
  )
}

export function MediationGroupAdSourcesCell({ adSourcesInfo }: { adSourcesInfo: readonly AdSourceInfoLike[] }) {
  const list = adSourcesInfo ?? []
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-slate-600">{list.length}</span>
      {list.length > 0 && (
        <div className="flex items-center -space-x-1 ml-1">
          {list.slice(0, 4).map((adSource, idx) => {
            const networkInfo = getMediationNetworkBadge(adSource.adSourceId)
            const displayName = getMediationNetworkDisplayName(adSource.adSourceId, adSource.title)
            return (
              <Tooltip key={`${adSource.adSourceId}-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-6 h-6 rounded-sm border-2 border-white flex items-center justify-center text-xs",
                      networkInfo.color,
                      !networkInfo.emoji && "bg-slate-400",
                    )}
                    title={displayName}
                  >
                    {networkInfo.emoji ? (
                      <span>{networkInfo.emoji}</span>
                    ) : (
                      <span className="text-white font-semibold text-[10px]">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-slate-400">{adSource.adSourceId}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
          {list.length > 4 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-sm bg-slate-200 border-2 border-white flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-slate-600">+{list.length - 4}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="space-y-1">
                  {list.slice(4).map((adSource, idx) => (
                    <p key={idx} className="text-sm">
                      {getMediationNetworkDisplayName(adSource.adSourceId, adSource.title)}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

/** Targeting theo country từ metrics (bronze) hoặc PG — Global khi không có hoặc quá nhiều region. */
export function MediationGroupTargetingCell({
  countries,
  globalThreshold = 10,
}: {
  countries?: readonly string[] | null
  /** Số country tối đa để coi là targeted cụ thể; trên ngưỡng hiển thị Global (giống tab deprecated). */
  globalThreshold?: number
}) {
  const list = countries ?? []
  const isGlobal = list.length === 0 || list.length > globalThreshold

  if (isGlobal) {
    return (
      <div className="flex items-center gap-1 text-sm text-slate-600">
        <Globe className="w-4 h-4 shrink-0" aria-hidden />
        Global
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {list.slice(0, 8).map((countryCode, idx) => (
        <CountryFlagTooltipCell key={`${countryCode}-${idx}`} code={countryCode} />
      ))}
      {list.length > 8 ? <span className="ml-0.5 text-xs text-slate-500">+{list.length - 8}</span> : null}
    </div>
  )
}
