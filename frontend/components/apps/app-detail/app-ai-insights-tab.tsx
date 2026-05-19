"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, isAfter, startOfDay, subDays } from "date-fns"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { AppDailyInsight, AppInsightHistoryDay } from "@/types/api"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecializedRoleInsightTab } from "./ai-insights/specialized-role-tab"
import { AutoGenerationSettings } from "./ai-insights/auto-generation-settings"

interface Props {
  /** Canonical AdMob app id (same as `/apps/[id]` route). */
  appId: string
  /** PostgreSQL app row id (used by specialized agents/report storage). */
  appRowId: number
  /** yyyy-MM-dd from URL */
  initialDateYmd?: string | null
}

export function AppAiInsightsTab({ appId, appRowId, initialDateYmd }: Props) {
  const { toast } = useToast()
  const [activeSubTab, setActiveSubTab] = useState<"summary" | "po" | "da" | "ua" | "med" | "dev" | "qa">("summary")
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
  const [insightHistory, setInsightHistory] = useState<AppInsightHistoryDay[]>([])
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null)

  const canView =
    hasScreenFunction("s-apps", "view-details") ||
    hasScreenFunction("s-apps", "view-details:ai-insight")
  const canRegenerate = hasScreenFunction("s-apps", "regenerate-insight")
  const canConfigureAuto = hasScreenFunction("s-apps", "configure-insight")

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const load = useCallback(async () => {
    if (!canView || !appId) return
    setLoading(true)
    try {
      const todayLocal = startOfDay(new Date())
      const historyFrom = format(subDays(todayLocal, 29), "yyyy-MM-dd")
      const historyTo = format(todayLocal, "yyyy-MM-dd")
      const [daily, history] = await Promise.all([
        insightApi.getDailyForApp(appId, dateStr),
        insightApi.getInsightHistory(appId, historyFrom, historyTo),
      ])
      setInsight(daily)
      setInsightHistory(history)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được insight", variant: "destructive" })
      setInsight(null)
      setInsightHistory([])
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
    const byDate = new Map<string, AppInsightHistoryDay>()
    for (const h of insightHistory) {
      byDate.set(h.insightDate, h)
    }
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i)
      const ymd = format(date, "yyyy-MM-dd")
      const h = byDate.get(ymd)
      return {
        date,
        score: h?.healthScore ?? null,
        anomalies: h?.anomalyCount ?? 0,
      }
    })
  }, [insightHistory, today])

  if (!canView) {
    return <p className="text-sm text-slate-500">Bạn không có quyền xem AI Insight.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {canConfigureAuto ? <AutoGenerationSettings appId={appId} /> : null}

    <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="w-full">
      <TabsList className="h-10 p-1 bg-slate-100 w-fit">
        <TabsTrigger value="summary" className="px-3 data-[state=active]:bg-white">
          Insight
        </TabsTrigger>
        <TabsTrigger value="po" className="px-3 data-[state=active]:bg-white">
          PO · Product Owner
        </TabsTrigger>
        <TabsTrigger value="da" className="px-3 data-[state=active]:bg-white">
          DA · Data Analyst
        </TabsTrigger>
        <TabsTrigger value="ua" className="px-3 data-[state=active]:bg-white">
          UA · UA Marketing
        </TabsTrigger>
        <TabsTrigger value="med" className="px-3 data-[state=active]:bg-white">
          MED · Mediation
        </TabsTrigger>
        <TabsTrigger value="dev" className="px-3 data-[state=active]:bg-white">
          DEV · DevOps
        </TabsTrigger>
        <TabsTrigger value="qa" className="px-3 data-[state=active]:bg-white">
          QA · QA
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-4">
        {regenerating ? (
          <InsightGeneratingState />
        ) : loading ? (
          <p className="text-sm text-slate-500 py-12 text-center">Đang tải insight…</p>
        ) : (() => {
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
                  <HistoricalInsightsCalendar data={historicalData} selectedDate={selectedDate} onDateClick={handleDateChange} />
                </div>
              )
            }

            if (failed) {
              return (
                <div className="flex flex-col gap-6">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-medium">Tạo insight thất bại</p>
                    <p className="mt-1">{insight.errorMessage ?? "Unknown error"}</p>
                    {canRegenerate ? (
                      <button type="button" className="mt-3 text-indigo-600 underline" onClick={() => void handleRegenerate()}>
                        Thử lại
                      </button>
                    ) : null}
                  </div>
                  <HistoricalInsightsCalendar data={historicalData} selectedDate={selectedDate} onDateClick={handleDateChange} />
                </div>
              )
            }

            const score = insight.healthScore ?? 0
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
                  <HealthRadarChart dimensionScores={insight.dimensionScores} healthTier={insight.healthTier} />
                )}

                <ViewToggleActionsBar viewMode={viewMode} onViewModeChange={setViewMode} content={insight.markdownBody} />

                {viewMode === "rendered" ? (
                  <InsightContentRendered content={insight.markdownBody} />
                ) : (
                  <InsightContentRaw content={insight.markdownBody} />
                )}

                <FeedbackSection feedbackGiven={feedbackGiven} onFeedback={setFeedbackGiven} />
                <HistoricalInsightsCalendar data={historicalData} selectedDate={selectedDate} onDateClick={handleDateChange} />
              </div>
            )
          })()}
      </TabsContent>

      <TabsContent value="po" className="mt-4">
        <SpecializedRoleInsightTab personaId="product_owner" personaLabel="PO insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
      <TabsContent value="da" className="mt-4">
        <SpecializedRoleInsightTab personaId="data_analyst" personaLabel="DA insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
      <TabsContent value="ua" className="mt-4">
        <SpecializedRoleInsightTab personaId="ua_marketing" personaLabel="UA insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
      <TabsContent value="med" className="mt-4">
        <SpecializedRoleInsightTab personaId="mediation" personaLabel="Mediation insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
      <TabsContent value="dev" className="mt-4">
        <SpecializedRoleInsightTab personaId="devops" personaLabel="DevOps insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
      <TabsContent value="qa" className="mt-4">
        <SpecializedRoleInsightTab personaId="qa" personaLabel="QA insight" appRowId={appRowId} initialDate={selectedDate} />
      </TabsContent>
    </Tabs>
    </div>
  )

}
