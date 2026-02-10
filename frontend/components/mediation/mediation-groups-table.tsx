"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Pause,
  Play,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Globe,
  Layers,
  ImageIcon,
  RectangleHorizontal,
  Square,
  Gift,
  LayoutGrid,
  Smartphone,
  FlaskConical,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import type { MediationGroup } from "@/types/api"
import { useMemo } from "react"
import { Loader2 } from "lucide-react"
// Removed unused imports - data now comes from cache via API

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
  if (idLower.includes("chartboost")) return "Chartboost"
  if (idLower.includes("pangle")) return "Pangle"
  if (idLower.includes("mintegral")) return "Mintegral"
  if (idLower.includes("adcolony")) return "AdColony"
  if (idLower.includes("tapjoy")) return "Tapjoy"
  return adSourceId
}

interface MediationGroupsTableProps {
  mediationGroups: MediationGroup[]
  loading?: boolean
  searchQuery: string
  appFilter: string
  formatFilter: string
  statusFilter: string
  onlyShowIssues: boolean
  abTestFilter?: string
  selectedGroups: string[]
  onSelectionChange: (groups: string[]) => void
}

type SortField = "name" | "ecpm" | "lastModified" | "revenue"
type SortDirection = "asc" | "desc"

interface AdSourceInfo {
  adSourceId: string
  title: string
}

