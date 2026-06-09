import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import { IAP_REVENUE_MODE_OPTIONS } from "@/lib/reports/my-report-defaults"
import { resolveMyReportDateRange } from "@/components/my-reports/hooks/use-my-report-config"
import {
  MY_REPORT_CONFIG_KEY,
  MY_REPORT_CONFIG_LABELS,
  type MyReportConfigKey,
  normalizeEnabledConfigKeys,
} from "@/lib/reports/my-report-data-config-catalog"

export type MyReportAppliedFilterTag = {
  key: MyReportConfigKey
  label: string
  value: string
}

function formatAdjustStyleDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear()
  const startFmt = format(start, sameYear ? "MMM dd" : "MMM dd, yyyy", { locale: enUS })
  const endFmt = format(end, "MMM dd, yyyy", { locale: enUS })
  return `${startFmt} – ${endFmt}`
}

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
    case MY_REPORT_CONFIG_KEY.compareTo:
      return "No comparison"
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
    case MY_REPORT_CONFIG_KEY.iapRevenueMode:
      return (
        IAP_REVENUE_MODE_OPTIONS.find((o) => o.value === config.iapRevenueMode)?.label ??
        "70% of Gross"
      )
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
