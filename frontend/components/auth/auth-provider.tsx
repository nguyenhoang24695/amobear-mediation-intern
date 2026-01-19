"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { isAuthenticated } from "@/lib/auth"
import { ProtectedRoute } from "./protected-route"
import { PublicRoute } from "./public-route"

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
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Small delay to ensure pathname is set
    setIsChecking(false)
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