export function MediationGroupsTable({
  mediationGroups,
  loading = false,
  searchQuery,
  appFilter,
  formatFilter,
  statusFilter,
  onlyShowIssues,
  abTestFilter = "all",
  selectedGroups,
  onSelectionChange,
}: MediationGroupsTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>("ecpm")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Fetch ad sources and metrics for all groups
  // Use mediation groups data directly from cache (already includes metrics and ad sources)
  // No need to fetch additional data - all data comes from cache via API
  const groupsWithData = useMemo(() => {
    if (!mediationGroups || mediationGroups.length === 0) return []

    // Data already includes metrics and ad sources from cache
    // Use EcpmChangePct from cache (app's EcpmChangePct) as ecpmTrend
    return mediationGroups.map((group: any) => ({
      ...group,
      adSources: group.adSources || [],
      ecpm: group.ecpm || 0,
      ecpmTrend: group.ecpmChangePct || 0, // Use EcpmChangePct from cache
      revenue: group.revenue || 0,
      impressions: group.impressions || 0,
      fillRate: group.fillRate || 0,
      countries: group.countries || [],
    }))
  }, [mediationGroups])

  // Transform mediation groups data to match table format
  const transformedGroups = useMemo(() => {
    if (!groupsWithData || groupsWithData.length === 0) {
      if (!mediationGroups || mediationGroups.length === 0) return []
      // Fallback to basic data
      return mediationGroups.map((group: any) => ({
        id: (group.mediationGroupId ?? group.id?.toString()) ?? "",
        mediationGroupId: group.mediationGroupId ?? group.id?.toString(),
        name: group.displayName || group.name,
        appName: group.appName || "Unknown App", // From cache if available
        appId: group.appId?.toString() || "0",
        appAdMobId: group.appAdMobId ?? undefined,
        appIcon: group.appIconUri || undefined, // From cache if available
        format: group.adFormat || "Unknown",
        adSources: group.adSources || [],
        targeting: (group.countries && group.countries.length > 0) ? group.countries : "Global",
        status: group.state === "ENABLED" ? "Active" : group.state || "Active",
        ecpm: group.ecpm || 0,
        ecpmTrend: group.ecpmChangePct || 0, // From cache if available
        revenue: group.revenue || 0,
        lastModified: group.updatedAt 
          ? new Date(group.updatedAt).toLocaleString()
          : "Never",
        lastModifiedBy: "System",
        hasWarning: false,
        hasError: false,
        _original: group,
      }))
    }

    return groupsWithData.map((group: any) => ({
      id: (group.mediationGroupId ?? group.id?.toString()) ?? "",
      mediationGroupId: group.mediationGroupId ?? group.id?.toString(),
      name: group.displayName || group.name,
      appName: group.appName || "Unknown App", // From cache
      appId: group.appId?.toString() || "0",
      appAdMobId: group.appAdMobId ?? undefined,
      appIcon: group.appIconUri || undefined, // From cache
      format: group.adFormat || "Unknown",
      adSources: group.adSources || [], // From cache
      countries: group.countries || [], // Keep countries array for easy access
      targeting: (group.countries && group.countries.length > 0) ? group.countries : "Global",
      status: group.state === "ENABLED" ? "Active" : group.state || "Active",
      ecpm: group.ecpm || 0, // From cache
      ecpmTrend: group.ecpmTrend || 0, // From cache (EcpmChangePct)
      revenue: group.revenue || 0,
      lastModified: group.updatedAt 
        ? new Date(group.updatedAt).toLocaleString()
        : "Never",
      lastModifiedBy: "System",
      hasWarning: false, // TODO: Check alerts
      hasError: false, // TODO: Check errors
      _original: group,
    }))
  }, [groupsWithData, mediationGroups])

  // Filter groups
  const filteredGroups = transformedGroups.filter((group) => {
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (appFilter !== "all") {
      const appLabel = group.appName.toLowerCase().replace(/\s+/g, "-")
      if (!appLabel.includes(appFilter.replace("_", "-"))) {
        return false
      }
    }
    if (formatFilter !== "All Formats" && group.format !== formatFilter) {
      return false
    }
    if (statusFilter !== "All Status" && group.status !== statusFilter) {
      return false
    }
    if (onlyShowIssues && !group.hasWarning && !group.hasError) {
      return false
    }
    if (abTestFilter !== "all") {
      const abTest = (group as any).abTest
      if (abTestFilter === "running" && abTest?.status !== "running") return false
      if (abTestFilter === "completed" && abTest?.status !== "completed") return false
      if (abTestFilter === "none" && abTest !== null) return false
    }
    return true
  })

  // Sort groups
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    switch (sortField) {
      case "name":
        return multiplier * a.name.localeCompare(b.name)
      case "ecpm":
        return multiplier * (a.ecpm - b.ecpm)
      case "revenue":
        return multiplier * ((a as any).revenue - (b as any).revenue)
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedGroups.length / pageSize)
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleSelectAll = () => {
    if (selectedGroups.length === paginatedGroups.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(paginatedGroups.map((g) => g.id))
    }
  }

  const toggleSelectGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedGroups.includes(groupId)) {
      onSelectionChange(selectedGroups.filter((id) => id !== groupId))
    } else {
      onSelectionChange([...selectedGroups, groupId])
    }
  }

  const handleRowClick = (groupId: string) => {
    router.push(`/mediation/${groupId}`)
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "Banner":
        return RectangleHorizontal
      case "Interstitial":
        return Square
      case "Rewarded":
        return Gift
      case "Native":
        return LayoutGrid
      case "App Open":
        return Smartphone
      default:
        return Layers
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
      case "Paused":
        return <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
      case "Error":
        return <Badge className="bg-red-100 text-red-700 border-0">Error</Badge>
      default:
        return null
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

  // Loading state
  if (loading) {
    return (
      <Card className="border-slate-200">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
          <p className="text-sm text-slate-500">Loading mediation groups...</p>
        </div>
      </Card>
    )
  }

  // Empty state
  if (filteredGroups.length === 0) {
    return (
      <Card className="border-slate-200">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No mediation groups found</h3>
          <p className="text-sm text-slate-500 mb-4">Try adjusting your filters or create a new group</p>
          <Button className="bg-blue-600 hover:bg-blue-700">Create Mediation Group</Button>
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr className="text-xs text-slate-500 font-medium">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedGroups.length === paginatedGroups.length && paginatedGroups.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left min-w-[280px]">
                  <SortHeader field="name">Group Name</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">App</th>
                <th className="px-4 py-3 text-left">Format</th>
                <th className="px-4 py-3 text-left">Ad Sources</th>
                <th className="px-4 py-3 text-left">Targeting</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="revenue">Revenue</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="ecpm">eCPM</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedGroups.map((group) => {
                const FormatIcon = getFormatIcon(group.format)
                // Get countries from group data (prefer countries array, fallback to _original)
                const countries = (group as any).countries || (group._original as any)?.countries || []
                const isGlobal = countries.length === 0 || countries.length > 10
                
                // Map ad sources to adSourcesInfo format (like app-mediation-groups-tab.tsx)
                const adSourcesInfo = (group.adSources || []).map((adSourceId: string) => ({
                  adSourceId,
                  title: adSourceId, // Use adSourceId as title if no title from database
                }))

                return (
                  <tr
                    key={group.id}
                    onClick={() => handleRowClick(group.id)}
                    className={cn(
                      "transition-colors cursor-pointer",
                      selectedGroups.includes(group.id) && "bg-blue-50 hover:bg-blue-50",
                      group.hasError && "bg-red-50/50",
                      group.hasWarning && !group.hasError && "bg-amber-50/50",
                      group.status === "Paused" && "opacity-60",
                      !selectedGroups.includes(group.id) && !group.hasError && !group.hasWarning && "hover:bg-slate-50",
                    )}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={() => {}}
                        onClick={(e) => toggleSelectGroup(group.id, e)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {group.hasError && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        {group.hasWarning && !group.hasError && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        <div>
                          <Link
                            href={`/mediation/${group.mediationGroupId ?? group.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {group.name}
                          </Link>
                          <Link
                            href={group.appAdMobId ? `/apps/${group.appAdMobId}` : "#"}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-slate-500 hover:text-slate-700 block"
                          >
                            {group.appName}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={group.appAdMobId ? `/apps/${group.appAdMobId}` : "#"}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage src={group.appIcon || "/placeholder.svg"} alt={group.appName} />
                          <AvatarFallback className="rounded-lg bg-slate-100">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-200">
                        <FormatIcon className="w-3 h-3" />
                        {group.format}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-600">{adSourcesInfo.length}</span>
                        {adSourcesInfo.length > 0 && (
                          <div className="flex items-center -space-x-1 ml-1">
                            {adSourcesInfo.slice(0, 4).map((adSource: { adSourceId: string; title: string }, idx: number) => {
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
                                    {adSourcesInfo.slice(4).map((adSource: AdSourceInfo, idx: number) => {
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
                          {countries.slice(0, 3).map((country: string, idx: number) => (
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
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {(group as any).revenue > 0 ? `$${(group as any).revenue.toFixed(2)}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-slate-900">
                          {group.ecpm > 0 ? `$${group.ecpm.toFixed(2)}` : "—"}
                        </span>
                        {group.ecpmTrend !== 0 && group.ecpm > 0 && (
                          <span
                            className={cn(
                              "flex items-center text-xs",
                              group.ecpmTrend > 0 ? "text-green-600" : "text-red-600",
                            )}
                            title={`${group.ecpmTrend > 0 ? "+" : ""}${group.ecpmTrend.toFixed(1)}%`}
                          >
                            {group.ecpmTrend > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(group.status)}</td>
                    <td className="px-4 py-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-slate-500 cursor-default">{group.lastModified}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">by {group.lastModifiedBy}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/mediation/${group.mediationGroupId ?? group.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye className="w-4 h-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/mediation/${group.mediationGroupId ?? group.id}?tab=waterfall-optimization`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit Waterfall
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/mediation/${group.mediationGroupId ?? group.id}?tab=ab-tests`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <FlaskConical className="w-4 h-4" />
                              View A/B Tests
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => window.open("https://admob.google.com", "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                            View in AdMob
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2">
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </DropdownMenuItem>
                          {group.status === "Active" ? (
                            <DropdownMenuItem className="gap-2">
                              <Pause className="w-4 h-4" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="gap-2">
                              <Play className="w-4 h-4" />
                              Resume
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

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
          itemName="groups"
        />
      </Card>
    </TooltipProvider>
  )
}
