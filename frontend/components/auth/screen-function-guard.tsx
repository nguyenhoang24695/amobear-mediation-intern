"use client"

import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

interface ScreenFunctionGuardProps {
  screenKey: string
  functionKey?: string
  functionKeys?: string[]
  children: React.ReactNode
}

/**
 * Guards a view by screen/function permission. Renders NoPermissionView when the user lacks the permission.
 */
export function ScreenFunctionGuard({ screenKey, functionKey, functionKeys, children }: ScreenFunctionGuardProps) {
  const allowedFunctions = functionKeys ?? (functionKey ? [functionKey] : [])
  if (!allowedFunctions.some((key) => hasScreenFunction(screenKey, key))) {
    return <NoPermissionView />
  }
  return <>{children}</>
}
