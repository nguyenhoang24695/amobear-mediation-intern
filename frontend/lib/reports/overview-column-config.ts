export const OVERVIEW_COLUMNS = [
  { id: "revenuePlan", label: "Planned Revenue", group: "revenue" as const, minWidthClass: "min-w-[88px]" },
  { id: "revenueActual", label: "Actual Revenue", group: "revenue" as const, minWidthClass: "min-w-[80px]" },
  { id: "revenuePercent", label: "Completion", group: "revenue" as const, minWidthClass: "min-w-[56px]" },
  { id: "actualCost", label: "Actual Cost", group: "performance" as const, minWidthClass: "min-w-[88px]" },
  { id: "actualProfit", label: "Actual Profit", group: "performance" as const, minWidthClass: "min-w-[88px]" },
  {
    id: "netProfitMargin",
    label: "Net Profit Margin",
    group: "performance" as const,
    minWidthClass: "min-w-[104px]",
  },
] as const

export type OverviewColumnId = (typeof OVERVIEW_COLUMNS)[number]["id"]
export type OverviewColumnGroup = (typeof OVERVIEW_COLUMNS)[number]["group"]

export const DEFAULT_OVERVIEW_COLUMNS: OverviewColumnId[] = OVERVIEW_COLUMNS.map((column) => column.id)
