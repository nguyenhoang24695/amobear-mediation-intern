"use client"

import { useMemo, useState } from "react"
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
import { Search, RectangleHorizontal } from "lucide-react"
import { cn, copyTextToClipboard } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import type { AppMediationBronzeAdUnitRow } from "@/types/api"

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
        ? `bronze_adu_${appRowId}_${startDate}_${endDate}_${country}_${appVersion}_${waterfallOnly}`
        : undefined,
    [appRowId, startDate, endDate, country, appVersion, waterfallOnly],
  )

  const { data: payload, loading, error } = useApi(
    () =>
      structureApi.getAppMediationBronzeAdUnits(appRowId!, {
        startDate,
        endDate,
        country: country || undefined,
        appVersion: appVersion || undefined,
        waterfallOnly,
      }),
    { enabled: !!appRowId, cacheKey: dataKey },
  )

  const rows = useMemo(() => {
    const list = payload?.adUnits ?? []
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter((u) => {
      const name = (u.displayName || u.name || "").toLowerCase()
      const id = (u.adUnitId || "").toLowerCase()
      return name.includes(q) || id.includes(q)
    })
  }, [payload?.adUnits, searchQuery])

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

      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 font-medium">
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
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có dòng phù hợp (hoặc chưa có sync mediation Bronze trong khoảng ngày này).
                  </td>
                </tr>
              ) : (
                rows.map((unit) => (
                  <MediationAdUnitRow key={unit.id} unit={unit} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function MediationAdUnitRow({ unit }: { unit: AppMediationBronzeAdUnitRow }) {
  const format = unit.adFormat || "Unknown"
  const formatDisplay = format
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
  const fillRate = unit.fillRate ?? 0
  return (
    <tr className="hover:bg-slate-50 transition-colors">
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
        <button
          type="button"
          className="text-left font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
          onClick={() => void copyTextToClipboard(unit.adUnitId)}
        >
          {unit.adUnitId}
        </button>
      </td>
      <td className="px-4 py-3 text-right text-sm">${unit.ecpm.toFixed(2)}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-700">
        {unit.impressions.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-700">
        {(unit.adRequests ?? 0).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium">${unit.revenue.toFixed(2)}</td>
      <td className="px-4 py-3 text-right text-sm">{fillRate > 0 ? `${fillRate.toFixed(1)}%` : "—"}</td>
    </tr>
  )
}
