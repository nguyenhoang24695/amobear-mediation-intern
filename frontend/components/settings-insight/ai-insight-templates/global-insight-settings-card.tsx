"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, ChevronUp, Settings } from "lucide-react"
import { insightApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { InsightTemplate } from "@/types/api"

const STORAGE_KEY = "nexus.insightGlobalSettings.v1"

type TriggerType = "pipeline" | "fixed" | "manual"

type StoredGlobalExtras = {
  triggerType: TriggerType
  bufferMinutes: number
  fixedTime: string
  defaultLanguage: string
  includeMermaid: boolean
  includeRecommendations: boolean
  revenueTrend: number
  dauTrend: number
  retention: number
  contentHealth: number
}

const defaultExtras: StoredGlobalExtras = {
  triggerType: "pipeline",
  bufferMinutes: 30,
  fixedTime: "06:00",
  defaultLanguage: "vietnamese",
  includeMermaid: true,
  includeRecommendations: true,
  revenueTrend: 30,
  dauTrend: 25,
  retention: 25,
  contentHealth: 20,
}

function loadExtras(): StoredGlobalExtras {
  if (typeof window === "undefined") return defaultExtras
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultExtras
    const p = JSON.parse(raw) as Partial<StoredGlobalExtras>
    return { ...defaultExtras, ...p }
  } catch {
    return defaultExtras
  }
}

function saveExtras(e: StoredGlobalExtras) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e))
  } catch {
    /* ignore */
  }
}

function toUpsertBody(t: InsightTemplate): Record<string, unknown> {
  return {
    name: t.name,
    description: t.description ?? null,
    isDefault: t.isDefault,
    globalAiInstructions: t.globalAiInstructions ?? "",
    preferredProvider: t.preferredProvider ?? null,
    maxAppsPerBatch: t.maxAppsPerBatch,
    parallelDegree: t.parallelDegree,
    sections: t.sections.map((s) => ({
      sectionKey: s.sectionKey,
      title: s.title,
      metrics: s.metrics,
      comparisonPeriods: s.comparisonPeriods,
      aiInstruction: s.aiInstruction,
      audience: s.audience,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      anomalyThresholds: s.anomalyThresholds ?? null,
    })),
  }
}

