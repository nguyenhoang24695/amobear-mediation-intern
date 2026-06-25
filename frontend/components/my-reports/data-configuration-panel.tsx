"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import {
  MY_REPORT_DATA_CONFIG_CATEGORIES,
  MY_REPORT_CONFIG_LABELS,
  MY_REPORT_LOCKED_CONFIG_KEYS,
  normalizeEnabledConfigKeys,
  type MyReportConfigKey,
} from "@/lib/reports/my-report-data-config-catalog"
import { resolveConfigItemDisplayValue } from "@/lib/reports/my-report-config-tag-utils"

export type MyReportDataConfigurationPanelProps = {
  draft: MyReportConfig
  onToggleConfigKey: (key: MyReportConfigKey) => void
  onReset: () => void
  onApply: () => void
  applyDisabled?: boolean
  displayContext: {
    selectedAppLabel: string
    selectedTeamsLabel: string
  }
}

function ConfigRow({
  label,
  value,
  checked,
  disabled,
  onCheckedChange,
  dimmed,
}: {
  label: string
  value: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: () => void
  dimmed?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0",
        dimmed && "opacity-40",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={cn(disabled && "opacity-70")}
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
        <span className="truncate text-foreground">{label}</span>
        <span className="shrink-0 text-muted-foreground">{value}</span>
      </div>
    </div>
  )
}

export function MyReportDataConfigurationPanel({
  draft,
  onToggleConfigKey,
  onReset,
  onApply,
  applyDisabled = false,
  displayContext,
}: MyReportDataConfigurationPanelProps) {
  const [search, setSearch] = useState("")

  const enabledKeys = useMemo(
    () => new Set(normalizeEnabledConfigKeys(draft.enabledConfigKeys)),
    [draft.enabledConfigKeys],
  )

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MY_REPORT_DATA_CONFIG_CATEGORIES

    return MY_REPORT_DATA_CONFIG_CATEGORIES.map((cat) => ({
      ...cat,
      itemKeys: cat.itemKeys.filter((key) =>
        MY_REPORT_CONFIG_LABELS[key].toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.itemKeys.length > 0)
  }, [search])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-1">
        {filteredCategories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No matching filters.</p>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="py-1">
              <p className="py-2 text-xs font-medium text-muted-foreground">{category.label}</p>
              {category.itemKeys.map((key) => {
                const locked = MY_REPORT_LOCKED_CONFIG_KEYS.includes(key)
                const checked = enabledKeys.has(key)
                return (
                  <ConfigRow
                    key={key}
                    label={MY_REPORT_CONFIG_LABELS[key]}
                    value={resolveConfigItemDisplayValue(key, draft, displayContext)}
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={() => onToggleConfigKey(key)}
                    dimmed={!checked}
                  />
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 flex gap-2 border-t border-border bg-card p-3">
        <Button type="button" variant="outline" className="h-9 flex-1" onClick={onReset}>
          Reset
        </Button>
        <Button
          type="button"
          className="h-9 flex-1 bg-primary hover:bg-primary/90"
          disabled={applyDisabled}
          onClick={onApply}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
