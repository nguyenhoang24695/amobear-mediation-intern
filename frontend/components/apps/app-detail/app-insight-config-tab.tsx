"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { AppInsightSettings, InsightContextTemplate, InsightTemplate } from "@/types/api"
import { Brain, Edit2, Eye, Loader2, Plus, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cloneRecommendedInsightSettings } from "@/lib/insight-settings-defaults"

type ContextType = "game-design" | "monetization" | "user-flow" | "geo-strategy" | "custom"

export interface InsightContextItem {
  id: string
  type: ContextType
  title: string
  body: string
  updatedAt?: string
}

const CONTEXT_TYPE_LABEL: Record<ContextType, { label: string; className: string }> = {
  "game-design": { label: "Game Design", className: "bg-purple-100 text-purple-800" },
  monetization: { label: "Monetization", className: "bg-green-100 text-green-800" },
  "user-flow": { label: "User Flow", className: "bg-blue-100 text-blue-800" },
  "geo-strategy": { label: "Geo Strategy", className: "bg-amber-100 text-amber-800" },
  custom: { label: "Custom", className: "bg-slate-100 text-slate-800" },
}

function getAiContextObject(settings: Record<string, unknown> | undefined): Record<string, unknown> {
  const ac = settings?.aiContext
  if (ac && typeof ac === "object" && !Array.isArray(ac)) {
    return { ...(ac as Record<string, unknown>) }
  }
  return {}
}

function parseContextItems(settings: Record<string, unknown> | undefined): InsightContextItem[] {
  if (!settings) return []
  const ac = getAiContextObject(settings)
  const raw = ac.contextItems
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (!x || typeof x !== "object") return null
        const o = x as Record<string, unknown>
        const id = typeof o.id === "string" ? o.id : crypto.randomUUID()
        const type = (typeof o.type === "string" ? o.type : "custom") as ContextType
        const title = typeof o.title === "string" ? o.title : "Untitled"
        const body = typeof o.body === "string" ? o.body : typeof o.preview === "string" ? o.preview : ""
        const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : undefined
        return { id, type: type in CONTEXT_TYPE_LABEL ? type : "custom", title, body, updatedAt }
      })
      .filter(Boolean) as InsightContextItem[]
  }
  const top = settings.contextItems
  if (Array.isArray(top)) {
    return parseContextItems({ aiContext: { contextItems: top } })
  }
  return []
}

function normalizeContextTypeFromTemplate(ct: string): ContextType {
  const t = ct as ContextType
  return t in CONTEXT_TYPE_LABEL ? t : "custom"
}

function parseGenerationOverride(s: Record<string, unknown>) {
  const g = s.generationOverride
  if (!g || typeof g !== "object" || Array.isArray(g)) {
    return { enabled: false, provider: "openai", priority: "normal", additionalInstructions: "" }
  }
  const o = g as Record<string, unknown>
  return {
    enabled: !!o.enabled,
    provider: typeof o.provider === "string" ? o.provider : "openai",
    priority: typeof o.priority === "string" ? o.priority : "normal",
    additionalInstructions: typeof o.additionalInstructions === "string" ? o.additionalInstructions : "",
  }
}

interface Props {
  appRowId: number
}

