"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, TrendingUp, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { insightApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { InsightAnomaly } from "@/types/api"

interface HealthScoreBannerProps {
  score: number
  healthTier?: string | null
  anomalies: InsightAnomaly[]
  insightId?: number
}

const getScoreConfig = (score: number) => {
  if (score >= 80) {
    return {
      bg: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      text: "text-emerald-50",
      label: "Excellent",
      labelBg: "bg-emerald-400/30",
    }
  }
  if (score >= 60) {
    return {
      bg: "bg-gradient-to-r from-blue-500 to-blue-600",
      text: "text-blue-50",
      label: "Good",
      labelBg: "bg-blue-400/30",
    }
  }
  if (score >= 40) {
    return {
      bg: "bg-gradient-to-r from-amber-500 to-amber-600",
      text: "text-amber-50",
      label: "Needs Attention",
      labelBg: "bg-amber-400/30",
    }
  }
  return {
    bg: "bg-gradient-to-r from-red-500 to-red-600",
    text: "text-red-50",
    label: "Critical",
    labelBg: "bg-red-400/30",
  }
}

export function HealthScoreBanner({ score, healthTier, anomalies, insightId }: HealthScoreBannerProps) {
  const config = getScoreConfig(score)
  const critical = anomalies.filter((a) => a.severity === "critical")
  const warning = anomalies.filter((a) => a.severity === "warning")
  const router = useRouter()
  const { toast } = useToast()
  const [investigating, setInvestigating] = useState(false)

  const handleInvestigate = async () => {
    if (!insightId || investigating) return
    setInvestigating(true)
    try {
      const result = await insightApi.investigate(insightId)
      router.push(`/ai-assistant?conversationId=${result.conversationId}`)
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to start investigation", variant: "destructive" })
    } finally {
      setInvestigating(false)
    }
  }

  const hasAnomalies = critical.length > 0 || warning.length > 0

  return (
    <Card className={cn("p-6 border-0 shadow-lg", config.bg)}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/20" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
                className="text-white"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", config.text)}>{score}</span>
              <span className={cn("text-xs", config.text, "opacity-80")}>/ 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn(config.labelBg, config.text, "border-0")}>{config.label}</Badge>
              {healthTier ? (
                <Badge variant="outline" className={cn("border-white/40", config.text)}>
                  Tier {healthTier}
                </Badge>
              ) : null}
            </div>
            <p className={cn("mt-2 text-sm max-w-md", config.text, "opacity-90")}>
              Điểm tổng hợp từ rule-based anomalies và snapshot Gold (MVP). AI có thể điều chỉnh diễn giải trong nội dung bên dưới.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-end gap-3">
          <div className="flex flex-wrap gap-2 justify-end">
            {critical.map((a, i) => (
              <Badge
                key={`c-${i}`}
                variant="secondary"
                className="bg-red-950/30 text-white border-red-200/30 gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {a.label}
              </Badge>
            ))}
            {warning.map((a, i) => (
              <Badge
                key={`w-${i}`}
                variant="secondary"
                className="bg-amber-950/20 text-white border-amber-200/30 gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {a.label}
              </Badge>
            ))}
            {anomalies
              .filter((a) => a.severity === "positive")
              .map((a, i) => (
                <Badge key={`p-${i}`} variant="secondary" className="bg-emerald-950/20 text-white border-emerald-200/30 gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {a.label}
                </Badge>
              ))}
          </div>

          {insightId && hasAnomalies ? (
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5"
              onClick={handleInvestigate}
              disabled={investigating}
            >
              {investigating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {investigating ? "Investigating…" : "Investigate with AI"}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
