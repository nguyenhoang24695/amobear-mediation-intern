"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { AlertCircle, GitCompareArrows, ImageIcon, Loader2, RotateCw, Search } from "lucide-react"
import { toast } from "sonner"
import { admobMonitoringApi } from "@/lib/api/admob-monitoring"
import { hasScreenFunction } from "@/lib/auth"
import type { PerformanceSyncCompareItem } from "@/types/admob-monitoring"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Pagination } from "@/components/shared/pagination"
import { StringMultiSelectCombobox } from "@/components/shared/string-multi-select-combobox"
import { cn } from "@/lib/utils"

const RECOMPARE_TOOLTIP =
  "Đọc lại dữ liệu bronze (admob_revenue_table so với bảng nguồn). Không gọi AdMob API. Nếu delta trong ngưỡng cho phép thì xóa dòng khỏi hàng đợi; nếu vẫn lệch thì cập nhật Revenue, Detail và Delta."

const RESYNC_TOOLTIP =
  "Kéo lại dữ liệu từ AdMob API và ghi lại bronze cho từng grain (ngày, app, platform). Chạy nền qua Hangfire. Dùng khi cần làm mới dữ liệu nguồn sau khi sync đã chạy."

const SOURCE_TABLE_FILTER_OPTIONS = [
  { value: "admob_table", label: "AdMob table" },
  { value: "mkt_table", label: "MKT table" },
  { value: "mediation_table", label: "Mediation table" },
] as const

const ALL_SOURCE_TABLE_VALUES = SOURCE_TABLE_FILTER_OPTIONS.map((o) => o.value)

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Waiting", label: "Waiting" },
  { value: "Running", label: "Running" },
]

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "ANDROID", label: "Android" },
  { value: "IOS", label: "iOS" },
]

function defaultStartDate() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format(date, "PP HH:mm")
}

function formatRelative(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value ?? 0)
}

function statusBadgeClass(status: string) {
  if (status.toLowerCase() === "running") return "border-primary/20 bg-primary/10 text-primary"
  if (status.toLowerCase() === "waiting") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-border bg-muted text-muted-foreground"
}

function sourceLabel(value: string) {
  return SOURCE_TABLE_FILTER_OPTIONS.find((item) => item.value === value)?.label ?? value
}

function renderPlatformBadge(platformValue: string) {
  const platform = platformValue || "Unknown"
  const isAndroid = platform.toUpperCase() === "ANDROID"

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isAndroid
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {isAndroid ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
        </svg>
      )}
      {platform}
    </Badge>
  )
}