export function AppInsightConfigTab({ appRowId }: Props) {
  const { toast } = useToast()
  const canConfigure = hasScreenFunction("s-apps", "configure-insight")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<InsightTemplate[]>([])
  const [settings, setSettings] = useState<AppInsightSettings | null>(null)
  const [templateId, setTemplateId] = useState<string>("default")
  const [generationEnabled, setGenerationEnabled] = useState(true)
  const [appSummary, setAppSummary] = useState("")
  const [contextItems, setContextItems] = useState<InsightContextItem[]>([])

  const [ctxModalOpen, setCtxModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InsightContextItem | null>(null)
  const [formType, setFormType] = useState<ContextType>("custom")
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")

  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiBusy, setAiBusy] = useState(false)

  const [previewJsonOpen, setPreviewJsonOpen] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  const [sampleMd, setSampleMd] = useState<string | null>(null)
  const [sampleBusy, setSampleBusy] = useState(false)

  const [contextLibrary, setContextLibrary] = useState<InsightContextTemplate[]>([])
  const [resolvedTemplate, setResolvedTemplate] = useState<InsightTemplate | null>(null)
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, string>>({})
  const [genOverrideEnabled, setGenOverrideEnabled] = useState(false)
  const [genProvider, setGenProvider] = useState("openai")
  const [genPriority, setGenPriority] = useState("normal")
  const [genExtra, setGenExtra] = useState("")

  const load = useCallback(async () => {
    if (!canConfigure || !appRowId) return
    setLoading(true)
    try {
      const [tList, s, lib] = await Promise.all([
        insightApi.listTemplates(),
        insightApi.getAppSettings(appRowId),
        insightApi.listContextTemplates(false),
      ])
      setTemplates(tList)
      setContextLibrary(lib)
      setSettings(s)
      setGenerationEnabled(s.generationEnabled)
      setTemplateId(s.insightTemplateId != null ? String(s.insightTemplateId) : "default")
      const raw = (s.settings as Record<string, unknown>) ?? {}
      const ac = getAiContextObject(raw)
      setAppSummary(typeof ac.appSummary === "string" ? ac.appSummary : "")
      setContextItems(parseContextItems(raw))
      const so = raw.sectionOverrides
      if (so && typeof so === "object" && !Array.isArray(so)) {
        setSectionOverrides(
          Object.fromEntries(
            Object.entries(so as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          ),
        )
      } else {
        setSectionOverrides({})
      }
      const g = parseGenerationOverride(raw)
      setGenOverrideEnabled(g.enabled)
      setGenProvider(g.provider)
      setGenPriority(g.priority)
      setGenExtra(g.additionalInstructions)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được cấu hình", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [appRowId, canConfigure, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!canConfigure || !appRowId) return
    const tid = templateId === "default" ? null : Number(templateId)
    let targetId: number | null = tid
    if (targetId == null || Number.isNaN(targetId)) {
      const def = templates.find((t) => t.isDefault) ?? templates[0]
      targetId = def?.id ?? null
    }
    if (targetId == null) {
      setResolvedTemplate(null)
      return
    }
    let cancelled = false
    void insightApi
      .getTemplate(targetId)
      .then((t) => {
        if (!cancelled) setResolvedTemplate(t)
      })
      .catch(() => {
        if (!cancelled) setResolvedTemplate(null)
      })
    return () => {
      cancelled = true
    }
  }, [canConfigure, appRowId, templateId, templates])

  useEffect(() => {
    if (!resolvedTemplate) return
    setSectionOverrides((prev) => {
      const next = { ...prev }
      for (const s of resolvedTemplate.sections) {
        if (next[s.sectionKey] === undefined) next[s.sectionKey] = "system"
      }
      return next
    })
  }, [resolvedTemplate])

  const mergedAiContextPreview = useMemo(() => {
    const prev = (settings?.settings as Record<string, unknown>) ?? {}
    const prevAc = getAiContextObject(prev)
    return {
      ...prevAc,
      appSummary: appSummary || prevAc.appSummary,
      contextItems: contextItems.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        body: c.body,
        updatedAt: c.updatedAt,
      })),
    }
  }, [settings?.settings, appSummary, contextItems])

  const openAddContext = () => {
    setEditingItem(null)
    setFormType("custom")
    setFormTitle("")
    setFormBody("")
    setCtxModalOpen(true)
  }

  const openEditContext = (item: InsightContextItem) => {
    setEditingItem(item)
    setFormType(item.type)
    setFormTitle(item.title)
    setFormBody(item.body)
    setCtxModalOpen(true)
  }

  const saveContextForm = () => {
    const title = formTitle.trim()
    const body = formBody.trim()
    if (!title) {
      toast({ title: "Thiếu tiêu đề", variant: "destructive" })
      return
    }
    if (editingItem) {
      setContextItems((prev) =>
        prev.map((x) =>
          x.id === editingItem.id
            ? { ...x, type: formType, title, body, updatedAt: new Date().toISOString() }
            : x,
        ),
      )
    } else {
      setContextItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: formType,
          title,
          body,
          updatedAt: new Date().toISOString(),
        },
      ])
    }
    setCtxModalOpen(false)
    setEditingItem(null)
  }

  const deleteContext = (id: string) => {
    setContextItems((prev) => prev.filter((x) => x.id !== id))
  }

  const applyLibraryTemplate = (idStr: string) => {
    const t = contextLibrary.find((x) => String(x.id) === idStr)
    if (!t) return
    setContextItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: normalizeContextTypeFromTemplate(t.contextType),
        title: t.defaultTitle,
        body: t.body,
        updatedAt: new Date().toISOString(),
      },
    ])
    toast({ title: "Đã thêm từ kho mẫu", description: t.name })
  }

  const handleResetToDefaults = () => {
    const base = cloneRecommendedInsightSettings()
    const ac = (base.aiContext as Record<string, unknown>) ?? {}
    setAppSummary(typeof ac.appSummary === "string" ? ac.appSummary : "")
    setContextItems([])
    setGenOverrideEnabled(false)
    setGenProvider("openai")
    setGenPriority("normal")
    setGenExtra("")
    if (resolvedTemplate) {
      const o: Record<string, string> = {}
      for (const s of resolvedTemplate.sections) o[s.sectionKey] = "system"
      setSectionOverrides(o)
    } else {
      setSectionOverrides({})
    }
    toast({
      title: "Đã reset form",
      description: "Chưa lưu server — bấm Save config để ghi JSON mặc định.",
    })
  }

  const runAiSuggest = async () => {
    const hint = aiPrompt.trim()
    if (!hint) {
      toast({ title: "Nhập mô tả để AI gợi ý", variant: "destructive" })
      return
    }
    setAiBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 1200))
      const snippet = hint.slice(0, 400)
      setContextItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "custom",
          title: "Gợi ý từ mô tả",
          body: `Tóm tắt từ operator: ${snippet}\n\n(Gợi ý offline — chỉnh sửa nội dung trước khi lưu.)`,
          updatedAt: new Date().toISOString(),
        },
      ])
      setAiOpen(false)
      setAiPrompt("")
      toast({ title: "Đã thêm khối context", description: "Kiểm tra và chỉnh sửa nội dung nếu cần." })
    } finally {
      setAiBusy(false)
    }
  }

  const runSamplePreview = async () => {
    setSampleBusy(true)
    setSampleMd(null)
    try {
      await new Promise((r) => setTimeout(r, 1800))
      const jsonStr = JSON.stringify(mergedAiContextPreview, null, 2)
      const truncated = jsonStr.length > 1200 ? `${jsonStr.slice(0, 1200)}\n…` : jsonStr
      setSampleMd(
        `# Sample insight (demo UI)\n\n## App context đã cấu hình\n\`\`\`json\n${truncated}\n\`\`\`\n\nĐây chỉ là bản xem thử giao diện. Insight thật sau khi generate nằm ở tab **AI Insight**.`,
      )
      setSampleOpen(true)
    } finally {
      setSampleBusy(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const tid = templateId === "default" ? null : Number(templateId)
      const prev = { ...((settings?.settings as Record<string, unknown>) ?? {}) }
      const prevAc = getAiContextObject(prev)
      const nextSettings: Record<string, unknown> = {
        ...prev,
        sectionOverrides,
        generationOverride: {
          enabled: genOverrideEnabled,
          provider: genProvider,
          priority: genPriority,
          additionalInstructions: genExtra.trim(),
        },
        aiContext: {
          ...prevAc,
          appSummary: appSummary.trim() || prevAc.appSummary,
          contextItems: contextItems.map((c) => ({
            id: c.id,
            type: c.type,
            title: c.title,
            body: c.body,
            updatedAt: c.updatedAt ?? new Date().toISOString(),
          })),
        },
      }
      await insightApi.patchAppSettings(appRowId, {
        insightTemplateId: tid,
        generationEnabled,
        settings: nextSettings,
      })
      toast({ title: "Đã lưu", description: "Cấu hình insight và app context cho AI đã cập nhật." })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu thất bại", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!canConfigure) {
    return (
      <p className="text-sm text-slate-500">
        Bạn không có quyền cấu hình insight (cần quyền Edit app + configure-insight).
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải…</p>
  }

  const statusConfig: Record<string, { badge: string; indicator: string }> = {
    system: { badge: "bg-emerald-100 text-emerald-800", indicator: "●" },
    custom: { badge: "bg-amber-100 text-amber-800", indicator: "●" },
    disabled: { badge: "bg-slate-100 text-slate-700", indicator: "○" },
  }

  return (
    <div className="flex w-full min-w-0 max-w-[1920px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Insight configuration</h2>
          <p className="mt-1 text-sm text-slate-600">
            Gán template, override section/generation, và <strong>App context for AI</strong> (khớp mockup).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            onClick={handleResetToDefaults}
          >
            Reset to system default
          </button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save config"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template & generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Insight template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mặc định hệ thống</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                    {t.isDefault ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">Daily generation</p>
              <p className="text-sm text-slate-500">Bao gồm trong job portfolio T-1</p>
            </div>
            <Switch checked={generationEnabled} onCheckedChange={setGenerationEnabled} />
          </div>
        </CardContent>
      </Card>

      {resolvedTemplate && resolvedTemplate.sections.length > 0 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Section configuration</h3>
              <p className="text-sm text-slate-600">Override trạng thái section theo template đang chọn (lưu trong settings.sectionOverrides).</p>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold">Section</th>
                    <th className="px-3 py-2 font-semibold">Override</th>
                    <th className="px-3 py-2 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedTemplate.sections
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((s) => {
                      const st = sectionOverrides[s.sectionKey] ?? "system"
                      const cfg = statusConfig[st] ?? statusConfig.system
                      return (
                        <tr key={s.sectionKey} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-900">{s.title}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={st}
                              onValueChange={(v) =>
                                setSectionOverrides((p) => ({ ...p, [s.sectionKey]: v }))
                              }
                            >
                              <SelectTrigger className="h-9 w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="system">Use system</SelectItem>
                                <SelectItem value="custom">Customize</SelectItem>
                                <SelectItem value="disabled">Disable</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={cfg.badge}>
                              <span className="mr-1">{cfg.indicator}</span>
                              {st}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-6 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Generation settings</h3>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-medium text-slate-900">Override generation settings</p>
              <p className="text-sm text-slate-600">Ghi vào settings.generationOverride (metadata cho vận hành / tương lai).</p>
            </div>
            <Switch checked={genOverrideEnabled} onCheckedChange={setGenOverrideEnabled} />
          </div>
          {genOverrideEnabled ? (
            <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
              <div className="space-y-2">
                <Label>AI provider</Label>
                <Select value={genProvider} onValueChange={setGenProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <RadioGroup value={genPriority} onValueChange={setGenPriority} className="gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="high" id="g-high" />
                    <label htmlFor="g-high" className="text-sm">
                      High
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="normal" id="g-norm" />
                    <label htmlFor="g-norm" className="text-sm">
                      Normal
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="low" id="g-low" />
                    <label htmlFor="g-low" className="text-sm">
                      Low
                    </label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Additional instructions</Label>
                <Textarea rows={4} value={genExtra} onChange={(e) => setGenExtra(e.target.value)} className="bg-white" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-indigo-200 bg-indigo-50/80">
        <CardContent className="space-y-4 p-6">
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-5 w-5 shrink-0 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">App context for AI</h3>
              </div>
              <p className="text-sm text-slate-600">
                Thông tin đặc thù app (monetization, geo, flow…) giúp AI ưu tiên đúng. Lưu vào{" "}
                <code className="rounded bg-white/80 px-1 text-xs">settings.aiContext</code> trên server.
              </p>
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 lg:w-auto lg:min-w-[16rem] lg:max-w-md xl:max-w-lg">
              <Label className="text-xs text-slate-600">Áp dụng từ kho mẫu (Settings → Kho context AI)</Label>
              <Select onValueChange={(v) => applyLibraryTemplate(v)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn mẫu context…" />
                </SelectTrigger>
                <SelectContent>
                  {contextLibrary.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={openAddContext}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add context
              </Button>
              <Button type="button" variant="outline" size="sm" className="border-indigo-300 bg-white" onClick={() => setAiOpen(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Add via AI
              </Button>
              <Button type="button" variant="outline" size="sm" className="border-indigo-300 bg-white" onClick={() => setPreviewJsonOpen(true)}>
                <Eye className="mr-1.5 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-summary">Tóm tắt app (aiContext.appSummary)</Label>
            <Textarea
              id="app-summary"
              rows={3}
              className="bg-white"
              placeholder="Thể loại, đối tượng, giai đoạn vòng đời, thị trường chính…"
              value={appSummary}
              onChange={(e) => setAppSummary(e.target.value)}
            />
          </div>

          {contextItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-indigo-300 bg-white py-10 text-center">
              <Brain className="mx-auto mb-3 h-12 w-12 text-indigo-200" />
              <p className="mb-1 font-semibold text-slate-900">Chưa có khối context chi tiết</p>
              <p className="mb-4 text-sm text-slate-600">Thêm ngữ cảnh theo từng chủ đề hoặc dùng Add via AI.</p>
              <Button type="button" variant="outline" onClick={openAddContext}>
                <Plus className="mr-2 h-4 w-4" />
                Add context
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {contextItems.map((item) => {
                const cfg = CONTEXT_TYPE_LABEL[item.type] ?? CONTEXT_TYPE_LABEL.custom
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-lg border border-indigo-100 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                        <span className="font-medium text-slate-900">{item.title}</span>
                      </div>
                      <p className="line-clamp-3 text-sm text-slate-600">{item.body || "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditContext(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => deleteContext(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-dashed border-slate-300">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Eye className="h-5 w-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Preview insight (demo)</h3>
              </div>
              <p className="text-sm text-slate-600">
                Mô phỏng xem payload context sẽ đi vào prompt. Không gọi AI thật.
              </p>
            </div>
            <Button type="button" variant="outline" disabled={sampleBusy} onClick={() => void runSamplePreview()}>
              {sampleBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Chạy preview mẫu
            </Button>
          </div>
        </CardContent>
      </Card>

      {settings ? (
        <p className="text-xs text-slate-400">App row #{appRowId} · Lưu ghi đè toàn bộ JSON settings — đã merge với dữ liệu hiện có.</p>
      ) : null}

      <Dialog open={ctxModalOpen} onOpenChange={setCtxModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Sửa context" : "Thêm context"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as ContextType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTEXT_TYPE_LABEL) as ContextType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CONTEXT_TYPE_LABEL[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="VD: Chiến lược monetization" />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea rows={6} value={formBody} onChange={(e) => setFormBody(e.target.value)} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCtxModalOpen(false)}>
              Hủy
            </Button>
            <Button type="button" onClick={saveContextForm}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add via AI</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Mô tả ngắn app hoặc bối cảnh; hệ thống tạo một khối context khởi đầu (demo — chỉnh sửa trước khi lưu server).
          </p>
          <Textarea rows={5} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="VD: Game puzzle hyper-casual, IAA US/EU, đang test tần suất rewarded…" />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAiOpen(false)}>
              Đóng
            </Button>
            <Button type="button" disabled={aiBusy} onClick={() => void runAiSuggest()}>
              {aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Tạo gợi ý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewJsonOpen} onOpenChange={setPreviewJsonOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>Preview — aiContext gửi vào generator</DialogTitle>
          </DialogHeader>
          <pre className="min-h-0 flex-1 overflow-auto rounded-md border bg-slate-50 p-3 font-mono text-xs">
            {JSON.stringify(mergedAiContextPreview, null, 2)}
          </pre>
          <DialogFooter>
            <Button type="button" onClick={() => setPreviewJsonOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>Kết quả preview mẫu</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-white p-4 text-sm">
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">{sampleMd}</pre>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSampleOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
