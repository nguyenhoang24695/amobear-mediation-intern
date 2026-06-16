import * as XLSX from "xlsx"
import { formatMonthTableHeader } from "@/components/organizations/revenue-plan-month-range-picker"

export type RevenuePlanImportCellStatus = "empty" | "unchanged" | "changed" | "new"

export interface RevenuePlanImportMonthColumn {
  monthKey: string
  headerLabel: string
  columnIndex: number
  selected: boolean
}

export interface RevenuePlanImportCell {
  importedValue: number | null
  currentValue: number | null
  status: RevenuePlanImportCellStatus
}

export interface RevenuePlanImportRow {
  rowIndex: number
  appStoreId: string
  appName: string
  platform: string
  isMapped: boolean
  selected: boolean
  cells: Record<string, RevenuePlanImportCell>
}

export interface RevenuePlanImportPreview {
  fileName: string
  months: RevenuePlanImportMonthColumn[]
  rows: RevenuePlanImportRow[]
  errors: string[]
}

export interface BuildRevenuePlanImportPreviewOptions {
  fileName: string
  knownAppStoreIds: ReadonlySet<string>
  currentPlannedRevenueByStoreMonth: ReadonlyMap<string, number>
}

function normalizeImportHeader(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")

  switch (normalized) {
    case "app":
    case "appid":
    case "appstoreid":
    case "storeid":
      return "app_store_id"
    case "app_name":
    case "name":
      return "app_name"
    default:
      return normalized
  }
}

function parseMonthHeader(header: string): string | null {
  const trimmed = header.trim()
  if (!trimmed) return null

  return (
    parseMonthHeaderWithFormat(trimmed, "MM/yyyy") ??
    parseMonthHeaderWithFormat(trimmed, "M/yyyy") ??
    parseMonthHeaderWithFormat(trimmed, "yyyy-MM")
  )
}

function parseMonthHeaderWithFormat(value: string, format: string): string | null {
  if (format === "yyyy-MM") {
    const match = value.match(/^(\d{4})-(\d{1,2})$/)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`
  }

  const match = value.match(/^(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const month = Number(match[1])
  const year = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`
}

export function extractMonthKeysFromWorkbook(workbook: XLSX.WorkBook): string[] {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][]

  const headerRow = matrix[0] ?? []
  const monthKeys: string[] = []
  headerRow.forEach((cell) => {
    const monthKey = parseMonthHeader(String(cell ?? ""))
    if (monthKey) monthKeys.push(monthKey)
  })

  return monthKeys.sort()
}

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null

  if (typeof value === "number" && Number.isFinite(value)) return value

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = raw.replace(/\$/g, "").replace(/,/g, "").replace(/%/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function storeMonthKey(appStoreId: string, monthKey: string) {
  return `${appStoreId.toLowerCase()}|${monthKey}`
}

function classifyCell(
  importedValue: number | null,
  currentValue: number | null | undefined,
): RevenuePlanImportCellStatus {
  if (importedValue == null) return "empty"

  if (currentValue == null || currentValue === undefined) return "new"
  if (Math.abs(importedValue - currentValue) < 0.005) return "unchanged"
  return "changed"
}

export function parseRevenuePlanImportWorkbook(
  workbook: XLSX.WorkBook,
  options: BuildRevenuePlanImportPreviewOptions,
): RevenuePlanImportPreview {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return {
      fileName: options.fileName,
      months: [],
      rows: [],
      errors: ["Excel file does not contain any worksheet."],
    }
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][]

  if (matrix.length === 0) {
    return {
      fileName: options.fileName,
      months: [],
      rows: [],
      errors: ["Excel file is empty."],
    }
  }

  const headerRow = matrix[0] ?? []
  const headerMap = new Map<string, number>()
  headerRow.forEach((cell, index) => {
    const key = normalizeImportHeader(String(cell ?? ""))
    if (key && !headerMap.has(key)) headerMap.set(key, index)
  })

  const appStoreIdColumn = headerMap.get("app_store_id")
  if (appStoreIdColumn == null) {
    return {
      fileName: options.fileName,
      months: [],
      rows: [],
      errors: ["Excel must include App Store ID column."],
    }
  }

  const appNameColumn = headerMap.get("app_name")
  const platformColumn = headerMap.get("platform")

  const monthColumns: RevenuePlanImportMonthColumn[] = []
  headerRow.forEach((cell, index) => {
    const monthKey = parseMonthHeader(String(cell ?? ""))
    if (!monthKey) return

    monthColumns.push({
      monthKey,
      headerLabel: formatMonthTableHeader(monthKey),
      columnIndex: index,
      selected: true,
    })
  })

  if (monthColumns.length === 0) {
    return {
      fileName: options.fileName,
      months: [],
      rows: [],
      errors: ["Excel must include at least one month column (MM/yyyy) after Platform."],
    }
  }

  monthColumns.sort((a, b) => a.columnIndex - b.columnIndex)

  const rows: RevenuePlanImportRow[] = []
  const errors: string[] = []

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex] ?? []
    const appStoreId = String(row[appStoreIdColumn] ?? "").trim()
    if (!appStoreId) continue

    const appName = appNameColumn != null ? String(row[appNameColumn] ?? "").trim() : ""
    const platform = platformColumn != null ? String(row[platformColumn] ?? "").trim() : ""
    const isMapped = options.knownAppStoreIds.has(appStoreId.toLowerCase())

    const cells: Record<string, RevenuePlanImportCell> = {}
    for (const month of monthColumns) {
      const importedValue = parseOptionalNumber(row[month.columnIndex])
      const currentValue =
        options.currentPlannedRevenueByStoreMonth.get(storeMonthKey(appStoreId, month.monthKey)) ?? null

      cells[month.monthKey] = {
        importedValue,
        currentValue,
        status: classifyCell(importedValue, currentValue),
      }
    }

    rows.push({
      rowIndex: rowIndex + 1,
      appStoreId,
      appName,
      platform,
      isMapped,
      selected: isMapped,
      cells,
    })
  }

  if (rows.length === 0) {
    errors.push("No app rows found in the Excel file.")
  }

  return {
    fileName: options.fileName,
    months: monthColumns,
    rows,
    errors,
  }
}

