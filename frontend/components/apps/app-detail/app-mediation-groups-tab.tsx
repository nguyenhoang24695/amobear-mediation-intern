"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
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
  Pencil,
  Pause,
  Play,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RectangleHorizontal,
  Square,
  Gift,
  LayoutGrid,
  Smartphone,
  Globe,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { Pagination } from "@/components/shared/pagination"
import type { MediationGroup } from "@/types/api"

// Network logos/images - map ad source IDs to image URLs or emoji
const networkLogos: Record<string, { image?: string; emoji?: string; color: string }> = {
  admob: {
    emoji: "📱",
    color: "bg-yellow-400",
  },
  "ca-app-pub": {
    emoji: "📱",
    color: "bg-yellow-400",
  },
  unity: {
    emoji: "🎮",
    color: "bg-slate-800",
  },
  ironsource: {
    emoji: "⚡",
    color: "bg-purple-600",
  },
  applovin: {
    emoji: "🔴",
    color: "bg-red-500",
  },
  vungle: {
    emoji: "💎",
    color: "bg-blue-500",
  },
  meta: {
    emoji: "📘",
    color: "bg-blue-600",
  },
  facebook: {
    emoji: "📘",
    color: "bg-blue-600",
  },
  chartboost: {
    emoji: "📊",
    color: "bg-green-500",
  },
  mintegral: {
    emoji: "🌐",
    color: "bg-orange-500",
  },
  pangle: {
    emoji: "🇨🇳",
    color: "bg-red-600",
  },
  adcolony: {
    emoji: "🏢",
    color: "bg-indigo-500",
  },
  tapjoy: {
    emoji: "🎯",
    color: "bg-pink-500",
  },
}

// Network colors - map ad source IDs to colors (fallback)
const networkColors: Record<string, string> = {
  admob: "bg-yellow-400",
  "ca-app-pub": "bg-yellow-400",
  unity: "bg-slate-800",
  ironsource: "bg-purple-600",
  applovin: "bg-red-500",
  vungle: "bg-blue-500",
  meta: "bg-blue-600",
  facebook: "bg-blue-600",
}

// Country flags
const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  JP: "🇯🇵",
  CA: "🇨🇦",
  AU: "🇦🇺",
  IN: "🇮🇳",
  CN: "🇨🇳",
  KR: "🇰🇷",
  BR: "🇧🇷",
  MX: "🇲🇽",
  ES: "🇪🇸",
  IT: "🇮🇹",
  NL: "🇳🇱",
  SE: "🇸🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  FI: "🇫🇮",
  PL: "🇵🇱",
  RU: "🇷🇺",
  TR: "🇹🇷",
  SA: "🇸🇦",
  AE: "🇦🇪",
  SG: "🇸🇬",
  MY: "🇲🇾",
  TH: "🇹🇭",
  ID: "🇮🇩",
  PH: "🇵🇭",
  VN: "🇻🇳",
}

