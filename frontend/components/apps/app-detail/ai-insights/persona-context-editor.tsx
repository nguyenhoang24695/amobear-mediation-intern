"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  getAppPersonaContext,
  getAppPersonaContextVersion,
  listAppPersonaContextVersions,
  rollbackAppPersonaContext,
  upsertAppPersonaContext,
  type AppPersonaContextVersionMeta,
} from "@/lib/api/specialized-insights"

type Props = {
  appRowId: number
  personaId: string
  personaLabel: string
}

function safePrettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export function PersonaContextEditor({ appRowId, personaId, personaLabel }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contextMd, setContextMd] = useState("")
  const [extrasJson, setExtrasJson] = useState("{}")
  const [currentVersion, setCurrentVersion] = useState<number | null>(null)

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState<AppPersonaContextVersionMeta[]>([])
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [selectedVersionDetail, setSelectedVersionDetail] = useState<{
    version: number
    contextMd: string
    extrasJson: string
    createdAt: string
    createdByEmail?: string | null
  } | null>(null)
  const [rollingBack, setRollingBack] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAppPersonaContext(appRowId, personaId)
      const ctx = res.context
      setContextMd(ctx?.contextMd ?? "")
      setExtrasJson(safePrettyJson(ctx?.extrasJson ?? "{}"))
      setCurrentVersion(ctx?.version ?? null)
    } catch (e) {
      console.error(e)
      toast({ title: `Không tải được App context cho ${personaLabel}`, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [appRowId, personaId, personaLabel, toast])

  useEffect(() => {
    void load()
  }, [load])

  const loadVersions = useCallback(async () => {
    try {
      const res = await listAppPersonaContextVersions(appRowId, personaId)
      setVersions(res.items)
    } catch (e) {
      console.error(e)
      toast({ title: `Không tải được versions context (${personaLabel})`, variant: "destructive" })
    }
  }, [appRowId, personaId, personaLabel, toast])

  const openVersions = async () => {
    setVersionsOpen(true)
    setSelectedVersion(null)
    setSelectedVersionDetail(null)
    await loadVersions()
  }

  const onSelectVersion = async (v: number) => {
    setSelectedVersion(v)
    setSelectedVersionDetail(null)
    try {
      const detail = await getAppPersonaContextVersion(appRowId, personaId, v)
      setSelectedVersionDetail({
        version: detail.version,
        contextMd: detail.contextMd,
        extrasJson: safePrettyJson(detail.extrasJson ?? "{}"),
        createdAt: detail.createdAt,
        createdByEmail: detail.createdByEmail,
      })
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được version detail", variant: "destructive" })
    }
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await upsertAppPersonaContext(appRowId, personaId, { contextMd, extrasJson })
      toast({ title: `Đã lưu App context (${personaLabel})` })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: `Lưu App context (${personaLabel}) thất bại`, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const onRollback = async () => {
    if (!selectedVersionDetail) return
    setRollingBack(true)
    try {
      await rollbackAppPersonaContext(appRowId, personaId, selectedVersionDetail.version)
      toast({ title: `Đã rollback context (${personaLabel})`, description: `→ version ${selectedVersionDetail.version}` })
      await load()
      await loadVersions()
    } catch (e) {
      console.error(e)
      toast({ title: "Rollback thất bại", variant: "destructive" })
    } finally {
      setRollingBack(false)
    }
  }

  const headerBadge = useMemo(() => {
    if (loading) return <Badge variant="outline">đang tải…</Badge>
    if (!currentVersion) return <Badge variant="secondary">chưa có</Badge>
    return <Badge variant="outline">v{currentVersion}</Badge>
  }, [currentVersion, loading])

  return (
    <>
      <Accordion type="single" collapsible className="w-full rounded-md border border-slate-200 px-2">
        <AccordionItem value="app-persona-context" className="border-slate-200">
          <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="font-medium text-slate-900">App context ({personaLabel})</span>
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Override mạnh hơn playbook khi chat/ask/digest.
                </span>
              </span>
              {headerBadge}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-800">Context markdown</p>
                <Textarea
                  value={contextMd}
                  onChange={(e) => setContextMd(e.target.value)}
                  placeholder="Nhập context riêng cho role này (markdown). Ví dụ: KPI, threshold, assumptions, domain notes…"
                  className="min-h-40 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-800">Extras (JSON)</p>
                <Textarea
                  value={extrasJson}
                  onChange={(e) => setExtrasJson(e.target.value)}
                  placeholder='{"kpiTargets":{"roas_d7":1.0}}'
                  className="min-h-28 font-mono text-xs"
                />
                <p className="text-xs text-slate-500">
                  Nếu JSON lỗi format, backend sẽ fallback về <code>{`{}`}</code>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onSave} disabled={saving}>
                  {saving ? "Đang lưu…" : "Save & publish"}
                </Button>
                <Button variant="outline" onClick={openVersions}>
                  Versions
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="flex h-[min(88dvh,860px)] w-[min(96vw,860px)] max-w-[min(96vw,860px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
            <DialogTitle>Context versions — {personaLabel}</DialogTitle>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[260px_1fr]">
            <div className="min-h-0 overflow-y-auto border-b md:border-b-0 md:border-r">
              <div className="p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">Versions</p>
                <div className="space-y-1">
                  {versions.length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có version nào.</p>
                  ) : (
                    versions.map((v) => (
                      <button
                        key={v.id}
                        className={`w-full rounded-md border px-2 py-2 text-left text-xs ${
                          selectedVersion === v.version ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                        onClick={() => void onSelectVersion(v.version)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">v{v.version}</span>
                          <span className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-slate-500">{v.createdByEmail ?? "—"}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">
              {!selectedVersionDetail ? (
                <p className="text-sm text-slate-500">Chọn 1 version ở bên trái để xem chi tiết.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">v{selectedVersionDetail.version}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(selectedVersionDetail.createdAt).toLocaleString()} · {selectedVersionDetail.createdByEmail ?? "—"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-800">Context markdown</p>
                    <pre className="max-h-80 overflow-auto rounded-md border bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-700">
                      {selectedVersionDetail.contextMd || "—"}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-800">Extras</p>
                    <pre className="max-h-52 overflow-auto rounded-md border bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-slate-700">
                      {selectedVersionDetail.extrasJson || "{}"}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" onClick={onRollback} disabled={rollingBack}>
                      {rollingBack ? "Đang rollback…" : "Rollback to this version"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

