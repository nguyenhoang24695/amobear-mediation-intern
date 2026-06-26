"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { dataSourcesApi } from "@/lib/api/services"
import type { DataSourceOverviewItemDto, JobsTestBackfillActionDto, SourceDetailsDto, SourceTableHealthDto } from "@/types/api"
import { BackfillDialog } from "./backfill-dialog"
import { QonversionDetailsIntro } from "./qonversion-details-intro"

const LAYER_SECTION_ORDER = ["bronze", "silver", "gold"] as const
const DAY_OPTIONS = [7, 14, 30] as const

function inferLayerFromGroupKey(groupKey: string): string {
  const i = groupKey.indexOf(".")
  if (i <= 0) return "bronze"
  return groupKey.slice(0, i).toLowerCase()
}

function cellClass(status: string): string {
  switch (status) {
    case "ok":
      return "bg-emerald-100 border-emerald-300 text-emerald-900"
    case "missing":
      return "bg-destructive/10 border-destructive/30 text-destructive"
    case "anomaly":
      return "bg-amber-100 border-amber-300 text-amber-900"
    default:
      return "bg-muted border-border text-muted-foreground"
  }
}

function cardTone(t: SourceTableHealthDto): string {
  if (t.missingCount > 0) return "border-destructive/30 bg-destructive/10"
  if (t.anomalyCount > 0) return "border-amber-200 bg-amber-50/40"
  return "border-border bg-card"
}

