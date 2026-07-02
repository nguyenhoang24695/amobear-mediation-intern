"use client";

import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { structureApi } from "@/lib/api/services";
import {
  enrichGrowthPoints,
  symmetricDeviationDomain,
  type GrowthAnomalyDirection,
  type GrowthAnomalyReason,
  type GrowthChartPoint,
  type GrowthRawPoint,
} from "@/lib/performance/today-growth-chart-utils";
import type { AppGrowthTodayResponseDto } from "@/types/api";

interface AppPerformanceTodayGrowthTabProps {
  appId: string;
}

type GrowthChartView = "cumulative" | "anomaly";
type CumulativeSeriesKey = "value" | "trend";
type LegendClickHandler = NonNullable<ComponentProps<typeof Legend>["onClick"]>;

const CUMULATIVE_CHART_LEGEND_SERIES_COUNT = 2;
const ANOMALY_CHART_LEGEND_SERIES_COUNT = 1;

function growthChartLegendProps(
  seriesCount: number,
  options?: {
    onToggleClick: LegendClickHandler;
    isSeriesHidden: (dataKey: string) => boolean;
  },
): Pick<
  ComponentProps<typeof Legend>,
  "onClick" | "wrapperStyle" | "formatter"
> {
  if (seriesCount <= 1) {
    return {
      formatter: (value) => (
        <span className="text-sm select-none text-muted-foreground">{value}</span>
      ),
    };
  }

  return {
    onClick: options?.onToggleClick,
    wrapperStyle: { cursor: "pointer" },
    formatter: (value, entry) => {
      const dataKey = String(entry?.dataKey ?? "");
      const hidden = options?.isSeriesHidden(dataKey) ?? false;
      return (
        <span
          className={`text-sm select-none ${hidden ? "text-muted-foreground/50 line-through" : "text-muted-foreground"}`}
        >
          {value}
        </span>
      );
    },
  };
}

function fmtUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSyncedAtLabel(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "HH:mm");
}

function anomalyReasonLabel(reason: GrowthAnomalyReason): string {
  switch (reason) {
    case "residual":
      return "Lệch so với xu hướng tuyến tính";
    case "increment":
      return "Bước tăng bất thường giữa các lần sync";
    case "both":
      return "Lệch xu hướng và bước tăng bất thường";
  }
}

function anomalyDirectionLabel(direction: GrowthAnomalyDirection): string {
  return direction === "high"
    ? "Cao hơn xu hướng kỳ vọng"
    : "Thấp hơn xu hướng kỳ vọng";
}

function deviationBarFill(payload: GrowthChartPoint): string {
  if (payload.isAnomaly) return "#f97316";
  const residual = payload.residual ?? 0;
  if (residual > 0) return "#86efac";
  if (residual < 0) return "#fca5a5";
  return "#cbd5e1";
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] w-full" />;
}

