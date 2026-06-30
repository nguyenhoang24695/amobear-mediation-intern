"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Percent,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Clock,
  Hash,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/hooks/use-api";
import {
  structureApi,
  appMetricsApi,
  dashboardApi,
  alertsApi,
} from "@/lib/api/services";
import { formatDateForAPI } from "@/lib/utils/dashboard";
import { hasScreenFunction } from "@/lib/auth";
import { AppWaterfallConfigCard } from "./app-waterfall-config-card";
import type { App, DateRangeType } from "@/types/api";

const colorMap: Record<string, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  purple: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

const axisTickStyle = { fontSize: 12, fill: "var(--muted-foreground)" };

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const formatCompactTick = (value: number) =>
  compactNumberFormatter.format(value).replace("K", "k");

const formatChartDateLabel = (value: string) => {
  const isoDate = value.split("T")[0];
  const [, month, day] = isoDate.split("-");

  if (month && day) {
    return `${Number(month)}-${Number(day)}`;
  }

  const fallbackDate = new Date(value);
  if (Number.isNaN(fallbackDate.getTime())) {
    return value;
  }

  return `${fallbackDate.getMonth() + 1}-${fallbackDate.getDate()}`;
};

interface AppOverviewTabProps {
  onNavigateToTab?: (tab: string) => void;
  refreshKey?: number;
}

