"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LayoutList,
  GitBranch,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  MoreHorizontal,
  GripVertical,
  Lightbulb,
  AlertTriangle,
  Pencil,
  Trash2,
  Copy,
  Pause,
  Play,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Network colors
const networkColors: Record<string, string> = {
  "AdMob Bidding": "bg-yellow-400",
  "Meta AN": "bg-blue-600",
  "Unity Ads": "bg-slate-800",
  AppLovin: "bg-red-500",
  ironSource: "bg-purple-600",
  Vungle: "bg-blue-500",
  Chartboost: "bg-green-500",
  Pangle: "bg-cyan-500",
  InMobi: "bg-indigo-500",
  Mintegral: "bg-pink-500",
  Fyber: "bg-orange-500",
  AdColony: "bg-teal-500",
}

// Mock bidding sources
const initialBiddingSources = [
  { id: "b1", name: "AdMob Bidding", type: "Bidding", enabled: true, ecpm: 22.45, fill: 85.2, revenue: 4521.34 },
  { id: "b2", name: "Meta AN", type: "Bidding", enabled: true, ecpm: 19.87, fill: 78.5, revenue: 3245.67 },
  { id: "b3", name: "Unity Ads", type: "Bidding", enabled: true, ecpm: 18.12, fill: 72.3, revenue: 2876.45 },
  { id: "b4", name: "AppLovin", type: "Bidding", enabled: false, ecpm: 15.34, fill: 68.1, revenue: 2134.89 },
]

// Mock waterfall sources
const initialWaterfallSources = [
  { id: "w1", name: "ironSource", ecpmFloor: 15.0, enabled: true, ecpm: 16.78, fill: 65.4, revenue: 1876.54 },
  { id: "w2", name: "Vungle", ecpmFloor: 12.0, enabled: true, ecpm: 13.45, fill: 58.2, revenue: 1543.21 },
  { id: "w3", name: "Chartboost", ecpmFloor: 10.0, enabled: true, ecpm: 11.23, fill: 52.8, revenue: 1234.56 },
  { id: "w4", name: "Pangle", ecpmFloor: 8.0, enabled: true, ecpm: 9.87, fill: 48.5, revenue: 987.65 },
  { id: "w5", name: "InMobi", ecpmFloor: 6.0, enabled: true, ecpm: 7.34, fill: 0, revenue: 0 },
  { id: "w6", name: "Mintegral", ecpmFloor: 4.0, enabled: true, ecpm: 5.67, fill: 42.1, revenue: 654.32 },
  { id: "w7", name: "Fyber", ecpmFloor: 2.0, enabled: false, ecpm: 3.21, fill: 38.7, revenue: 432.1 },
  { id: "w8", name: "AdColony", ecpmFloor: 1.0, enabled: true, ecpm: 2.15, fill: 35.2, revenue: 321.45 },
]

// Optimization suggestions
const optimizationSuggestions = [
  {
    id: "s1",
    message: "Move ironSource up - eCPM ($16.78) is higher than current position floor ($15.00)",
    action: "Apply",
  },
  {
    id: "s2",
    message: "Remove InMobi - 0% fill rate in the last 7 days",
    action: "Apply",
  },
]

type WaterfallSource = (typeof initialWaterfallSources)[0]
type BiddingSource = (typeof initialBiddingSources)[0]

interface Change {
  type: "reorder" | "ecpm" | "status"
  sourceId: string
  sourceName: string
  field?: string
  oldValue?: string | number | boolean
  newValue?: string | number | boolean
  oldPosition?: number
  newPosition?: number
}

