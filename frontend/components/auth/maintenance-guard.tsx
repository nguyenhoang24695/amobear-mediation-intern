"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/enums/user-role"
import { getMaintenanceStatus, type PlatformMaintenanceStatus } from "@/lib/api/platform-maintenance"
import { MaintenanceUpcomingAlert } from "@/components/maintenance/maintenance-upcoming-alert"

const MAINTENANCE_NOTICE_PATH = "/maintenance"
const MAINTENANCE_ADMIN_PATH = "/settings/maintenance"
const POLL_INTERVAL_MS = 30_000
const POLL_INTERVAL_UPCOMING_MS = 10_000

interface MaintenanceGuardProps {
  children: React.ReactNode
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [canRender, setCanRender] = useState(false)
  const [status, setStatus] = useState<PlatformMaintenanceStatus | null>(null)
  const pollDelayRef = useRef(POLL_INTERVAL_MS)

  const applyStatus = useCallback(
    (nextStatus: PlatformMaintenanceStatus) => {
      setStatus(nextStatus)
      pollDelayRef.current = nextStatus.isUpcoming ? POLL_INTERVAL_UPCOMING_MS : POLL_INTERVAL_MS

      if (!nextStatus.enabled || nextStatus.isUpcoming) {
        setCanRender(true)
        return
      }

      if (!nextStatus.isActive) {
        setCanRender(true)
        return
      }

      const user = getCurrentUser()
      const superAdmin = isSuperAdmin(user?.role)

      if (superAdmin) {
        if (pathname !== MAINTENANCE_ADMIN_PATH) {
          router.replace(MAINTENANCE_ADMIN_PATH)
          setCanRender(false)
        } else {
          setCanRender(true)
        }
        return
      }

      if (pathname !== MAINTENANCE_NOTICE_PATH) {
        router.replace(MAINTENANCE_NOTICE_PATH)
        setCanRender(false)
      } else {
        setCanRender(true)
      }
    },
    [pathname, router],
  )

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const checkMaintenance = async () => {
      try {
        const nextStatus = await getMaintenanceStatus()
        if (cancelled) return
        applyStatus(nextStatus)
      } catch {
        if (!cancelled) setCanRender(true)
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }

    const schedulePoll = () => {
      timeoutId = setTimeout(async () => {
        await checkMaintenance()
        if (!cancelled) schedulePoll()
      }, pollDelayRef.current)
    }

    setIsChecking(true)
    checkMaintenance().then(() => {
      if (!cancelled) schedulePoll()
    })

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [applyStatus])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Checking system status...</p>
        </div>
      </div>
    )
  }

  if (!canRender) {
    return null
  }

  return (
    <>
      {status?.isUpcoming && <MaintenanceUpcomingAlert status={status} />}
      {children}
    </>
  )
}
