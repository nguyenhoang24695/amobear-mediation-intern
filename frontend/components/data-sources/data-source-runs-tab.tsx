"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, Play, RefreshCw, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"
import { dataSourcesApi } from "@/lib/api/services"
import { useBackfillRunLogStream } from "@/hooks/use-backfill-run-log-stream"
import { useToast } from "@/hooks/use-toast"
import type { DataSourceBackfillRunListItemDto, DataSourceOverviewItemDto } from "@/types/api"

const STATUS_OPTIONS = ["", "running", "queued", "completed", "failed", "interrupted"] as const

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "running":
    case "queued":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "failed":
      return "bg-red-100 text-red-800 border-red-200"
    case "interrupted":
      return "bg-amber-100 text-amber-800 border-amber-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

function progressLabel(run: DataSourceBackfillRunListItemDto): string {
  const p = run.progress
  if (!p) return "—"
  const done = p.completedDates?.length ?? 0
  return `${done}/${p.totalDays || "—"}`
}

export function DataSourceRunsTab({
  sources,
  enabled,
}: {
  sources: DataSourceOverviewItemDto[]
  enabled: boolean
}) {
  const [items, setItems] = useState<DataSourceBackfillRunListItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [logRun, setLogRun] = useState<DataSourceBackfillRunListItemDto | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [resumingId, setResumingId] = useState<string | null>(null)
  const { toast } = useToast()
  const { logText, streaming, startStream, stopStream, resetLogs } = useBackfillRunLogStream()

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await dataSourcesApi.listBackfillRuns({
        sourceKey: sourceFilter || undefined,
        status: statusFilter || undefined,
        page: 1,
        pageSize: 50,
      })
      setItems(res.items)
    } catch (e: unknown) {
      setItems([])
      setError(e instanceof Error ? e.message : "Failed to load runs")
    } finally {
      setLoading(false)
    }
  }, [enabled, sourceFilter, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const hasActive = useMemo(() => items.some((r) => r.status === "running" || r.status === "queued"), [items])

  useEffect(() => {
    if (!enabled || !hasActive) return
    const t = setInterval(() => void load(), 8000)
    return () => clearInterval(t)
  }, [enabled, hasActive, load])

  const handleResume = async (run: DataSourceBackfillRunListItemDto) => {
    setResumingId(run.id)
    try {
      const started = await dataSourcesApi.resumeBackfillRun(run.id)
      toast({ title: "Resume queued", description: `${run.label} — runId=${started.runId}` })
      await load()
    } catch (e: unknown) {
      toast({
        title: "Resume failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setResumingId(null)
    }
  }

  const openLogs = (run: DataSourceBackfillRunListItemDto) => {
    setLogRun(run)
    resetLogs(`Mở log — ${run.label} (${run.status})`)
    void startStream(`/api/v1/data-sources/backfill-runs/${run.id}/events`, {
      initialMessage: "Đang kết nối luồng log…",
    })
  }

  const closeLogs = () => {
    stopStream()
    setLogRun(null)
  }

  if (!enabled) {
    return <p className="text-sm text-slate-500">Switch to this tab to load backfill runs.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Runs — backfill history</h2>
          <p className="text-sm text-slate-500 mt-1">
            Tiến trình lưu trong DB (checkpoint theo ngày). Có thể xem log hoặc resume khi failed/interrupted.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
          <Select value={sourceFilter || "__all__"} onValueChange={(v) => setSourceFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All status</SelectItem>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-9 w-full sm:w-auto" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-600 text-sm p-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 p-6">No backfill runs yet. Start one from the Details tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium">Label</th>
                    <th className="px-4 py-2 font-medium">Range</th>
                    <th className="px-4 py-2 font-medium">Progress</th>
                    <th className="px-4 py-2 font-medium">Started</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((run) => {
                    const p = run.progress
                    const pct = p && p.totalDays > 0 ? Math.round(((p.completedDates?.length ?? 0) / p.totalDays) * 100) : 0
                    const canResume = run.status === "failed" || run.status === "interrupted"
                    return (
                      <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="px-4 py-2">
                          <Badge variant="outline" className={cn("text-[10px] capitalize", statusBadgeClass(run.status))}>
                            {run.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{run.sourceKey}</td>
                        <td className="px-4 py-2 max-w-[220px] truncate" title={run.label}>
                          {run.label}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                          {p?.rangeStart && p?.rangeEnd ? `${p.rangeStart} → ${p.rangeEnd}` : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-mono text-slate-600">{progressLabel(run)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                          {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => openLogs(run)}>
                              <ScrollText className="w-4 h-4" />
                            </Button>
                            {canResume && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                disabled={resumingId === run.id}
                                onClick={() => void handleResume(run)}
                              >
                                {resumingId === run.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 mr-1" /> Resume
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={logRun != null} onOpenChange={(o) => !o && closeLogs()}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl flex-col">
          <DialogHeader>
            <DialogTitle>Run log</DialogTitle>
            <DialogDescription>{logRun?.label}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="runs-autoscroll" checked={autoScroll} onCheckedChange={(v) => setAutoScroll(v === true)} />
              <Label htmlFor="runs-autoscroll" className="text-xs font-normal cursor-pointer">
                Tự động cuộn
              </Label>
            </div>
            {streaming && (
              <span className="text-xs text-blue-600 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Live
              </span>
            )}
          </div>
          <textarea
            readOnly
            value={logText}
            rows={14}
            spellCheck={false}
            className="w-full min-h-[200px] rounded-md border border-slate-200 bg-slate-950 px-2 py-1.5 text-xs font-mono text-slate-100 leading-relaxed overflow-y-auto"
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeLogs}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
