"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2 } from "lucide-react"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { commissionApi } from "@/lib/api/services"
import { hasScreenFunction, getCurrentUser } from "@/lib/auth"
import type { CommissionRevenueRow } from "@/types/api"

function formatUsd(v: number) {
  return "$" + v.toFixed(2)
}

function formatRate(rate: number | null): React.ReactNode {
  if (rate === null)
    return <Badge className="bg-red-100 text-red-700 border-0 text-xs">No commission</Badge>
  return <span className="tabular-nums">{rate}%</span>
}

interface SummaryCardProps {
  label: string
  value: string
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

export function CommissionRevenueTab() {
  const canManage = hasScreenFunction("s-commission", "manage")
  const currentUserEmail = getCurrentUser()?.email ?? ""

  // Date range defaults: last 3 months
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  }, [])
  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [usernameFilter, setUsernameFilter] = useState(canManage ? "" : currentUserEmail)
  const [appIdFilter, setAppIdFilter] = useState("")
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  const cacheKey = `commission_revenue_${usernameFilter}_${appIdFilter}_${fromDate}_${toDate}`

  const { data, loading, refetch } = useApi(
    () =>
      commissionApi.getRevenue({
        username: usernameFilter || undefined,
        appId: appIdFilter || undefined,
        from: fromDate,
        to: toDate,
      }),
    { cacheKey },
  )

  function handleSearch() {
    invalidateCache(cacheKey)
    void refetch()
  }

  const rows: CommissionRevenueRow[] = data ?? []

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)
  const totalCommission = rows.reduce((s, r) => s + r.commissionAmount, 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {canManage && (
          <Input
            placeholder="Username (email)..."
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full sm:w-64"
          />
        )}
        <Input
          placeholder="App ID (optional)..."
          value={appIdFilter}
          onChange={(e) => setAppIdFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full sm:w-64"
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 min-w-0 flex-1 sm:w-40"
          />
          <span className="text-slate-400 text-sm">→</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 min-w-0 flex-1 sm:w-40"
          />
        </div>
        <Button variant="outline" onClick={handleSearch} className="h-10 w-full gap-2 shrink-0 sm:w-auto">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total revenue" value={formatUsd(totalRevenue)} />
          <SummaryCard label="Total commission" value={formatUsd(totalCommission)} />
          <SummaryCard label="Rows" value={rows.length.toString()} />
          <SummaryCard
            label="Avg. rate"
            value={
              totalRevenue > 0
                ? ((totalCommission / totalRevenue) * 100).toFixed(2) + "%"
                : "—"
            }
          />
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No matching data found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px] lg:min-w-full">
                <TableHeader>
                  <TableRow>
                    {canManage && <TableHead>Username</TableHead>}
                    <TableHead>App</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {canManage && (
                        <TableCell className="max-w-[180px] truncate font-mono text-xs">{row.username}</TableCell>
                      )}
                      <TableCell>
                        <div className="max-w-[240px] truncate text-sm font-medium">{row.appName}</div>
                        <div className="max-w-[240px] truncate font-mono text-xs text-slate-400">{row.appId}</div>
                      </TableCell>
                      <TableCell className="tabular-nums">{row.month}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(row.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-center">{formatRate(row.commissionRate)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-700">
                        {formatUsd(row.commissionAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
