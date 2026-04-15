"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AlertRule, AlertRuleConditionPayload, AlertRuleConfigPayload } from "@/types/api"
import { format } from "date-fns"

export function parseAlertRuleConfig(rule: AlertRule): AlertRuleConfigPayload | null {
  if (!rule.ruleConfig?.trim()) return null
  try {
    return JSON.parse(rule.ruleConfig) as AlertRuleConfigPayload
  } catch {
    return null
  }
}

function conditionTypeDisplayName(conditionType: string | null | undefined) {
  const t = (conditionType || "").trim()
  if (t === "threshold") return "Threshold"
  if (t === "percent_change") return "% change"
  if (t === "consecutive") return "Consecutive days"
  return t || "Condition"
}

export function describeAlertRuleCondition(metricLabel: string, c: AlertRuleConditionPayload): string {
  const type = (c.conditionType || "").trim()
  const typeName = conditionTypeDisplayName(type)
  const op = (c.operator || "").trim()
  if (type === "threshold") {
    const opText = op === "less_than" ? "is less than" : "is greater than"
    return `${metricLabel} (${typeName}): ${opText} ${c.thresholdValue ?? "?"}`
  }
  if (type === "percent_change") {
    const opText = op === "less_than" ? "decreases by at least" : "increases by at least"
    return `${metricLabel} (${typeName}): ${opText} ${c.percentChange ?? "?"}% vs baseline`
  }
  if (type === "consecutive") {
    const opText = op === "less_than" ? "stays below" : "stays above"
    return `${metricLabel} (${typeName}): ${opText} ${c.thresholdValue ?? "?"} for ${c.consecutiveDays ?? "?"} consecutive days`
  }
  return `${metricLabel} (${typeName})`
}

function legacySingleConditionSummary(cfg: AlertRuleConfigPayload): string | null {
  if (!cfg.metricKey?.trim() && !cfg.conditionType) return null
  const label = cfg.metricKey?.trim() || "Metric"
  return describeAlertRuleCondition(label, {
    conditionType: cfg.conditionType ?? undefined,
    operator: cfg.operator ?? undefined,
    thresholdValue: cfg.thresholdValue ?? undefined,
    percentChange: cfg.percentChange ?? undefined,
    consecutiveDays: cfg.consecutiveDays ?? undefined,
  })
}

export function formatRuleConditionsSummary(rule: AlertRule): string {
  const cfg = parseAlertRuleConfig(rule)
  if (!cfg) {
    return rule.ruleExpression?.trim() ? rule.ruleExpression.trim() : "—"
  }
  if (cfg.conditionLogic?.toLowerCase() === "always_true") {
    return "Always true (no metric conditions; fires each evaluation per app in scope)"
  }
  const list = cfg.conditions?.filter(Boolean) ?? []
  if (list.length > 0) {
    const joiner = cfg.conditionLogic?.toLowerCase() === "any" ? " OR " : " AND "
    return list
      .map((c) => describeAlertRuleCondition((c.metricKey || "Metric").trim() || "Metric", c))
      .join(joiner)
  }
  const legacy = legacySingleConditionSummary(cfg)
  if (legacy) return legacy
  if (rule.ruleExpression?.trim()) return rule.ruleExpression.trim()
  return "—"
}

function parseJsonArray(input?: string | null): string[] {
  if (!input) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function formatIso(iso?: string | null) {
  if (!iso) return "—"
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm")
  } catch {
    return iso
  }
}

function prettyJson(raw?: string | null): string | null {
  if (!raw?.trim()) return null
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm text-slate-800 break-words">{children}</div>
    </div>
  )
}

export interface AlertRuleDetailsDialogProps {
  rule: AlertRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resolve app id → display label (optional) */
  appIdToLabel?: Map<string, string>
}

