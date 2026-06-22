"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { ArrowLeft, Eye, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { jobSchedulesApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { JobRunDetailDto, JobRunListItemDto } from "@/types/api"

const SCREEN_JOBS = "s-jobs"
const FN_VIEW = "view"

function statusVariant(status: string) {
  if (status === "completed") return "default"
  if (status === "failed" || status === "interrupted") return "destructive"
  return "secondary"
}

function formatDuration(ms?: number | null) {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms} ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}m ${rest}s`
}

export function JobHistoryContent({ jobId }: { jobId: string }) {
  const canView = hasScreenFunction(SCREEN_JOBS, FN_VIEW)
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [items, setItems] = useState<JobRunListItemDto[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<JobRunDetailDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const { toast } = useToast()

  const decodedJobId = useMemo(() => decodeURIComponent(jobId), [jobId])

  const load = async () => {
    setLoading(true)
    try {
      const res = await jobSchedulesApi.listRuns(decodedJobId, {
        status: status === "all" ? undefined : status,
        page,
        pageSize,
      })
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (error: any) {
      toast({
        title: "Failed to load history",
        description: error?.message || "Could not load job run history.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, decodedJobId, status, page, pageSize])

  const openDetail = async (run: JobRunListItemDto) => {
    setDetailLoading(true)
    try {
      const res = await jobSchedulesApi.getRun(decodedJobId, run.id)
      setDetail(res)
    } catch (error: any) {
      toast({
        title: "Failed to load logs",
        description: error?.message || "Could not load job run logs.",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }

  if (!canView) return <NoPermissionView />

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href="/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Jobs
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-semibold text-slate-900">Job Run History</h1>
          <p className="truncate text-sm text-slate-500">{decodedJobId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="interrupted">Interrupted</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Hangfire ID</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                      No runs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant={statusVariant(run.status) as any}>{run.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-900">
                          {format(new Date(run.startedAt), "yyyy-MM-dd HH:mm:ss")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(run.durationMs)}</TableCell>
                      <TableCell className="text-sm">{run.triggerSource}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{run.hangfireJobId || "-"}</TableCell>
                      <TableCell className="max-w-72 truncate text-sm text-red-600">
                        {run.errorMessage || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => void openDetail(run)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={!!detail || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Run Logs</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading logs...
            </div>
          ) : detail ? (
            <div className="space-y-3">
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div><span className="text-slate-500">Status:</span> {detail.status}</div>
                <div><span className="text-slate-500">Trigger:</span> {detail.triggerSource}</div>
                <div><span className="text-slate-500">Duration:</span> {formatDuration(detail.durationMs)}</div>
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                {detail.logs.length > 0
                  ? detail.logs.map((line) => `[${line.lineNo}] ${format(new Date(line.loggedAt), "yyyy-MM-dd HH:mm:ss")} ${line.message}`).join("\n")
                  : "No log lines captured."}
              </pre>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
