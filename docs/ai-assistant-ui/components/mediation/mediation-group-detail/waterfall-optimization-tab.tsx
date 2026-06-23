"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CheckCircle2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  GripVertical,
  Trash2,
  Undo2,
  Plus,
  Lock,
  RotateCcw,
  RefreshCw,
  Save,
  Settings2,
  Info,
  Sparkles,
  Activity,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AddAdSourceModal } from "../modals/add-ad-source-modal"

interface WaterfallOptimizationTabProps {
  onRunABTest: () => void
  onApplyDirect: () => void
  hasRunningTest: boolean
  testDay: number
  testDuration: number
}

interface WaterfallSource {
  id: string
  name: string
  floor: number
  ecpm: number
  status: "active" | "inactive"
  originalFloor?: number
  changeType?: "modified" | "new" | "removed"
  network?: string
}

interface BiddingSource {
  id: string
  name: string
  floor: number | null
  status: "active" | "inactive"
  ecpm7d: number
  changeType?: "new" | "removed"
}

interface AdUnit {
  id: string
  name: string
  format: string
  appName: string
  appIcon: string
  platform: "ANDROID" | "IOS"
  ecpm: number
}

// Mock ad units data
const adUnits: AdUnit[] = [
  {
    id: "au1",
    name: "AppOpen_H_2309",
    format: "APP_OPEN",
    appName: "Weather Now: Radar & Forecast",
    appIcon: "/weather-app-icon.png",
    platform: "ANDROID",
    ecpm: 134.34,
  },
]

// Initial mock data for current waterfall
const initialCurrentWaterfall = {
  bidding: [
    {
      id: "b1",
      name: "Pangle (bidding)",
      floor: null,
      status: "active" as const,
      ecpm7d: 0.0,
    },
    {
      id: "b2",
      name: "AdMob Network (bidding)",
      floor: null,
      status: "active" as const,
      ecpm7d: 8.5,
    },
    {
      id: "b3",
      name: "Meta Audience Network (bidding)",
      floor: null,
      status: "active" as const,
      ecpm7d: 7.2,
    },
  ],
  waterfall: [
    {
      id: "w1",
      name: "Inter81.15",
      floor: 81.15,
      ecpm: 85.2,
      status: "active" as const,
      network: "AdMob",
    },
    {
      id: "w2",
      name: "Inter65.93",
      floor: 65.93,
      ecpm: 68.4,
      status: "active" as const,
      network: "ironSource",
    },
    {
      id: "w3",
      name: "Inter50.72",
      floor: 50.72,
      ecpm: 54.3,
      status: "active" as const,
      network: "Unity Ads",
    },
  ],
  estimatedMonthly: 2,
}

// Initial AI-suggested optimized waterfall
const initialOptimizedWaterfall = {
  bidding: [
    {
      id: "b1",
      name: "Pangle (bidding)",
      floor: null,
      status: "inactive" as const,
      ecpm7d: 0.0,
    },
    {
      id: "b2",
      name: "AdMob Network (bidding)",
      floor: null,
      status: "active" as const,
      ecpm7d: 8.5,
    },
    {
      id: "b3",
      name: "Meta Audience Network (bidding)",
      floor: null,
      status: "active" as const,
      ecpm7d: 7.2,
    },
  ],
  waterfall: [
    {
      id: "w1",
      name: "Inter191.42",
      floor: 191.42,
      ecpm: 195.8,
      status: "active" as const,
      network: "AdMob",
      originalFloor: 81.15,
      changeType: "modified" as const,
    },
    {
      id: "w2",
      name: "Inter153.14",
      floor: 153.14,
      ecpm: 158.2,
      status: "active" as const,
      network: "ironSource",
      originalFloor: 65.93,
      changeType: "modified" as const,
    },
    {
      id: "w3",
      name: "Inter122.50",
      floor: 122.5,
      ecpm: 128.4,
      status: "active" as const,
      network: "Unity Ads",
      originalFloor: 50.72,
      changeType: "modified" as const,
    },
  ],
  estimatedMonthly: 2,
  improvement: 0.0,
}

