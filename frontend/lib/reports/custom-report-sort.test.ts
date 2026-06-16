import { describe, expect, it } from "vitest"
import { sortCustomReportRows } from "@/lib/reports/custom-report-sort"

describe("sortCustomReportRows", () => {
  it("sorts date chronologically instead of lexically", () => {
    const rows = [
      { date: "10/1/2025", estimated_revenue: 3 },
      { date: "8/9/2025", estimated_revenue: 1 },
      { date: "9/1/2025", estimated_revenue: 2 },
    ]

    const sorted = sortCustomReportRows(rows, "date", "asc")
    expect(sorted.map((row) => row.date)).toEqual(["8/9/2025", "9/1/2025", "10/1/2025"])
  })

  it("sorts numeric metrics descending", () => {
    const rows = [
      { app: "A", estimated_revenue: 10 },
      { app: "B", estimated_revenue: 30 },
      { app: "C", estimated_revenue: 20 },
    ]

    const sorted = sortCustomReportRows(rows, "estimated_revenue", "desc")
    expect(sorted.map((row) => row.estimated_revenue)).toEqual([30, 20, 10])
  })
})
