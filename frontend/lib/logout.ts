import { authApi } from "@/lib/api/services"
import { clearAuthSessionData, getRefreshToken } from "@/lib/auth"

export interface LogoutResult {
  apiFailed: boolean
}

export async function logoutUser(logoutAllDevices: boolean = false): Promise<LogoutResult> {
  let apiFailed = false

  try {
    if (logoutAllDevices) {
      await authApi.logoutAll()
    } else {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    }
  } catch {
    apiFailed = true
  } finally {
    clearAuthSessionData()
  }

  return { apiFailed }
}
