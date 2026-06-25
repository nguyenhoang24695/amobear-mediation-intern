"use client"

import { useEffect, useRef, useState } from "react"
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
import { dataSourcesApi } from "@/lib/api/services"
import { useBackfillRunLogStream } from "@/hooks/use-backfill-run-log-stream"
import { useToast } from "@/hooks/use-toast"
import type { JobsTestBackfillActionDto } from "@/types/api"

interface BackfillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceKey: string
  action: JobsTestBackfillActionDto | null
  onSuccess?: () => void
}

function pickRange(q: Record<string, string>): { start: string; end: string } {
  const start = q.startDate ?? q.fromDate ?? q.date ?? ""
  const end = q.endDate ?? q.toDate ?? start
  return { start, end }
}

export function BackfillDialog({ open, onOpenChange, sourceKey, action, onSuccess }: BackfillDialogProps) {
  const [running, setRunning] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)
  const logRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const { logText, startStream, stopStream, resetLogs, appendLog } = useBackfillRunLogStream()

  useEffect(() => {
    if (!action?.queryParams) return
    const { start, end } = pickRange(action.queryParams)
    setStartDate(start)
    setEndDate(end)
  }, [action])

  useEffect(() => {
    if (open && action) {
      resetLogs(`Mở hộp thoại — ${action.label}`)
      setAutoScroll(true)
    }
    if (!open) stopStream()
  }, [open, action?.endpoint, action?.label, resetLogs, stopStream])

  useEffect(() => {
    if (!autoScroll) return
    const el = logRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [logText, autoScroll])

  const handleOpenChange = (next: boolean) => {
    if (!next) stopStream()
    onOpenChange(next)
  }

  const handleRun = async () => {
    if (!action || !sourceKey) return
    stopStream()
    setRunning(true)

    const qp = { ...action.queryParams }
    if ("startDate" in qp) qp.startDate = startDate
    if ("endDate" in qp) qp.endDate = endDate
    if ("fromDate" in qp) qp.fromDate = startDate
    if ("toDate" in qp) qp.toDate = endDate
    if ("date" in qp) qp.date = startDate

    appendLog(`Khởi chạy backfill (checkpoint theo ngày) — POST /api/v1/data-sources/backfill-runs`)
    appendLog(`Endpoint jobs-test: ${action.endpoint}`)

    try {
      const started = await dataSourcesApi.startBackfillRun({
        sourceKey,
        label: action.label,
        endpoint: action.endpoint,
        queryParams: qp,
      })
      appendLog(`runId=${started.runId}`)
      appendLog("Đang mở luồng log SSE (lưu DB — có thể xem lại trên tab Runs)…")

      await startStream(started.eventsUrl)

      appendLog("Luồng log đã kết thúc.")
      toast({
        title: "Backfill finished",
        description: `${action.label} — xem tab Runs nếu cần resume.`,
      })
      await new Promise((r) => setTimeout(r, 800))
      handleOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to run backfill"
      appendLog(`Lỗi: ${msg}`)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  if (!action) return null

  const singleDateOnly = action.queryParams.date !== undefined && !action.queryParams.startDate && !action.queryParams.fromDate

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-xl max-h-[90vh] flex flex-col gap-0">
        <AlertDialogHeader>
          <AlertDialogTitle>Run backfill</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground text-left overflow-y-auto pr-1">
              <p className="text-foreground m-0">{action.label}</p>
              <code className="block text-xs bg-muted rounded px-2 py-1 break-all text-foreground">
                POST /api/v1/data-sources/backfill-runs → jobs-test/{action.endpoint}
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
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="bf-log" className="text-foreground">
                    Nhật ký tiến trình
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="bf-autoscroll" checked={autoScroll} onCheckedChange={(v) => setAutoScroll(v === true)} />
                    <Label htmlFor="bf-autoscroll" className="text-xs font-normal text-muted-foreground cursor-pointer leading-none">
                      Tự động cuộn xuống
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground m-0">
                  Chạy từng ngày với checkpoint trong DB. Nếu đóng tab giữa chừng, mở tab <span className="font-medium">Runs</span> để
                  resume.
                </p>
                <textarea
                  ref={logRef}
                  id="bf-log"
                  readOnly
                  value={logText}
                  rows={10}
                  spellCheck={false}
                  className="w-full min-h-[160px] max-h-[220px] resize-y rounded-md border border-border bg-muted px-2 py-1.5 text-xs font-mono text-foreground leading-relaxed overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  aria-label="Nhật ký tiến trình backfill"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:mt-4">
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-primary text-primary-foreground hover:bg-primary/90"
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
