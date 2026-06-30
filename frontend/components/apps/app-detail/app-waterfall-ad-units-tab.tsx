"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, MoreHorizontal, Eye, Copy, Pencil, Check } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { copyTextToClipboard } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import type { WaterfallAdUnit } from "@/types/api"

type SortField = "displayName" | "format" | "revenue"
type SortDirection = "asc" | "desc"

const formatDisplay = (format?: string) => (format ? format.replace(/_/g, " ") : "-")

// Country flags for the Targeting column
const countryFlags: Record<string, string> = {
  US: "\uD83C\uDDFA\uD83C\uDDF8", UK: "\uD83C\uDDEC\uD83C\uDDE7", GB: "\uD83C\uDDEC\uD83C\uDDE7", DE: "\uD83C\uDDE9\uD83C\uDDEA", FR: "\uD83C\uDDEB\uD83C\uDDF7", JP: "\uD83C\uDDEF\uD83C\uDDF5", CA: "\uD83C\uDDE8\uD83C\uDDE6", AU: "\uD83C\uDDE6\uD83C\uDDFA",
  IN: "\uD83C\uDDEE\uD83C\uDDF3", CN: "\uD83C\uDDE8\uD83C\uDDF3", KR: "\uD83C\uDDF0\uD83C\uDDF7", BR: "\uD83C\uDDE7\uD83C\uDDF7", MX: "\uD83C\uDDF2\uD83C\uDDFD", ES: "\uD83C\uDDEA\uD83C\uDDF8", IT: "\uD83C\uDDEE\uD83C\uDDF9", NL: "\uD83C\uDDF3\uD83C\uDDF1",
  SE: "\uD83C\uDDF8\uD83C\uDDEA", NO: "\uD83C\uDDF3\uD83C\uDDF4", DK: "\uD83C\uDDE9\uD83C\uDDF0", FI: "\uD83C\uDDEB\uD83C\uDDEE", PL: "\uD83C\uDDF5\uD83C\uDDF1", RU: "\uD83C\uDDF7\uD83C\uDDFA", TR: "\uD83C\uDDF9\uD83C\uDDF7", SA: "\uD83C\uDDF8\uD83C\uDDE6",
  AE: "\uD83C\uDDE6\uD83C\uDDEA", SG: "\uD83C\uDDF8\uD83C\uDDEC", MY: "\uD83C\uDDF2\uD83C\uDDFE", TH: "\uD83C\uDDF9\uD83C\uDDED", ID: "\uD83C\uDDEE\uD83C\uDDE9", PH: "\uD83C\uDDF5\uD83C\uDDED", VN: "\uD83C\uDDFB\uD83C\uDDF3",
}

export interface AppWaterfallAdUnitsTabProps {
  /** Parent-loaded data to avoid duplicate API fetches. */
  waterfallAdUnits?: WaterfallAdUnit[] | null
  loadingWaterfallAdUnits?: boolean
}

export function AppWaterfallAdUnitsTab({
  waterfallAdUnits: waterfallAdUnitsFromParent,
  loadingWaterfallAdUnits: loadingFromParent,
}: AppWaterfallAdUnitsTabProps = {}) {
  const params = useParams()
  const appIdFromParams = (params as any)?.id as string | undefined
  const hasValidAppId = !!appIdFromParams

  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: app } = useApi(
    () => structureApi.getAppByAppId(appIdFromParams!),
    { enabled: hasValidAppId, cacheKey: hasValidAppId ? `app_detail_${appIdFromParams}` : undefined },
  )
  const { data: waterfallAdUnitsFetched, loading: loadingFetched } = useApi<WaterfallAdUnit[]>(
    () => structureApi.getAppWaterfallAdUnits(app!.id),
    {
      enabled: waterfallAdUnitsFromParent === undefined && !!app?.id,
      cacheKey: app?.id != null ? `app_waterfall_ad_units_${app.id}` : undefined,
    },
  )

  const waterfallAdUnits = waterfallAdUnitsFromParent !== undefined ? waterfallAdUnitsFromParent : waterfallAdUnitsFetched ?? null
  const loading = loadingFromParent ?? loadingFetched

  const filtered = useMemo(() => {
    if (!waterfallAdUnits) return []
    return waterfallAdUnits.filter((w) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const name = (w.displayName ?? w.name ?? "").toLowerCase()
      const id = (w.admobNetworkWaterfallAdUnitId ?? "").toLowerCase()
      return name.includes(q) || id.includes(q)
    })
  }, [waterfallAdUnits, searchQuery])

  const sorted = useMemo(() => {
    const mult = sortDirection === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "displayName":
          return mult * (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? "")
        case "format":
          return mult * (a.format ?? "").localeCompare(b.format ?? "")
        case "revenue":
          return mult * ((a.revenue ?? 0) - (b.revenue ?? 0))
        default:
          return 0
      }
    })
  }, [filtered, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortField(field)
      setSortDirection(field === "revenue" ? "desc" : "asc")
    }
  }

  const copyId = async (id: string) => {
    try {
      const copiedText = await copyTextToClipboard(id)
      if (!copiedText) return

      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error("Failed to copy waterfall ad unit ID", error)
    }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left transition-colors hover:text-foreground"
    >
      {children}
      <span className="text-muted-foreground">{sortField === field ? (sortDirection === "asc" ? "\u2191" : "\u2193") : "\u2195"}</span>
    </button>
  )

  const floorDisplay = (micros: number | null | undefined) => {
    if (micros == null) return "-"
    return `$${(micros / 1_000_000).toFixed(2)}`
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search waterfall ad units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-border/70 bg-card/90 pl-9 shadow-sm"
            />
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/70 bg-muted/40">
                <tr className="text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3 text-left min-w-[140px]">
                    <SortHeader field="displayName">Display Name</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[200px]">Waterfall ID</th>
                  <th className="px-4 py-3 text-left">
                    <SortHeader field="format">Format</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="revenue">Revenue (30D)</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[100px]">Country</th>
                  <th className="px-4 py-3 text-right">Global Floor</th>
                  <th className="px-4 py-3 text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading waterfall ad units...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {searchQuery ? "No waterfall ad units match your search." : "No waterfall ad units for this app."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((w) => {
                    const countries = w.countries ?? []
                    return (
                    <tr key={w.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {w.displayName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="max-w-[220px] truncate rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                            {w.admobNetworkWaterfallAdUnitId}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => void copyId(w.admobNetworkWaterfallAdUnitId)}
                                className="shrink-0 rounded p-1 transition-colors hover:bg-muted"
                              >
                                {copiedId === w.admobNetworkWaterfallAdUnitId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{copiedId === w.admobNetworkWaterfallAdUnitId ? "Copied!" : "Copy ID"}</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDisplay(w.format)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {w.revenue != null && w.revenue > 0 ? "$" + Number(w.revenue).toFixed(2) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {countries.length > 0 ? (
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {countries.slice(0, 3).map((country: string, idx: number) => (
                              <span key={idx} className="text-base" title={country}>
                                {countryFlags[country] ?? country}
                              </span>
                            ))}
                            {countries.length > 3 && (
                              <span className="ml-1 text-xs text-muted-foreground">+{countries.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {floorDisplay(w.globalFloorMicros)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => void copyId(w.admobNetworkWaterfallAdUnitId)}>
                              <Copy className="w-4 h-4" />
                              Copy ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {sorted.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sorted.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="waterfall ad units"
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  )
}
