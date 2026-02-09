// Authentication utilities
// Helper functions for managing authentication state

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  role: string
  organization?: {
    id: string
    name: string
    slug: string
    logoUrl?: string
  }
  teams?: Array<{
    id: string
    name: string
    role: string
  }>
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refreshToken')
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr) as AuthUser
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/**
 * Store authentication data
 */
export function setAuthData(accessToken: string, refreshToken: string, user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))
}

/**
 * Clear authentication data
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('rememberMe')
}

/**
 * Check if "Remember Me" is enabled
 */
export function isRememberMeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('rememberMe') === 'true'
}

/**
 * Get user initials from user data
 */
export function getUserInitials(user: AuthUser | null): string {
  if (!user) return "U"
  
  if (user.fullName) {
    const parts = user.fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
  }
  
  if (user.firstName && user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase()
  }
  
  if (user.firstName) {
    return user.firstName[0].toUpperCase()
  }
  
  if (user.email) {
    return user.email[0].toUpperCase()
  }
  
  return "U"
}

/**
 * Get user display name from user data
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "User"
  
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return "User"
}