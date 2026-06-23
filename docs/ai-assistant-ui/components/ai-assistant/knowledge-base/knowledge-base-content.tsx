"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  BookOpen,
  Edit2,
  AlertTriangle,
  Database,
  TrendingUp,
  HelpCircle,
  FileCode,
  Lightbulb,
  Clock,
  Power,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface KnowledgeEntry {
  id: string
  title: string
  category: "schema" | "metric" | "business_rule" | "faq" | "query_pattern" | "best_practice"
  content: string
  tags: string[]
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const mockEntries: KnowledgeEntry[] = [
  {
    id: "1",
    title: "eCPM Calculation",
    category: "metric",
    content: "eCPM = ad_revenue / impressions * 1000\n\nEffective Cost Per Mille - revenue per 1000 impressions.",
    tags: ["iaa", "ecpm", "revenue"],
    priority: 8,
    isActive: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-02-20"),
  },
  {
    id: "2",
    title: "Double-counting Rule",
    category: "business_rule",
    content: "AppLovin MAX includes AdMob data. When calculating total revenue, do not sum both sources directly.",
    tags: ["iaa", "revenue", "admob", "applovin"],
    priority: 10,
    isActive: true,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "3",
    title: "fact_level_performance Schema",
    category: "schema",
    content: "Gold layer table containing pre-calculated level metrics.\n\nColumns: level_id, drop_rate, win_rate, start_users, end_users, event_date",
    tags: ["gold", "level", "performance"],
    priority: 7,
    isActive: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-15"),
  },
  {
    id: "4",
    title: "Retention Cohort Query Pattern",
    category: "query_pattern",
    content: "Use DATE_DIFF for retention calculations. Always partition by install_date for performance.",
    tags: ["retention", "cohort", "pattern"],
    priority: 6,
    isActive: true,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-28"),
  },
  {
    id: "5",
    title: "Why is drop_rate different from churn_rate?",
    category: "faq",
    content: "drop_rate is level-specific (users who fail/quit a level), while churn_rate is app-wide (users who stop playing entirely).",
    tags: ["drop_rate", "churn", "faq"],
    priority: 5,
    isActive: true,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20"),
  },
]

const categories = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "schema", label: "Schema", icon: Database },
  { id: "metric", label: "Metric", icon: TrendingUp },
  { id: "business_rule", label: "Rules", icon: AlertTriangle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "query_pattern", label: "Query Patterns", icon: FileCode },
  { id: "best_practice", label: "Best Practices", icon: Lightbulb },
]

const categoryConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  schema: { color: "text-blue-600", bgColor: "bg-blue-100", label: "Schema" },
  metric: { color: "text-emerald-600", bgColor: "bg-emerald-100", label: "Metric" },
  business_rule: { color: "text-amber-600", bgColor: "bg-amber-100", label: "Business Rule" },
  faq: { color: "text-purple-600", bgColor: "bg-purple-100", label: "FAQ" },
  query_pattern: { color: "text-cyan-600", bgColor: "bg-cyan-100", label: "Query Pattern" },
  best_practice: { color: "text-pink-600", bgColor: "bg-pink-100", label: "Best Practice" },
}

export function KnowledgeBaseContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)

  const filteredEntries = mockEntries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory =
      selectedCategory === "all" || entry.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const reviewQueueCount = mockEntries.filter((e) => !e.isActive).length || 3

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
              <h1 className="text-2xl font-semibold text-slate-900">Knowledge Base</h1>
              <p className="text-sm text-slate-500">
                Manage AI context entries for better SQL generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Categories Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    selectedCategory === cat.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              ))}
              <div className="border-t border-slate-200 my-2" />
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Review Queue
                </span>
                <Badge variant="secondary" className="text-xs">
                  {reviewQueueCount}
                </Badge>
              </button>
            </nav>
          </div>

          {/* Entries List */}
          <div className="flex-1">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-900">{entry.title}</h3>
                            <Badge
                              className={cn(
                                "text-xs",
                                categoryConfig[entry.category].bgColor,
                                categoryConfig[entry.category].color
                              )}
                            >
                              {categoryConfig[entry.category].label}
                            </Badge>
                            <span className="text-xs text-slate-400">P:{entry.priority}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={entry.isActive ? "text-amber-600" : "text-emerald-600"}
                          >
                            <Power className="h-4 w-4 mr-1" />
                            {entry.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 text-sm text-slate-500">
              1-{filteredEntries.length} of {mockEntries.length} entries
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingEntry(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Entry title..."
                  defaultValue={editingEntry?.title}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue={editingEntry?.category || "metric"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schema">Schema</SelectItem>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="business_rule">Business Rule</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="query_pattern">Query Pattern</SelectItem>
                    <SelectItem value="best_practice">Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Entry content..."
                className="min-h-[150px] font-mono text-sm"
                defaultValue={editingEntry?.content}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="iaa, ecpm, revenue"
                  defaultValue={editingEntry?.tags.join(", ")}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={editingEntry?.priority || 5}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setEditingEntry(null)
              }}
            >
              Cancel
            </Button>
            <Button>
              {editingEntry ? "Save Changes" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
