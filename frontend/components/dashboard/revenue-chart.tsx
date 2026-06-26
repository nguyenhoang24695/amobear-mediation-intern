"use client";

import { useState, useMemo, useEffect, useId, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useApi } from "@/hooks/use-api";
import { dashboardApi } from "@/lib/api/services";
import { useDashboardDate } from "@/contexts/dashboard-date-context";
import {
  mapPresetToDateRangeType,
  formatDateForAPI,
} from "@/lib/utils/dashboard";
import type { DateRangeType } from "@/types/api";

type MetricKey = "revenue" | "ecpm" | "impressions";

const metricConfig = {
  revenue: {
    key: "revenue",
    label: "Revenue",
    format: (v: number) => formatCurrency(v),
  },
  ecpm: {
    key: "ecpm",
    label: "eCPM",
    format: (v: number) => `$${v.toFixed(2)}`,
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    format: (v: number) =>
      `${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  },
} satisfies Record<
  MetricKey,
  { key: MetricKey; label: string; format: (value: number) => string }
>;

const metricTabs = Object.values(metricConfig);

const chartConfig = {
  revenue: {
    label: "Revenue",
    theme: {
      light: "hsl(221 83% 53%)",
      dark: "hsl(217 91% 68%)",
    },
  },
  ecpm: {
    label: "eCPM",
    theme: {
      light: "hsl(142 76% 36%)",
      dark: "hsl(142 69% 58%)",
    },
  },
  impressions: {
    label: "Impressions",
    theme: {
      light: "hsl(262 83% 58%)",
      dark: "hsl(263 90% 72%)",
    },
  },
  previousRevenue: {
    label: "Previous period",
    theme: {
      light: "hsl(215 16% 47%)",
      dark: "hsl(215 20% 65%)",
    },
  },
} satisfies ChartConfig;

function formatCurrency(num: number): string {
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

function formatAxisCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(value);
}

function RevenueChartHeader({
  activeTab,
  onTabChange,
  description,
}: {
  activeTab: MetricKey;
  onTabChange: (value: MetricKey) => void;
  description: string;
}) {
  return (
    <CardHeader className="pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Revenue Overview
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as MetricKey)}
        >
          <TabsList className="h-9">
            {metricTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="px-3 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </CardHeader>
  );
}

function RevenueChartState({
  activeTab,
  onTabChange,
  description,
  children,
}: {
  activeTab: MetricKey;
  onTabChange: (value: MetricKey) => void;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <RevenueChartHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        description={description}
      />
      <CardContent className="pt-4">
        <div className="flex h-72 items-center justify-center">{children}</div>
      </CardContent>
    </Card>
  );
}

export function RevenueChart() {
  const [activeTab, setActiveTab] = useState<MetricKey>("revenue");
  const gradientId = `revenue-chart-${useId().replace(/:/g, "")}-${activeTab}`;
  const { appliedDateRange, appliedPreset, refreshKey } = useDashboardDate();
  const config = metricConfig[activeTab];

  const currentApiParams = useMemo(() => {
    const effectivePreset = appliedPreset || "7days";
    if (
      effectivePreset === "custom" &&
      appliedDateRange?.from &&
      appliedDateRange?.to
    ) {
      return {
        range: "custom" as DateRangeType,
        startDate: formatDateForAPI(appliedDateRange.from),
        endDate: formatDateForAPI(appliedDateRange.to),
        metric: activeTab,
      };
    }
    return {
      range: mapPresetToDateRangeType(effectivePreset),
      metric: activeTab,
    };
  }, [appliedPreset, appliedDateRange, activeTab]);

  const fetchChartData = useMemo(
    () => () => dashboardApi.getRevenueOverview(currentApiParams),
    [currentApiParams],
  );

  const cacheKey = useMemo(() => {
    const effectivePreset = appliedPreset || "7days";
    if (
      effectivePreset === "custom" &&
      appliedDateRange?.from &&
      appliedDateRange?.to
    ) {
      return `revenue_overview_custom_${formatDateForAPI(appliedDateRange.from)}_${formatDateForAPI(appliedDateRange.to)}_${activeTab}`;
    }
    return `revenue_overview_${effectivePreset}_${activeTab}`;
  }, [appliedPreset, appliedDateRange, activeTab]);

  const {
    data: revenueOverviewData,
    loading: chartLoading,
    refetch: refetchChart,
  } = useApi(fetchChartData, { enabled: true, cacheKey });

  useEffect(() => {
    if (refreshKey > 0) {
      refetchChart();
    }
  }, [refreshKey]);

  const processedChartData = useMemo(() => {
    if (!revenueOverviewData?.data || revenueOverviewData.data.length === 0)
      return [];

    const mappedData = revenueOverviewData.data.map((item) => {
      return {
        dateLabel: formatMonthDay(item.date),
        date: item.date,
        revenue: activeTab === "revenue" ? item.value : 0,
        previousRevenue:
          activeTab === "revenue" ? item.comparisonValue || 0 : 0,
        ecpm: activeTab === "ecpm" ? item.value : 0,
        impressions: activeTab === "impressions" ? item.value : 0,
      };
    });

    return mappedData;
  }, [revenueOverviewData, activeTab]);

  const isLoading = chartLoading;

  if (isLoading) {
    return (
      <RevenueChartState
        activeTab={activeTab}
        onTabChange={setActiveTab}
        description="Performance metrics over time"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </RevenueChartState>
    );
  }

  if (processedChartData.length === 0) {
    return (
      <RevenueChartState
        activeTab={activeTab}
        onTabChange={setActiveTab}
        description="Performance metrics over time"
      >
        <span className="text-sm text-muted-foreground">No data available</span>
      </RevenueChartState>
    );
  }

  return (
    <Card>
      <RevenueChartHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        description="Performance metrics over time"
      />
      <CardContent className="pt-4">
        <div className="h-72">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full aspect-auto"
          >
            <AreaChart
              data={processedChartData}
              margin={{ top: 10, right: 10, left: 36, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={`var(--color-${activeTab})`}
                    stopOpacity={0.24}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--color-${activeTab})`}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#ccc"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={
                  activeTab === "revenue" || activeTab === "impressions"
                    ? formatAxisCompact
                    : config.format
                }
                dx={-10}
                width={36}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {config.label}:{" "}
                          <span
                            className="font-semibold"
                            style={{ color: `var(--color-${activeTab})` }}
                          >
                            {config.format(payload[0].value as number)}
                          </span>
                        </p>
                        {activeTab === "revenue" && payload[1] && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Previous:{" "}
                            {config.format(payload[1].value as number)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ width: "100%", paddingTop: 8 }}
                formatter={(value) => (
                  <span className="text-muted-foreground">
                    {value === "previousRevenue"
                      ? "Previous period"
                      : config.label}
                  </span>
                )}
                iconSize={10}
                iconType="line"
                layout="horizontal"
                align="center"
              />
              <Area
                type="monotone"
                dataKey={activeTab}
                stroke={`var(--color-${activeTab})`}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
              {activeTab === "revenue" && (
                <Line
                  type="monotone"
                  dataKey="previousRevenue"
                  stroke="var(--color-previousRevenue)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