export function MediationGroupWaterfallTab() {
  const [viewMode, setViewMode] = useState<"table" | "visual">("table")
  const [autoOptimize, setAutoOptimize] = useState(false)
  const [infoBannerOpen, setInfoBannerOpen] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const [biddingSources, setBiddingSources] = useState<BiddingSource[]>(initialBiddingSources)
  const [waterfallSources, setWaterfallSources] = useState<WaterfallSource[]>(initialWaterfallSources)
  const [changes, setChanges] = useState<Change[]>([])
  const [editingEcpm, setEditingEcpm] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const hasUnsavedChanges = changes.length > 0

  const addChange = (change: Change) => {
    setChanges((prev) => {
      // Remove existing change for same source and type
      const filtered = prev.filter((c) => !(c.sourceId === change.sourceId && c.type === change.type))
      return [...filtered, change]
    })
  }

  const handleBiddingStatusChange = (sourceId: string, enabled: boolean) => {
    setBiddingSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, enabled } : s)))
    const source = biddingSources.find((s) => s.id === sourceId)
    if (source) {
      addChange({
        type: "status",
        sourceId,
        sourceName: source.name,
        field: "enabled",
        oldValue: source.enabled,
        newValue: enabled,
      })
    }
  }

  const handleWaterfallStatusChange = (sourceId: string, enabled: boolean) => {
    setWaterfallSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, enabled } : s)))
    const source = waterfallSources.find((s) => s.id === sourceId)
    if (source) {
      addChange({
        type: "status",
        sourceId,
        sourceName: source.name,
        field: "enabled",
        oldValue: source.enabled,
        newValue: enabled,
      })
    }
  }

  const handleEcpmFloorChange = (sourceId: string, newFloor: number) => {
    const source = waterfallSources.find((s) => s.id === sourceId)
    if (source) {
      setWaterfallSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, ecpmFloor: newFloor } : s)))
      addChange({
        type: "ecpm",
        sourceId,
        sourceName: source.name,
        field: "ecpmFloor",
        oldValue: source.ecpmFloor,
        newValue: newFloor,
      })
    }
    setEditingEcpm(null)
  }

  const handleDragStart = (e: React.DragEvent, sourceId: string) => {
    setDraggedItem(sourceId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null)
      return
    }

    const oldIndex = waterfallSources.findIndex((s) => s.id === draggedItem)
    const newIndex = waterfallSources.findIndex((s) => s.id === targetId)

    if (oldIndex !== -1 && newIndex !== -1) {
      const source = waterfallSources[oldIndex]
      const newSources = [...waterfallSources]
      newSources.splice(oldIndex, 1)
      newSources.splice(newIndex, 0, source)
      setWaterfallSources(newSources)

      addChange({
        type: "reorder",
        sourceId: draggedItem,
        sourceName: source.name,
        oldPosition: oldIndex + 1,
        newPosition: newIndex + 1,
      })
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const moveItem = (sourceId: string, direction: "up" | "down") => {
    const index = waterfallSources.findIndex((s) => s.id === sourceId)
    if (index === -1) return
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === waterfallSources.length - 1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    const source = waterfallSources[index]
    const newSources = [...waterfallSources]
    newSources.splice(index, 1)
    newSources.splice(newIndex, 0, source)
    setWaterfallSources(newSources)

    addChange({
      type: "reorder",
      sourceId,
      sourceName: source.name,
      oldPosition: index + 1,
      newPosition: newIndex + 1,
    })
  }

  const discardChanges = () => {
    setBiddingSources(initialBiddingSources)
    setWaterfallSources(initialWaterfallSources)
    setChanges([])
  }

  const saveChanges = () => {
    // In real app, this would call an API
    setChanges([])
    setSaveDialogOpen(false)
  }

  const activeBiddingCount = biddingSources.filter((s) => s.enabled).length
  const activeWaterfallCount = waterfallSources.filter((s) => s.enabled).length

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Ad Sources Configuration</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                  viewMode === "table" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <LayoutList className="w-4 h-4" />
                Table View
              </button>
              <button
                onClick={() => setViewMode("visual")}
                className={cn(
                  "px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors",
                  viewMode === "visual" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <GitBranch className="w-4 h-4" />
                Visual Flow
              </button>
            </div>

            {/* Auto-optimize Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={autoOptimize} onCheckedChange={setAutoOptimize} />
              <span className="text-sm text-slate-600">Auto-optimize</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    When enabled, the system will automatically reorder waterfall sources based on real-time eCPM
                    performance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <Badge className="bg-amber-100 text-amber-700 border-0 gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {changes.length} unsaved change{changes.length > 1 ? "s" : ""}
              </Badge>
            )}

            {/* Action Buttons */}
            {hasUnsavedChanges && (
              <>
                <Button variant="outline" className="h-9 text-sm bg-transparent" onClick={discardChanges}>
                  Discard Changes
                </Button>
                <Button className="h-9 text-sm bg-blue-600 hover:bg-blue-700" onClick={() => setSaveDialogOpen(true)}>
                  Save & Apply
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Info Banner */}
        {infoBannerOpen && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                <strong>Bidding sources</strong> compete simultaneously in real-time. <strong>Waterfall sources</strong>{" "}
                are called in order, each with an eCPM floor.
              </p>
            </div>
            <button onClick={() => setInfoBannerOpen(false)} className="text-blue-600 hover:text-blue-800">
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        )}

        {!infoBannerOpen && (
          <button
            onClick={() => setInfoBannerOpen(true)}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 w-fit"
          >
            <Info className="w-4 h-4" />
            Show info about bidding and waterfall
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Bidding Sources Section */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-900">Bidding Sources</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {activeBiddingCount} active
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-sm bg-transparent">
                <Plus className="w-4 h-4" />
                Add Bidding Source
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr className="text-xs text-slate-500 font-medium">
                    <th className="px-4 py-3 text-left min-w-[200px]">Ad Source</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">7D eCPM</th>
                    <th className="px-4 py-3 text-right">7D Fill</th>
                    <th className="px-4 py-3 text-right">7D Revenue</th>
                    <th className="px-4 py-3 text-right w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {biddingSources.map((source) => (
                    <tr
                      key={source.id}
                      className={cn("hover:bg-slate-50 transition-colors", !source.enabled && "opacity-50")}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold",
                              networkColors[source.name] || "bg-slate-400",
                            )}
                          >
                            {source.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{source.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-700 border-0">Bidding</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={(checked) => handleBiddingStatusChange(source.id, checked)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">${source.ecpm.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-slate-600">{source.fill.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-900">
                          $
                          {source.revenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Waterfall Sources Section */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-900">Waterfall Sources</CardTitle>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  {activeWaterfallCount} active
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-sm bg-transparent">
                <Plus className="w-4 h-4" />
                Add Waterfall Source
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr className="text-xs text-slate-500 font-medium">
                    <th className="px-2 py-3 text-left w-10"></th>
                    <th className="px-2 py-3 text-center w-10">#</th>
                    <th className="px-4 py-3 text-left min-w-[200px]">Ad Source</th>
                    <th className="px-4 py-3 text-left min-w-[140px]">eCPM Floor</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">7D eCPM</th>
                    <th className="px-4 py-3 text-right">7D Fill</th>
                    <th className="px-4 py-3 text-right">7D Revenue</th>
                    <th className="px-4 py-3 text-right w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waterfallSources.map((source, index) => {
                    const hasFloorChange = changes.some((c) => c.sourceId === source.id && c.type === "ecpm")
                    const hasStatusChange = changes.some((c) => c.sourceId === source.id && c.type === "status")
                    const hasReorderChange = changes.some((c) => c.sourceId === source.id && c.type === "reorder")
                    const hasChange = hasFloorChange || hasStatusChange || hasReorderChange

                    return (
                      <tr
                        key={source.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, source.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, source.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "hover:bg-slate-50 transition-colors cursor-move",
                          !source.enabled && "opacity-50",
                          draggedItem === source.id && "opacity-30 bg-blue-50",
                          hasChange && "bg-amber-50 hover:bg-amber-50",
                        )}
                      >
                        <td className="px-2 py-3">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-sm font-medium text-slate-500">{index + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold",
                                networkColors[source.name] || "bg-slate-400",
                              )}
                            >
                              {source.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{source.name}</span>
                            {source.fill === 0 && source.enabled && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>0% fill rate in the last 7 days</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {editingEcpm === source.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-slate-500">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={source.ecpmFloor}
                                className={cn("h-8 w-24 text-sm", hasFloorChange && "border-amber-400 bg-amber-50")}
                                onBlur={(e) => {
                                  const value = Number.parseFloat(e.target.value)
                                  if (!isNaN(value) && value >= 0) {
                                    handleEcpmFloorChange(source.id, value)
                                  } else {
                                    setEditingEcpm(null)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const value = Number.parseFloat((e.target as HTMLInputElement).value)
                                    if (!isNaN(value) && value >= 0) {
                                      handleEcpmFloorChange(source.id, value)
                                    } else {
                                      setEditingEcpm(null)
                                    }
                                  }
                                  if (e.key === "Escape") {
                                    setEditingEcpm(null)
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingEcpm(source.id)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors group",
                                hasFloorChange && "bg-amber-100 text-amber-700",
                              )}
                            >
                              <span className="text-sm font-medium">${source.ecpmFloor.toFixed(2)}</span>
                              <Pencil className="w-3 h-3 text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={source.enabled}
                            onCheckedChange={(checked) => handleWaterfallStatusChange(source.id, checked)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">${source.ecpm.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn("text-sm", source.fill === 0 ? "text-red-600 font-medium" : "text-slate-600")}
                          >
                            {source.fill.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-slate-900">
                            $
                            {source.revenue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => moveItem(source.id, "up")}
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-4 h-4" />
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => moveItem(source.id, "down")}
                                disabled={index === waterfallSources.length - 1}
                              >
                                <ArrowDown className="w-4 h-4" />
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2">
                                <Pencil className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                {source.enabled ? (
                                  <>
                                    <Pause className="w-4 h-4" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-red-600">
                                <Trash2 className="w-4 h-4" />
                                Remove
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
          </CardContent>
        </Card>

        {/* Optimization Suggestions Card */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-amber-900">Optimization Suggestions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {optimizationSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200"
                >
                  <p className="text-sm text-slate-700">{suggestion.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-sm bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {suggestion.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Confirmation Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply Waterfall Changes?</DialogTitle>
              <DialogDescription>Review your changes before applying them.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm font-medium text-slate-900">Summary of changes:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {changes.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-slate-50 rounded-md">
                    <span className="text-slate-400">•</span>
                    <div>
                      <span className="font-medium text-slate-900">{change.sourceName}</span>
                      {change.type === "reorder" && (
                        <span className="text-slate-600">
                          : moved from position {change.oldPosition} to {change.newPosition}
                        </span>
                      )}
                      {change.type === "ecpm" && (
                        <span className="text-slate-600">
                          : eCPM floor changed from ${Number(change.oldValue).toFixed(2)} to $
                          {Number(change.newValue).toFixed(2)}
                        </span>
                      )}
                      {change.type === "status" && (
                        <span className="text-slate-600">: {change.newValue ? "enabled" : "disabled"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">Changes will be applied to AdMob immediately.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveChanges}>
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
