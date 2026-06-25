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
import type { InsightContextTemplate } from "@/types/api"

const CONTEXT_TYPES = [
  "game-design",
  "monetization",
  "user-flow",
  "geo-strategy",
  "query-context",
  "custom",
] as const

export function EditContextTemplateModal({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InsightContextTemplate | null
  onSave: (body: Record<string, unknown>) => void | Promise<void>
}) {
  const isEdit = !!template
  const [name, setName] = useState("")
  const [contextType, setContextType] = useState<string>("custom")
  const [defaultTitle, setDefaultTitle] = useState("")
  const [body, setBody] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!open) return
    if (template) {
      setName(template.name)
      setContextType(template.contextType || "custom")
      setDefaultTitle(template.defaultTitle)
      setBody(template.body)
      setDescription(template.description ?? "")
      setSortOrder(template.sortOrder)
      setIsActive(template.isActive)
    } else {
      setName("")
      setContextType("custom")
      setDefaultTitle("")
      setBody("")
      setDescription("")
      setSortOrder(100)
      setIsActive(true)
    }
  }, [template, open])

  const submit = () => {
    if (!name.trim() || !defaultTitle.trim()) return
    void onSave({
      name: name.trim(),
      contextType,
      defaultTitle: defaultTitle.trim(),
      body: body.trim(),
      description: description.trim() || null,
      sortOrder,
      isActive,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa mẫu context" : "Thêm mẫu context"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tên mẫu (thư viện)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Monetization — hybrid" />
          </div>
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select value={contextType} onValueChange={setContextType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tiêu đề mặc định khi áp dụng vào app</Label>
            <Input value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mô tả ngắn</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nội dung (body)</Label>
            <Textarea rows={8} className="font-mono text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Đang bật</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" className="bg-primary hover:bg-primary/90" onClick={submit}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
