"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Copy, Loader2, Layers } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { Pagination } from "@/components/shared/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { WaterfallListItem } from "@/types/api"

const FILTER_UNUSED = "unused"
const FILTER_NO_REVENUE = "noRevenue"

export function WaterfallPageContent() {
  const searchParams = useSearchParams()
  const publisherIdFromUrl = searchParams.get("publisherId") ?? undefined

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterMode, setFilterMode] = useState<string>(FILTER_UNUSED)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, loading } = useApi(
    () =>
      structureApi.getWaterfallList({
        publisherId: publisherIdFromUrl,
        unusedOnly: filterMode === FILTER_UNUSED,
        noRevenue: filterMode === FILTER_NO_REVENUE,
        page,
        pageSize,
      }),
    {
      enabled: true,
      cacheKey: `waterfall_list_${publisherIdFromUrl ?? "all"}_${filterMode}_${page}_${pageSize}`,
    }
  )

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    setPage(1)
  }, [publisherIdFromUrl, filterMode, pageSize])

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatFloor = (micros?: number | null) => {
    if (micros == null) return "—"
    return `$${(micros / 1_000_000).toFixed(2)}`
  }

  const formatRevenue = (value?: number | null) => {
    if (value == null) return "$0.00"
    return `$${Number(value).toFixed(2)}`
  }

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—"
    try {
      const d = new Date(iso)
      return d.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return "—"
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/apps"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apps
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-orange-500" />
            Waterfalls
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {filterMode === FILTER_UNUSED
              ? "Waterfall ad units not linked to any ad unit in a mediation group."
              : "Waterfall ad units with no revenue in the last 30 days."}
            {publisherIdFromUrl && (
              <span className="ml-1">
                Filtered by publisher: <strong>{publisherIdFromUrl}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <RadioGroup value={filterMode} onValueChange={setFilterMode} className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <RadioGroupItem value={FILTER_UNUSED} id="filter-unused" />
            <Label htmlFor="filter-unused" className="text-sm font-normal cursor-pointer">
              Show Unused waterfalls
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={FILTER_NO_REVENUE} id="filter-no-revenue" />
            <Label htmlFor="filter-no-revenue" className="text-sm font-normal cursor-pointer">
              Show waterfalls without revenue
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            {filterMode === FILTER_UNUSED
              ? "No unused waterfalls."
              : "No waterfalls without revenue."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">App</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Display name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Format</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Floor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Revenue (30D)</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">AdMob ID</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Publisher</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Last synced</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: WaterfallListItem) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        {row.appAdMobId ? (
                          <Link
                            href={`/apps/${encodeURIComponent(row.appAdMobId)}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {row.appDisplayName || row.appAdMobId}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800">{row.displayName || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{row.format ?? "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{formatFloor(row.globalFloorMicros)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatRevenue(row.revenue)}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => copyId(row.admobNetworkWaterfallAdUnitId)}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-mono text-xs"
                        >
                          {row.admobNetworkWaterfallAdUnitId}
                          {copiedId === row.admobNetworkWaterfallAdUnitId ? (
                            <span className="text-green-600">Copied</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs">{row.publisherId}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.lastSyncedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalCount > 0 && (
              <div className="border-t border-slate-200 px-4 py-3">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  itemName="waterfalls"
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
