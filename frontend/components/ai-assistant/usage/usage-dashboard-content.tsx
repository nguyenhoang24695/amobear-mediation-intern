"use client"

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

// Mock usage data
const todayUsage = {
  tokensUsed: 78000,
  tokensLimit: 100000,
  costUsed: 1.56,
  costLimit: 2.0,
}

const monthUsage = {
  tokensUsed: 640000,
  tokensLimit: 2000000,
  costUsed: 9.6,
  costLimit: 30.0,
}

const providerBreakdown = [
  {
    provider: "claude",
    label: "Claude",
    color: "bg-amber-500",
    textColor: "text-amber-600",
    queries: 45,
    tokens: 52000,
    cost: 1.23,
  },
  {
    provider: "chatgpt",
    label: "ChatGPT",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
    queries: 12,
    tokens: 18000,
    cost: 0.28,
  },
  {
    provider: "gemini",
    label: "Gemini",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    queries: 8,
    tokens: 8000,
    cost: 0.05,
  },
]

const trendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    claude: Math.floor(Math.random() * 40000 + 20000),
    chatgpt: Math.floor(Math.random() * 20000 + 5000),
    gemini: Math.floor(Math.random() * 15000 + 3000),
  }
})

const topQueries = [
  {
    query: "Complex retention cohort analysis for all games...",
    cost: 0.12,
    provider: "claude",
  },
  {
    query: "Cross-app revenue breakdown with network comparison...",
    cost: 0.08,
    provider: "claude",
  },
  {
    query: "Level progression funnel with drop rate analysis...",
    cost: 0.05,
    provider: "chatgpt",
  },
]

export function UsageDashboardContent() {
  const todayPercentage = (todayUsage.tokensUsed / todayUsage.tokensLimit) * 100
  const monthPercentage = (monthUsage.tokensUsed / monthUsage.tokensLimit) * 100

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
            <h1 className="text-2xl font-semibold text-slate-900">My AI Usage</h1>
            <p className="text-sm text-slate-500">
              Track your token consumption and costs
            </p>
          </div>
        </div>

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
                      {todayPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={todayPercentage}
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
                    <span>{(todayUsage.tokensUsed / 1000).toFixed(0)}K used</span>
                    <span>{(todayUsage.tokensLimit / 1000).toFixed(0)}K limit</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-slate-500">Cost</span>
                  <span className="font-medium">
                    ${todayUsage.costUsed.toFixed(2)} / ${todayUsage.costLimit.toFixed(2)}
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
                      {monthPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={monthPercentage} className="h-3 [&>div]:bg-blue-500" />
                  <div className="flex justify-between mt-1 text-sm text-slate-500">
                    <span>{(monthUsage.tokensUsed / 1000).toFixed(0)}K used</span>
                    <span>{(monthUsage.tokensLimit / 1000000).toFixed(0)}M limit</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-slate-500">Cost</span>
                  <span className="font-medium">
                    ${monthUsage.costUsed.toFixed(2)} / ${monthUsage.costLimit.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Banner */}
        {todayPercentage >= 60 && (
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
                {providerBreakdown.map((p) => (
                  <TableRow key={p.provider}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", p.color)} />
                        <span className={cn("font-medium", p.textColor)}>
                          {p.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{p.queries}</TableCell>
                    <TableCell className="text-right">
                      {(p.tokens / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${p.cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    formatter={(value: number) => [
                      `${value.toLocaleString()} tokens`,
                    ]}
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

        {/* Top Queries by Cost */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Top Queries by Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Query</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Provider</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-slate-700 truncate max-w-[300px]">
                      {q.query}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${q.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-sm",
                          q.provider === "claude"
                            ? "text-amber-600"
                            : q.provider === "chatgpt"
                            ? "text-emerald-600"
                            : "text-blue-600"
                        )}
                      >
                        {q.provider.charAt(0).toUpperCase() + q.provider.slice(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
