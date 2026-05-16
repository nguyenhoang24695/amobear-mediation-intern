"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RectangleHorizontal, Copy, Check, Eye } from "lucide-react"
import { cn, copyTextToClipboard } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import type { AppMediationBronzeAdUnitRow, AppMediationBronzeAdUnitDetailRow } from "@/types/api"

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Chuỗi date từ API (ISO). */
function ymdFromDetailDate(iso: string): string {
  if (!iso) return "—"
  const s = iso.slice(0, 10)
  return s.length === 10 ? s : iso
}

function defaultEndYmd(): string {
  return ymdUtc(new Date())
}

function defaultStartYmd(): string {
  const s = new Date()
  s.setUTCDate(s.getUTCDate() - 6)
  return ymdUtc(s)
}

const formatColors: Record<string, string> = {
  BANNER: "bg-blue-50 text-blue-700 border-blue-200",
  INTERSTITIAL: "bg-purple-50 text-purple-700 border-purple-200",
  REWARDED: "bg-amber-50 text-amber-700 border-amber-200",
  NATIVE: "bg-green-50 text-green-700 border-green-200",
  APP_OPEN: "bg-cyan-50 text-cyan-700 border-cyan-200",
}

export interface AppAdUnitsMediationTabProps {
  appRowId?: number
}

