"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Plus, Edit2, Trash2, Sparkles } from "lucide-react"
import { insightApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { InsightTemplate, InsightTemplateSection } from "@/types/api"
import { packDescription, unpackDescription } from "./category-description"
import { createDefaultSections } from "./default-sections"
import { EditSectionModal } from "./edit-section-modal"

type LocalSection = InsightTemplateSection & { _cid: string }

const CATEGORY_OPTIONS = ["Puzzle", "AI App", "Video", "Casual", "Utility", "Generic", "Custom"]

function toLocal(s: InsightTemplateSection, i: number): LocalSection {
  return {
    ...s,
    _cid: `c-${s.id ?? "n"}-${s.sectionKey}-${i}`,
  }
}

function stripLocal(s: LocalSection): InsightTemplateSection {
  const { _cid: _, ...rest } = s
  return rest
}

function buildUpsert(
  name: string,
  descriptionBody: string,
  category: string,
  isDefault: boolean,
  globalAiInstructions: string,
  preferredProvider: string,
  maxAppsPerBatch: number,
  parallelDegree: number,
  sections: LocalSection[],
): Record<string, unknown> {
  return {
    name: name.trim(),
    description: packDescription(category, descriptionBody),
    isDefault,
    globalAiInstructions: globalAiInstructions.trim(),
    preferredProvider: preferredProvider.trim() || null,
    maxAppsPerBatch: Math.min(500, Math.max(1, maxAppsPerBatch)),
    parallelDegree: Math.min(50, Math.max(1, parallelDegree)),
    sections: sections.map((s, idx) => {
      const x = stripLocal(s)
      return {
        sectionKey: x.sectionKey,
        title: x.title,
        metrics: x.metrics,
        comparisonPeriods: x.comparisonPeriods,
        aiInstruction: x.aiInstruction,
        audience: x.audience,
        sortOrder: idx + 1,
        isActive: x.isActive,
        anomalyThresholds: x.anomalyThresholds ?? null,
      }
    }),
  }
}

export function CreateEditTemplateModal({
  open,
  onOpenChange,
  template,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InsightTemplate | null
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const isEdit = !!template
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Custom")
  const [descriptionBody, setDescriptionBody] = useState("")
  const [globalAiInstructions, setGlobalAiInstructions] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [preferredProvider, setPreferredProvider] = useState("")
  const [maxAppsPerBatch, setMaxAppsPerBatch] = useState(50)
  const [parallelDegree, setParallelDegree] = useState(10)
  const [sections, setSections] = useState<LocalSection[]>([])
  const [editing, setEditing] = useState<InsightTemplateSection | null>(null)
  const [editingCid, setEditingCid] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (template) {
      const { category: cat, body } = unpackDescription(template.description ?? "")
      setName(template.name)
      setCategory(cat || "Custom")
      setDescriptionBody(body)
      setGlobalAiInstructions(template.globalAiInstructions ?? "")
      setIsDefault(template.isDefault)
      setPreferredProvider(template.preferredProvider ?? "")
      setMaxAppsPerBatch(template.maxAppsPerBatch)
      setParallelDegree(template.parallelDegree)
      setSections(template.sections.map((s, i) => toLocal(s, i)))
    } else {
      setName("")
      setCategory("Custom")
      setDescriptionBody("")
      setGlobalAiInstructions("")
      setIsDefault(false)
      setPreferredProvider("")
      setMaxAppsPerBatch(50)
      setParallelDegree(10)
      setSections(createDefaultSections().map((s, i) => toLocal(s, i)))
    }
    setEditing(null)
    setEditingCid(null)
    setDraggedIndex(null)
  }, [template, open])

  const handleAddSection = () => {
    const ts = Date.now()
    const newSec: LocalSection = {
      _cid: `c-new-${ts}`,
      sectionKey: `custom_${ts}`,
      title: "Section mới",
      metrics: [],
      comparisonPeriods: ["dod", "7d_avg"],
      aiInstruction: "",
      audience: [],
      sortOrder: sections.length + 1,
      isActive: true,
      anomalyThresholds: null,
    }
    setSections((prev) => [...prev, newSec])
    setEditingCid(newSec._cid)
    setEditing(stripLocal(newSec))
  }

  const openEdit2 = (s: LocalSection) => {
    setEditingCid(s._cid)
    setEditing(stripLocal(s))
  }

  const handleSaveSection2 = (updated: InsightTemplateSection) => {
    if (!editingCid) return
    setSections((prev) =>
      prev.map((s) => (s._cid === editingCid ? { ...updated, _cid: s._cid } : s)),
    )
    setEditing(null)
    setEditingCid(null)
  }

  const handleDeleteSection = (cid: string) => {
    setSections((prev) => prev.filter((s) => s._cid !== cid))
  }

  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    setSections((prev) => {
      const next = [...prev]
      const [removed] = next.splice(draggedIndex, 1)
      next.splice(index, 0, removed)
      return next
    })
    setDraggedIndex(index)
  }
  const handleDragEnd = () => setDraggedIndex(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Nhập tên template", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body = buildUpsert(
        name,
        descriptionBody,
        category,
        isDefault,
        globalAiInstructions,
        preferredProvider,
        maxAppsPerBatch,
        parallelDegree,
        sections,
      )
      if (isEdit && template) {
        await insightApi.updateTemplate(template.id, body)
        toast({ title: "Đã cập nhật template" })
      } else {
        await insightApi.createTemplate(body)
        toast({ title: "Đã tạo template" })
      }
      onOpenChange(false)
      onSuccess()
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu thất bại", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="flex h-[min(92dvh,920px)] w-[min(96vw,1440px)] max-w-[min(96vw,1440px)] sm:max-w-[min(96vw,1440px)] flex-col gap-0 overflow-hidden p-0 rounded-lg"
        >
          <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 pr-14 text-left">
            <DialogTitle>
              {isEdit ? `Sửa template: ${template?.name}` : "Tạo insight template"}
            </DialogTitle>
            <p className="text-sm text-slate-500 font-normal">
              Trái: thông tin + sections (cuộn độc lập). Phải: Global AI instructions (cuộn độc lập).
            </p>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {/* Cột trái */}
            <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="space-y-6 pb-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Thông tin cơ bản</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tên template</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="VD: Puzzle Game Insight"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại / category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả (hiển thị trong danh sách)</Label>
                    <Textarea
                      rows={2}
                      value={descriptionBody}
                      onChange={(e) => setDescriptionBody(e.target.value)}
                      placeholder="Template dùng cho loại app/game nào…"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">Đặt làm template mặc định</p>
                      <p className="text-xs text-slate-500">App chưa gán template sẽ dùng bản default.</p>
                    </div>
                    <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Vận hành</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Provider ưu tiên</Label>
                      <Select
                        value={preferredProvider || "__auto__"}
                        onValueChange={(v) => setPreferredProvider(v === "__auto__" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">Mặc định hệ thống</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max apps / batch</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={maxAppsPerBatch}
                        onChange={(e) => setMaxAppsPerBatch(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Parallel degree</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={parallelDegree}
                        onChange={(e) => setParallelDegree(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-slate-900">
                      Sections <span className="text-slate-500 font-normal">({sections.length})</span>
                    </h3>
                    <p className="text-sm text-slate-500">Kéo thả để đổi thứ tự khi lưu.</p>
                  </div>
                  <div className="space-y-2">
                    {sections.map((s, index) => (
                      <div
                        key={s._cid}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 group ${
                          draggedIndex === index ? "opacity-50" : ""
                        }`}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{s.title}</span>
                        <Switch
                          checked={s.isActive}
                          onCheckedChange={(c) =>
                            setSections((prev) =>
                              prev.map((x) => (x._cid === s._cid ? { ...x, isActive: !!c } : x)),
                            )
                          }
                        />
                        <Button variant="ghost" size="sm" type="button" onClick={() => openEdit2(s)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-red-600 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteSection(s._cid)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 w-full border-dashed border-indigo-200 text-indigo-700"
                    onClick={handleAddSection}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm section
                  </Button>
                </div>
              </div>
            </div>

            {/* Cột phải — Global AI */}
            <div className="flex min-h-0 min-w-0 flex-col bg-slate-50/80">
              <div className="shrink-0 border-b border-slate-200/80 px-4 py-3 sm:px-5">
                <h3 className="font-semibold text-slate-900">Global AI instructions</h3>
                <p className="text-xs text-slate-500">Áp dụng cho mọi section của template (tiếng Việt, rubric, team…).</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                <Textarea
                  className="min-h-[min(420px,50vh)] h-full resize-y font-mono text-sm"
                  value={globalAiInstructions}
                  onChange={(e) => setGlobalAiInstructions(e.target.value)}
                  placeholder="Nhập hướng dẫn toàn cục cho AI…"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 flex-wrap sm:justify-end">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Preview với app mẫu",
                  description: "Dùng Preview trên thẻ template hoặc regenerate trên App detail.",
                })
              }
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gợi ý preview
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? "Đang lưu…" : isEdit ? "Lưu template" : "Tạo template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditSectionModal
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null)
            setEditingCid(null)
          }
        }}
        section={editing}
        onSave={handleSaveSection2}
      />
    </>
  )
}
