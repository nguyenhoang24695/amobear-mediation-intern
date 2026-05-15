"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ExternalLink, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import type { AppMediationBronzeMediationGroupRow } from "@/types/api"

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultEndYmd(): string {
  return ymdUtc(new Date())
}

function defaultStartYmd(): string {
  const s = new Date()
  s.setUTCDate(s.getUTCDate() - 6)
  return ymdUtc(s)
}

export interface AppMediationGroupsMediationTabProps {
  appRowId?: number
}

export function AppMediationGroupsMediationTab({ appRowId }: AppMediationGroupsMediationTabProps) {
  const [startDate, setStartDate] = useState(defaultStartYmd)
  const [endDate, setEndDate] = useState(defaultEndYmd)
  const [country, setCountry] = useState("")
  const [appVersion, setAppVersion] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, country, appVersion, debouncedSearch])

  const filterOptsKey = useMemo(
    () => (appRowId ? `bronze_mg_filter_${appRowId}_${startDate}_${endDate}` : undefined),
    [appRowId, startDate, endDate],
  )

  const { data: filterOpts, loading: loadingOpts } = useApi(
    () => structureApi.getAppMediationBronzeFilterOptions(appRowId!, startDate, endDate),
    { enabled: !!appRowId, cacheKey: filterOptsKey },
  )

  const dataKey = useMemo(
    () =>
      appRowId
        ? `bronze_mg_${appRowId}_${startDate}_${endDate}_${country}_${appVersion}_${debouncedSearch}_${page}_${pageSize}`
        : undefined,
    [appRowId, startDate, endDate, country, appVersion, debouncedSearch, page, pageSize],
  )

  const { data: payload, loading, error } = useApi(
    () =>
      structureApi.getAppMediationBronzeMediationGroups(appRowId!, {
        startDate,
        endDate,
        country: country || undefined,
        appVersion: appVersion || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      }),
    { enabled: !!appRowId, cacheKey: dataKey },
  )

  const rows = payload?.mediationGroups ?? []
  const totalCount = payload?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    if (totalCount === 0) return
    if (page > totalPages) setPage(totalPages)
  }, [totalCount, totalPages, page])

  if (!appRowId) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-500">Đang tải app…</div>
    )
  }

  const starRocksEnabled = payload?.starRocksEnabled ?? filterOpts?.starRocksEnabled ?? true

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Rollup từ <code className="text-xs bg-slate-100 px-1 rounded">bronze.mediation_table</code>
        {payload?.startDate && payload?.endDate ? (
          <span className="text-slate-500">
            {" "}
            · {payload.startDate} → {payload.endDate}
          </span>
        ) : null}
      </p>

      {!starRocksEnabled && (
        <Card className="border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {payload?.message || "StarRocks chưa cấu hình — không thể tải dữ liệu Bronze."}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="bronze-mg-start" className="shrink-0 text-sm">
            Từ ngày (UTC)
          </Label>
          <Input
            id="bronze-mg-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="bronze-mg-end" className="shrink-0 text-sm">
            Đến ngày (UTC)
          </Label>
          <Input
            id="bronze-mg-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-row items-center gap-2 min-w-[180px]">
          <Label htmlFor="bronze-mg-country" className="shrink-0 text-sm">
            Country
          </Label>
          <Select
            value={country || "__all__"}
            onValueChange={(v) => setCountry(v === "__all__" ? "" : v)}
            disabled={loadingOpts}
          >
            <SelectTrigger id="bronze-mg-country" className="flex-1 min-w-0">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả</SelectItem>
              {(filterOpts?.countries ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-row items-center gap-2 min-w-[200px]">
          <Label htmlFor="bronze-mg-appver" className="shrink-0 text-sm">
            App version
          </Label>
          <Select
            value={appVersion || "__all__"}
            onValueChange={(v) => setAppVersion(v === "__all__" ? "" : v)}
            disabled={loadingOpts}
          >
            <SelectTrigger id="bronze-mg-appver" className="flex-1 min-w-0">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả</SelectItem>
              {(filterOpts?.appVersionNames ?? []).map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={() => {
            setStartDate(defaultStartYmd())
            setEndDate(defaultEndYmd())
            setCountry("")
            setAppVersion("")
            setSearchQuery("")
            setDebouncedSearch("")
            setPage(1)
            setPageSize(20)
          }}
        >
          Reset Filter
        </Button>
        </div>
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            id="bronze-mg-search"
            placeholder="Tìm theo tên hoặc Mediation Group ID"
            aria-label="Tìm theo tên hoặc Mediation Group ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 w-full"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error.message || "Lỗi tải dữ liệu"}</p>}

      <Card className="border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 font-medium">
                <th className="w-10 px-2 py-3 text-left" aria-label="Chi tiết raw" />
                <th className="px-4 py-3 text-left min-w-[200px]">Mediation group</th>
                <th className="px-4 py-3 text-left">Countries</th>
                <th className="px-4 py-3 text-right">eCPM</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Ad requests</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Fill %</th>
                <th className="px-4 py-3 text-right w-24"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có nhóm có dữ liệu trong khoảng lọc (hoặc chưa sync `mediation_table`).
                  </td>
                </tr>
              ) : (
                rows.map((g) => <MediationGroupRow key={g.mediationGroupId} group={g} />)
              )}
            </tbody>
          </table>
        </div>
        {!loading && starRocksEnabled && totalCount > 0 ? (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            itemName="mediation groups"
            onPageChange={setPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz)
              setPage(1)
            }}
          />
        ) : null}
      </Card>
    </div>
  )
}

