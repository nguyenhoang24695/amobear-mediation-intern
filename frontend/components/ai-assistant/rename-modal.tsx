"use client"

import { useState, useEffect } from "react"
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

interface RenameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  currentName: string
  onApply: (newName: string) => void | Promise<void>
  placeholder?: string
}

export function RenameModal({
  open,
  onOpenChange,
  title,
  currentName,
  onApply,
  placeholder = "Nhập tên...",
}: RenameModalProps) {
  const [value, setValue] = useState(currentName)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValue(currentName)
  }, [open, currentName])

  const handleApply = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onApply(trimmed)
      onOpenChange(false)
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rename-input">Tên hiện tại</Label>
            <Input
              id="rename-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply()
                if (e.key === "Escape") handleCancel()
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={saving || !value.trim()}>
            {saving ? "Đang lưu..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
