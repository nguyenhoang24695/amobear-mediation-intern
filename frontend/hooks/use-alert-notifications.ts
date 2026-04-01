"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import {
  ALERT_NOTIFICATION_STATE_CHANGED,
  getViewedAlertIds,
  getViewedAlertIdsStorageKey,
  markAlertsViewed as persistViewedAlerts,
} from "@/lib/alert-notification-state"
import { alertsApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"

const OPEN_ALERTS_PAGE_SIZE = 200

type OpenAlertsResponse = Awaited<ReturnType<typeof alertsApi.getOpenAlerts>>
interface UseAlertNotificationsOptions {
  inAppOnly?: boolean
}

function parseJsonArray(input?: string | null): string[] {
  if (!input) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

async function loadAllOpenAlerts(inAppOnly: boolean): Promise<OpenAlertsResponse> {
  const firstPage = await alertsApi.getOpenAlerts({ page: 1, pageSize: OPEN_ALERTS_PAGE_SIZE })

  if (firstPage.TotalPages <= 1) {
    const filteredData = inAppOnly
      ? firstPage.Data.filter((alert) =>
          parseJsonArray(alert.notificationChannels).some((channel) => channel.toUpperCase() === "IN_APP")
        )
      : firstPage.Data

    return {
      ...firstPage,
      Data: filteredData,
      TotalCount: filteredData.length,
      TotalPages: 1,
      PageSize: filteredData.length,
    }
  }

  const pages = Array.from({ length: firstPage.TotalPages - 1 }, (_, index) => index + 2)
  const nextPages = await Promise.all(
    pages.map((page) => alertsApi.getOpenAlerts({ page, pageSize: OPEN_ALERTS_PAGE_SIZE }))
  )

  const allAlerts = [firstPage.Data, ...nextPages.map((page) => page.Data)].flat()
  const filteredAlerts = inAppOnly
    ? allAlerts.filter((alert) =>
        parseJsonArray(alert.notificationChannels).some((channel) => channel.toUpperCase() === "IN_APP")
      )
    : allAlerts

  return {
    ...firstPage,
    Data: filteredAlerts,
    Page: 1,
    PageSize: filteredAlerts.length,
    TotalCount: filteredAlerts.length,
    TotalPages: 1,
  }
}

export function useAlertNotifications(options: UseAlertNotificationsOptions = {}) {
  const { inAppOnly = true } = options
  const userId = getCurrentUser()?.id ?? null
  const [viewedVersion, setViewedVersion] = useState(0)

  const { data, loading, error, refetch } = useApi(() => loadAllOpenAlerts(inAppOnly), {
    cacheKey: inAppOnly ? "notification_open_alerts_in_app" : "notification_open_alerts_all",
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storageKey = getViewedAlertIdsStorageKey(userId)
    const handleViewedChange = () => setViewedVersion((current) => current + 1)
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === storageKey) {
        handleViewedChange()
      }
    }

    window.addEventListener(ALERT_NOTIFICATION_STATE_CHANGED, handleViewedChange)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener(ALERT_NOTIFICATION_STATE_CHANGED, handleViewedChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [userId])

  const alerts = data?.Data ?? []
  const totalOpenCount = data?.TotalCount ?? alerts.length
  const openAlertIds = useMemo(() => alerts.map((alert) => alert.id), [alerts])
  const viewedAlertIds = useMemo(() => getViewedAlertIds(userId), [userId, viewedVersion])
  const unseenAlerts = useMemo(
    () => alerts.filter((alert) => !viewedAlertIds.has(alert.id)),
    [alerts, viewedAlertIds]
  )

  const markAlertsViewed = useCallback(
    (alertIds: number[]) => {
      persistViewedAlerts(alertIds, userId)
    },
    [userId]
  )

  const markAllAlertsViewed = useCallback(() => {
    markAlertsViewed(openAlertIds)
  }, [markAlertsViewed, openAlertIds])

  return {
    alerts,
    totalOpenCount,
    unseenAlerts,
    unseenCount: unseenAlerts.length,
    openAlertIds,
    loading,
    error,
    refetch,
    markAlertsViewed,
    markAllAlertsViewed,
  }
}
