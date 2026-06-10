"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Columns2, Download, ImageIcon, Pencil, Rows3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { CustomReportCatalogItem } from "@/types/reports"
import type { CompareEnrichedRow } from "@/lib/reports/my-report-compare-utils"
import {
  exportChartContainerAsPng,
  exportRowsAsCsv,
} from "@/lib/reports/chart-export-utils"
import {
  MyReportChartEditSheet,
  type MyReportChartEditDraft,
  type MyReportChartPanelKind,
} from "@/components/my-reports/my-report-chart-edit-sheet"
import type {
  MyReportChartType,
  MyReportPanelLayout,
} from "@/components/my-reports/hooks/use-my-report-config"
import { formatMetricValue } from "@/lib/reports/report-format-utils"

const BREAKDOWN_TOP_N = 5
const SERIES_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#6366f1", "#22c55e"]
const CHART_HEIGHT = 320
const CHART_MARGIN = { top: 16, right: 20, left: 8, bottom: 8 }

function formatAxisTick(
  value: number,
  metricId: string,
  metricCatalog: CustomReportCatalogItem[],
): string {
  if (!Number.isFinite(value)) return ""
  const metric = metricCatalog.find((m) => m.id === metricId)
  if (metric?.format === "currency") {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
    return `$${value.toFixed(0)}`
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString("en-US")
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div style={{ width: "100%", height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export type MyReportChartsProps = {
  rows: CompareEnrichedRow[]
  dimensions: string[]
  metrics: string[]
  metricCatalog: CustomReportCatalogItem[]
  dimensionCatalog: CustomReportCatalogItem[]
  chartMetricIds: string[]
  chartType: MyReportChartType
  breakdownChartMetricIds: string[]
  breakdownChartType: MyReportChartType
  trendChartDimensionIds: string[]
  breakdownChartDimensionIds: string[]
  panelLayout: MyReportPanelLayout
  compareActive: boolean
  onChartMetricIdsChange: (metricIds: string[]) => void
  onChartTypeChange: (type: MyReportChartType) => void
  onBreakdownChartMetricIdsChange: (metricIds: string[]) => void
  onBreakdownChartTypeChange: (type: MyReportChartType) => void
  onTrendChartDimensionIdsChange: (dimensionIds: string[]) => void
  onBreakdownChartDimensionIdsChange: (dimensionIds: string[]) => void
  onPanelLayoutChange: (layout: MyReportPanelLayout) => void
}

/** Unified chart data point: label + one numeric key per metricId (+ optional __prev for compare) */
type ChartDataPoint = {
  label: string
  [key: string]: string | number
}

type BreakdownPoint = Record<string, string | number> & { label: string }

function toChartNumber(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function dimensionTitlePart(
  dimId: string,
  catalog: CustomReportCatalogItem[],
): string {
  const item = catalog.find((d) => d.id === dimId)
  if (dimId === "date") return item?.label ? `Day (${item.label.toLowerCase()})` : "Day (date)"
  return item?.label ?? dimId
}

function buildChartTitle(
  metricIds: string[],
  metricCatalog: CustomReportCatalogItem[],
  dimensionIds: string[],
  dimensionCatalog: CustomReportCatalogItem[],
): string {
  const metricLabel = metricIds
    .map((id) => metricCatalog.find((m) => m.id === id)?.label ?? id)
    .join(", ")
  if (dimensionIds.length === 0) return metricLabel
  const parts = dimensionIds.map((id) => dimensionTitlePart(id, dimensionCatalog))
  return `${metricLabel} by ${parts.join(", ")}`
}

function buildTrendMultiMetric(
  rows: CompareEnrichedRow[],
  metricIds: string[],
  compareActive: boolean,
): ChartDataPoint[] {
  const byDate = new Map<string, ChartDataPoint>()
  for (const row of rows) {
    const label = String(row.date ?? "")
    if (!label) continue
    const point = byDate.get(label) ?? { label }
    for (const mId of metricIds) {
      point[mId] = toChartNumber(point[mId]) + toChartNumber(row[mId])
    }
    if (compareActive && metricIds.length === 1) {
      const prevKey = `${metricIds[0]}__prev`
      point[prevKey] = toChartNumber(point[prevKey]) + toChartNumber(row.__compare?.[metricIds[0]])
    }
    byDate.set(label, point)
  }
  return [...byDate.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)))
}

function buildBreakdownByAppBarMulti(
  rows: CompareEnrichedRow[],
  metricIds: string[],
): ChartDataPoint[] {
  const primaryId = metricIds[0]
  const byApp = new Map<string, ChartDataPoint>()
  for (const row of rows) {
    const label = String(row.app ?? row.app_id ?? "Unknown")
    const point = byApp.get(label) ?? { label }
    for (const mId of metricIds) {
      point[mId] = toChartNumber(point[mId]) + toChartNumber(row[mId])
    }
    byApp.set(label, point)
  }
  return [...byApp.values()]
    .sort((a, b) => toChartNumber(b[primaryId]) - toChartNumber(a[primaryId]))
    .slice(0, BREAKDOWN_TOP_N)
}

function buildBreakdownByAppOverDate(
  rows: CompareEnrichedRow[],
  metricId: string,
): { data: BreakdownPoint[]; seriesKeys: string[] } {
  const totalsByApp = new Map<string, number>()
  for (const row of rows) {
    const app = String(row.app ?? row.app_id ?? "").trim()
    if (!app) continue
    totalsByApp.set(app, (totalsByApp.get(app) ?? 0) + toChartNumber(row[metricId]))
  }

  const topApps = [...totalsByApp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, BREAKDOWN_TOP_N)
    .map(([app]) => app)

  if (topApps.length === 0) return { data: [], seriesKeys: [] }

  const byDate = new Map<string, BreakdownPoint>()
  for (const row of rows) {
    const date = String(row.date ?? "")
    const app = String(row.app ?? row.app_id ?? "").trim()
    if (!date || !app || !topApps.includes(app)) continue
    const point = byDate.get(date) ?? { label: date }
    point[app] = (Number(point[app] ?? 0) + toChartNumber(row[metricId])) as number
    byDate.set(date, point)
  }

  const data = [...byDate.values()].sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  )
  return { data, seriesKeys: topApps }
}


function PanelLayoutToggle({
  layout,
  onChange,
}: {
  layout: MyReportPanelLayout
  onChange: (layout: MyReportPanelLayout) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
      <UiTooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              layout === "side-by-side" && "bg-gray-100 text-blue-600",
            )}
            onClick={() => onChange("side-by-side")}
            aria-label="Side by side"
          >
            <Columns2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Side by side</TooltipContent>
      </UiTooltip>
      <UiTooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", layout === "stacked" && "bg-gray-100 text-blue-600")}
            onClick={() => onChange("stacked")}
            aria-label="View charts full width, stacked"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View the charts in full width, one below the other</TooltipContent>
      </UiTooltip>
    </div>
  )
}

