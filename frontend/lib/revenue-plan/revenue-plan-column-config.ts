export const REVENUE_PLAN_COLUMNS = [
  { id: "planned", label: "Planned", group: "revenue" as const, minWidthClass: "min-w-[80px]" },
  { id: "actual", label: "Actual", group: "revenue" as const, minWidthClass: "min-w-[80px]" },
  { id: "completion", label: "Completion", group: "revenue" as const, minWidthClass: "min-w-[88px]" },
  { id: "actualCost", label: "Actual Cost", group: "performance" as const, minWidthClass: "min-w-[88px]" },
  { id: "actualProfit", label: "Actual Profit", group: "performance" as const, minWidthClass: "min-w-[88px]" },
  {
    id: "netProfitMargin",
    label: "Net Profit Margin",
    group: "performance" as const,
    minWidthClass: "min-w-[104px]",
  },
] as const

export type RevenuePlanColumnId = (typeof REVENUE_PLAN_COLUMNS)[number]["id"]
export type RevenuePlanColumnGroup = (typeof REVENUE_PLAN_COLUMNS)[number]["group"]
export type RevenuePlanColumnVisibility = Record<RevenuePlanColumnId, boolean>

export function createDefaultColumnVisibility(): RevenuePlanColumnVisibility {
  return REVENUE_PLAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = true
    return acc
  }, {} as RevenuePlanColumnVisibility)
}

export function getVisibleColumns(visibility: RevenuePlanColumnVisibility) {
  return REVENUE_PLAN_COLUMNS.filter((column) => visibility[column.id])
}

export function countVisibleColumns(visibility: RevenuePlanColumnVisibility) {
  return getVisibleColumns(visibility).length
}

export function countVisibleColumnsInGroup(
  visibility: RevenuePlanColumnVisibility,
  group: RevenuePlanColumnGroup,
) {
  return REVENUE_PLAN_COLUMNS.filter((column) => column.group === group && visibility[column.id]).length
}