export async function parseRevenuePlanImportFile(
  file: File,
  options: Omit<BuildRevenuePlanImportPreviewOptions, "fileName">,
): Promise<RevenuePlanImportPreview> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false })
  return parseRevenuePlanImportWorkbook(workbook, {
    ...options,
    fileName: file.name,
  })
}

export function buildImportItemsFromPreview(
  preview: RevenuePlanImportPreview,
): Array<{ appStoreId: string; month: string; plannedRevenue: number }> {
  const selectedMonths = new Set(preview.months.filter((month) => month.selected).map((month) => month.monthKey))
  const items: Array<{ appStoreId: string; month: string; plannedRevenue: number }> = []

  for (const row of preview.rows) {
    if (!row.selected || !row.isMapped) continue

    for (const monthKey of selectedMonths) {
      const cell = row.cells[monthKey]
      if (!cell || cell.importedValue == null) continue

      items.push({
        appStoreId: row.appStoreId,
        month: monthKey,
        plannedRevenue: cell.importedValue,
      })
    }
  }

  return items
}

export function countSelectedImportItems(preview: RevenuePlanImportPreview): number {
  return buildImportItemsFromPreview(preview).length
}

export interface SelectedImportMonthSummary {
  monthKey: string
  headerLabel: string
  selected: boolean
}

export interface SelectedImportSummary {
  valueCount: number
  monthCount: number
  appCount: number
  months: SelectedImportMonthSummary[]
}

export function summarizeSelectedImportPreview(preview: RevenuePlanImportPreview): SelectedImportSummary {
  const items = buildImportItemsFromPreview(preview)
  const selectedMonths = preview.months.filter((month) => month.selected)

  return {
    valueCount: items.length,
    monthCount: selectedMonths.length,
    appCount: new Set(items.map((item) => item.appStoreId.toLowerCase())).size,
    months: preview.months.map((month) => ({
      monthKey: month.monthKey,
      headerLabel: month.headerLabel,
      selected: month.selected,
    })),
  }
}
