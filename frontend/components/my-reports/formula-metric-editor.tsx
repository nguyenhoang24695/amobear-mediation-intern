"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomFormulaMetric } from "@/components/my-reports/hooks/use-my-report-config"
import { validateFormula } from "@/lib/reports/formula-engine"
import { cn } from "@/lib/utils"

function slugifyFormulaId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return base ? `formula_${base}` : `formula_${Date.now()}`
}

export type FormulaMetricEditorProps = {
  formulas: CustomFormulaMetric[]
  availableMetricIds: string[]
  metricLabels: Record<string, string>
  onChange: (formulas: CustomFormulaMetric[]) => void
}

export function FormulaMetricEditor({
  formulas,
  availableMetricIds,
  metricLabels,
  onChange,
}: FormulaMetricEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(formulas[0]?.id ?? null)

  const editingFormula = formulas.find((f) => f.id === editingId) ?? null

  const validation = useMemo(() => {
    if (!editingFormula?.expression.trim()) return null
    return validateFormula(editingFormula.expression, availableMetricIds)
  }, [editingFormula?.expression, availableMetricIds])

  const upsertFormula = (next: CustomFormulaMetric) => {
    const exists = formulas.some((f) => f.id === next.id)
    onChange(exists ? formulas.map((f) => (f.id === next.id ? next : f)) : [...formulas, next])
  }

  const handleAdd = () => {
    const formula: CustomFormulaMetric = {
      id: slugifyFormulaId(`metric_${formulas.length + 1}`),
      name: `Custom metric ${formulas.length + 1}`,
      expression: "",
    }
    onChange([...formulas, formula])
    setEditingId(formula.id)
  }

  const handleDelete = (id: string) => {
    const next = formulas.filter((f) => f.id !== id)
    onChange(next)
    if (editingId === id) setEditingId(next[0]?.id ?? null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom formulas</p>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {formulas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create computed metrics using + - * / and metric variable names.
        </p>
      ) : (
        <div className="space-y-1">
          {formulas.map((formula) => (
            <button
              key={formula.id}
              type="button"
              onClick={() => setEditingId(formula.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted/60",
                editingId === formula.id && "bg-primary/10 text-primary",
              )}
            >
              <span className="flex-1 truncate">{formula.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-red-600"
                onClick={(event) => {
                  event.stopPropagation()
                  handleDelete(formula.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </button>
          ))}
        </div>
      )}

      {editingFormula ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="formula-name">Name</Label>
            <Input
              id="formula-name"
              value={editingFormula.name}
              onChange={(event) =>
                upsertFormula({ ...editingFormula, name: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formula-expression">Expression</Label>
            <Input
              id="formula-expression"
              value={editingFormula.expression}
              placeholder="ua_cost / adjust_installs"
              onChange={(event) =>
                upsertFormula({ ...editingFormula, expression: event.target.value })
              }
            />
            {validation && !validation.valid ? (
              <p className="text-xs text-red-600">{validation.error}</p>
            ) : validation?.valid ? (
              <p className="text-xs text-green-700">Valid expression</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Available variables</p>
            <div className="flex flex-wrap gap-1">
              {availableMetricIds.map((metricId) => (
                <button
                  key={metricId}
                  type="button"
                  className="rounded bg-muted px-2 py-0.5 text-xs text-foreground hover:bg-muted/80"
                  onClick={() =>
                    upsertFormula({
                      ...editingFormula,
                      expression: `${editingFormula.expression}${editingFormula.expression ? " " : ""}${metricId}`.trim(),
                    })
                  }
                >
                  {metricLabels[metricId] ?? metricId}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
