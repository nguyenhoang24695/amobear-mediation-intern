import { apiClient } from "./client"

export type PlatformMaintenanceStatus = {
  enabled: boolean
  enabledAt: string | null
  estimatedEndAt: string | null
  updatedAt: string
  updatedByEmail: string | null
}

export type PlatformMaintenanceHistoryItem = {
  id: number
  enabled: boolean
  maintenanceStartedAt: string | null
  estimatedEndAt: string | null
  changedAt: string
  changedByEmail: string | null
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

/** Public — no auth required. */
export async function getMaintenanceStatus(): Promise<PlatformMaintenanceStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/platform/maintenance`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch maintenance status: HTTP ${response.status}`)
  }

  const json = (await response.json()) as MaintenanceResponse
  return json.data
}

export async function getAdminMaintenanceStatus(): Promise<PlatformMaintenanceStatus> {
  const response = await apiClient.get<MaintenanceResponse>("/api/v1/admin/platform/maintenance")
  return response.data
}

export async function setMaintenanceEnabled(enabled: boolean): Promise<PlatformMaintenanceStatus> {
  const response = await apiClient.put<MaintenanceResponse>("/api/v1/admin/platform/maintenance", { enabled })
  return response.data
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
    if (!status.enabled) return "/"
    return role === "super_admin" ? MAINTENANCE_ADMIN_PATH : MAINTENANCE_NOTICE_PATH
  } catch {
    return "/"
  }
}
