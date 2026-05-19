"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Pause,
  Play,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { Pagination } from "@/components/shared/pagination"
import type { MediationGroup } from "@/types/api"
import { DEPRECATED_METRICS_MAX_YMD } from "@/lib/constants/deprecated-app-metrics"
import {
  MediationGroupAdSourcesCell,
  MediationGroupFormatBadge,
  MediationGroupTargetingCell,
} from "@/components/mediation/mediation-group-table-cells"

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getDefaultDeprecatedMetricRange(): { startDate: string; endDate: string } {
  let end = ymdUtc(new Date())
  if (end > DEPRECATED_METRICS_MAX_YMD) end = DEPRECATED_METRICS_MAX_YMD
  const endD = new Date(`${end}T00:00:00.000Z`)
  const startD = new Date(endD)
  startD.setUTCDate(startD.getUTCDate() - 6)
  return { startDate: ymdUtc(startD), endDate: end }
}

type SortField = "name" | "ecpm" | "revenue"
type SortDirection = "asc" | "desc"

export interface AppMediationGroupsTabProps {
  /** Danh sách mediation groups đã load từ parent (app detail). Nếu có thì tab không gọi API lại. */
  mediationGroups?: MediationGroup[] | null
  /** Loading state từ parent khi đang load mediation groups. */
  loadingMediationGroups?: boolean
}

