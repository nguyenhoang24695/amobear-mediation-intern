"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  chartMetricId: string
  chartType: MyReportChartType
  breakdownChartMetricId: string
  breakdownChartType: MyReportChartType
  trendChartDimensionIds: string[]
  breakdownChartDimensionIds: string[]
  panelLayout: MyReportPanelLayout
  compareActive: boolean
  onChartMetricChange: (metricId: string) => void
  onChartTypeChange: (type: MyReportChartType) => void
  onBreakdownChartMetricChange: (metricId: string) => void
  onBreakdownChartTypeChange: (type: MyReportChartType) => void
  onTrendChartDimensionIdsChange: (dimensionIds: string[]) => void
  onBreakdownChartDimensionIdsChange: (dimensionIds: string[]) => void
  onPanelLayoutChange: (layout: MyReportPanelLayout) => void
}

type TrendPoint = { label: string; current: number; previous: number }

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
  metricLabel: string,
  dimensionIds: string[],
  dimensionCatalog: CustomReportCatalogItem[],
): string {
  if (dimensionIds.length === 0) return metricLabel
  const parts = dimensionIds.map((id) => dimensionTitlePart(id, dimensionCatalog))
  return `${metricLabel} by ${parts.join(", ")}`
}

function buildTrendByDate(
  rows: CompareEnrichedRow[],
  metricId: string,
  compareActive: boolean,
): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>()
  for (const row of rows) {
    const label = String(row.date ?? "")
    if (!label) continue
    const current = toChartNumber(row[metricId])
    const previous = compareActive ? toChartNumber(row.__compare?.[metricId]) : 0
    const existing = byDate.get(label)
    if (existing) {
      existing.current += current
      existing.previous += previous
    } else {
      byDate.set(label, { label, current, previous })
    }
  }
  return [...byDate.values()].sort((a, b) => a.label.localeCompare(b.label))
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

function buildBreakdownByAppBar(
  rows: CompareEnrichedRow[],
  metricId: string,
): TrendPoint[] {
  const byApp = new Map<string, TrendPoint>()
  for (const row of rows) {
    const label = String(row.app ?? row.app_id ?? "Unknown")
    const current = toChartNumber(row[metricId])
    const existing = byApp.get(label)
    if (existing) existing.current += current
    else byApp.set(label, { label, current, previous: 0 })
  }
  return [...byApp.values()].sort((a, b) => b.current - a.current).slice(0, BREAKDOWN_TOP_N)
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

function TrendChart({
  data,
  metricId,
  metricCatalog,
  chartType,
  compareActive,
}: {
  data: TrendPoint[]
  metricId: string
  metricCatalog: CustomReportCatalogItem[]
  chartType: MyReportChartType
  compareActive: boolean
}) {
  const tickFmt = (v: number) => formatAxisTick(v, metricId, metricCatalog)
  const tooltipFmt = (v: number, name: string) =>
    [formatMetricValue(v, metricId, metricCatalog), name] as [string, string]

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-500" style={{ height: CHART_HEIGHT }}>
        No trend data for the selected metric.
      </div>
    )
  }

  if (chartType === "bar") {
    return (
      <ChartFrame>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          {compareActive ? <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} /> : null}
          <Bar dataKey="current" name="Current" fill="#2563eb" />
          {compareActive ? <Bar dataKey="previous" name="Compare" fill="#94a3b8" /> : null}
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
          {compareActive ? <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} /> : null}
          <Area type="monotone" dataKey="current" name="Current" stroke="#2563eb" fill="#93c5fd" />
          {compareActive ? <Area type="monotone" dataKey="previous" name="Compare" stroke="#64748b" fill="#cbd5e1" /> : null}
        </AreaChart>
      </ChartFrame>
    )
  }

  return (
    <ChartFrame>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
        <Tooltip formatter={tooltipFmt} />
        {compareActive ? <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} /> : null}
        <Line type="monotone" dataKey="current" name="Current" stroke="#2563eb" strokeWidth={2} dot={false} />
        {compareActive ? <Line type="monotone" dataKey="previous" name="Compare" stroke="#64748b" strokeWidth={2} dot={false} /> : null}
      </LineChart>
    </ChartFrame>
  )
}

