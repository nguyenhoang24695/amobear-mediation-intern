"use client"

import type React from "react"

import { useState } from "react"
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

// Network colors
const networkColors: Record<string, string> = {
  AdMob: "bg-yellow-400",
  "Unity Ads": "bg-slate-800",
  ironSource: "bg-purple-600",
  AppLovin: "bg-red-500",
  Vungle: "bg-blue-500",
  "Meta AN": "bg-blue-600",
}

// Country flags
const countryFlags: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  JP: "🇯🇵",
  CA: "🇨🇦",
}

// Mock data
const mockMediationGroups = [
  {
    id: "1",
    name: "US Banner - High Value",
    format: "Banner",
    adSources: ["AdMob", "Unity Ads", "ironSource", "AppLovin"],
    targeting: ["US", "CA"],
    status: "Active",
    ecpm: 3.45,
  },
  {
    id: "2",
    name: "EU Interstitial - Tier 1",
    format: "Interstitial",
    adSources: ["AdMob", "Unity Ads", "AppLovin", "Vungle"],
    targeting: ["UK", "DE", "FR"],
    status: "Active",
    ecpm: 9.82,
  },
  {
    id: "3",
    name: "Global Rewarded - Default",
    format: "Rewarded",
    adSources: ["AdMob", "Unity Ads", "ironSource"],
    targeting: "Global",
    status: "Active",
    ecpm: 18.45,
  },
  {
    id: "4",
    name: "JP Native - Premium",
    format: "Native",
    adSources: ["AdMob", "Meta AN"],
    targeting: ["JP"],
    status: "Active",
    ecpm: 5.67,
  },
  {
    id: "5",
    name: "US App Open - Launch",
    format: "App Open",
    adSources: ["AdMob", "AppLovin"],
    targeting: ["US"],
    status: "Paused",
    ecpm: 6.23,
  },
  {
    id: "6",
    name: "EU Banner - Fallback",
    format: "Banner",
    adSources: ["AdMob", "Unity Ads"],
    targeting: ["UK", "DE"],
    status: "Active",
    ecpm: 2.15,
  },
  {
    id: "7",
    name: "Global Interstitial - Fallback",
    format: "Interstitial",
    adSources: ["AdMob"],
    targeting: "Global",
    status: "Active",
    ecpm: 5.89,
  },
  {
    id: "8",
    name: "US Rewarded - Extra Lives",
    format: "Rewarded",
    adSources: ["AdMob", "Unity Ads", "ironSource", "AppLovin", "Vungle"],
    targeting: ["US", "CA"],
    status: "Active",
    ecpm: 22.34,
  },
]

const formatIcons: Record<string, React.ElementType> = {
  Banner: RectangleHorizontal,
  Interstitial: Square,
  Rewarded: Gift,
  Native: LayoutGrid,
  "App Open": Smartphone,
}

const formatColors: Record<string, string> = {
  Banner: "bg-blue-50 text-blue-700 border-blue-200",
  Interstitial: "bg-purple-50 text-purple-700 border-purple-200",
  Rewarded: "bg-amber-50 text-amber-700 border-amber-200",
  Native: "bg-green-50 text-green-700 border-green-200",
  "App Open": "bg-cyan-50 text-cyan-700 border-cyan-200",
}

type SortField = "name" | "ecpm"
type SortDirection = "asc" | "desc"

export function AppMediationGroupsTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("ecpm")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const filteredGroups = mockMediationGroups.filter((group) => {
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    switch (sortField) {
      case "name":
        return multiplier * a.name.localeCompare(b.name)
      case "ecpm":
        return multiplier * (a.ecpm - b.ecpm)
      default:
        return 0
    }
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleSelectAll = () => {
    if (selectedGroups.length === sortedGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(sortedGroups.map((g) => g.id))
    }
  }

  const toggleSelectGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId))
    } else {
      setSelectedGroups([...selectedGroups, groupId])
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
                      checked={selectedGroups.length === sortedGroups.length && sortedGroups.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left min-w-[200px]">
                    <SortHeader field="name">Group Name</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left">Format</th>
                  <th className="px-4 py-3 text-left min-w-[140px]">Ad Sources</th>
                  <th className="px-4 py-3 text-left min-w-[120px]">Targeting</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader field="ecpm">eCPM</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedGroups.map((group) => {
                  const FormatIcon = formatIcons[group.format]
                  return (
                    <tr
                      key={group.id}
                      className={cn(
                        "hover:bg-slate-50 transition-colors",
                        selectedGroups.includes(group.id) && "bg-blue-50 hover:bg-blue-50",
                        group.status === "Paused" && "opacity-60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => toggleSelectGroup(group.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{group.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("gap-1", formatColors[group.format])}>
                          <FormatIcon className="w-3 h-3" />
                          {group.format}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-slate-600">{group.adSources.length}</span>
                          <div className="flex items-center -space-x-1 ml-1">
                            {group.adSources.slice(0, 4).map((network, idx) => (
                              <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "w-4 h-4 rounded-sm border border-white",
                                      networkColors[network] || "bg-slate-400",
                                    )}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{network}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {group.adSources.length > 4 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-4 h-4 rounded-sm bg-slate-200 border border-white flex items-center justify-center">
                                    <span className="text-[8px] font-medium text-slate-600">
                                      +{group.adSources.length - 4}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{group.adSources.slice(4).join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {group.targeting === "Global" ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Globe className="w-4 h-4" />
                            Global
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            {(group.targeting as string[]).slice(0, 3).map((country, idx) => (
                              <span key={idx} className="text-base" title={country}>
                                {countryFlags[country]}
                              </span>
                            ))}
                            {(group.targeting as string[]).length > 3 && (
                              <span className="text-xs text-slate-500 ml-1">
                                +{(group.targeting as string[]).length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {group.status === "Active" ? (
                          <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">${group.ecpm.toFixed(2)}</span>
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
                              <DropdownMenuItem className="gap-2">
                                <Eye className="w-4 h-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Pencil className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-amber-600">
                                {group.status === "Active" ? (
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
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}
