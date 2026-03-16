'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearAuthSessionData, getAccessToken } from '@/lib/auth'
import { apiClient } from '@/lib/api/client'

/**
 * Hook to check authentication status at the start of each page.
 * Redirects to login if not authenticated or token is invalid.
 */
export function useAuthCheck(options: {
  redirectTo?: string
  checkOnMount?: boolean
} = {}) {
  const { redirectTo = '/login', checkOnMount = true } = options
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (!checkOnMount) {
      setIsChecking(false)
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

        try {
          const response = await apiClient.get<{ success: boolean; data?: any }>('/api/v1/auth/me')

          if (response?.success) {
            setIsValid(true)
          } else {
            clearAuthSessionData()
            router.push(redirectTo)
            return
          }
        } catch (error: any) {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            clearAuthSessionData()
            router.push(redirectTo)
            return
          }

          console.warn('Auth check failed with non-auth error, allowing access:', error)
          setIsValid(true)
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
  }, [router, redirectTo, checkOnMount])

  return {
    isChecking,
    isValid,
    hasChecked,
  }
}
