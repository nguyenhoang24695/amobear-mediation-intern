"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Construction, Loader2, LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Logo } from "@/components/shared/logo"
import { clearAuthSessionData } from "@/lib/auth"
import { getMaintenanceStatus, type PlatformMaintenanceStatus } from "@/lib/api/platform-maintenance"

const POLL_INTERVAL_MS = 30_000

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

export function MaintenanceNoticeContent() {
  const router = useRouter()
  const [status, setStatus] = useState<PlatformMaintenanceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadStatus = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true)
    try {
      const data = await getMaintenanceStatus()
      setStatus(data)
      if (!data.enabled) {
        router.replace("/")
      }
    } catch {
      // Keep showing last known state
    } finally {
      setIsLoading(false)
      if (showRefreshSpinner) setIsRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadStatus()
    const intervalId = setInterval(() => loadStatus(), POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [loadStatus])

  const handleLogout = () => {
    clearAuthSessionData()
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Construction className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Hệ thống đang bảo trì</h1>
            <p className="mt-2 text-sm text-slate-600">
              Chúng tôi đang nâng cấp hệ thống. Vui lòng quay lại sau.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-slate-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Thời gian dự kiến hoàn thành
                </p>
                <p className="mt-1 text-base font-medium text-slate-900">
                  {formatDateTime(status?.estimatedEndAt ?? null)}
                </p>
              </div>
              {status?.enabledAt && (
                <p className="text-xs text-slate-500 text-center">
                  Bảo trì bắt đầu lúc {formatDateTime(status.enabledAt)}
                </p>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => loadStatus(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Thử lại
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
