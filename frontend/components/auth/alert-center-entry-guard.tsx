"use client"

import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

/** Cho phép vào Alert Center khi có View Alerts hoặc quyền My Alerts (rule PRIVATE). */
export function AlertCenterEntryGuard({ children }: { children: React.ReactNode }) {
  const ok =
    hasScreenFunction("s-alerts", "view") || hasScreenFunction("s-alerts", "setting-my-alerts")
  if (!ok) {
    return <NoPermissionView />
  }
  return <>{children}</>
}
