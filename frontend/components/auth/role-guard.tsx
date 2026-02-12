"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { UserRole } from "@/lib/enums/user-role"

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: UserRole[]
    fallback?: React.ReactNode
    redirectTo?: string
}

/**
 * RoleGuard component - Checks if user has required role to access a route
 * Usage: Wrap any page that requires specific roles
 * 
 * Example:
 * <RoleGuard allowedRoles={[UserRole.Admin, UserRole.SuperAdmin]}>
 *   <YourProtectedContent />
 * </RoleGuard>
 */
export function RoleGuard({
    children,
    allowedRoles,
    fallback = null,
    redirectTo = "/"
}: RoleGuardProps) {
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(true)
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        const checkRole = () => {
            try {
                const user = getCurrentUser()

                // If no user, redirect (should be caught by AuthGuard first)
                if (!user || !user.role) {
                    router.push(redirectTo)
                    return
                }

                // Check if user's role is in allowed roles
                const hasPermission = allowedRoles.includes(user.role as UserRole)

                if (hasPermission) {
                    setIsAuthorized(true)
                } else {
                    // User doesn't have required role, redirect
                    router.push(redirectTo)
                }
            } catch (error) {
                console.error("Role check error:", error)
                router.push(redirectTo)
            } finally {
                setIsChecking(false)
            }
        }

        checkRole()
    }, [router, allowedRoles, redirectTo])

    // Show fallback while checking
    if (isChecking) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-600">Đang kiểm tra quyền truy cập...</p>
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
