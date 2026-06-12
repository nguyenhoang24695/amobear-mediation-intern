"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  createDefaultColumnVisibility,
  REVENUE_PLAN_COLUMNS,
  type RevenuePlanColumnGroup,
  type RevenuePlanColumnId,
  type RevenuePlanColumnVisibility,
} from "@/lib/revenue-plan/revenue-plan-column-config"

const GROUP_LABELS: Record<RevenuePlanColumnGroup, string> = {
  revenue: "Revenue",
  performance: "Performance",
}

interface RevenuePlanColumnSidebarProps {
  visibility: RevenuePlanColumnVisibility
  onChange: (visibility: RevenuePlanColumnVisibility) => void
  className?: string
}

export function RevenuePlanColumnSidebar({
  visibility,
  onChange,
  className,
}: RevenuePlanColumnSidebarProps) {
  const [blockedColumnId, setBlockedColumnId] = useState<RevenuePlanColumnId | null>(null)

  const toggleColumn = (columnId: RevenuePlanColumnId, checked: boolean) => {
    const visibleCount = REVENUE_PLAN_COLUMNS.filter((column) =>
      column.id === columnId ? checked : visibility[column.id],
    ).length

    if (!checked && visibleCount === 0) {
      setBlockedColumnId(columnId)
      return
    }

    setBlockedColumnId(null)
    onChange({ ...visibility, [columnId]: checked })
  }

  const groups: RevenuePlanColumnGroup[] = ["revenue", "performance"]

  return (
    <aside
      className={cn(
        "flex w-[240px] shrink-0 flex-col border-l border-slate-200 bg-slate-50/50",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Column display</h3>
        <p className="mt-1 text-xs text-slate-500">Choose metrics shown for each month.</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {groups.map((group) => {
          const groupColumns = REVENUE_PLAN_COLUMNS.filter((column) => column.group === group)

          return (
            <div key={group} className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {GROUP_LABELS[group]}
              </Label>
              <div className="space-y-2">
                {groupColumns.map((column) => (
                  <div key={column.id} className="space-y-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm">
                      <Checkbox
                        checked={visibility[column.id]}
                        onCheckedChange={(value) => toggleColumn(column.id, value === true)}
                        aria-label={`Show ${column.label}`}
                      />
                      <span>{column.label}</span>
                    </label>
                    {blockedColumnId === column.id ? (
                      <p className="px-1 text-xs text-amber-700">
                        At least one column must remain visible.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full bg-white"
          onClick={() => {
            setBlockedColumnId(null)
            onChange(createDefaultColumnVisibility())
          }}
        >
          Reset to default
        </Button>
      </div>
    </aside>
  )
}
