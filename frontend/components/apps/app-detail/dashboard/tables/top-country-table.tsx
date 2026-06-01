"use client"

import { Button } from "@/components/ui/button"
import type { DashboardRangeInput, TopCountryMetric, TopCountryRow } from "@/types/app-dashboard"
import { NoData } from "../empty-states"
import { formatCount, formatPercent, formatUsd } from "../format"
import { useTopCountry } from "../hooks/use-top-country"

interface TopCountryTableProps {
  appId: string
  range: DashboardRangeInput
  metric: TopCountryMetric
  title: string
}

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index)

const PRIMARY_LABELS: Record<TopCountryMetric, string> = {
  iaa: "IAA revenue",
  iap_sub: "IAP + SUB revenue",
  new_users: "New users",
  total_users: "Total users",
}

export function TopCountryTable({ appId, range, metric, title }: TopCountryTableProps) {
  const { data, loading, error, refetch } = useTopCountry(appId, range, metric)

  if (error) {
    return <TableError title={title} message={error.message} onRetry={() => void refetch()} />
  }

  const rows = data?.rows ?? []

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">Top countries by {PRIMARY_LABELS[metric]}</p>
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
          Top 10
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-normal text-slate-500">
              <th className="w-[34%] py-2 pr-3">Country</th>
              <th className="w-[22%] py-2 pr-3 text-right">{PRIMARY_LABELS[metric]}</th>
              <th className="w-[22%] py-2 pr-3 text-right">ARPU/country</th>
              <th className="w-[22%] py-2 text-right">Conversion rate</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? <SkeletonRows /> : null}
            {!loading && rows.map((row) => <TopCountryTableRow key={row.country_code} metric={metric} row={row} />)}
          </tbody>
        </table>
      </div>

      {!loading && data && rows.length === 0 ? <NoData label={emptyLabel(metric)} /> : null}
    </section>
  )
}

function TopCountryTableRow({ metric, row }: { metric: TopCountryMetric; row: TopCountryRow }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-3 align-middle">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{row.country_name || row.country_code}</p>
          <p className="mt-0.5 text-xs text-slate-500">{row.country_code}</p>
        </div>
      </td>
      <td className="py-3 pr-3 text-right font-medium text-slate-950">{formatPrimary(metric, row.primary_value)}</td>
      <td className="py-3 pr-3 text-right text-slate-700">{formatUsd(row.arpu_country_usd)}</td>
      <td className="py-3 text-right text-slate-700">{formatPercent(row.conversion_rate_percent, 2)}</td>
    </tr>
  )
}

function SkeletonRows() {
  return (
    <>
      {SKELETON_ROWS.map((row) => (
        <tr key={row} className="border-b border-slate-100 last:border-0">
          <td className="py-3 pr-3">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-10 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="py-3 pr-3">
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
          </td>
          <td className="py-3 pr-3">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200" />
          </td>
          <td className="py-3">
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  )
}

function TableError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Could not load {title}</p>
          <p className="mt-1 text-red-700">{message}</p>
        </div>
        <Button variant="outline" size="sm" className="bg-white" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  )
}

function formatPrimary(metric: TopCountryMetric, value: number | null) {
  return metric === "iaa" || metric === "iap_sub" ? formatUsd(value) : formatCount(value)
}

function emptyLabel(metric: TopCountryMetric) {
  if (metric === "iaa") return "No Adjust country revenue data for this range."
  if (metric === "iap_sub") return "No Qonversion country IAP/SUB data for this range."
  return "No Firebase country user data for this range."
}
