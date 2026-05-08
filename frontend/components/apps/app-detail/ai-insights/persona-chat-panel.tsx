"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createPersonaChatSession,
  getPersonaChatSession,
  listPersonaChatSessions,
  sendPersonaChatMessageV2,
  type PersonaChatAttachment,
  type PersonaChatMessage,
  type PersonaChatSession,
} from "@/lib/api/specialized-insights"
import { InsightContentRendered } from "./insight-content-rendered"
import { Paperclip, Send, X, Loader2, Play, Square } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Props = {
  appRowId: number
  personaId: string
  personaLabel: string
  referenceReportId?: string | null
  suggestedDraft?: string | null
}

export function PersonaChatPanel({ appRowId, personaId, personaLabel, referenceReportId, suggestedDraft }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [useMcp, setUseMcp] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [planText, setPlanText] = useState("")
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [sendingStep, setSendingStep] = useState<1 | 2 | 3 | 4>(1)
  const [sessions, setSessions] = useState<PersonaChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<PersonaChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [attachments, setAttachments] = useState<PersonaChatAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const loadSessions = useCallback(async () => {
    const res = await listPersonaChatSessions(personaId, appRowId)
    setSessions(res.items)
    return res.items
  }, [appRowId, personaId])

  const loadSessionDetail = useCallback(
    async (sessionId: string) => {
      const res = await getPersonaChatSession(personaId, sessionId)
      setActiveSessionId(res.session.id)
      setMessages(res.messages)
      setTimeout(scrollToBottom, 50)
    },
    [personaId],
  )

  const ensureSession = useCallback(async () => {
    const items = await loadSessions()

    const pinned = referenceReportId
      ? items.find((s) => s.referenceReportId === referenceReportId)
      : null

    if (pinned) {
      await loadSessionDetail(pinned.id)
      return
    }

    if (items[0]) {
      await loadSessionDetail(items[0].id)
      return
    }

    const created = await createPersonaChatSession(personaId, {
      appRowId,
      title: `${personaLabel} deep-dive`,
      referenceReportId: referenceReportId ?? null,
    })
    setSessions([created.session])
    await loadSessionDetail(created.session.id)
  }, [appRowId, loadSessionDetail, loadSessions, personaId, personaLabel, referenceReportId])

  useEffect(() => {
    setLoading(true)
    ensureSession()
      .catch((e) => {
        console.error(e)
        toast({ title: `Không khởi tạo được chat (${personaLabel})`, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [ensureSession, personaLabel, toast])

  // If reference report changes (user switches date), prefer session pinned to that report
  useEffect(() => {
    if (!referenceReportId || sessions.length === 0) return
    const pinned = sessions.find((s) => s.referenceReportId === referenceReportId)
    if (pinned && pinned.id !== activeSessionId) {
      void loadSessionDetail(pinned.id)
    }
  }, [activeSessionId, loadSessionDetail, referenceReportId, sessions])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  )

  const onNewSession = async () => {
    try {
      const created = await createPersonaChatSession(personaId, {
        appRowId,
        title: `${personaLabel} deep-dive`,
        referenceReportId: referenceReportId ?? null,
      })
      const next = [created.session, ...sessions]
      setSessions(next)
      await loadSessionDetail(created.session.id)
      toast({ title: "Đã tạo session mới" })
    } catch (e) {
      console.error(e)
      toast({ title: "Tạo session thất bại", variant: "destructive" })
    }
  }

  const doSend = async (message: string, planOverride: string | null) => {
    if (!activeSessionId) return
    setSending(true)
    setSendingStep(1)
    setDraft("")
    setPendingText(null)
    const optimisticUser: PersonaChatMessage = {
      id: `tmp-user-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimisticUser])
    setTimeout(scrollToBottom, 50)

    try {
      // Progress steps: advance once, then stay at step 4 until done.
      const t2 = setTimeout(() => setSendingStep(2), 1500)
      const t3 = setTimeout(() => setSendingStep(3), 4500)
      const t4 = setTimeout(() => setSendingStep(4), 9000)
      const res = await sendPersonaChatMessageV2(personaId, activeSessionId, {
        message,
        useMcp,
        planText: planOverride,
        attachments,
      })
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      setMessages((m) => [...m, res.assistant])
      setTimeout(scrollToBottom, 50)
      // refresh sessions list for UpdatedAt/MessageCount
      const refreshed = await loadSessions()
      setSessions(refreshed)
      setAttachments([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e) {
      console.error(e)
      toast({ title: "Gửi chat thất bại", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const onSend = async () => {
    if (!activeSessionId) return
    const text = draft.trim()
    if (!text && attachments.length === 0) return

    if (useMcp) {
      const msg = text || "(đính kèm file)"
      setPendingText(msg)
      setPlanText(buildDefaultPlan(personaLabel, msg, attachments))
      // Clear input early so user can continue typing while reviewing plan.
      setDraft("")
      setPlanOpen(true)
      return
    }

    await doSend(text || "(đính kèm file)", null)
  }

  useEffect(() => {
    const s = suggestedDraft?.trim()
    if (!s) return
    setDraft(s)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [suggestedDraft])

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: PersonaChatAttachment[] = []
    for (const f of Array.from(files).slice(0, 3)) {
      const isText = f.type.startsWith("text/") || /\.(md|txt|csv|json|yaml|yml|log)$/i.test(f.name)
      if (!isText) continue
      const text = await f.text()
      next.push({
        kind: "text",
        fileName: f.name,
        contentType: f.type || "text/plain",
        text: text.slice(0, 20_000),
      })
    }
    if (next.length === 0) {
      toast({
        title: "Chỉ hỗ trợ file text",
        description: "Hiện tại chat role chỉ nhận .md/.txt/.csv/.json/.yaml/.log (tự cắt 20k ký tự).",
        variant: "destructive",
      })
      return
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4))
  }
  return (
    <div className="rounded-md border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-slate-900">
            Chat ({personaLabel})
          </p>
          {activeSession?.referenceReportId ? (
            <Badge variant="outline" className="text-xs">
              pinned digest
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeSessionId ?? undefined}
            onValueChange={(v) => void loadSessionDetail(v)}
            disabled={loading || sessions.length === 0}
          >
            <SelectTrigger className="h-9 w-[min(360px,80vw)]">
              <SelectValue placeholder="Chọn session…" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className="truncate">{s.title}</span>
                    {s.referenceReportId ? <Badge variant="secondary">pinned</Badge> : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void onNewSession()} disabled={loading}>
            New session
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[520px] overflow-y-auto overscroll-contain px-4 py-3"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Đang tải chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Chưa có message. Hỏi sâu theo role này và hệ thống sẽ tự dùng daily digest làm reference (nếu pinned).
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[min(760px,92%)] rounded-lg border px-3 py-2 text-sm",
                    m.role === "user"
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-700">{m.role}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {m.role === "assistant" ? (
                    <InsightContentRendered content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-slate-800">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sending && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-t border-blue-100 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
          <span className="truncate">
            {useMcp ? `Bước ${sendingStep}/4: ${SENDING_STEP_LABELS[sendingStep]}` : "Đang gửi… vui lòng chờ kết quả."}
          </span>
        </div>
      )}

      <div
        className={cn("border-t bg-white px-4 py-3", dragOver && "bg-blue-50")}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void onPickFiles(e.dataTransfer.files)
        }}
      >
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <Badge key={`${a.fileName}-${idx}`} variant="secondary" className="gap-1">
                {a.fileName}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div
          className={cn(
            "relative border border-slate-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500",
            dragOver && "border-blue-400 ring-1 ring-blue-400",
          )}
        >
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Hỏi sâu theo role ${personaLabel}… (Ctrl/⌘ + Enter để gửi)`}
            className="min-h-[80px] max-h-[200px] border-0 focus-visible:ring-0 resize-none pr-12"
            disabled={sending || loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void onSend()
              }
            }}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 bg-blue-600 hover:bg-blue-700"
            onClick={() => void onSend()}
            disabled={(draft.trim().length === 0 && attachments.length === 0) || sending || loading}
          >
            {sending ? "…" : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-slate-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || loading}
            >
              <Paperclip className="h-4 w-4 mr-1" />
              Đính kèm file
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox id={`mcp-${personaId}`} checked={useMcp} onCheckedChange={(v) => setUseMcp(v === true)} />
              <label
                htmlFor={`mcp-${personaId}`}
                className="text-sm text-slate-600 cursor-pointer"
                title="Bật để gọi agentic: AI tự truy vấn DB qua MCP (read_query) khi cần số liệu thật"
              >
                Phân tích sâu (MCP)
              </label>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Tip: hỏi cụ thể theo KPI/issue trong digest để AI drill nhanh hơn.
          </p>
        </div>
      </div>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="w-[min(96vw,820px)] max-w-[min(96vw,820px)]">
          <DialogHeader>
            <DialogTitle>Planning (MCP) — chỉnh trước khi chạy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Bạn có thể sửa plan để AI chạy MCP đúng nhu cầu. Khi chạy, AI sẽ bám plan này.
            </p>
            <Textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="min-h-[260px] font-mono text-xs"
              placeholder="Nhập plan..."
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPlanOpen(false)
                  setPendingText(null)
                }}
                disabled={sending}
              >
                <Square className="h-4 w-4 mr-1.5" />
                Hủy
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => {
                  const msg = pendingText ?? draft.trim() ?? "(đính kèm file)"
                  setPlanOpen(false)
                  void doSend(msg, planText.trim() || null)
                }}
                disabled={sending}
              >
                <Play className="h-4 w-4 mr-1.5" />
                Chạy MCP theo plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function buildDefaultPlan(personaLabel: string, message: string, attachments: PersonaChatAttachment[]): string {
  const files = attachments.filter((a) => a.kind === "text").map((a) => a.fileName)
  return `## Goal
- Deep-dive cho role: ${personaLabel}
- Câu hỏi: ${message || "(file attachments)"}

## Plan
- Xác định 3-6 câu hỏi cần data để trả lời (theo role_focus nếu có).
- Nếu cần funnel/core-loop: discovery top events + verify funnel steps theo ngày (uu/count).
- Lấy installs/cost từ Adjust/AppsFlyer (nếu snapshot có) và đối chiếu với drawers/activation từ Firebase.
- Chạy 3-10 query SELECT có WHERE date + LIMIT.

## Constraints
- Không bịa số.
- Nếu thiếu data: nêu rõ gap + query cần chạy tiếp.

## Inputs
- Attachments: ${files.length ? files.join(", ") : "(none)"}
`
}

const SENDING_STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Chuẩn bị câu hỏi & context…",
  2: "Lập kế hoạch truy vấn (MCP)…",
  3: "Truy vấn dữ liệu (read_query)…",
  4: "Tổng hợp & viết câu trả lời…",
}

