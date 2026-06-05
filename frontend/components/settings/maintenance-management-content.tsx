"use client"

import { useCallback, useEffect, useState } from "react"
import { Construction, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  getAdminMaintenanceStatus,
  setMaintenanceEnabled,
  type PlatformMaintenanceStatus,
} from "@/lib/api/platform-maintenance"

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MaintenanceManagementContent() {
  const { toast } = useToast()
  const [status, setStatus] = useState<PlatformMaintenanceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const data = await getAdminMaintenanceStatus()
      setStatus(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải trạng thái bảo trì"
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const applyEnabled = async (enabled: boolean) => {
    setIsSaving(true)
    try {
      const data = await setMaintenanceEnabled(enabled)
      setStatus(data)
      toast({
        title: enabled ? "Đã bật chế độ bảo trì" : "Đã tắt chế độ bảo trì",
        description: enabled
          ? "Người dùng không phải super_admin sẽ bị chuyển hướng về trang thông báo."
          : "Hệ thống hoạt động bình thường.",
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật trạng thái"
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
      setConfirmEnableOpen(false)
    }
  }

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setConfirmEnableOpen(true)
    } else {
      applyEnabled(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Quản lý Bảo trì</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bật chế độ bảo trì để chuyển hướng người dùng trong khi nâng cấp hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Construction className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Chế độ Bảo trì</CardTitle>
              <CardDescription>
                Khi bật, user không phải super_admin sẽ thấy trang thông báo bảo trì (~10 phút).
              </CardDescription>
            </div>
            <Badge variant={status?.enabled ? "destructive" : "secondary"}>
              {status?.enabled ? "ĐANG BẬT" : "TẮT"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="maintenance-toggle" className="text-base font-medium">
                Bật chế độ Bảo trì
              </Label>
              <p className="text-sm text-slate-500">
                Super admin vẫn truy cập được trang này để tắt khi hoàn tất.
              </p>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={status?.enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bắt đầu bảo trì</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.enabledAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dự kiến hoàn thành</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.estimatedEndAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cập nhật lần cuối</p>
              <p className="mt-1 font-medium">{formatDateTime(status?.updatedAt ?? null)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Người cập nhật</p>
              <p className="mt-1 font-medium">{status?.updatedByEmail ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmEnableOpen} onOpenChange={setConfirmEnableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bật chế độ Bảo trì?</AlertDialogTitle>
            <AlertDialogDescription>
              Tất cả người dùng (trừ super_admin) sẽ bị chuyển hướng về trang thông báo bảo trì.
              Thời gian dự kiến hoàn thành trong khoảng 10 phút kể từ lúc bật.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault()
                applyEnabled(true)
              }}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bật bảo trì"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