export function AlertRuleDetailsDialog({ rule, open, onOpenChange, appIdToLabel }: AlertRuleDetailsDialogProps) {
  const cfg = rule ? parseAlertRuleConfig(rule) : null
  const isPrivateRule = String(rule?.visibility ?? "").toUpperCase() === "PRIVATE"
  const channels = rule ? parseJsonArray(rule.notificationChannels) : []
  const telegramTopics = rule ? parseJsonArray(rule.telegramTopics) : []
  const emailRecipients = rule ? parseJsonArray(rule.emailRecipients) : []
  const slackChannels = rule ? parseJsonArray(rule.slackChannels) : []
  const filterPretty = rule ? prettyJson(rule.filterConditions) : null
  const configPretty = rule?.ruleConfig?.trim() ? prettyJson(rule.ruleConfig) : null

  const scopeText = (() => {
    if (!cfg?.scope) return "—"
    if (cfg.scope.allApps) return "All apps"
    const ids = cfg.scope.appIds ?? []
    if (ids.length === 0) return "All apps"
    return ids
      .map((id) => appIdToLabel?.get(id.toLowerCase()) ?? id)
      .join(", ")
  })()

  const scopeOrderText = (() => {
    if (!cfg?.scope) return "—"
    const m = cfg.scope.orderByMetric?.trim()
    if (!m) return "—"
    const raw = (cfg.scope.orderByDirection ?? "desc").toString().trim().toLowerCase()
    const dir = raw === "asc" ? "ASC" : "DESC"
    return `${m} (${dir})`
  })()

  const logicLabel =
    cfg?.conditionLogic?.toLowerCase() === "always_true"
      ? "ALWAYS TRUE"
      : cfg?.conditionLogic?.toLowerCase() === "any"
        ? "ANY (OR)"
        : "ALL (AND)"
  const isAlwaysTrueCfg = cfg?.conditionLogic?.toLowerCase() === "always_true"
  const conditionLines =
    cfg?.conditions?.filter(Boolean).map((c, i) => ({
      idx: i + 1,
      text: describeAlertRuleCondition((c.metricKey || "Metric").trim() || "Metric", c),
    })) ?? []
  const legacyLine = cfg && conditionLines.length === 0 ? legacySingleConditionSummary(cfg) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {rule ? (
      <DialogContent
        className="sm:max-w-2xl max-h-[min(90vh,720px)] flex flex-col gap-0 p-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-slate-100">
          <DialogTitle className="text-left pr-8">Rule details</DialogTitle>
          <DialogDescription className="text-left">
            Full configuration for <span className="font-medium text-slate-700">{rule.name}</span> (read-only).
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-8">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">General</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBlock label="ID">{rule.id}</DetailBlock>
              <DetailBlock label="Name">{rule.name}</DetailBlock>
              <DetailBlock label="Description">{rule.description?.trim() ? rule.description : "—"}</DetailBlock>
              <DetailBlock label="Rule type">
                <Badge variant="outline">{rule.ruleType}</Badge>
              </DetailBlock>
              <DetailBlock label="Severity">
                <Badge variant="outline">{rule.severity}</Badge>
              </DetailBlock>
              <DetailBlock label="Enabled">{rule.isEnabled ? "Yes" : "No"}</DetailBlock>
              <DetailBlock label="Priority">{rule.priority}</DetailBlock>
              <DetailBlock label="Config version">{rule.configVersion}</DetailBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Evaluation & windows</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBlock label="Time window (hours)">{rule.timeWindowHours}</DetailBlock>
              <DetailBlock label="Comparison period (hours)">
                {rule.comparisonPeriodHours ?? "—"}
              </DetailBlock>
              <DetailBlock label="Cooldown (minutes)">{rule.cooldownMinutes}</DetailBlock>
              <DetailBlock label="Rule expression">
                <span className="font-mono text-xs whitespace-pre-wrap">{rule.ruleExpression || "—"}</span>
              </DetailBlock>
              <DetailBlock label="Threshold value (legacy field)">{rule.thresholdValue ?? "—"}</DetailBlock>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Rule config (JSON)</h4>
            {cfg ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailBlock label="Scope">{scopeText}</DetailBlock>
                <DetailBlock label="App order (by metric)">{scopeOrderText}</DetailBlock>
                <DetailBlock label="Frequency">{cfg.frequency ?? "—"}</DetailBlock>
                <DetailBlock label="Evaluation cooldown (minutes)">
                  {cfg.evaluationCooldownMinutes ?? "—"}
                </DetailBlock>
                <DetailBlock label="Daily evaluation hour (UTC+7)">
                  {cfg.dailyEvaluationHourUtc != null ? String(cfg.dailyEvaluationHourUtc) : "—"}
                </DetailBlock>
                <DetailBlock label="Auto-resolve">{cfg.autoResolve != null ? String(cfg.autoResolve) : "—"}</DetailBlock>
                <DetailBlock label="Source">{cfg.source ?? "—"}</DetailBlock>
                <DetailBlock label="Payload version">{cfg.version}</DetailBlock>
                <DetailBlock label="Condition logic">{logicLabel}</DetailBlock>
                {cfg.prompt?.trim() ? (
                  <div className="sm:col-span-2">
                    <DetailBlock label="AI / builder prompt">
                      <span className="whitespace-pre-wrap text-xs">{cfg.prompt}</span>
                    </DetailBlock>
                  </div>
                ) : null}
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conditions</p>
                  {isAlwaysTrueCfg ? (
                    <p className="text-sm text-slate-800">
                      Always true — no metric conditions; fires each evaluation per app in scope.
                    </p>
                  ) : conditionLines.length > 0 ? (
                    <ul className="list-decimal pl-5 space-y-1 text-sm text-slate-800">
                      {conditionLines.map((line) => (
                        <li key={line.idx}>{line.text}</li>
                      ))}
                    </ul>
                  ) : legacyLine ? (
                    <p className="text-sm text-slate-800">{legacyLine}</p>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No structured rule_config JSON.</p>
            )}
            {filterPretty ? (
              <DetailBlock label="filterConditions (raw)">
                <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-slate-50 p-3 text-xs font-mono border border-slate-200">
                  {filterPretty}
                </pre>
              </DetailBlock>
            ) : null}
            {configPretty ? (
              <DetailBlock label="ruleConfig (full JSON)">
                <pre className="mt-1 max-h-56 overflow-auto rounded-md bg-slate-50 p-3 text-xs font-mono border border-slate-200">
                  {configPretty}
                </pre>
              </DetailBlock>
            ) : null}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Message & notifications</h4>
            <DetailBlock label="Message template">
              <span className="whitespace-pre-wrap font-mono text-xs">{rule.messageTemplate || "—"}</span>
            </DetailBlock>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBlock label="Channels">
                {channels.length ? (
                  <div className="flex flex-wrap gap-1">
                    {channels.map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-xs">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </DetailBlock>
              {isPrivateRule ? (
                <div className="sm:col-span-2">
                  <p className="text-sm text-slate-700">
                    Rule My Alerts: không dùng topic Telegram, webhook Slack hay danh sách email trên rule. Email/Slack
                    (nếu bật trên rule) lấy từ My Profile của người tạo rule.
                  </p>
                </div>
              ) : (
                <>
                  <DetailBlock label="Telegram topics">
                    {telegramTopics.length ? telegramTopics.join(", ") : "—"}
                  </DetailBlock>
                  <DetailBlock label="Email recipients">
                    {emailRecipients.length ? emailRecipients.join(", ") : "—"}
                  </DetailBlock>
                  <DetailBlock label="Slack channels / webhooks">
                    {slackChannels.length ? slackChannels.join(", ") : "—"}
                  </DetailBlock>
                </>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Timestamps</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBlock label="Created">{formatIso(rule.createdAt)}</DetailBlock>
              <DetailBlock label="Updated">{formatIso(rule.updatedAt)}</DetailBlock>
              <DetailBlock label="Last triggered">{formatIso(rule.lastTriggeredAt)}</DetailBlock>
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-slate-100 shrink-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      ) : null}
    </Dialog>
  )
}
