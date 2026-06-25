"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { InsightTemplate } from "@/types/api"
import {
  Brain,
  ChevronRight,
  Copy,
  Edit2,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react"
import { CreateEditTemplateModal } from "./ai-insight-templates/create-edit-template-modal"
import { GlobalInsightSettingsCard } from "./ai-insight-templates/global-insight-settings-card"
import { TemplatePreviewDialog } from "./ai-insight-templates/template-preview-dialog"
import { unpackDescription } from "./ai-insight-templates/category-description"
import { InsightContextTemplatesTabContent } from "./insight-context-templates-tab-content"

const iconByCategory: Record<string, string> = {
  Puzzle: "🧩",
  "AI App": "🤖",
  Video: "📹",
  Casual: "🎮",
  Utility: "⚙️",
  Generic: "📊",
  Custom: "✨",
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Hôm nay"
  if (diffDays === 1) return "Hôm qua"
  if (diffDays < 7) return `${diffDays} ngày trước`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`
  return `${Math.floor(diffDays / 30)} tháng trước`
}

function toUpsertBody(t: InsightTemplate): Record<string, unknown> {
  return {
    name: t.name,
    description: t.description ?? null,
    isDefault: t.isDefault,
    globalAiInstructions: t.globalAiInstructions ?? "",
    preferredProvider: t.preferredProvider ?? null,
    maxAppsPerBatch: t.maxAppsPerBatch,
    parallelDegree: t.parallelDegree,
    sections: t.sections.map((s) => ({
      sectionKey: s.sectionKey,
      title: s.title,
      metrics: s.metrics,
      comparisonPeriods: s.comparisonPeriods,
      aiInstruction: s.aiInstruction,
      audience: s.audience,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      anomalyThresholds: s.anomalyThresholds ?? null,
    })),
  }
}

export function InsightTemplatesPageContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const canManage = hasScreenFunction("s-insight-settings", "manage-templates")
  const canContextLibrary = canManage || hasScreenFunction("s-apps", "configure-insight")
  const [mainTab, setMainTab] = useState<"sections" | "context">(
    tabParam === "context" ? "context" : "sections",
  )
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<InsightTemplate[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<InsightTemplate | null>(null)
  const [previewing, setPreviewing] = useState<InsightTemplate | null>(null)

  const load = useCallback(async () => {
    if (!canManage) return
    setLoading(true)
    try {
      const list = await insightApi.listTemplates()
      setTemplates(list)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được templates", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [canManage, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (tabParam === "context") setMainTab("context")
  }, [tabParam])

  useEffect(() => {
    if (!canManage && canContextLibrary) setMainTab("context")
  }, [canManage, canContextLibrary])

  const defaultTemplate = useMemo(
    () => templates.find((t) => t.isDefault) ?? templates[0] ?? null,
    [templates],
  )

  const handleSetDefault = async (t: InsightTemplate) => {
    try {
      const full = await insightApi.getTemplate(t.id)
      await insightApi.updateTemplate(t.id, toUpsertBody({ ...full, isDefault: true }))
      toast({ title: "Đã đặt template mặc định", description: full.name })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Thất bại", variant: "destructive" })
    }
  }

  const handleDuplicate = async (t: InsightTemplate) => {
    try {
      const full = await insightApi.getTemplate(t.id)
      await insightApi.createTemplate({
        ...toUpsertBody({
          ...full,
          name: `${full.name} (bản sao)`,
          isDefault: false,
        }),
      })
      toast({ title: "Đã nhân bản template" })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Nhân bản thất bại", variant: "destructive" })
    }
  }

  if (!canContextLibrary) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn không có quyền truy cập AI Insight templates hoặc kho context.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1920px] mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/apps" className="hover:text-foreground">
          Apps
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">AI Insight Templates</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          AI Insight
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cấu trúc insight theo loại app và kho mẫu context áp dụng cho từng app.
        </p>
      </div>

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as "sections" | "context")}
        className="w-full gap-6"
      >
        <TabsList className={`grid w-full max-w-md grid-cols-1 sm:max-w-lg ${canManage ? "sm:grid-cols-2" : ""}`}>
          {canManage ? (
            <TabsTrigger value="sections" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Insight templates
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="context" className="gap-2">
            <Brain className="h-4 w-4" />
            Kho context AI
          </TabsTrigger>
        </TabsList>

        {canManage ? (
          <TabsContent value="sections" className="mt-0 flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end">
              <Button
                className="bg-primary hover:bg-primary/90 shrink-0 sm:ml-auto"
                onClick={() => {
                  setEditing(null)
                  setShowCreate(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo template
              </Button>
            </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải…
        </div>
      ) : templates.length === 0 ? (
        <>
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <Sparkles className="w-4 h-4 text-primary absolute translate-x-5 -translate-y-3" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Chưa có template</h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                Tạo template đầu tiên hoặc đảm bảo API đã seed template mặc định (EnsureDefaultsAsync).
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setEditing(null)
                  setShowCreate(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo template
              </Button>
            </CardContent>
          </Card>
          <GlobalInsightSettingsCard defaultTemplate={defaultTemplate} onSaved={() => void load()} />
        </>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {templates.map((t) => {
            const { category, body } = unpackDescription(t.description ?? "")
            const cat = category || "Custom"
            const emoji = iconByCategory[cat] ?? "📊"
            return (
              <Card key={t.id} className="min-h-[200px] hover:shadow-md transition-shadow border-border">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground truncate">{t.name}</h3>
                          {t.isDefault ? (
                            <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10 shrink-0">
                              Default
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="shrink-0">
                            {cat}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {body || t.description || "—"}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
                    <span>{t.sections?.length ?? 0} sections</span>
                    <span>•</span>
                    <span>Batch {t.maxAppsPerBatch} · parallel {t.parallelDegree}</span>
                    <span>•</span>
                    <span>Cập nhật {formatRelativeTime(t.updatedAt)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Sửa
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleDuplicate(t)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Nhân bản
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewing(t)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Preview
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void handleSetDefault(t)} disabled={t.isDefault}>
                          <Star className="w-4 h-4 mr-2" />
                          Đặt làm mặc định
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toast({
                              title: "Export",
                              description: "Chưa triển khai — có thể thêm API export JSON sau.",
                            })
                          }
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled
                          className="text-muted-foreground"
                          onClick={() =>
                            toast({ title: "Xóa template", description: "API xóa chưa có — chỉnh qua DB nếu cần." })
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <GlobalInsightSettingsCard defaultTemplate={defaultTemplate} onSaved={() => void load()} />
        </>
      )}

            <CreateEditTemplateModal
              open={showCreate || !!editing}
              onOpenChange={(open) => {
                if (!open) {
                  setShowCreate(false)
                  setEditing(null)
                }
              }}
              template={editing}
              onSuccess={() => void load()}
            />

            <TemplatePreviewDialog
              open={!!previewing}
              onOpenChange={(o) => !o && setPreviewing(null)}
              template={previewing}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="context" className="mt-0">
          <InsightContextTemplatesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
