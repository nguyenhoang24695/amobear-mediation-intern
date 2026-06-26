"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { subDays } from "date-fns"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ImageIcon, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { reportsApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { toApiDateString } from "@/lib/reports/report-date-filter-utils"
import type { App } from "@/types/api"
import type { WaterfallNetworkRow } from "@/types/reports"

const CHART_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#6366f1", "#22c55e", "#ec4899", "#eab308"]

function formatCurrency(v: number): string {
  if (!Number.isFinite(v)) return "—"
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}

function matchesAppSearch(app: App, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const fields = [
    app.displayName,
    app.name,
    app.appId,
    app.appStoreId,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toLowerCase())

  return fields.some((value) => value.includes(normalized))
}

function WaterfallReportAppRow({
  app,
  checked,
  onToggle,
}: {
  app: App
  checked: boolean
  onToggle: () => void
}) {
  const primaryLabel = app.displayName || app.name || app.appId
  const appStoreId = app.appStoreId?.trim()

  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
      <input
        type="checkbox"
        className="mt-1 shrink-0"
        checked={checked}
        onChange={onToggle}
      />
      <Avatar className="h-8 w-8 shrink-0 rounded-md">
        {app.iconUri?.trim() ? (
          <AvatarImage src={app.iconUri.trim()} alt={primaryLabel} className="rounded-md object-cover" />
        ) : null}
        <AvatarFallback className="rounded-md bg-muted">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={primaryLabel}>
          {primaryLabel}
        </p>
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={app.appId}>
          {app.appId}
        </p>
        {appStoreId ? (
          <p className="truncate font-mono text-[10px] text-muted-foreground" title={appStoreId}>
            {appStoreId}
          </p>
        ) : null}
      </div>
    </label>
  )
}

export function WaterfallReportContent() {
  const defaultEnd = new Date()
  const defaultStart = subDays(defaultEnd, 6)
  const [from, setFrom] = useState(toApiDateString(defaultStart))
  const [to, setTo] = useState(toApiDateString(defaultEnd))
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [appSearchQuery, setAppSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [networks, setNetworks] = useState<WaterfallNetworkRow[]>([])
  const [totals, setTotals] = useState<{ revenue: number; impressions: number } | null>(null)

  const { data: appsResponse } = useApi(() => structureApi.getApps(), { cacheKey: "waterfall_report_apps" })
  const apps = useMemo(() => {
    const list = appsResponse?.apps ?? []
    return list.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

  const filteredApps = useMemo(
    () => apps.filter((app) => matchesAppSearch(app, appSearchQuery)),
    [apps, appSearchQuery],
  )

  const chartData = useMemo(
    () =>
      networks.slice(0, 10).map((n) => ({
        name: n.adSourceLabel || n.adSourceId,
        revenue: n.revenue,
        sowPct: n.sowPct,
      })),
    [networks],
  )

  const handleRun = useCallback(async () => {
    if (selectedAppIds.length === 0) {
      toast.error("Select at least one app.")
      return
    }
    setLoading(true)
    try {
      const result = await reportsApi.queryWaterfall({ from, to, appIds: selectedAppIds })
      setNetworks(result.networks ?? [])
      setTotals({ revenue: result.totalRevenue, impressions: result.totalImpressions })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load waterfall report.")
      setNetworks([])
      setTotals(null)
    } finally {
      setLoading(false)
    }
  }, [from, to, selectedAppIds])

  const toggleApp = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId],
    )
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border px-6 py-4">
        <Link href="/reports" className="text-xs text-muted-foreground hover:text-primary">
          All reports
        </Link>
        <span className="mx-1.5 text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground">Waterfall optimization</span>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Waterfall Optimization Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, eCPM, fill rate and Share of Wallet by ad network from mediation data.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-b border-border px-6 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-border px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-border px-2"
          />
        </label>
        <Button type="button" className="h-9 bg-primary hover:bg-primary/90" disabled={loading} onClick={handleRun}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Apps</p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={appSearchQuery}
              onChange={(event) => setAppSearchQuery(event.target.value)}
              placeholder="Search name, appId, store id..."
              className="h-9 pl-9"
            />
          </div>
          <div className="space-y-1">
            {filteredApps.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {apps.length === 0 ? "No apps available." : "No apps match your search."}
              </p>
            ) : (
              filteredApps.map((app) => (
                <WaterfallReportAppRow
                  key={app.appId}
                  app={app}
                  checked={selectedAppIds.includes(app.appId!)}
                  onToggle={() => toggleApp(app.appId!)}
                />
              ))
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : networks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Select apps and date range, then click Apply.
            </p>
          ) : (
            <>
              {totals ? (
                <div className="mb-6 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total revenue</span>
                    <p className="text-xl font-semibold tabular-nums">{formatCurrency(totals.revenue)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total impressions</span>
                    <p className="text-xl font-semibold tabular-nums">{totals.impressions.toLocaleString()}</p>
                  </div>
                </div>
              ) : null}

              {chartData.length > 0 ? (
                <div className="mb-8 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={56} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Network</th>
                      <th className="px-4 py-3 text-right">Impressions</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">eCPM</th>
                      <th className="px-4 py-3 text-right">Fill rate</th>
                      <th className="px-4 py-3 text-right">SoW %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networks.map((row, i) => (
                      <tr key={row.adSourceId} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          {row.adSourceLabel || row.adSourceId}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">${row.ecpm.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.fillRate.toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.sowPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
