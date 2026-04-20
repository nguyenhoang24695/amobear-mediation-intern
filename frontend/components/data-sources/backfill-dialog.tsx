"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { jobsTestApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { JobsTestBackfillActionDto } from "@/types/api"

interface BackfillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: JobsTestBackfillActionDto | null
  onSuccess?: () => void
}

function pickRange(q: Record<string, string>): { start: string; end: string } {
  const start = q.startDate ?? q.fromDate ?? q.date ?? ""
  const end = q.endDate ?? q.toDate ?? start
  return { start, end }
}

function logTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23) + "Z"
}

/** Parse SSE frames (data: {json}\\n\\n) from fetch streaming body. */
async function consumeSseLogStream(
  response: Response,
  onLogLine: (serverLine: string) => void,
  signal: AbortSignal
): Promise<void> {
  const body = response.body
  if (!body) throw new Error("No response body for log stream")

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let carry = ""

  while (!signal.aborted) {
    const { done, value } = await reader.read()
    if (done) break
    carry += decoder.decode(value, { stream: true })
    for (;;) {
      const sep = carry.indexOf("\n\n")
      if (sep < 0) break
      const block = carry.slice(0, sep)
      carry = carry.slice(sep + 2)
      for (const raw of block.split("\n")) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw
        if (!line.startsWith("data:")) continue
        const payload = line.startsWith("data: ") ? line.slice(6) : line.slice(5).trimStart()
        try {
          const obj = JSON.parse(payload) as { line?: string }
          if (typeof obj?.line === "string") onLogLine(obj.line)
          else onLogLine(payload)
        } catch {
          onLogLine(payload)
        }
      }
    }
  }
}

export function BackfillDialog({ open, onOpenChange, action, onSuccess }: BackfillDialogProps) {
  const [running, setRunning] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logLines, setLogLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const logRef = useRef<HTMLTextAreaElement>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const appendLog = useCallback((message: string) => {
    setLogLines((prev) => [...prev, `${logTimestamp()}  ${message}`])
  }, [])

  useEffect(() => {
    if (!action?.queryParams) return
    const { start, end } = pickRange(action.queryParams)
    setStartDate(start)
    setEndDate(end)
  }, [action])

  useEffect(() => {
    if (open && action) {
      setLogLines([`${logTimestamp()}  Mở hộp thoại — ${action.label}`])
      setAutoScroll(true)
    }
  }, [open, action?.endpoint, action?.label])

  useEffect(() => {
    if (!autoScroll) return
    const el = logRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [logLines, autoScroll])

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort()
    }
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (!next) streamAbortRef.current?.abort()
    onOpenChange(next)
  }

  const handleRun = async () => {
    if (!action) return
    streamAbortRef.current?.abort()
    const ac = new AbortController()
    streamAbortRef.current = ac

    setRunning(true)
    const qp = { ...action.queryParams }
    if ("startDate" in qp) qp.startDate = startDate
    if ("endDate" in qp) qp.endDate = endDate
    if ("fromDate" in qp) qp.fromDate = startDate
    if ("toDate" in qp) qp.toDate = endDate
    if ("date" in qp) qp.date = startDate

    const path = `/api/v1/jobs-test/${action.endpoint.replace(/^\/+/, "")}`
    const qs = Object.keys(qp).length > 0 ? `?${new URLSearchParams(qp).toString()}` : ""
    appendLog(`Chạy nền (async) tương đương POST ${path}${qs}`)
    appendLog("Đang mở luồng log SSE từ API (MediationPro.* / Hangfire.* trong process)…")

    try {
      const { runId, eventsUrl } = await jobsTestApi.startAsyncRun(action.endpoint, qp)
      appendLog(`runId=${runId}`)
      const streamRes = await jobsTestApi.openRunLogStream(eventsUrl, ac.signal)
      await consumeSseLogStream(
        streamRes,
        (serverLine) => {
          appendLog(serverLine)
        },
        ac.signal
      )
      appendLog("Luồng log đã kết thúc.")
      toast({
        title: "Job completed",
        description: `${action.label} — xem nhật ký bên dưới.`,
      })
      await new Promise((r) => setTimeout(r, 800))
      handleOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to run job"
      appendLog(`Lỗi: ${msg}`)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setRunning(false)
      streamAbortRef.current = null
    }
  }

  if (!action) return null

  const singleDateOnly = action.queryParams.date !== undefined && !action.queryParams.startDate && !action.queryParams.fromDate
  const logText = logLines.join("\n")

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0">
        <AlertDialogHeader>
          <AlertDialogTitle>Run backfill</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground text-left overflow-y-auto pr-1">
              <p className="text-slate-700 m-0">{action.label}</p>
              <code className="block text-xs bg-slate-100 rounded px-2 py-1 break-all text-slate-800">
                POST /api/v1/jobs-test/{action.endpoint}
              </code>
              <div className="grid gap-3 pt-1">
                {singleDateOnly ? (
                  <div>
                    <Label htmlFor="bf-date">Date (UTC)</Label>
                    <Input id="bf-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="bf-start">Start date</Label>
                      <Input id="bf-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="bf-end">End date</Label>
                      <Input id="bf-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="bf-log" className="text-slate-800">
                    Nhật ký tiến trình
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="bf-autoscroll" checked={autoScroll} onCheckedChange={(v) => setAutoScroll(v === true)} />
                    <Label htmlFor="bf-autoscroll" className="text-xs font-normal text-slate-600 cursor-pointer leading-none">
                      Tự động cuộn xuống
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Job chạy nền trên server; dòng log là <span className="font-medium">MediationPro.*</span> và{" "}
                  <span className="font-medium">Hangfire.*</span> (mức Information+) trong cùng process. File log đầy đủ vẫn nằm trên disk.
                </p>
                <textarea
                  ref={logRef}
                  id="bf-log"
                  readOnly
                  value={logText}
                  rows={10}
                  spellCheck={false}
                  className="w-full min-h-[160px] max-h-[220px] resize-y rounded-md border border-slate-200 bg-slate-950 px-2 py-1.5 text-xs font-mono text-slate-100 leading-relaxed overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  aria-label="Nhật ký tiến trình backfill"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:mt-4">
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={(e) => {
              e.preventDefault()
              void handleRun()
            }}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Running…
              </>
            ) : (
              "Run now"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
