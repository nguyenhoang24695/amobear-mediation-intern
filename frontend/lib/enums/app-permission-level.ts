/**
 * App Permission Levels (app_permissions.permission_level).
 * Order matches backend enum numeric order for hierarchy semantics.
 */
export enum AppPermissionLevel {
  View = "view",
  Marketing = "marketing",
  Edit = "edit",
  Developer = "developer",
  Manage = "manage",
  Owner = "owner",
}

/** Lowest → highest (excluding owner). */
export const APP_PERMISSION_LEVELS: AppPermissionLevel[] = [
  AppPermissionLevel.View,
  AppPermissionLevel.Marketing,
  AppPermissionLevel.Edit,
  AppPermissionLevel.Developer,
  AppPermissionLevel.Manage,
]

export const APP_PERMISSION_LEVELS_WITH_OWNER: AppPermissionLevel[] = [
  ...APP_PERMISSION_LEVELS,
  AppPermissionLevel.Owner,
]

export const APP_PERMISSION_LEVELS_WITHOUT_OWNER: AppPermissionLevel[] = APP_PERMISSION_LEVELS

/**
 * Check if a string is a valid permission level
 */
export function isValidPermissionLevel(level: string): level is AppPermissionLevel {
  return Object.values(AppPermissionLevel).includes(level as AppPermissionLevel)
}

/**
 * Normalize permission level string to enum value
 * Returns the normalized level or defaults to View
 */
export function normalizePermissionLevel(level: string): AppPermissionLevel {
  if (!level) return AppPermissionLevel.View
  const normalized = level.toLowerCase().trim()
  if (isValidPermissionLevel(normalized)) {
    return normalized
  }
  return AppPermissionLevel.View
}

/**
 * Display label for permission level (supports legacy PascalCase from API)
 */
export function getPermissionLevelLabel(level: string): string {
  const n = level?.toLowerCase().trim() ?? ""
  const map: Record<string, string> = {
    view: "View",
    marketing: "Marketing",
    edit: "Edit",
    developer: "Developer",
    manage: "Manage",
    owner: "Owner",
  }
  if (map[n]) return map[n]
  if (!level) return "View"
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
}
