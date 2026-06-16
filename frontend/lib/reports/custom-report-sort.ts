import { isValid, parse } from "date-fns"

export type CustomReportRow = Record<string, string | number | null>

const CUSTOM_REPORT_DATE_FORMATS = ["M/d/yyyy", "yyyy-MM-dd"] as const

function parseCustomReportDate(value: string): number | null {
  for (const fmt of CUSTOM_REPORT_DATE_FORMATS) {
    const parsed = parse(value, fmt, new Date())
    if (isValid(parsed)) return parsed.getTime()
  }
  return null
}

function compareCustomReportValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  sortBy: string,
): number {
  const aMissing = a == null || a === ""
  const bMissing = b == null || b === ""
  if (aMissing && bMissing) return 0
  if (aMissing) return -1
  if (bMissing) return 1

  if (sortBy === "date") {
    const aTime = parseCustomReportDate(String(a))
    const bTime = parseCustomReportDate(String(b))
    if (aTime != null && bTime != null) return aTime - bTime
  }

  const aNum = typeof a === "number" ? a : Number(a)
  const bNum = typeof b === "number" ? b : Number(b)
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum

  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
}

export function sortCustomReportRows(
  rows: CustomReportRow[],
  sortBy: string,
  sortDir: "asc" | "desc",
): CustomReportRow[] {
  if (rows.length <= 1 || !sortBy) return rows

  const direction = sortDir === "asc" ? 1 : -1
  return [...rows].sort(
    (left, right) =>
      direction * compareCustomReportValues(left[sortBy], right[sortBy], sortBy),
  )
}
