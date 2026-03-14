"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api/services"
import {
  getRefreshToken,
  setAuthData,
  setLastRefreshAt,
  getLastRefreshAt,
  shouldRefreshByExpiry,
  AUTH_REFRESH_COOLDOWN_MS,
} from "@/lib/auth"
import type { AuthUser } from "@/lib/auth"
import { ProtectedRoute } from "./protected-route"
import { PublicRoute } from "./public-route"

/** Chu kỳ kiểm tra (ms). Chỉ gọi refresh khi token còn < 5p và không trong cooldown (1 tab refresh). */
const KEEP_ALIVE_CHECK_INTERVAL_MS = 300 * 1000
/** Chỉ refresh khi access token còn dưới số phút này. */
const REFRESH_THRESHOLD_MINUTES = 5

interface AuthProviderProps {
  children: React.ReactNode
}

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
]

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * AuthProvider - Wraps the app and handles authentication routing
 * - Public routes: Wrapped with PublicRoute (redirects if authenticated)
 * - Protected routes: Wrapped with ProtectedRoute (redirects if not authenticated)
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Small delay to ensure pathname is set
    setIsChecking(false)
  }, [pathname])

  // Cross-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If access token is removed in another tab
      if (e.key === 'accessToken' && e.newValue === null) {
        // Clear session storage just in case it was used here
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        sessionStorage.removeItem('user')

        // Redirect to login
        if (!isPublicRoute(pathname)) {
          router.push('/login')
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [pathname, router])

  // Keep-alive: mỗi phút kiểm tra; chỉ refresh khi (1) token còn < 5p, (2) tab đang visible, (3) không trong cooldown (tránh nhiều tab refresh cùng lúc)
  useEffect(() => {
    if (isPublicRoute(pathname)) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const refreshIfNeeded = () => {
      if (document.visibilityState !== 'visible') return
      const refreshToken = getRefreshToken()
      if (!refreshToken) return
      if (!shouldRefreshByExpiry(REFRESH_THRESHOLD_MINUTES)) return

      const now = Date.now()
      const lastAt = getLastRefreshAt()
      if (lastAt != null && now - lastAt < AUTH_REFRESH_COOLDOWN_MS) return

      setLastRefreshAt(now)
      authApi
        .refreshToken(refreshToken)
        .then((res) => {
          if (res?.success && res?.data?.accessToken && res?.data?.refreshToken && res?.data?.user) {
            setAuthData(res.data.accessToken, res.data.refreshToken, res.data.user as AuthUser)
            setLastRefreshAt(Date.now())
          }
        })
        .catch(() => {
          // Lỗi mạng hoặc refresh token hết hạn: không clear auth ở đây, để request tiếp theo xử lý 401
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

  // Check if current route is public
  if (isPublicRoute(pathname)) {
    return <PublicRoute>{children}</PublicRoute>
  }

  // All other routes are protected
  return <ProtectedRoute>{children}</ProtectedRoute>
}
