import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"

export type SerializedMyReportConfig = Omit<
  MyReportConfig,
  "compareCustomStart" | "compareCustomEnd" | "selectedMonth" | "startDate" | "endDate"
> & {
  compareCustomStart: string
  compareCustomEnd: string
  selectedMonth: string
  startDate: string
  endDate: string
}

function serializeDate(value: Date): string {
  return value.toISOString()
}

function deserializeDate(value: string, fallback: Date): Date {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export function serializeMyReportConfig(config: MyReportConfig): SerializedMyReportConfig {
  return {
    ...config,
    dimensions: [...config.dimensions],
    metrics: [...config.metrics],
    selectedAppIds: [...config.selectedAppIds],
    selectedCommissionTeamIds: [...config.selectedCommissionTeamIds],
    enabledConfigKeys: [...config.enabledConfigKeys],
    iapRevenueModeOverrides: { ...config.iapRevenueModeOverrides },
    pinnedColumnIds: [...config.pinnedColumnIds],
    chartMetricIds: [...config.chartMetricIds],
    breakdownChartMetricIds: [...config.breakdownChartMetricIds],
    trendChartDimensionIds: [...config.trendChartDimensionIds],
    breakdownChartDimensionIds: [...config.breakdownChartDimensionIds],
    customFormulas: config.customFormulas.map((formula) => ({ ...formula })),
    compareCustomStart: serializeDate(config.compareCustomStart),
    compareCustomEnd: serializeDate(config.compareCustomEnd),
    selectedMonth: serializeDate(config.selectedMonth),
    startDate: serializeDate(config.startDate),
    endDate: serializeDate(config.endDate),
  }
}

export function deserializeMyReportConfig(
  serialized: SerializedMyReportConfig,
  fallback?: MyReportConfig,
): MyReportConfig {
  const now = new Date()
  return {
    ...serialized,
    dimensions: [...serialized.dimensions],
    metrics: [...serialized.metrics],
    selectedAppIds: [...serialized.selectedAppIds],
    selectedCommissionTeamIds: [...serialized.selectedCommissionTeamIds],
    enabledConfigKeys: [...serialized.enabledConfigKeys],
    iapRevenueModeOverrides: { ...serialized.iapRevenueModeOverrides },
    pinnedColumnIds: [...serialized.pinnedColumnIds],
    chartMetricIds: [...serialized.chartMetricIds],
    breakdownChartMetricIds: [...serialized.breakdownChartMetricIds],
    trendChartDimensionIds: [...serialized.trendChartDimensionIds],
    breakdownChartDimensionIds: [...serialized.breakdownChartDimensionIds],
    customFormulas: (serialized.customFormulas ?? []).map((formula) => ({ ...formula })),
    tableViewMode: serialized.tableViewMode ?? fallback?.tableViewMode ?? "flat",
    pivotRowDim: serialized.pivotRowDim ?? fallback?.pivotRowDim ?? "date",
    pivotColDim: serialized.pivotColDim ?? fallback?.pivotColDim ?? "app",
    pivotMetricId: serialized.pivotMetricId ?? fallback?.pivotMetricId ?? serialized.metrics[0] ?? "",
    compareCustomStart: deserializeDate(
      serialized.compareCustomStart,
      fallback?.compareCustomStart ?? now,
    ),
    compareCustomEnd: deserializeDate(serialized.compareCustomEnd, fallback?.compareCustomEnd ?? now),
    selectedMonth: deserializeDate(serialized.selectedMonth, fallback?.selectedMonth ?? now),
    startDate: deserializeDate(serialized.startDate, fallback?.startDate ?? now),
    endDate: deserializeDate(serialized.endDate, fallback?.endDate ?? now),
  }
}
