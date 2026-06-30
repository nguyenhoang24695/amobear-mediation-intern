"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Search } from "lucide-react"
import type { InsightTemplateSection } from "@/types/api"

const AVAILABLE_METRICS = [
  { key: "total_revenue", name: "Total revenue" },
  { key: "iaa_revenue", name: "IAA revenue" },
  { key: "iap_revenue", name: "IAP revenue" },
  { key: "ecpm", name: "eCPM" },
  { key: "arpdau", name: "ARPDAU" },
  { key: "fill_rate", name: "Fill rate" },
  { key: "impressions", name: "Impressions" },
  { key: "dau_proxy", name: "DAU proxy" },
  { key: "new_users", name: "New users" },
  { key: "sessions", name: "Sessions" },
  { key: "retention_d1", name: "D1 retention" },
  { key: "retention_d7", name: "D7 retention" },
  { key: "session_length", name: "Session length" },
  { key: "level_drop_rate", name: "Level drop rate" },
  { key: "win_rate", name: "Win rate" },
  { key: "crash_rate", name: "Crash rate" },
  { key: "installs", name: "Installs" },
  { key: "cpi", name: "CPI" },
  { key: "roas", name: "ROAS" },
  { key: "anomalies", name: "Anomalies" },
  { key: "actions", name: "Actions" },
  { key: "health_score", name: "Health score" },
  { key: "revenue_mix", name: "Revenue mix" },
]

const COMPARISON_OPTIONS = [
  { id: "dod", label: "Day-over-day (T-1 vs T-2)" },
  { id: "7d_avg", label: "vs 7-day average" },
  { id: "14d_avg", label: "vs 14-day average" },
  { id: "30d_avg", label: "vs 30-day average" },
]

const AUDIENCE_OPTIONS = [
  { id: "bod", label: "BOD / Leadership" },
  { id: "mediation", label: "Mediation" },
  { id: "da", label: "DA" },
  { id: "product", label: "Product" },
  { id: "ua", label: "UA" },
  { id: "marketing", label: "Marketing" },
  { id: "dev", label: "Dev" },
  { id: "game", label: "Game" },
]

export interface EditSectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: InsightTemplateSection | null
  onSave: (section: InsightTemplateSection) => void
}

