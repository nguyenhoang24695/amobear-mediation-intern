'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated, getAccessToken, clearAuthData } from '@/lib/auth'
import { apiClient } from '@/lib/api/client'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Component to guard routes and check authentication
 * Prevents infinite API calls by checking auth once on mount
 */
export function AuthGuard({ 
  children, 
  fallback = null,
  redirectTo = '/login' 
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Skip check if already on login page
    if (pathname?.startsWith('/login')) {
      setIsChecking(false)
      setIsAuthorized(true)
      setHasChecked(true)
      return
    }

    const checkAuth = async () => {
      try {
        // First check if token exists
        const token = getAccessToken()
        if (!token) {
          clearAuthData()
          router.push(redirectTo)
          return
        }

        // Verify token with a lightweight API call
        // Use a flag to prevent multiple simultaneous checks
        const checkKey = 'auth_check_in_progress'
        if (sessionStorage.getItem(checkKey)) {
          // Another check is in progress, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100))
          setIsChecking(false)
          setIsAuthorized(true)
          setHasChecked(true)
          return
        }

        sessionStorage.setItem(checkKey, 'true')

        try {
          // Try to call a lightweight authenticated endpoint
          // This endpoint should exist and require auth
          const response = await apiClient.get<{ success: boolean; data?: any }>('/api/v1/auth/me')
          
          if (response?.success) {
            setIsAuthorized(true)
          } else {
            // Response indicates failure
            clearAuthData()
            sessionStorage.removeItem(checkKey)
            router.push(redirectTo)
            return
          }
        } catch (error: any) {
          // If 401 or 403, token is invalid
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            clearAuthData()
            sessionStorage.removeItem(checkKey)
            router.push(redirectTo)
            return
          }
          
          // For other errors (network, etc.), assume token might still be valid
          // Don't redirect on network errors - allow user to continue
          // This prevents redirects on temporary network issues
          console.warn('Auth check failed with non-auth error, allowing access:', error)
          setIsAuthorized(true)
        } finally {
          sessionStorage.removeItem(checkKey)
        }
      } catch (error) {
        // On any unexpected error, clear auth and redirect
        clearAuthData()
        router.push(redirectTo)
      } finally {
        setIsChecking(false)
        setHasChecked(true)
      }
    }

    checkAuth()
  }, [router, pathname, redirectTo])

  // Show fallback while checking
  if (isChecking || !hasChecked) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    )
  }

  // If not authorized, don't render children (redirect is happening)
  if (!isAuthorized) {
    return fallback || null
  }

  return <>{children}</>
}
