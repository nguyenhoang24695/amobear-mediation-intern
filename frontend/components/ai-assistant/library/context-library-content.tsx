"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Search,
  Star,
  Eye,
  Download,
  ChevronLeft,
  Users,
  Clock,
  Pin,
  BookOpen,
  Sparkles,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  Plus,
  Pencil,
  ExternalLink,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { 
  aiAssistantApi, 
  AiContextDto, 
  TemplateStatsDto, 
  PinnedMetricDto,
  CreatePinnedMetricRequest,
  CreateSystemTemplateRequest,
  UpdateSystemTemplateRequest,
} from "@/lib/api/ai-assistant"
import { aiAdminApi, MetricsCatalogDto } from "@/lib/api/ai-admin"
import { getCurrentUser } from "@/lib/auth"

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
  UA: "bg-rose-100 text-rose-700",
  level: "bg-purple-100 text-purple-700",
  retention: "bg-blue-100 text-blue-700",
  iaa: "bg-emerald-100 text-emerald-700",
  iap: "bg-amber-100 text-amber-700",
  ua: "bg-rose-100 text-rose-700",
}

const FOCUS_OPTIONS = ["level", "retention", "iaa", "iap", "ua"]
const ICON_OPTIONS = ["📊", "🎮", "💰", "🛒", "📈", "🔍", "🚀", "📱", "💎", "🎯"]
const COLOR_OPTIONS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280", "#EC4899", "#14B8A6"]

interface TemplateFormData {
  systemContextKey: string
  name: string
  description: string
  icon: string
  color: string
  focusAreas: string[]
  preferredProvider: string
  includeDataContext: boolean
  pinnedMetrics: CreatePinnedMetricRequest[]
}

const defaultFormData: TemplateFormData = {
  systemContextKey: "",
  name: "",
  description: "",
  icon: "📊",
  color: "#3B82F6",
  focusAreas: [],
  preferredProvider: "claude",
  includeDataContext: true,
  pinnedMetrics: [],
}

