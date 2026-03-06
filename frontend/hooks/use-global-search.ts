'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { App, MediationGroup } from '@/types/api'
import { structureApi, dataAccountsApi, type DataAccountItem } from '@/lib/api/services'
import { getCurrentUser, hasScreenFunction } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/enums/user-role'

// ──────────────────────── Types ────────────────────────
export type SearchCategory = 'apps' | 'mediationGroups' | 'dataAccounts'

export interface SearchResultItem {
    id: string
    title: string
    subtitle: string
    category: SearchCategory
    href: string
    icon?: string // iconUri for apps
    meta?: Record<string, string> // extra badges like platform, network, etc.
}

interface CachedEntities {
    apps: App[]
    mediationGroups: MediationGroup[]
    dataAccounts: DataAccountItem[]
    loadedAt: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
let globalCache: CachedEntities | null = null

// ──────────────────────── Category labels ───────────────
export const categoryLabels: Record<SearchCategory, string> = {
    apps: 'Apps',
    mediationGroups: 'Mediation Groups',
    dataAccounts: 'Data Accounts',
}

// ──────────────────────── Hook ─────────────────────────
export function useGlobalSearch() {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ---- Permission checks (memoised once per mount) ----
    const user = useMemo(() => getCurrentUser(), [])
    const userIsSuperAdmin = useMemo(() => isSuperAdmin(user?.role), [user])
    const canViewApps = useMemo(() => hasScreenFunction('s-apps', 'view'), [])
    const canViewMediationGroups = useMemo(() => hasScreenFunction('s-mediation-groups', 'view'), [])
    // Data Accounts: only visible to SuperAdmin
    const canViewDataAccounts = userIsSuperAdmin

    // ---- Load entities into cache lazily (on first open) ----
    const loadEntities = useCallback(async () => {
        if (globalCache && Date.now() - globalCache.loadedAt < CACHE_TTL) return globalCache

        setLoading(true)
        try {
            // Only fetch entities the user has permission to see
            const [appsRes, mediationGroups, dataAccounts] = await Promise.all([
                canViewApps ? structureApi.getApps() : Promise.resolve({ apps: [] }),
                canViewMediationGroups ? structureApi.getMediationGroups() : Promise.resolve([]),
                canViewDataAccounts ? dataAccountsApi.getAll() : Promise.resolve([]),
            ])
            globalCache = {
                apps: appsRes.apps ?? [],
                mediationGroups: mediationGroups ?? [],
                dataAccounts: dataAccounts ?? [],
                loadedAt: Date.now(),
            }
            return globalCache
        } catch (err) {
            console.error('[GlobalSearch] Failed to load entities', err)
            return null
        } finally {
            setLoading(false)
        }
    }, [canViewApps, canViewMediationGroups, canViewDataAccounts])

    // ---- Normalize search text ----
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

    // ---- Map entities to SearchResultItem ----
    const mapApp = useCallback((app: App): SearchResultItem => ({
        id: `app-${app.appId}`,
        title: app.displayName || app.name,
        subtitle: `${app.appId} · ${app.platform ?? ''}`,
        category: 'apps',
        href: `/apps/${app.appId}`,
        icon: app.iconUri ?? undefined,
        meta: {
            ...(app.platform ? { platform: app.platform } : {}),
        },
    }), [])

    const mapMG = useCallback((mg: MediationGroup): SearchResultItem => ({
        id: `mg-${mg.mediationGroupId}`,
        title: mg.displayName || mg.name,
        subtitle: `${mg.mediationGroupId} · ${mg.adFormat ?? ''} · ${mg.platform ?? ''}`,
        category: 'mediationGroups',
        href: `/mediation/${mg.mediationGroupId}`,
        meta: {
            ...(mg.platform ? { platform: mg.platform } : {}),
            ...(mg.adFormat ? { adFormat: mg.adFormat } : {}),
        },
    }), [])

    const mapDA = useCallback((da: DataAccountItem): SearchResultItem => ({
        id: `da-${da.network}-${da.id}`,
        title: da.name,
        subtitle: `${da.accountId} · ${da.network.toUpperCase()}`,
        category: 'dataAccounts',
        href: `/data-accounts/${da.network}-${da.id}`,
        meta: { network: da.network },
    }), [])

    // ---- Filter ----
    const filterEntities = useCallback(
        (cache: CachedEntities, q: string): SearchResultItem[] => {
            const n = normalize(q)
            if (!n) return []

            // Apps: server already filters by user's app_permission for non-SuperAdmin
            const matchApps = canViewApps
                ? cache.apps
                    .filter(
                        (a) =>
                            normalize(a.displayName ?? '').includes(n) ||
                            normalize(a.name ?? '').includes(n) ||
                            normalize(a.appId ?? '').includes(n)
                    )
                    .slice(0, 5)
                    .map(mapApp)
                : []

            // Mediation Groups: server already filters by user's app_permission for non-SuperAdmin
            const matchMG = canViewMediationGroups
                ? cache.mediationGroups
                    .filter(
                        (mg) =>
                            normalize(mg.displayName ?? '').includes(n) ||
                            normalize(mg.name ?? '').includes(n) ||
                            normalize(mg.mediationGroupId ?? '').includes(n)
                    )
                    .slice(0, 5)
                    .map(mapMG)
                : []

            // Data Accounts: only SuperAdmin can search
            const matchDA = canViewDataAccounts
                ? cache.dataAccounts
                    .filter(
                        (da) =>
                            normalize(da.name ?? '').includes(n) ||
                            normalize(da.accountId ?? '').includes(n) ||
                            normalize(da.network ?? '').includes(n)
                    )
                    .slice(0, 5)
                    .map(mapDA)
                : []

            return [...matchApps, ...matchMG, ...matchDA]
        },
        [mapApp, mapMG, mapDA, canViewApps, canViewMediationGroups, canViewDataAccounts]
    )

    // ---- Debounced search handler ----
    const handleSearch = useCallback(
        (value: string) => {
            setQuery(value)
            setActiveIndex(0)

            if (debounceRef.current) clearTimeout(debounceRef.current)

            if (!value.trim()) {
                setResults([])
                return
            }

            debounceRef.current = setTimeout(async () => {
                const cache = await loadEntities()
                if (!cache) return
                setResults(filterEntities(cache, value))
            }, 200)
        },
        [loadEntities, filterEntities]
    )

    // ---- Open search (prefetch) ----
    const open = useCallback(() => {
        setIsOpen(true)
        loadEntities() // warm cache
    }, [loadEntities])

    const close = useCallback(() => {
        setIsOpen(false)
        setQuery('')
        setResults([])
        setActiveIndex(0)
    }, [])

    // ---- Keyboard nav helpers ----
    const moveUp = useCallback(() => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    }, [results.length])

    const moveDown = useCallback(() => {
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    }, [results.length])

    const activeResult = useMemo(
        () => (results.length > 0 ? results[activeIndex] : null),
        [results, activeIndex]
    )

    // ---- Cleanup ----
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    return {
        query,
        isOpen,
        loading,
        results,
        activeIndex,
        activeResult,
        setActiveIndex,
        handleSearch,
        open,
        close,
        moveUp,
        moveDown,
    }
}
