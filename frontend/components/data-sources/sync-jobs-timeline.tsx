"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Loader2, XCircle } from "lucide-react"
import type { DataSourcesTimelineDto, DataSourcesVisualBarDto } from "@/types/api"
import { formatDistanceToNow } from "date-fns"

const WINDOW_HOURS = 24
const hours = Array.from({ length: 25 }, (_, i) => i)

function rel(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return "—"
  }
}

const statusIcon: Record<string, ReactNode> = {
  success: <CheckCircle2 className="w-3 h-3 text-green-600" />,
  failed: <XCircle className="w-3 h-3 text-red-600" />,
  running: <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />,
}

function barStatus(s: string): "success" | "failed" | "running" {
  if (s === "failed" || s === "running") return s
  return "success"
}

export function SyncJobsTimeline({ timeline }: { timeline: DataSourcesTimelineDto }) {
  const { jobs, visualWindowStartUtc, visualWindowEndUtc } = timeline
  const visualRows = timeline.visualRows ?? []
  const currentHourFromWindowStart = timeline.currentHourFromWindowStart ?? WINDOW_HOURS
  const [detailsOpen, setDetailsOpen] = useState(false)

  const windowLabel =
    visualWindowStartUtc && visualWindowEndUtc
      ? `${new Date(visualWindowStartUtc).toISOString().slice(0, 10)} UTC — full calendar day (00:00–24:00); red line = now`
      : "Today UTC (calendar day)"

  const currentHour = Math.min(Math.max(currentHourFromWindowStart, 0), WINDOW_HOURS)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Sync jobs timeline &amp; status</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{windowLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Success
              </span>
              <span className="inline-flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" /> Failed
              </span>
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 text-blue-600" /> Running
              </span>
            </div>
            <Link href="/jobs" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              Job Management <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {visualRows.length > 0 && (
          <TooltipProvider>
            <div className="relative overflow-x-auto">
              <div className="flex ml-24 mb-2 min-w-[520px]">
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 text-xs text-slate-400 text-center">
                    {hour % 4 === 0 ? `${hour.toString().padStart(2, "0")}:00` : ""}
                  </div>
                ))}
              </div>

              <div className="space-y-2 min-w-[520px]">
                {visualRows.map((row) => (
                  <div key={row.sourceKey} className="flex items-center gap-4">
                    <div className="w-28 shrink-0 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${row.sourceColorClass}`} />
                      <span className="text-sm font-medium text-slate-700 truncate" title={row.sourceName}>
                        {row.sourceName}
                      </span>
                    </div>

                    <div className="flex-1 relative h-8 bg-slate-50 rounded-md">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute top-0 bottom-0 border-l border-slate-200"
                          style={{ left: `${(hour / WINDOW_HOURS) * 100}%` }}
                        />
                      ))}

                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${(currentHour / WINDOW_HOURS) * 100}%` }}
                      >
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                      </div>

                      {row.bars.map((job: DataSourcesVisualBarDto) => {
                        const st = barStatus(job.status)
                        const barTone =
                          st === "failed"
                            ? "bg-red-500 opacity-90"
                            : st === "running"
                              ? "bg-sky-500 animate-pulse"
                              : "bg-emerald-600"
                        const leftPercent = (job.startHourFromWindowStart / WINDOW_HOURS) * 100
                        const widthPercent = (job.durationHours / WINDOW_HOURS) * 100
                        const durMin = Math.round(job.durationHours * 60)
                        return (
                          <Tooltip key={job.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1 bottom-1 ${barTone} rounded cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-sm`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${Math.max(widthPercent, 0.6)}%`,
                                }}
                              >
                                {statusIcon[st]}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">{job.displayName}</p>
                                <p className="text-xs text-slate-500 font-mono">{job.jobId}</p>
                                <p className="text-xs text-slate-500">Started: {rel(job.createdAtUtc)}</p>
                                <p className="text-xs text-slate-500">Duration: ~{durMin} min (from Hangfire states)</p>
                                <p className="text-xs text-slate-500">Rows (checkpoint): {job.recordsLabel}</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    st === "success"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : st === "failed"
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                  }
                                >
                                  {st.charAt(0).toUpperCase() + st.slice(1)}
                                </Badge>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TooltipProvider>
        )}

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
              {detailsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Job details (cron, Hangfire state, checkpoints)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[200px]">Job</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Cron</TableHead>
                    <TableHead className="w-[70px]">On</TableHead>
                    <TableHead>Last run</TableHead>
                    <TableHead>Next</TableHead>
                    <TableHead>HF state</TableHead>
                    <TableHead>Checkpoint</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.jobId} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/jobs?search=${encodeURIComponent(j.jobId)}`}
                          className="text-blue-600 hover:underline"
                        >
                          {j.displayName || j.jobId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {j.sourceKey ? `${j.sourceKey}${j.domainKey ? ` / ${j.domainKey}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 max-w-[140px] truncate" title={j.cronExpression}>
                        {j.cronExpression || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={j.enabled ? "outline" : "secondary"} className="text-[10px]">
                          {j.enabled ? "yes" : "no"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{rel(j.lastExecution)}</TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{rel(j.nextExecution)}</TableCell>
                      <TableCell className="text-xs">
                        {j.lastJobState ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {j.lastJobState}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{rel(j.lastCheckpointAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
