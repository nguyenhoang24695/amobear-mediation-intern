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
  if (creativeType === "EXISTING_POST" || creativeType === "EXISTING_CREATIVE") return null

  const spec = degreesOfFreedomSpec?.creativeFeaturesSpec

  const getStatusBadge = (status?: string | null) => {
    if (status === "OPT_IN") {
      return (
        <Badge variant="outline" className="border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          On
        </Badge>
      )
    }
    if (status === "OPT_OUT") {
      return (
        <Badge variant="outline" className="border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Off
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-dashed border-border bg-muted/30 px-2 py-0.5 text-[10px] italic text-muted-foreground">
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
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Advantage+ Creative
            <Badge variant="secondary" className="bg-blue-50 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300">
              Meta AI
            </Badge>
          </CardTitle>
          {hasConfig && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-muted-foreground">All optimizations:</span>
              {getStatusBadge(spec?.advantagePlusCreative?.enrollStatus)}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-[11px] text-muted-foreground">
            Creative-level settings saved for this campaign/request.
          </p>
          {sourceLabel && (
            <p className="text-[10px] font-medium text-muted-foreground">
              Source: {sourceLabel}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasConfig ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
            <p className="text-xs italic text-muted-foreground">
              {fallbackMessage || "Advantage+ Creative was not configured for this request."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feat) => (
              <div key={feat.label} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-2.5 transition-colors hover:bg-muted/50">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{feat.label}</p>
                  <p className="text-[10px] leading-normal text-muted-foreground">{feat.desc}</p>
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
