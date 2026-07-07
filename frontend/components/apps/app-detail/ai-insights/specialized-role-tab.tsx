"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, isAfter, startOfDay, subDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { InsightHeader } from "./insight-header"
import { InsightGeneratingState } from "./insight-generating-state"
import { NoInsightState } from "./no-insight-state"
import { ViewToggleActionsBar } from "./view-toggle-actions-bar"
import { InsightContentRendered } from "./insight-content-rendered"
import { InsightContentRaw } from "./insight-content-raw"
import {
  generatePersonaDigest,
  getPersonaReportDetail,
  listPersonaReports,
} from "@/lib/api/specialized-insights"
import { PersonaContextEditor } from "./persona-context-editor"
import { PersonaChatPanel } from "./persona-chat-panel"
import { HistoricalInsightsCalendar } from "./historical-insights-calendar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Props = {
  personaId: string
  personaLabel: string
  appRowId: number
  initialDate?: Date
}

function extractDigestMarkdown(payloadJson: string): string | null {
  try {
    const obj = JSON.parse(payloadJson) as any
    const md = obj?.digestMarkdown
    return typeof md === "string" ? md : null
  } catch {
    return null
  }
}

function extractRecommendationBullets(markdown: string | null): string[] {
  if (!markdown) return []
  const blocks = [
    markdown.match(/##\s*(Recommendations|Khuyến nghị|Đề xuất)[\s\S]*?(?=\n##\s|\s*$)/i)?.[0] ?? "",
    markdown.match(/##\s*(Quyết định\s*\/\s*Ưu tiên|Quyết định|Ưu tiên)[\s\S]*?(?=\n##\s|\s*$)/i)?.[0] ?? "",
  ]
  const items = blocks
    .flatMap((b) => b.split("\n").slice(1))
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
  const dedup = Array.from(new Set(items))
  return dedup.slice(0, 8)
}

export function SpecializedRoleInsightTab({ personaId, personaLabel, appRowId, initialDate }: Props) {
  const { toast } = useToast()
  const today = startOfDay(new Date())
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered")
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate ?? subDays(today, 1))
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [history, setHistory] = useState<{ reportDate: string; healthScore?: number | null }[]>([])
  const [suggestedDraft, setSuggestedDraft] = useState<string | null>(null)
  const [showGoTop, setShowGoTop] = useState(false)
  const dateStr = format(selectedDate, "yyyy-MM-dd")

  const handleDateChange = (newDate: Date) => {
    if (isAfter(startOfDay(newDate), today)) return
    setSelectedDate(newDate)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const historyTo = format(today, "yyyy-MM-dd")
      const historyFrom = format(subDays(today, 29), "yyyy-MM-dd")
      const [list, historyRes] = await Promise.all([
        listPersonaReports(personaId, appRowId, { date: dateStr }),
        listPersonaReports(personaId, appRowId, { from: historyFrom, to: historyTo }),
      ])
      setHistory(historyRes.items.map((x) => ({ reportDate: x.reportDate, healthScore: x.healthScore })))

      const report = list.items[0]
      if (!report) {
        setMarkdown(null)
        setReportId(null)
        return
      }
      const detail = await getPersonaReportDetail(personaId, report.id)
      setMarkdown(extractDigestMarkdown(detail.payloadJson))
      setReportId(report.id)
    } catch (e) {
      console.error(e)
      toast({ title: `Không tải được ${personaLabel} insight`, variant: "destructive" })
      setMarkdown(null)
      setReportId(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [appRowId, dateStr, personaId, personaLabel, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onScroll = () => setShowGoTop(window.scrollY > 600)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await generatePersonaDigest(personaId, appRowId, dateStr)
      toast({ title: `Đã generate ${personaLabel}`, description: `Ngày ${dateStr}` })
      await load()
      if (res.digestMarkdown?.trim()) {
        setMarkdown(res.digestMarkdown)
        setReportId(res.reportId)
      }
    } catch (e) {
      console.error(e)
      toast({ title: `Generate ${personaLabel} thất bại`, variant: "destructive" })
    } finally {
      setRegenerating(false)
    }
  }

  const missing = !markdown || markdown.trim().length === 0

  const generatedAt = useMemo(() => null, [])

  const quickQuestionRows = useMemo(() => {
    const recs = extractRecommendationBullets(markdown)
    return recs.slice(0, 8).map((r) => {
      const prompt = `Deep-dive: ${r}\n\nHãy dùng MCP/SQL để chứng minh bằng số liệu (funnel/core loop/retention) và đưa ra next steps.`
      return { title: r, prompt }
    })
  }, [markdown])

  const historyEntries = useMemo(() => {
    const byDate = new Map<string, { score: number | null; hasReport: boolean }>()
    for (const h of history) {
      byDate.set(h.reportDate, { score: h.healthScore ?? null, hasReport: true })
    }
    const days: { date: Date; score: number | null; anomalies: number; hasReport?: boolean }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i)
      const ymd = format(d, "yyyy-MM-dd")
      const hit = byDate.get(ymd)
      days.push({
        date: d,
        score: hit?.score ?? null,
        anomalies: 0,
        hasReport: hit?.hasReport ?? false,
      })
    }
    return days
  }, [history, today])

  if (regenerating) {
    return <InsightGeneratingState />
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Đang tải {personaLabel}…</p>
  }

  const commonContent = (
    <>
      <InsightHeader
        selectedDate={selectedDate}
        onPrevDay={() => handleDateChange(subDays(selectedDate, 1))}
        onNextDay={() => {
          const n = addDays(selectedDate, 1)
          if (!isAfter(startOfDay(n), today)) handleDateChange(n)
        }}
        onDateSelect={handleDateChange}
        isToday={format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")}
        generatedAt={generatedAt}
        generationTime={null}
        model={null}
        onRegenerate={handleRegenerate}
      />

      <HistoricalInsightsCalendar data={historyEntries} selectedDate={selectedDate} onDateClick={handleDateChange} />

      <Accordion type="single" collapsible defaultValue="chat" className="w-full">
        <AccordionItem value="context" className="rounded-md border border-border bg-card">
          <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">Context</span>
              <Badge variant="secondary" className="text-xs">
                collapse/expand
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <PersonaContextEditor appRowId={appRowId} personaId={personaId} personaLabel={personaLabel} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="chat" className="mt-3 rounded-md border border-border bg-card">
          <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">Deep-dive chat</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <PersonaChatPanel
              appRowId={appRowId}
              personaId={personaId}
              personaLabel={personaLabel}
              referenceReportId={reportId}
              suggestedDraft={suggestedDraft}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  )

  if (missing) {
    return (
      <div className="flex flex-col gap-6">
        {commonContent}
        <NoInsightState
          reason={`Chưa có ${personaLabel} insight cho ngày này. Bấm generate để tạo (T-1 mặc định).`}
          onGenerate={handleRegenerate}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {commonContent}

      <ViewToggleActionsBar viewMode={viewMode} onViewModeChange={setViewMode} content={markdown ?? ""} />
      {viewMode === "rendered" ? <InsightContentRendered content={markdown ?? ""} /> : <InsightContentRaw content={markdown ?? ""} />}

      {quickQuestionRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Gợi ý câu hỏi để deep-dive</p>
            <p className="text-xs text-muted-foreground">Click để đưa vào ô chat</p>
          </div>
          <TooltipProvider>
            <div className="mt-3 space-y-2">
              {quickQuestionRows.map((q, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
                      onClick={() => setSuggestedDraft(q.prompt)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">Recommend #{idx + 1}</p>
                          <p className="mt-0.5 max-w-[min(920px,84vw)] truncate text-xs text-muted-foreground">
                            {q.title}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">Click</span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[min(720px,92vw)] border-border bg-popover p-3 text-popover-foreground shadow-md">
                    <div className="whitespace-pre-wrap text-xs">{q.title}</div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      )}

      {showGoTop && (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Go to Top"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
