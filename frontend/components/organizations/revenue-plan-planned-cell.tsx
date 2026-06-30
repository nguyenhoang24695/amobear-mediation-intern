"use client"

import { useEffect, useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { organizationsApi, teamProfitApi } from "@/lib/api/services"

interface RevenuePlanPlannedCellProps {
  orgId?: string
  teamId?: string
  appStoreId: string
  month: string
  plannedRevenue: number
  hasPlan: boolean
  canEdit: boolean
  className?: string
  edgeBorderClass?: string
  onSaved: (appStoreId: string, month: string, plannedRevenue: number) => void
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parsePlannedRevenueInput(raw: string): number | null {
  const normalized = raw.trim().replace(/[$,\s]/g, "")
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function RevenuePlanPlannedCell({
  orgId,
  teamId,
  appStoreId,
  month,
  plannedRevenue,
  hasPlan,
  canEdit,
  className,
  edgeBorderClass,
  onSaved,
}: RevenuePlanPlannedCellProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(hasPlan ? String(plannedRevenue) : "")
    }
  }, [open, hasPlan, plannedRevenue])

  const cellClassName = cn(className, edgeBorderClass, "text-right text-sm tabular-nums")

  if (!canEdit) {
    return (
      <TableCell className={cellClassName}>
        {hasPlan ? formatCurrency(plannedRevenue) : "—"}
      </TableCell>
    )
  }

  const handleSave = async () => {
    const value = parsePlannedRevenueInput(draft)
    if (value == null) {
      toast({
        title: "Invalid value",
        description: "Enter a planned revenue amount greater than or equal to 0.",
        variant: "destructive",
      })
      return
    }

    if (hasPlan && value === plannedRevenue) {
      setOpen(false)
      return
    }

    setSaving(true)
    try {
      if (teamId) {
        await teamProfitApi.upsertPlan(teamId, month, {
          appStoreId,
          plannedRevenue: value,
          plannedCost: 0,
          plannedProfit: 0,
        })
      } else if (orgId) {
        const result = await organizationsApi.importProfitPlanItems(orgId, [
          { appStoreId, month, plannedRevenue: value },
        ])

        if (result.skipped > 0 && result.imported === 0 && result.updated === 0) {
          throw new Error(result.errors[0] ?? "Could not save planned revenue.")
        }
      } else {
        throw new Error("Missing organization or team context for saving planned revenue.")
      }

      onSaved(appStoreId, month, value)
      setOpen(false)
      toast({
        title: "Planned revenue updated",
        description: `${formatCurrency(value)} for ${month}.`,
      })
    } catch (err) {
      console.error("Failed to update planned revenue:", err)
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not save planned revenue.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableCell className={cellClassName}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group inline-flex w-full items-center justify-end gap-1 rounded px-1 py-0.5 text-right hover:bg-muted"
            aria-label={`Edit planned revenue for ${month}`}
          >
            <span>{hasPlan ? formatCurrency(plannedRevenue) : "—"}</span>
            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 space-y-3 p-3">
          <div className="space-y-1.5">
            <Label htmlFor={`planned-revenue-${appStoreId}-${month}`} className="text-xs text-muted-foreground">
              Planned Revenue ({month})
            </Label>
            <Input
              id={`planned-revenue-${appStoreId}-${month}`}
              type="number"
              min={0}
              step={0.01}
              value={draft}
              disabled={saving}
              placeholder="0.00"
              className="h-9 bg-background tabular-nums"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSave()
                }
                if (event.key === "Escape") {
                  setOpen(false)
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </TableCell>
  )
}