function ChartPanel({
  title,
  children,
  className,
  onExportImage,
  onDownload,
  onEdit,
  chartBodyRef,
  editOpen,
  editPanelKind,
  editDraft,
  metrics,
  metricCatalog,
  dimensionCatalog,
  availableDimensionIds,
  onEditOpenChange,
  onApplyEdit,
}: {
  title: string
  children: React.ReactNode
  className?: string
  onExportImage: () => void
  onDownload: () => void
  onEdit: () => void
  chartBodyRef: React.RefObject<HTMLDivElement | null>
  editOpen: boolean
  editPanelKind: MyReportChartPanelKind
  editDraft: MyReportChartEditDraft
  metrics: string[]
  metricCatalog: CustomReportCatalogItem[]
  dimensionCatalog: CustomReportCatalogItem[]
  availableDimensionIds: string[]
  onEditOpenChange: (open: boolean) => void
  onApplyEdit: (draft: MyReportChartEditDraft) => void
}) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] min-w-0 flex-1 overflow-visible rounded-lg border border-gray-200 bg-white",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h3 className="min-w-0 truncate text-sm font-medium text-gray-900">{title}</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            <UiTooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-800"
                  onClick={onExportImage}
                  aria-label="Export as Image"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as Image</TooltipContent>
            </UiTooltip>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-800"
                  onClick={onDownload}
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </UiTooltip>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-gray-500 hover:text-gray-800",
                    editOpen && "bg-gray-100 text-blue-600",
                  )}
                  onClick={onEdit}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </UiTooltip>
          </div>
        </div>
        <div ref={chartBodyRef} className="w-full min-w-0 flex-1 overflow-visible p-4">
          {children}
        </div>
      </div>

      <MyReportChartEditSheet
        open={editOpen}
        panelKind={editPanelKind}
        draft={editDraft}
        metrics={metrics}
        metricCatalog={metricCatalog}
        dimensionCatalog={dimensionCatalog}
        availableDimensionIds={availableDimensionIds}
        onOpenChange={onEditOpenChange}
        onApply={onApplyEdit}
      />
    </div>
  )
}

