"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { insightApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import type { InsightContextTemplate } from "@/types/api"
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react"
import { EditContextTemplateModal } from "./ai-insight-templates/edit-context-template-modal"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const TYPE_BADGE: Record<string, string> = {
  "game-design": "bg-purple-100 text-purple-800",
  monetization: "bg-green-100 text-green-800",
  "user-flow": "bg-blue-100 text-blue-800",
  "geo-strategy": "bg-amber-100 text-amber-800",
  custom: "bg-slate-100 text-slate-800",
}

export function InsightContextTemplatesTabContent() {
  const { toast } = useToast()
  const canManage = hasScreenFunction("s-insight-settings", "manage-templates")
  const canView = canManage || hasScreenFunction("s-apps", "configure-insight")
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<InsightContextTemplate[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InsightContextTemplate | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      const data = await insightApi.listContextTemplates(canManage && includeInactive)
      setList(data)
    } catch (e) {
      console.error(e)
      toast({ title: "Không tải được kho context", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [canManage, canView, includeInactive, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleSaveModal = async (body: Record<string, unknown>) => {
    try {
      if (editing) {
        await insightApi.updateContextTemplate(editing.id, body)
        toast({ title: "Đã cập nhật mẫu context" })
      } else {
        await insightApi.createContextTemplate(body)
        toast({ title: "Đã tạo mẫu context" })
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Lưu thất bại", variant: "destructive" })
    }
  }

  const handleDelete = async (t: InsightContextTemplate) => {
    if (!confirm(`Xóa mẫu "${t.name}"?`)) return
    try {
      await insightApi.deleteContextTemplate(t.id)
      toast({ title: "Đã xóa" })
      await load()
    } catch (e) {
      console.error(e)
      toast({ title: "Xóa thất bại", variant: "destructive" })
    }
  }

  if (!canView) {
    return <p className="text-sm text-slate-500">Bạn không có quyền xem kho context AI.</p>
  }

  return (
    <div className="flex w-full max-w-[1920px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Kho mẫu App context cho AI</h2>
          <p className="mt-1 text-sm text-slate-600">
            Các khối nội dung có sẵn để áp dụng nhanh trong App detail → Insight config. Catalog mặc định gồm 8 mẫu (doc
            121 + mockup) được tạo khi bảng trống và cập nhật khi chạy migration cơ sở dữ liệu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {canManage ? (
            <>
              <div className="flex items-center gap-2">
                <Switch id="ctx-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
                <Label htmlFor="ctx-inactive" className="text-sm">
                  Hiện cả mẫu đã tắt
                </Label>
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  setEditing(null)
                  setModalOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm mẫu
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </div>
      ) : list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-slate-500">Chưa có mẫu context.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <Card key={t.id} className="border-slate-200">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500">Tiêu đề khi áp dụng: {t.defaultTitle}</p>
                  </div>
                  <Badge className={TYPE_BADGE[t.contextType] ?? TYPE_BADGE.custom}>{t.contextType}</Badge>
                </div>
                {t.description ? <p className="text-sm text-slate-600">{t.description}</p> : null}
                <p className="line-clamp-4 font-mono text-xs text-slate-700">{t.body}</p>
                {!t.isActive ? (
                  <Badge variant="outline" className="text-amber-700">
                    Đã tắt
                  </Badge>
                ) : null}
                {canManage ? (
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(t); setModalOpen(true) }}>
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleDelete(t)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Xóa
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage ? (
        <EditContextTemplateModal
          open={modalOpen}
          onOpenChange={(o) => {
            setModalOpen(o)
            if (!o) setEditing(null)
          }}
          template={editing}
          onSave={handleSaveModal}
        />
      ) : null}
    </div>
  )
}
