export type PivotCellValue = number | null

export type PivotRow = {
  rowKey: string
  rowLabel: string
  cells: Record<string, PivotCellValue>
  rowTotal: PivotCellValue
}

export type PivotResult = {
  columns: Array<{ id: string; label: string }>
  rows: PivotRow[]
  rowTotals: Record<string, PivotCellValue>
  colTotals: Record<string, PivotCellValue>
  grandTotal: PivotCellValue
}

function toNumeric(value: string | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPivotLabel(value: string | number | null | undefined): string {
  if (value == null || value === "") return "(blank)"
  return String(value)
}

export function pivotRows(
  rows: Record<string, string | number | null>[],
  rowDim: string,
  colDim: string,
  metricId: string,
  maxCols = 50,
): PivotResult {
  const colKeyCounts = new Map<string, number>()
  for (const row of rows) {
    const colKey = formatPivotLabel(row[colDim])
    colKeyCounts.set(colKey, (colKeyCounts.get(colKey) ?? 0) + 1)
  }

  const sortedColKeys = [...colKeyCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxCols)
    .map(([key]) => key)

  const columns = sortedColKeys.map((key) => ({ id: key, label: key }))
  const colTotals: Record<string, PivotCellValue> = Object.fromEntries(
    sortedColKeys.map((key) => [key, 0]),
  )
  const rowTotals: Record<string, PivotCellValue> = {}

  const rowMap = new Map<string, PivotRow>()

  for (const row of rows) {
    const rowKey = formatPivotLabel(row[rowDim])
    const colKey = formatPivotLabel(row[colDim])
    if (!sortedColKeys.includes(colKey)) continue

    const value = toNumeric(row[metricId]) ?? 0
    let pivotRow = rowMap.get(rowKey)
    if (!pivotRow) {
      pivotRow = {
        rowKey,
        rowLabel: rowKey,
        cells: Object.fromEntries(sortedColKeys.map((key) => [key, null])),
        rowTotal: 0,
      }
      rowMap.set(rowKey, pivotRow)
    }

    const prevCell = pivotRow.cells[colKey]
    pivotRow.cells[colKey] = (prevCell ?? 0) + value
    pivotRow.rowTotal = (pivotRow.rowTotal ?? 0) + value
    colTotals[colKey] = (colTotals[colKey] ?? 0) + value
    rowTotals[rowKey] = (rowTotals[rowKey] ?? 0) + value
  }

  const pivotRowsResult = [...rowMap.values()].sort((a, b) => a.rowLabel.localeCompare(b.rowLabel))
  const grandTotal = pivotRowsResult.reduce((sum, row) => sum + (row.rowTotal ?? 0), 0)

  return {
    columns,
    rows: pivotRowsResult,
    rowTotals,
    colTotals,
    grandTotal,
  }
}