export function ContextLibraryContent() {
  const router = useRouter()
  const { toast } = useToast()
  const user = getCurrentUser()
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const isSuperAdmin = user?.role === "super_admin"

  const [activeTab, setActiveTab] = useState<"official" | "community" | "my-contexts">("official")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterFocus, setFilterFocus] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [showPending, setShowPending] = useState(false)
  
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<AiContextDto[]>([])
  const [myContexts, setMyContexts] = useState<AiContextDto[]>([])
  const [stats, setStats] = useState<TemplateStatsDto | null>(null)
  const [previewContext, setPreviewContext] = useState<AiContextDto | null>(null)
  const [previewMetrics, setPreviewMetrics] = useState<PinnedMetricDto[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isCloning, setIsCloning] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [contextToDelete, setContextToDelete] = useState<AiContextDto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [metricsCatalog, setMetricsCatalog] = useState<MetricsCatalogDto[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)

  // Create/Edit dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AiContextDto | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData)
  const [isSaving, setIsSaving] = useState(false)

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeTab === "my-contexts") {
        const data = await aiAssistantApi.getContexts()
        setMyContexts(data)
        setTemplates([])
      } else {
        let filter: 'system' | 'community' | 'pending' | undefined
        
        if (activeTab === "official") {
          filter = "system"
        } else if (showPending && isAdmin) {
          filter = "pending"
        } else {
          filter = "community"
        }
        
        const data = await aiAssistantApi.getSharedContexts(
          searchQuery || undefined,
          filter,
          1,
          100
        )
        setTemplates(data)
        setMyContexts([])
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách templates",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchQuery, showPending, isAdmin, toast])

  const loadStats = useCallback(async () => {
    try {
      const data = await aiAssistantApi.getLibraryStats()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handlePreview = async (context: AiContextDto) => {
    setPreviewContext(context)
    setIsLoadingPreview(true)
    try {
      const metrics = await aiAssistantApi.getPinnedMetrics(context.id)
      setPreviewMetrics(metrics)
    } catch (error) {
      console.error("Failed to load preview metrics:", error)
      setPreviewMetrics([])
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleClone = async (contextId: string) => {
    setIsCloning(contextId)
    try {
      const cloned = await aiAssistantApi.cloneContext(contextId)
      toast({
        title: "Thành công",
        description: (
          <div className="flex items-center gap-2">
            <span>Đã clone context &quot;{cloned.name}&quot;</span>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-blue-600"
              onClick={() => setActiveTab("my-contexts")}
            >
              Xem ngay
            </Button>
          </div>
        ),
      })
      setPreviewContext(null)
      loadStats()
      // Refresh my contexts if on that tab
      if (activeTab === "my-contexts") {
        loadTemplates()
      }
    } catch (error) {
      console.error("Failed to clone context:", error)
      toast({
        title: "Lỗi",
        description: "Không thể clone context",
        variant: "destructive"
      })
    } finally {
      setIsCloning(null)
    }
  }

  const handleApprove = async (contextId: string, approved: boolean) => {
    setIsApproving(contextId)
    try {
      await aiAdminApi.approveTemplate(contextId, approved)
      toast({
        title: "Thành công",
        description: approved ? "Đã approve template" : "Đã từ chối template",
      })
      loadTemplates()
      loadStats()
    } catch (error) {
      console.error("Failed to approve template:", error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái template",
        variant: "destructive"
      })
    } finally {
      setIsApproving(null)
    }
  }

  const handleCreateNew = () => {
    setEditingTemplate(null)
    setFormData(defaultFormData)
    setShowCreateDialog(true)
  }

  const handleEdit = async (context: AiContextDto) => {
    setEditingTemplate(context)
    setFormData({
      systemContextKey: context.systemContextKey || "",
      name: context.name,
      description: context.description || "",
      icon: context.icon,
      color: context.color,
      focusAreas: context.focusAreas ?? [],
      preferredProvider: context.preferredProvider,
      includeDataContext: context.includeDataContext || false,
      pinnedMetrics: [],
    })
    setShowCreateDialog(true)
    try {
      const metrics = await aiAssistantApi.getPinnedMetrics(context.id)
      setFormData(prev => ({
        ...prev,
        pinnedMetrics: metrics.map(m => ({
          metricName: m.metricName,
          metricFormula: m.metricFormula,
          description: m.description ?? undefined,
          sourceTable: m.sourceTable ?? undefined,
        }))
      }))
    } catch (error) {
      console.error("Failed to load pinned metrics:", error)
    }
  }

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên template", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      if (editingTemplate) {
        // Update existing
        if (editingTemplate.isSystemTemplate && isSuperAdmin) {
          const request: UpdateSystemTemplateRequest = {
            name: formData.name,
            description: formData.description || undefined,
            icon: formData.icon,
            color: formData.color,
            focusAreas: formData.focusAreas,
            preferredProvider: formData.preferredProvider,
            includeDataContext: formData.includeDataContext,
            pinnedMetrics: formData.pinnedMetrics.length > 0 ? formData.pinnedMetrics : undefined,
          }
          await aiAdminApi.updateSystemTemplate(editingTemplate.id, request)
        } else {
          await aiAssistantApi.updateContext(editingTemplate.id, {
            name: formData.name,
            description: formData.description || undefined,
            icon: formData.icon,
            color: formData.color,
            focusAreas: formData.focusAreas,
            preferredProvider: formData.preferredProvider,
            pinnedMetrics: formData.pinnedMetrics.length > 0 ? formData.pinnedMetrics : undefined,
          })
        }
        toast({ title: "Thành công", description: "Đã cập nhật template" })
      } else {
        // Create new
        if (activeTab === "official" && isSuperAdmin) {
          if (!formData.systemContextKey.trim()) {
            toast({ title: "Lỗi", description: "Vui lòng nhập System Context Key", variant: "destructive" })
            setIsSaving(false)
            return
          }
          const request: CreateSystemTemplateRequest = {
            systemContextKey: formData.systemContextKey,
            name: formData.name,
            description: formData.description || undefined,
            icon: formData.icon,
            color: formData.color,
            focusAreas: formData.focusAreas,
            preferredProvider: formData.preferredProvider,
            includeDataContext: formData.includeDataContext,
            pinnedMetrics: formData.pinnedMetrics.length > 0 ? formData.pinnedMetrics : undefined,
          }
          await aiAdminApi.createSystemTemplate(request)
          toast({ title: "Thành công", description: "Đã tạo Official Template mới" })
        } else {
          // Create personal context then share
          const created = await aiAssistantApi.createContext({
            name: formData.name,
            description: formData.description || undefined,
            icon: formData.icon,
            color: formData.color,
            focusAreas: formData.focusAreas,
            preferredProvider: formData.preferredProvider,
            pinnedMetrics: formData.pinnedMetrics.length > 0 ? formData.pinnedMetrics : undefined,
          })
          // Share to community
          await aiAssistantApi.shareContext(created.id)
          toast({ 
            title: "Thành công", 
            description: "Đã tạo và chia sẻ template lên Community. Template sẽ hiện sau khi được admin duyệt." 
          })
        }
      }
      
      setShowCreateDialog(false)
      loadTemplates()
      loadStats()
    } catch (error: unknown) {
      console.error("Failed to save template:", error)
      const errorMessage = error instanceof Error ? error.message : "Không thể lưu template"
      toast({ title: "Lỗi", description: errorMessage, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFocusArea = (focus: string) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(focus)
        ? prev.focusAreas.filter(f => f !== focus)
        : [...prev.focusAreas, focus]
    }))
  }

  const addPinnedMetric = (metric?: CreatePinnedMetricRequest) => {
    setFormData(prev => ({
      ...prev,
      pinnedMetrics: [...prev.pinnedMetrics, metric ?? { metricName: "", metricFormula: "" }]
    }))
  }

  const updatePinnedMetric = (index: number, field: keyof CreatePinnedMetricRequest, value: string) => {
    setFormData(prev => {
      const next = [...prev.pinnedMetrics]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, pinnedMetrics: next }
    })
  }

  const removePinnedMetric = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pinnedMetrics: prev.pinnedMetrics.filter((_, i) => i !== index)
    }))
  }

  const loadMetricsCatalog = useCallback(async () => {
    setIsLoadingCatalog(true)
    try {
      const list = await aiAdminApi.getMetricsCatalog({ isActive: true })
      setMetricsCatalog(list)
    } catch (error) {
      console.error("Failed to load metrics catalog:", error)
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [])

  useEffect(() => {
    if (!showCreateDialog || !isAdmin || metricsCatalog.length > 0) return
    void loadMetricsCatalog()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMetricsCatalog is stable, deps intentionally fixed size
  }, [showCreateDialog, isAdmin, metricsCatalog.length])

  const displayedContexts = activeTab === "my-contexts" ? myContexts : templates
  
  const filteredContexts = displayedContexts
    .filter((ctx) => {
      const matchesSearch = !searchQuery || 
        ctx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ctx.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case "rating":
          return b.rating - a.rating
        default:
          return 0
      }
    })

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return "Hôm nay"
    if (days === 1) return "Hôm qua"
    return `${days} ngày trước`
  }

  const canEdit = (context: AiContextDto | null) => {
    if (!context) return false
    if (context.isSystemTemplate) {
      return isSuperAdmin
    }
    // Community template - can edit if owner or admin
    return context.sharedBy === user?.id || isAdmin
  }

  const canDelete = (context: AiContextDto | null) => {
    if (!context) return false
    // Official template: chỉ super_admin
    if (context.isSystemTemplate) return isSuperAdmin
    // My context (tab My Contexts): user luôn xóa được context của mình
    if (activeTab === "my-contexts") return true
    // Community template: chủ sở hữu hoặc super_admin
    return context.sharedBy === user?.id || isSuperAdmin
  }

  const handleDeleteClick = (context: AiContextDto) => {
    setContextToDelete(context)
  }

  const handleConfirmDelete = async () => {
    if (!contextToDelete) return
    setIsDeleting(true)
    try {
      if (contextToDelete.isSystemTemplate) {
        await aiAdminApi.deleteSystemTemplate(contextToDelete.id)
        toast({ title: "Đã xóa", description: "Official template đã được xóa." })
      } else {
        await aiAssistantApi.deleteContext(contextToDelete.id)
        toast({ title: "Đã xóa", description: "Context đã được xóa." })
      }
      setContextToDelete(null)
      if (previewContext?.id === contextToDelete.id) setPreviewContext(null)
      loadTemplates()
      loadStats()
    } catch (error) {
      console.error("Failed to delete:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa context.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const renderTemplateCard = (context: AiContextDto) => {
    const provider = context.preferredProvider as keyof typeof providerConfig
    const isMyContext = activeTab === "my-contexts"
    
    return (
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">
                    {context.name}
                  </h3>
                  {context.isSystemTemplate && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Official
                    </Badge>
                  )}
                  {!context.isSystemTemplate && context.isApproved && !isMyContext && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {!context.isSystemTemplate && !context.isApproved && context.isShared && (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {context.includeDataContext && (
                    <Badge variant="outline" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      Data Context
                    </Badge>
                  )}
                  {isMyContext && context.isDefault && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>
                  )}
                </div>
                {!isMyContext && (
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
                      {context.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit & Delete buttons */}
            <div className="flex items-center gap-1">
              {canEdit(context) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(context)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete(context) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteClick(context)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Author & Stats */}
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
            {context.sharedByEmail && !isMyContext && (
              <span>By: {context.sharedByEmail}</span>
            )}
            {context.isSystemTemplate && (
              <span className="text-blue-600 font-medium">By: Amobear Team</span>
            )}
            {!isMyContext && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {context.cloneCount} clones
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(context.updatedAt)}
            </span>
          </div>

          {/* Focus Areas & Model */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {context.focusAreas.map((focus) => (
              <Badge
                key={focus}
                className={cn("text-xs", focusColors[focus] || "bg-slate-100 text-slate-700")}
              >
                {focus}
              </Badge>
            ))}
            {providerConfig[provider] && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    providerConfig[provider].color
                  )}
                />
                {providerConfig[provider].label}
              </Badge>
            )}
          </div>

          {/* Description */}
          {context.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              {context.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview(context)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Chi tiết
            </Button>
            
            {isMyContext ? (
              <Button 
                size="sm"
                onClick={() => router.push(`/ai-assistant?context=${context.id}`)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Sử dụng
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => handleClone(context.id)}
                disabled={isCloning === context.id}
              >
                {isCloning === context.id ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                Clone
              </Button>
            )}
            
            {/* Admin actions for pending templates */}
            {isAdmin && !context.isSystemTemplate && !context.isApproved && context.isShared && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleApprove(context.id, true)}
                  disabled={isApproving === context.id}
                >
                  {isApproving === context.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleApprove(context.id, false)}
                  disabled={isApproving === context.id}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 overflow-hidden px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">
                Context Library
              </h1>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Khám phá và quản lý các context template
              </p>
            </div>
          </div>
          
          {/* Stats */}
          {stats && (
            <div className="-mx-1 flex min-w-0 items-center gap-5 overflow-x-auto px-1 pb-1 text-sm [scrollbar-width:none] lg:mx-0 lg:shrink-0 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
              <div className="shrink-0 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.systemTemplates}</div>
                <div className="text-xs text-muted-foreground">Official</div>
              </div>
              <div className="shrink-0 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.communityApproved}</div>
                <div className="text-xs text-muted-foreground">Community</div>
              </div>
              {isAdmin && stats.communityPending > 0 && (
                <div className="shrink-0 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.communityPending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              )}
              <div className="shrink-0 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.totalClones}</div>
                <div className="text-xs text-muted-foreground">Total Clones</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="w-max bg-muted">
              <TabsTrigger value="official" className="flex shrink-0 items-center gap-2">
                <Shield className="h-4 w-4" />
                Official
                {stats && (
                  <Badge variant="secondary" className="ml-1">{stats.systemTemplates}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="community" className="flex shrink-0 items-center gap-2">
                <Users className="h-4 w-4" />
                Community
                {stats && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.communityApproved + stats.communityPending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="my-contexts" className="flex shrink-0 items-center gap-2">
                <BookOpen className="h-4 w-4" />
                My Contexts
              </TabsTrigger>
            </TabsList>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Pending toggle for admin */}
              {activeTab === "community" && isAdmin && stats && stats.communityPending > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-pending"
                    checked={showPending}
                    onCheckedChange={setShowPending}
                  />
                  <Label htmlFor="show-pending" className="text-sm text-muted-foreground">
                    Pending ({stats.communityPending})
                  </Label>
                </div>
              )}

              {/* Add button */}
              {((activeTab === "official" && isSuperAdmin) || 
                (activeTab === "community") ||
                (activeTab === "my-contexts")) && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  {activeTab === "official" ? "Thêm Official" : "Tạo mới"}
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:flex lg:items-center">
            <div className="relative min-w-0 sm:col-span-2 lg:w-full lg:max-w-md lg:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterFocus} onValueChange={setFilterFocus}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Focus area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="level">Level</SelectItem>
                <SelectItem value="iaa">IAA</SelectItem>
                <SelectItem value="iap">IAP</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="ua">UA</SelectItem>
              </SelectContent>
            </Select>
            {activeTab !== "my-contexts" && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Phổ biến nhất</SelectItem>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="rating">Đánh giá cao</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Content */}
          {["official", "community", "my-contexts"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContexts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {tabValue === "my-contexts" ? (
                    <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  ) : tabValue === "official" ? (
                    <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  ) : (
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  )}
                  <p>
                    {tabValue === "my-contexts" 
                      ? "Bạn chưa có context nào. Clone từ Library hoặc tạo mới!"
                      : tabValue === "community" && showPending
                      ? "Không có template nào đang chờ duyệt"
                      : "Không tìm thấy template nào"}
                  </p>
                  {tabValue === "my-contexts" && (
                    <Button className="mt-4" onClick={() => setActiveTab("official")}>
                      Khám phá Library
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredContexts.map(renderTemplateCard)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewContext} onOpenChange={() => setPreviewContext(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{previewContext?.icon}</span>
              {previewContext?.name}
              {previewContext?.isSystemTemplate && (
                <Badge className="bg-blue-100 text-blue-700 text-xs ml-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Official
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewContext && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Author & Rating */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    {previewContext.isSystemTemplate 
                      ? "By: Amobear Team" 
                      : `By: ${previewContext.sharedByEmail || "You"}`}
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
                      ({previewContext.reviewCount || 0} reviews)
                    </span>
                  </div>
                </div>

                {/* Description */}
                {previewContext.description && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Mô tả</h4>
                    <p className="text-sm text-slate-600">{previewContext.description}</p>
                  </div>
                )}

                {/* Scope */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Scope</h4>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Focus Areas:</span>
                      {previewContext.focusAreas.length > 0 ? previewContext.focusAreas.map((f) => (
                        <Badge key={f} className={cn("text-xs", focusColors[f] || "bg-slate-100 text-slate-700")}>
                          {f}
                        </Badge>
                      )) : <span className="text-slate-400 italic">Không giới hạn</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Default Model:</span>
                      <Badge variant="outline">
                        {providerConfig[previewContext.preferredProvider as keyof typeof providerConfig]?.label || previewContext.preferredProvider}
                      </Badge>
                    </div>
                    {previewContext.includeDataContext && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Database className="h-4 w-4" />
                        <span>Bao gồm System Data Context</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pinned Metrics */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">
                    <Pin className="h-4 w-4 inline mr-1" />
                    Pinned Metrics ({isLoadingPreview ? "..." : previewMetrics.length})
                  </h4>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : previewMetrics.length > 0 ? (
                    <div className="space-y-2">
                      {previewMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="text-sm bg-slate-50 rounded-lg p-2"
                        >
                          <span className="font-medium text-slate-700">
                            {metric.metricName}
                          </span>
                          <span className="text-slate-500 ml-2">
                            = {metric.metricFormula}
                          </span>
                          {metric.description && (
                            <p className="text-xs text-slate-400 mt-1">{metric.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Không có metrics được pin sẵn</p>
                  )}
                </div>

                {/* App IDs */}
                {previewContext.appIds.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">
                      <BookOpen className="h-4 w-4 inline mr-1" />
                      App IDs ({previewContext.appIds.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {previewContext.appIds.map((appId) => (
                        <Badge key={appId} variant="secondary" className="text-xs">
                          {appId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="border-t pt-4">
            {previewContext && canEdit(previewContext) && (
              <Button variant="outline" onClick={() => {
                handleEdit(previewContext)
                setPreviewContext(null)
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
            )}
            {previewContext && canDelete(previewContext) && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  handleDeleteClick(previewContext)
                  setPreviewContext(null)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewContext(null)}>
              Đóng
            </Button>
            {activeTab !== "my-contexts" && (
              <Button 
                onClick={() => previewContext && handleClone(previewContext.id)}
                disabled={isCloning === previewContext?.id}
              >
                {isCloning === previewContext?.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Clone vào Workspace
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!contextToDelete} onOpenChange={(open) => !open && setContextToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa context &quot;{contextToDelete?.name}&quot;?
              {contextToDelete?.isSystemTemplate && (
                <span className="block mt-2 text-amber-600">
                  Đây là Official template. Chỉ super_admin mới có thể xóa.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContextToDelete(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden bg-background border shadow-lg">
          <DialogHeader className="shrink-0 border-b pb-4">
            <DialogTitle>
              {editingTemplate 
                ? `Chỉnh sửa: ${editingTemplate.name}`
                : activeTab === "official" 
                  ? "Tạo Official Template" 
                  : "Tạo Context Template"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "official" 
                ? "Official template sẽ hiển thị cho tất cả người dùng"
                : "Template sẽ được gửi cho admin duyệt trước khi hiển thị"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="space-y-4 pr-3">
            {/* System Context Key - only for creating Official templates */}
            {activeTab === "official" && !editingTemplate && isSuperAdmin && (
              <div className="space-y-2">
                <Label>System Context Key *</Label>
                <Input
                  placeholder="vd: game_analytics_starter"
                  value={formData.systemContextKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemContextKey: e.target.value }))}
                />
                <p className="text-xs text-slate-500">Key duy nhất để định danh template, không có khoảng trắng</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label>Tên template *</Label>
              <Input
                placeholder="vd: Game Analytics Starter"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                placeholder="Mô tả ngắn về template này..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center hover:border-blue-400 transition-colors",
                        formData.icon === icon ? "border-blue-500 bg-blue-50" : "border-slate-200"
                      )}
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Màu sắc</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        formData.color === color ? "border-slate-800 scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="space-y-2">
              <Label>Focus Areas (lĩnh vực tập trung)</Label>
              <p className="text-xs text-slate-500">Chọn các lĩnh vực mà context này tập trung phân tích</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((focus) => (
                  <Badge
                    key={focus}
                    className={cn(
                      "cursor-pointer transition-all",
                      formData.focusAreas.includes(focus)
                        ? focusColors[focus]
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                    onClick={() => toggleFocusArea(focus)}
                  >
                    {focus.toUpperCase()}
                    {formData.focusAreas.includes(focus) && (
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Pinned Metrics — list trong vùng scroll cố định, không tràn ra ngoài */}
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <Label>Pinned Metrics (metrics gắn với context)</Label>
              <p className="text-xs text-slate-500">Các metric sẽ được inject vào prompt khi dùng context này</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addPinnedMetric()}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Thêm thủ công
                </Button>
                {isAdmin && (
                  <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-[240px] justify-between"
                        disabled={isLoadingCatalog || metricsCatalog.length === 0}
                      >
                        {isLoadingCatalog ? "Đang tải catalog..." : "Thêm từ Metrics Catalog"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[360px] p-0"
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <Command className="rounded-lg border-0 shadow-none flex flex-col max-h-[320px]">
                        <CommandInput placeholder="Tìm theo tên hoặc công thức..." />
                        <CommandList className="min-h-0 max-h-[260px] overscroll-contain">
                          <CommandEmpty>Không tìm thấy metric nào.</CommandEmpty>
                          <CommandGroup heading="Chọn metric">
                            {metricsCatalog.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={`${m.displayName} ${m.formula} ${m.metricKey} ${m.description ?? ""}`}
                                onSelect={() => {
                                  addPinnedMetric({
                                    metricName: m.displayName,
                                    metricFormula: m.formulaSql ?? m.formula,
                                    description: m.description ?? undefined,
                                    sourceTable: m.sourceTable ?? undefined,
                                  })
                                  setCatalogOpen(false)
                                }}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{m.displayName}</span>
                                  <span className="text-xs text-muted-foreground truncate">{m.formula}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="max-h-[280px] min-h-[80px] overflow-y-auto overflow-x-hidden rounded-md border bg-background p-2">
                <div className="space-y-2">
                  {formData.pinnedMetrics.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-2">Chưa có metric nào. Thêm thủ công hoặc chọn từ Catalog.</p>
                  ) : (
                    formData.pinnedMetrics.map((pm, index) => (
                      <div key={index} className="flex gap-2 items-start rounded-lg border bg-background p-2 shrink-0">
                        <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                          <Input
                            placeholder="Tên metric"
                            value={pm.metricName}
                            onChange={(e) => updatePinnedMetric(index, "metricName", e.target.value)}
                            className="h-8"
                          />
                          <Input
                            placeholder="Công thức"
                            value={pm.metricFormula}
                            onChange={(e) => updatePinnedMetric(index, "metricFormula", e.target.value)}
                            className="h-8"
                          />
                          <Input
                            placeholder="Mô tả (tùy chọn)"
                            value={pm.description ?? ""}
                            onChange={(e) => updatePinnedMetric(index, "description", e.target.value)}
                            className="h-8 col-span-2"
                          />
                          <Input
                            placeholder="Source table (tùy chọn)"
                            value={pm.sourceTable ?? ""}
                            onChange={(e) => updatePinnedMetric(index, "sourceTable", e.target.value)}
                            className="h-8 col-span-2"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50"
                          onClick={() => removePinnedMetric(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <Label>Default AI Provider</Label>
              <Select 
                value={formData.preferredProvider} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, preferredProvider: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Data Context - only for Official templates */}
            {(activeTab === "official" || editingTemplate?.isSystemTemplate) && isSuperAdmin && (
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <Label>Bao gồm System Data Context</Label>
                  <p className="text-xs text-slate-500">Inject toàn bộ cấu trúc data hệ thống vào prompt</p>
                </div>
                <Switch
                  checked={formData.includeDataContext}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, includeDataContext: v }))}
                />
              </div>
            )}
          </div>
          </ScrollArea>

          <DialogFooter className="shrink-0 border-t bg-background pt-4 mt-0">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Lưu thay đổi" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
