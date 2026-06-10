"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createEmptyColumnFilterCondition,
  DIMENSION_COLUMN_FILTER_OPERATORS,
  METRIC_COLUMN_FILTER_OPERATORS,
  normalizeColumnFilterConditions,
  type ColumnFilterCondition,
  type ColumnKind,
} from "@/lib/reports/column-filter-utils"

export type ColumnFilterPopoverProps = {
  columnLabel: string
  columnKind: ColumnKind
  active: boolean
  savedConditions: ColumnFilterCondition[]
  trigger: React.ReactNode
  onApply: (conditions: ColumnFilterCondition[]) => void
  /** Pivot dimension column — pick which dimension each condition applies to. */
  dimensionOptions?: Array<{ id: string; label: string }>
}

export function ColumnFilterPopover({
  columnLabel,
  columnKind,
  active,
  savedConditions,
  trigger,
  onApply,
  dimensionOptions,
}: ColumnFilterPopoverProps) {
  const defaultDimensionId = dimensionOptions?.[0]?.id
  const hasDimensionPicker = Boolean(dimensionOptions && dimensionOptions.length > 0)

  const [open, setOpen] = useState(false)
  const [draftConditions, setDraftConditions] = useState<ColumnFilterCondition[]>([])

  const operators =
    columnKind === "metric" ? METRIC_COLUMN_FILTER_OPERATORS : DIMENSION_COLUMN_FILTER_OPERATORS

  useEffect(() => {
    if (!open) return
    setDraftConditions(
      savedConditions.length > 0
        ? savedConditions.map((c) => ({ ...c, id: crypto.randomUUID() }))
        : [
            createEmptyColumnFilterCondition(columnKind, {
              dimensionId: defaultDimensionId,
            }),
          ],
    )
  }, [open, savedConditions, columnKind, defaultDimensionId])

  const updateCondition = (id: string, patch: Partial<ColumnFilterCondition>) => {
    setDraftConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const removeCondition = (id: string) => {
    setDraftConditions((prev) => {
      const next = prev.filter((c) => c.id !== id)
      return next.length > 0
        ? next
        : [createEmptyColumnFilterCondition(columnKind, { dimensionId: defaultDimensionId })]
    })
  }

  const addCondition = () => {
    setDraftConditions((prev) => [
      ...prev,
      createEmptyColumnFilterCondition(columnKind, { dimensionId: defaultDimensionId }),
    ])
  }

  const handleReset = () => {
    setDraftConditions([
      createEmptyColumnFilterCondition(columnKind, { dimensionId: defaultDimensionId }),
    ])
    onApply([])
    setOpen(false)
  }

  const handleApply = () => {
    onApply(normalizeColumnFilterConditions(draftConditions))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-600">
            Show rows that match <span className="font-semibold text-gray-900">all</span> of the
            following conditions
          </p>
          <p className="mt-1 text-xs text-gray-400">{columnLabel}</p>
        </div>

        <div className="space-y-2 px-4 py-3">
          {draftConditions.map((condition) => (
              <div
                key={condition.id}
                className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50/80 p-2"
              >
              <div className="grid min-w-0 flex-1 gap-2">
                {hasDimensionPicker ? (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-gray-500">Dimension</span>
                    <Select
                      value={condition.dimensionId ?? defaultDimensionId ?? ""}
                      onValueChange={(value) =>
                        updateCondition(condition.id, { dimensionId: value })
                      }
                    >
                      <SelectTrigger className="h-8 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dimensionOptions!.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-gray-500">Condition type</span>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      updateCondition(condition.id, {
                        operator: value as ColumnFilterCondition["operator"],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-gray-500">Value</span>
                  <Input
                    className="h-8 bg-white text-xs"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    placeholder={columnKind === "metric" ? "0" : "Text"}
                  />
                </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 h-8 w-8 shrink-0 text-gray-400 hover:text-red-600"
                onClick={() => removeCondition(condition.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={addCondition}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <Button type="button" variant="outline" className="h-8" onClick={handleReset}>
            Reset
          </Button>
          <Button
            type="button"
            className="h-8 bg-blue-600 hover:bg-blue-700"
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
