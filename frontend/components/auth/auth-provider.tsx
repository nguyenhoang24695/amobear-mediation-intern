"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  AUTH_REFRESH_COOLDOWN_MS,
  clearAuthSessionData,
  getLastRefreshAt,
  getRefreshToken,
  normalizeAuthState,
  setLastRefreshAt,
  refreshAuthSession,
  shouldRefreshByExpiry,
} from "@/lib/auth"
import { ProtectedRoute } from "./protected-route"
import { PublicRoute } from "./public-route"

/** Check cadence (ms). Only refresh when token has < 5m left and no other tab refreshed recently. */
const KEEP_ALIVE_CHECK_INTERVAL_MS = 300 * 1000
/** Only refresh when access token has less than this many minutes left. */
const REFRESH_THRESHOLD_MINUTES = 5

interface AuthProviderProps {
  children: React.ReactNode
}

// Public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept-invitation",
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))
}

/**
 * AuthProvider - Wraps the app and handles authentication routing
 * - Public routes: Wrapped with PublicRoute
 * - Protected routes: Wrapped with ProtectedRoute
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    normalizeAuthState()
  }, [])

  useEffect(() => {
    setIsChecking(false)
  }, [pathname])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken" && e.newValue === null) {
        clearAuthSessionData()

        if (!isPublicRoute(pathname)) {
          router.push("/login")
        }
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange)
      return () => window.removeEventListener("storage", handleStorageChange)
    }
  }, [pathname, router])

  useEffect(() => {
    if (isPublicRoute(pathname)) return
    if (typeof window === "undefined" || typeof document === "undefined") return

    const refreshIfNeeded = () => {
      if (document.visibilityState !== "visible") return

      const refreshToken = getRefreshToken()
      if (!refreshToken) return
      if (!shouldRefreshByExpiry(REFRESH_THRESHOLD_MINUTES)) return

      const now = Date.now()
      const lastAt = getLastRefreshAt()
      if (lastAt != null && now - lastAt < AUTH_REFRESH_COOLDOWN_MS) return

      setLastRefreshAt(now)
      refreshAuthSession()
        .catch(() => {
          // Network errors or expired refresh token are handled by the next 401 flow.
        })
    }

    refreshIfNeeded()
    const intervalId = setInterval(refreshIfNeeded, KEEP_ALIVE_CHECK_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [pathname])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isPublicRoute(pathname)) {
    return <PublicRoute>{children}</PublicRoute>
  }

  return <ProtectedRoute>{children}</ProtectedRoute>
}
