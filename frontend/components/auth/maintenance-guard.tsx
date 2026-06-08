"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/enums/user-role"
import { getMaintenanceStatus } from "@/lib/api/platform-maintenance"

const MAINTENANCE_NOTICE_PATH = "/maintenance"
const MAINTENANCE_ADMIN_PATH = "/settings/maintenance"
const POLL_INTERVAL_MS = 30_000

interface MaintenanceGuardProps {
  children: React.ReactNode
}

export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkMaintenance = async () => {
      try {
        const status = await getMaintenanceStatus()
        if (cancelled) return

        if (!status.enabled) {
          setCanRender(true)
          setIsChecking(false)
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
        } else {
          if (pathname !== MAINTENANCE_NOTICE_PATH) {
            router.replace(MAINTENANCE_NOTICE_PATH)
            setCanRender(false)
          } else {
            setCanRender(true)
          }
        }
      } catch {
        if (!cancelled) {
          setCanRender(true)
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false)
        }
      }
    }

    setIsChecking(true)
    checkMaintenance()

    const intervalId = setInterval(checkMaintenance, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [pathname, router])

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

  return <>{children}</>
}
