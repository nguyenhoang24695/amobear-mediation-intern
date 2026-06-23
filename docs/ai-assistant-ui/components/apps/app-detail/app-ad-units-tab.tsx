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

// Mock data
const mockAdUnits = [
  {
    id: "1",
    name: "Home Screen Banner",
    format: "Banner",
    adUnitId: "ca-app-pub-1234567890/1111111111",
    status: "Active",
    ecpm: 2.45,
    impressions: 45200,
    revenue: 110.74,
    fillRate: 96.2,
  },
  {
    id: "2",
    name: "Level Complete Interstitial",
    format: "Interstitial",
    adUnitId: "ca-app-pub-1234567890/2222222222",
    status: "Active",
    ecpm: 8.92,
    impressions: 12800,
    revenue: 114.18,
    fillRate: 94.5,
  },
  {
    id: "3",
    name: "Daily Reward Video",
    format: "Rewarded",
    adUnitId: "ca-app-pub-1234567890/3333333333",
    status: "Active",
    ecpm: 18.45,
    impressions: 8500,
    revenue: 156.83,
    fillRate: 98.1,
  },
  {
    id: "4",
    name: "News Feed Native",
    format: "Native",
    adUnitId: "ca-app-pub-1234567890/4444444444",
    status: "Active",
    ecpm: 4.67,
    impressions: 22100,
    revenue: 103.21,
    fillRate: 92.8,
  },
  {
    id: "5",
    name: "App Launch Ad",
    format: "App Open",
    adUnitId: "ca-app-pub-1234567890/5555555555",
    status: "Paused",
    ecpm: 6.23,
    impressions: 0,
    revenue: 0,
    fillRate: 0,
  },
  {
    id: "6",
    name: "Settings Banner",
    format: "Banner",
    adUnitId: "ca-app-pub-1234567890/6666666666",
    status: "Active",
    ecpm: 1.89,
    impressions: 18700,
    revenue: 35.34,
    fillRate: 95.4,
  },
  {
    id: "7",
    name: "Exit Interstitial",
    format: "Interstitial",
    adUnitId: "ca-app-pub-1234567890/7777777777",
    status: "Active",
    ecpm: 7.56,
    impressions: 9400,
    revenue: 71.06,
    fillRate: 93.2,
  },
  {
    id: "8",
    name: "Extra Lives Reward",
    format: "Rewarded",
    adUnitId: "ca-app-pub-1234567890/8888888888",
    status: "Active",
    ecpm: 16.78,
    impressions: 6200,
    revenue: 104.04,
    fillRate: 97.5,
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

type SortField = "name" | "ecpm" | "impressions" | "revenue" | "fillRate"
type SortDirection = "asc" | "desc"

export function AppAdUnitsTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredUnits = mockAdUnits.filter((unit) => {
    if (searchQuery && !unit.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const sortedUnits = [...filteredUnits].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    switch (sortField) {
      case "name":
        return multiplier * a.name.localeCompare(b.name)
      case "ecpm":
        return multiplier * (a.ecpm - b.ecpm)
      case "impressions":
        return multiplier * (a.impressions - b.impressions)
      case "revenue":
        return multiplier * (a.revenue - b.revenue)
      case "fillRate":
        return multiplier * (a.fillRate - b.fillRate)
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
    if (selectedUnits.length === sortedUnits.length) {
      setSelectedUnits([])
    } else {
      setSelectedUnits(sortedUnits.map((u) => u.id))
    }
  }

  const toggleSelectUnit = (unitId: string) => {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter((id) => id !== unitId))
    } else {
      setSelectedUnits([...selectedUnits, unitId])
    }
  }

  const copyAdUnitId = (id: string, adUnitId: string) => {
    navigator.clipboard.writeText(adUnitId)
    setCopiedId(id)
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
                      checked={selectedUnits.length === sortedUnits.length && sortedUnits.length > 0}
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
                {sortedUnits.map((unit) => {
                  const FormatIcon = formatIcons[unit.format]
                  return (
                    <tr
                      key={unit.id}
                      className={cn(
                        "hover:bg-slate-50 transition-colors",
                        selectedUnits.includes(unit.id) && "bg-blue-50 hover:bg-blue-50",
                        unit.status === "Paused" && "opacity-60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedUnits.includes(unit.id)}
                          onCheckedChange={() => toggleSelectUnit(unit.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{unit.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("gap-1", formatColors[unit.format])}>
                          <FormatIcon className="w-3 h-3" />
                          {unit.format}
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
                                {copiedId === unit.id ? (
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{copiedId === unit.id ? "Copied!" : "Copy ID"}</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {unit.status === "Active" ? (
                          <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">${unit.ecpm.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-slate-700">{unit.impressions.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">${unit.revenue.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            unit.fillRate >= 95
                              ? "text-green-600"
                              : unit.fillRate >= 90
                                ? "text-amber-600"
                                : "text-red-600",
                          )}
                        >
                          {unit.fillRate > 0 ? `${unit.fillRate}%` : "-"}
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
                            <DropdownMenuItem className="gap-2">
                              <Copy className="w-4 h-4" />
                              Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-amber-600">
                              {unit.status === "Active" ? (
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
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}
