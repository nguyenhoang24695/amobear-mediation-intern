"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Copy, ExternalLink, Layers, Loader2 } from "lucide-react"

import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { formatDateForAPI } from "@/lib/utils/dashboard"
import { hasScreenFunction } from "@/lib/auth"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Pagination } from "@/components/shared/pagination"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { WaterfallFilterCombobox } from "./waterfall-filter-combobox"
import type { WaterfallFilterOptionDto, WaterfallListItem } from "@/types/api"

const SCREEN_WATERFALL = "s-waterfall"
const FN_VIEW = "view"

const FILTER_UNUSED = "unused"
const FILTER_NO_REVENUE = "noRevenue"

const FILTER_PUBLISHER = "publisherId"
const FILTER_APP = "appAdMobId"
const FILTER_ADMOB = "admobId"

type SortField = "displayName" | "app" | "info" | "revenue" | "mediationGroup" | "admobId" | "publisher"
type SortDirection = "asc" | "desc"

interface WaterfallFilters {
  publisherId?: string
  appAdMobId?: string
  admobId?: string
}

interface SearchParamsLike {
  get: (name: string) => string | null
  toString: () => string
}

function normalizeFilterValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readFiltersFromSearchParams(searchParams: SearchParamsLike): WaterfallFilters {
  return {
    publisherId: normalizeFilterValue(searchParams.get(FILTER_PUBLISHER)),
    appAdMobId: normalizeFilterValue(searchParams.get(FILTER_APP)),
    admobId: normalizeFilterValue(searchParams.get(FILTER_ADMOB)),
  }
}

function areFiltersEqual(left: WaterfallFilters, right: WaterfallFilters): boolean {
  return left.publisherId === right.publisherId
    && left.appAdMobId === right.appAdMobId
    && left.admobId === right.admobId
}

