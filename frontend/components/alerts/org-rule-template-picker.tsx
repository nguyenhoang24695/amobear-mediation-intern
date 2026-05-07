"use client"

import { useMemo, useState } from "react"
import { Search, Copy, AlertTriangle, AlertCircle, Info, Layers, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatRuleConditionsSummary, parseAlertRuleConfig } from "./alert-rule-details-dialog"
import type { AlertRule } from "@/types/api"
import { format } from "date-fns"

interface OrgRuleTemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rules: AlertRule[]
  /** Called when the user chooses a template. */
  onSelect: (rule: AlertRule) => void
}

function severityIcon(severity: string) {
  const s = (severity || "").toUpperCase()
  if (s === "HIGH" || s === "CRITICAL")
    return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
  if (s === "MEDIUM" || s === "WARNING")
    return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
  return <Info className="w-3.5 h-3.5 text-blue-500" />
}

function severityBadgeClass(severity: string) {
  const s = (severity || "").toUpperCase()
  if (s === "HIGH" || s === "CRITICAL") return "bg-red-100 text-red-700 border-red-200"
  if (s === "MEDIUM" || s === "WARNING") return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-blue-100 text-blue-700 border-blue-200"
}

function severityLabel(severity: string) {
  const s = (severity || "").toUpperCase()
  if (s === "HIGH" || s === "CRITICAL") return "Critical"
  if (s === "MEDIUM" || s === "WARNING") return "Warning"
  return "Info"
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return format(new Date(iso), "dd/MM/yyyy")
  } catch {
    return iso
  }
}

function extractMetricKeys(rule: AlertRule): string[] {
  const cfg = parseAlertRuleConfig(rule)
  if (!cfg) return []
  const keys = new Set<string>()
  if (cfg.metricKey) keys.add(cfg.metricKey)
  for (const c of cfg.conditions ?? []) {
    if (c.metricKey) keys.add(c.metricKey)
  }
  return [...keys]
}

function formatScopeCount(rule: AlertRule): string {
  const cfg = parseAlertRuleConfig(rule)
  if (!cfg?.scope) return "All apps"
  if (cfg.scope.allApps) return "All apps"
  const n = cfg.scope.appIds?.length ?? 0
  return n === 0 ? "All apps" : `${n} app${n !== 1 ? "s" : ""}`
}

export function OrgRuleTemplatePicker({
  open,
  onOpenChange,
  rules,
  onSelect,
}: OrgRuleTemplatePickerProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rules
    return rules.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true
      const metrics = extractMetricKeys(r)
      if (metrics.some((m) => m.toLowerCase().includes(q))) return true
      const conditions = formatRuleConditionsSummary(r).toLowerCase()
      if (conditions.includes(q)) return true
      return false
    })
  }, [rules, search])

  /** Sort: recently triggered first, then alphabetical */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aTime = a.lastTriggeredAt ? new Date(a.lastTriggeredAt).getTime() : 0
      const bTime = b.lastTriggeredAt ? new Date(b.lastTriggeredAt).getTime() : 0
      if (bTime !== aTime) return bTime - aTime
      return a.name.localeCompare(b.name)
    })
  }, [filtered])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-slate-200">
          <SheetTitle className="text-lg">Use an Org Template</SheetTitle>
          <SheetDescription>
            Pick an active org-wide alert rule to pre-fill your new personal alert. You can adjust
            everything before saving.
          </SheetDescription>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, metric…"
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Search className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium">No templates found</p>
              {search && (
                <p className="text-xs text-slate-400">Try a different search term</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((rule) => {
                const metrics = extractMetricKeys(rule)
                const conditionsSummary = formatRuleConditionsSummary(rule)
                const scopeLabel = formatScopeCount(rule)

                return (
                  <li key={rule.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {severityIcon(rule.severity)}
                        <span className="text-sm font-semibold text-slate-900 truncate">
                          {rule.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 leading-5 border ${severityBadgeClass(rule.severity)}`}
                        >
                          {severityLabel(rule.severity)}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{conditionsSummary}</p>

                      <div className="flex items-center gap-3 flex-wrap">
                        {metrics.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-500">{metrics.join(", ")}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Layers className="w-3 h-3" />
                          {scopeLabel}
                        </span>
                        {rule.lastTriggeredAt && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            Last triggered {formatRelative(rule.lastTriggeredAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 gap-1.5 text-xs"
                      onClick={() => {
                        onSelect(rule)
                        onOpenChange(false)
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Use
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            {sorted.length} template{sorted.length !== 1 ? "s" : ""} — sorted by most recently triggered
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
