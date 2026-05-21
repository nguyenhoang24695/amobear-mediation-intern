// Authentication utilities
// Helper functions for managing authentication state

import { getRoleDisplayName } from "@/lib/enums/user-role"

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  role: string
  roleName?: string
  /** Direct Message — webhook mặc định khi URL theo tần suất trống */
  slackWebhookUrl?: string
  slackWebhookUrlRealtime?: string
  slackWebhookUrlHourly?: string
  slackWebhookUrlDaily?: string
  /** JSON array: [{ id, name, chatId, messageThreadId? }, ...] */
  telegramDestinationsJson?: string
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
  /** Quyen man hinh/chuc nang theo role: screenKey -> danh sach functionKey */
  rolePermissions?: Record<string, string[]>
}

/** Đồng bộ object từ GET/PUT /api/v1/auth/me vào AuthUser lưu localStorage */
export function authUserFromMeDto(d: {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  role: string
  roleName?: string
  slackWebhookUrl?: string
  slackWebhookUrlRealtime?: string
  slackWebhookUrlHourly?: string
  slackWebhookUrlDaily?: string
  telegramDestinationsJson?: string
  organization?: AuthUser["organization"]
  teams?: AuthUser["teams"]
  rolePermissions?: AuthUser["rolePermissions"]
}): AuthUser {
  const fullName =
    d.fullName?.trim() ||
    [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
    undefined
  return {
    id: d.id,
    email: d.email,
    firstName: d.firstName,
    lastName: d.lastName,
    fullName,
    avatarUrl: d.avatarUrl,
    role: d.role,
    roleName: d.roleName,
    slackWebhookUrl: d.slackWebhookUrl,
    slackWebhookUrlRealtime: d.slackWebhookUrlRealtime,
    slackWebhookUrlHourly: d.slackWebhookUrlHourly,
    slackWebhookUrlDaily: d.slackWebhookUrlDaily,
    telegramDestinationsJson: d.telegramDestinationsJson,
    organization: d.organization,
    teams: d.teams,
    rolePermissions: d.rolePermissions,
  }
}

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"
const USER_KEY = "user"
const REMEMBER_ME_KEY = "rememberMe"
const REMEMBERED_ORGANIZATION_KEY = "rememberedOrganization"
const REMEMBERED_EMAIL_KEY = "rememberedEmail"
const AUTH_REFRESH_AT_KEY = "auth_refresh_at"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
let refreshSessionPromise: Promise<string | null> | null = null

/** Khoang thoi gian (ms) coi la "vua refresh" de tab khac khong goi cung luc. */
export const AUTH_REFRESH_COOLDOWN_MS = 55_000

function getStoredValue(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

function normalizeRefreshTokenStorage(): void {
  if (typeof window === "undefined") return
  if (localStorage.getItem(REMEMBER_ME_KEY) === "true") return

  localStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Normalize legacy auth state after deploy.
 * Old sessions without rememberMe=true are downgraded to access-token-only mode.
 */
export function normalizeAuthState(): void {
  if (typeof window === "undefined") return

  normalizeRefreshTokenStorage()

  if (!getStoredValue(ACCESS_TOKEN_KEY)) {
    localStorage.removeItem(AUTH_REFRESH_AT_KEY)
  }
}

/**
 * Get access token from storage.
 * LocalStorage is the source of truth; sessionStorage is kept as a legacy fallback.
 */
export function getAccessToken(): string | null {
  return getStoredValue(ACCESS_TOKEN_KEY)
}

/**
 * Get refresh token for remembered sessions only.
 */
export function getRefreshToken(): string | null {
  normalizeRefreshTokenStorage()
  return getStoredValue(REFRESH_TOKEN_KEY)
}

/**
 * Read access token expiry (ms, Unix) from JWT payload.exp.
 * Return null when token is missing or cannot be decoded.
 */
export function getAccessTokenExpiryMs(): number | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const payload = JSON.parse(atob(padded))
    const exp = payload?.exp
    if (typeof exp !== "number") return null
    return exp * 1000
  } catch {
    return null
  }
}

/**
 * Refresh only when token is expired or will expire within threshold minutes.
 */
export function shouldRefreshByExpiry(thresholdMinutes: number = 5): boolean {
  const expiryMs = getAccessTokenExpiryMs()
  if (expiryMs === null) return true
  const now = Date.now()
  const thresholdMs = thresholdMinutes * 60 * 1000
  return now >= expiryMs - thresholdMs
}

/**
 * Whether the current browser state can resume an authenticated session.
 * Used by PublicRoute to avoid redirecting away from /login when only
 * an expired access token exists without a refresh token.
 */
export function isAuthenticated(): boolean {
  const accessToken = getAccessToken()
  if (!accessToken) return false

  const expiryMs = getAccessTokenExpiryMs()
  if (expiryMs !== null && Date.now() >= expiryMs) {
    return !!getRefreshToken()
  }

  return true
}

/**
 * Last refresh timestamp to avoid multiple tabs refreshing simultaneously.
 */
export function getLastRefreshAt(): number | null {
  if (typeof window === "undefined") return null
  const s = localStorage.getItem(AUTH_REFRESH_AT_KEY)
  if (s == null) return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

export function setLastRefreshAt(ms: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_REFRESH_AT_KEY, String(ms))
}

/**
 * Refresh the current auth session once across all concurrent callers.
 */
export async function refreshAuthSession(baseUrl: string = API_BASE_URL): Promise<string | null> {
  if (typeof window === "undefined") return null
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      try {
        const refreshUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/auth/refresh`
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })

        if (!refreshRes.ok) {
          return null
        }

        const refreshData = await refreshRes.json()
        if (refreshData.success && refreshData.data?.accessToken && refreshData.data?.user) {
          const u = refreshData.data.user as AuthUser
          setAuthData(
            refreshData.data.accessToken,
            refreshData.data.refreshToken ?? null,
            authUserFromMeDto({
              id: u.id,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              fullName: u.fullName,
              avatarUrl: u.avatarUrl,
              role: u.role,
              roleName: u.roleName,
              slackWebhookUrl: u.slackWebhookUrl,
              slackWebhookUrlRealtime: u.slackWebhookUrlRealtime,
              slackWebhookUrlHourly: u.slackWebhookUrlHourly,
              slackWebhookUrlDaily: u.slackWebhookUrlDaily,
              telegramDestinationsJson: u.telegramDestinationsJson,
              organization: u.organization,
              teams: u.teams,
              rolePermissions: u.rolePermissions,
            }),
          )
          setLastRefreshAt(Date.now())
          return refreshData.data.accessToken as string
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === "Failed to fetch" || (e instanceof TypeError && msg.includes("fetch"))) {
          console.error(
            "Refresh token: không kết nối được API. Kiểm tra: (1) backend đang chạy, (2) NEXT_PUBLIC_API_URL đúng với URL thực tế của API, (3) CORS — thêm origin trình duyệt (vd. http://127.0.0.1:3000) vào Cors:AllowedOrigins hoặc CORS_ALLOWED_ORIGINS, (4) trang HTTPS không gọi API HTTP khác host (mixed content).",
            { attemptedUrl: `${baseUrl.replace(/\/$/, "")}/api/v1/auth/refresh` },
          )
        } else {
          console.error("Refresh token failed", e)
        }
      }

      return null
    })().finally(() => {
      refreshSessionPromise = null
    })
  }

  return refreshSessionPromise
}

/**
 * Get current user from storage.
 */
export function getCurrentUser(): AuthUser | null {
  const userStr = getStoredValue(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr) as AuthUser
  } catch {
    return null
  }
}

/**
 * Kiem tra user co quyen function tren screen khong (theo rolePermissions).
 * super_admin luon co toan quyen.
 */
export function hasScreenFunction(screenKey: string, functionKey: string): boolean {
  const user = getCurrentUser()
  if (!user) return false
  if (user.role?.toLowerCase() === "super_admin") return true
  if (!user.rolePermissions) return false
  return (user.rolePermissions[screenKey] ?? []).includes(functionKey)
}

// --- App Detail tab permissions ------------------------------------------------
//
// Quy uoc:
//   - "view-details"          : shortcut "all-in-one".
//   - "view-details:<suffix>" : quyen per-tab. Tab PG (Ad Units / Mediation Groups) dung suffix *-deprecated;
//     tab Bronze (ad-units-mediation / mediation-groups-mediation) dung view-details:ad-units / :mediation-groups.

/** Function keys on screen s-apps — giu sync voi PermissionScreensConstant backend. */
export const APPS_VIEW_DETAILS_FUNCTIONS = {
  viewDetails: "view-details",
  adUnitsTab: "view-details:ad-units",
  adUnitsTabDeprecated: "view-details:ad-units-deprecated",
  mediationGroupsTab: "view-details:mediation-groups",
  mediationGroupsTabDeprecated: "view-details:mediation-groups-deprecated",
} as const

export const APP_DETAIL_TABS = [
  "overview",
  "ad-units",
  "ad-units-mediation",
  "waterfall-ad-units",
  "mediation-groups",
  "mediation-groups-mediation",
  "performance",
  "ai-insight",
  "insight-config",
  "playbook",
  "settings",
] as const
export type AppDetailTab = (typeof APP_DETAIL_TABS)[number]

const SCREEN_APPS_KEY = "s-apps"
const FN_VIEW_DETAILS_KEY = "view-details"

function appDetailTabPermissionSuffix(tab: AppDetailTab): string {
  switch (tab) {
    case "ad-units":
      return "ad-units-deprecated"
    case "mediation-groups":
      return "mediation-groups-deprecated"
    case "ad-units-mediation":
      return "ad-units"
    case "mediation-groups-mediation":
      return "mediation-groups"
    default:
      return tab
  }
}

function hasAppDetailScreenFunctionForSuffix(suffix: string): boolean {
  const fnKey = `${FN_VIEW_DETAILS_KEY}:${suffix}`
  return (
    hasScreenFunction(SCREEN_APPS_KEY, APPS_VIEW_DETAILS_FUNCTIONS.viewDetails) ||
    hasScreenFunction(SCREEN_APPS_KEY, fnKey)
  )
}

/**
 * Check user co quyen xem 1 tab cu the trong App Detail.
 * Co "view-details" => full tab. Khong thi check "view-details:<suffix>" (xem appDetailTabPermissionSuffix).
 */
export function hasAppDetailTab(tab: AppDetailTab): boolean {
  return hasAppDetailScreenFunctionForSuffix(appDetailTabPermissionSuffix(tab))
}

/**
 * Co vao duoc trang App Detail khong? (it nhat 1 tab duoc phep)
 */
export function canEnterAppDetail(): boolean {
  if (hasScreenFunction(SCREEN_APPS_KEY, APPS_VIEW_DETAILS_FUNCTIONS.viewDetails)) return true
  return APP_DETAIL_TABS.some((t) =>
    hasAppDetailScreenFunctionForSuffix(appDetailTabPermissionSuffix(t)),
  )
}

/**
 * Store auth session data.
 * Access token and user are always kept in localStorage for cross-tab access.
 * Refresh token is stored only when remember-me mode is enabled.
 */
export function setAuthData(accessToken: string, refreshToken: string | null | undefined, user: AuthUser): void {
  if (typeof window === "undefined") return

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

/**
 * Clear only the active auth session.
 * Login preferences remain available for the next login screen.
 */
export function clearAuthSessionData(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(AUTH_REFRESH_AT_KEY)

  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

/**
 * Clear remembered login preferences such as Remember Me, organization and email prefill.
 */
export function clearRememberedLoginPrefs(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem(REMEMBER_ME_KEY)
  localStorage.removeItem(REMEMBERED_ORGANIZATION_KEY)
  localStorage.removeItem(REMEMBERED_EMAIL_KEY)
}

/**
 * Check if "Remember Me" is enabled.
 */
export function isRememberMeEnabled(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(REMEMBER_ME_KEY) === "true"
}

export function setRememberMeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return

  if (enabled) {
    localStorage.setItem(REMEMBER_ME_KEY, "true")
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY)
  }
}

/**
 * Get organization slug saved when "Remember me" was used (for login form pre-fill).
 */
export function getRememberedOrganization(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(REMEMBERED_ORGANIZATION_KEY) ?? ""
}

/**
 * Save organization slug when login succeeds with "Remember me".
 */
export function setRememberedOrganization(slug: string): void {
  if (typeof window === "undefined") return
  if (slug) {
    localStorage.setItem(REMEMBERED_ORGANIZATION_KEY, slug)
  } else {
    localStorage.removeItem(REMEMBERED_ORGANIZATION_KEY)
  }
}

/**
 * Get email saved when "Remember me" was used (for login form pre-fill).
 */
export function getRememberedEmail(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""
}

/**
 * Save email when login succeeds with "Remember me".
 */
export function setRememberedEmail(email: string): void {
  if (typeof window === "undefined") return
  if (email) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  }
}

/**
 * Get user initials from user data.
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
 * Get user display name from user data.
 */
export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "User"

  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return "User"
}

/** Tên hiển thị role: ưu tiên permission_roles.name (roleName), fallback enum cũ. */
export function getUserRoleDisplayName(user: AuthUser | null): string {
  if (!user) return "User"
  const name = user.roleName?.trim()
  if (name) return name
  if (user.role) return getRoleDisplayName(user.role)
  return "User"
}