function BreakdownChart({
  seriesData,
  seriesKeys,
  barData,
  metricId,
  metricCatalog,
  chartType,
  useMultiSeries,
}: {
  seriesData: BreakdownPoint[]
  seriesKeys: string[]
  barData: TrendPoint[]
  metricId: string
  metricCatalog: CustomReportCatalogItem[]
  chartType: MyReportChartType
  useMultiSeries: boolean
}) {
  const tickFmt = (v: number) => formatAxisTick(v, metricId, metricCatalog)
  const tooltipFmt = (v: number, name: string) =>
    [formatMetricValue(v, metricId, metricCatalog), name] as [string, string]

  if (useMultiSeries && seriesData.length > 0 && seriesKeys.length > 0) {
    if (chartType === "bar") {
      return (
        <ChartFrame>
          <BarChart data={seriesData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} dy={4} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
            <Tooltip formatter={tooltipFmt} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
            {seriesKeys.map((key, index) => (
              <Bar key={key} dataKey={key} name={key} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
            ))}
          </BarChart>
        </ChartFrame>
      )
    }

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

  return (
    <ChartFrame>
      <BarChart data={barData} margin={{ ...CHART_MARGIN, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} interval={0} angle={-25} textAnchor="end" height={52} dy={4} />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} width={64} tickFormatter={tickFmt} />
        <Tooltip formatter={(v: number) => formatMetricValue(v, metricId, metricCatalog)} />
        <Bar dataKey="current" name="Current" fill="#2563eb" />
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
  chartMetricId,
  chartType,
  breakdownChartMetricId,
  breakdownChartType,
  trendChartDimensionIds,
  breakdownChartDimensionIds,
  panelLayout,
  compareActive,
  onChartMetricChange,
  onChartTypeChange,
  onBreakdownChartMetricChange,
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

  const hasDateTrend = effectiveTrendDims.includes("date")
  const hasDateBreakdown = effectiveBreakdownDims.includes("date")
  const hasAppBreakdown = effectiveBreakdownDims.includes("app")

  const trendMetricLabel =
    metricCatalog.find((m) => m.id === chartMetricId)?.label ?? chartMetricId
  const breakdownMetricLabel =
    metricCatalog.find((m) => m.id === breakdownChartMetricId)?.label ?? breakdownChartMetricId

  const trendData = useMemo(
    () => (hasDateTrend ? buildTrendByDate(rows, chartMetricId, compareActive) : []),
    [rows, chartMetricId, compareActive, hasDateTrend],
  )

  const breakdownMulti = useMemo(
    () =>
      hasDateBreakdown && hasAppBreakdown
        ? buildBreakdownByAppOverDate(rows, breakdownChartMetricId)
        : { data: [], seriesKeys: [] },
    [rows, breakdownChartMetricId, hasDateBreakdown, hasAppBreakdown],
  )

  const breakdownBar = useMemo(
    () => (hasAppBreakdown ? buildBreakdownByAppBar(rows, breakdownChartMetricId) : []),
    [rows, breakdownChartMetricId, hasAppBreakdown],
  )

  const useMultiSeries = breakdownMulti.seriesKeys.length > 0

  const trendTitle = buildChartTitle(trendMetricLabel, effectiveTrendDims, dimensionCatalog)
  const breakdownTitle = buildChartTitle(
    breakdownMetricLabel,
    effectiveBreakdownDims,
    dimensionCatalog,
  )

  const chartsStacked = panelLayout === "stacked"

  const trendEditDraft = useMemo(
    (): MyReportChartEditDraft => ({
      chartType,
      metricId: chartMetricId,
      dimensionIds: effectiveTrendDims.length > 0 ? effectiveTrendDims : ["date"],
    }),
    [chartType, chartMetricId, effectiveTrendDims],
  )

  const breakdownEditDraft = useMemo(
    (): MyReportChartEditDraft => ({
      chartType: breakdownChartType,
      metricId: breakdownChartMetricId,
      dimensionIds:
        effectiveBreakdownDims.length > 0 ? effectiveBreakdownDims : ["date", "app"],
    }),
    [breakdownChartType, breakdownChartMetricId, effectiveBreakdownDims],
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
      { id: "current", label: "Current" },
    ]
    if (compareActive) columns.push({ id: "previous", label: "Compare" })
    exportRowsAsCsv(trendData, columns, "my-report-trend-chart.csv")
  }, [trendData, compareActive])

  const handleDownloadBreakdown = useCallback(() => {
    if (useMultiSeries && breakdownMulti.data.length > 0) {
      const columns = [
        { id: "label", label: "Date" },
        ...breakdownMulti.seriesKeys.map((key) => ({ id: key, label: key })),
      ]
      exportRowsAsCsv(breakdownMulti.data, columns, "my-report-breakdown-chart.csv")
      return
    }
    exportRowsAsCsv(
      breakdownBar.map((row) => ({ label: row.label, current: row.current })),
      [
        { id: "label", label: "App" },
        { id: "current", label: breakdownMetricLabel },
      ],
      "my-report-breakdown-chart.csv",
    )
  }, [useMultiSeries, breakdownMulti, breakdownBar, breakdownMetricLabel])

  const handleApplyTrendEdit = useCallback(
    (draft: MyReportChartEditDraft) => {
      onChartMetricChange(draft.metricId)
      onChartTypeChange(draft.chartType)
      onTrendChartDimensionIdsChange(draft.dimensionIds)
    },
    [onChartMetricChange, onChartTypeChange, onTrendChartDimensionIdsChange],
  )

  const handleApplyBreakdownEdit = useCallback(
    (draft: MyReportChartEditDraft) => {
      onBreakdownChartMetricChange(draft.metricId)
      onBreakdownChartTypeChange(draft.chartType)
      onBreakdownChartDimensionIdsChange(draft.dimensionIds)
    },
    [
      onBreakdownChartMetricChange,
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
            metricId={chartMetricId}
            metricCatalog={metricCatalog}
            chartType={chartType}
            compareActive={compareActive}
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
            metricId={breakdownChartMetricId}
            metricCatalog={metricCatalog}
            chartType={breakdownChartType}
            useMultiSeries={useMultiSeries}
          />
        </ChartPanel>
      </div>
    </div>
  )
}
