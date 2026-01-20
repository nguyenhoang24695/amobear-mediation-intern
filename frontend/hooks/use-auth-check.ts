'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getAccessToken, clearAuthData } from '@/lib/auth'
import { apiClient } from '@/lib/api/client'

/**
 * Hook to check authentication status at the start of each page
 * Redirects to login if not authenticated or token is invalid
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
        // First check if token exists in localStorage
        const token = getAccessToken()
        if (!token) {
          clearAuthData()
          router.push(redirectTo)
          return
        }

        // Verify token by calling a lightweight auth endpoint
        // This prevents infinite loops by checking once
        try {
          // Use a simple endpoint that requires auth (e.g., user profile or a lightweight endpoint)
          // If this fails, token is invalid
          const response = await apiClient.get<{ success: boolean; data?: any }>('/api/v1/auth/me')
          
          if (response?.success) {
            setIsValid(true)
          } else {
            // Response indicates failure
            clearAuthData()
            router.push(redirectTo)
            return
          }
        } catch (error: any) {
          // If 401 or 403, token is invalid
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            clearAuthData()
            router.push(redirectTo)
            return
          }
          
          // For other errors (network, etc.), assume token might still be valid
          // (network errors, etc.) - don't redirect on network issues
          console.warn('Auth check failed with non-auth error, allowing access:', error)
          setIsValid(true)
        }
      } catch (error) {
        // On any error, clear auth and redirect
        clearAuthData()
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
