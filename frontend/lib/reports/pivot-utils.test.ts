import { describe, expect, it } from "vitest"
import {
  aggregatePivotMetrics,
  buildPivotTree,
  flattenVisiblePivotNodes,
} from "@/lib/reports/pivot-utils"
import type { CompareEnrichedRow } from "@/lib/reports/my-report-compare-utils"

function row(
  partial: Record<string, string | number | null>,
): CompareEnrichedRow {
  return partial
}

describe("buildPivotTree", () => {
  const rows: CompareEnrichedRow[] = [
    row({ channel: "Google Ads", app: "UltraGuard", platform: "android", installs: 100, revenue: 10 }),
    row({ channel: "Google Ads", app: "UltraGuard", platform: "ios", installs: 50, revenue: 5 }),
    row({ channel: "Google Ads", app: "PhotoReco", platform: "android", installs: 200, revenue: 20 }),
    row({ channel: "Meta", app: "UltraGuard", platform: "android", installs: 80, revenue: 8 }),
  ]

  it("groups by first dimension then nests children", () => {
    const tree = buildPivotTree(rows, ["channel", "app", "platform"], ["installs", "revenue"])
    expect(tree).toHaveLength(2)
    expect(tree[0].label).toBe("Google Ads")
    expect(tree[0].metrics.installs).toBe(350)
    expect(tree[0].metrics.revenue).toBe(35)
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].label).toBe("PhotoReco")
    expect(tree[0].children[1].label).toBe("UltraGuard")
    expect(tree[0].children[1].children).toHaveLength(2)
    expect(tree[0].children[1].children[0].isLeaf).toBe(true)
    expect(tree[0].children[1].children[0].metrics.installs).toBe(100)
  })

  it("returns empty tree when fewer than 2 dimensions", () => {
    expect(buildPivotTree(rows, ["channel"], ["installs"])).toEqual([])
  })
})

describe("flattenVisiblePivotNodes", () => {
  it("shows only top level until expanded", () => {
    const tree = buildPivotTree(
      [
        row({ channel: "A", app: "X", installs: 1 }),
        row({ channel: "A", app: "Y", installs: 2 }),
        row({ channel: "B", app: "Z", installs: 3 }),
      ],
      ["channel", "app"],
      ["installs"],
    )

    expect(flattenVisiblePivotNodes(tree, new Set())).toHaveLength(2)
    expect(flattenVisiblePivotNodes(tree, new Set([tree[0].key]))).toHaveLength(4)
  })
})

describe("filterReportRowsForPivotView", () => {
  it("filters by selected dimension on pivot dimension column", async () => {
    const { filterReportRowsForPivotView, PIVOT_DIMENSION_COLUMN_ID } = await import(
      "@/lib/reports/column-filter-utils"
    )
    const rows = [
      { channel: "Google", app: "A", revenue: 10 },
      { channel: "Meta", app: "B", revenue: 20 },
    ]
    const filtered = filterReportRowsForPivotView(
      rows,
      {
        [PIVOT_DIMENSION_COLUMN_ID]: [
          { id: "1", operator: "contains", value: "Google", dimensionId: "channel" },
        ],
      },
      ["channel", "app"],
      [{ id: "revenue" }],
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].channel).toBe("Google")
  })
})

describe("aggregatePivotMetrics", () => {
  it("sums metrics and compare values", () => {
    const result = aggregatePivotMetrics(
      [
        row({ installs: 10, __compare: { installs: 5 } }),
        row({ installs: 20, __compare: { installs: 15 } }),
      ],
      ["installs"],
    )
    expect(result.metrics.installs).toBe(30)
    expect(result.compare.installs).toBe(20)
    expect(result.deltaPct.installs).toBe(50)
  })
})
