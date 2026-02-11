"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Copy,
  Pause,
  Play,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RectangleHorizontal,
  Square,
  Gift,
  LayoutGrid,
  Smartphone,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { Pagination } from "@/components/shared/pagination"
import type { AdUnit } from "@/types/api"

const formatIcons: Record<string, React.ElementType> = {
  BANNER: RectangleHorizontal,
  INTERSTITIAL: Square,
  REWARDED: Gift,
  REWARDED_INTERSTITIAL: Gift,
  NATIVE: LayoutGrid,
  APP_OPEN: Smartphone,
  Banner: RectangleHorizontal, // Fallback for lowercase
  Interstitial: Square,
  Rewarded: Gift,
  Native: LayoutGrid,
  "App Open": Smartphone,
}

const formatColors: Record<string, string> = {
  BANNER: "bg-blue-50 text-blue-700 border-blue-200",
  INTERSTITIAL: "bg-purple-50 text-purple-700 border-purple-200",
  REWARDED: "bg-amber-50 text-amber-700 border-amber-200",
  REWARDED_INTERSTITIAL: "bg-amber-50 text-amber-700 border-amber-200",
  NATIVE: "bg-green-50 text-green-700 border-green-200",
  APP_OPEN: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Banner: "bg-blue-50 text-blue-700 border-blue-200", // Fallback
  Interstitial: "bg-purple-50 text-purple-700 border-purple-200",
  Rewarded: "bg-amber-50 text-amber-700 border-amber-200",
  Native: "bg-green-50 text-green-700 border-green-200",
  "App Open": "bg-cyan-50 text-cyan-700 border-cyan-200",
}

