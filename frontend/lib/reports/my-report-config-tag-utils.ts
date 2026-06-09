import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import { resolveMyReportDateRange } from "@/components/my-reports/hooks/use-my-report-config"
import { IAP_REVENUE_MODE_OPTIONS } from "@/lib/reports/my-report-defaults"
import {
  formatAdjustStyleDateRange,
} from "@/lib/reports/report-date-filter-utils"
import {
  MY_REPORT_CONFIG_KEY,
  MY_REPORT_CONFIG_LABELS,
  type MyReportConfigKey,
  normalizeEnabledConfigKeys,
} from "@/lib/reports/my-report-data-config-catalog"
import { formatCompareRangeLabel } from "@/lib/reports/my-report-compare-utils"

export type MyReportAppliedFilterTag = {
  key: MyReportConfigKey
  label: string
  value: string
}

export { formatAdjustStyleDateRange }

export function resolveConfigItemDisplayValue(
  key: MyReportConfigKey,
  config: MyReportConfig,
  ctx: { selectedAppLabel: string; selectedTeamsLabel: string },
): string {
  switch (key) {
    case MY_REPORT_CONFIG_KEY.datePeriod: {
      const { start, end } = resolveMyReportDateRange(config)
      return formatAdjustStyleDateRange(start, end)
    }
    case MY_REPORT_CONFIG_KEY.compareTo: {
      const { start, end } = resolveMyReportDateRange(config)
      return formatCompareRangeLabel(
        start,
        end,
        config.compareToPreset,
        config.compareCustomStart,
        config.compareCustomEnd,
      )
    }
    case MY_REPORT_CONFIG_KEY.app:
      return ctx.selectedAppLabel
    case MY_REPORT_CONFIG_KEY.monetizationPartners:
      return "All"
    case MY_REPORT_CONFIG_KEY.channel:
      return "All"
    case MY_REPORT_CONFIG_KEY.currency:
      return "USD"
    case MY_REPORT_CONFIG_KEY.platform:
      return "All"
    case MY_REPORT_CONFIG_KEY.country:
      return "All"
    case MY_REPORT_CONFIG_KEY.storeType:
      return "All"
    case MY_REPORT_CONFIG_KEY.teams:
      return ctx.selectedTeamsLabel
    case MY_REPORT_CONFIG_KEY.iapRevenueMode: {
      const preset = IAP_REVENUE_MODE_OPTIONS.find((o) => o.value === config.iapRevenueMode)
      if (preset) return preset.label
      const pct = Math.round(config.iapRevenueMode * 1000) / 10
      const overrideCount = Object.keys(config.iapRevenueModeOverrides).length
      const base = `${pct}% of Gross`
      return overrideCount > 0 ? `${base} · ${overrideCount} app override(s)` : base
    }
    case MY_REPORT_CONFIG_KEY.revenueSource:
      return config.revenueSource
    case MY_REPORT_CONFIG_KEY.attributionTypes:
      return "All types"
    case MY_REPORT_CONFIG_KEY.legacyFilters:
      return "None"
    default:
      return "All"
  }
}

export function buildAppliedFilterTags(
  config: MyReportConfig,
  ctx: { selectedAppLabel: string; selectedTeamsLabel: string },
): MyReportAppliedFilterTag[] {
  const enabled = normalizeEnabledConfigKeys(config.enabledConfigKeys)
  return enabled.map((key) => ({
    key,
    label: MY_REPORT_CONFIG_LABELS[key],
    value: resolveConfigItemDisplayValue(key, config, ctx),
  }))
}

/** Tag visibility theo applied; giá trị hiển thị theo draft (chỉnh qua filter bên ngoài). */
export function buildExternalFilterTags(
  appliedConfig: MyReportConfig,
  draftConfig: MyReportConfig,
  ctx: { selectedAppLabel: string; selectedTeamsLabel: string },
): MyReportAppliedFilterTag[] {
  const enabled = normalizeEnabledConfigKeys(appliedConfig.enabledConfigKeys)
  return enabled.map((key) => ({
    key,
    label: MY_REPORT_CONFIG_LABELS[key],
    value: resolveConfigItemDisplayValue(key, draftConfig, ctx),
  }))
}
