"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Settings,
  FlaskConical,
  Pencil,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ChangeType =
  | "waterfall_update"
  | "ab_test_started"
  | "ab_test_completed"
  | "ab_test_cancelled"
  | "source_added"
  | "source_removed"
  | "floor_changed"
  | "status_changed"
  | "sync"
  | "reorder"

interface ChangeEntry {
  id: string
  timestamp: string
  user: {
    name: string
    avatar?: string
    initials: string
  }
  type: ChangeType
  title: string
  description: string
  details?: {
    label: string
    before?: string
    after?: string
  }[]
  relatedTestId?: string
}

// Mock change history data
const changeHistory: ChangeEntry[] = [
  {
    id: "ch-1",
    timestamp: "2026-01-14T10:30:00Z",
    user: { name: "John Doe", initials: "JD" },
    type: "waterfall_update",
    title: "Applied A/B Test Winner (Variant B)",
    description: "Waterfall configuration updated based on A/B test results",
    details: [
      { label: "Test Duration", before: "-", after: "14 days" },
      { label: "eCPM Improvement", before: "$4.52", after: "$4.89 (+8.2%)" },
      { label: "Confidence Level", before: "-", after: "99%" },
    ],
    relatedTestId: "test-2",
  },
  {
    id: "ch-2",
    timestamp: "2026-01-14T10:25:00Z",
    user: { name: "System", initials: "SY" },
    type: "ab_test_completed",
    title: "A/B Test Completed",
    description: "Waterfall Optimization Test #2 finished with Variant B as winner",
    details: [
      { label: "Variant A eCPM", before: "-", after: "$4.52" },
      { label: "Variant B eCPM", before: "-", after: "$4.89" },
      { label: "Statistical Significance", before: "-", after: "99%" },
    ],
    relatedTestId: "test-2",
  },
  {
    id: "ch-3",
    timestamp: "2026-01-10T14:00:00Z",
    user: { name: "John Doe", initials: "JD" },
    type: "ab_test_started",
    title: "A/B Test Started",
    description: "Started Waterfall Optimization Test #3 with 50/50 traffic split",
    details: [
      { label: "Test Name", before: "-", after: "Waterfall Optimization Test #3" },
      { label: "Duration", before: "-", after: "14 days" },
      { label: "Traffic Split", before: "-", after: "50% / 50%" },
    ],
    relatedTestId: "test-3",
  },
  {
    id: "ch-4",
    timestamp: "2026-01-08T09:15:00Z",
    user: { name: "Sarah Chen", initials: "SC" },
    type: "floor_changed",
    title: "eCPM Floor Updated",
    description: "Changed floor price for ironSource waterfall source",
    details: [
      { label: "Source", before: "-", after: "ironSource" },
      { label: "Floor Price", before: "$12.00", after: "$15.00" },
    ],
  },
  {
    id: "ch-5",
    timestamp: "2026-01-07T16:45:00Z",
    user: { name: "John Doe", initials: "JD" },
    type: "source_added",
    title: "Ad Source Added",
    description: "Added Vungle to the waterfall configuration",
    details: [
      { label: "Source", before: "-", after: "Vungle" },
      { label: "Type", before: "-", after: "Waterfall" },
      { label: "Initial Floor", before: "-", after: "$10.00" },
    ],
  },
  {
    id: "ch-6",
    timestamp: "2026-01-05T11:20:00Z",
    user: { name: "Mike Johnson", initials: "MJ" },
    type: "reorder",
    title: "Waterfall Reordered",
    description: "Changed the order of ad sources in the waterfall",
    details: [
      { label: "ironSource", before: "Position 3", after: "Position 2" },
      { label: "Unity Ads", before: "Position 2", after: "Position 3" },
    ],
  },
  {
    id: "ch-7",
    timestamp: "2026-01-03T08:00:00Z",
    user: { name: "System", initials: "SY" },
    type: "sync",
    title: "Synced with AdMob",
    description: "Automatic sync pulled latest configuration from AdMob",
    details: [
      { label: "Sources Synced", before: "-", after: "8" },
      { label: "Changes Detected", before: "-", after: "2" },
    ],
  },
  {
    id: "ch-8",
    timestamp: "2026-01-01T14:30:00Z",
    user: { name: "Sarah Chen", initials: "SC" },
    type: "source_removed",
    title: "Ad Source Removed",
    description: "Removed Chartboost from the waterfall due to low fill rate",
    details: [
      { label: "Source", before: "Chartboost", after: "-" },
      { label: "Reason", before: "-", after: "Fill rate < 10%" },
    ],
  },
  {
    id: "ch-9",
    timestamp: "2025-12-28T10:00:00Z",
    user: { name: "John Doe", initials: "JD" },
    type: "status_changed",
    title: "Source Status Changed",
    description: "Disabled AppLovin bidding source temporarily",
    details: [
      { label: "Source", before: "-", after: "AppLovin" },
      { label: "Status", before: "Active", after: "Inactive" },
    ],
  },
  {
    id: "ch-10",
    timestamp: "2025-12-20T09:00:00Z",
    user: { name: "System", initials: "SY" },
    type: "ab_test_cancelled",
    title: "A/B Test Cancelled",
    description: "Waterfall Optimization Test #1 was manually cancelled",
    details: [
      { label: "Cancelled By", before: "-", after: "John Doe" },
      { label: "Days Run", before: "-", after: "7 of 14" },
      { label: "Reason", before: "-", after: "Early results inconclusive" },
    ],
    relatedTestId: "test-1",
  },
]

