import { format } from "date-fns"
import type { CustomReportCatalogItem } from "@/types/reports"
import { escapeExcelHtml, formatDimensionCell, formatMetricValue } from "@/lib/reports/report-format-utils"

function formatDeltaPctExport(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function exportReportTableExcel(options: {
  dimensions: string[]
  metrics: string[]
  formulaMetricIds?: string[]
  dimensionCatalog: CustomReportCatalogItem[]
  metricCatalog: CustomReportCatalogItem[]
  rows: Record<string, string | number | null>[]
  totals: Record<string, string | number | null>
  filenamePrefix?: string
  compareActive?: boolean
  compareTotals?: Record<string, number | null>
  totalsDeltaPct?: Record<string, number | null>
  rowCompare?: Array<Record<string, number | null | undefined>>
  rowDeltaPct?: Array<Record<string, number | null | undefined>>
}) {
  const {
    dimensions,
    metrics,
    formulaMetricIds = [],
    dimensionCatalog,
    metricCatalog,
    rows,
    totals,
    filenamePrefix = "report",
    compareActive = false,
    compareTotals = {},
    totalsDeltaPct = {},
    rowCompare = [],
    rowDeltaPct = [],
  } = options

  if (rows.length === 0) return

  const allMetricIds = [...metrics, ...formulaMetricIds]

  const dimensionHeaders = dimensions.map((id) => {
    const item = dimensionCatalog.find((d) => d.id === id)
    return item?.label ?? id
  })
  const metricHeaders = allMetricIds.flatMap((id) => {
    const item = metricCatalog.find((m) => m.id === id)
    const label = item?.label ?? id
    if (!compareActive) return [label]
    return [label, `${label} (compare)`, `${label} (Δ%)`]
  })

  const headerHtml = [...dimensionHeaders, ...metricHeaders]
    .map((header) => `<th>${escapeExcelHtml(header)}</th>`)
    .join("")

  const totalHtml = [
    ...dimensions.map((_, index) => (index === 0 ? "Total" : "")),
    ...allMetricIds.flatMap((metricId) => {
      const cells = [formatMetricValue(totals[metricId], metricId, metricCatalog)]
      if (!compareActive) return cells
      return [
        ...cells,
        formatMetricValue(compareTotals[metricId], metricId, metricCatalog),
        formatDeltaPctExport(totalsDeltaPct[metricId]),
      ]
    }),
  ]
    .map((value) => `<td>${escapeExcelHtml(value)}</td>`)
    .join("")

  const rowsHtml = rows
    .map((row, rowIndex) => {
      const dimensionCells = dimensions.map((dimId) =>
        escapeExcelHtml(formatDimensionCell(dimId, row)),
      )
      const metricCells = allMetricIds.flatMap((metricId) => {
        const cells = [formatMetricValue(row[metricId], metricId, metricCatalog)]
        if (!compareActive) return cells
        const compare = rowCompare[rowIndex]?.[metricId]
        const delta = rowDeltaPct[rowIndex]?.[metricId]
        return [
          ...cells,
          compare == null ? "" : formatMetricValue(compare, metricId, metricCatalog),
          formatDeltaPctExport(delta ?? null),
        ]
      })
      return `<tr>${[...dimensionCells, ...metricCells].map((value) => `<td>${value}</td>`).join("")}</tr>`
    })
    .join("")

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; white-space: nowrap; }
    th { background: #f1f5f9; font-weight: 700; }
    .total td { background: #f8fafc; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>
      <tr class="total">${totalHtml}</tr>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filenamePrefix}-${format(new Date(), "yyyyMMdd-HHmm")}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
