import type { App } from "@/types/api"
import type { TeamLeadAppCache, TeamLeadAppCacheItem } from "@/types/reports"

export function teamCacheItemToSelectableApp(item: TeamLeadAppCacheItem): App {
  const label = item.displayName?.trim() || item.appId
  return {
    id: 0,
    name: label,
    appId: item.appId,
    platform: item.platform ?? undefined,
    displayName: item.displayName ?? undefined,
    appStoreId: item.appStoreId ?? undefined,
    iconUri: item.iconUri ?? undefined,
    approvalState: item.approvalState ?? undefined,
    publisherId: item.publisherId ?? "",
    createdAt: "",
    updatedAt: "",
  }
}

/** Union of apps from team lead caches (profit-plan / team scope), not the logged-in user's app permissions. */
export function mergeTeamLeadCachesToApps(caches: TeamLeadAppCache[]): App[] {
  const byId = new Map<string, App>()
  for (const cache of caches) {
    for (const item of cache.apps ?? []) {
      if (!item?.appId) continue
      byId.set(item.appId, teamCacheItemToSelectableApp(item))
    }
    for (const appId of cache.admobAppIds ?? []) {
      if (!appId || byId.has(appId)) continue
      byId.set(appId, teamCacheItemToSelectableApp({ appId }))
    }
  }
  return [...byId.values()].sort((a, b) =>
    (a.displayName || a.name).localeCompare(b.displayName || b.name, undefined, { sensitivity: "base" }),
  )
}
