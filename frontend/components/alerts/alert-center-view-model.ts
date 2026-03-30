export type UiSeverity = "critical" | "warning" | "info"
export type UiStatus = "active" | "acknowledged" | "resolved" | "snoozed"

export interface AlertApiItem {
  id: number
  alertType: string
  severity: string
  message: string
  publisherId: string
  appId?: string
  mediationGroupId?: string
  adSourceId?: string
  countryCode?: string
  value: number
  threshold: number
  status: string
  triggeredAt: string
  sentAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  additionalData?: string
  alertRuleName?: string
  alertRuleDescription?: string
}

export interface AlertUiItem {
  id: string
  numericId: number
  severity: UiSeverity
  status: UiStatus
  title: string
  description: string
  timestamp: Date
  appLabel?: string
  networkLabel?: string
  entityLabel?: string
  value: number
  threshold: number
  percentDelta?: number | null
  metricLabel: string
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolvedAt?: Date
  snoozedUntil?: Date
  mediationGroupId?: string
}

function safeDate(value?: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function parseAdditionalData(raw?: string): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (data && typeof data === "object") return data as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

function getAdditionalNumber(data: Record<string, unknown> | null, key: string): number | undefined {
  const value = data?.[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function getAdditionalString(data: Record<string, unknown> | null, key: string): string | undefined {
  const value = data?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

export function toUiSeverity(severity?: string): UiSeverity {
  const normalized = (severity || "").toUpperCase()
  if (normalized === "HIGH" || normalized === "CRITICAL") return "critical"
  if (normalized === "MEDIUM" || normalized === "WARNING") return "warning"
  return "info"
}

export function toUiStatus(status?: string): UiStatus {
  const normalized = (status || "").toUpperCase()
  if (normalized === "ACKNOWLEDGED") return "acknowledged"
  if (normalized === "RESOLVED") return "resolved"
  if (normalized === "SNOOZED") return "snoozed"
  return "active"
}

function detectMetricLabel(alertType?: string): string {
  const type = (alertType || "").toLowerCase()
  if (type.includes("ecpm")) return "eCPM"
  if (type.includes("fill")) return "Fill Rate"
  if (type.includes("revenue")) return "Revenue"
  if (type.includes("impression")) return "Impressions"
  return "Value"
}

export function toAlertUiItem(alert: AlertApiItem): AlertUiItem {
  const additional = parseAdditionalData(alert.additionalData)
  const triggeredAt = safeDate(alert.triggeredAt) ?? new Date()
  const acknowledgedAt = safeDate(alert.acknowledgedAt)
  const resolvedAt = safeDate(alert.resolvedAt)
  const snoozedUntil = safeDate(getAdditionalString(additional, "snoozedUntil"))
  const metricLabel = detectMetricLabel(alert.alertType)
  const baseline = getAdditionalNumber(additional, "baselineValue")
  const percentDelta = baseline && baseline !== 0 ? ((alert.value - baseline) / baseline) * 100 : undefined

  return {
    id: String(alert.id),
    numericId: alert.id,
    severity: toUiSeverity(alert.severity),
    status: toUiStatus(alert.status),
    title: alert.alertRuleName?.trim() || alert.alertType || `Alert #${alert.id}`,
    description: alert.message || "No message",
    timestamp: triggeredAt,
    appLabel: alert.appId || undefined,
    networkLabel: alert.adSourceId || undefined,
    entityLabel: alert.mediationGroupId || undefined,
    value: alert.value,
    threshold: alert.threshold,
    percentDelta,
    metricLabel,
    acknowledgedBy: alert.acknowledgedBy || undefined,
    acknowledgedAt,
    resolvedAt,
    snoozedUntil,
    mediationGroupId: alert.mediationGroupId || undefined,
  }
}

export function toUiAlertList(alerts: AlertApiItem[]): AlertUiItem[] {
  return alerts.map(toAlertUiItem)
}

export function computeAverageResponseMinutes(alerts: AlertUiItem[]): number | null {
  const durations = alerts
    .map((item) => {
      const finishedAt = item.resolvedAt ?? item.acknowledgedAt
      if (!finishedAt) return null
      const diffMs = finishedAt.getTime() - item.timestamp.getTime()
      return diffMs > 0 ? diffMs / 60000 : null
    })
    .filter((value): value is number => value != null)

  if (durations.length === 0) return null
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
}

