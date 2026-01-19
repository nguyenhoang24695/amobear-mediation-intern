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

// ... existing code (networkColors, countryFlags, mockGroups) ...

const networkColors: Record<string, string> = {
  AdMob: "bg-yellow-400",
  "Unity Ads": "bg-slate-800",
  ironSource: "bg-purple-600",
  AppLovin: "bg-red-500",
  Vungle: "bg-blue-500",
  "Meta AN": "bg-blue-600",
  Chartboost: "bg-green-500",
  Pangle: "bg-cyan-500",
}

const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  JP: "🇯🇵",
  KR: "🇰🇷",
  BR: "🇧🇷",
  IN: "🇮🇳",
  CA: "🇨🇦",
  AU: "🇦🇺",
}

const mockGroups = [
  {
    id: "1",
    name: "US Banner - High Value",
    appName: "Puzzle Master Pro",
    appId: "1",
    appIcon: "/puzzle-game-icon.png",
    format: "Banner",
    adSources: ["AdMob", "Unity Ads", "ironSource", "AppLovin", "Vungle", "Meta AN", "Chartboost", "Pangle"],
    targeting: ["US", "CA"],
    status: "Active",
    abTest: { id: "test-1", status: "running", day: 5, duration: 14 },
    ecpm: 8.45,
    ecpmTrend: 5.2,
    lastModified: "2 hours ago",
    lastModifiedBy: "John Doe",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "2",
    name: "EU Interstitial - Gaming",
    appName: "Racing Thunder",
    appId: "3",
    appIcon: "/racing-game-icon.png",
    format: "Interstitial",
    adSources: ["AdMob", "Unity Ads", "ironSource", "AppLovin", "Vungle"],
    targeting: ["DE", "FR", "UK"],
    status: "Active",
    abTest: { id: "test-2", status: "completed" },
    ecpm: 12.34,
    ecpmTrend: 8.7,
    lastModified: "5 hours ago",
    lastModifiedBy: "Jane Smith",
    hasWarning: true,
    hasError: false,
  },
  {
    id: "3",
    name: "Global Rewarded - Default",
    appName: "Word Connect",
    appId: "2",
    appIcon: "/word-game-icon.jpg",
    format: "Rewarded",
    adSources: ["AdMob", "Unity Ads", "ironSource"],
    targeting: "Global",
    status: "Active",
    abTest: null,
    ecpm: 18.92,
    ecpmTrend: -2.1,
    lastModified: "1 day ago",
    lastModifiedBy: "Mike Johnson",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "4",
    name: "APAC Native - News Feed",
    appName: "Fitness Tracker Plus",
    appId: "4",
    appIcon: "/fitness-app-icon.jpg",
    format: "Native",
    adSources: ["AdMob", "Meta AN", "Pangle", "AppLovin"],
    targeting: ["JP", "KR", "AU", "IN"],
    status: "Active",
    abTest: null,
    ecpm: 4.56,
    ecpmTrend: 12.3,
    lastModified: "3 hours ago",
    lastModifiedBy: "Sarah Lee",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "5",
    name: "US App Open - Premium",
    appName: "Photo Editor Pro",
    appId: "5",
    appIcon: "/photo-editor-icon.png",
    format: "App Open",
    adSources: ["AdMob", "AppLovin"],
    targeting: ["US"],
    status: "Paused",
    abTest: null,
    ecpm: 6.78,
    ecpmTrend: 0,
    lastModified: "1 week ago",
    lastModifiedBy: "Tom Wilson",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "6",
    name: "LATAM Banner - Casual",
    appName: "Bubble Pop Mania",
    appId: "6",
    appIcon: "/bubble-game-icon.jpg",
    format: "Banner",
    adSources: ["AdMob", "Unity Ads", "Chartboost"],
    targeting: ["BR"],
    status: "Error",
    abTest: null,
    ecpm: 2.34,
    ecpmTrend: -8.5,
    lastModified: "4 hours ago",
    lastModifiedBy: "Ana Garcia",
    hasWarning: false,
    hasError: true,
  },
  {
    id: "7",
    name: "EU Rewarded - Tier 1",
    appName: "Tower Defense Elite",
    appId: "8",
    appIcon: "/tower-defense-game-icon.jpg",
    format: "Rewarded",
    adSources: ["AdMob", "Unity Ads", "ironSource", "AppLovin", "Vungle", "Meta AN"],
    targeting: ["UK", "DE", "FR"],
    status: "Active",
    abTest: { id: "test-3", status: "running", day: 12, duration: 14 },
    ecpm: 22.15,
    ecpmTrend: 15.8,
    lastModified: "6 hours ago",
    lastModifiedBy: "David Brown",
    hasWarning: true,
    hasError: false,
  },
  {
    id: "8",
    name: "Global Interstitial - Fallback",
    appName: "Weather Now",
    appId: "9",
    appIcon: "/weather-app-icon.png",
    format: "Interstitial",
    adSources: ["AdMob", "Unity Ads"],
    targeting: "Global",
    status: "Active",
    abTest: null,
    ecpm: 5.67,
    ecpmTrend: 1.2,
    lastModified: "2 days ago",
    lastModifiedBy: "Emily Chen",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "9",
    name: "US Native - In-Feed",
    appName: "Solitaire Classic",
    appId: "10",
    appIcon: "/solitaire-card-game-icon.jpg",
    format: "Native",
    adSources: ["AdMob", "Meta AN", "AppLovin", "Pangle"],
    targeting: ["US", "CA"],
    status: "Active",
    abTest: null,
    ecpm: 7.89,
    ecpmTrend: 6.4,
    lastModified: "8 hours ago",
    lastModifiedBy: "Chris Taylor",
    hasWarning: false,
    hasError: false,
  },
  {
    id: "10",
    name: "JP Banner - High Floor",
    appName: "Puzzle Master Pro",
    appId: "1",
    appIcon: "/puzzle-game-icon.png",
    format: "Banner",
    adSources: ["AdMob", "Pangle", "Unity Ads", "AppLovin"],
    targeting: ["JP"],
    status: "Active",
    abTest: null,
    ecpm: 9.12,
    ecpmTrend: 3.5,
    lastModified: "12 hours ago",
    lastModifiedBy: "Yuki Tanaka",
    hasWarning: false,
    hasError: false,
  },
]

