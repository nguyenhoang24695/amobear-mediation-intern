"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Star,
  Eye,
  Download,
  ChevronLeft,
  Users,
  Clock,
  Pin,
  FileCode,
  BookOpen,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface SharedContext {
  id: string
  name: string
  icon: string
  description: string
  author: string
  rating: number
  reviewCount: number
  cloneCount: number
  updatedAt: Date
  focusAreas: string[]
  defaultModel: "claude" | "gemini" | "chatgpt"
  pinnedMetricsCount: number
  savedQueriesCount: number
  kbEntriesCount: number
  isFeatured: boolean
  pinnedMetrics?: { name: string; formula: string }[]
  savedQueries?: string[]
  customInstructions?: string
  reviews?: { author: string; text: string; rating: number }[]
}

const mockSharedContexts: SharedContext[] = [
  {
    id: "1",
    name: "Game Analytics Starter",
    icon: "🎮",
    description: "Template chuẩn cho DA phân tích game data. Bao gồm drop_rate, win_rate, retention metrics và level progression analysis.",
    author: "Nguyen Senior",
    rating: 4.5,
    reviewCount: 8,
    cloneCount: 8,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    focusAreas: ["Level", "Retention"],
    defaultModel: "claude",
    pinnedMetricsCount: 5,
    savedQueriesCount: 3,
    kbEntriesCount: 12,
    isFeatured: false,
    pinnedMetrics: [
      { name: "drop_rate", formula: "drop_users / start_users * 100" },
      { name: "win_rate", formula: "win_count / start_count * 100" },
      { name: "reach_rate", formula: "start_users / total_input * 100" },
      { name: "avg_play_time", formula: "engagement_ms / users / 60000" },
      { name: "retention_d7", formula: "active_d7 / d0_users * 100" },
    ],
    savedQueries: [
      "Top 50 levels by drop rate",
      "Weekly retention cohort",
      "Level progression funnel",
    ],
    customInstructions: "Always include level_id in results. Prefer Vietnamese explanations. Flag levels with drop_rate > 15%.",
    reviews: [
      { author: "Tran B", text: "Rat huu ich cho beginner", rating: 5 },
      { author: "Le C", text: "Can them IAP metrics", rating: 4 },
    ],
  },
  {
    id: "2",
    name: "Ad Revenue Pro",
    icon: "💰",
    description: "Advanced IAA analytics context with eCPM tracking, network comparison, and waterfall analysis patterns.",
    author: "Tran Lead",
    rating: 4.8,
    reviewCount: 12,
    cloneCount: 12,
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    focusAreas: ["IAA"],
    defaultModel: "chatgpt",
    pinnedMetricsCount: 8,
    savedQueriesCount: 5,
    kbEntriesCount: 18,
    isFeatured: true,
    pinnedMetrics: [
      { name: "eCPM", formula: "ad_revenue / impressions * 1000" },
      { name: "fill_rate", formula: "filled_requests / total_requests * 100" },
    ],
    savedQueries: ["eCPM by network", "Revenue trend"],
    customInstructions: "Always break down by ad network. Include ARPDAU calculations.",
  },
  {
    id: "3",
    name: "Retention Deep Dive",
    icon: "📊",
    description: "Comprehensive retention analysis with cohort tracking, lifecycle stages, and churn prediction patterns.",
    author: "Le Analyst",
    rating: 4.2,
    reviewCount: 5,
    cloneCount: 5,
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    focusAreas: ["Retention"],
    defaultModel: "gemini",
    pinnedMetricsCount: 4,
    savedQueriesCount: 6,
    kbEntriesCount: 10,
    isFeatured: false,
  },
  {
    id: "4",
    name: "IAP Revenue Master",
    icon: "💎",
    description: "In-app purchase analytics including bundle analysis, conversion funnels, and ARPPU optimization.",
    author: "Pham Expert",
    rating: 4.6,
    reviewCount: 9,
    cloneCount: 15,
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    focusAreas: ["IAP"],
    defaultModel: "claude",
    pinnedMetricsCount: 6,
    savedQueriesCount: 4,
    kbEntriesCount: 14,
    isFeatured: true,
  },
]

const providerConfig = {
  claude: { color: "bg-amber-500", label: "Claude" },
  gemini: { color: "bg-blue-500", label: "Gemini" },
  chatgpt: { color: "bg-emerald-500", label: "ChatGPT" },
}

const focusColors: Record<string, string> = {
  Level: "bg-purple-100 text-purple-700",
  Retention: "bg-blue-100 text-blue-700",
  IAA: "bg-emerald-100 text-emerald-700",
  IAP: "bg-amber-100 text-amber-700",
}

