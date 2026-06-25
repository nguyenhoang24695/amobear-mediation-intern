"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useToast } from "@/hooks/use-toast"
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
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  aiAssistantApi,
  type KnowledgeBaseEntry,
  type CreateKnowledgeBaseRequest,
} from "@/lib/api/ai-assistant"

const categories = [
  { id: "all", label: "All", icon: BookOpen },
  { id: "schema", label: "Schema", icon: Database },
  { id: "rules", label: "Rules", icon: AlertTriangle },
  { id: "metric", label: "Metric", icon: TrendingUp },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "query_pattern", label: "Query Patterns", icon: FileCode },
  { id: "best_practice", label: "Best Practices", icon: Lightbulb },
]

const rulesStyle = { color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-500/10", label: "Rules" } as const

const categoryConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  schema: { color: "text-primary", bgColor: "bg-primary/10", label: "Schema" },
  metric: { color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-500/10", label: "Metric" },
  rules: { ...rulesStyle },
  business_rule: { ...rulesStyle },
  faq: { color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-500/10", label: "FAQ" },
  query_pattern: { color: "text-cyan-700 dark:text-cyan-300", bgColor: "bg-cyan-500/10", label: "Query Pattern" },
  best_practice: { color: "text-pink-700 dark:text-pink-300", bgColor: "bg-pink-500/10", label: "Best Practice" },
}

/** Map legacy DB value business_rule → form/API slug rules */
function normalizeKnowledgeBaseCategoryForForm(category: string): string {
  const c = category.toLowerCase()
  return c === "business_rule" ? "rules" : c
}

interface FormState {
  title: string
  category: string
  content: string
  tags: string
  focusAreas: string
  priority: number
}

const defaultFormState: FormState = {
  title: "",
  category: "metric",
  content: "",
  tags: "",
  focusAreas: "",
  priority: 5,
}

export function KnowledgeBaseContent() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [showReviewQueue, setShowReviewQueue] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | boolean | undefined> = {}
      if (selectedCategory !== "all" && !showReviewQueue) {
        params.category = selectedCategory
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      if (showReviewQueue) {
        params.needsReview = true
      }
      const data = await aiAssistantApi.getKnowledgeBase(params as Parameters<typeof aiAssistantApi.getKnowledgeBase>[0])
      setEntries(data)
    } catch (error) {
      console.error("Failed to fetch knowledge base:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải Knowledge Base",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchQuery, showReviewQueue, toast])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const reviewQueueCount = entries.filter((e) => e.isUserSubmitted && !e.isReviewed).length

  const handleOpenAdd = () => {
    setFormState(defaultFormState)
    setEditingEntry(null)
    setShowAddDialog(true)
  }

  const handleOpenEdit = (entry: KnowledgeBaseEntry) => {
    setFormState({
      title: entry.title,
      category: normalizeKnowledgeBaseCategoryForForm(entry.category),
      content: entry.content,
      tags: entry.tags.join(", "),
      focusAreas: entry.focusAreas.join(", "),
      priority: entry.priority,
    })
    setEditingEntry(entry)
    setShowAddDialog(true)
  }

  const handleCloseDialog = () => {
    setShowAddDialog(false)
    setEditingEntry(null)
    setFormState(defaultFormState)
  }

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.content.trim()) {
      toast({
        title: "Lỗi",
        description: "Title và Content là bắt buộc",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const request: CreateKnowledgeBaseRequest = {
        title: formState.title.trim(),
        category: formState.category,
        content: formState.content.trim(),
        tags: formState.tags.split(",").map((t) => t.trim()).filter(Boolean),
        focusAreas: formState.focusAreas.split(",").map((f) => f.trim()).filter(Boolean),
        priority: formState.priority,
      }

      if (editingEntry) {
        await aiAssistantApi.updateKnowledgeBaseEntry(editingEntry.id, request)
        toast({
          title: "Đã cập nhật",
          description: `Entry "${formState.title}" đã được cập nhật`,
        })
      } else {
        await aiAssistantApi.createKnowledgeBaseEntry(request)
        toast({
          title: "Đã tạo",
          description: `Entry "${formState.title}" đã được thêm`,
        })
      }

      handleCloseDialog()
      fetchEntries()
    } catch (error) {
      console.error("Failed to save entry:", error)
      toast({
        title: "Lỗi",
        description: "Không thể lưu entry",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (entry: KnowledgeBaseEntry) => {
    try {
      setTogglingId(entry.id)
      await aiAssistantApi.updateKnowledgeBaseEntry(entry.id, {
        isActive: !entry.isActive,
      })
      toast({
        title: entry.isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt",
        description: `Entry "${entry.title}" đã được ${entry.isActive ? "vô hiệu hóa" : "kích hoạt"}`,
      })
      fetchEntries()
    } catch (error) {
      console.error("Failed to toggle entry:", error)
      toast({
        title: "Lỗi",
        description: "Không thể thay đổi trạng thái",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleReview = async (entry: KnowledgeBaseEntry, approve: boolean) => {
    try {
      setTogglingId(entry.id)
      await aiAssistantApi.reviewKnowledgeBaseEntry(entry.id, approve)
      toast({
        title: approve ? "Đã phê duyệt" : "Đã từ chối",
        description: `Entry "${entry.title}" đã được ${approve ? "phê duyệt" : "từ chối"}`,
      })
      fetchEntries()
    } catch (error) {
      console.error("Failed to review entry:", error)
      toast({
        title: "Lỗi",
        description: "Không thể review entry",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (entry: KnowledgeBaseEntry) => {
    if (!confirm(`Bạn có chắc muốn xóa "${entry.title}"?`)) return

    try {
      setTogglingId(entry.id)
      await aiAssistantApi.deleteKnowledgeBaseEntry(entry.id)
      toast({
        title: "Đã xóa",
        description: `Entry "${entry.title}" đã được xóa`,
      })
      fetchEntries()
    } catch (error) {
      console.error("Failed to delete entry:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa entry",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const filteredEntries = entries

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
              <h1 className="text-2xl font-semibold text-foreground">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">
                Manage AI context entries for better SQL generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleOpenAdd}>
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
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setShowReviewQueue(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    selectedCategory === cat.id && !showReviewQueue
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              ))}
              <div className="my-2 border-t" />
              <button
                onClick={() => setShowReviewQueue(true)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  showReviewQueue
                    ? "bg-amber-500/10 text-amber-700 font-medium dark:text-amber-300"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Review Queue
                </span>
                {reviewQueueCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {reviewQueueCount}
                  </Badge>
                )}
              </button>
            </nav>
          </div>

          {/* Entries List */}
          <div className="flex-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {showReviewQueue
                    ? "Không có entry nào cần review"
                    : searchQuery
                    ? "Không tìm thấy entry nào"
                    : "Chưa có entry nào"}
                </p>
                {!showReviewQueue && !searchQuery && (
                  <Button className="mt-4" onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm entry đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  {filteredEntries.map((entry) => (
                    <Card
                      key={entry.id}
                      className={cn(
                        "bg-card text-card-foreground transition-shadow hover:shadow-md",
                        !entry.isActive && "opacity-60"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-foreground">{entry.title}</h3>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  categoryConfig[entry.category.toLowerCase()]?.bgColor ?? "bg-muted",
                                  categoryConfig[entry.category.toLowerCase()]?.color ?? "text-muted-foreground"
                                )}
                              >
                                {categoryConfig[entry.category.toLowerCase()]?.label ?? entry.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">P:{entry.priority}</span>
                              {!entry.isActive && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Inactive
                                </Badge>
                              )}
                              {entry.isUserSubmitted && !entry.isReviewed && (
                                <Badge className="bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
                                  Pending Review
                                </Badge>
                              )}
                              {entry.tokenCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.tokenCount} tokens
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {entry.focusAreas.map((fa) => (
                                <span
                                  key={fa}
                                  className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                >
                                  {fa}
                                </span>
                              ))}
                            </div>
                            <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {entry.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                            {showReviewQueue && entry.isUserSubmitted && !entry.isReviewed ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600"
                                  onClick={() => handleReview(entry, true)}
                                  disabled={togglingId === entry.id}
                                >
                                  {togglingId === entry.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleReview(entry, false)}
                                  disabled={togglingId === entry.id}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(entry)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(entry)}
                                  disabled={togglingId === entry.id}
                                  className={entry.isActive ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}
                                >
                                  {togglingId === entry.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleDelete(entry)}
                                  disabled={togglingId === entry.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            {!loading && filteredEntries.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                {filteredEntries.length} of {entries.length} entries
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-6">
            <DialogHeader className="shrink-0 pb-4 text-left">
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add New Entry"}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pb-2 pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Entry title..."
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formState.category}
                  onValueChange={(v) => setFormState((s) => ({ ...s, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schema">Schema</SelectItem>
                    <SelectItem value="rules">Rules</SelectItem>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="query_pattern">Query Pattern</SelectItem>
                    <SelectItem value="best_practice">Best Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                placeholder="Entry content..."
                className="field-sizing-fixed min-h-[150px] max-h-[min(55vh,480px)] resize-y overflow-y-auto font-mono text-sm"
                value={formState.content}
                onChange={(e) => setFormState((s) => ({ ...s, content: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="iaa, ecpm, revenue"
                  value={formState.tags}
                  onChange={(e) => setFormState((s) => ({ ...s, tags: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Focus Areas (comma-separated)</Label>
                <Input
                  placeholder="revenue, retention, engagement"
                  value={formState.focusAreas}
                  onChange={(e) => setFormState((s) => ({ ...s, focusAreas: e.target.value }))}
                />
              </div>
            </div>
            <div className="w-32 space-y-2">
              <Label>Priority (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formState.priority}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, priority: parseInt(e.target.value) || 5 }))
                }
              />
            </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingEntry ? (
                "Save Changes"
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