export function AppOverviewTab({
  onNavigateToTab,
  refreshKey = 0,
}: AppOverviewTabProps) {
  const [chartMetric, setChartMetric] = useState<
    "revenue" | "ecpm" | "impressions"
  >("revenue");
  const [dateRange, setDateRange] = useState("7d");

  const params = useParams();
  const appIdFromParams = (params as any)?.id as string | undefined;
  const hasValidAppId = !!appIdFromParams;
  const canManageWaterfallConfigs = hasScreenFunction(
    "s-waterfall-rules",
    "manage-configs",
  );

  // Load app by AdMob app_id (URL dùng /apps/{appId})
  const { data: app } = useApi<App>(
    () => structureApi.getAppByAppId(appIdFromParams!),
    {
      enabled: hasValidAppId,
      cacheKey: hasValidAppId ? `app_detail_${appIdFromParams}` : undefined,
    },
  );

  // Build API params for chart - tương tự revenue-chart.tsx
  const chartApiParams = useMemo(() => {
    if (!app) return null;

    // Map dateRange string to DateRangeType
    let range: DateRangeType = "last7days";
    let startDate: string | undefined;
    let endDate: string | undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    const start = new Date(today);

    switch (dateRange) {
      case "14d":
        start.setDate(start.getDate() - 13);
        range = "last14days";
        break;
      case "30d":
        start.setDate(start.getDate() - 29);
        range = "last30days";
        break;
      case "90d":
        start.setDate(start.getDate() - 89);
        range = "custom"; // Use custom for 90 days
        break;
      case "7d":
      default:
        start.setDate(start.getDate() - 6);
        range = "last7days";
        break;
    }

    return {
      range,
      startDate: formatDateForAPI(start),
      endDate: formatDateForAPI(end),
      metric: chartMetric,
    };
  }, [app, dateRange, chartMetric]);

  // Metrics for cards - mặc định dùng cache 7 ngày cho tất cả (API tự động check cache)
  // MTD gọi database khi cần
  const { data: metrics } = useApi(
    async () => {
      if (!app) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 6);
      const last7Str = formatDateForAPI(last7);
      const todayStr = formatDateForAPI(today);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStartStr = formatDateForAPI(monthStart);

      const [last7Metrics, mtdMetrics] = await Promise.all([
        appMetricsApi
          .getAppMetrics(app.appId, { startDate: last7Str, endDate: todayStr })
          .catch(() => null),
        appMetricsApi
          .getAppMetrics(app.appId, {
            startDate: monthStartStr,
            endDate: todayStr,
          })
          .catch(() => null),
      ]);

      return { last7Metrics, mtdMetrics };
    },
    {
      enabled: !!app,
      cacheKey: app
        ? `app_metrics_overview_${app.appId}_${refreshKey}`
        : undefined,
    },
  );

  const statsCards = useMemo(() => {
    if (!metrics) return [];

    const { last7Metrics, mtdMetrics } = metrics;

    const revenue7d = last7Metrics?.totalRevenue ?? 0;
    const mtdRevenue = mtdMetrics?.totalRevenue ?? 0;
    const avgEcpm = last7Metrics?.avgEcpm ?? 0;
    const impressions7d = last7Metrics?.totalImpressions ?? 0;
    const fillRate7d = (last7Metrics?.avgFillRate ?? 0) * 100;

    return [
      {
        label: "Revenue (7d)",
        value: `$${revenue7d.toFixed(2)}`,
        change: last7Metrics?.revenueChange ?? 0,
        icon: DollarSign,
        color: "blue",
      },
      {
        label: "Revenue MTD",
        value: `$${mtdRevenue.toFixed(2)}`,
        change: mtdMetrics?.revenueChange ?? 0,
        icon: DollarSign,
        color: "green",
      },
      {
        label: "eCPM (7d avg)",
        value: `$${avgEcpm.toFixed(2)}`,
        change: last7Metrics?.ecpmChange ?? 0,
        icon: BarChart3,
        color: "purple",
      },
      {
        label: "Impressions (7d)",
        value: impressions7d.toLocaleString(),
        change: last7Metrics?.impressionsChange ?? 0,
        icon: Eye,
        color: "amber",
      },
      {
        label: "Fill Rate (7d)",
        value: `${fillRate7d.toFixed(2)}%`,
        change: last7Metrics?.fillRateChange ?? 0,
        icon: Percent,
        color: "cyan",
      },
    ];
  }, [metrics]);

  // Performance data for chart - sử dụng API giống revenue-chart.tsx
  // API sẽ tự động dùng cache cho 7days, 14days, 30days, gọi database cho custom range
  const fetchChartData = useMemo(() => {
    if (!app || !chartApiParams) return () => Promise.resolve(null);
    // API endpoint expects AdMob AppId (string), not database ID
    return () =>
      dashboardApi.getRevenueOverviewForApp(app.appId, chartApiParams);
  }, [app, chartApiParams]);

  const cacheKey = useMemo(() => {
    if (!app || !chartApiParams) return undefined;
    return `app_revenue_overview_${app.appId}_${dateRange}_${chartMetric}_${refreshKey}`;
  }, [app, chartApiParams, dateRange, chartMetric, refreshKey]);

  const { data: revenueOverviewData, loading: performanceLoading } = useApi(
    fetchChartData,
    {
      enabled: !!app && !!chartApiParams,
      cacheKey,
    },
  );

  // Process chart data from API format - tương tự revenue-chart.tsx
  const performanceData = useMemo(() => {
    if (!revenueOverviewData?.data || revenueOverviewData.data.length === 0)
      return [];

    // Map API data to chart format
    return revenueOverviewData.data.map((item) => {
      return {
        dateLabel: formatChartDateLabel(item.date),
        date: item.date,
        revenue: chartMetric === "revenue" ? item.value : 0,
        ecpm: chartMetric === "ecpm" ? item.value : 0,
        impressions: chartMetric === "impressions" ? item.value : 0,
      };
    });
  }, [revenueOverviewData, chartMetric]);

  const canViewAlertsCenter = useMemo(
    () => hasScreenFunction("s-alerts", "view"),
    [],
  );

  // Active alerts for this app
  const { data: alerts } = useApi(
    async () => {
      if (!app) return null;
      return alertsApi.getActiveAlerts({ appId: app.appId });
    },
    {
      enabled: !!app && canViewAlertsCenter,
      cacheKey: app ? `app_alerts_${app.appId}_${refreshKey}` : undefined,
    },
  );

  const metricConfig = {
    revenue: {
      key: "revenue",
      label: "Revenue",
      format: (v: number) => `$${v.toFixed(2)}`,
      tickFormat: (v: number) => `$${formatCompactTick(v)}`,
      color: "var(--primary)",
    },
    ecpm: {
      key: "ecpm",
      label: "eCPM",
      format: (v: number) => `$${v.toFixed(2)}`,
      tickFormat: (v: number) => `$${formatCompactTick(v)}`,
      color: "var(--chart-2)",
    },
    impressions: {
      key: "impressions",
      label: "Impressions",
      format: (v: number) => v.toLocaleString(),
      tickFormat: formatCompactTick,
      color: "var(--chart-4)",
    },
  };

  const config = metricConfig[chartMetric];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statsCards.length === 0 ? (
          <Card className="border-border sm:col-span-2 xl:col-span-5">
            <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
              Loading metrics...
            </CardContent>
          </Card>
        ) : (
          statsCards.map((stat, idx) => (
            <Card key={idx} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="break-words text-xl font-semibold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorMap[stat.color]}`}
                  >
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                  {stat.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs font-medium ${stat.change >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-destructive"}`}
                  >
                    {stat.change > 0 ? "+" : ""}
                    {stat.change.toFixed(2)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs previous
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        {/* Left Column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Performance Chart Card */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Performance
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Track key metrics over time
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="h-9 w-full sm:w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="14d">Last 14 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Tabs
                    value={chartMetric}
                    onValueChange={(v) =>
                      setChartMetric(v as typeof chartMetric)
                    }
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="h-auto w-full flex-wrap justify-start sm:h-9 sm:w-auto sm:flex-nowrap">
                      <TabsTrigger
                        value="revenue"
                        className="min-h-8 flex-1 px-3 text-xs sm:flex-none"
                      >
                        Revenue
                      </TabsTrigger>
                      <TabsTrigger
                        value="ecpm"
                        className="min-h-8 flex-1 px-3 text-xs sm:flex-none"
                      >
                        eCPM
                      </TabsTrigger>
                      <TabsTrigger
                        value="impressions"
                        className="min-h-8 flex-1 px-3 text-xs sm:flex-none"
                      >
                        Impressions
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64 sm:h-72">
                {performanceLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading chart data...
                  </div>
                ) : performanceData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    No data available for the selected period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={performanceData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorMetric"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={config.color}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor={config.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="dateLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={axisTickStyle}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={axisTickStyle}
                        tickFormatter={config.tickFormat}
                        dx={-10}
                        width={54}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md">
                                <p className="text-sm font-medium">
                                  {label}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {config.label}:{" "}
                                  <span
                                    className="font-semibold"
                                    style={{ color: config.color }}
                                  >
                                    {config.format(payload[0].value as number)}
                                  </span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={config.key}
                        stroke={config.color}
                        strokeWidth={2}
                        fill="url(#colorMetric)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ad Format Performance Card */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">
                Ad Format Performance
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Revenue distribution by format (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown by ad format will be available in a future
                update.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Ad Units Summary Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Ad Units Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">
                    Total ad units
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {app?.adUnitsCount ?? 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  View the Ad Units tab for detailed configuration and
                  performance per unit.
                </p>
              </div>
              <Button
                variant="link"
                className="mt-4 h-auto gap-1 p-0 text-primary"
                onClick={() => onNavigateToTab?.("ad-units")}
              >
                Manage Ad Units
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Mediation Groups Summary Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Mediation Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                View and manage mediation groups associated with this app in the
                Mediation Groups tab.
              </p>
              <Button
                variant="link"
                className="mt-4 h-auto gap-1 p-0 text-primary"
                onClick={() => onNavigateToTab?.("mediation-groups")}
              >
                View All Groups
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Waterfall Config Card */}
          <AppWaterfallConfigCard
            app={app}
            canManage={canManageWaterfallConfigs}
            refreshKey={refreshKey}
          />

          {/* Top Networks Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Top Networks
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Revenue contribution by network (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Network-level breakdown for this app will be available in a
                future update.
              </p>
            </CardContent>
          </Card>

          {/* Active Alerts Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">
                  Active Alerts
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-destructive/10 text-destructive"
                >
                  {alerts?.data?.length ?? 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {!alerts || alerts.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active alerts for this app today.
                  </p>
                ) : (
                  alerts.data.slice(0, 5).map((alert) => {
                    const isError =
                      alert.severity === "CRITICAL" ||
                      alert.severity === "HIGH";
                    const triggeredTime = new Date(
                      alert.triggeredAt,
                    ).toLocaleString();
                    return (
                      <Link
                        key={alert.id}
                        href={`/alert-center/${alert.id}`}
                        className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                          isError
                            ? "bg-destructive/10 hover:bg-destructive/15"
                            : "bg-amber-500/10 hover:bg-amber-500/15"
                        }`}
                      >
                        {isError ? (
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                        )}
                        <div className="min-w-0">
                          <p className="break-words text-sm text-foreground">
                            {alert.message}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {triggeredTime}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
              <Link
                href={
                  app
                    ? `/alert-center?appId=${encodeURIComponent(app.appId)}`
                    : "/alert-center"
                }
              >
                <Button
                  variant="link"
                  className="mt-4 h-auto gap-1 p-0 text-primary"
                >
                  View All Alerts
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {app ? new Date(app.createdAt).toLocaleDateString() : "--"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last Modified</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {app ? new Date(app.updatedAt).toLocaleDateString() : "--"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span className="text-sm">AdMob App ID</span>
                  </div>
                  <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:max-w-[180px] xl:max-w-[140px]">
                    {app?.appId ? app.appId.slice(-12) : "--"}
                  </code>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Revenue (30 days)</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    {metrics?.mtdMetrics
                      ? `$${metrics.mtdMetrics.totalRevenue.toFixed(2)}`
                      : "$0.00"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