export function ContextLibraryContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterFocus, setFilterFocus] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [previewContext, setPreviewContext] = useState<SharedContext | null>(null)

  const filteredContexts = mockSharedContexts
    .filter((ctx) => {
      const matchesSearch =
        ctx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ctx.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFocus =
        filterFocus === "all" ||
        ctx.focusAreas.some((f) => f.toLowerCase() === filterFocus.toLowerCase())
      return matchesSearch && matchesFocus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.cloneCount - a.cloneCount
        case "newest":
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        case "rating":
          return b.rating - a.rating
        default:
          return 0
      }
    })

  const formatTimeAgo = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days}d ago`
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Shared Context Library
              </h1>
              <p className="text-sm text-slate-500">
                Browse and clone pre-configured AI contexts from the team
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search contexts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterFocus} onValueChange={setFilterFocus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="level">Level</SelectItem>
              <SelectItem value="iaa">IAA</SelectItem>
              <SelectItem value="iap">IAP</SelectItem>
              <SelectItem value="retention">Retention</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Context Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContexts.map((context) => (
            <Card
              key={context.id}
              className="hover:shadow-lg transition-shadow overflow-hidden"
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{context.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {context.name}
                        </h3>
                        {context.isFeatured && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3 w-3",
                              i < Math.floor(context.rating)
                                ? "fill-amber-400 text-amber-400"
                                : i < context.rating
                                ? "fill-amber-400/50 text-amber-400"
                                : "text-slate-300"
                            )}
                          />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">
                          {context.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Author & Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span>By: {context.author}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {context.cloneCount} clones
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(context.updatedAt)}
                  </span>
                </div>

                {/* Focus Areas & Model */}
                <div className="flex items-center gap-2 mb-3">
                  {context.focusAreas.map((focus) => (
                    <Badge
                      key={focus}
                      className={cn("text-xs", focusColors[focus] || "bg-slate-100 text-slate-700")}
                    >
                      {focus}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        providerConfig[context.defaultModel].color
                      )}
                    />
                    {providerConfig[context.defaultModel].label}
                  </Badge>
                </div>

                {/* Counts */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    {context.pinnedMetricsCount} metrics
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    {context.savedQueriesCount} queries
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {context.kbEntriesCount} KB entries
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {context.description}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewContext(context)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Clone to My Space
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewContext} onOpenChange={() => setPreviewContext(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview: {previewContext?.name}
            </DialogTitle>
          </DialogHeader>
          {previewContext && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Author & Rating */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    By: {previewContext.author}
                  </span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.floor(previewContext.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        )}
                      />
                    ))}
                    <span className="text-sm text-slate-500 ml-1">
                      ({previewContext.reviewCount} reviews)
                    </span>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Scope</h4>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      Focus Areas:{" "}
                      {previewContext.focusAreas.map((f, i) => (
                        <Badge key={f} className={cn("ml-1", focusColors[f])}>
                          {f}
                        </Badge>
                      ))}
                    </p>
                    <div className="flex items-center">
                      <span>Default Model:{" "}</span>
                      <Badge variant="outline" className="ml-1">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full mr-1 inline-block",
                            providerConfig[previewContext.defaultModel].color
                          )}
                        />
                        {providerConfig[previewContext.defaultModel].label}
                      </Badge>
                    </div>
                    <p>Layer: Gold</p>
                  </div>
                </div>

                {/* Pinned Metrics */}
                {previewContext.pinnedMetrics && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Pinned Metrics ({previewContext.pinnedMetrics.length})
                    </h4>
                    <div className="space-y-2">
                      {previewContext.pinnedMetrics.map((metric) => (
                        <div
                          key={metric.name}
                          className="text-sm bg-slate-50 rounded-lg p-2"
                        >
                          <span className="font-medium text-slate-700">
                            {metric.name}
                          </span>
                          <span className="text-slate-500 ml-2">
                            = {metric.formula}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved Queries */}
                {previewContext.savedQueries && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Saved Queries ({previewContext.savedQueries.length})
                    </h4>
                    <ul className="space-y-1">
                      {previewContext.savedQueries.map((query, i) => (
                        <li
                          key={i}
                          className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
                        >
                          {query}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Custom Instructions */}
                {previewContext.customInstructions && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      Custom Instructions
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 italic">
                      &quot;{previewContext.customInstructions}&quot;
                    </p>
                  </div>
                )}

                {/* Reviews */}
                {previewContext.reviews && previewContext.reviews.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Reviews</h4>
                    <div className="space-y-2">
                      {previewContext.reviews.map((review, i) => (
                        <div
                          key={i}
                          className="text-sm bg-slate-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-700">
                              {review.author}:
                            </span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star
                                  key={j}
                                  className={cn(
                                    "h-3 w-3",
                                    j < review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-300"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600">&quot;{review.text}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setPreviewContext(null)}>
              Cancel
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Clone to My Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
