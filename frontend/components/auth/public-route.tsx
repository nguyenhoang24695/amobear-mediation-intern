"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, normalizeAuthState } from "@/lib/auth"

interface PublicRouteProps {
  children: React.ReactNode
}

/**
 * PublicRoute component - Redirects to dashboard if user is already authenticated
 * Usage: Wrap login, forgot-password, reset-password pages
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const router = useRouter()

  useEffect(() => {
    normalizeAuthState()

    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated()) {
      router.push("/")
    }
  }, [router])

  return <>{children}</>
}
