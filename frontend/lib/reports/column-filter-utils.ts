import { formatDimensionCell } from "@/lib/reports/report-format-utils"

export type ColumnFilterOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"

export type ColumnFilterCondition = {
  id: string
  operator: ColumnFilterOperator
  value: string
  /** Pivot combined dimension column — which dimension this condition targets. */
  dimensionId?: string
}

/** Synthetic column id for the combined dimension tree column in pivot view. */
export const PIVOT_DIMENSION_COLUMN_ID = "__pivot_dimensions__"

export type ColumnKind = "dimension" | "metric"

export const METRIC_COLUMN_FILTER_OPERATORS: Array<{ value: ColumnFilterOperator; label: string }> = [
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal to" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal to" },
  { value: "eq", label: "Equal to" },
  { value: "neq", label: "Not equal to" },
]

export const DIMENSION_COLUMN_FILTER_OPERATORS: Array<{ value: ColumnFilterOperator; label: string }> = [
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "eq", label: "Equal to" },
  { value: "neq", label: "Not equal to" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
]

export function createEmptyColumnFilterCondition(
  columnKind: ColumnKind,
  options?: { dimensionId?: string },
): ColumnFilterCondition {
  return {
    id: crypto.randomUUID(),
    operator: columnKind === "metric" ? "gt" : "contains",
    value: "",
    ...(options?.dimensionId ? { dimensionId: options.dimensionId } : {}),
  }
}

export function normalizeColumnFilterConditions(
  conditions: ColumnFilterCondition[],
): ColumnFilterCondition[] {
  return conditions.filter((c) => c.value.trim() !== "")
}

function rowMatchesPivotDimensionConditions(
  row: Record<string, string | number | null>,
  conditions: ColumnFilterCondition[],
  defaultDimensionId: string,
): boolean {
  if (conditions.length === 0) return true
  return conditions.every((condition) => {
    const dimensionId = condition.dimensionId ?? defaultDimensionId
    const cellText = formatDimensionCell(dimensionId, row)
    return matchTextCondition(cellText, condition.operator, condition.value)
  })
}

export function filterReportRowsForPivotView(
  rows: Record<string, string | number | null>[],
  filtersByColumn: Record<string, ColumnFilterCondition[]>,
  dimensions: string[],
  metricColumns: Array<{ id: string }>,
): Record<string, string | number | null>[] {
  const pivotDimensionConditions = filtersByColumn[PIVOT_DIMENSION_COLUMN_ID] ?? []
  const activeMetricFilters = metricColumns
    .map((col) => ({ ...col, conditions: filtersByColumn[col.id] ?? [] }))
    .filter((col) => col.conditions.length > 0)

  if (pivotDimensionConditions.length === 0 && activeMetricFilters.length === 0) {
    return rows
  }

  const defaultDimensionId = dimensions[0] ?? "date"

  return rows.filter((row) => {
    if (
      pivotDimensionConditions.length > 0 &&
      !rowMatchesPivotDimensionConditions(row, pivotDimensionConditions, defaultDimensionId)
    ) {
      return false
    }
    return activeMetricFilters.every((col) =>
      rowMatchesColumnConditions(row, col.id, "metric", col.conditions),
    )
  })
}

export function hasActiveColumnFilters(
  filtersByColumn: Record<string, ColumnFilterCondition[]>,
): boolean {
  return Object.values(filtersByColumn).some((conditions) => conditions.length > 0)
}

function getColumnCellText(
  row: Record<string, string | number | null>,
  columnId: string,
  columnKind: ColumnKind,
): string {
  if (columnKind === "dimension") return formatDimensionCell(columnId, row)
  const raw = row[columnId]
  if (raw === null || raw === undefined) return ""
  return String(raw)
}

function getColumnCellNumber(row: Record<string, string | number | null>, columnId: string): number | null {
  const raw = row[columnId]
  if (raw === null || raw === undefined || raw === "") return null
  const num = typeof raw === "number" ? raw : Number(raw)
  return Number.isFinite(num) ? num : null
}

function matchTextCondition(cellText: string, operator: ColumnFilterOperator, value: string): boolean {
  const hay = cellText.toLowerCase()
  const needle = value.trim().toLowerCase()
  switch (operator) {
    case "contains":
      return hay.includes(needle)
    case "not_contains":
      return !hay.includes(needle)
    case "eq":
      return hay === needle
    case "neq":
      return hay !== needle
    case "starts_with":
      return hay.startsWith(needle)
    case "ends_with":
      return hay.endsWith(needle)
    default:
      return true
  }
}

function matchNumericCondition(
  cellNum: number | null,
  operator: ColumnFilterOperator,
  value: string,
): boolean {
  const target = Number(value)
  if (cellNum === null || Number.isNaN(target)) return false
  switch (operator) {
    case "gt":
      return cellNum > target
    case "gte":
      return cellNum >= target
    case "lt":
      return cellNum < target
    case "lte":
      return cellNum <= target
    case "eq":
      return cellNum === target
    case "neq":
      return cellNum !== target
    default:
      return true
  }
}

function rowMatchesColumnConditions(
  row: Record<string, string | number | null>,
  columnId: string,
  columnKind: ColumnKind,
  conditions: ColumnFilterCondition[],
): boolean {
  if (conditions.length === 0) return true
  return conditions.every((condition) => {
    if (columnKind === "metric") {
      return matchNumericCondition(getColumnCellNumber(row, columnId), condition.operator, condition.value)
    }
    return matchTextCondition(getColumnCellText(row, columnId, columnKind), condition.operator, condition.value)
  })
}

export function filterReportRowsByColumnFilters(
  rows: Record<string, string | number | null>[],
  filtersByColumn: Record<string, ColumnFilterCondition[]>,
  columns: Array<{ id: string; kind: ColumnKind }>,
): Record<string, string | number | null>[] {
  const activeEntries = columns
    .map((col) => ({ ...col, conditions: filtersByColumn[col.id] ?? [] }))
    .filter((col) => col.conditions.length > 0)

  if (activeEntries.length === 0) return rows

  return rows.filter((row) =>
    activeEntries.every((col) => rowMatchesColumnConditions(row, col.id, col.kind, col.conditions)),
  )
}

export function computeFilteredMetricTotals(
  rows: Record<string, string | number | null>[],
  metricIds: string[],
): Record<string, number | null> {
  const totals: Record<string, number | null> = {}
  for (const metricId of metricIds) {
    let sum = 0
    let hasValue = false
    for (const row of rows) {
      const num = getColumnCellNumber(row, metricId)
      if (num === null) continue
      sum += num
      hasValue = true
    }
    totals[metricId] = hasValue ? sum : null
  }
  return totals
}
