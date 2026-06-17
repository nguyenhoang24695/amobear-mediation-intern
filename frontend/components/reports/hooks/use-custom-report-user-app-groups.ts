"use client"

import { useEffect, useMemo, useState } from "react"
import { teamMembersApi } from "@/lib/api/services"
import type { CommissionMemberOption } from "@/components/reports/grouped-member-multi-select"
import type { App, PermittedAppListItem } from "@/types/api"

export interface CustomReportUserAppGroup {
  userId: string
  userLabel: string
  apps: App[]
}

function mapPermittedAppToApp(item: PermittedAppListItem, poolById: Map<string, App>): App {
  const fromPool = poolById.get(item.appId)
  if (fromPool) return fromPool
  return {
    id: 0,
    name: item.name,
    appId: item.appId,
    displayName: item.displayName?.trim() || item.name,
    appStoreId: item.appStoreId,
    iconUri: item.iconUri,
    platform: item.platform,
    publisherId: "",
    createdAt: "",
    updatedAt: "",
  }
}

export function useCustomReportUserAppGroups(
  memberIds: string[],
  members: CommissionMemberOption[],
  appsForSelection: App[],
  enabled: boolean,
) {
  const [groups, setGroups] = useState<CustomReportUserAppGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memberKey = useMemo(() => [...memberIds].sort().join("|"), [memberIds])
  const poolById = useMemo(
    () => new Map(appsForSelection.map((app) => [app.appId, app])),
    [appsForSelection],
  )
  const labelByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      if (!map.has(member.userId)) map.set(member.userId, member.label)
    }
    return map
  }, [members])

  useEffect(() => {
    if (!enabled || memberIds.length === 0) {
      setGroups([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const responses = await Promise.all(
          memberIds.map(async (userId) => {
            const response = await teamMembersApi.getPermittedApps(userId, { limit: 500 })
            const permitted = (response.data ?? [])
              .filter((item) => item?.appId)
              .map((item) => mapPermittedAppToApp(item, poolById))
              .filter((app) => poolById.size === 0 || poolById.has(app.appId))
              .sort((a, b) =>
                (a.displayName || a.name).localeCompare(b.displayName || b.name, undefined, {
                  sensitivity: "base",
                }),
              )
            return {
              userId,
              userLabel: labelByUserId.get(userId) ?? "Member",
              apps: permitted,
            }
          }),
        )

        if (cancelled) return
        setGroups(responses)
      } catch {
        if (!cancelled) {
          setGroups([])
          setError("Failed to load apps by user.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, memberKey, memberIds, labelByUserId, poolById])

  const unionApps = useMemo(() => {
    const byId = new Map<string, App>()
    for (const group of groups) {
      for (const app of group.apps) {
        if (app.appId) byId.set(app.appId, app)
      }
    }
    return [...byId.values()].sort((a, b) =>
      (a.displayName || a.name).localeCompare(b.displayName || b.name, undefined, {
        sensitivity: "base",
      }),
    )
  }, [groups])

  return { groups, unionApps, loading, error }
}
