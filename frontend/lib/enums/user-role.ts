/**
 * User Role Enum
 * Matches backend UserRole enum but uses snake_case format as returned by API
 * 
 * Backend enum (C#):
 * - SuperAdmin = 0
 * - Admin = 1
 * - Editor = 2
 * - Viewer = 3
 * 
 * API returns snake_case strings: "super_admin", "admin", "editor", "viewer"
 */
export enum UserRole {
    SuperAdmin = "super_admin",
    Admin = "admin",
    Editor = "editor",
    Viewer = "viewer",
}

/**
 * Check if a role string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole)
}

/**
 * Check if user has admin privileges (Admin or SuperAdmin)
 */
export function isAdmin(role?: string | null): boolean {
    return role === UserRole.Admin || role === UserRole.SuperAdmin
}

/**
 * Check if user has editor privileges or higher
 */
export function canEdit(role?: string | null): boolean {
    return (
        role === UserRole.SuperAdmin ||
        role === UserRole.Admin ||
        role === UserRole.Editor
    )
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: UserRole | string): string {
    switch (role) {
        case UserRole.SuperAdmin:
            return "Super Admin"
        case UserRole.Admin:
            return "Admin"
        case UserRole.Editor:
            return "Editor"
        case UserRole.Viewer:
            return "Viewer"
        default:
            return role
    }
}
