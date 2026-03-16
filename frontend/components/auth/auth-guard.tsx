'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { clearAuthSessionData, getAccessToken } from '@/lib/auth'
import { apiClient } from '@/lib/api/client'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Component to guard routes and check authentication.
 * Prevents infinite API calls by checking auth once on mount.
 */
export function AuthGuard({
  children,
  fallback = null,
  redirectTo = '/login',
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (pathname?.startsWith('/login')) {
      setIsChecking(false)
      setIsAuthorized(true)
      setHasChecked(true)
      return
    }

    const checkAuth = async () => {
      try {
        const token = getAccessToken()
        if (!token) {
          clearAuthSessionData()
          router.push(redirectTo)
          return
        }

        const checkKey = 'auth_check_in_progress'
        if (sessionStorage.getItem(checkKey)) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          setIsChecking(false)
          setIsAuthorized(true)
          setHasChecked(true)
          return
        }

        sessionStorage.setItem(checkKey, 'true')

        try {
          const response = await apiClient.get<{ success: boolean; data?: any }>('/api/v1/auth/me')

          if (response?.success) {
            setIsAuthorized(true)
          } else {
            clearAuthSessionData()
            sessionStorage.removeItem(checkKey)
            router.push(redirectTo)
            return
          }
        } catch (error: any) {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            clearAuthSessionData()
            sessionStorage.removeItem(checkKey)
            router.push(redirectTo)
            return
          }

          console.warn('Auth check failed with non-auth error, allowing access:', error)
          setIsAuthorized(true)
        } finally {
          sessionStorage.removeItem(checkKey)
        }
      } catch (error) {
        clearAuthSessionData()
        router.push(redirectTo)
      } finally {
        setIsChecking(false)
        setHasChecked(true)
      }
    }

    checkAuth()
  }, [router, pathname, redirectTo])

  if (isChecking || !hasChecked) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Dang kiem tra xac thuc...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return fallback || null
  }

  return <>{children}</>
}