export function GlobalInsightSettingsCard({
  defaultTemplate,
  onSaved,
}: {
  defaultTemplate: InsightTemplate | null
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preferredProvider, setPreferredProvider] = useState<string>("")
  const [maxApps, setMaxApps] = useState(50)
  const [parallel, setParallel] = useState(10)

  const [triggerType, setTriggerType] = useState<TriggerType>("pipeline")
  const [bufferMinutes, setBufferMinutes] = useState(30)
  const [fixedTime, setFixedTime] = useState("06:00")
  const [defaultLanguage, setDefaultLanguage] = useState("vietnamese")
  const [includeMermaid, setIncludeMermaid] = useState(true)
  const [includeRecommendations, setIncludeRecommendations] = useState(true)
  const [revenueTrend, setRevenueTrend] = useState(30)
  const [dauTrend, setDauTrend] = useState(25)
  const [retention, setRetention] = useState(25)
  const [contentHealth, setContentHealth] = useState(20)

  const totalWeight = revenueTrend + dauTrend + retention + contentHealth
  const isValidTotal = totalWeight === 100

  const hydrateFromStorage = useCallback(() => {
    const x = loadExtras()
    setTriggerType(x.triggerType)
    setBufferMinutes(x.bufferMinutes)
    setFixedTime(x.fixedTime)
    setDefaultLanguage(x.defaultLanguage)
    setIncludeMermaid(x.includeMermaid)
    setIncludeRecommendations(x.includeRecommendations)
    setRevenueTrend(x.revenueTrend)
    setDauTrend(x.dauTrend)
    setRetention(x.retention)
    setContentHealth(x.contentHealth)
  }, [])

  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  useEffect(() => {
    if (!defaultTemplate) return
    setPreferredProvider(defaultTemplate.preferredProvider ?? "")
    setMaxApps(defaultTemplate.maxAppsPerBatch)
    setParallel(defaultTemplate.parallelDegree)
  }, [defaultTemplate])

  const handleSave = async () => {
    if (!isValidTotal) {
      toast({
        title: "Trọng số health score",
        description: "Tổng 4 thanh trượt phải bằng 100%.",
        variant: "destructive",
      })
      return
    }
    const extras: StoredGlobalExtras = {
      triggerType,
      bufferMinutes,
      fixedTime,
      defaultLanguage,
      includeMermaid,
      includeRecommendations,
      revenueTrend,
      dauTrend,
      retention,
      contentHealth,
    }
    saveExtras(extras)

    if (!defaultTemplate) {
      toast({
        title: "Đã lưu Global Insight Settings",
        description: "Lịch, ngôn ngữ và trọng số lưu trên trình duyệt. Chưa có template mặc định để đồng bộ provider/batch.",
      })
      return
    }

    setSaving(true)
    try {
      const mapProvider = (v: string) => {
        if (!v || v === "__auto__") return null
        // Backend / IAiProviderManager key is "chatgpt" (OpenAI provider registration).
        if (v === "chatgpt" || v === "openai") return "chatgpt"
        return v
      }
      const updated: InsightTemplate = {
        ...defaultTemplate,
        preferredProvider: mapProvider(preferredProvider || "__auto__"),
        maxAppsPerBatch: Math.min(500, Math.max(1, maxApps)),
        parallelDegree: Math.min(50, Math.max(1, parallel)),
      }
      await insightApi.updateTemplate(defaultTemplate.id, toUpsertBody(updated))
      toast({
        title: "Đã lưu Global Insight Settings",
        description:
          "Provider / batch / parallel đã cập nhật trên template mặc định. Các tùy chọn lịch & trọng số lưu cục bộ trình duyệt (chờ API toàn cục).",
      })
      onSaved()
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu template mặc định thất bại", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const providerSelectValue =
    preferredProvider === "openai" ? "chatgpt" : preferredProvider || "__auto__"

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-slate-200 bg-slate-50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer rounded-t-lg transition-colors hover:bg-slate-100/80">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Settings className="h-4 w-4" />
                Global Insight Settings
              </CardTitle>
              {open ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <p className="mt-1 text-xs font-normal text-slate-500">
              Cấu hình toàn cục theo mockup. Provider / batch / parallel đồng bộ với template đang{" "}
              <span className="font-medium">Default</span>; lịch chạy, ngôn ngữ và trọng số health score lưu trên
              trình duyệt này.
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>AI Provider for Insights</Label>
                  <Select
                    value={providerSelectValue}
                    onValueChange={(v) => setPreferredProvider(v === "__auto__" ? "" : v === "chatgpt" ? "openai" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mặc định hệ thống" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Mặc định hệ thống</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max apps per batch</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={maxApps}
                    onChange={(e) => setMaxApps(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">Top apps by revenue (theo pipeline)</p>
                </div>

                <div className="space-y-2">
                  <Label>Parallel degree</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={parallel}
                    onChange={(e) => setParallel(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">Concurrent insight generations</p>
                </div>

                <div className="space-y-3">
                  <Label>Generation trigger</Label>
                  <RadioGroup
                    value={triggerType}
                    onValueChange={(v) => setTriggerType(v as TriggerType)}
                    className="gap-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <RadioGroupItem value="pipeline" id="ins-pipeline" />
                      <label htmlFor="ins-pipeline" className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                        After pipeline completion + buffer
                        {triggerType === "pipeline" ? (
                          <span className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={bufferMinutes}
                              onChange={(e) => setBufferMinutes(Number(e.target.value))}
                              className="h-7 w-16 text-sm"
                            />
                            <span className="text-xs text-slate-500">minutes</span>
                          </span>
                        ) : null}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RadioGroupItem value="fixed" id="ins-fixed" />
                      <label htmlFor="ins-fixed" className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                        Fixed time daily
                        {triggerType === "fixed" ? (
                          <span className="flex items-center gap-1">
                            <Input
                              type="time"
                              value={fixedTime}
                              onChange={(e) => setFixedTime(e.target.value)}
                              className="h-7 w-28 text-sm"
                            />
                            <span className="text-xs text-slate-500">UTC+7</span>
                          </span>
                        ) : null}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="manual" id="ins-manual" />
                      <label htmlFor="ins-manual" className="cursor-pointer text-sm">
                        Manual only
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Default language</Label>
                  <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vietnamese">Vietnamese</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="shrink">Include Mermaid charts in output</Label>
                    <Switch checked={includeMermaid} onCheckedChange={setIncludeMermaid} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label className="shrink">Include recommendations section</Label>
                    <Switch checked={includeRecommendations} onCheckedChange={setIncludeRecommendations} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Health score formula weights</Label>
                    <span
                      className={`text-xs font-medium ${isValidTotal ? "text-emerald-600" : "text-red-500"}`}
                    >
                      Total: {totalWeight}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        ["Revenue trend", revenueTrend, setRevenueTrend] as const,
                        ["DAU trend", dauTrend, setDauTrend] as const,
                        ["Retention", retention, setRetention] as const,
                        ["Content/Level health", contentHealth, setContentHealth] as const,
                      ] as const
                    ).map(([label, value, setVal]) => (
                      <div key={label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{label}</span>
                          <span className="font-mono text-slate-900">{value}%</span>
                        </div>
                        <Slider
                          value={[value]}
                          onValueChange={([v]) => setVal(v)}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>

                  {!isValidTotal ? (
                    <p className="text-xs text-red-500">
                      Total must equal 100%. Currently: {totalWeight}%
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={saving || !isValidTotal}
                onClick={() => void handleSave()}
              >
                {saving ? "Đang lưu…" : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
