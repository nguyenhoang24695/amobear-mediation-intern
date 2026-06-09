"use client"

import { useEffect, useMemo, useState } from "react"
import { reportsApi } from "@/lib/api/services"
import { teamCacheItemToSelectableApp } from "@/lib/reports/team-scope-apps"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import type { App } from "@/types/api"

export type MyReportTeamAppGroup = {
  teamId: string
  teamName: string
  apps: App[]
}

export function useMyReportTeamAppGroups(
  teams: CommissionTeamOption[],
  enabled: boolean,
) {
  const [groups, setGroups] = useState<MyReportTeamAppGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teamKey = useMemo(
    () =>
      teams
        .map((t) => t.teamId)
        .sort()
        .join("|"),
    [teams],
  )

  useEffect(() => {
    if (!enabled || teams.length === 0) {
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
          teams.map(async (team) => {
            const cache = await reportsApi.getTeamApps(team.teamId)
            const apps = (cache.apps ?? [])
              .filter((item) => item?.appId)
              .map(teamCacheItemToSelectableApp)
              .sort((a, b) =>
                (a.displayName || a.name).localeCompare(b.displayName || b.name, undefined, {
                  sensitivity: "base",
                }),
              )
            return {
              teamId: team.teamId,
              teamName: team.label,
              apps,
            }
          }),
        )

        if (cancelled) return
        setGroups(responses.filter((group) => group.apps.length > 0))
      } catch {
        if (!cancelled) {
          setGroups([])
          setError("Failed to load team apps.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, teamKey, teams])

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
