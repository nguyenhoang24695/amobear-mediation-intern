"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component - Redirects to login if user is not authenticated
 * Usage: Wrap any page or layout that requires authentication
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsChecking(false)

      if (!authenticated) {
        // Redirect to login page
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!isAuth) {
    return null
  }

  return <>{children}</>
}