export function EditSectionModal({ open, onOpenChange, section, onSave }: EditSectionModalProps) {
  const [title, setTitle] = useState("")
  const [sectionKey, setSectionKey] = useState("")
  const [metrics, setMetrics] = useState<string[]>([])
  const [comparisonPeriods, setComparisonPeriods] = useState<string[]>([])
  const [audience, setAudience] = useState<string[]>([])
  const [aiInstruction, setAiInstruction] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [anomalyJson, setAnomalyJson] = useState("{}")
  const [metricSearch, setMetricSearch] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (!section) return
    setTitle(section.title)
    setSectionKey(section.sectionKey)
    setMetrics([...section.metrics])
    setComparisonPeriods([...section.comparisonPeriods])
    setAudience([...section.audience])
    setAiInstruction(section.aiInstruction)
    setIsActive(section.isActive)
    setAnomalyJson(
      section.anomalyThresholds && Object.keys(section.anomalyThresholds).length > 0
        ? JSON.stringify(section.anomalyThresholds, null, 2)
        : "{}",
    )
    setJsonError(null)
    setMetricSearch("")
  }, [section, open])

  const filteredMetrics = useMemo(() => {
    const q = metricSearch.trim().toLowerCase()
    if (!q) return AVAILABLE_METRICS
    return AVAILABLE_METRICS.filter(
      (m) => m.key.includes(q) || m.name.toLowerCase().includes(q),
    )
  }, [metricSearch])

  const handleSave = () => {
    if (!section) return
    let anomalyThresholds: Record<string, unknown> | null = null
    const t = anomalyJson.trim()
    if (t && t !== "{}") {
      try {
        anomalyThresholds = JSON.parse(t) as Record<string, unknown>
        setJsonError(null)
      } catch {
        setJsonError("JSON anomaly thresholds không hợp lệ")
        return
      }
    }
    onSave({
      ...section,
      title: title.trim(),
      sectionKey: sectionKey.trim(),
      metrics,
      comparisonPeriods,
      audience,
      aiInstruction: aiInstruction.trim(),
      isActive,
      anomalyThresholds,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[min(92dvh,820px)] sm:w-[min(96vw,1100px)] sm:max-w-[min(96vw,1100px)]"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-14 text-left">
          <DialogTitle>Section: {section?.title ?? ""}</DialogTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Trái: metadata & metrics. Phải: hướng dẫn AI & anomaly (cuộn độc lập).
          </p>
        </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="space-y-5 pb-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tiêu đề</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Section key</Label>
                  <Input
                    value={sectionKey}
                    onChange={(e) => setSectionKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sec-active"
                  checked={isActive}
                  onCheckedChange={(c) => setIsActive(!!c)}
                />
                <label htmlFor="sec-active" className="text-sm text-foreground">
                  Section đang bật
                </label>
              </div>

              <div className="space-y-2">
                <Label>Metrics</Label>
                <div className="flex min-h-[32px] flex-wrap gap-2">
                  {metrics.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1 pr-1">
                      {k}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted"
                        onClick={() => setMetrics((m) => m.filter((x) => x !== k))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Tìm metric…"
                    value={metricSearch}
                    onChange={(e) => setMetricSearch(e.target.value)}
                  />
                  {metricSearch.trim() ? (
                    <div className="z-10 mt-1 max-h-40 overflow-auto rounded-md border bg-card shadow-sm">
                      {filteredMetrics
                        .filter((m) => !metrics.includes(m.key))
                        .map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                            onClick={() => {
                              setMetrics((prev) => [...prev, m.key])
                              setMetricSearch("")
                            }}
                          >
                            <span className="font-mono text-muted-foreground">{m.key}</span>
                            <span className="ml-2 text-muted-foreground">{m.name}</span>
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label>So sánh kỳ</Label>
                <div className="space-y-2">
                  {COMPARISON_OPTIONS.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cmp-${o.id}`}
                        checked={comparisonPeriods.includes(o.id)}
                        onCheckedChange={() =>
                          setComparisonPeriods((p) =>
                            p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id],
                          )
                        }
                      />
                      <label htmlFor={`cmp-${o.id}`} className="cursor-pointer text-sm">
                        {o.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Đối tượng (audience)</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {AUDIENCE_OPTIONS.map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`aud-${o.id}`}
                        checked={audience.includes(o.id)}
                        onCheckedChange={() =>
                          setAudience((p) =>
                            p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id],
                          )
                        }
                      />
                      <label htmlFor={`aud-${o.id}`} className="cursor-pointer text-sm">
                        {o.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col bg-muted/40 lg:border-l lg:border-border">
            <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-foreground">Hướng dẫn AI & Anomaly</h3>
              <p className="text-xs text-muted-foreground">Nội dung gửi kèm section trong prompt và ngưỡng rule-based.</p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="space-y-2">
                <Label>Hướng dẫn AI cho section</Label>
                <Textarea
                  className="min-h-[min(280px,40vh)] resize-y font-mono text-sm"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="Rubrik, tone, bullet cần có…"
                />
              </div>
              <div className="space-y-2">
                <Label>Anomaly thresholds (JSON object, tùy chọn)</Label>
                <Textarea
                  rows={8}
                  className="font-mono text-xs"
                  value={anomalyJson}
                  onChange={(e) => {
                    setAnomalyJson(e.target.value)
                    setJsonError(null)
                  }}
                  placeholder='{"revenuePctVs7d":20}'
                />
                {jsonError ? <p className="text-xs text-destructive">{jsonError}</p> : null}
              </div>
            </div>
          </div>
        </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
          <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" type="button" onClick={handleSave}>
            Lưu section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
