import { describe, expect, it } from "vitest"
import {
  buildDimensionRowKey,
  computeDeltaPercent,
  mergeCompareRows,
  resolveCompareDateRange,
} from "@/lib/reports/my-report-compare-utils"

describe("resolveCompareDateRange", () => {
  it("shifts previous period by span length", () => {
    const start = new Date(2026, 4, 1)
    const end = new Date(2026, 4, 26)
    const range = resolveCompareDateRange(start, end, "previous_period")
    expect(range?.start).toEqual(new Date(2026, 3, 5))
    expect(range?.end).toEqual(new Date(2026, 3, 30))
  })

  it("shifts day ago by one day", () => {
    const start = new Date(2026, 4, 1)
    const end = new Date(2026, 4, 26)
    const range = resolveCompareDateRange(start, end, "day_ago")
    expect(range?.start).toEqual(new Date(2026, 3, 30))
    expect(range?.end).toEqual(new Date(2026, 4, 25))
  })
})

describe("mergeCompareRows", () => {
  it("merges by dimension key and computes delta", () => {
    const primary = [{ date: "2026-05-01", profit: 200 }]
    const compare = [{ date: "2026-05-01", profit: 100 }]
    const merged = mergeCompareRows(primary, compare, ["date"], ["profit"])
    expect(merged[0].__compare?.profit).toBe(100)
    expect(merged[0].__deltaPct?.profit).toBe(100)
  })
})

describe("computeDeltaPercent", () => {
  it("returns null when previous is zero and current non-zero", () => {
    expect(computeDeltaPercent(10, 0)).toBeNull()
  })
})