export function WaterfallOptimizationTab({
  onRunABTest,
  onApplyDirect,
}: WaterfallOptimizationTabProps) {
  const [viewMode, setViewMode] = useState("side-by-side")
  const [showMode, setShowMode] = useState("all")
  const [currentBiddingOpen, setCurrentBiddingOpen] = useState(true)
  const [currentWaterfallOpen, setCurrentWaterfallOpen] = useState(false)
  const [optimizedBiddingOpen, setOptimizedBiddingOpen] = useState(true)
  const [optimizedWaterfallOpen, setOptimizedWaterfallOpen] = useState(false)
  const [selectedRuleGroup, setSelectedRuleGroup] = useState("default")
  const [selectedAdUnits, setSelectedAdUnits] = useState<string[]>([])

  // Editable state for optimized waterfall
  const [optimizedBidding, setOptimizedBidding] = useState<BiddingSource[]>(
    initialOptimizedWaterfall.bidding
  )
  const [optimizedWaterfall, setOptimizedWaterfall] = useState<WaterfallSource[]>(
    initialOptimizedWaterfall.waterfall
  )
  const [aiSuggestedWaterfall] = useState<WaterfallSource[]>(
    initialOptimizedWaterfall.waterfall
  )

  // Editing state
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingFloorValue, setEditingFloorValue] = useState("")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Modal state
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false)
  const [addSourceType, setAddSourceType] = useState<"bidding" | "waterfall">(
    "waterfall"
  )

  // Check if user has made manual changes from AI suggestion
  const hasManualChanges = useCallback(() => {
    if (optimizedWaterfall.length !== aiSuggestedWaterfall.length) return true

    for (let i = 0; i < optimizedWaterfall.length; i++) {
      const current = optimizedWaterfall[i]
      const suggested = aiSuggestedWaterfall[i]
      if (!suggested) return true
      if (
        current.id !== suggested.id ||
        current.floor !== suggested.floor ||
        current.status !== suggested.status
      ) {
        return true
      }
    }
    return optimizedWaterfall.some(
      (s) => s.changeType === "new" || s.changeType === "removed"
    )
  }, [optimizedWaterfall, aiSuggestedWaterfall])

  // Calculate changes summary
  const calculateChanges = useCallback(() => {
    const modifiedFloors = optimizedWaterfall.filter(
      (s) => s.changeType === "modified" && s.status !== "inactive"
    )
    const addedSources = optimizedWaterfall.filter((s) => s.changeType === "new")
    const removedSources = optimizedWaterfall.filter(
      (s) => s.changeType === "removed"
    )

    const avgFloorIncrease =
      modifiedFloors.length > 0
        ? modifiedFloors.reduce(
            (sum, s) => sum + (s.floor - (s.originalFloor || 0)),
            0
          ) / modifiedFloors.length
        : 0

    const baseMonthly = initialCurrentWaterfall.estimatedMonthly
    const improvementFactor =
      1 +
      (avgFloorIncrease / 100) * 0.5 +
      addedSources.length * 0.02 -
      removedSources.length * 0.015
    const estimatedMonthly = Math.round(baseMonthly * improvementFactor)
    const improvement = ((estimatedMonthly - baseMonthly) / baseMonthly) * 100

    return {
      modifiedCount: modifiedFloors.length,
      addedCount: addedSources.length,
      removedCount: removedSources.length,
      avgFloorIncrease,
      estimatedMonthly,
      improvement: improvement.toFixed(1),
      hasChanges:
        modifiedFloors.length > 0 ||
        addedSources.length > 0 ||
        removedSources.length > 0,
    }
  }, [optimizedWaterfall])

  const changes = calculateChanges()

  // Handle inline eCPM floor editing
  const startEditing = (source: WaterfallSource) => {
    setEditingFloorId(source.id)
    setEditingFloorValue(source.floor.toFixed(2))
  }

  const saveFloorEdit = (sourceId: string) => {
    const newFloor = Number.parseFloat(editingFloorValue)
    if (isNaN(newFloor) || newFloor <= 0) {
      setEditingFloorId(null)
      return
    }

    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          const originalFloor = source.originalFloor ?? source.floor
          const isModified = newFloor !== originalFloor
          return {
            ...source,
            floor: newFloor,
            name: `Inter${newFloor.toFixed(2)}`,
            originalFloor: source.changeType === "new" ? undefined : originalFloor,
            changeType:
              source.changeType === "new" ? "new" : isModified ? "modified" : undefined,
          }
        }
        return source
      })
    )
    setEditingFloorId(null)
  }

  const cancelFloorEdit = () => {
    setEditingFloorId(null)
    setEditingFloorValue("")
  }

  const handleFloorKeyDown = (e: React.KeyboardEvent, sourceId: string) => {
    if (e.key === "Enter") {
      saveFloorEdit(sourceId)
    } else if (e.key === "Escape") {
      cancelFloorEdit()
    }
  }

  const markSourceRemoved = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return { ...source, changeType: "removed" }
        }
        return source
      })
    )
  }

  const undoRemoval = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          const isModified =
            source.originalFloor !== undefined &&
            source.floor !== source.originalFloor
          return { ...source, changeType: isModified ? "modified" : undefined }
        }
        return source
      })
    )
  }

  const handleDragStart = (e: React.DragEvent, sourceId: string) => {
    setDraggedItemId(sourceId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedItemId !== null && dragOverIndex !== null) {
      const draggedIndex = optimizedWaterfall.findIndex(
        (s) => s.id === draggedItemId
      )
      if (draggedIndex !== -1 && draggedIndex !== dragOverIndex) {
        const newWaterfall = [...optimizedWaterfall]
        const [draggedItem] = newWaterfall.splice(draggedIndex, 1)
        newWaterfall.splice(dragOverIndex, 0, draggedItem)
        setOptimizedWaterfall(newWaterfall)
      }
    }
    setDraggedItemId(null)
    setDragOverIndex(null)
  }

  const handleAddSource = (source: {
    type: "bidding" | "waterfall"
    network: string
    name: string
    floor: number
    status: "active" | "inactive"
  }) => {
    if (source.type === "waterfall") {
      const newSource: WaterfallSource = {
        id: `w_new_${Date.now()}`,
        name: source.name,
        floor: source.floor,
        ecpm: source.floor * 1.02,
        status: source.status,
        network: source.network,
        changeType: "new",
      }
      setOptimizedWaterfall((prev) => [...prev, newSource])
    } else {
      const newSource: BiddingSource = {
        id: `b_new_${Date.now()}`,
        name: source.network,
        floor: null,
        status: source.status,
        ecpm7d: 0,
        changeType: "new",
      }
      setOptimizedBidding((prev) => [...prev, newSource])
    }
  }

  const resetToAISuggestion = () => {
    setOptimizedWaterfall([...initialOptimizedWaterfall.waterfall])
    setOptimizedBidding([...initialOptimizedWaterfall.bidding])
  }

  const discardAllChanges = () => {
    resetToAISuggestion()
  }

  const toggleSourceStatus = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return {
            ...source,
            status: source.status === "active" ? "inactive" : "active",
          }
        }
        return source
      })
    )
  }

  const toggleBiddingStatus = (sourceId: string) => {
    setOptimizedBidding((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return {
            ...source,
            status: source.status === "active" ? "inactive" : "active",
          }
        }
        return source
      })
    )
  }

  const toggleAdUnitSelection = (id: string) => {
    setSelectedAdUnits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllAdUnits = () => {
    if (selectedAdUnits.length === adUnits.length) {
      setSelectedAdUnits([])
    } else {
      setSelectedAdUnits(adUnits.map((u) => u.id))
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 pb-24">
        {/* Section 1: Ad Units + Optimization Status - Compact Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Ad Units Card - Compact */}
          <Card className="flex-1 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Ad units</h3>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-blue-600 text-xs"
                  >
                    Add ad units
                  </Button>
                  <span className="text-slate-300">|</span>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-slate-400 text-xs"
                    disabled={selectedAdUnits.length === 0}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-8 py-2">
                        <Checkbox
                          checked={
                            selectedAdUnits.length === adUnits.length &&
                            adUnits.length > 0
                          }
                          onCheckedChange={toggleAllAdUnits}
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-medium text-slate-500 uppercase tracking-wide py-2">
                        Ad unit
                      </TableHead>
                      <TableHead className="text-[10px] font-medium text-slate-500 uppercase tracking-wide py-2">
                        Ad Format
                      </TableHead>
                      <TableHead className="text-[10px] font-medium text-slate-500 uppercase tracking-wide py-2">
                        App
                      </TableHead>
                      <TableHead className="text-[10px] font-medium text-slate-500 uppercase tracking-wide text-right py-2">
                        <div className="flex items-center justify-end gap-1">
                          eCPM
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Average eCPM over last 7 days
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adUnits.map((unit) => (
                      <TableRow key={unit.id} className="hover:bg-slate-50">
                        <TableCell className="py-2">
                          <Checkbox
                            checked={selectedAdUnits.includes(unit.id)}
                            onCheckedChange={() => toggleAdUnitSelection(unit.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 text-xs py-2">
                          {unit.name}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600 border-slate-200 font-normal text-[10px] px-1.5 py-0.5"
                          >
                            {unit.format}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                              <Image
                                src={unit.appIcon || "/placeholder.svg"}
                                alt={unit.appName}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-900 line-clamp-1">
                                {unit.appName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {unit.platform} • Free
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-900 text-xs py-2">
                          ${unit.ecpm.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination - Compact */}
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>Show rows:</span>
                  <Select defaultValue="15">
                    <SelectTrigger className="w-14 h-6 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span>1-1 of 1</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
                    <ChevronRight className="w-3 h-3 rotate-180" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Status Card - Compact */}
          <Card className="lg:w-64 border-green-200 bg-green-50/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-slate-900">Waterfall Optimized</span>
                </div>
                <Button
                  variant="link"
                  className="h-auto p-0 text-green-600 text-xs"
                >
                  Re-analyze Now
                </Button>
              </div>
              <p className="text-xs text-slate-600">
                Current configuration is performing optimally
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Last analyzed: 2 hours ago
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Recommendation Rule Group - Compact Inline */}
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">
                  Recommendation Rule Group
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <Select
                  value={selectedRuleGroup}
                  onValueChange={setSelectedRuleGroup}
                >
                  <SelectTrigger className="w-[200px] h-8 text-sm bg-white">
                    <SelectValue placeholder="Select rule group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      No rule group (use default)
                    </SelectItem>
                    <SelectItem value="aggressive">
                      Aggressive Optimization
                    </SelectItem>
                    <SelectItem value="conservative">
                      Conservative Growth
                    </SelectItem>
                    <SelectItem value="balanced">Balanced Approach</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent text-xs">
                  <Save className="w-3.5 h-3.5" />
                  Save
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rerun Recommendation
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Select a{" "}
              <span className="text-blue-600 cursor-pointer hover:underline">
                rule group
              </span>{" "}
              to customize which optimization rules apply to this app's mediation
              groups. After saving, click "Rerun Recommendation" to recalculate
              suggestions.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Waterfall Configuration */}
        <div className="space-y-3">
          {/* Header Row - Compact */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Waterfall Configuration
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 bg-transparent text-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                View Activity
              </Button>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[115px] h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                  <SelectItem value="current-only">Current Only</SelectItem>
                  <SelectItem value="optimized-only">Optimized Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={showMode} onValueChange={setShowMode}>
                <SelectTrigger className="w-[105px] h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="changed">Changed Only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-transparent text-xs"
                onClick={() => {
                  setCurrentBiddingOpen(true)
                  setCurrentWaterfallOpen(true)
                  setOptimizedBiddingOpen(true)
                  setOptimizedWaterfallOpen(true)
                }}
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-transparent text-xs"
                onClick={() => {
                  setCurrentBiddingOpen(false)
                  setCurrentWaterfallOpen(false)
                  setOptimizedBiddingOpen(false)
                  setOptimizedWaterfallOpen(false)
                }}
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div
            className={cn(
              "grid gap-3",
              viewMode === "side-by-side" && "grid-cols-1 lg:grid-cols-2",
              viewMode === "current-only" && "grid-cols-1 max-w-2xl",
              viewMode === "optimized-only" && "grid-cols-1 max-w-2xl"
            )}
          >
            {/* LEFT COLUMN - Current Setup (READ-ONLY) */}
            {(viewMode === "side-by-side" || viewMode === "current-only") && (
              <Card className="border-slate-200 overflow-hidden">
                {/* Blue header */}
                <div className="bg-blue-600 text-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wide">
                          Current Setup
                        </h3>
                        <Lock className="w-4 h-4 text-blue-200" />
                      </div>
                      <p className="text-blue-200 text-sm mt-0.5">
                        Variant A • Active • Read-only
                      </p>
                      <p className="text-xs text-blue-300 mt-1">
                        Last updated: 2/25/26, 1:55 PM
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-200">Estimated Monthly</p>
                      <p className="text-3xl font-bold">
                        ${initialCurrentWaterfall.estimatedMonthly}
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  {/* Bidding Section */}
                  <Collapsible
                    open={currentBiddingOpen}
                    onOpenChange={setCurrentBiddingOpen}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">
                        Bidding ({initialCurrentWaterfall.bidding.length} sources)
                      </span>
                      {currentBiddingOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {initialCurrentWaterfall.bidding.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {source.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              No floor • Active
                            </p>
                          </div>
                          <p className="text-sm text-slate-500">
                            7D: ${source.ecpm7d.toFixed(2)} eCPM
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Waterfall Section */}
                  <Collapsible
                    open={currentWaterfallOpen}
                    onOpenChange={setCurrentWaterfallOpen}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">
                        Waterfall ({initialCurrentWaterfall.waterfall.length}{" "}
                        sources)
                      </span>
                      {currentWaterfallOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {initialCurrentWaterfall.waterfall.map((source, index) => (
                        <div
                          key={source.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {source.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              ${source.floor.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-sm text-slate-500">
                            eCPM: ${source.ecpm.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {/* RIGHT COLUMN - Optimized Suggested (EDITABLE) */}
            {(viewMode === "side-by-side" || viewMode === "optimized-only") && (
              <Card className="border-slate-200 overflow-hidden">
                {/* Green header */}
                <div className="bg-green-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base uppercase tracking-wide">
                          Optimized (Suggested)
                        </h3>
                        <Pencil className="w-4 h-4 text-green-200" />
                        {hasManualChanges() && (
                          <Badge className="bg-amber-400 text-amber-900 border-0 text-xs">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      <p className="text-green-200 text-sm mt-0.5">
                        Variant B • Editable
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-200">Estimated Monthly</p>
                      <p className="text-3xl font-bold">
                        ${changes.estimatedMonthly}{" "}
                        <span
                          className={cn(
                            "text-sm",
                            Number.parseFloat(changes.improvement) >= 0
                              ? "text-green-200"
                              : "text-red-200"
                          )}
                        >
                          ({Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                          {changes.improvement}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  {/* Reset link */}
                  {hasManualChanges() && (
                    <div className="flex justify-end">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-blue-600 text-sm gap-1"
                        onClick={resetToAISuggestion}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to AI Suggestion
                      </Button>
                    </div>
                  )}

                  {/* Bidding Section */}
                  <Collapsible
                    open={optimizedBiddingOpen}
                    onOpenChange={setOptimizedBiddingOpen}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">
                        Bidding (
                        {
                          optimizedBidding.filter((s) => s.changeType !== "removed")
                            .length
                        }{" "}
                        sources)
                      </span>
                      {optimizedBiddingOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {optimizedBidding.map((source) => (
                        <div
                          key={source.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg group",
                            source.changeType === "new"
                              ? "bg-green-50"
                              : "bg-slate-50"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              source.status === "active"
                                ? "border-green-500 bg-white"
                                : "border-slate-300 bg-slate-100"
                            )}
                          >
                            {source.status === "active" && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  source.status === "active"
                                    ? "text-slate-900"
                                    : "text-slate-400"
                                )}
                              >
                                {source.name}
                              </p>
                              {source.changeType === "new" && (
                                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              No floor •{" "}
                              {source.status === "active" ? "Active" : "Inactive"}
                            </p>
                          </div>
                          <p className="text-sm text-slate-500">
                            7D: ${source.ecpm7d.toFixed(2)} eCPM
                          </p>
                          <Switch
                            checked={source.status === "active"}
                            onCheckedChange={() => toggleBiddingStatus(source.id)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      ))}
                      {/* Add Bidding Source Button */}
                      <button
                        onClick={() => {
                          setAddSourceType("bidding")
                          setAddSourceModalOpen(true)
                        }}
                        className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Bidding Source
                      </button>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Waterfall Section */}
                  <Collapsible
                    open={optimizedWaterfallOpen}
                    onOpenChange={setOptimizedWaterfallOpen}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-700">
                        Waterfall (
                        {
                          optimizedWaterfall.filter(
                            (s) => s.changeType !== "removed"
                          ).length
                        }{" "}
                        sources)
                      </span>
                      {optimizedWaterfallOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {optimizedWaterfall.map((source, index) => {
                        const isRemoved = source.changeType === "removed"
                        const isModified = source.changeType === "modified"
                        const isNew = source.changeType === "new"
                        const displayIndex =
                          optimizedWaterfall.filter(
                            (s, i) => i < index && s.changeType !== "removed"
                          ).length + 1

                        return (
                          <div
                            key={source.id}
                            draggable={!isRemoved}
                            onDragStart={(e) => handleDragStart(e, source.id)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg group transition-all",
                              isRemoved && "bg-red-50 opacity-60",
                              isModified && !isRemoved && "bg-amber-50",
                              isNew && !isRemoved && "bg-green-50",
                              !isRemoved &&
                                !isModified &&
                                !isNew &&
                                "bg-slate-50",
                              dragOverIndex === index &&
                                draggedItemId !== source.id &&
                                "border-2 border-green-400 border-dashed",
                              draggedItemId === source.id && "opacity-50"
                            )}
                          >
                            {/* Drag Handle */}
                            {!isRemoved && (
                              <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}
                            {isRemoved && <div className="w-4" />}

                            {/* Position Number */}
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center",
                                isRemoved
                                  ? "bg-red-200 text-red-600 line-through"
                                  : "bg-green-100 text-green-600"
                              )}
                            >
                              {isRemoved ? "-" : displayIndex}
                            </span>

                            {/* Source Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={cn(
                                    "text-sm font-medium text-slate-900",
                                    isRemoved && "line-through text-slate-400"
                                  )}
                                >
                                  {source.name}
                                </p>
                                {isModified && !isRemoved && (
                                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                                    MODIFIED
                                  </Badge>
                                )}
                                {isNew && !isRemoved && (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    NEW
                                  </Badge>
                                )}
                                {isRemoved && (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    REMOVED
                                  </Badge>
                                )}
                              </div>

                              {/* eCPM Floor - Editable */}
                              <div className="flex items-center gap-2">
                                {editingFloorId === source.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500">
                                      $
                                    </span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingFloorValue}
                                      onChange={(e) =>
                                        setEditingFloorValue(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        handleFloorKeyDown(e, source.id)
                                      }
                                      onBlur={() => saveFloorEdit(source.id)}
                                      className="h-6 w-24 text-xs px-1 ring-2 ring-blue-500"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => !isRemoved && startEditing(source)}
                                    disabled={isRemoved}
                                    className={cn(
                                      "text-xs flex items-center gap-1",
                                      isRemoved
                                        ? "text-slate-400 line-through cursor-not-allowed"
                                        : "text-slate-500 hover:text-blue-600 hover:underline cursor-pointer"
                                    )}
                                  >
                                    ${source.floor.toFixed(2)}
                                    {!isRemoved && (
                                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                    )}
                                  </button>
                                )}
                                {isModified && source.originalFloor && !isRemoved && (
                                  <span className="text-xs text-slate-400 line-through">
                                    Was: ${source.originalFloor.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actual eCPM */}
                            <p
                              className={cn(
                                "text-sm text-slate-500",
                                isRemoved && "line-through text-slate-400"
                              )}
                            >
                              7D: ${source.ecpm.toFixed(2)}
                            </p>

                            {/* Status Toggle */}
                            {!isRemoved && (
                              <Switch
                                checked={source.status === "active"}
                                onCheckedChange={() => toggleSourceStatus(source.id)}
                                className="data-[state=checked]:bg-green-500"
                              />
                            )}

                            {/* Delete / Undo Button */}
                            {isRemoved ? (
                              <button
                                onClick={() => undoRemoval(source.id)}
                                className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                Undo
                              </button>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => markSourceRemoved(source.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Remove this source?</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )
                      })}

                      {/* Add Waterfall Source Button */}
                      <button
                        onClick={() => {
                          setAddSourceType("waterfall")
                          setAddSourceModalOpen(true)
                        }}
                        className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-green-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Waterfall Source
                      </button>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Section 4: Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between pl-[240px]">
            <div className="flex items-center gap-4">
              {changes.hasChanges ? (
                <Button
                  variant="link"
                  className="text-slate-500 h-auto p-0"
                  onClick={discardAllChanges}
                >
                  Discard Changes
                </Button>
              ) : (
                <span className="text-sm text-slate-500">
                  Make changes to enable actions
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={onApplyDirect}
                disabled={!changes.hasChanges}
              >
                Apply Direct
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={onRunABTest}
                disabled={!changes.hasChanges}
              >
                Run A/B Test
              </Button>
            </div>
          </div>
        </div>

        {/* Add Ad Source Modal */}
        <AddAdSourceModal
          open={addSourceModalOpen}
          onOpenChange={setAddSourceModalOpen}
          sourceType={addSourceType}
          onAddSource={handleAddSource}
        />
      </div>
    </TooltipProvider>
  )
}
