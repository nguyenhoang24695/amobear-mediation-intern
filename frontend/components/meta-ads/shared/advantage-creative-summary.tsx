"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import type { MetaDegreesOfFreedomSpecDto, MetaCreativeType } from "@/types/meta-ads"

interface AdvantageCreativeSummaryProps {
  degreesOfFreedomSpec?: MetaDegreesOfFreedomSpecDto | null
  creativeType?: MetaCreativeType | null
  sourceLabel?: string | null
  fallbackMessage?: string | null
}

export function AdvantageCreativeSummary({
  degreesOfFreedomSpec,
  creativeType,
  sourceLabel,
  fallbackMessage,
}: AdvantageCreativeSummaryProps) {
  if (creativeType === "EXISTING_POST") return null

  const spec = degreesOfFreedomSpec?.creativeFeaturesSpec

  const getStatusBadge = (status?: string | null) => {
    if (status === "OPT_IN") {
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-semibold px-2 py-0.5 text-[10px]">
          On
        </Badge>
      )
    }
    if (status === "OPT_OUT") {
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500 font-medium px-2 py-0.5 text-[10px]">
          Off
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-slate-100 bg-slate-50/50 text-slate-400 italic px-2 py-0.5 text-[10px]">
        Not configured
      </Badge>
    )
  }

  const features = [
    { label: "Add overlays", status: spec?.addTextOverlay?.enrollStatus, desc: "Add text overlays, like price or rating, automatically" },
    { label: "Visual touch-ups", status: spec?.imageTouchups?.enrollStatus, desc: "Adjust brightness, contrast, or apply visual templates" },
    { label: "Add music", status: spec?.musicGeneration?.enrollStatus, desc: "Generate background music matching your image or video" },
    { label: "Text improvements", status: spec?.textOptimizations?.enrollStatus, desc: "Swap primary text and headlines to boost response rate" },
    { label: "Add animation", status: spec?.imageAnimation?.enrollStatus, desc: "Create subtle motion effects on static image assets" },
    { label: "Add details to ad layout", status: spec?.inlineComment?.enrollStatus, desc: "Display relevant social comments under the ad" },
  ]

  const hasConfig = !!spec

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Advantage+ Creative
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[9px] hover:bg-blue-50 font-semibold uppercase tracking-wider px-1.5 py-0">
              Meta AI
            </Badge>
          </CardTitle>
          {hasConfig && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-slate-500 font-medium">All optimizations:</span>
              {getStatusBadge(spec?.advantagePlusCreative?.enrollStatus)}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-[11px] text-slate-400">
            Creative-level settings saved for this campaign/request.
          </p>
          {sourceLabel && (
            <p className="text-[10px] text-slate-500 font-medium">
              Source: {sourceLabel}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasConfig ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 italic">
              {fallbackMessage || "Advantage+ Creative was not configured for this request."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feat) => (
              <div key={feat.label} className="flex items-start justify-between gap-4 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700">{feat.label}</p>
                  <p className="text-[10px] text-slate-400 leading-normal">{feat.desc}</p>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(feat.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
