import {
  DateRange,
  Dimension,
  LocalizationSettings,
  Metric,
} from "../MediationReport";

export interface MediationReportResponse {
  header?: ReportHeader;
  row?: ReportRow;
  footer?: ReportFooter;
}

interface ReportHeader {
  dateRange: DateRange;
  localizationSettings: LocalizationSettings;
  reportingTimeZone: string;
}

export interface ReportRow {
  dimensionValues: { [Key in keyof typeof Dimension]: DimensionValue };
  metricValues: { [Key in keyof typeof Metric]: MetricValue };
}

interface ReportFooter {
  warnings: [ReportWarning];
  matchingRowCount: string;
}

interface ReportWarning {
  type: Type;
  description: string;
}

interface DimensionValue {
  value: string;
  displayLabel: string;
}

interface MetricValue {
  integerValue?: string;
  doubleValue?: number;
  microsValue?: string;
}

enum Type {
  TYPE_UNSPECIFIED,
  DATA_BEFORE_ACCOUNT_TIMEZONE_CHANGE,
  DATA_DELAYED,
  OTHER,
  REPORT_CURRENCY_NOT_ACCOUNT_CURRENCY,
}
