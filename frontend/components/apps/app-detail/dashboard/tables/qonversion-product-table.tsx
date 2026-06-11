"use client"

import { Button } from "@/components/ui/button"
import type { DashboardRangeInput, QonversionProductReport, QonversionProductRow, QonversionProductsResponse } from "@/types/app-dashboard"
import { NoData } from "../empty-states"
import { formatCount, formatPercent, formatUsd } from "../format"
import { useQonversionProducts } from "../hooks/use-qonversion-products"

export type QonversionProductColumnKey =
  | "activeSubscriptions"
  | "newSubscriptions"
  | "conversionRate"
  | "revenueUsd"
  | "refundsUsd"
  | "refundRate"

export interface QonversionProductColumn {
  key: QonversionProductColumnKey
  label: string
  className?: string
}

export interface QonversionProductTableConfig {
  title: string
  report: QonversionProductReport
  columns: QonversionProductColumn[]
}

interface QonversionProductTableProps extends QonversionProductTableConfig {
  appId: string
  range: DashboardRangeInput
}

interface QonversionProductTableViewProps {
  title: string
  columns: QonversionProductColumn[]
  data: QonversionProductsResponse | null
  loading: boolean
  error: Error | null
  onRetry: () => void
}

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => index)
const TABLE_SCROLL_CLASS = "max-h-[520px] overflow-y-auto"

export const QONVERSION_PRODUCT_TABLES: QonversionProductTableConfig[] = [
  {
    title: "Subscriptions by Product",
    report: "subscriptions",
    columns: [
      { key: "activeSubscriptions", label: "Active Subscriptions" },
      { key: "newSubscriptions", label: "New Subscriptions" },
    ],
  },
  {
    title: "New-User-to-Trial by Product",
    report: "new_user_to_trial",
    columns: [{ key: "conversionRate", label: "Conversion rate (%)" }],
  },
  {
    title: "Trial-to-Paid by Product",
    report: "trial_to_paid",
    columns: [
      { key: "conversionRate", label: "Conversion rate (%)" },
      { key: "revenueUsd", label: "Revenue ($)" },
    ],
  },
  {
    title: "Refunds by Product",
    report: "refunds",
    columns: [
      { key: "refundsUsd", label: "Refunds ($)" },
      { key: "refundRate", label: "Refund rate (%)" },
    ],
  },
]

export function QonversionProductTable({ appId, range, title, report, columns }: QonversionProductTableProps) {
  const { data, loading, error, refetch } = useQonversionProducts(appId, range, report)

  return (
    <QonversionProductTableView
      title={title}
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      onRetry={() => void refetch()}
    />
  )
}

export function QonversionProductTableView({
  title,
  columns,
  data,
  loading,
  error,
  onRetry,
}: QonversionProductTableViewProps) {
  if (error) {
    return <TableError title={title} message={error.message} onRetry={onRetry} />
  }

  const rows = data?.rows ?? []
  const isQonversionNotConfigured = data?.meta.warnings.includes("qonversion_charts_not_configured") ?? false
  const visibleRows = isQonversionNotConfigured ? [] : rows
  const hasNoQonversionData = isQonversionNotConfigured || rows.length === 0

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <TableHeader title={title} />

      <div className="mt-4 overflow-x-auto">
        <div className={TABLE_SCROLL_CLASS}>
          <table className="min-w-[620px] table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-normal text-slate-500">
                <th className="sticky top-0 z-10 w-[54%] bg-white py-2 pr-3">Product</th>
                {columns.map((column) => (
                  <th key={column.key} className={`sticky top-0 z-10 bg-white py-2 pr-3 text-right ${column.className ?? ""}`.trim()}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !data ? <SkeletonRows columns={columns.length} /> : null}
              {!loading && visibleRows.map((row) => <QonversionProductTableRow key={row.productId} columns={columns} row={row} />)}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && data && hasNoQonversionData ? (
        <div className="mt-4">
          <NoData label="No Qonversion data for this app/range." />
        </div>
      ) : null}
    </section>
  )
}

function TableHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">Qonversion product metrics</p>
      </div>
      <span className="w-fit rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
        Product
      </span>
    </div>
  )
}

function QonversionProductTableRow({
  columns,
  row,
}: {
  columns: QonversionProductColumn[]
  row: QonversionProductRow
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-3 align-middle">
        <p className="truncate font-medium text-slate-800" title={row.productId}>{row.productId}</p>
      </td>
      {columns.map((column) => (
        <td key={column.key} className="py-3 pr-3 text-right font-medium text-slate-950">
          {formatColumnValue(column.key, row)}
        </td>
      ))}
    </tr>
  )
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {SKELETON_ROWS.map((row) => (
        <tr key={row} className="border-b border-slate-100 last:border-0">
          <td className="py-3 pr-3">
            <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
          </td>
          {Array.from({ length: columns }, (_, cell) => (
            <td key={cell} className="py-3 pr-3">
              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
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

function formatColumnValue(key: QonversionProductColumnKey, row: QonversionProductRow) {
  switch (key) {
    case "activeSubscriptions":
      return formatCount(row.activeSubscriptions)
    case "newSubscriptions":
      return formatCount(row.newSubscriptions)
    case "conversionRate":
      return formatPercent(row.conversionRate, 2)
    case "revenueUsd":
      return formatUsd(row.revenueUsd)
    case "refundsUsd":
      return formatUsd(row.refundsUsd)
    case "refundRate":
      return formatPercent(row.refundRate, 2)
  }
}