function MediationGroupRow({ group }: { group: AppMediationBronzeMediationGroupRow }) {
  const [expanded, setExpanded] = useState(false)
  const fillRate = group.fillRate ?? 0
  const countries = group.countries ?? []
  const rawJson = JSON.stringify(group, null, 2)
  const imp = group.impressions ?? 0
  const req = group.adRequests ?? 0
  const rev = group.revenue ?? 0
  const hasBronzeMetrics = imp > 0 || req > 0 || rev > 0
  return (
    <>
      <tr className={cn("hover:bg-slate-50 transition-colors", expanded && "bg-slate-50/80")}>
        <td className="w-10 px-2 py-3 align-middle">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 text-slate-600", expanded && "bg-slate-200 text-slate-900")}
            aria-expanded={expanded}
            aria-label={expanded ? "Thu gọn dữ liệu raw" : "Xem dữ liệu raw dòng này"}
            onClick={() => setExpanded((e) => !e)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-900">{group.displayName}</span>
            <code className="text-xs text-slate-500 font-mono">{group.mediationGroupId}</code>
          </div>
        </td>
        <td className="px-4 py-3 max-w-[220px]">
          <div className="flex flex-wrap gap-1">
            {countries.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              countries.slice(0, 6).map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px] font-normal">
                  {c}
                </Badge>
              ))
            )}
            {countries.length > 6 ? (
              <span className="text-xs text-slate-500">+{countries.length - 6}</span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {imp > 0 ? `$${group.ecpm.toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3 text-right text-sm text-slate-700">
          {hasBronzeMetrics ? imp.toLocaleString() : "—"}
        </td>
        <td className="px-4 py-3 text-right text-sm text-slate-700">
          {hasBronzeMetrics ? req.toLocaleString() : "—"}
        </td>
        <td className="px-4 py-3 text-right text-sm font-medium">
          {hasBronzeMetrics ? `$${rev.toFixed(2)}` : "—"}
        </td>
        <td className={cn("px-4 py-3 text-right text-sm", fillRate >= 90 ? "text-green-600" : "")}>
          {hasBronzeMetrics && req > 0 ? `${fillRate.toFixed(1)}%` : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
            <Link href={`/mediation/${encodeURIComponent(group.mediationGroupId)}`}>
              <ExternalLink className="w-3.5 h-3.5" />
              Chi tiết
            </Link>
          </Button>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-200/90">
          <td colSpan={9} className="px-4 py-3 border-t border-slate-300">
            <p className="text-xs font-medium text-slate-600 mb-2">Raw (JSON) — phản hồi API cho dòng này</p>
            <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-all max-h-[min(24rem,70vh)] overflow-auto rounded border border-slate-300/80 bg-slate-100 p-3">
              {rawJson}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  )
}
