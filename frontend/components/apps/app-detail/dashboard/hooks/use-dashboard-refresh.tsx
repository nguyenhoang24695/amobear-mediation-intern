"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type RefetchFn = () => Promise<unknown>

interface RefreshContextValue {
  register: (key: string, refetch: RefetchFn) => () => void
  refreshAll: () => Promise<void>
  refreshing: boolean
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function DashboardRefreshProvider({ children }: { children: ReactNode }) {
  const refetchers = useMemo(() => new Map<string, RefetchFn>(), [])
  const [refreshing, setRefreshing] = useState(false)

  const register = useCallback((key: string, refetch: RefetchFn) => {
    refetchers.set(key, refetch)
    return () => {
      refetchers.delete(key)
    }
  }, [refetchers])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.allSettled(Array.from(refetchers.values()).map((refetch) => refetch()))
    } finally {
      setRefreshing(false)
    }
  }, [refetchers])

  const value = useMemo(
    () => ({ register, refreshAll, refreshing }),
    [register, refreshAll, refreshing],
  )

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}

export function useRegisterRefetch(key: string, refetch: RefetchFn) {
  const ctx = useContext(RefreshContext)
  const register = ctx?.register

  useEffect(() => {
    if (!register) return
    return register(key, refetch)
  }, [register, key, refetch])
}

export function useDashboardRefresh() {
  const ctx = useContext(RefreshContext)
  if (!ctx) throw new Error("useDashboardRefresh must be used within DashboardRefreshProvider")
  return ctx
}