export function WaterfallPageContent() {
  const canView = hasScreenFunction(SCREEN_WATERFALL, FN_VIEW)
  const { appliedDateRange, refreshKey } = useDashboardDate()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<WaterfallFilters>(() => readFiltersFromSearchParams(searchParams))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterMode, setFilterMode] = useState<string>(FILTER_UNUSED)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("displayName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  useEffect(() => {
    const nextFilters = readFiltersFromSearchParams(searchParams)
    setFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters))
  }, [searchParams])

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

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = []
    if (filters.publisherId) parts.push(`Publisher: ${filters.publisherId}`)
    if (filters.appAdMobId) parts.push(`App: ${filters.appAdMobId}`)
    if (filters.admobId) parts.push(`AdMob: ${filters.admobId}`)
    return parts.join(" | ")
  }, [filters])

  const waterfallListCacheKey = useMemo(
    () => [
      "waterfall_list",
      filters.publisherId ?? "all-publishers",
      filters.appAdMobId ?? "all-apps",
      filters.admobId ?? "all-admob",
      filterMode,
      page,
      pageSize,
      sortField,
      sortDirection,
      apiDateRange.startDate,
      apiDateRange.endDate,
    ].join("_"),
    [filters, filterMode, page, pageSize, sortField, sortDirection, apiDateRange],
  )

  const filterScopeKey = useMemo(
    () => [
      filterMode,
      apiDateRange.startDate,
      apiDateRange.endDate,
      refreshKey,
    ].join("_"),
    [filterMode, apiDateRange, refreshKey],
  )

  const { data, loading, refetch } = useApi(
    () => structureApi.getWaterfallList({
      publisherId: filters.publisherId,
      appAdMobId: filters.appAdMobId,
      admobId: filters.admobId,
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
      cacheKey: waterfallListCacheKey,
    },
  )

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    setPage(1)
  }, [filters.publisherId, filters.appAdMobId, filters.admobId, filterMode, pageSize, sortField, sortDirection, apiDateRange.startDate, apiDateRange.endDate])

  useEffect(() => {
    if (refreshKey > 0) {
      void refetch()
    }
  }, [refreshKey, refetch])

  if (!canView) {
    return <NoPermissionView />
  }

  const syncFiltersToUrl = (nextFilters: WaterfallFilters) => {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextFilters.publisherId) nextParams.set(FILTER_PUBLISHER, nextFilters.publisherId)
    else nextParams.delete(FILTER_PUBLISHER)

    if (nextFilters.appAdMobId) nextParams.set(FILTER_APP, nextFilters.appAdMobId)
    else nextParams.delete(FILTER_APP)

    if (nextFilters.admobId) nextParams.set(FILTER_ADMOB, nextFilters.admobId)
    else nextParams.delete(FILTER_ADMOB)

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }

  const applyFilters = (nextFilters: WaterfallFilters) => {
    if (areFiltersEqual(filters, nextFilters)) return
    setFilters(nextFilters)
    syncFiltersToUrl(nextFilters)
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
    } catch (error) {
      console.error("Failed to copy waterfall ID", error)
    }
  }

  const formatFloor = (micros?: number | null) => {
    if (micros == null) return "-"
    return `$${(micros / 1_000_000).toFixed(2)}`
  }

  const formatRevenue = (value?: number | null) => {
    if (value == null) return "$0.00"
    return `$${Number(value).toFixed(2)}`
  }

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "-"
    try {
      const date = new Date(iso)
      return date.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return "-"
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection(field === "revenue" ? "desc" : "asc")
  }

  const handlePublisherSelect = (option: WaterfallFilterOptionDto | null) => {
    const nextPublisherId = option?.value
    const nextFilters: WaterfallFilters = { ...filters, publisherId: nextPublisherId }

    if (nextPublisherId && nextPublisherId !== filters.publisherId) {
      nextFilters.appAdMobId = undefined
      nextFilters.admobId = undefined
    }

    applyFilters(nextFilters)
  }

  const handleAppSelect = (option: WaterfallFilterOptionDto | null) => {
    const nextAppAdMobId = option?.value
    const nextFilters: WaterfallFilters = { ...filters, appAdMobId: nextAppAdMobId }

    if (nextAppAdMobId && nextAppAdMobId !== filters.appAdMobId) {
      nextFilters.admobId = undefined
    }

    applyFilters(nextFilters)
  }

  const handleAdMobSelect = (option: WaterfallFilterOptionDto | null) => {
    applyFilters({
      ...filters,
      admobId: option?.value,
    })
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
      className={`inline-flex items-center gap-1 transition-colors hover:text-slate-900 ${align === "right" ? "w-full justify-end" : ""}`}
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
      )}
    </button>
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/apps"
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Apps
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers className="h-6 w-6 text-orange-500" />
            Waterfalls
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filterMode === FILTER_UNUSED
              ? "Waterfall ad units not linked to any ad unit in a mediation group."
              : `Waterfall ad units with no revenue in the selected range (${selectedRangeLabel}).`}
          </p>
          {activeFilterSummary ? (
            <p className="mt-1 text-xs text-slate-500">{activeFilterSummary}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <RadioGroup value={filterMode} onValueChange={setFilterMode} className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <RadioGroupItem value={FILTER_UNUSED} id="filter-unused" />
            <Label htmlFor="filter-unused" className="cursor-pointer text-sm font-normal">
              Show unused waterfalls
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value={FILTER_NO_REVENUE} id="filter-no-revenue" />
            <Label htmlFor="filter-no-revenue" className="cursor-pointer text-sm font-normal">
              Show waterfalls without revenue in selected range
            </Label>
          </div>
        </RadioGroup>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Publisher</p>
            <WaterfallFilterCombobox
              value={filters.publisherId}
              placeholder="All Publishers"
              searchPlaceholder="Search publisher ID..."
              emptyMessage="No publisher found."
              allLabel="All Publishers"
              cacheKeyBase="waterfall_publisher_filter"
              scopeKey={filterScopeKey}
              loadOptions={(search) => structureApi.getWaterfallPublisherFilterOptions({
                unusedOnly: filterMode === FILTER_UNUSED,
                noRevenue: filterMode === FILTER_NO_REVENUE,
                startDate: apiDateRange.startDate,
                endDate: apiDateRange.endDate,
                search,
                limit: 20,
              })}
              onSelect={handlePublisherSelect}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">App</p>
            <WaterfallFilterCombobox
              value={filters.appAdMobId}
              placeholder="All Apps"
              searchPlaceholder="Search by app name or app ID..."
              emptyMessage="No app found."
              allLabel="All Apps"
              cacheKeyBase="waterfall_app_filter"
              scopeKey={`${filterScopeKey}_${filters.publisherId ?? "all"}`}
              loadOptions={(search) => structureApi.getWaterfallAppFilterOptions({
                publisherId: filters.publisherId,
                unusedOnly: filterMode === FILTER_UNUSED,
                noRevenue: filterMode === FILTER_NO_REVENUE,
                startDate: apiDateRange.startDate,
                endDate: apiDateRange.endDate,
                search,
                limit: 20,
              })}
              onSelect={handleAppSelect}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">AdMob</p>
            <WaterfallFilterCombobox
              value={filters.admobId}
              placeholder="All AdMob Waterfalls"
              searchPlaceholder="Search by display name or AdMob ID..."
              emptyMessage="No AdMob waterfall found."
              allLabel="All AdMob Waterfalls"
              cacheKeyBase="waterfall_admob_filter"
              scopeKey={`${filterScopeKey}_${filters.publisherId ?? "all"}_${filters.appAdMobId ?? "all"}`}
              loadOptions={(search) => structureApi.getWaterfallAdMobFilterOptions({
                publisherId: filters.publisherId,
                appAdMobId: filters.appAdMobId,
                unusedOnly: filterMode === FILTER_UNUSED,
                noRevenue: filterMode === FILTER_NO_REVENUE,
                startDate: apiDateRange.startDate,
                endDate: apiDateRange.endDate,
                search,
                limit: 20,
              })}
              onSelect={handleAdMobSelect}
              minSearchLength={filters.publisherId || filters.appAdMobId ? 0 : 1}
              idleMessage="Type to search AdMob waterfalls or narrow by publisher/app."
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="displayName" label="Display Name" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="app" label="App" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="info" label="Info" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">
                      <SortHeader field="revenue" label="Revenue" align="right" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="mediationGroup" label="Mediation Group" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="admobId" label="AdMob ID" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">
                      <SortHeader field="publisher" label="Publisher" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>
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
                        <td className="px-4 py-3">
                          {admobUrl ? (
                            <a
                              href={admobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {row.displayName || "-"}
                            </a>
                          ) : (
                            <span className="text-slate-800">{row.displayName || "-"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
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
                                  className="h-8 w-8 rounded-lg object-cover transition-all group-hover:ring-2 group-hover:ring-blue-400"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 transition-all group-hover:ring-2 group-hover:ring-blue-400">
                                  <Layers className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                            </Link>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 text-xs">
                            <div className="text-slate-600"><span className="text-slate-400">Format:</span> {row.format ?? "-"}</div>
                            <div className="text-slate-500"><span className="text-slate-400">Floor:</span> {formatFloor(row.globalFloorMicros)}</div>
                            <div className="text-slate-500"><span className="text-slate-400">Synced:</span> {formatDateTime(row.lastSyncedAt)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatRevenue(row.revenue)}
                        </td>
                        <td className="px-4 py-3">
                          {row.mappingDisplayName || row.adUnitDisplayName ? (
                            <div className="space-y-0.5">
                              {row.mappingDisplayName ? (
                                <div className="text-xs font-medium text-slate-800">{row.mappingDisplayName}</div>
                              ) : null}
                              {row.adUnitDisplayName ? (
                                <div className="text-xs text-slate-500">Ad Unit: {row.adUnitDisplayName}</div>
                              ) : null}
                              {row.mappingState ? (
                                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                                  row.mappingState === "ENABLED"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}>
                                  {row.mappingState}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => copyId(row.admobNetworkWaterfallAdUnitId)}
                            className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-slate-900"
                          >
                            {row.admobNetworkWaterfallAdUnitId}
                            {copiedId === row.admobNetworkWaterfallAdUnitId ? (
                              <span className="text-green-600">Copied</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.publisherId}</td>
                        <td className="px-4 py-3">
                          {admobUrl ? (
                            <a
                              href={admobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              AdMob
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalCount > 0 ? (
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
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
