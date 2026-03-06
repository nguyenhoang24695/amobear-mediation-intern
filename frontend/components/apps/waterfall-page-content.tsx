"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Copy, Loader2, Layers, ExternalLink } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { formatDateForAPI } from "@/lib/utils/dashboard"
import { Pagination } from "@/components/shared/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import type { WaterfallListItem } from "@/types/api"

const SCREEN_WATERFALL = "s-waterfall"
const FN_VIEW = "view"

const FILTER_UNUSED = "unused"
const FILTER_NO_REVENUE = "noRevenue"

type SortField = "displayName" | "app" | "info" | "revenue" | "mediationGroup" | "admobId" | "publisher"
type SortDirection = "asc" | "desc"

export function WaterfallPageContent() {
  const canView = hasScreenFunction(SCREEN_WATERFALL, FN_VIEW)
  const { appliedDateRange, refreshKey } = useDashboardDate()

  const searchParams = useSearchParams()
  const publisherIdFromUrl = searchParams.get("publisherId") ?? undefined

  const [page, setPage] = useState(1)

  const [pageSize, setPageSize] = useState(20)
  const [filterMode, setFilterMode] = useState<string>(FILTER_UNUSED)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("displayName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const apiDateRange = useMemo(
    () => ({
      startDate: formatDateForAPI(appliedDateRange.from),
      endDate: formatDateForAPI(appliedDateRange.to),
    }),
    [appliedDateRange],
  )

  const selectedRangeLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    return `${formatter.format(appliedDateRange.from)} - ${formatter.format(appliedDateRange.to)}`
  }, [appliedDateRange])

  const cacheKey = useMemo(
    () =>
      `waterfall_list_${publisherIdFromUrl ?? "all"}_${filterMode}_${page}_${pageSize}_${sortField}_${sortDirection}_${apiDateRange.startDate}_${apiDateRange.endDate}`,
    [publisherIdFromUrl, filterMode, page, pageSize, sortField, sortDirection, apiDateRange],
  )

  const { data, loading, refetch } = useApi(
    () =>
      structureApi.getWaterfallList({
        publisherId: publisherIdFromUrl,
        unusedOnly: filterMode === FILTER_UNUSED,
        noRevenue: filterMode === FILTER_NO_REVENUE,
        startDate: apiDateRange.startDate,
        endDate: apiDateRange.endDate,
        sortField,
        sortDirection,
        page,
        pageSize,
      }),
    {
      enabled: canView,
      cacheKey,
    }
  )

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    setPage(1)
  }, [publisherIdFromUrl, filterMode, pageSize, sortField, sortDirection, apiDateRange.startDate, apiDateRange.endDate])

  useEffect(() => {
    if (refreshKey > 0) {
      void refetch()
    }
  }, [refreshKey, refetch])

  if (!canView) {
    return <NoPermissionView />
  }

  const copyId = async (id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(id)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = id
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection(field === "revenue" ? "desc" : "asc")
  }

  const SortHeader = ({
    field,
    label,
    align = "left",
  }: {
    field: SortField
    label: string
    align?: "left" | "right"
  }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 hover:text-slate-900 transition-colors ${align === "right" ? "justify-end w-full" : ""}`}
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
        )
      ) : (
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  )

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
              : `Waterfall ad units with no revenue in the selected range (${selectedRangeLabel}).`}
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
              Show waterfalls without revenue in selected range
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
              : `No waterfalls without revenue in the selected range (${selectedRangeLabel}).`}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="displayName" label="Display Name" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="app" label="App" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="info" label="Info" />
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="revenue" label="Revenue" align="right" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="mediationGroup" label="Mediation Group" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="admobId" label="AdMob ID" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      <SortHeader field="publisher" label="Publisher" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: WaterfallListItem) => {
                    const appIdPart = row.appAdMobId?.includes("~") 
                      ? row.appAdMobId.split("~").pop() 
                      : row.appAdMobId
                    const admobIdPart = row.admobNetworkWaterfallAdUnitId?.includes("/")
                      ? row.admobNetworkWaterfallAdUnitId.split("/").pop()
                      : row.admobNetworkWaterfallAdUnitId
                    const admobUrl = appIdPart && admobIdPart
                      ? `https://admob.google.com/v2/apps/${encodeURIComponent(appIdPart)}/adunits/list?au=${encodeURIComponent(admobIdPart)}&upa=t`
                      : null

                    return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        {admobUrl ? (
                          <a
                            href={admobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
                          >
                            {row.displayName || "—"}
                          </a>
                        ) : (
                          <span className="text-slate-800">{row.displayName || "—"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.appAdMobId ? (
                          <Link
                            href={`/apps/${encodeURIComponent(row.appAdMobId)}`}
                            className="inline-block group"
                            title={`${row.appDisplayName || "App"}\n${row.appAdMobId}`}
                          >
                            {row.appIconUri ? (
                              <img
                                src={row.appIconUri}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                                <Layers className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-xs">
                          <div className="text-slate-600"><span className="text-slate-400">Format:</span> {row.format ?? "—"}</div>
                          <div className="text-slate-500"><span className="text-slate-400">Floor:</span> {formatFloor(row.globalFloorMicros)}</div>
                          <div className="text-slate-500"><span className="text-slate-400">Synced:</span> {formatDateTime(row.lastSyncedAt)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-medium">
                        {formatRevenue(row.revenue)}
                      </td>
                      <td className="py-3 px-4">
                        {row.mappingDisplayName || row.adUnitDisplayName ? (
                          <div className="space-y-0.5">
                            {row.mappingDisplayName && (
                              <div className="text-slate-800 text-xs font-medium">{row.mappingDisplayName}</div>
                            )}
                            {row.adUnitDisplayName && (
                              <div className="text-slate-500 text-xs">Ad Unit: {row.adUnitDisplayName}</div>
                            )}
                            {row.mappingState && (
                              <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded ${
                                row.mappingState === "ENABLED" 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {row.mappingState}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
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
                      <td className="py-3 px-4">
                        {admobUrl && (
                          <a
                            href={admobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            AdMob
                          </a>
                        )}
                      </td>
                    </tr>
                  )})}
                
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
