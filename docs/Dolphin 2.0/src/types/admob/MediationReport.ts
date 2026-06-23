export default interface MediationReportSpec {
  dateRange: DateRange;
  dimensions: Dimension[];
  metrics: Metric[];
  dimensionFilters?: DimensionFilter[];
  sortConditions?: SortCondition[];
  localizationSettings?: LocalizationSettings;
  maxReportRows?: number;
  timeZone?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface Date {
  year: number;
  month: number;
  day: number;
}

export interface LocalizationSettings {
  currencyCode: string;
  languageCode: string;
}

interface StringList {
  values: string[];
}

interface DimensionFilter {
  dimension: Dimension;
  matchesAny: StringList;
}

interface SortCondition {
  dimension?: Dimension;
  metric?: Metric;
  order: SortOrder;
}

export interface ReportHeader {
  dateRange: DateRange;
  localizationSettings: LocalizationSettings;
  reportingTimeZone: string;
}

export enum SortOrder {
  ASCENDING = "ASCENDING",
  DESCENDING = "DESCENDING",
}

export enum Dimension {
  DIMENSION_UNSPECIFIED = "DIMENSION_UNSPECIFIED",
  DATE = "DATE",
  MONTH = "MONTH",
  WEEK = "WEEK",
  HOUR = "HOUR",
  AD_SOURCE = "AD_SOURCE",
  AD_SOURCE_INSTANCE = "AD_SOURCE_INSTANCE",
  AD_UNIT = "AD_UNIT",
  APP = "APP",
  MEDIATION_GROUP = "MEDIATION_GROUP",
  MEDIATION_AB_TEST = "MEDIATION_AB_TEST",
  MEDIATION_AB_TEST_VARIANT = "MEDIATION_AB_TEST_VARIANT",
  COUNTRY = "COUNTRY",
  FORMAT = "FORMAT",
  PLATFORM = "PLATFORM",
  MOBILE_OS_VERSION = "MOBILE_OS_VERSION",
  GMA_SDK_VERSION = "GMA_SDK_VERSION",
  APP_VERSION_NAME = "APP_VERSION_NAME",
  SERVING_RESTRICTION = "SERVING_RESTRICTION",
  ATT_CONSENT_STATUS = "ATT_CONSENT_STATUS",
}

export enum Metric {
  METRIC_UNSPECIFIED = "METRIC_UNSPECIFIED",
  AD_REQUESTS = "AD_REQUESTS",
  CLICKS = "CLICKS",
  ESTIMATED_EARNINGS = "ESTIMATED_EARNINGS",
  IMPRESSIONS = "IMPRESSIONS",
  IMPRESSION_CTR = "IMPRESSION_CTR",
  MATCHED_REQUESTS = "MATCHED_REQUESTS",
  MATCH_RATE = "MATCH_RATE",
  OBSERVED_ECPM = "OBSERVED_ECPM",
  BID_REQUEST = "BID_REQUEST",
  BIDS_IN_AUCTION = "BIDS_IN_AUCTION",
  WINNING_BIDS = "WINNING_BIDS",
}