const getChangeTypeIcon = (type: ChangeType) => {
  switch (type) {
    case "waterfall_update":
      return <Settings className="w-4 h-4" />
    case "ab_test_started":
    case "ab_test_completed":
    case "ab_test_cancelled":
      return <FlaskConical className="w-4 h-4" />
    case "source_added":
      return <Plus className="w-4 h-4" />
    case "source_removed":
      return <Trash2 className="w-4 h-4" />
    case "floor_changed":
      return <Pencil className="w-4 h-4" />
    case "status_changed":
      return <ArrowUpDown className="w-4 h-4" />
    case "sync":
      return <RotateCcw className="w-4 h-4" />
    case "reorder":
      return <ArrowUpDown className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

const getChangeTypeColor = (type: ChangeType) => {
  switch (type) {
    case "waterfall_update":
      return "bg-blue-100 text-blue-600"
    case "ab_test_started":
      return "bg-purple-100 text-purple-600"
    case "ab_test_completed":
      return "bg-green-100 text-green-600"
    case "ab_test_cancelled":
      return "bg-slate-100 text-slate-600"
    case "source_added":
      return "bg-green-100 text-green-600"
    case "source_removed":
      return "bg-red-100 text-red-600"
    case "floor_changed":
      return "bg-amber-100 text-amber-600"
    case "status_changed":
      return "bg-slate-100 text-slate-600"
    case "sync":
      return "bg-blue-100 text-blue-600"
    case "reorder":
      return "bg-purple-100 text-purple-600"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

const getChangeTypeBadge = (type: ChangeType) => {
  switch (type) {
    case "waterfall_update":
      return { label: "Waterfall Update", className: "bg-blue-100 text-blue-700" }
    case "ab_test_started":
      return { label: "Test Started", className: "bg-purple-100 text-purple-700" }
    case "ab_test_completed":
      return { label: "Test Completed", className: "bg-green-100 text-green-700" }
    case "ab_test_cancelled":
      return { label: "Test Cancelled", className: "bg-slate-100 text-slate-700" }
    case "source_added":
      return { label: "Source Added", className: "bg-green-100 text-green-700" }
    case "source_removed":
      return { label: "Source Removed", className: "bg-red-100 text-red-700" }
    case "floor_changed":
      return { label: "Floor Changed", className: "bg-amber-100 text-amber-700" }
    case "status_changed":
      return { label: "Status Changed", className: "bg-slate-100 text-slate-700" }
    case "sync":
      return { label: "Sync", className: "bg-blue-100 text-blue-700" }
    case "reorder":
      return { label: "Reorder", className: "bg-purple-100 text-purple-700" }
    default:
      return { label: "Change", className: "bg-slate-100 text-slate-700" }
  }
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function ChangeHistoryTab() {
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredHistory =
    filterType === "all"
      ? changeHistory
      : changeHistory.filter((entry) => entry.type === filterType)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">Change History</h2>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-9 bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="waterfall_update">Waterfall Updates</SelectItem>
              <SelectItem value="ab_test_started">A/B Tests Started</SelectItem>
              <SelectItem value="ab_test_completed">A/B Tests Completed</SelectItem>
              <SelectItem value="source_added">Sources Added</SelectItem>
              <SelectItem value="source_removed">Sources Removed</SelectItem>
              <SelectItem value="floor_changed">Floor Changes</SelectItem>
              <SelectItem value="sync">Syncs</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No changes found
              </h3>
              <p className="text-sm text-slate-500">
                Try adjusting your filter to see more results.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistory.map((entry, index) => {
                const badge = getChangeTypeBadge(entry.type)
                const isExpanded = expandedEntries.has(entry.id)

                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline line */}
                    {index < filteredHistory.length - 1 && (
                      <div className="absolute left-[27px] top-14 bottom-0 w-px bg-slate-200" />
                    )}

                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(entry.id)}>
                      <div className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                              getChangeTypeColor(entry.type)
                            )}
                          >
                            {getChangeTypeIcon(entry.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-slate-900">
                                    {entry.title}
                                  </h3>
                                  <Badge className={cn("border-0 text-xs", badge.className)}>
                                    {badge.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 mt-0.5">
                                  {entry.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={entry.user.avatar} />
                                      <AvatarFallback className="text-[10px] bg-slate-100">
                                        {entry.user.initials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{entry.user.name}</span>
                                  </div>
                                  <span>•</span>
                                  <span>{formatDate(entry.timestamp)}</span>
                                  <span>•</span>
                                  <span>{formatTime(entry.timestamp)}</span>
                                </div>
                              </div>

                              {/* Expand button */}
                              {entry.details && entry.details.length > 0 && (
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        <CollapsibleContent>
                          {entry.details && entry.details.length > 0 && (
                            <div className="mt-4 ml-14 p-3 bg-slate-50 rounded-lg">
                              <table className="w-full text-sm">
                                <tbody>
                                  {entry.details.map((detail, idx) => (
                                    <tr key={idx}>
                                      <td className="py-1 pr-4 text-slate-500 font-medium w-40">
                                        {detail.label}
                                      </td>
                                      {detail.before && detail.before !== "-" && (
                                        <td className="py-1 pr-2 text-slate-400 line-through">
                                          {detail.before}
                                        </td>
                                      )}
                                      {detail.before && detail.before !== "-" && (
                                        <td className="py-1 pr-2 text-slate-400">→</td>
                                      )}
                                      <td className="py-1 text-slate-900 font-medium">
                                        {detail.after}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {entry.relatedTestId && (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-blue-600 mt-2 text-xs"
                                >
                                  View related A/B test →
                                </Button>
                              )}
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {filteredHistory.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" className="bg-transparent">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
