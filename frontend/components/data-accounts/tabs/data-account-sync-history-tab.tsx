"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"

interface SyncHistoryTabProps {
  accountId: string
}

type SyncStatus = "success" | "failed" | "running"

interface SyncRecord {
  id: string
  syncTime: string
  syncTimeSort: string
  duration: string
  durationMs: number
  status: SyncStatus
  recordsSynced: number
  errorMessage: string | null
}

// ─── Mock history data ────────────────────────────────────────────────────────

function generateHistory(): SyncRecord[] {
  const records: SyncRecord[] = []
  const baseDate = new Date("2026-02-25T11:14:00Z")
  const errors = [
    "Authentication token expired. Please re-authorize the service account.",
    "Rate limit exceeded. Retry after 60 seconds.",
    "Network timeout after 30 seconds — partial data may be missing.",
    null, null, null, null, null, null, null,
  ]

  for (let i = 0; i < 48; i++) {
    const d = new Date(baseDate.getTime() - i * 2 * 60 * 60 * 1000)
    const isRunning = i === 0
    const isFailed = !isRunning && (i === 3 || i === 11 || i === 19 || i === 27)
    const status: SyncStatus = isRunning ? "running" : isFailed ? "failed" : "success"
    const durationMs = isRunning ? 0 : 45000 + Math.floor(Math.random() * 120000)
    const secs = Math.floor(durationMs / 1000)
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60

    records.push({
      id: String(i + 1),
      syncTime: d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
      syncTimeSort: d.toISOString(),
      duration: isRunning ? "—" : mins > 0 ? `${mins}m ${remSecs}s` : `${remSecs}s`,
      durationMs,
      status,
      recordsSynced: isRunning ? 0 : isFailed ? Math.floor(Math.random() * 200) : 800 + Math.floor(Math.random() * 400),
      errorMessage: isFailed ? errors[i % errors.length] : null,
    })
  }
  return records
}

const allHistory = generateHistory()

// ─── Config ───────────────────────────────────────────────────────────────────

const statusBadge: Record<SyncStatus, { label: string; className: string; icon: React.ReactNode }> = {
  success: {
    label: "Success",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: <XCircle className="w-3 h-3" />,
  },
  running: {
    label: "Running",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
}

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

type SortField = "syncTime" | "duration" | "status" | "records"
type SortDir = "asc" | "desc"

// ─── Component ────────────────────────────────────────────────────────────────

export function DataAccountSyncHistoryTab({ accountId: _accountId }: SyncHistoryTabProps) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [sortField, setSortField] = useState<SortField>("syncTime")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    let data = allHistory
    if (statusFilter !== "all") data = data.filter((r) => r.status === statusFilter)
    if (dateRange === "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      data = data.filter((r) => new Date(r.syncTimeSort) >= today)
    } else if (dateRange === "7d") {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      data = data.filter((r) => new Date(r.syncTimeSort) >= cutoff)
    } else if (dateRange === "30d") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      data = data.filter((r) => new Date(r.syncTimeSort) >= cutoff)
    }
    return data
  }, [statusFilter, dateRange])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortField === "syncTime") cmp = a.syncTimeSort.localeCompare(b.syncTimeSort)
      else if (sortField === "duration") cmp = a.durationMs - b.durationMs
      else if (sortField === "status") cmp = a.status.localeCompare(b.status)
      else if (sortField === "records") cmp = a.recordsSynced - b.recordsSynced
      return sortDir === "asc" ? cmp : -cmp
    })
    return copy
  }, [filtered, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground" />
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />
  }

  const successCount = filtered.filter((r) => r.status === "success").length
  const failedCount = filtered.filter((r) => r.status === "failed").length
  const runningCount = filtered.filter((r) => r.status === "running").length

  return (
    <TooltipProvider>
      <div className="space-y-5">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary stats */}
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{filtered.length}</span></span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Success: <span className="font-semibold text-emerald-600 dark:text-emerald-300">{successCount}</span></span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Failed: <span className="font-semibold text-destructive">{failedCount}</span></span>
            {runningCount > 0 && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">Running: <span className="font-semibold text-amber-600">{runningCount}</span></span>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No sync records</h3>
              <p className="text-sm text-muted-foreground">No syncs match the current filters</p>
              <Button
                variant="outline"
                className="mt-4 bg-transparent"
                onClick={() => { setStatusFilter("all"); setDateRange("all") }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>
                        <button
                          className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-foreground"
                          onClick={() => toggleSort("syncTime")}
                        >
                          Sync Time <SortIcon field="syncTime" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-foreground"
                          onClick={() => toggleSort("duration")}
                        >
                          Duration <SortIcon field="duration" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-foreground"
                          onClick={() => toggleSort("status")}
                        >
                          Status <SortIcon field="status" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-foreground"
                          onClick={() => toggleSort("records")}
                        >
                          Records Synced <SortIcon field="records" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide">
                        Error Message
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((record) => {
                      const sb = statusBadge[record.status]
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-sm text-foreground whitespace-nowrap">{record.syncTime}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{record.duration}</TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${sb.className}`}>
                              {sb.icon}
                              {sb.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {record.status === "running" ? (
                              <span className="text-amber-600 font-medium">In progress…</span>
                            ) : (
                              record.recordsSynced.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            {record.errorMessage ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-destructive truncate cursor-default">{record.errorMessage}</p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">{record.errorMessage}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sorted.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }}
                itemName="records"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