export function AppAdUnitsMediationTab({ appRowId }: AppAdUnitsMediationTabProps) {
  const [startDate, setStartDate] = useState(defaultStartYmd)
  const [endDate, setEndDate] = useState(defaultEndYmd)
  const [country, setCountry] = useState("")
  const [appVersion, setAppVersion] = useState("")
  const [waterfallOnly, setWaterfallOnly] = useState(true)
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
  }, [startDate, endDate, country, appVersion, waterfallOnly, debouncedSearch])

  const filterOptsKey = useMemo(
    () => (appRowId ? `bronze_filter_${appRowId}_${startDate}_${endDate}` : undefined),
    [appRowId, startDate, endDate],
  )

  const { data: filterOpts, loading: loadingOpts } = useApi(
    () => structureApi.getAppMediationBronzeFilterOptions(appRowId!, startDate, endDate),
    { enabled: !!appRowId, cacheKey: filterOptsKey },
  )

  const dataKey = useMemo(
    () =>
      appRowId
        ? `bronze_adu_${appRowId}_${startDate}_${endDate}_${country}_${appVersion}_${waterfallOnly}_${debouncedSearch}_${page}_${pageSize}`
        : undefined,
    [appRowId, startDate, endDate, country, appVersion, waterfallOnly, debouncedSearch, page, pageSize],
  )

  const { data: payload, loading, error } = useApi(
    () =>
      structureApi.getAppMediationBronzeAdUnits(appRowId!, {
        startDate,
        endDate,
        country: country || undefined,
        appVersion: appVersion || undefined,
        waterfallOnly,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      }),
    { enabled: !!appRowId, cacheKey: dataKey },
  )

  const rows = payload?.adUnits ?? []
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
        Metrics từ <code className="text-xs bg-slate-100 px-1 rounded">bronze.mediation_table</code>
        {payload?.startDate && payload?.endDate ? (
          <span className="text-slate-500">
            {" "}
            · {payload.startDate} → {payload.endDate}
          </span>
        ) : null}
        {waterfallOnly ? (
          <span className="text-slate-500"> · chỉ dòng waterfall AdMob</span>
        ) : (
          <span className="text-slate-500"> · tất cả ad_source</span>
        )}
      </p>

      {!starRocksEnabled && (
        <Card className="border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          {payload?.message || "StarRocks chưa cấu hình — không thể tải dữ liệu Bronze."}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="bronze-adu-start" className="shrink-0 text-sm">
            Từ ngày (UTC)
          </Label>
          <Input
            id="bronze-adu-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <Label htmlFor="bronze-adu-end" className="shrink-0 text-sm">
            Đến ngày (UTC)
          </Label>
          <Input
            id="bronze-adu-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-row items-center gap-2 min-w-[180px]">
          <Label htmlFor="bronze-adu-country" className="shrink-0 text-sm">
            Country
          </Label>
          <Select
            value={country || "__all__"}
            onValueChange={(v) => setCountry(v === "__all__" ? "" : v)}
            disabled={loadingOpts}
          >
            <SelectTrigger id="bronze-adu-country" className="flex-1 min-w-0">
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
          <Label htmlFor="bronze-adu-appver" className="shrink-0 text-sm">
            App version
          </Label>
          <Select
            value={appVersion || "__all__"}
            onValueChange={(v) => setAppVersion(v === "__all__" ? "" : v)}
            disabled={loadingOpts}
          >
            <SelectTrigger id="bronze-adu-appver" className="flex-1 min-w-0">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="bronze-adu-wf"
            checked={waterfallOnly}
            onCheckedChange={(c) => setWaterfallOnly(c === true)}
          />
          <Label htmlFor="bronze-adu-wf" className="text-sm font-normal cursor-pointer">
            Chỉ waterfall AdMob
          </Label>
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
            setWaterfallOnly(true)
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
            id="bronze-adu-search"
            placeholder="Tìm theo tên hoặc Ad Unit ID"
            aria-label="Tìm theo tên hoặc Ad Unit ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 w-full"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error.message || "Lỗi tải dữ liệu"}</p>
      )}

      <Card className="border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 font-medium">
                <th className="w-10 px-2 py-3 text-left" aria-label="Chi tiết raw" />
                <th className="px-4 py-3 text-left min-w-[180px]">Name</th>
                <th className="px-4 py-3 text-left">Format</th>
                <th className="px-4 py-3 text-left min-w-[200px]">Ad Unit ID</th>
                <th className="px-4 py-3 text-right">eCPM</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Ad requests</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Fill %</th>
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
                    Không có dòng phù hợp (hoặc chưa có sync mediation Bronze trong khoảng ngày này).
                  </td>
                </tr>
              ) : (
                rows.map((unit) => (
                  <MediationAdUnitRow
                    key={unit.id}
                    unit={unit}
                    appRowId={appRowId}
                    startDate={startDate}
                    endDate={endDate}
                    country={country}
                    appVersion={appVersion}
                    waterfallOnly={waterfallOnly}
                    starRocksEnabled={starRocksEnabled}
                  />
                ))
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
            itemName="ad units"
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

function MediationAdUnitRow({
  unit,
  appRowId,
  startDate,
  endDate,
  country,
  appVersion,
  waterfallOnly,
  starRocksEnabled,
}: {
  unit: AppMediationBronzeAdUnitRow
  appRowId: number
  startDate: string
  endDate: string
  country: string
  appVersion: string
  waterfallOnly: boolean
  starRocksEnabled: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const detailKey = useMemo(
    () =>
      expanded && starRocksEnabled
        ? `bronze_adu_detail_${appRowId}_${unit.adUnitId}_${startDate}_${endDate}_${country}_${appVersion}_${waterfallOnly}`
        : undefined,
    [
      expanded,
      starRocksEnabled,
      appRowId,
      unit.adUnitId,
      startDate,
      endDate,
      country,
      appVersion,
      waterfallOnly,
    ],
  )

  const { data: detailPayload, loading: detailLoading, error: detailError } = useApi(
    () =>
      structureApi.getAppMediationBronzeAdUnitDetailRows(appRowId, {
        adUnitId: unit.adUnitId,
        startDate,
        endDate,
        country: country || undefined,
        appVersion: appVersion || undefined,
        waterfallOnly,
        limit: 500,
      }),
    { enabled: expanded && starRocksEnabled, cacheKey: detailKey },
  )

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
    }
  }, [])

  const handleCopyAdUnitId = async () => {
    const ok = await copyTextToClipboard(unit.adUnitId)
    if (!ok) return
    if (copyResetRef.current) clearTimeout(copyResetRef.current)
    setCopied(true)
    copyResetRef.current = setTimeout(() => {
      setCopied(false)
      copyResetRef.current = null
    }, 2000)
  }

  const format = unit.adFormat || "Unknown"
  const formatDisplay = format
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
  const fillRate = unit.fillRate ?? 0
  const detailRows = detailPayload?.rows ?? []
  const imp = unit.impressions ?? 0
  const req = unit.adRequests ?? 0
  const rev = unit.revenue ?? 0
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
            aria-label={expanded ? "Thu gọn bảng chi tiết Bronze" : "Mở bảng chi tiết Bronze (từng dòng hash_key + ngày)"}
            onClick={() => setExpanded((e) => !e)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-slate-900">
          {unit.displayName || unit.name || "—"}
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline" className={cn("gap-1", formatColors[format] || formatColors.BANNER)}>
            <RectangleHorizontal className="w-3 h-3" />
            {formatDisplay}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 max-w-[320px]">
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate min-w-0 flex-1" title={unit.adUnitId}>
              {unit.adUnitId}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0",
                copied ? "text-green-600 hover:text-green-700" : "text-slate-500 hover:text-slate-800",
              )}
              aria-label={copied ? "Đã sao chép Ad Unit ID" : "Sao chép Ad Unit ID"}
              onClick={() => void handleCopyAdUnitId()}
            >
              {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {imp > 0 ? `$${unit.ecpm.toFixed(2)}` : "—"}
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
        <td className="px-4 py-3 text-right text-sm">
          {hasBronzeMetrics && req > 0 ? `${fillRate.toFixed(1)}%` : "—"}
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-slate-200/90">
          <td colSpan={9} className="px-3 py-3 border-t border-slate-300">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Chi tiết <code className="text-[11px] bg-slate-100 px-1 rounded">bronze.mediation_table</code>
              {waterfallOnly ? " · chỉ waterfall AdMob" : null}
              {country ? ` · country=${country}` : null}
              {appVersion ? ` · app_version=${appVersion}` : null}
            </p>
            {!starRocksEnabled ? (
              <p className="text-sm text-slate-600">StarRocks chưa bật — không tải được dòng chi tiết.</p>
            ) : detailLoading ? (
              <p className="text-sm text-slate-600 py-4 text-center">Đang tải các dòng đồng bộ gốc…</p>
            ) : detailError ? (
              <p className="text-sm text-red-600">{detailError.message || "Lỗi tải chi tiết"}</p>
            ) : detailPayload && !detailPayload.starRocksEnabled ? (
              <p className="text-sm text-slate-600">{detailPayload.message || "Không tải được chi tiết."}</p>
            ) : detailRows.length === 0 ? (
              <p className="text-sm text-slate-600">Không có dòng nào trong khoảng lọc (hoặc ad unit chưa có bản ghi Bronze).</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded border border-slate-300/80 bg-slate-100 max-h-[min(28rem,75vh)]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-200/90 sticky top-0 z-10">
                      <tr className="text-slate-600 font-medium text-left">
                        <th className="px-2 py-2 whitespace-nowrap">Ngày (UTC)</th>
                        <th className="px-2 py-2">Country</th>
                        <th className="px-2 py-2">App ver</th>
                        <th className="px-2 py-2 min-w-[140px]">Mediation group</th>
                        <th className="px-2 py-2 min-w-[160px]">Network / line</th>
                        <th className="px-2 py-2 text-right whitespace-nowrap">Impr.</th>
                        <th className="px-2 py-2 text-right whitespace-nowrap">Ad req.</th>
                        <th className="px-2 py-2 text-right whitespace-nowrap">Matched</th>
                        <th className="px-2 py-2 text-right whitespace-nowrap">Revenue</th>
                        <th className="px-2 py-2 font-mono text-[10px] text-slate-500">hash_key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/90">
                      {detailRows.map((r: AppMediationBronzeAdUnitDetailRow) => (
                        <tr key={`${r.hashKey}_${r.date}`} className="bg-white/90 hover:bg-white">
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-800">{ymdFromDetailDate(r.date)}</td>
                          <td className="px-2 py-1.5 text-slate-700">{r.country || "—"}</td>
                          <td className="px-2 py-1.5 text-slate-700 max-w-[120px] truncate" title={r.appVersionName}>
                            {r.appVersionName || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700 max-w-[200px]">
                            <span className="truncate block" title={r.mediationGroupId || r.mediationGroupName || ""}>
                              {r.mediationGroupName || r.mediationGroupId || "—"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-slate-700 max-w-[220px]">
                            <span
                              className="truncate block"
                              title={[r.adSourceName, r.adSourceInstanceName].filter(Boolean).join(" · ") || ""}
                            >
                              {r.adSourceName || r.adSourceId || "—"}
                              {r.adSourceInstanceName ? (
                                <span className="text-slate-500"> · {r.adSourceInstanceName}</span>
                              ) : null}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.adRequests.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.matchedRequests.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium">${r.estimatedEarnings.toFixed(4)}</td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-slate-500 max-w-[100px] truncate" title={r.hashKey}>
                            {r.hashKey}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detailPayload?.truncated ? (
                  <p className="text-xs text-amber-800 mt-2">
                    Chỉ hiển thị tối đa {detailPayload.limit} dòng. Thu hẹp khoảng ngày hoặc bộ lọc nếu cần xem thêm.
                  </p>
                ) : null}
              </>
            )}
          </td>
        </tr>
      ) : null}
    </>
  )
}
