"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Check,
  GripVertical,
  Trash2,
  Undo2,
  Plus,
  Lock,
  AlertCircle,
  RotateCcw,
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
  // Track changes
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

// Initial mock data for current waterfall
const initialCurrentWaterfall = {
  bidding: [
    { id: "b1", name: "AdMob Network", floor: null, status: "active" as const, ecpm7d: 8.5 },
    { id: "b2", name: "Pangle", floor: null, status: "active" as const, ecpm7d: 7.2 },
  ],
  waterfall: [
    { id: "w1", name: "Inter81.15", floor: 81.15, ecpm: 85.2, status: "active" as const, network: "AdMob" },
    { id: "w2", name: "Inter65.93", floor: 65.93, ecpm: 68.4, status: "active" as const, network: "ironSource" },
    { id: "w3", name: "Inter50.72", floor: 50.72, ecpm: 54.3, status: "active" as const, network: "Unity Ads" },
    { id: "w4", name: "Inter40.57", floor: 40.57, ecpm: 43.8, status: "active" as const, network: "Vungle" },
    { id: "w5", name: "Inter30.43", floor: 30.43, ecpm: 33.2, status: "active" as const, network: "AppLovin" },
  ],
  estimatedMonthly: 859,
}

// Initial AI-suggested optimized waterfall
const initialOptimizedWaterfall = {
  bidding: [
    { id: "b1", name: "AdMob Network", floor: null, status: "active" as const, ecpm7d: 8.5 },
    { id: "b2", name: "Pangle", floor: null, status: "active" as const, ecpm7d: 7.2 },
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
    {
      id: "w4",
      name: "Inter85.75",
      floor: 85.75,
      ecpm: 89.3,
      status: "active" as const,
      network: "Vungle",
      originalFloor: 40.57,
      changeType: "modified" as const,
    },
    {
      id: "w5",
      name: "Inter47.16",
      floor: 47.16,
      ecpm: 51.2,
      status: "active" as const,
      network: "AppLovin",
      originalFloor: 30.43,
      changeType: "modified" as const,
    },
  ],
  estimatedMonthly: 954,
  improvement: 11.1,
}

