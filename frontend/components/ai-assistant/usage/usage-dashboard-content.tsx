"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { aiAssistantApi } from "@/lib/api/ai-assistant"
import type { UserQuotaStatus, UsageSummary, UsageStatistics } from "@/lib/api/ai-assistant"

const PROVIDER_LABELS: Record<string, { label: string; color: string; textColor: string }> = {
  claude: { label: "Claude", color: "bg-amber-500", textColor: "text-amber-600" },
  chatgpt: { label: "ChatGPT", color: "bg-emerald-500", textColor: "text-emerald-600" },
  gemini: { label: "Gemini", color: "bg-blue-500", textColor: "text-blue-600" },
}

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function UsageDashboardContent() {
  const [status, setStatus] = useState<UserQuotaStatus | null>(null)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [dailyUsage, setDailyUsage] = useState<UsageStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 29)
        const [statusRes, summaryRes, dailyRes] = await Promise.all([
          aiAssistantApi.getMyUsage(),
          aiAssistantApi.getUsageSummary(),
          aiAssistantApi.getDailyUsage(formatDateKey(start), formatDateKey(end)),
        ])
        if (cancelled) return
        setStatus(statusRes)
        setSummary(summaryRes)
        setDailyUsage(dailyRes)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được dữ liệu")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Build trend data: one row per day with claude, chatgpt, gemini tokens
  const trendData = (() => {
    const byDate: Record<string, { date: string; claude: number; chatgpt: number; gemini: number }> = {}
    const end = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      const key = formatDateKey(d)
      byDate[key] = {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        claude: 0,
        chatgpt: 0,
        gemini: 0,
      }
    }
    for (const u of dailyUsage) {
      const key = typeof u.date === "string" ? u.date.slice(0, 10) : formatDateKey(new Date(u.date))
      if (byDate[key] && u.provider) {
        const p = u.provider.toLowerCase()
        if (p in byDate[key]) (byDate[key] as Record<string, number>)[p] = u.totalTokens
      }
    }
    const entries = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))
    return entries.map(([, v]) => v)
  })()

  const todayPercentage = status && status.dailyTokenLimit > 0
    ? (status.dailyTokensUsed / status.dailyTokenLimit) * 100
    : 0
  const monthPercentage = status && status.monthlyTokenLimit > 0
    ? (status.monthlyTokensUsed / status.monthlyTokenLimit) * 100
    : 0

  if (loading && !status) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ai-assistant">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold ">My AI Usage</h1>
            <p className="text-sm text-slate-500">
              Track your token consumption and costs
            </p>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Tokens</span>
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        todayPercentage >= 90
                          ? "text-red-600"
                          : todayPercentage >= 60
                          ? "text-amber-600"
                          : "text-slate-900"
                      )}
                    >
                      {status ? `${todayPercentage.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(todayPercentage, 100)}
                    className={cn(
                      "h-3",
                      todayPercentage >= 90
                        ? "[&>div]:bg-red-500"
                        : todayPercentage >= 60
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-blue-500"
                    )}
                  />
                  <div className="flex justify-between mt-1 text-sm text-slate-500">
                    <span>{status ? `${(status.dailyTokensUsed / 1000).toFixed(0)}K used` : "—"}</span>
                    <span>{status ? `${(status.dailyTokenLimit / 1000).toFixed(0)}K limit` : "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-slate-500">Cost</span>
                  <span className="font-medium">
                    {status
                      ? `$${status.dailyCostUsed.toFixed(2)} / $${status.dailyCostLimit.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Tokens</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {status ? `${monthPercentage.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                  <Progress value={Math.min(monthPercentage, 100)} className="h-3 [&>div]:bg-blue-500" />
                  <div className="flex justify-between mt-1 text-sm text-slate-500">
                    <span>{status ? `${(status.monthlyTokensUsed / 1000).toFixed(0)}K used` : "—"}</span>
                    <span>{status ? `${(status.monthlyTokenLimit / 1000000).toFixed(0)}M limit` : "—"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-slate-500">Cost</span>
                  <span className="font-medium">
                    {status
                      ? `$${status.monthlyCostUsed.toFixed(2)} / $${status.monthlyCostLimit.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Banner */}
        {status && status.isNearLimit && !status.isOverLimit && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">
                    Approaching daily limit ({todayPercentage.toFixed(0)}%)
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-amber-700">
                    <Lightbulb className="h-4 w-4" />
                    <span>
                      Tip: Gemini costs 10x less for simple queries. Consider
                      switching providers for basic tasks.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Provider Breakdown (today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary && summary.byProvider.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Queries</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.byProvider.map((p) => {
                    const meta = PROVIDER_LABELS[p.provider.toLowerCase()] ?? {
                      label: p.provider,
                      color: "bg-slate-500",
                      textColor: "text-slate-600",
                    }
                    return (
                      <TableRow key={p.provider}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", meta.color)} />
                            <span className={cn("font-medium", meta.textColor)}>{meta.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.requestCount}</TableCell>
                        <TableCell className="text-right">{(p.totalTokens / 1000).toFixed(0)}K</TableCell>
                        <TableCell className="text-right font-medium">${p.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-500 py-4">Chưa có usage theo provider trong tháng này.</p>
            )}
          </CardContent>
        </Card>

        {/* Usage Trend Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Trend (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} tokens`]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="claude"
                    name="Claude"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="chatgpt"
                    name="ChatGPT"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gemini"
                    name="Gemini"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