const formatIcons: Record<string, React.ElementType> = {
  BANNER: RectangleHorizontal,
  INTERSTITIAL: Square,
  REWARDED: Gift,
  REWARDED_INTERSTITIAL: Gift,
  NATIVE: LayoutGrid,
  APP_OPEN: Smartphone,
  Banner: RectangleHorizontal, // Fallback
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
  return format
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Helper to get network info from ad source ID
const getNetworkInfo = (adSourceId?: string): { emoji?: string; color: string; name: string } => {
  if (!adSourceId) {
    return { color: "bg-slate-400", name: "Unknown" }
  }
  const idLower = adSourceId.toLowerCase()
  for (const [key, info] of Object.entries(networkLogos)) {
    if (idLower.includes(key.toLowerCase())) {
      return {
        emoji: info.emoji,
        color: info.color,
        name: getNetworkName(adSourceId),
      }
    }
  }
  // Fallback to color-based lookup
  for (const [key, color] of Object.entries(networkColors)) {
    if (idLower.includes(key.toLowerCase())) {
      return {
        color,
        name: getNetworkName(adSourceId),
      }
    }
  }
  return { color: "bg-slate-400", name: "Unknown" }
}

// Helper to get network name from ad source ID or title
const getNetworkName = (adSourceId?: string, title?: string): string => {
  // Use title from database if available
  if (title) return title
  
  if (!adSourceId) return "Unknown"
  const idLower = adSourceId.toLowerCase()
  if (idLower.includes("admob") || idLower.includes("ca-app-pub")) return "AdMob"
  if (idLower.includes("unity")) return "Unity Ads"
  if (idLower.includes("ironsource")) return "ironSource"
  if (idLower.includes("applovin")) return "AppLovin"
  if (idLower.includes("vungle")) return "Vungle"
  if (idLower.includes("meta") || idLower.includes("facebook")) return "Meta AN"
  return adSourceId
}

type SortField = "name" | "ecpm" | "revenue"
type SortDirection = "asc" | "desc"

export function AppMediationGroupsTab() {
  const params = useParams()
  const appIdFromParams = (params as any)?.id as string | undefined
  const hasValidAppId = !!appIdFromParams

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Load app by AdMob app_id, rồi load mediation groups (backend trả metrics mặc định từ cache 7 ngày)
  const { data: app } = useApi(
    () => structureApi.getAppByAppId(appIdFromParams!),
    { enabled: hasValidAppId, cacheKey: hasValidAppId ? `app_detail_${appIdFromParams}` : undefined },
  )
  const { data: mediationGroups, loading } = useApi<MediationGroup[]>(
    () => structureApi.getAppMediationGroups(app!.id),
    {
      enabled: !!app,
      cacheKey: app ? `app_mediation_groups_${app.appId}` : undefined,
    },
  )

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
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search mediation groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>
          <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Create Mediation Group
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
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      Loading mediation groups...
                    </td>
                  </tr>
                ) : paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      {searchQuery
                        ? "No mediation groups found matching your search."
                        : "No mediation groups found for this app."}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((group) => {
                    const format = group.adFormat || "Unknown"
                    const FormatIcon = formatIcons[format] || RectangleHorizontal
                    const formatDisplay = formatAdFormat(format)
                    const groupIdStr = group.id.toString()
                    // Use adSourcesInfo if available, otherwise fallback to adSources
                    const adSourcesInfo = group.adSourcesInfo || (group.adSources || []).map(id => ({ adSourceId: id, title: id }))
                    const countries = group.countries || []
                    const isGlobal = countries.length === 0 || countries.length > 10

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
                          <Badge variant="outline" className={cn("gap-1", formatColors[format] || formatColors.BANNER)}>
                            <FormatIcon className="w-3 h-3" />
                            {formatDisplay}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-600">{adSourcesInfo.length}</span>
                            {adSourcesInfo.length > 0 && (
                              <div className="flex items-center -space-x-1 ml-1">
                                {adSourcesInfo.slice(0, 4).map((adSource, idx) => {
                                  const networkInfo = getNetworkInfo(adSource.adSourceId)
                                  const displayName = getNetworkName(adSource.adSourceId, adSource.title)
                                  return (
                                    <Tooltip key={idx}>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn(
                                            "w-6 h-6 rounded-sm border-2 border-white flex items-center justify-center text-xs",
                                            networkInfo.color,
                                            !networkInfo.emoji && "bg-slate-400",
                                          )}
                                          title={displayName}
                                        >
                                          {networkInfo.emoji ? (
                                            <span>{networkInfo.emoji}</span>
                                          ) : (
                                            <span className="text-white font-semibold text-[10px]">
                                              {displayName.charAt(0).toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="font-medium">{displayName}</p>
                                        <p className="text-xs text-slate-400">{adSource.adSourceId}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                                {adSourcesInfo.length > 4 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-6 h-6 rounded-sm bg-slate-200 border-2 border-white flex items-center justify-center">
                                        <span className="text-[10px] font-semibold text-slate-600">
                                          +{adSourcesInfo.length - 4}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <div className="space-y-1">
                                        {adSourcesInfo.slice(4).map((adSource, idx) => {
                                          const displayName = getNetworkName(adSource.adSourceId, adSource.title)
                                          return (
                                            <p key={idx} className="text-sm">
                                              {displayName}
                                            </p>
                                          )
                                        })}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isGlobal ? (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Globe className="w-4 h-4" />
                              Global
                            </div>
                          ) : countries.length > 0 ? (
                            <div className="flex items-center gap-0.5">
                              {countries.slice(0, 3).map((country, idx) => (
                                <span key={idx} className="text-base" title={country}>
                                  {countryFlags[country] || country}
                                </span>
                              ))}
                              {countries.length > 3 && (
                                <span className="text-xs text-slate-500 ml-1">+{countries.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
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
