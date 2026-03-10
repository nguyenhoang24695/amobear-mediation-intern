"use client"

import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

interface ScreenFunctionGuardProps {
  screenKey: string
  functionKey: string
  children: React.ReactNode
}

/**
 * Guards a view by screen/function permission. Renders NoPermissionView when the user lacks the permission.
 */
export function ScreenFunctionGuard({ screenKey, functionKey, children }: ScreenFunctionGuardProps) {
  if (!hasScreenFunction(screenKey, functionKey)) {
    return <NoPermissionView />
  }
  return <>{children}</>
}