function CumulativeChart({
  title,
  description,
  reportDate,
  points,
  strokeColor,
  emptyHint,
}: {
  title: string;
  description: string;
  reportDate: string;
  points: GrowthRawPoint[];
  strokeColor: string;
  emptyHint: string;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<CumulativeSeriesKey>>(
    () => new Set(),
  );

  const chartData = useMemo(() => enrichGrowthPoints(points), [points]);

  const toggleSeries = useCallback((seriesKey: CumulativeSeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesKey)) next.delete(seriesKey);
      else next.add(seriesKey);
      return next;
    });
  }, []);

  const handleLegendClick = useCallback<LegendClickHandler>(
    (entry, _index, _event) => {
      const key = String(entry.dataKey ?? "");
      if (key === "value" || key === "trend") toggleSeries(key);
    },
    [toggleSeries],
  );

  const isHidden = useCallback(
    (key: CumulativeSeriesKey) => hiddenSeries.has(key),
    [hiddenSeries],
  );
  const canToggleLegend = CUMULATIVE_CHART_LEGEND_SERIES_COUNT > 1;
  const cumulativeLegendProps = growthChartLegendProps(
    CUMULATIVE_CHART_LEGEND_SERIES_COUNT,
    {
      onToggleClick: handleLegendClick,
      isSeriesHidden: (dataKey) =>
        (dataKey === "value" || dataKey === "trend") && isHidden(dataKey),
    },
  );

  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {description}
          {reportDate ? ` · ${reportDate}` : null}
          {canToggleLegend ? (
            <>
              {" · "}
              Click legend to show or hide a series
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            {emptyHint}
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            Cần ít nhất 2 điểm sync để vẽ xu hướng tuyến tính.
          </div>
        ) : (
          <div className="h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `$${v}`}
                  dx={-5}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as GrowthChartPoint;
                    return (
                      <div className="min-w-[160px] rounded-lg border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur">
                        <p className="mb-1 text-xs text-muted-foreground">
                          {row.syncedAt
                            ? format(parseISO(row.syncedAt), "MMM dd, HH:mm")
                            : row.label}
                        </p>
                        {!(canToggleLegend && isHidden("value")) ? (
                          <p
                            className="text-sm font-semibold"
                            style={{ color: strokeColor }}
                          >
                            Cumulative: {fmtUsd(row.value)}
                          </p>
                        ) : null}
                        {!(canToggleLegend && isHidden("trend")) &&
                        row.trend != null ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Trend: {fmtUsd(row.trend)}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  {...cumulativeLegendProps}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: strokeColor }}
                  activeDot={{ r: 5 }}
                  name="Cumulative"
                  connectNulls
                  hide={canToggleLegend && isHidden("value")}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  name="Linear trend"
                  connectNulls
                  hide={canToggleLegend && isHidden("trend")}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnomalyDetectionChart({
  title,
  description,
  reportDate,
  points,
  strokeColor,
  emptyHint,
}: {
  title: string;
  description: string;
  reportDate: string;
  points: GrowthRawPoint[];
  strokeColor: string;
  emptyHint: string;
}) {
  const chartData = useMemo(() => enrichGrowthPoints(points), [points]);
  const anomalies = useMemo(
    () => chartData.filter((p) => p.isAnomaly),
    [chartData],
  );
  const deviationYDomain = useMemo(
    () => symmetricDeviationDomain(chartData.map((p) => p.residual)),
    [chartData],
  );
  const anomalyLegendProps = growthChartLegendProps(
    ANOMALY_CHART_LEGEND_SERIES_COUNT,
  );

  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {description}
              {reportDate ? ` · ${reportDate}` : null}
              {" · "}
              Actual cao hơn expected → trên đường ngang; thấp hơn → dưới đường
              ngang
            </CardDescription>
          </div>
          {chartData.length >= 3 ? (
            <Badge
              variant="outline"
              className={
                anomalies.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              }
            >
              {anomalies.length > 0
                ? `${anomalies.length} anomaly`
                : "No anomaly"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            {emptyHint}
          </div>
        ) : chartData.length < 3 ? (
          <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            Cần ít nhất 3 điểm sync để phát hiện dị thường.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span className="text-emerald-700 dark:text-emerald-300">↑ Actual cao hơn expected</span>
              <span className="text-rose-700 dark:text-rose-300">Actual thấp hơn expected ↓</span>
            </div>
            <div className="h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    dy={8}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={deviationYDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => {
                      const n = Number(v);
                      const sign = n > 0 ? "+" : n < 0 ? "-" : "";
                      return `${sign}$${Math.abs(n)}`;
                    }}
                    dx={-5}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as GrowthChartPoint;
                      const residual = row.residual ?? 0;
                      return (
                        <div className="min-w-[180px] rounded-lg border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur">
                          <p className="mb-1 text-xs text-muted-foreground">
                            {row.syncedAt
                              ? format(parseISO(row.syncedAt), "MMM dd, HH:mm")
                              : row.label}
                          </p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: strokeColor }}
                          >
                            Actual: {fmtUsd(row.value)}
                          </p>
                          {row.trend != null ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Expected: {fmtUsd(row.trend)}
                            </p>
                          ) : null}
                          {row.residual != null ? (
                            <p
                              className={`mt-1 text-sm font-medium ${
                                residual > 0
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : residual < 0
                                    ? "text-rose-600 dark:text-rose-300"
                                    : "text-muted-foreground"
                              }`}
                            >
                              Deviation: {residual >= 0 ? "+" : ""}
                              {fmtUsd(residual)}
                            </p>
                          ) : null}
                          {row.increment != null ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Step: {fmtUsd(row.increment)}
                            </p>
                          ) : null}
                          {row.isAnomaly && row.anomalyDirection ? (
                            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                              {anomalyDirectionLabel(row.anomalyDirection)}
                            </p>
                          ) : null}
                          {row.isAnomaly && row.anomalyReason ? (
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              {anomalyReasonLabel(row.anomalyReason)}
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    {...anomalyLegendProps}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#64748b"
                    strokeWidth={2}
                    label={{
                      value: "Expected (baseline)",
                      position: "insideTopRight",
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="residualBar"
                    name="Actual vs expected"
                    baseValue={0}
                    maxBarSize={22}
                    radius={[3, 3, 3, 3]}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`${entry.syncedAt}-${entry.index}`}
                        fill={deviationBarFill(entry)}
                        stroke={entry.isAnomaly ? "#c2410c" : undefined}
                        strokeWidth={entry.isAnomaly ? 1.5 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {anomalies.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Điểm dị thường phát hiện
                </p>
                <ul className="space-y-1.5 text-sm text-amber-900/90">
                  {anomalies.map((row) => (
                    <li
                      key={row.syncedAt}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                    >
                      <span className="font-medium">
                        {row.syncedAt
                          ? format(parseISO(row.syncedAt), "HH:mm")
                          : row.label}
                      </span>
                      <span>{fmtUsd(row.value)}</span>
                      {row.anomalyDirection ? (
                        <span className="text-xs font-medium text-amber-900">
                          {row.anomalyDirection === "high" ? "↑" : "↓"}{" "}
                          {anomalyDirectionLabel(row.anomalyDirection)}
                        </span>
                      ) : null}
                      {row.anomalyReason ? (
                        <span className="text-xs text-amber-800">
                          — {anomalyReasonLabel(row.anomalyReason)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AppPerformanceTodayGrowthTab({
  appId,
}: AppPerformanceTodayGrowthTabProps) {
  const [chartView, setChartView] = useState<GrowthChartView>("cumulative");

  const fetchGrowth = useMemo(
    () => () => structureApi.getAppPerformanceGrowthToday(appId),
    [appId],
  );

  const cacheKey = `app_perf_growth_today_${appId}`;
  const { data, loading, error } = useApi<AppGrowthTodayResponseDto>(
    fetchGrowth,
    {
      enabled: !!appId,
      cacheKey,
    },
  );

  const revenueChartData = useMemo<GrowthRawPoint[]>(() => {
    return (data?.revenuePoints ?? []).map((p) => ({
      label: formatSyncedAtLabel(p.syncedAt),
      value: Number(p.value),
      syncedAt: p.syncedAt,
    }));
  }, [data?.revenuePoints]);

  const costChartData = useMemo<GrowthRawPoint[]>(() => {
    return (data?.costPoints ?? []).map((p) => ({
      label: formatSyncedAtLabel(p.syncedAt),
      value: Number(p.value),
      syncedAt: p.syncedAt,
    }));
  }, [data?.costPoints]);

  if (loading && data == null && !error) {
    return (
      <div className="flex flex-col gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/10 text-destructive">
          <AlertTitle>Could not load today growth</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today Growth</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cumulative totals sau mỗi lần job sync hôm nay — revenue (UTC) và UA
            cost (local server).
            {data?.latestRevenue != null ? (
              <span className="ml-2 font-medium text-emerald-700 dark:text-emerald-300">
                Revenue: {fmtUsd(data.latestRevenue)}
              </span>
            ) : null}
            {data?.latestCost != null ? (
              <span className="ml-2 font-medium text-rose-600 dark:text-rose-300">
                Cost: {fmtUsd(data.latestCost)}
              </span>
            ) : null}
          </p>
        </div>
        <Tabs
          value={chartView}
          onValueChange={(v) => {
            if (v === "cumulative" || v === "anomaly") setChartView(v);
          }}
          className="w-fit"
        >
          <TabsList className="h-9 bg-muted p-1">
            <TabsTrigger
              value="cumulative"
              className="px-3 text-xs data-[state=active]:bg-background"
            >
              Cumulative
            </TabsTrigger>
            <TabsTrigger
              value="anomaly"
              className="px-3 text-xs data-[state=active]:bg-background"
            >
              Anomaly detection
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={chartView} className="w-full">
        <TabsContent value="cumulative" className="mt-0 flex flex-col gap-6">
          <CumulativeChart
            title="Cumulative Revenue Chart"
            description="Tổng estimated earnings (bronze.admob_revenue_table) theo từng lần sync"
            reportDate={data?.revenueReportDate ?? ""}
            points={revenueChartData}
            strokeColor="#22c55e"
            emptyHint="Chưa có snapshot revenue hôm nay. Chờ job performance-sync-admob-revenue-today hoặc chạy sync thủ công."
          />

          <CumulativeChart
            title="Cumulative Cost Chart"
            description="Tổng XMP cost (bronze.xmp_report) theo store package của app"
            reportDate={data?.costReportDate ?? ""}
            points={costChartData}
            strokeColor="#ef4444"
            emptyHint="Chưa có snapshot UA cost hôm nay. Chờ job xmp-sync-job-today hoặc kiểm tra mapping package / app store id."
          />
        </TabsContent>

        <TabsContent value="anomaly" className="mt-0 flex flex-col gap-6">
          <AnomalyDetectionChart
            title="Revenue Anomaly Detection"
            description="Độ lệch cumulative revenue so với xu hướng tuyến tính (residual)"
            reportDate={data?.revenueReportDate ?? ""}
            points={revenueChartData}
            strokeColor="#22c55e"
            emptyHint="Chưa có snapshot revenue hôm nay. Chờ job performance-sync-admob-revenue-today hoặc chạy sync thủ công."
          />

          <AnomalyDetectionChart
            title="Cost Anomaly Detection"
            description="Độ lệch cumulative UA cost so với xu hướng tuyến tính (residual)"
            reportDate={data?.costReportDate ?? ""}
            points={costChartData}
            strokeColor="#ef4444"
            emptyHint="Chưa có snapshot UA cost hôm nay. Chờ job xmp-sync-job-today hoặc kiểm tra mapping package / app store id."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
