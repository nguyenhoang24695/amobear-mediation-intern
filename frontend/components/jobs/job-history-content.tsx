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
import { cn } from "@/lib/utils"
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

function statusBadgeClass(status: string) {
  if (status === "completed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
  }
  if (status === "failed" || status === "interrupted") {
    return "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10"
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
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
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href="/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Jobs
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-semibold text-foreground">Job Run History</h1>
          <p className="truncate text-sm text-muted-foreground">{decodedJobId}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
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
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                      No runs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant={statusVariant(run.status) as any} className={statusBadgeClass(run.status)}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {format(new Date(run.startedAt), "yyyy-MM-dd HH:mm:ss")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(run.durationMs)}</TableCell>
                      <TableCell className="text-sm">{run.triggerSource}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{run.hangfireJobId || "-"}</TableCell>
                      <TableCell className="max-w-72 truncate text-sm text-destructive">
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

          <div className="grid gap-3 md:hidden">
            {loading ? (
              <Card className="border-border bg-card">
                <CardContent className="flex min-h-32 items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading history...
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No runs recorded yet.
                </CardContent>
              </Card>
            ) : (
              items.map((run) => (
                <Card key={run.id} className="border-border bg-card shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant(run.status) as any} className={statusBadgeClass(run.status)}>
                            {run.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {format(new Date(run.startedAt), "yyyy-MM-dd HH:mm:ss")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Trigger: {run.triggerSource}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void openDetail(run)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Logs
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                        <p className="mt-1 font-medium text-foreground">{formatDuration(run.durationMs)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Hangfire ID</p>
                        <p className="mt-1 break-all font-mono text-xs text-foreground">{run.hangfireJobId || "-"}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Error</p>
                      <p className={cn("mt-1 text-sm", run.errorMessage ? "text-destructive" : "text-muted-foreground")}>
                        {run.errorMessage || "No error"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
            itemName="runs"
          />
        </CardContent>
      </Card>

      <Dialog open={!!detail || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(92vw,64rem)] sm:max-w-[64rem]">
          <DialogHeader className="border-b border-border px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle>Run Logs</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {detailLoading && !detail ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading logs...
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
                    <p className="mt-1 font-medium text-foreground">{detail.status}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Trigger</span>
                    <p className="mt-1 font-medium text-foreground">{detail.triggerSource}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Duration</span>
                    <p className="mt-1 font-medium text-foreground">{formatDuration(detail.durationMs)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Log Output</p>
                    <p className="text-xs text-muted-foreground">
                      {detail.logs.length} line{detail.logs.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <pre className="max-h-[60dvh] overflow-auto bg-muted/20 p-4 text-xs leading-relaxed text-foreground">
                    {detail.logs.length > 0
                      ? detail.logs
                          .map(
                            (line) =>
                              `[${line.lineNo}] ${format(new Date(line.loggedAt), "yyyy-MM-dd HH:mm:ss")} ${line.message}`,
                          )
                          .join("\n")
                      : "No log lines captured."}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