export function AdmobMonitoringCompareTab() {
  const canRun = hasScreenFunction("s-monitoring-admob", "run")

  const [items, setItems] = useState<PerformanceSyncCompareItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(today)
  const [selectedSourceTables, setSelectedSourceTables] = useState<Set<string>>(
    () => new Set(ALL_SOURCE_TABLE_VALUES),
  )
  const [status, setStatus] = useState("Waiting")
  const [platform, setPlatform] = useState("all")
  const [appSearch, setAppSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const [recomparing, setRecomparing] = useState(false)
  const [selectedHashKeys, setSelectedHashKeys] = useState<Set<string>>(() => new Set())

  const waitingItems = useMemo(
    () => items.filter((item) => item.status.toLowerCase() === "waiting"),
    [items],
  )
  const selectedCount = selectedHashKeys.size
  const allWaitingSelected =
    waitingItems.length > 0 && waitingItems.every((item) => selectedHashKeys.has(item.hashKey))
  const someWaitingSelected =
    waitingItems.some((item) => selectedHashKeys.has(item.hashKey)) && !allWaitingSelected

  const selectedSourceList = useMemo(() => [...selectedSourceTables], [selectedSourceTables])

  const loadData = useCallback(async () => {
    if (selectedSourceList.length === 0) {
      setItems([])
      setTotal(0)
      setTotalPages(0)
      toast.error("Chọn ít nhất một nguồn (Source).")
      return
    }

    setLoading(true)
    try {
      const sourceTables =
        selectedSourceList.length >= ALL_SOURCE_TABLE_VALUES.length ? undefined : selectedSourceList

      const response = await admobMonitoringApi.listPerformanceSyncCompare({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sourceTables,
        status,
        platform: platform === "all" ? undefined : platform,
        appSearch: appSearch.trim() || undefined,
        page,
        pageSize,
      })
      setItems(response.items ?? [])
      setTotal(response.total ?? 0)
      setTotalPages(response.totalPages ?? 0)
      setSelectedHashKeys((prev) => {
        const visible = new Set((response.items ?? []).map((item) => item.hashKey))
        const next = new Set<string>()
        for (const key of prev) {
          if (visible.has(key)) next.add(key)
        }
        return next
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load AdMob monitoring rows"
      toast.error(message)
      setItems([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [appSearch, endDate, page, pageSize, platform, selectedSourceList, startDate, status])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const applyFilters = () => {
    if (page === 1) {
      void loadData()
    } else {
      setPage(1)
    }
  }

  const toggleRow = (item: PerformanceSyncCompareItem, checked: boolean) => {
    if (item.status.toLowerCase() !== "waiting") return
    setSelectedHashKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(item.hashKey)
      else next.delete(item.hashKey)
      return next
    })
  }

  const toggleCurrentPage = (checked: boolean) => {
    setSelectedHashKeys((prev) => {
      const next = new Set(prev)
      for (const item of waitingItems) {
        if (checked) next.add(item.hashKey)
        else next.delete(item.hashKey)
      }
      return next
    })
  }

  const resyncSelected = async () => {
    if (selectedHashKeys.size === 0) return
    setResyncing(true)
    try {
      const response = await admobMonitoringApi.resyncPerformanceSyncCompare({
        hashKeys: [...selectedHashKeys],
      })
      if (response.queued) {
        toast.success(`Queued ${response.count} row(s) for re-sync${response.jobId ? ` (job ${response.jobId})` : ""}.`)
      } else {
        toast.info("No Waiting rows were queued. They may already be running or completed.")
      }
      setSelectedHashKeys(new Set())
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to queue re-sync"
      toast.error(message)
    } finally {
      setResyncing(false)
    }
  }

  const recompareSelected = async () => {
    if (selectedHashKeys.size === 0) return
    setRecomparing(true)
    try {
      const response = await admobMonitoringApi.recomparePerformanceSyncCompare({
        hashKeys: [...selectedHashKeys],
      })
      const parts: string[] = []
      if (response.matchedDeleted > 0) parts.push(`${response.matchedDeleted} removed (matched)`)
      if (response.updated > 0) parts.push(`${response.updated} updated (still mismatched)`)
      if (response.failed > 0) parts.push(`${response.failed} failed`)
      toast.success(parts.length > 0 ? `Re-compare: ${parts.join(", ")}.` : "Re-compare completed.")
      setSelectedHashKeys(new Set())
      await loadData()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to re-compare"
      toast.error(message)
    } finally {
      setRecomparing(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Filter by date, source table, status, platform, or app name/app id/app store id.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">End date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-filter">Source</Label>
              <StringMultiSelectCombobox
                id="source-filter"
                options={SOURCE_TABLE_FILTER_OPTIONS}
                values={selectedSourceList}
                onChange={(next) => setSelectedSourceTables(new Set(next))}
                placeholder="Select sources"
                searchPlaceholder="Search sources..."
                emptyMessage="No sources found."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-search">Search apps</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="app-search"
                  className="min-w-0"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Name, App ID, Store ID..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="self-start sm:self-auto"
                  onClick={applyFilters}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Compare Queue</CardTitle>
            <CardDescription>
              Select Waiting rows to re-compare (update metrics or remove if matched) or queue background re-sync.
            </CardDescription>
          </div>
          {selectedCount > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm font-medium text-muted-foreground">{selectedCount} selected</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => void recompareSelected()}
                      disabled={!canRun || recomparing || resyncing}
                    >
                      {recomparing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GitCompareArrows className="mr-2 h-4 w-4" />
                      )}
                      Re-compare selected
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {RECOMPARE_TOOLTIP}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex w-full sm:w-auto">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => void resyncSelected()}
                      disabled={!canRun || resyncing || recomparing}
                    >
                      {resyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCw className="mr-2 h-4 w-4" />
                      )}
                      Re-sync selected
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {RESYNC_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allWaitingSelected ? true : someWaitingSelected ? "indeterminate" : false}
                      disabled={waitingItems.length === 0}
                      onCheckedChange={(value) => toggleCurrentPage(value === true)}
                      aria-label="Select all waiting rows on current page"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Apps</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-28 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading rows…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-28 text-center text-muted-foreground">
                      No compare rows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const isWaiting = item.status.toLowerCase() === "waiting"
                    return (
                      <TableRow key={item.hashKey}>
                        <TableCell>
                          <Checkbox
                            checked={selectedHashKeys.has(item.hashKey)}
                            disabled={!isWaiting}
                            onCheckedChange={(value) => toggleRow(item, value === true)}
                            aria-label={`Select row ${item.hashKey}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{item.date}</TableCell>
                        <TableCell className="min-w-[320px]">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage src={item.appIconUri || "/placeholder.svg"} alt={item.appName || item.appId} />
                              <AvatarFallback className="rounded-lg bg-muted">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <Link
                                href={`/apps/${item.appId}`}
                                className="block truncate text-sm font-medium text-primary hover:underline"
                                title={item.appName || item.appId}
                              >
                                {item.appName || item.appId}
                              </Link>
                              <div className="truncate text-xs text-muted-foreground" title={item.appId}>
                                {item.appId}
                              </div>
                              {item.appStoreId ? (
                                <div className="truncate font-mono text-[11px] text-muted-foreground" title={item.appStoreId}>
                                  Store: {item.appStoreId}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{renderPlatformBadge(item.platform)}</TableCell>
                        <TableCell>{sourceLabel(item.sourceTable)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatNumber(item.revenueTableEarnings)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatNumber(item.detailTableSum)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatNumber(item.delta)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>{formatDateTime(item.detectedAt)}</div>
                          <div className="text-xs text-muted-foreground">{formatRelative(item.detectedAt)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div>{formatDateTime(item.lastSyncAttemptAt)}</div>
                          <div className="text-xs text-muted-foreground">{formatRelative(item.lastSyncAttemptAt)}</div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {item.lastError ? (
                            <div className="flex items-start gap-1 text-xs text-red-600" title={item.lastError}>
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-2">{item.lastError}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={Math.max(1, totalPages)}
            totalItems={total}
            pageSize={pageSize}
            itemName="rows"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
