import { getCurrentUser } from "@/lib/auth"

const ALERT_VIEWED_IDS_STORAGE_PREFIX = "alert_viewed_ids"
export const ALERT_NOTIFICATION_STATE_CHANGED = "alert-notification-state-changed"

function parseViewedAlertIds(raw: string | null): number[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  } catch {
    return []
  }
}

export function getViewedAlertIdsStorageKey(userId?: string | null): string {
  return `${ALERT_VIEWED_IDS_STORAGE_PREFIX}:${userId ?? "anonymous"}`
}

function resolveUserId(userId?: string | null): string | null {
  if (userId !== undefined) return userId
  return getCurrentUser()?.id ?? null
}

export function getViewedAlertIds(userId?: string | null): Set<number> {
  if (typeof window === "undefined") {
    return new Set<number>()
  }

  const storageKey = getViewedAlertIdsStorageKey(resolveUserId(userId))
  return new Set(parseViewedAlertIds(window.localStorage.getItem(storageKey)))
}

// Keep viewed state per browser/user until the backend exposes a persisted read state.
export function markAlertsViewed(alertIds: number[], userId?: string | null): void {
  if (typeof window === "undefined" || alertIds.length === 0) {
    return
  }

  const storageKey = getViewedAlertIdsStorageKey(resolveUserId(userId))
  const nextIds = getViewedAlertIds(userId)
  let changed = false

  for (const alertId of alertIds) {
    const normalizedId = Number(alertId)
    if (!Number.isInteger(normalizedId) || normalizedId <= 0 || nextIds.has(normalizedId)) {
      continue
    }

    nextIds.add(normalizedId)
    changed = true
  }

  if (!changed) {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify([...nextIds]))
  window.dispatchEvent(new Event(ALERT_NOTIFICATION_STATE_CHANGED))
}

export function formatAlertBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count)
}
