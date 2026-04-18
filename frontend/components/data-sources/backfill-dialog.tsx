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

function formatResponseForLog(data: unknown): string {
  if (data == null) return "(no body)"
  try {
    const s = typeof data === "string" ? data : JSON.stringify(data, null, 2)
    return s.length > 4000 ? `${s.slice(0, 4000)}\n… (truncated)` : s
  } catch {
    return String(data)
  }
}

export function BackfillDialog({ open, onOpenChange, action, onSuccess }: BackfillDialogProps) {
  const [running, setRunning] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [logLines, setLogLines] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const logRef = useRef<HTMLTextAreaElement>(null)
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
    if (!running) return
    const id = window.setInterval(() => {
      appendLog("Đang chờ phản hồi HTTP từ server… (job chạy đồng bộ trong request; log chi tiết trên file API / Hangfire)")
    }, 5000)
    return () => clearInterval(id)
  }, [running, appendLog])

  const handleRun = async () => {
    if (!action) return
    setRunning(true)
    const qp = { ...action.queryParams }
    if ("startDate" in qp) qp.startDate = startDate
    if ("endDate" in qp) qp.endDate = endDate
    if ("fromDate" in qp) qp.fromDate = startDate
    if ("toDate" in qp) qp.toDate = endDate
    if ("date" in qp) qp.date = startDate

    const path = `/api/v1/jobs-test/${action.endpoint.replace(/^\/+/, "")}`
    const qs =
      Object.keys(qp).length > 0 ? `?${new URLSearchParams(qp).toString()}` : ""
    appendLog(`Gửi POST ${path}${qs}`)

    try {
      const data = await jobsTestApi.runJob(action.endpoint, qp)
      appendLog("HTTP 200 — job hoàn tất trong phiên request này.")
      appendLog(`Phản hồi JSON:\n${formatResponseForLog(data)}`)
      toast({
        title: "Job triggered",
        description: `${action.label} — xem nhật ký bên dưới; log server trên API / Hangfire.`,
      })
      await new Promise((r) => setTimeout(r, 1200))
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to run job"
      appendLog(`Lỗi: ${msg}`)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  if (!action) return null

  const singleDateOnly = action.queryParams.date !== undefined && !action.queryParams.startDate && !action.queryParams.fromDate
  const logText = logLines.join("\n")

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
                    <Checkbox
                      id="bf-autoscroll"
                      checked={autoScroll}
                      onCheckedChange={(v) => setAutoScroll(v === true)}
                    />
                    <Label htmlFor="bf-autoscroll" className="text-xs font-normal text-slate-600 cursor-pointer leading-none">
                      Tự động cuộn xuống
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Dòng thời gian phía client trong lúc chờ HTTP (mỗi 5s có nhắc nếu job lâu). Log thực của ứng dụng nằm trên server, không stream qua API hiện tại.
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