// Helper to format ad format for display
const formatAdFormat = (format?: string): string => {
  if (!format) return "Unknown"
  // Convert BANNER -> Banner, INTERSTITIAL -> Interstitial, etc.
  return format
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

type SortField = "name" | "ecpm" | "impressions" | "revenue" | "fillRate"
type SortDirection = "asc" | "desc"

export function AppAdUnitsTab() {
  const params = useParams()
  const appIdFromParams = (params as any)?.id as string | undefined
  const hasValidAppId = !!appIdFromParams

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Load app by AdMob app_id, rồi load ad units (backend trả metrics mặc định từ cache 7 ngày)
  const { data: app } = useApi(
    () => structureApi.getAppByAppId(appIdFromParams!),
    { enabled: hasValidAppId, cacheKey: hasValidAppId ? `app_detail_${appIdFromParams}` : undefined },
  )
  const { data: adUnits, loading } = useApi<AdUnit[]>(
    () => structureApi.getAppAdUnits(app!.id),
    {
      enabled: !!app,
      cacheKey: app ? `app_ad_units_${app.appId}` : undefined,
    },
  )

  const filteredUnits = useMemo(() => {
    if (!adUnits) return []
    return adUnits.filter((unit) => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const name = (unit.displayName || unit.name || "").toLowerCase()
        const adUnitId = (unit.adUnitId || "").toLowerCase()
        if (!name.includes(searchLower) && !adUnitId.includes(searchLower)) {
          return false
        }
      }
      return true
    })
  }, [adUnits, searchQuery])

  const sortedUnits = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    return [...filteredUnits].sort((a, b) => {
      switch (sortField) {
        case "name":
          const nameA = (a.displayName || a.name || "").toLowerCase()
          const nameB = (b.displayName || b.name || "").toLowerCase()
          return multiplier * nameA.localeCompare(nameB)
        case "ecpm":
          return multiplier * ((a.ecpm || 0) - (b.ecpm || 0))
        case "impressions":
          return multiplier * ((a.impressions || 0) - (b.impressions || 0))
        case "revenue":
          return multiplier * ((a.revenue || 0) - (b.revenue || 0))
        case "fillRate":
          return multiplier * ((a.fillRate || 0) - (b.fillRate || 0))
        default:
          return 0
      }
    })
  }, [filteredUnits, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedUnits.length / pageSize))
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedUnits.slice(startIndex, endIndex)
  }, [sortedUnits, currentPage, pageSize])

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleSelectAll = () => {
    const paginatedUnitIds = paginatedUnits.map((u) => u.id.toString())
    const allPaginatedSelected = paginatedUnitIds.every((id) => selectedUnits.includes(id))
    
    if (allPaginatedSelected) {
      // Deselect all items on current page
      setSelectedUnits(selectedUnits.filter((id) => !paginatedUnitIds.includes(id)))
    } else {
      // Select all items on current page (keep items from other pages)
      const newSelection = [...selectedUnits]
      paginatedUnitIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id)
        }
      })
      setSelectedUnits(newSelection)
    }
  }

  const toggleSelectUnit = (unitId: number) => {
    const idStr = unitId.toString()
    if (selectedUnits.includes(idStr)) {
      setSelectedUnits(selectedUnits.filter((id) => id !== idStr))
    } else {
      setSelectedUnits([...selectedUnits, idStr])
    }
  }

  const copyAdUnitId = (id: number, adUnitId: string) => {
    navigator.clipboard.writeText(adUnitId)
    setCopiedId(id.toString())
    setTimeout(() => setCopiedId(null), 2000)
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
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search ad units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>
          <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Create Ad Unit
          </Button>
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
                        paginatedUnits.length > 0 &&
                        paginatedUnits.every((u) => selectedUnits.includes(u.id.toString()))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left min-w-[180px]">
                    <SortHeader field="name">Name</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left">Format</th>
                  <th className="px-4 py-3 text-left min-w-[220px]">Ad Unit ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="ecpm">eCPM</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="impressions">Impressions</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="revenue">Revenue</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="fillRate">Fill Rate</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading ad units...
                    </td>
                  </tr>
                ) : sortedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                      {searchQuery ? "No ad units found matching your search." : "No ad units found for this app."}
                    </td>
                  </tr>
                ) : (
                  paginatedUnits.map((unit) => {
                    const format = unit.adFormat || "Unknown"
                    const FormatIcon = formatIcons[format] || RectangleHorizontal
                    const formatDisplay = formatAdFormat(format)
                    const unitIdStr = unit.id.toString()
                    const fillRate = unit.fillRate || 0
                    return (
                      <tr
                        key={unit.id}
                        className={cn(
                          "hover:bg-slate-50 transition-colors",
                          selectedUnits.includes(unitIdStr) && "bg-blue-50 hover:bg-blue-50",
                          unit.status === "Paused" && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedUnits.includes(unitIdStr)}
                            onCheckedChange={() => toggleSelectUnit(unit.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900">
                            {unit.displayName || unit.name || "Unnamed Ad Unit"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("gap-1", formatColors[format] || formatColors.BANNER)}>
                            <FormatIcon className="w-3 h-3" />
                            {formatDisplay}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {unit.adUnitId}
                            </code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => copyAdUnitId(unit.id, unit.adUnitId)}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                >
                                  {copiedId === unitIdStr ? (
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{copiedId === unitIdStr ? "Copied!" : "Copy ID"}</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {unit.status === "Active" || !unit.status ? (
                            <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">
                            ${(unit.ecpm || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-700">{(unit.impressions || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">
                            ${(unit.revenue || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              fillRate >= 95
                                ? "text-green-600"
                                : fillRate >= 90
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {fillRate > 0 ? `${fillRate.toFixed(2)}%` : "-"}
                          </span>
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
                              <DropdownMenuItem className="gap-2" onClick={() => copyAdUnitId(unit.id, unit.adUnitId)}>
                                <Copy className="w-4 h-4" />
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-amber-600">
                                {unit.status === "Active" || !unit.status ? (
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
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {sortedUnits.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedUnits.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="ad units"
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  )
}
