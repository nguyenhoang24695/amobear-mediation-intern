import type { CustomReportCatalogItem } from "@/types/reports"
import type { CustomFormulaMetric } from "@/components/my-reports/hooks/use-my-report-config"
import { evaluateFormula } from "@/lib/reports/formula-engine"

function toNumeric(value: string | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildFormulaMetricCatalog(formulas: CustomFormulaMetric[]): CustomReportCatalogItem[] {
  return formulas.map((formula) => ({
    id: formula.id,
    label: formula.name,
    category: "custom",
    format: "number",
  }))
}

export function applyCustomFormulasToRows<
  T extends Record<string, string | number | null>,
>(
  rows: T[],
  formulas: CustomFormulaMetric[],
  metricCatalog: CustomReportCatalogItem[],
): T[] {
  if (formulas.length === 0) return rows

  const catalogIds = new Set(metricCatalog.map((m) => m.id))

  return rows.map((row) => {
    const numericValues: Record<string, number | null> = {}
    for (const metricId of catalogIds) {
      numericValues[metricId] = toNumeric(row[metricId])
    }

    const next = { ...row } as T
    for (const formula of formulas) {
      ;(next as Record<string, string | number | null>)[formula.id] = evaluateFormula(
        formula.expression,
        numericValues,
      )
    }
    return next
  })
}

export function applyCustomFormulasToTotals(
  totals: Record<string, string | number | null>,
  formulas: CustomFormulaMetric[],
  metricCatalog: CustomReportCatalogItem[],
): Record<string, string | number | null> {
  if (formulas.length === 0) return totals

  const numericValues: Record<string, number | null> = {}
  for (const metric of metricCatalog) {
    numericValues[metric.id] = toNumeric(totals[metric.id])
  }

  const next = { ...totals }
  for (const formula of formulas) {
    next[formula.id] = evaluateFormula(formula.expression, numericValues)
  }
  return next
}