export function WaterfallOptimizationTab({
  onRunABTest,
  onApplyDirect,
  hasRunningTest,
  testDay,
  testDuration,
}: WaterfallOptimizationTabProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [viewMode, setViewMode] = useState("side-by-side")
  const [showMode, setShowMode] = useState("all")
  const [currentBiddingOpen, setCurrentBiddingOpen] = useState(true)
  const [currentWaterfallOpen, setCurrentWaterfallOpen] = useState(true)
  const [optimizedBiddingOpen, setOptimizedBiddingOpen] = useState(true)
  const [optimizedWaterfallOpen, setOptimizedWaterfallOpen] = useState(true)

  // Editable state for optimized waterfall
  const [optimizedBidding, setOptimizedBidding] = useState<BiddingSource[]>(initialOptimizedWaterfall.bidding)
  const [optimizedWaterfall, setOptimizedWaterfall] = useState<WaterfallSource[]>(initialOptimizedWaterfall.waterfall)
  const [aiSuggestedWaterfall] = useState<WaterfallSource[]>(initialOptimizedWaterfall.waterfall)

  // Editing state
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingFloorValue, setEditingFloorValue] = useState("")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Modal state
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false)
  const [addSourceType, setAddSourceType] = useState<"bidding" | "waterfall">("waterfall")

  // Check if user has made manual changes from AI suggestion
  const hasManualChanges = useCallback(() => {
    // Compare current optimized with AI suggested
    if (optimizedWaterfall.length !== aiSuggestedWaterfall.length) return true

    for (let i = 0; i < optimizedWaterfall.length; i++) {
      const current = optimizedWaterfall[i]
      const suggested = aiSuggestedWaterfall[i]
      if (!suggested) return true
      if (current.id !== suggested.id || current.floor !== suggested.floor || current.status !== suggested.status) {
        return true
      }
    }
    return optimizedWaterfall.some((s) => s.changeType === "new" || s.changeType === "removed")
  }, [optimizedWaterfall, aiSuggestedWaterfall])

  // Calculate changes summary
  const calculateChanges = useCallback(() => {
    const modifiedFloors = optimizedWaterfall.filter((s) => s.changeType === "modified" && s.status !== "inactive")
    const addedSources = optimizedWaterfall.filter((s) => s.changeType === "new")
    const removedSources = optimizedWaterfall.filter((s) => s.changeType === "removed")

    const avgFloorIncrease =
      modifiedFloors.length > 0
        ? modifiedFloors.reduce((sum, s) => sum + (s.floor - (s.originalFloor || 0)), 0) / modifiedFloors.length
        : 0

    // Recalculate estimated monthly based on changes
    const baseMonthly = initialCurrentWaterfall.estimatedMonthly
    const improvementFactor =
      1 + (avgFloorIncrease / 100) * 0.5 + addedSources.length * 0.02 - removedSources.length * 0.015
    const estimatedMonthly = Math.round(baseMonthly * improvementFactor)
    const improvement = ((estimatedMonthly - baseMonthly) / baseMonthly) * 100

    return {
      modifiedCount: modifiedFloors.length,
      addedCount: addedSources.length,
      removedCount: removedSources.length,
      avgFloorIncrease,
      estimatedMonthly,
      improvement: improvement.toFixed(1),
      hasChanges: modifiedFloors.length > 0 || addedSources.length > 0 || removedSources.length > 0,
    }
  }, [optimizedWaterfall])

  const changes = calculateChanges()

  // Determine banner state
  const getBannerState = (): "optimization" | "running" | "optimized" | "unsaved" => {
    if (hasManualChanges() && changes.hasChanges) return "unsaved"
    if (hasRunningTest) return "running"
    if (changes.hasChanges) return "optimization"
    return "optimized"
  }

  const bannerState = getBannerState()

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
            changeType: source.changeType === "new" ? "new" : isModified ? "modified" : undefined,
          }
        }
        return source
      }),
    )
    setEditingFloorId(null)
  }

  const cancelFloorEdit = () => {
    setEditingFloorId(null)
    setEditingFloorValue("")
  }

  // Handle keyboard events for editing
  const handleFloorKeyDown = (e: React.KeyboardEvent, sourceId: string) => {
    if (e.key === "Enter") {
      saveFloorEdit(sourceId)
    } else if (e.key === "Escape") {
      cancelFloorEdit()
    }
  }

  // Handle source removal (mark as removed, not actually delete)
  const markSourceRemoved = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return { ...source, changeType: "removed" }
        }
        return source
      }),
    )
  }

  // Undo removal
  const undoRemoval = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          const isModified = source.originalFloor !== undefined && source.floor !== source.originalFloor
          return { ...source, changeType: isModified ? "modified" : undefined }
        }
        return source
      }),
    )
  }

  // Handle drag and drop reordering
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
      const draggedIndex = optimizedWaterfall.findIndex((s) => s.id === draggedItemId)
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

  // Handle adding new source
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
        ecpm: source.floor * 1.02, // Estimate
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

  // Reset to AI suggestion
  const resetToAISuggestion = () => {
    setOptimizedWaterfall([...initialOptimizedWaterfall.waterfall])
    setOptimizedBidding([...initialOptimizedWaterfall.bidding])
  }

  // Discard all changes
  const discardAllChanges = () => {
    resetToAISuggestion()
  }

  // Toggle source status
  const toggleSourceStatus = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return { ...source, status: source.status === "active" ? "inactive" : "active" }
        }
        return source
      }),
    )
  }

  // Calculate average eCPM floor
  const currentAvgFloor =
    initialCurrentWaterfall.waterfall.reduce((sum, s) => sum + s.floor, 0) / initialCurrentWaterfall.waterfall.length
  const optimizedAvgFloor =
    optimizedWaterfall.filter((s) => s.changeType !== "removed").reduce((sum, s) => sum + s.floor, 0) /
    optimizedWaterfall.filter((s) => s.changeType !== "removed").length

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 pb-24">
        {/* Section 1: Optimization Status Banner */}
        {!bannerDismissed && (
          <>
            {/* STATE A - Has Optimization Available */}
            {bannerState === "optimization" && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 flex items-start gap-3 relative">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Optimization Available</h3>
                  <p className="text-sm text-slate-700 mt-0.5">
                    Our analysis suggests changes that could increase eCPM by ~{changes.improvement}% ($
                    {(changes.estimatedMonthly - initialCurrentWaterfall.estimatedMonthly).toFixed(0)})
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Based on last 14 days performance data • Confidence: 87%
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Button variant="link" className="h-auto p-0 text-blue-600">
                      View Changes
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={onApplyDirect}>
                      Apply Direct
                    </Button>
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={onRunABTest}>
                      Run A/B Test
                    </Button>
                  </div>
                </div>
                <button onClick={() => setBannerDismissed(true)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* STATE B - A/B Test Running */}
            {bannerState === "running" && (
              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-lg p-4 flex items-start gap-3">
                <FlaskConical className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">A/B Test In Progress</h3>
                  <p className="text-sm text-slate-700 mt-0.5">
                    Testing optimized waterfall • Day {testDay} of {testDuration} • Traffic split: 50/50
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Early results: Variant B (Optimized) leading by +8.2% eCPM
                  </p>
                  <Progress
                    value={(testDay / testDuration) * 100}
                    className="h-2 mt-3 max-w-xs bg-purple-200 [&>div]:bg-purple-500"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8 bg-transparent flex-shrink-0">
                  View Test Details
                </Button>
              </div>
            )}

            {/* STATE C - No Optimization Needed */}
            {bannerState === "optimized" && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Waterfall Optimized</h3>
                  <p className="text-sm text-slate-700 mt-0.5">Current configuration is performing optimally</p>
                  <p className="text-xs text-slate-500 mt-1">Last analyzed: 2 hours ago</p>
                </div>
                <Button variant="link" className="h-auto p-0 text-green-600">
                  Re-analyze Now
                </Button>
              </div>
            )}

            {/* STATE D - Has Unsaved Changes */}
            {bannerState === "unsaved" && (
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 flex items-start gap-3">
                <Pencil className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Unsaved Changes</h3>
                  <p className="text-sm text-slate-700 mt-0.5">
                    You have modified the optimized waterfall configuration
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {changes.modifiedCount + changes.addedCount + changes.removedCount} changes pending • Don't forget
                    to apply or test
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Button variant="link" className="h-auto p-0 text-red-600" onClick={discardAllChanges}>
                      Discard Changes
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={onApplyDirect}>
                      Apply Direct
                    </Button>
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={onRunABTest}>
                      Run A/B Test
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Section 2: Side-by-Side Waterfall Comparison */}
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Waterfall Configuration</h2>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[140px] h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                  <SelectItem value="current-only">Current Only</SelectItem>
                  <SelectItem value="optimized-only">Optimized Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={showMode} onValueChange={setShowMode}>
                <SelectTrigger className="w-[130px] h-9 bg-white">
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
                className="h-9 bg-transparent"
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
                className="h-9 bg-transparent"
                onClick={() => {
                  setCurrentBiddingOpen(false)
                  setCurrentWaterfallOpen(false)
                  setOptimizedBiddingOpen(false)
                  setOptimizedWaterfallOpen(false)
                }}
              >
                Collapse All
              </Button>
              {hasManualChanges() && (
                <Button variant="link" className="h-9 text-blue-600 gap-1" onClick={resetToAISuggestion}>
                  <RotateCcw className="w-4 h-4" />
                  Reset to AI Suggestion
                </Button>
              )}
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* LEFT COLUMN - Current Setup (READ-ONLY) */}
            <Card className="border-slate-200 overflow-hidden">
              {/* Teal header */}
              <div className="bg-teal-500 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">CURRENT SETUP</h3>
                      <Lock className="w-4 h-4 text-teal-200" />
                    </div>
                    <p className="text-teal-100 text-sm">Variant A • Active • Read-only</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-teal-100">Estimated Monthly</p>
                    <p className="text-2xl font-bold">${initialCurrentWaterfall.estimatedMonthly}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* Bidding Section */}
                <Collapsible open={currentBiddingOpen} onOpenChange={setCurrentBiddingOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
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
                      <div key={source.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Check className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{source.name}</p>
                          <p className="text-xs text-slate-500">No floor • Active</p>
                        </div>
                        <p className="text-sm text-slate-600">7D: ${source.ecpm7d.toFixed(2)} eCPM</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Waterfall Section */}
                <Collapsible open={currentWaterfallOpen} onOpenChange={setCurrentWaterfallOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
                    <span className="text-sm font-medium text-slate-700">
                      Waterfall ({initialCurrentWaterfall.waterfall.length} sources)
                    </span>
                    {currentWaterfallOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {initialCurrentWaterfall.waterfall.map((source, index) => (
                      <div key={source.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{source.name}</p>
                          <p className="text-xs text-slate-500">${source.floor.toFixed(2)}</p>
                        </div>
                        <p className="text-sm text-slate-600">eCPM: ${source.ecpm.toFixed(2)}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* RIGHT COLUMN - Optimized Suggested (EDITABLE) */}
            <Card className="border-slate-200 overflow-hidden">
              {/* Purple header */}
              <div className="bg-purple-500 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">OPTIMIZED (Suggested)</h3>
                      <Pencil className="w-4 h-4 text-purple-200" />
                      {hasManualChanges() && (
                        <Badge className="bg-amber-400 text-amber-900 border-0 text-xs">Unsaved changes</Badge>
                      )}
                    </div>
                    <p className="text-purple-200 text-sm">Variant B • Editable</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-200">Estimated Monthly</p>
                    <p className="text-2xl font-bold">
                      ${changes.estimatedMonthly}{" "}
                      <span
                        className={cn(
                          "text-sm",
                          Number.parseFloat(changes.improvement) >= 0 ? "text-green-300" : "text-red-300",
                        )}
                      >
                        ({Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                        {changes.improvement}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* Bidding Section */}
                <Collapsible open={optimizedBiddingOpen} onOpenChange={setOptimizedBiddingOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
                    <span className="text-sm font-medium text-slate-700">
                      Bidding ({optimizedBidding.filter((s) => s.changeType !== "removed").length} sources)
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
                          source.changeType === "new" ? "bg-green-50" : "bg-slate-50",
                        )}
                      >
                        <Switch checked={source.status === "active"} className="data-[state=checked]:bg-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">{source.name}</p>
                            {source.changeType === "new" && (
                              <Badge className="bg-green-100 text-green-700 border-0 text-xs">NEW</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            No floor • {source.status === "active" ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600">7D: ${source.ecpm7d.toFixed(2)} eCPM</p>
                        <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                <Collapsible open={optimizedWaterfallOpen} onOpenChange={setOptimizedWaterfallOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
                    <span className="text-sm font-medium text-slate-700">
                      Waterfall ({optimizedWaterfall.filter((s) => s.changeType !== "removed").length} sources)
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
                        optimizedWaterfall.filter((s, i) => i < index && s.changeType !== "removed").length + 1

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
                            !isRemoved && !isModified && !isNew && "bg-slate-50",
                            dragOverIndex === index &&
                              draggedItemId !== source.id &&
                              "border-2 border-purple-400 border-dashed",
                            draggedItemId === source.id && "opacity-50",
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
                              isRemoved ? "bg-red-200 text-red-600 line-through" : "bg-purple-100 text-purple-600",
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
                                  isRemoved && "line-through text-slate-400",
                                )}
                              >
                                {source.name}
                              </p>
                              {isModified && !isRemoved && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">MODIFIED</Badge>
                              )}
                              {isNew && !isRemoved && (
                                <Badge className="bg-green-100 text-green-700 border-0 text-xs">NEW</Badge>
                              )}
                              {isRemoved && <Badge className="bg-red-100 text-red-700 border-0 text-xs">REMOVED</Badge>}
                            </div>

                            {/* eCPM Floor - Editable */}
                            <div className="flex items-center gap-2">
                              {editingFloorId === source.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingFloorValue}
                                    onChange={(e) => setEditingFloorValue(e.target.value)}
                                    onKeyDown={(e) => handleFloorKeyDown(e, source.id)}
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
                                      : "text-slate-500 hover:text-blue-600 hover:underline cursor-pointer",
                                  )}
                                >
                                  ${source.floor.toFixed(2)}
                                  {!isRemoved && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
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
                          <p className={cn("text-sm text-slate-600", isRemoved && "line-through text-slate-400")}>
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
                      className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Waterfall Source
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 3: Changes Summary Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900">Changes Summary</CardTitle>
              </div>
              {!changes.hasChanges && (
                <Badge variant="outline" className="text-slate-500">
                  No changes
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {changes.hasChanges ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    {changes.modifiedCount > 0 && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {changes.modifiedCount} eCPM floors modified (avg {changes.avgFloorIncrease >= 0 ? "+" : ""}$
                        {changes.avgFloorIncrease.toFixed(2)})
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {changes.addedCount} sources added
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {changes.removedCount} sources removed
                    </li>
                    <li
                      className={cn(
                        "flex items-center gap-2 font-medium",
                        Number.parseFloat(changes.improvement) >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          Number.parseFloat(changes.improvement) >= 0 ? "bg-green-500" : "bg-red-500",
                        )}
                      />
                      Estimated impact: {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}$
                      {changes.estimatedMonthly - initialCurrentWaterfall.estimatedMonthly}/month (
                      {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                      {changes.improvement}%)
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  {/* Confidence Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Confidence Score</span>
                      {hasManualChanges() ? (
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 text-slate-400">
                            <span>--</span>
                            <AlertCircle className="w-3.5 h-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Confidence score only available for AI-generated suggestions</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="font-medium text-slate-900">87%</span>
                      )}
                    </div>
                    {!hasManualChanges() && (
                      <>
                        <Progress value={87} className="h-2" />
                        <p className="text-xs text-slate-500">AI Optimized • Based on 14 days data</p>
                      </>
                    )}
                    {hasManualChanges() && <p className="text-xs text-slate-500">Manual changes applied</p>}
                  </div>

                  {/* Mini Comparison Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 font-medium text-slate-600">Metric</th>
                          <th className="text-right p-2 font-medium text-slate-600">Current</th>
                          <th className="text-right p-2 font-medium text-slate-600">Optimized</th>
                          <th className="text-right p-2 font-medium text-slate-600">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-100">
                          <td className="p-2 text-slate-700">Est. Monthly Revenue</td>
                          <td className="p-2 text-right text-slate-600">${initialCurrentWaterfall.estimatedMonthly}</td>
                          <td className="p-2 text-right text-slate-900 font-medium">${changes.estimatedMonthly}</td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              Number.parseFloat(changes.improvement) >= 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}$
                            {changes.estimatedMonthly - initialCurrentWaterfall.estimatedMonthly} (
                            {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                            {changes.improvement}%)
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="p-2 text-slate-700">Waterfall Sources</td>
                          <td className="p-2 text-right text-slate-600">{initialCurrentWaterfall.waterfall.length}</td>
                          <td className="p-2 text-right text-slate-900 font-medium">
                            {optimizedWaterfall.filter((s) => s.changeType !== "removed").length}
                          </td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              changes.addedCount - changes.removedCount >= 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {changes.addedCount - changes.removedCount >= 0 ? "+" : ""}
                            {changes.addedCount - changes.removedCount}
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="p-2 text-slate-700">Avg eCPM Floor</td>
                          <td className="p-2 text-right text-slate-600">${currentAvgFloor.toFixed(2)}</td>
                          <td className="p-2 text-right text-slate-900 font-medium">${optimizedAvgFloor.toFixed(2)}</td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              optimizedAvgFloor - currentAvgFloor >= 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {optimizedAvgFloor - currentAvgFloor >= 0 ? "+" : ""}$
                            {(optimizedAvgFloor - currentAvgFloor).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-600">No changes from current configuration</p>
                <p className="text-sm text-slate-500 mt-1">Modify the optimized waterfall or use AI suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between pl-[240px]">
            <div className="flex items-center gap-4">
              {changes.hasChanges && (
                <Button variant="link" className="text-red-600 h-auto p-0" onClick={discardAllChanges}>
                  Discard All Changes
                </Button>
              )}
              {!changes.hasChanges && <span className="text-sm text-slate-500">Make changes to enable actions</span>}
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
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={onRunABTest} disabled={!changes.hasChanges}>
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
