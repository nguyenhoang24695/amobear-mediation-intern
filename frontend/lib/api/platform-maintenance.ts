import { apiClient } from "./client"

export type PlatformMaintenanceStatus = {
  enabled: boolean
  enabledAt: string | null
  isActive: boolean
  isUpcoming: boolean
  estimatedEndAt: string | null
  updatedAt: string
  updatedByEmail: string | null
}

export type PlatformMaintenanceHistoryItem = {
  id: number
  startedAt: string
  endedAt: string | null
  estimatedEndAt: string | null
  isActive: boolean
  isScheduled: boolean
  startedByEmail: string | null
  endedByEmail: string | null
}

type MaintenanceResponse = {
  success: boolean
  data: PlatformMaintenanceStatus
}

type MaintenanceHistoryResponse = {
  success: boolean
  data: PlatformMaintenanceHistoryItem[]
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "")

/** Normalize API payload (camelCase or PascalCase) and derive flags from enabledAt. */
export function normalizeMaintenanceStatus(raw: Record<string, unknown>): PlatformMaintenanceStatus {
  const enabled = Boolean(raw.enabled ?? raw.Enabled)
  const enabledAt = (raw.enabledAt ?? raw.EnabledAt ?? null) as string | null
  const now = Date.now()
  const startMs = enabledAt ? new Date(enabledAt).getTime() : null

  const isUpcoming =
    typeof raw.isUpcoming === "boolean"
      ? raw.isUpcoming
      : typeof raw.IsUpcoming === "boolean"
        ? raw.IsUpcoming
        : enabled && startMs != null && now < startMs

  const isActive =
    typeof raw.isActive === "boolean"
      ? raw.isActive
      : typeof raw.IsActive === "boolean"
        ? raw.IsActive
        : enabled && startMs != null && now >= startMs

  return {
    enabled,
    enabledAt,
    isActive,
    isUpcoming,
    estimatedEndAt: (raw.estimatedEndAt ?? raw.EstimatedEndAt ?? null) as string | null,
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? "") as string,
    updatedByEmail: (raw.updatedByEmail ?? raw.UpdatedByEmail ?? null) as string | null,
  }
}

/** Public — no auth required. */
export async function getMaintenanceStatus(): Promise<PlatformMaintenanceStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/platform/maintenance`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch maintenance status: HTTP ${response.status}`)
  }

  const json = (await response.json()) as { success: boolean; data: Record<string, unknown> }
  return normalizeMaintenanceStatus(json.data)
}

export async function getAdminMaintenanceStatus(): Promise<PlatformMaintenanceStatus> {
  const response = await apiClient.get<{ success: boolean; data: Record<string, unknown> }>(
    "/api/v1/admin/platform/maintenance",
  )
  return normalizeMaintenanceStatus(response.data)
}

export async function setMaintenanceEnabled(
  enabled: boolean,
  scheduledStartAt?: string | null,
): Promise<PlatformMaintenanceStatus> {
  const response = await apiClient.put<{ success: boolean; data: Record<string, unknown> }>(
    "/api/v1/admin/platform/maintenance",
    { enabled, scheduledStartAt: scheduledStartAt ?? undefined },
  )
  return normalizeMaintenanceStatus(response.data)
}

export async function getMaintenanceHistory(limit = 50): Promise<PlatformMaintenanceHistoryItem[]> {
  const response = await apiClient.get<MaintenanceHistoryResponse>(
    "/api/v1/admin/platform/maintenance/history",
    { limit },
  )
  return response.data
}

const MAINTENANCE_NOTICE_PATH = "/maintenance"
const MAINTENANCE_ADMIN_PATH = "/settings/maintenance"

/** Post-login redirect when maintenance mode may be active. */
export async function resolvePostLoginPath(role: string | undefined | null): Promise<string> {
  try {
    const status = await getMaintenanceStatus()
    if (!status.isActive) return "/"
    return role === "super_admin" ? MAINTENANCE_ADMIN_PATH : MAINTENANCE_NOTICE_PATH
  } catch {
    return "/"
  }
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}
