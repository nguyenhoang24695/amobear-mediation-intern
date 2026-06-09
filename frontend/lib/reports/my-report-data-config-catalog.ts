export const MY_REPORT_CONFIG_KEY = {
  datePeriod: "date_period",
  compareTo: "compare_to",
  app: "app",
  monetizationPartners: "monetization_partners",
  channel: "channel",
  currency: "currency",
  platform: "platform",
  country: "country",
  storeType: "store_type",
  teams: "teams",
  iapRevenueMode: "iap_revenue_mode",
  revenueSource: "revenue_source",
  attributionTypes: "attribution_types",
  legacyFilters: "legacy_filters",
} as const

export type MyReportConfigKey = (typeof MY_REPORT_CONFIG_KEY)[keyof typeof MY_REPORT_CONFIG_KEY]

/** Checkbox luôn bật sau Reset; Date period không cho bỏ tick. */
export const MY_REPORT_LOCKED_CONFIG_KEYS: readonly MyReportConfigKey[] = [
  MY_REPORT_CONFIG_KEY.datePeriod,
]

/** Mặc định sau Reset — chỉ các dòng này được checked. */
export const MY_REPORT_DEFAULT_ENABLED_CONFIG_KEYS: readonly MyReportConfigKey[] = [
  MY_REPORT_CONFIG_KEY.datePeriod,
  MY_REPORT_CONFIG_KEY.compareTo,
  MY_REPORT_CONFIG_KEY.app,
  MY_REPORT_CONFIG_KEY.channel,
  MY_REPORT_CONFIG_KEY.country,
]

export type MyReportDataConfigCategory = {
  id: string
  label: string
  itemKeys: readonly MyReportConfigKey[]
}

export const MY_REPORT_DATA_CONFIG_CATEGORIES: readonly MyReportDataConfigCategory[] = [
  {
    id: "time",
    label: "Time",
    itemKeys: [MY_REPORT_CONFIG_KEY.datePeriod, MY_REPORT_CONFIG_KEY.compareTo],
  },
  {
    id: "filters",
    label: "Filters",
    itemKeys: [
      MY_REPORT_CONFIG_KEY.app,
      MY_REPORT_CONFIG_KEY.monetizationPartners,
      MY_REPORT_CONFIG_KEY.channel,
      MY_REPORT_CONFIG_KEY.currency,
      MY_REPORT_CONFIG_KEY.platform,
      MY_REPORT_CONFIG_KEY.country,
      MY_REPORT_CONFIG_KEY.storeType,
    ],
  },
  {
    id: "settings",
    label: "Settings",
    itemKeys: [
      MY_REPORT_CONFIG_KEY.teams,
      MY_REPORT_CONFIG_KEY.iapRevenueMode,
      MY_REPORT_CONFIG_KEY.revenueSource,
    ],
  },
  {
    id: "attribution",
    label: "Attribution",
    itemKeys: [MY_REPORT_CONFIG_KEY.attributionTypes, MY_REPORT_CONFIG_KEY.legacyFilters],
  },
]

export const MY_REPORT_CONFIG_LABELS: Record<MyReportConfigKey, string> = {
  [MY_REPORT_CONFIG_KEY.datePeriod]: "Date period",
  [MY_REPORT_CONFIG_KEY.compareTo]: "Compare to",
  [MY_REPORT_CONFIG_KEY.app]: "App",
  [MY_REPORT_CONFIG_KEY.monetizationPartners]: "Monetization partners",
  [MY_REPORT_CONFIG_KEY.channel]: "Channel",
  [MY_REPORT_CONFIG_KEY.currency]: "App currency",
  [MY_REPORT_CONFIG_KEY.platform]: "Platform",
  [MY_REPORT_CONFIG_KEY.country]: "Country",
  [MY_REPORT_CONFIG_KEY.storeType]: "Store type",
  [MY_REPORT_CONFIG_KEY.teams]: "Teams",
  [MY_REPORT_CONFIG_KEY.iapRevenueMode]: "IAP revenue mode",
  [MY_REPORT_CONFIG_KEY.revenueSource]: "Revenue source",
  [MY_REPORT_CONFIG_KEY.attributionTypes]: "Attribution types",
  [MY_REPORT_CONFIG_KEY.legacyFilters]: "Legacy filters",
}

/** Phase 2 — chỉ hiện checkbox + giá trị cố định, chưa chỉnh được. */
export const MY_REPORT_PHASE2_CONFIG_KEYS = new Set<MyReportConfigKey>([
  MY_REPORT_CONFIG_KEY.compareTo,
  MY_REPORT_CONFIG_KEY.monetizationPartners,
  MY_REPORT_CONFIG_KEY.channel,
  MY_REPORT_CONFIG_KEY.currency,
  MY_REPORT_CONFIG_KEY.platform,
  MY_REPORT_CONFIG_KEY.country,
  MY_REPORT_CONFIG_KEY.storeType,
  MY_REPORT_CONFIG_KEY.attributionTypes,
  MY_REPORT_CONFIG_KEY.legacyFilters,
])

/** Chỉnh giá trị qua filter tag bên ngoài dropdown. */
export const MY_REPORT_EXTERNAL_EDITABLE_CONFIG_KEYS = new Set<MyReportConfigKey>([
  MY_REPORT_CONFIG_KEY.datePeriod,
  MY_REPORT_CONFIG_KEY.app,
  MY_REPORT_CONFIG_KEY.teams,
  MY_REPORT_CONFIG_KEY.iapRevenueMode,
  MY_REPORT_CONFIG_KEY.revenueSource,
])

export function normalizeEnabledConfigKeys(keys: string[]): MyReportConfigKey[] {
  const set = new Set<MyReportConfigKey>()
  for (const key of keys) {
    if (key in MY_REPORT_CONFIG_LABELS) set.add(key as MyReportConfigKey)
  }
  for (const locked of MY_REPORT_LOCKED_CONFIG_KEYS) set.add(locked)
  return Array.from(set)
}

export function resetEnabledConfigKeys(): MyReportConfigKey[] {
  return [...MY_REPORT_DEFAULT_ENABLED_CONFIG_KEYS]
}
