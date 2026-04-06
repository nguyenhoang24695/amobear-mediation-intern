"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, isAfter, startOfDay, subDays } from "date-fns"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { AppDailyInsight } from "@/types/api"
import { InsightHeader } from "./ai-insights/insight-header"
import { HealthScoreBanner } from "./ai-insights/health-score-banner"
import { ViewToggleActionsBar } from "./ai-insights/view-toggle-actions-bar"
import { InsightContentRendered } from "./ai-insights/insight-content-rendered"
import { InsightContentRaw } from "./ai-insights/insight-content-raw"
import { FeedbackSection } from "./ai-insights/feedback-section"
import { HistoricalInsightsCalendar } from "./ai-insights/historical-insights-calendar"
import { NoInsightState } from "./ai-insights/no-insight-state"
import { InsightGeneratingState } from "./ai-insights/insight-generating-state"
import { HealthRadarChart } from "./ai-insights/health-radar-chart"

interface Props {
  /** Canonical AdMob app id (same as `/apps/[id]` route). */
  appId: string
  /** yyyy-MM-dd from URL */
  initialDateYmd?: string | null
}

function extractSectionIds(markdown: string): { id: string; title: string }[] {
  const lines = markdown.split("\n")
  const out: { id: string; title: string }[] = []
  for (const line of lines) {
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim()
      const id = title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
      out.push({ id, title })
    }
  }
  return out
}

export function AppAiInsightsTab({ appId, initialDateYmd }: Props) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered")
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDateYmd && /^\d{4}-\d{2}-\d{2}$/.test(initialDateYmd)) {
      const [y, m, d] = initialDateYmd.split("-").map(Number)
      return new Date(y, m - 1, d)
    }
    return subDays(startOfDay(new Date()), 1)
  })
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [insight, setInsight] = useState<AppDailyInsight | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null)

  const canView = hasScreenFunction("s-apps", "view-ai-insight") || hasScreenFunction("s-apps", "view-details")
  const canRegenerate = hasScreenFunction("s-apps", "regenerate-insight")

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const load = useCallback(async () => {
    if (!canView || !appId) return
    setLoading(true)
    try {
      const [daily, dates] = await Promise.all([
        insightApi.getDailyForApp(appId, dateStr),
        insightApi.getAvailableDates(
          appId,
          format(subDays(new Date(), 90), "yyyy-MM-dd"),
          format(new Date(), "yyyy-MM-dd"),
        ),
      ])
      setInsight(daily)
      setAvailableDates(dates)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được insight", variant: "destructive" })
      setInsight(null)
    } finally {
      setLoading(false)
    }
  }, [appId, dateStr, canView, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (initialDateYmd && /^\d{4}-\d{2}-\d{2}$/.test(initialDateYmd)) {
      const [y, m, d] = initialDateYmd.split("-").map(Number)
      setSelectedDate(new Date(y, m - 1, d))
    }
  }, [initialDateYmd])

  const today = startOfDay(new Date())
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")

  const handleDateChange = (newDate: Date) => {
    if (isAfter(startOfDay(newDate), today)) return
    setSelectedDate(newDate)
  }

  const handleRegenerate = async () => {
    if (!canRegenerate) {
      toast({ title: "Không có quyền regenerate", variant: "destructive" })
      return
    }
    setRegenerating(true)
    try {
      await insightApi.regenerate(appId, dateStr)
      toast({ title: "Đã tạo lại insight", description: "Dữ liệu đã được cập nhật." })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Regenerate thất bại", variant: "destructive" })
    } finally {
      setRegenerating(false)
    }
  }

  const historicalData = useMemo(() => {
    const set = new Set(availableDates)
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i)
      const ymd = format(date, "yyyy-MM-dd")
      const has = set.has(ymd)
      return {
        date,
        score: has ? 72 : null,
        anomalies: 0,
      }
    })
  }, [availableDates, today])

  if (!canView) {
    return <p className="text-sm text-slate-500">Bạn không có quyền xem AI Insight.</p>
  }

  if (regenerating) {
    return <InsightGeneratingState />
  }

  if (loading) {
    return <p className="text-sm text-slate-500 py-12 text-center">Đang tải insight…</p>
  }

  const missing = !insight || insight.status === "missing"
  const failed = insight?.status === "failed"

  if (missing) {
    return (
      <div className="flex flex-col gap-6">
        <InsightHeader
          selectedDate={selectedDate}
          onPrevDay={() => handleDateChange(subDays(selectedDate, 1))}
          onNextDay={() => {
            const n = addDays(selectedDate, 1)
            if (!isAfter(startOfDay(n), today)) handleDateChange(n)
          }}
          onDateSelect={handleDateChange}
          isToday={isToday}
          generatedAt={null}
          generationTime={null}
          model={null}
          onRegenerate={handleRegenerate}
        />
        <NoInsightState
          reason="Chưa có insight cho ngày này. Chạy regenerate hoặc đợi job daily (T-1)."
          onGenerate={canRegenerate ? handleRegenerate : undefined}
        />
        <HistoricalInsightsCalendar
          data={historicalData}
          selectedDate={selectedDate}
          onDateClick={handleDateChange}
        />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Tạo insight thất bại</p>
        <p className="mt-1">{insight.errorMessage ?? "Unknown error"}</p>
        {canRegenerate ? (
          <button type="button" className="mt-3 text-indigo-600 underline" onClick={() => void handleRegenerate()}>
            Thử lại
          </button>
        ) : null}
      </div>
    )
  }

  const score = insight.healthScore ?? 0
  const sections = extractSectionIds(insight.markdownBody || "")
  const generatedAt = insight.updatedAt ?? insight.createdAt ?? null

  return (
    <div className="flex flex-col gap-6">
      <InsightHeader
        selectedDate={selectedDate}
        onPrevDay={() => handleDateChange(subDays(selectedDate, 1))}
        onNextDay={() => {
          const n = addDays(selectedDate, 1)
          if (!isAfter(startOfDay(n), today)) handleDateChange(n)
        }}
        onDateSelect={handleDateChange}
        isToday={isToday}
        generatedAt={generatedAt}
        generationTime={insight.metadata?.latencyMs ? insight.metadata.latencyMs / 1000 : null}
        model={insight.metadata?.model ?? insight.metadata?.provider ?? null}
        onRegenerate={handleRegenerate}
      />

      <HealthScoreBanner score={score} healthTier={insight.healthTier} anomalies={insight.anomalies ?? []} insightId={insight.id} />

      {insight.dimensionScores && (
        <HealthRadarChart
          dimensionScores={insight.dimensionScores}
          healthTier={insight.healthTier}
        />
      )}

      <ViewToggleActionsBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sections={sections}
        content={insight.markdownBody}
      />

      {viewMode === "rendered" ? (
        <InsightContentRendered content={insight.markdownBody} />
      ) : (
        <InsightContentRaw content={insight.markdownBody} />
      )}

      <FeedbackSection feedbackGiven={feedbackGiven} onFeedback={setFeedbackGiven} />

      <HistoricalInsightsCalendar data={historicalData} selectedDate={selectedDate} onDateClick={handleDateChange} />
    </div>
  )
}