const PIE_MAX_CATEGORIES = 5

function PieUnsupportedMsg({ reason }: { reason: string }) {
  return (
    <div className="flex items-center justify-center px-6 text-center text-sm text-gray-500" style={{ height: CHART_HEIGHT }}>
      {reason}
    </div>
  )
}

function DonutPie({
  data,
  metricId,
  metricCatalog,
}: {
  data: { name: string; value: number }[]
  metricId: string
  metricCatalog: CustomReportCatalogItem[]
}) {
  const capped = data.slice(0, PIE_MAX_CATEGORIES)
  return (
    <ChartFrame>
      <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <Pie
          data={capped}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          label={false}
          labelLine={false}
        >
          {capped.map((_, index) => (
            <Cell key={index} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatMetricValue(v, metricId, metricCatalog)} />
        <Legend verticalAlign="bottom" height={48} iconType="circle" iconSize={8} />
      </PieChart>
    </ChartFrame>
  )
}

function TrendChart({
  data,
  metricIds,
  metricCatalog,
  chartType,
  compareActive,
  dimensionIds,
}: {
  data: ChartDataPoint[]
  metricIds: string[]
  metricCatalog: CustomReportCatalogItem[]
  chartType: MyReportChartType
  compareActive: boolean
  dimensionIds: string[]
}) {
  const primaryId = metricIds[0]
  const tickFmt = (v: number) => formatAxisTick(v, primaryId, metricCatalog)
  const tooltipFmt = (v: number, name: string) => {
    const mId = name.replace(/__prev$/, "")
    const isCompare = name.endsWith("__prev")
    const label = isCompare
      ? `${metricCatalog.find((m) => m.id === mId)?.label ?? mId} (Compare)`
      : (metricCatalog.find((m) => m.id === name)?.label ?? name)
    return [formatMetricValue(v, mId, metricCatalog), label] as [string, string]
  }

  const showLegend = metricIds.length > 1 || compareActive
  const singleCompare = compareActive && metricIds.length === 1

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height: CHART_HEIGHT }}>
        No trend data for the selected metric.
      </div>
    )
  }

  if (chartType === "scorecard") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-8 px-4" style={{ height: CHART_HEIGHT }}>
        {metricIds.map((mId, i) => {
          const total = data.reduce((sum, d) => sum + toChartNumber(d[mId]), 0)
          const prevTotal = singleCompare ? data.reduce((sum, d) => sum + toChartNumber(d[`${mId}__prev`]), 0) : null
          const delta = prevTotal != null && prevTotal !== 0 ? ((total - prevTotal) / prevTotal) * 100 : null
          return (
            <div key={mId} className="flex flex-col items-center gap-1.5">
              <div className="text-xs font-medium text-gray-500">
                {metricCatalog.find((m) => m.id === mId)?.label ?? mId}
              </div>
              <div
                className="text-4xl font-bold tabular-nums"
                style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}
              >
                {formatMetricValue(total, mId, metricCatalog)}
              </div>
              {delta != null && (
                <div className={cn("flex items-center gap-1 text-sm font-medium", delta >= 0 ? "text-green-600" : "text-red-500")}>
                  <span>{delta >= 0 ? "▲" : "▼"}</span>
                  <span>{Math.abs(delta).toFixed(1)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (chartType === "pie") {
    if (dimensionIds.length >= 2) {
      return <PieUnsupportedMsg reason="Pie chart chỉ hỗ trợ 1 dimension. Vui lòng bỏ bớt dimension trong phần chỉnh sửa." />
    }
    const pieData = data.map((d) => ({ name: d.label, value: toChartNumber(d[primaryId]) }))
    return <DonutPie data={pieData} metricId={primaryId} metricCatalog={metricCatalog} />
  }

  if (chartType === "bar" || chartType === "stacked-bar") {
    const stacked = chartType === "stacked-bar"
    return (
      <ChartFrame>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          {showLegend && <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />}
          {metricIds.map((mId, i) => (
            <Bar key={mId} dataKey={mId} name={metricCatalog.find((m) => m.id === mId)?.label ?? mId}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]} stackId={stacked ? "s" : undefined} />
          ))}
          {singleCompare && (
            <Bar dataKey={`${primaryId}__prev`} name="Compare" fill="#94a3b8" stackId={stacked ? "s" : undefined} />
          )}
        </BarChart>
      </ChartFrame>
    )
  }

  if (chartType === "area") {
    return (
      <ChartFrame>
        <AreaChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          {showLegend && <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />}
          {metricIds.map((mId, i) => (
            <Area key={mId} type="monotone" dataKey={mId}
              name={metricCatalog.find((m) => m.id === mId)?.label ?? mId}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              fill={`${SERIES_COLORS[i % SERIES_COLORS.length]}33`} />
          ))}
          {singleCompare && (
            <Area type="monotone" dataKey={`${primaryId}__prev`} name="Compare" stroke="#64748b" fill="#cbd5e1" />
          )}
        </AreaChart>
      </ChartFrame>
    )
  }

  if (chartType === "combo") {
    return (
      <ChartFrame>
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          {showLegend && <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />}
          {/* First metric as bar, rest as lines */}
          <Bar dataKey={primaryId} name={metricCatalog.find((m) => m.id === primaryId)?.label ?? primaryId} fill={`${SERIES_COLORS[0]}88`} />
          {metricIds.slice(1).map((mId, i) => (
            <Line key={mId} type="monotone" dataKey={mId}
              name={metricCatalog.find((m) => m.id === mId)?.label ?? mId}
              stroke={SERIES_COLORS[(i + 1) % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
          ))}
          <Line type="monotone" dataKey={primaryId} name={`${metricCatalog.find((m) => m.id === primaryId)?.label ?? primaryId} (trend)`}
            stroke={SERIES_COLORS[0]} strokeWidth={2} dot={false} />
          {singleCompare && (
            <Bar dataKey={`${primaryId}__prev`} name="Compare" fill="#e2e8f0" />
          )}
        </ComposedChart>
      </ChartFrame>
    )
  }

  // default: line
  return (
    <ChartFrame>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
        <Tooltip formatter={tooltipFmt} />
        {showLegend && <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />}
        {metricIds.map((mId, i) => (
          <Line key={mId} type="monotone" dataKey={mId}
            name={metricCatalog.find((m) => m.id === mId)?.label ?? mId}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
        ))}
        {singleCompare && (
          <Line type="monotone" dataKey={`${primaryId}__prev`} name="Compare"
            stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        )}
      </LineChart>
    </ChartFrame>
  )
}

function BreakdownChart({
  seriesData,
  seriesKeys,
  barData,
  metricIds,
  metricCatalog,
  chartType,
  useMultiSeries,
  dimensionIds,
}: {
  seriesData: BreakdownPoint[]
  seriesKeys: string[]
  barData: ChartDataPoint[]
  metricIds: string[]
  metricCatalog: CustomReportCatalogItem[]
  chartType: MyReportChartType
  useMultiSeries: boolean
  dimensionIds: string[]
}) {
  const primaryId = metricIds[0]
  const tickFmt = (v: number) => formatAxisTick(v, primaryId, metricCatalog)
  const tooltipFmt = (v: number, name: string) =>
    [formatMetricValue(v, primaryId, metricCatalog), name] as [string, string]

  if (useMultiSeries && seriesData.length > 0 && seriesKeys.length > 0) {
    if (chartType === "pie") {
      if (dimensionIds.length >= 2) {
        return <PieUnsupportedMsg reason="Pie chart chỉ hỗ trợ 1 dimension. Vui lòng bỏ bớt dimension trong phần chỉnh sửa." />
      }
      const pieData = seriesKeys.map((key) => ({
        name: key,
        value: seriesData.reduce((sum, row) => sum + toChartNumber(row[key]), 0),
      }))
      return <DonutPie data={pieData} metricId={primaryId} metricCatalog={metricCatalog} />
    }

    if (chartType === "scorecard") {
      const totals = seriesKeys.map((key) => ({
        label: key,
        value: seriesData.reduce((sum, row) => sum + toChartNumber(row[key]), 0),
      }))
      return (
        <div className="flex flex-wrap items-center justify-center gap-6 px-4" style={{ height: CHART_HEIGHT }}>
          {totals.map((item, index) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="text-3xl font-bold tabular-nums" style={{ color: SERIES_COLORS[index % SERIES_COLORS.length] }}>
                {formatMetricValue(item.value, primaryId, metricCatalog)}
              </div>
              <div className="text-xs text-gray-500 truncate max-w-[120px]">{item.label}</div>
            </div>
          ))}
        </div>
      )
    }

    if (chartType === "bar" || chartType === "stacked-bar") {
      const stacked = chartType === "stacked-bar"
      return (
        <ChartFrame>
          <BarChart data={seriesData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
            <Tooltip formatter={tooltipFmt} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
            {seriesKeys.map((key, index) => (
              <Bar key={key} dataKey={key} name={key} fill={SERIES_COLORS[index % SERIES_COLORS.length]} stackId={stacked ? "s" : undefined} />
            ))}
          </BarChart>
        </ChartFrame>
      )
    }

    if (chartType === "combo") {
      return (
        <ChartFrame>
          <ComposedChart data={seriesData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
            <Tooltip formatter={tooltipFmt} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
            {seriesKeys.map((key, index) => (
              index === 0
                ? <Bar key={key} dataKey={key} name={key} fill={SERIES_COLORS[index % SERIES_COLORS.length]} fillOpacity={0.7} />
                : <Line key={key} type="monotone" dataKey={key} name={key} stroke={SERIES_COLORS[index % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </ComposedChart>
        </ChartFrame>
      )
    }

    // default: line (covers "line" and "area" for multi-series)
    return (
      <ChartFrame>
        <LineChart data={seriesData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
          {seriesKeys.map((key, index) => (
            <Line key={key} type="monotone" dataKey={key} name={key} stroke={SERIES_COLORS[index % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ChartFrame>
    )
  }

  if (barData.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height: CHART_HEIGHT }}>
        Add the App dimension to see breakdown chart.
      </div>
    )
  }

  const showLegend = metricIds.length > 1

  if (chartType === "scorecard") {
    const totals = metricIds.map((mId) => ({
      mId,
      label: metricCatalog.find((m) => m.id === mId)?.label ?? mId,
      value: barData.reduce((sum, d) => sum + toChartNumber(d[mId]), 0),
    }))
    return (
      <div className="flex flex-wrap items-center justify-center gap-8 px-4" style={{ height: CHART_HEIGHT }}>
        {totals.map((item, i) => (
          <div key={item.mId} className="flex flex-col items-center gap-1.5">
            <div className="text-xs font-medium text-gray-500">{item.label}</div>
            <div className="text-4xl font-bold tabular-nums" style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
              {formatMetricValue(item.value, item.mId, metricCatalog)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (chartType === "pie") {
    if (dimensionIds.length >= 2) {
      return <PieUnsupportedMsg reason="Pie chart chỉ hỗ trợ 1 dimension. Vui lòng bỏ bớt dimension trong phần chỉnh sửa." />
    }
    const pieData = barData.map((d) => ({ name: String(d.label), value: toChartNumber(d[primaryId]) }))
    return <DonutPie data={pieData} metricId={primaryId} metricCatalog={metricCatalog} />
  }

  return (
    <ChartFrame>
      <BarChart data={barData} margin={{ ...CHART_MARGIN, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} interval={0} angle={-25} textAnchor="end" height={52} dy={4} />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
        <Tooltip formatter={(v: number, name: string) => [formatMetricValue(v, name, metricCatalog), metricCatalog.find((m) => m.id === name)?.label ?? name] as [string, string]} />
        {showLegend && <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />}
        {metricIds.map((mId, i) => (
          <Bar key={mId} dataKey={mId} name={metricCatalog.find((m) => m.id === mId)?.label ?? mId}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
        ))}
      </BarChart>
    </ChartFrame>
  )
}

export function MyReportCharts({
  rows,
  dimensions,
  metrics,
  metricCatalog,
  dimensionCatalog,
  chartMetricIds,
  chartType,
  breakdownChartMetricIds,
  breakdownChartType,
  trendChartDimensionIds,
  breakdownChartDimensionIds,
  panelLayout,
  compareActive,
  onChartMetricIdsChange,
  onChartTypeChange,
  onBreakdownChartMetricIdsChange,
  onBreakdownChartTypeChange,
  onTrendChartDimensionIdsChange,
  onBreakdownChartDimensionIdsChange,
  onPanelLayoutChange,
}: MyReportChartsProps) {
  const trendChartRef = useRef<HTMLDivElement>(null)
  const breakdownChartRef = useRef<HTMLDivElement>(null)
  const [trendEditOpen, setTrendEditOpen] = useState(false)
  const [breakdownEditOpen, setBreakdownEditOpen] = useState(false)

  const effectiveTrendDims = useMemo(
    () => trendChartDimensionIds.filter((id) => dimensions.includes(id)),
    [trendChartDimensionIds, dimensions],
  )
  const effectiveBreakdownDims = useMemo(
    () => breakdownChartDimensionIds.filter((id) => dimensions.includes(id)),
    [breakdownChartDimensionIds, dimensions],
  )

  // Filter metric IDs to only those present in the active metric catalog
  const effectiveTrendMetricIds = useMemo(
    () => chartMetricIds.filter((id) => metrics.includes(id)),
    [chartMetricIds, metrics],
  )
  const effectiveBreakdownMetricIds = useMemo(
    () => breakdownChartMetricIds.filter((id) => metrics.includes(id)),
    [breakdownChartMetricIds, metrics],
  )

  const hasDateTrend = effectiveTrendDims.includes("date")
  const hasDateBreakdown = effectiveBreakdownDims.includes("date")
  const hasAppBreakdown = effectiveBreakdownDims.includes("app")

  const trendData = useMemo(
    () => (hasDateTrend ? buildTrendMultiMetric(rows, effectiveTrendMetricIds, compareActive) : []),
    [rows, effectiveTrendMetricIds, compareActive, hasDateTrend],
  )

  const breakdownMulti = useMemo(
    () =>
      hasDateBreakdown && hasAppBreakdown
        ? buildBreakdownByAppOverDate(rows, effectiveBreakdownMetricIds[0])
        : { data: [], seriesKeys: [] },
    [rows, effectiveBreakdownMetricIds, hasDateBreakdown, hasAppBreakdown],
  )

  const breakdownBar = useMemo(
    () => (hasAppBreakdown ? buildBreakdownByAppBarMulti(rows, effectiveBreakdownMetricIds) : []),
    [rows, effectiveBreakdownMetricIds, hasAppBreakdown],
  )

  const useMultiSeries = breakdownMulti.seriesKeys.length > 0

  const trendTitle = buildChartTitle(effectiveTrendMetricIds, metricCatalog, effectiveTrendDims, dimensionCatalog)
  const breakdownTitle = buildChartTitle(effectiveBreakdownMetricIds, metricCatalog, effectiveBreakdownDims, dimensionCatalog)

  const chartsStacked = panelLayout === "stacked"

  const trendEditDraft = useMemo(
    (): MyReportChartEditDraft => ({
      chartType,
      metricIds: effectiveTrendMetricIds.length > 0 ? effectiveTrendMetricIds : [metrics[0]],
      dimensionIds: effectiveTrendDims.length > 0 ? effectiveTrendDims : ["date"],
    }),
    [chartType, effectiveTrendMetricIds, effectiveTrendDims, metrics],
  )

  const breakdownEditDraft = useMemo(
    (): MyReportChartEditDraft => ({
      chartType: breakdownChartType,
      metricIds: effectiveBreakdownMetricIds.length > 0 ? effectiveBreakdownMetricIds : [metrics[0]],
      dimensionIds:
        effectiveBreakdownDims.length > 0 ? effectiveBreakdownDims : ["date", "app"],
    }),
    [breakdownChartType, effectiveBreakdownMetricIds, effectiveBreakdownDims, metrics],
  )

  const handleExportTrendImage = useCallback(async () => {
    if (trendChartRef.current) {
      await exportChartContainerAsPng(trendChartRef.current, "my-report-trend-chart.png")
    }
  }, [])

  const handleExportBreakdownImage = useCallback(async () => {
    if (breakdownChartRef.current) {
      await exportChartContainerAsPng(breakdownChartRef.current, "my-report-breakdown-chart.png")
    }
  }, [])

  const handleDownloadTrend = useCallback(() => {
    const columns = [
      { id: "label", label: "Date" },
      ...effectiveTrendMetricIds.map((mId) => ({
        id: mId,
        label: metricCatalog.find((m) => m.id === mId)?.label ?? mId,
      })),
    ]
    if (compareActive && effectiveTrendMetricIds.length === 1) {
      columns.push({ id: `${effectiveTrendMetricIds[0]}__prev`, label: "Compare" })
    }
    exportRowsAsCsv(trendData, columns, "my-report-trend-chart.csv")
  }, [trendData, effectiveTrendMetricIds, metricCatalog, compareActive])

  const handleDownloadBreakdown = useCallback(() => {
    if (useMultiSeries && breakdownMulti.data.length > 0) {
      const columns = [
        { id: "label", label: "Date" },
        ...breakdownMulti.seriesKeys.map((key) => ({ id: key, label: key })),
      ]
      exportRowsAsCsv(breakdownMulti.data, columns, "my-report-breakdown-chart.csv")
      return
    }
    const columns = [
      { id: "label", label: "App" },
      ...effectiveBreakdownMetricIds.map((mId) => ({
        id: mId,
        label: metricCatalog.find((m) => m.id === mId)?.label ?? mId,
      })),
    ]
    exportRowsAsCsv(breakdownBar, columns, "my-report-breakdown-chart.csv")
  }, [useMultiSeries, breakdownMulti, breakdownBar, effectiveBreakdownMetricIds, metricCatalog])

  const handleApplyTrendEdit = useCallback(
    (draft: MyReportChartEditDraft) => {
      onChartMetricIdsChange(draft.metricIds)
      onChartTypeChange(draft.chartType)
      onTrendChartDimensionIdsChange(draft.dimensionIds)
    },
    [onChartMetricIdsChange, onChartTypeChange, onTrendChartDimensionIdsChange],
  )

  const handleApplyBreakdownEdit = useCallback(
    (draft: MyReportChartEditDraft) => {
      onBreakdownChartMetricIdsChange(draft.metricIds)
      onBreakdownChartTypeChange(draft.chartType)
      onBreakdownChartDimensionIdsChange(draft.dimensionIds)
    },
    [
      onBreakdownChartMetricIdsChange,
      onBreakdownChartTypeChange,
      onBreakdownChartDimensionIdsChange,
    ],
  )

  return (
    <div className="border-b border-gray-100 bg-white px-6 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-4">
        <PanelLayoutToggle layout={panelLayout} onChange={onPanelLayoutChange} />
      </div>

      <div
        className={cn(
          "flex gap-4",
          chartsStacked ? "flex-col" : "flex-col lg:flex-row",
        )}
      >
        <ChartPanel
          title={trendTitle}
          chartBodyRef={trendChartRef}
          onExportImage={handleExportTrendImage}
          onDownload={handleDownloadTrend}
          onEdit={() => setTrendEditOpen((open) => !open)}
          editOpen={trendEditOpen}
          editPanelKind="trend"
          editDraft={trendEditDraft}
          metrics={metrics}
          metricCatalog={metricCatalog}
          dimensionCatalog={dimensionCatalog}
          availableDimensionIds={dimensions}
          onEditOpenChange={setTrendEditOpen}
          onApplyEdit={handleApplyTrendEdit}
        >
          <TrendChart
            data={trendData}
            metricIds={effectiveTrendMetricIds.length > 0 ? effectiveTrendMetricIds : [metrics[0]]}
            metricCatalog={metricCatalog}
            chartType={chartType}
            compareActive={compareActive}
            dimensionIds={effectiveTrendDims}
          />
        </ChartPanel>
        <ChartPanel
          title={breakdownTitle}
          chartBodyRef={breakdownChartRef}
          onExportImage={handleExportBreakdownImage}
          onDownload={handleDownloadBreakdown}
          onEdit={() => setBreakdownEditOpen((open) => !open)}
          editOpen={breakdownEditOpen}
          editPanelKind="breakdown"
          editDraft={breakdownEditDraft}
          metrics={metrics}
          metricCatalog={metricCatalog}
          dimensionCatalog={dimensionCatalog}
          availableDimensionIds={dimensions}
          onEditOpenChange={setBreakdownEditOpen}
          onApplyEdit={handleApplyBreakdownEdit}
        >
          <BreakdownChart
            seriesData={breakdownMulti.data}
            seriesKeys={breakdownMulti.seriesKeys}
            barData={breakdownBar}
            metricIds={effectiveBreakdownMetricIds.length > 0 ? effectiveBreakdownMetricIds : [metrics[0]]}
            metricCatalog={metricCatalog}
            chartType={breakdownChartType}
            useMultiSeries={useMultiSeries}
            dimensionIds={effectiveBreakdownDims}
          />
        </ChartPanel>
      </div>
    </div>
  )
}