export function AppMediationGroupsTab({ mediationGroups: mediationGroupsFromParent, loadingMediationGroups: loadingFromParent }: AppMediationGroupsTabProps = {}) {
  const params = useParams()
  const appIdFromParams = (params as any)?.id as string | undefined
  const hasValidAppId = !!appIdFromParams

  const useOwnFetch = mediationGroupsFromParent === undefined
  const initialMetricRange = useMemo(() => getDefaultDeprecatedMetricRange(), [])
  const [startDate, setStartDate] = useState(initialMetricRange.startDate)
  const [endDate, setEndDate] = useState(initialMetricRange.endDate)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: app } = useApi(
    () => structureApi.getAppByAppId(appIdFromParams!),
    { enabled: useOwnFetch && hasValidAppId, cacheKey: useOwnFetch && hasValidAppId ? `app_detail_${appIdFromParams}` : undefined },
  )
  const { data: mediationGroupsFetched, loading: loadingFetched } = useApi<MediationGroup[]>(
    () => structureApi.getAppMediationGroups(app!.id, { startDate, endDate }),
    {
      enabled: useOwnFetch && !!app?.id,
      cacheKey: useOwnFetch && app ? `app_mediation_groups_${app.appId}_${startDate}_${endDate}` : undefined,
    },
  )

  const mediationGroups = useOwnFetch ? mediationGroupsFetched : mediationGroupsFromParent ?? null
  const loading = useOwnFetch ? loadingFetched : (loadingFromParent ?? false)

  const filteredGroups = useMemo(() => {
    if (!mediationGroups) return []
    return mediationGroups.filter((group) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const name = (group.displayName || group.name || "").toLowerCase()
        const mediationGroupId = (group.mediationGroupId || "").toLowerCase()
        if (!name.includes(searchLower) && !mediationGroupId.includes(searchLower)) {
          return false
        }
      }
      return true
    })
  }, [mediationGroups, searchQuery])

  const sortedGroups = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    return [...filteredGroups].sort((a, b) => {
      switch (sortField) {
        case "name": {
          const nameA = (a.displayName || a.name || "").toLowerCase()
          const nameB = (b.displayName || b.name || "").toLowerCase()
          return multiplier * nameA.localeCompare(nameB)
        }
        case "ecpm":
          return multiplier * ((a.ecpm || 0) - (b.ecpm || 0))
        case "revenue":
          return multiplier * (((a as any).revenue || 0) - ((b as any).revenue || 0))
        default:
          return 0
      }
    })
  }, [filteredGroups, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedGroups.length / pageSize))
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedGroups.slice(startIndex, endIndex)
  }, [sortedGroups, currentPage, pageSize])

  // Reset to page 1 when search, sort, or metrics date range changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortDirection, startDate, endDate])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }


  const toggleSelectGroup = (groupId: number) => {
    const idStr = groupId.toString()
    if (selectedGroups.includes(idStr)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== idStr))
    } else {
      setSelectedGroups([...selectedGroups, idStr])
    }
  }

  const toggleSelectAll = () => {
    const paginatedGroupIds = paginatedGroups.map((g) => g.id.toString())
    const allPaginatedSelected = paginatedGroupIds.every((id) => selectedGroups.includes(id))
    
    if (allPaginatedSelected) {
      // Deselect all items on current page
      setSelectedGroups(selectedGroups.filter((id) => !paginatedGroupIds.includes(id)))
    } else {
      // Select all items on current page (keep items from other pages)
      const newSelection = [...selectedGroups]
      paginatedGroupIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      setSelectedGroups(newSelection)
    }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {useOwnFetch ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Metrics từ <strong>bronze.mediation_table_bk</strong>, khoảng ngày đến <strong>{DEPRECATED_METRICS_MAX_YMD}</strong>.
          </p>
        ) : null}
        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {useOwnFetch ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="deprecated-mg-start" className="text-xs text-slate-600">
                  Start date
                </Label>
                <Input
                  id="deprecated-mg-start"
                  type="date"
                  max={DEPRECATED_METRICS_MAX_YMD}
                  value={startDate}
                  onChange={(e) => {
                    const v = e.target.value
                    const c = v > DEPRECATED_METRICS_MAX_YMD ? DEPRECATED_METRICS_MAX_YMD : v
                    setStartDate(c)
                    if (c > endDate) setEndDate(c)
                  }}
                  className="h-10 w-[158px] bg-white border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deprecated-mg-end" className="text-xs text-slate-600">
                  End date
                </Label>
                <Input
                  id="deprecated-mg-end"
                  type="date"
                  max={DEPRECATED_METRICS_MAX_YMD}
                  value={endDate}
                  onChange={(e) => {
                    const v = e.target.value
                    const c = v > DEPRECATED_METRICS_MAX_YMD ? DEPRECATED_METRICS_MAX_YMD : v
                    setEndDate(c)
                    if (startDate > c) setStartDate(c)
                  }}
                  className="h-10 w-[158px] bg-white border-slate-200"
                />
              </div>
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search mediation groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs text-slate-500 font-medium">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox
                      checked={
                        paginatedGroups.length > 0 &&
                        paginatedGroups.every((g) => selectedGroups.includes(g.id.toString()))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left min-w-[200px]">
                    <SortHeader field="name">Group Name</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left">Format</th>
                  <th className="px-4 py-3 text-left min-w-[140px]">Ad Sources</th>
                  <th className="px-4 py-3 text-left min-w-[120px]">Targeting</th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="revenue">Revenue</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="ecpm">eCPM</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading mediation groups...
                    </td>
                  </tr>
                ) : paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                      {searchQuery
                        ? "No mediation groups found matching your search."
                        : "No mediation groups found for this app."}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((group) => {
                    const groupIdStr = group.id.toString()
                    const adSourcesInfo =
                      group.adSourcesInfo || (group.adSources || []).map((id) => ({ adSourceId: id, title: id }))
                    const countries = group.countries || []

                    return (
                      <tr
                        key={group.id}
                        className={cn(
                          "hover:bg-slate-50 transition-colors",
                          selectedGroups.includes(groupIdStr) && "bg-blue-50 hover:bg-blue-50",
                          group.status === "Paused" && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedGroups.includes(groupIdStr)}
                            onCheckedChange={() => toggleSelectGroup(group.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/mediation/${group.mediationGroupId}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {group.displayName || group.name || "Unnamed Mediation Group"}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <MediationGroupFormatBadge format={group.adFormat} />
                        </td>
                        <td className="px-4 py-3">
                          <MediationGroupAdSourcesCell adSourcesInfo={adSourcesInfo} />
                        </td>
                        <td className="px-4 py-3">
                          <MediationGroupTargetingCell countries={countries} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">
                            {(group.revenue || 0) > 0 ? `$${(group.revenue || 0).toFixed(2)}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">
                            ${(group.ecpm || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {group.status === "ENABLED" || !group.status ? (
                            <Badge className="bg-green-100 text-green-700 border-0">Enabled</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-transparent">
                              <Layers className="w-3 h-3" />
                              Waterfall
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link href={`/mediation/${group.mediationGroupId}`} className="flex items-center gap-2 cursor-pointer">
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Pencil className="w-4 h-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-amber-600">
                                  {group.status === "Active" || !group.status ? (
                                    <>
                                      <Pause className="w-4 h-4" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Resume
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {sortedGroups.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedGroups.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="mediation groups"
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  )
}
