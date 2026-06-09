import { format } from "date-fns"
import type { CustomReportCatalogItem } from "@/types/reports"
import { escapeExcelHtml, formatDimensionCell, formatMetricValue } from "@/lib/reports/report-format-utils"

export function exportReportTableExcel(options: {
  dimensions: string[]
  metrics: string[]
  dimensionCatalog: CustomReportCatalogItem[]
  metricCatalog: CustomReportCatalogItem[]
  rows: Record<string, string | number | null>[]
  totals: Record<string, string | number | null>
  filenamePrefix?: string
}) {
  const {
    dimensions,
    metrics,
    dimensionCatalog,
    metricCatalog,
    rows,
    totals,
    filenamePrefix = "report",
  } = options

  if (rows.length === 0) return

  const dimensionHeaders = dimensions.map((id) => {
    const item = dimensionCatalog.find((d) => d.id === id)
    return item?.label ?? id
  })
  const metricHeaders = metrics.map((id) => {
    const item = metricCatalog.find((m) => m.id === id)
    return item?.label ?? id
  })

  const headerHtml = [...dimensionHeaders, ...metricHeaders]
    .map((header) => `<th>${escapeExcelHtml(header)}</th>`)
    .join("")

  const totalHtml = [
    ...dimensions.map((_, index) => (index === 0 ? "Total" : "")),
    ...metrics.map((metricId) => formatMetricValue(totals[metricId], metricId, metricCatalog)),
  ]
    .map((value) => `<td>${escapeExcelHtml(value)}</td>`)
    .join("")

  const rowsHtml = rows
    .map((row) => {
      const dimensionCells = dimensions.map((dimId) =>
        escapeExcelHtml(formatDimensionCell(dimId, row)),
      )
      const metricCells = metrics.map((metricId) =>
        escapeExcelHtml(formatMetricValue(row[metricId], metricId, metricCatalog)),
      )
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
