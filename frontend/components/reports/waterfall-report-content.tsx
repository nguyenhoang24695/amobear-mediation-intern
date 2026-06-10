"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { subDays } from "date-fns"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { reportsApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { toApiDateString } from "@/lib/reports/report-date-filter-utils"
import type { WaterfallNetworkRow } from "@/types/reports"

const CHART_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#6366f1", "#22c55e", "#ec4899", "#eab308"]

function formatCurrency(v: number): string {
  if (!Number.isFinite(v)) return "—"
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(2)}`
}

export function WaterfallReportContent() {
  const defaultEnd = new Date()
  const defaultStart = subDays(defaultEnd, 6)
  const [from, setFrom] = useState(toApiDateString(defaultStart))
  const [to, setTo] = useState(toApiDateString(defaultEnd))
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [networks, setNetworks] = useState<WaterfallNetworkRow[]>([])
  const [totals, setTotals] = useState<{ revenue: number; impressions: number } | null>(null)

  const { data: appsResponse } = useApi(() => structureApi.getApps(), { cacheKey: "waterfall_report_apps" })
  const apps = useMemo(() => {
    const list = appsResponse?.apps ?? []
    return list.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

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
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <Link href="/reports" className="text-xs text-gray-500 hover:text-blue-600">
          All reports
        </Link>
        <span className="mx-1.5 text-xs text-gray-400">/</span>
        <span className="text-xs text-gray-600">Waterfall optimization</span>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Waterfall Optimization Report</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revenue, eCPM, fill rate and Share of Wallet by ad network from mediation data.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-b border-gray-100 px-6 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-md border border-gray-200 px-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-md border border-gray-200 px-2"
          />
        </label>
        <Button type="button" className="h-9 bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={handleRun}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-100 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Apps</p>
          <div className="space-y-1">
            {apps.map((app) => (
              <label key={app.appId} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedAppIds.includes(app.appId!)}
                  onChange={() => toggleApp(app.appId!)}
                />
                <span className="truncate text-sm text-gray-700">{app.displayName ?? app.appId}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : networks.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              Select apps and date range, then click Apply.
            </p>
          ) : (
            <>
              {totals ? (
                <div className="mb-6 flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Total revenue</span>
                    <p className="text-xl font-semibold tabular-nums">{formatCurrency(totals.revenue)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total impressions</span>
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

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
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
                      <tr key={row.adSourceId} className="border-t border-gray-100">
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
