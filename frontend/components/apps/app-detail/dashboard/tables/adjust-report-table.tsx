"use client"

import { Button } from "@/components/ui/button"
import type { AdjustReportRow, DashboardRangeInput } from "@/types/app-dashboard"
import { AdjustDelayed, AdjustNotConfigured, NoData } from "../empty-states"
import { formatCount, formatPercent, formatUsd } from "../format"
import { useAdjustReport } from "../hooks/use-adjust-report"

interface AdjustReportTableProps {
  appId: string
  range: DashboardRangeInput
}

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index)

export function AdjustReportTable({ appId, range }: AdjustReportTableProps) {
  const { data, loading, error, refetch } = useAdjustReport(appId, range)

  if (error) {
    return <TableError message={error.message} onRetry={() => void refetch()} />
  }

  if (!loading && data && !data.available) {
    return (
      <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
        <TableHeader />
        <div className="mt-4">
          <AdjustNotConfigured />
        </div>
      </section>
    )
  }

  const rows = data?.rows ?? []

  return (
    <section className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <TableHeader />

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[980px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-xs font-medium uppercase tracking-normal text-muted-foreground">
              <th className="w-[13%] py-2 pr-3">Channel</th>
              <th className="w-[17%] py-2 pr-3">Source</th>
              <th className="w-[8%] py-2 pr-3 text-right">Installs</th>
              <th className="w-[9%] py-2 pr-3 text-right">Ad spend</th>
              <th className="w-[7%] py-2 pr-3 text-right">CPI</th>
              <th className="w-[7%] py-2 pr-3 text-right">ROAS D0</th>
              <th className="w-[7%] py-2 pr-3 text-right">ROAS D1</th>
              <th className="w-[7%] py-2 pr-3 text-right">ROAS D3</th>
              <th className="w-[7%] py-2 pr-3 text-right">ROAS D7</th>
              <th className="w-[6%] py-2 pr-3 text-right">Ret D1</th>
              <th className="w-[6%] py-2 pr-3 text-right">Ret D3</th>
              <th className="w-[6%] py-2 text-right">Ret D7</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? <SkeletonRows /> : null}
            {!loading && rows.map((row, index) => <AdjustReportTableRow key={`${row.channel}:${row.source}:${index}`} row={row} />)}
          </tbody>
        </table>
      </div>

      {!loading && data?.available && rows.length === 0 ? (
        <div className="mt-4 space-y-3">
          <NoData label="No Adjust report data for this range." />
          <AdjustDelayed />
        </div>
      ) : null}
    </section>
  )
}

function TableHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Adjust Report</h3>
        <p className="mt-1 text-xs text-muted-foreground">Channel and source breakdown for installs, spend, ROAS and retention</p>
      </div>
      <span className="w-fit rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
        Top 200
      </span>
    </div>
  )
}

function AdjustReportTableRow({ row }: { row: AdjustReportRow }) {
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="py-3 pr-3 align-middle">
        <p className="truncate font-medium text-foreground" title={row.channel}>{row.channel || "Unknown"}</p>
      </td>
      <td className="py-3 pr-3 align-middle">
        <p className="truncate text-muted-foreground" title={row.source}>{row.source || "Unknown"}</p>
      </td>
      <td className="py-3 pr-3 text-right font-medium text-foreground">{formatCount(row.installs)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatUsd(row.ad_spend_usd)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatUsd(row.cpi_usd)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.roas_d0, 1)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.roas_d1, 1)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.roas_d3, 1)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.roas_d7, 1)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.retention_d1, 1)}</td>
      <td className="py-3 pr-3 text-right text-muted-foreground">{formatPercent(row.retention_d3, 1)}</td>
      <td className="py-3 text-right text-muted-foreground">{formatPercent(row.retention_d7, 1)}</td>
    </tr>
  )
}

function SkeletonRows() {
  return (
    <>
      {SKELETON_ROWS.map((row) => (
        <tr key={row} className="border-b border-border/70 last:border-0">
          {Array.from({ length: 12 }, (_, cell) => (
            <td key={cell} className="py-3 pr-3">
              <div className={`h-4 animate-pulse rounded bg-muted ${cell < 2 ? "w-24" : "ml-auto w-14"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function TableError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-background p-4 text-sm text-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Could not load Adjust Report</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" className="bg-background/80" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  )
}
