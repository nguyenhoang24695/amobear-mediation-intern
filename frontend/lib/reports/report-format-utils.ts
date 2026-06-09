import type { CustomReportCatalogItem } from "@/types/reports"

export function formatMetricValue(
  value: number | string | null | undefined,
  metricId: string,
  metricCatalog: CustomReportCatalogItem[],
): string {
  if (value === undefined || value === null) return "—"
  const metric = metricCatalog.find((m) => m.id === metricId)
  if (!metric || typeof value === "string") return String(value)

  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return String(value)

  switch (metric.format) {
    case "currency":
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case "percent":
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case "number":
      return num.toLocaleString("en-US")
    default:
      return String(num)
  }
}

export function escapeExcelHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function formatDimensionCell(
  dimensionId: string,
  row: Record<string, string | number | null>,
): string {
  if (dimensionId === "app") return String(row.app_display_name ?? row.app ?? "")
  if (dimensionId === "platform") return String(row.platform ?? "")
  if (dimensionId === "date") return String(row.date ?? "")
  if (dimensionId === "app_store_id") return String(row.app_store_display_name ?? row.app_store_id ?? "")
  return String(row[dimensionId] ?? "")
}