function TableHealthCard({
  table,
  onRunAction,
}: {
  table: SourceTableHealthDto
  onRunAction: (a: JobsTestBackfillActionDto) => void
}) {
  const [perAppOpen, setPerAppOpen] = useState(false)
  const showPerApp = table.isFirebaseRollup && table.firebasePerApp && table.firebasePerApp.length > 0
  const layerLabel = (table.starRocksLayer ?? inferLayerFromGroupKey(table.groupKey)).toLowerCase()

  return (
    <Card className={cn("border", cardTone(table))}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                {layerLabel}
              </Badge>
              <CardTitle className="break-all text-base font-semibold text-foreground font-mono">{table.displayName ?? table.groupKey}</CardTitle>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{table.groupKey}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {table.median != null && (
              <Badge variant="outline" className="text-[10px]">
                median {table.median}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
              missing {table.missingCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800">
              anomaly {table.anomalyCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {table.daily.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count ?? "—"} (${d.status})`}
              className={cn(
                "w-7 h-8 rounded border text-[10px] flex items-center justify-center font-mono shrink-0",
                cellClass(d.status)
              )}
            >
              {d.date.slice(8, 10)}
            </div>
          ))}
        </div>
        {table.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {table.suggestedActions.map((a, i) => (
              <Button key={`${a.endpoint}-${i}`} size="sm" variant="secondary" className="h-auto min-h-8 whitespace-normal text-xs" onClick={() => onRunAction(a)}>
                {a.label}
              </Button>
            ))}
          </div>
        )}
        {showPerApp && (
          <Collapsible open={perAppOpen} onOpenChange={setPerAppOpen} className="border border-border rounded-md mt-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-9 px-2 text-foreground">
                <span className="text-xs font-medium">Per-app breakdown ({table.firebasePerApp!.length})</span>
                {perAppOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-3 space-y-3">
              {table.firebasePerApp!.map((child) => (
                <div key={child.groupKey} className="rounded-md border border-border bg-muted/40 p-2 space-y-2">
                  <p className="break-all text-xs font-mono text-foreground">{child.displayName ?? child.groupKey}</p>
                  <div className="flex flex-wrap gap-1">
                    {child.daily.map((d) => (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.count ?? "—"} (${d.status})`}
                        className={cn(
                          "w-6 h-7 rounded border text-[9px] flex items-center justify-center font-mono",
                          cellClass(d.status)
                        )}
                      >
                        {d.date.slice(8, 10)}
                      </div>
                    ))}
                  </div>
                  {child.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {child.suggestedActions.map((a, j) => (
                        <Button key={`${child.groupKey}-${a.endpoint}-${j}`} size="sm" variant="outline" className="h-auto min-h-7 whitespace-normal text-[10px]" onClick={() => onRunAction(a)}>
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

export function SourceDetailsTab({
  sources,
  enabled,
}: {
  sources: DataSourceOverviewItemDto[]
  enabled: boolean
}) {
  const [sourceKey, setSourceKey] = useState<string>("")
  const [days, setDays] = useState<number>(14)
  const [details, setDetails] = useState<SourceDetailsDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<JobsTestBackfillActionDto | null>(null)

  useEffect(() => {
    if (sources.length > 0 && !sourceKey) {
      setSourceKey(sources[0].key)
    }
  }, [sources, sourceKey])

  const load = useCallback(async () => {
    if (!enabled || !sourceKey) return
    setLoading(true)
    setError(null)
    try {
      const d = await dataSourcesApi.getSourceDetails(sourceKey, days)
      setDetails(d)
    } catch (e: unknown) {
      setDetails(null)
      setError(e instanceof Error ? e.message : "Failed to load details")
    } finally {
      setLoading(false)
    }
  }, [enabled, sourceKey, days])

  useEffect(() => {
    void load()
  }, [load])

  const tablesByLayer = useMemo(() => {
    if (!details?.tables.length) return new Map<string, SourceTableHealthDto[]>()
    const m = new Map<string, SourceTableHealthDto[]>()
    for (const t of details.tables) {
      const L = (t.starRocksLayer ?? inferLayerFromGroupKey(t.groupKey)).toLowerCase()
      const arr = m.get(L) ?? []
      arr.push(t)
      m.set(L, arr)
    }
    return m
  }, [details])

  const openAction = (a: JobsTestBackfillActionDto) => {
    setSelectedAction(a)
    setDialogOpen(true)
  }

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading sources…</p>
  }

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">Switch to this tab to load health details.</p>
  }

  const summary = details?.summary

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Details — health by day</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bronze, silver, and gold together for the selected source. Last {days} complete UTC days ending yesterday.{" "}
            <span className="font-medium">Missing</span> = zero rows; <span className="font-medium">Anomaly</span> = count &lt; 30% of median
            (non-zero).
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
          <Select value={sourceKey} onValueChange={setSourceKey}>
            <SelectTrigger className="h-9 w-full sm:w-[200px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="h-9 w-full sm:w-[100px]">
              <SelectValue placeholder="Days" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-9 w-full sm:w-auto" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      {sourceKey === "qonversion" && <QonversionDetailsIntro />}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {details && (
        <p className="text-xs text-muted-foreground font-mono">
          Range {details.rangeFrom} → {details.rangeTo} UTC
        </p>
      )}

      {summary && details && (
        <Card className="border-border bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary — all layers</CardTitle>
            <p className="text-sm text-muted-foreground">
              {summary.tablesWithAnyIssue > 0 ? (
                <>
                  <span className="font-medium text-foreground">{summary.tablesWithAnyIssue}</span> table(s) with missing or anomaly days;{" "}
                  <span className="text-destructive font-medium">{summary.totalMissingDaySlots}</span> missing day slots,{" "}
                  <span className="text-amber-800 font-medium">{summary.totalAnomalyDaySlots}</span> anomaly day slots (rollup + per-app
                  Firebase counted).
                </>
              ) : (
                <>No missing or anomaly day slots in the last {days} days for configured tables.</>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.byLayer.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.byLayer.map((row) => (
                  <Badge key={row.layer} variant="outline" className="text-xs font-normal">
                    <span className="font-mono uppercase mr-1">{row.layer}</span>
                    {row.tableCount} tables · miss {row.missingDaySlots} · anom {row.anomalyDaySlots}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && !details && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {details &&
        LAYER_SECTION_ORDER.map((layerKey) => {
          const tables = tablesByLayer.get(layerKey)
          if (!tables?.length) return null
          return (
            <div key={layerKey} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{layerKey}</h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {tables.map((t) => (
                  <TableHealthCard key={`${layerKey}-${t.groupKey}`} table={t} onRunAction={openAction} />
                ))}
              </div>
            </div>
          )
        })}

      {details && details.tables.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No tables configured for this source.</p>
      )}

      <BackfillDialog open={dialogOpen} onOpenChange={setDialogOpen} sourceKey={sourceKey} action={selectedAction} onSuccess={() => void load()} />
    </div>
  )
}
