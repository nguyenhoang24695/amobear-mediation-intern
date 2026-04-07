"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/shared/pagination"
import { useApi } from "@/hooks/use-api"
import { metaInsightsApi } from "@/lib/api/meta-ads"
import { cn } from "@/lib/utils"
import type { MetaCampaignBreakdownDto } from "@/types/meta-ads"
import { formatCompactNumber, formatCurrency, formatPercent } from "./meta-insights-utils"

type SortBy = "campaignName" | "accountId" | "spend" | "installs" | "cpi" | "clicks" | "ctr" | "cpm" | "impressions" | "reach" | "frequency"
type SortDir = "asc" | "desc"

interface MetaCampaignTableProps {
  startDate: string
  endDate: string
  accountId?: string
  campaignId?: string
  country?: string
  refreshToken: number
}

const columns: { key: SortBy; label: string; align?: "right" }[] = [
  { key: "campaignName", label: "Campaign" },
  { key: "accountId", label: "Account" },
  { key: "spend", label: "Spend", align: "right" },
  { key: "installs", label: "Installs", align: "right" },
  { key: "cpi", label: "CPI", align: "right" },
  { key: "clicks", label: "Clicks", align: "right" },
  { key: "ctr", label: "CTR", align: "right" },
  { key: "cpm", label: "CPM", align: "right" },
  { key: "impressions", label: "Impressions", align: "right" },
  { key: "reach", label: "Reach", align: "right" },
  { key: "frequency", label: "Frequency", align: "right" },
]

function getCpiToneClass(value: number): string {
  if (value <= 1) return "bg-emerald-50 text-emerald-700"
  if (value <= 3) return "bg-amber-50 text-amber-700"
  return "bg-rose-50 text-rose-700"
}

function getCtrToneClass(value: number): string {
  if (value >= 2) return "bg-emerald-50 text-emerald-700"
  if (value >= 1) return "bg-amber-50 text-amber-700"
  return "bg-rose-50 text-rose-700"
}

function SortButton({ label, active, dir, onClick, align }: { label: string; active: boolean; dir: SortDir; onClick: () => void; align?: "right" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900",
        align === "right" && "ml-auto"
      )}
    >
      <span>{label}</span>
      {active ? (dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5" />}
    </button>
  )
}

function MetricCell({ value, className }: { value: string; className?: string }) {
  return <div className={cn("text-right text-sm font-medium text-slate-700", className)}>{value}</div>
}

function CampaignCell({ item }: { item: MetaCampaignBreakdownDto }) {
  return (
    <div className="space-y-1">
      <div className="font-medium text-slate-900">{item.campaignName || item.campaignId}</div>
      <div className="text-xs text-slate-500">{item.campaignId}</div>
      {item.appId ? <div className="text-xs text-slate-400">App: {item.appId}</div> : null}
    </div>
  )
}

export function MetaCampaignTable({ startDate, endDate, accountId, campaignId, country, refreshToken }: MetaCampaignTableProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("spend")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, accountId, campaignId, country, deferredSearch, sortBy, sortDir])

  const cacheKey = useMemo(
    () => [
      "meta-insights-campaigns",
      startDate,
      endDate,
      accountId ?? "all",
      campaignId ?? "all",
      country ?? "all",
      deferredSearch,
      sortBy,
      sortDir,
      page,
      pageSize,
    ].join(":"),
    [startDate, endDate, accountId, campaignId, country, deferredSearch, sortBy, sortDir, page, pageSize],
  )

  const { data, loading, error, refetch } = useApi(
    () => metaInsightsApi.getCampaigns({
      startDate,
      endDate,
      accountId,
      campaignId,
      country,
      search: deferredSearch.trim() || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    {
      cacheKey,
      onSuccess: (response) => {
        if (response.page !== page) {
          setPage(response.page)
        }
      },
    },
  )

  useEffect(() => {
    if (refreshToken > 0) {
      void refetch()
    }
  }, [refreshToken, refetch])

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortBy(column)
    setSortDir(column === "campaignName" || column === "accountId" ? "asc" : "desc")
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">Campaign Performance</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Sortable, server-paginated campaign performance from Meta campaign ROI facts.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaign name or ID"
            className="h-10 border-slate-200 pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {columns.map((column) => (
                  <TableHead key={column.key} className={cn("whitespace-nowrap px-4", column.align === "right" && "text-right")}>
                    <SortButton
                      label={column.label}
                      active={sortBy === column.key}
                      dir={sortDir}
                      onClick={() => handleSort(column.key)}
                      align={column.align}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={11} className="px-4 py-3">
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-4 py-10 text-center text-sm text-rose-600">
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                    No campaign data matches the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((item) => (
                  <TableRow key={item.campaignId} className="transition-colors hover:bg-slate-50/80">
                    <TableCell className="px-4 py-3"><CampaignCell item={item} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-600">{item.accountId}</TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCurrency(item.spend)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCompactNumber(item.installs)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCurrency(item.cpi)} className={cn("rounded-md px-2 py-1", getCpiToneClass(item.cpi))} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCompactNumber(item.clicks)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatPercent(item.ctr)} className={cn("rounded-md px-2 py-1", getCtrToneClass(item.ctr))} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCurrency(item.cpm)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCompactNumber(item.impressions)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={formatCompactNumber(item.reach)} /></TableCell>
                    <TableCell className="px-4 py-3"><MetricCell value={item.frequency.toFixed(2)} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.total > 0 ? (
          <Pagination
            currentPage={data.page}
            totalPages={Math.max(data.totalPages, 1)}
            totalItems={data.total}
            pageSize={data.pageSize}
            itemName="campaigns"
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