interface MediationGroupsTableProps {
  searchQuery: string
  appFilter: string
  formatFilter: string
  statusFilter: string
  onlyShowIssues: boolean
  abTestFilter?: string
  selectedGroups: string[]
  onSelectionChange: (groups: string[]) => void
}

type SortField = "name" | "ecpm" | "lastModified" | "abTest"
type SortDirection = "asc" | "desc"

export function MediationGroupsTable({
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

  // Filter groups
  const filteredGroups = mockGroups.filter((group) => {
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
      if (abTestFilter === "running" && group.abTest?.status !== "running") return false
      if (abTestFilter === "completed" && group.abTest?.status !== "completed") return false
      if (abTestFilter === "none" && group.abTest !== null) return false
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
      case "abTest":
        const aHasTest = a.abTest ? 1 : 0
        const bHasTest = b.abTest ? 1 : 0
        return multiplier * (aHasTest - bHasTest)
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
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="abTest">A/B Test</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="ecpm">eCPM</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">Last Modified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedGroups.map((group) => {
                const FormatIcon = getFormatIcon(group.format)

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
                            href={`/mediation/${group.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {group.name}
                          </Link>
                          <Link
                            href={`/apps/${group.appId}`}
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
                        href={`/apps/${group.appId}`}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1">
                              {group.adSources.slice(0, 4).map((source, idx) => (
                                <div
                                  key={idx}
                                  className={cn("w-4 h-4 rounded-full border border-white", networkColors[source])}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500 ml-1">{group.adSources.length}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{group.adSources.join(", ")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3">
                      {group.targeting === "Global" ? (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Globe className="w-4 h-4" />
                          <span className="text-sm">Global</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {(group.targeting as string[]).slice(0, 3).map((country, idx) => (
                            <span key={idx} className="text-base">
                              {countryFlags[country]}
                            </span>
                          ))}
                          {(group.targeting as string[]).length > 3 && (
                            <span className="text-xs text-slate-500">+{(group.targeting as string[]).length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(group.status)}</td>
                    <td className="px-4 py-3">
                      {group.abTest ? (
                        <Link
                          href={`/mediation/tests/${group.abTest.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          {group.abTest.status === "running" ? (
                            <Badge className="gap-1 bg-purple-100 text-purple-700 border-0 hover:bg-purple-200 transition-colors cursor-pointer">
                              <FlaskConical className="w-3 h-3" />
                              Running
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-green-100 text-green-700 border-0 hover:bg-green-200 transition-colors cursor-pointer">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </Badge>
                          )}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-slate-900">${group.ecpm.toFixed(2)}</span>
                        {group.ecpmTrend !== 0 && (
                          <span
                            className={cn(
                              "flex items-center text-xs",
                              group.ecpmTrend > 0 ? "text-green-600" : "text-red-600",
                            )}
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
                            <Link href={`/mediation/${group.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Eye className="w-4 h-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/mediation/${group.id}?tab=waterfall-optimization`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit Waterfall
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/mediation/${group.id}?tab=ab-tests`}
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
