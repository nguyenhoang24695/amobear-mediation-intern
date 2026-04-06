"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { helpDocumentsApi } from "@/lib/api/services"
import { Loader2 } from "lucide-react"

type HelpDocUploadModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  onUploaded: () => void
}

export function HelpDocUploadModal({ open, onOpenChange, file, onUploaded }: HelpDocUploadModalProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [publishGlobal, setPublishGlobal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && file) {
      const base = file.name.replace(/\.[^.]+$/, "").trim() || file.name
      setTitle(base.slice(0, 500))
      setPublishGlobal(false)
    }
  }, [open, file])

  async function handleSubmit() {
    if (!file) return
    const t = title.trim()
    if (!t) {
      toast({ title: "Thiếu tiêu đề", description: "Vui lòng nhập tiêu đề tài liệu.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await helpDocumentsApi.upload(file, t, publishGlobal)
      toast({
        title: "Đã tải lên",
        description: publishGlobal ? "Mọi người trong tổ chức có thể xem." : "Chỉ bạn mới xem được (trừ khi bật chia sẻ sau).",
      })
      onOpenChange(false)
      onUploaded()
    } catch (e) {
      toast({
        title: "Lỗi tải lên",
        description: e instanceof Error ? e.message : "Không thể lưu tài liệu.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu tài liệu</DialogTitle>
          <DialogDescription>
            {file ? (
              <>
                File: <span className="font-medium text-slate-800">{file.name}</span> (
                {(file.size / 1024).toFixed(1)} KB)
              </>
            ) : (
              "Chọn file từ máy."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="help-doc-title">Tiêu đề</Label>
            <Input
              id="help-doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên hiển thị trong danh sách"
              maxLength={500}
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="help-doc-global" className="text-slate-900">
                Publish global
              </Label>
              <p className="text-xs text-slate-500 leading-snug">
                Bật: mọi người trong tổ chức đều xem được. Tắt: chỉ bạn (tác giả) xem được.
              </p>
            </div>
            <Switch id="help-doc-global" checked={publishGlobal} onCheckedChange={setPublishGlobal} className="mt-1" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving || !file}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tải lên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
