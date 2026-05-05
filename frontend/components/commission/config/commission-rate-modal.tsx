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
import { Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { commissionApi } from "@/lib/api/services"
import type { CreateCommissionRateRequest } from "@/types/api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const EMPTY: CreateCommissionRateRequest = {
  username: "",
  appId: "",
  commissionRate: null,
  effectiveDate: "",
  expiryDate: null,
}

export function CommissionRateModal({ open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<CreateCommissionRateRequest>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
    }
  }, [open])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.username.trim()) e.username = "Username không được để trống"
    if (!form.appId.trim()) e.appId = "App ID không được để trống"
    if (!form.effectiveDate) e.effectiveDate = "Ngày hiệu lực không được để trống"
    if (
      form.commissionRate !== null &&
      form.commissionRate !== undefined &&
      (form.commissionRate < 0 || form.commissionRate > 100)
    ) e.commissionRate = "Tỷ lệ phải trong khoảng 0–100"
    if (form.expiryDate && form.effectiveDate && form.expiryDate < form.effectiveDate)
      e.expiryDate = "Ngày kết thúc phải >= ngày hiệu lực"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await commissionApi.createRate(form)
      toast({ title: "Đã tạo commission rate" })
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Không thể tạo"
      toast({ title: "Lỗi", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof CreateCommissionRateRequest>(
    key: K,
    value: CreateCommissionRateRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm Commission Rate</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Username (email) *</Label>
            <Input
              placeholder="user@amobear.com"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
            {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>App ID *</Label>
            <Input
              placeholder="ca-app-pub-xxx~yyy"
              value={form.appId}
              onChange={(e) => set("appId", e.target.value)}
            />
            {errors.appId && <p className="text-xs text-red-500">{errors.appId}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>
              Tỷ lệ hoa hồng (%) — để trống = NULL (không hưởng)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="Ví dụ: 15.5"
              value={form.commissionRate ?? ""}
              onChange={(e) =>
                set("commissionRate", e.target.value === "" ? null : parseFloat(e.target.value))
              }
            />
            {errors.commissionRate && (
              <p className="text-xs text-red-500">{errors.commissionRate}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Ngày hiệu lực *</Label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
              />
              {errors.effectiveDate && (
                <p className="text-xs text-red-500">{errors.effectiveDate}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Ngày kết thúc (để trống = vô hạn)</Label>
              <Input
                type="date"
                value={form.expiryDate ?? ""}
                onChange={(e) => set("expiryDate", e.target.value || null)}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-500">{errors.expiryDate}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
