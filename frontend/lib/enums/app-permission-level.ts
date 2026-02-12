/**
 * App Permission Levels
 * Defines the available permission levels for app access
 */
export enum AppPermissionLevel {
  View = "view",
  Manage = "manage",
  Owner = "owner",
}

/**
 * Array of all permission levels in order (from lowest to highest)
 */
export const APP_PERMISSION_LEVELS: AppPermissionLevel[] = [
  AppPermissionLevel.View,
  AppPermissionLevel.Manage,
  AppPermissionLevel.Owner,
]

/**
 * Array of permission levels that include owner
 */
export const APP_PERMISSION_LEVELS_WITH_OWNER: AppPermissionLevel[] = [
  AppPermissionLevel.View,
  AppPermissionLevel.Manage,
  AppPermissionLevel.Owner,
]

/**
 * Array of permission levels without owner
 */
export const APP_PERMISSION_LEVELS_WITHOUT_OWNER: AppPermissionLevel[] = [
  AppPermissionLevel.View,
  AppPermissionLevel.Manage,
]

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
 * Get display label for permission level
 */
export function getPermissionLevelLabel(level: AppPermissionLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

