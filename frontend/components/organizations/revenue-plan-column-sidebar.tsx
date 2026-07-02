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
        "flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-muted/40 via-card to-card text-foreground shadow-sm xl:w-[300px]",
        className,
      )}
    >
      <div className="border-b border-border/70 bg-background/60 px-4 py-3 backdrop-blur">
        <h3 className="text-sm font-semibold text-foreground">Column display</h3>
        <p className="mt-1 text-xs text-muted-foreground">Choose metrics shown for each month.</p>
      </div>

      <div className="flex-1 grid gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 xl:grid-cols-1">
        {groups.map((group) => {
          const groupColumns = REVENUE_PLAN_COLUMNS.filter((column) => column.group === group)

          return (
            <div key={group} className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {GROUP_LABELS[group]}
              </Label>
              <div className="space-y-2">
                {groupColumns.map((column) => (
                  <div key={column.id} className="space-y-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
                      <Checkbox
                        checked={visibility[column.id]}
                        onCheckedChange={(value) => toggleColumn(column.id, value === true)}
                        aria-label={`Show ${column.label}`}
                      />
                      <span className="font-medium text-foreground">{column.label}</span>
                    </label>
                    {blockedColumnId === column.id ? (
                      <p className="px-1 text-xs text-amber-600 dark:text-amber-400">
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

      <div className="border-t border-border/70 bg-background/60 px-4 py-3 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full bg-background"
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
