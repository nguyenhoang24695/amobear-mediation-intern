"use client"

import { AuthGuard } from "./auth-guard"

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * ProtectedRoute component - Redirects to login if user is not authenticated
 * Usage: Wrap any page or layout that requires authentication
 * 
 * This component now uses AuthGuard which:
 * - Checks token in localStorage
 * - Verifies token with API call to /api/v1/auth/me
 * - Prevents infinite loops with sessionStorage flag
 * - Redirects to login if unauthorized
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <AuthGuard>{children}</AuthGuard>
}
