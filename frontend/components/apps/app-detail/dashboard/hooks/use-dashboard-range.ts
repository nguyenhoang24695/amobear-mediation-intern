"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { DashboardRange, DashboardRangeSelection } from "@/types/app-dashboard"

const VALID_RANGES: readonly DashboardRange[] = ["today", "yesterday", "last7", "last30", "custom"] as const
const DEFAULT_RANGE: DashboardRange = "last7"

/**
 * Sync state `range` của tab Dashboard với query string `?range=...`.
 * URL invalid hoặc thiếu → fallback `last7` (đã chốt trong
 * docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §1 #15).
 */
export function useDashboardRange() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const range = useMemo<DashboardRangeSelection>(() => {
    const raw = (searchParams.get("range") as DashboardRange | null) ?? null
    const nextRange: DashboardRange =
      raw !== null && (VALID_RANGES as readonly string[]).includes(raw) ? raw : DEFAULT_RANGE

    if (nextRange !== "custom") return { range: nextRange }

    const startDate = searchParams.get("startDate") ?? ""
    const endDate = searchParams.get("endDate") ?? ""
    if (!isDateString(startDate) || !isDateString(endDate) || startDate > endDate) {
      return { range: DEFAULT_RANGE }
    }

    return { range: "custom", startDate, endDate }
  }, [searchParams])

  const setRange = useCallback(
    (next: DashboardRangeSelection) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("range", next.range)
      if (next.range === "custom") {
        params.set("startDate", next.startDate ?? "")
        params.set("endDate", next.endDate ?? "")
      } else {
        params.delete("startDate")
        params.delete("endDate")
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return { range, setRange }
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
