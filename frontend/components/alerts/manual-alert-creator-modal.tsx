"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Search,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { alertsApi, authApi, structureApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useApi } from "@/hooks/use-api"
import type { AlertRule, AlertRuleConfigPayload, AppMetricCatalogItem } from "@/types/api"
import { cn } from "@/lib/utils"
import { authUserFromMeDto, getAccessToken, getCurrentUser, getRefreshToken, setAuthData } from "@/lib/auth"
import { formatRuleConditionsSummary } from "./alert-rule-details-dialog"

interface ManualAlertCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  rule?: AlertRule | null
  /** PRIVATE = rule lưu cho tab My Alerts. */
  ruleVisibility?: "ORG" | "PRIVATE"
  /** ORG rule dùng làm template (clone) — wizard prefill nhưng luôn tạo mới (không sửa rule gốc). */
  cloneFrom?: AlertRule | null
}

type TelegramDestinationRow = {
  id: string
  chatId: string
  messageThreadId: string
  /** Id preset trong profile — khi bấm chip hoặc sau khi lưu; Save cập nhật đúng preset này. */
  linkedPresetId?: string
}

type TelegramDestinationPreset = {
  id: string
  name: string
  chatId: string
  messageThreadId?: string
}

type SlackDestinationRow = {
  id: string
  webhookUrl: string
}

type EmailRecipientRow = {
  id: string
  email: string
}

type ManualConditionRow = {
  id: string
  metric: string
  conditionType: string
  operator: string
  thresholdValue: string
  percentChange: string
  consecutiveDays: string
}

type Step2ConditionErrors = {
  metric?: string
  value?: string
}

type Step3SectionErrors = {
  telegram?: string
  slack?: string
  email?: string
  frequency?: string
}

/** Khớp backend ManualRuleConfigParser / InferMetricKeyFromRuleType — dùng khi Always true (không có conditions). */
function inferMetricKeyFromRuleType(ruleType: string | undefined | null): string {
  const t = (ruleType ?? "").toLowerCase()
  if (t.includes("ecpm")) return "ecpm"
  if (t.includes("fill")) return "fill_rate"
  if (t.includes("match")) return "match_rate"
  if (t.includes("impression")) return "impressions"
  if (t.includes("sow")) return "sow"
  if (t.includes("profit") || t.includes("net profit")) return "profit"
  if (t.includes("cost") || t.includes("ua_cost")) return "cost"
  return "revenue"
}

function parseConditionCombineMode(raw: string | null | undefined): "all" | "any" | "always_true" {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "any") return "any"
  if (s === "always_true") return "always_true"
  return "all"
}

/** Logic + condition rows từ rule có sẵn (template / edit) — dùng chung init wizard và “Giữ nguyên”. */
function buildConditionLogicAndRowsFromRule(sourceRule: AlertRule): {
  logic: "all" | "any" | "always_true"
  rows: ManualConditionRow[]
} {
  const parsedConfig = parseRuleConfig(sourceRule.ruleConfig || sourceRule.filterConditions)
  const logic = parseConditionCombineMode(parsedConfig?.conditionLogic)
  const conds = parsedConfig?.conditions
  const rows: ManualConditionRow[] =
    logic === "always_true"
      ? [emptyConditionRow()]
      : conds && conds.length > 0
        ? conds.map((c) => ({
            id: c.id?.trim() || newRowId(),
            metric: c.metricKey || parsedConfig?.metricKey || "",
            conditionType: c.conditionType || "threshold",
            operator: c.operator || "less_than",
            thresholdValue:
              c.thresholdValue != null
                ? String(c.thresholdValue)
                : sourceRule.thresholdValue != null
                  ? String(sourceRule.thresholdValue)
                  : "",
            percentChange: c.percentChange != null ? String(c.percentChange) : "",
            consecutiveDays: c.consecutiveDays != null ? String(c.consecutiveDays) : "3",
          }))
        : [
            {
              id: newRowId(),
              metric: parsedConfig?.metricKey || "",
              conditionType: parsedConfig?.conditionType || "threshold",
              operator: parsedConfig?.operator || "less_than",
              thresholdValue:
                parsedConfig?.thresholdValue != null
                  ? String(parsedConfig.thresholdValue)
                  : sourceRule.thresholdValue != null
                    ? String(sourceRule.thresholdValue)
                    : "",
              percentChange: parsedConfig?.percentChange != null ? String(parsedConfig.percentChange) : "",
              consecutiveDays: parsedConfig?.consecutiveDays != null ? String(parsedConfig.consecutiveDays) : "3",
            },
          ]
  return { logic, rows }
}

function emptyConditionRow(): ManualConditionRow {
  return {
    id: newRowId(),
    metric: "",
    conditionType: "threshold",
    operator: "less_than",
    thresholdValue: "",
    percentChange: "",
    consecutiveDays: "3",
  }
}

const FALLBACK_METRICS: Array<{ value: string; label: string }> = [
  { value: "ecpm", label: "eCPM" },
  { value: "revenue", label: "Revenue" },
  { value: "cost", label: "Metric Cost" },
  { value: "profit", label: "Profit (Revenue − UA cost)" },
  { value: "fill_rate", label: "Fill Rate" },
  { value: "impressions", label: "Impressions" },
  { value: "dau", label: "DAU" },
  { value: "d1_retention", label: "D1 Retention" },
  { value: "d7_retention", label: "D7 Retention" },
]

function resolveMetricSelectOptions(
  catalog: AppMetricCatalogItem[] | null | undefined,
  selectedMetricKey: string
): Array<{ value: string; label: string }> {
  const fromApi = (catalog ?? []).map((m) => ({ value: m.metricKey, label: m.name }))
  const base = fromApi.length > 0 ? fromApi : FALLBACK_METRICS
  if (selectedMetricKey && !base.some((x) => x.value === selectedMetricKey)) {
    return [{ value: selectedMetricKey, label: selectedMetricKey }, ...base]
  }
  return base
}

const conditionTypes = [
  { value: "threshold", label: "Threshold", description: "Alert when metric crosses a fixed value" },
  { value: "percent_change", label: "% Change", description: "Alert when metric changes by percentage vs baseline" },
  { value: "consecutive", label: "Consecutive Days", description: "Alert after N consecutive days below/above value" },
]

function toMetricKey(value: string) {
  return value
}

function toMetricUnit(metricKey: string) {
  if (metricKey === "revenue" || metricKey === "ecpm" || metricKey === "cost" || metricKey === "profit")
    return "usd"
  if (metricKey === "fill_rate") return "percent"
  return "count"
}

function newRowId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `row_${Math.random().toString(16).slice(2)}`
}

function emptyTelegramRow(): TelegramDestinationRow {
  return { id: newRowId(), chatId: "", messageThreadId: "" }
}

function emptySlackRow(): SlackDestinationRow {
  return { id: newRowId(), webhookUrl: "" }
}

function emptyEmailRow(): EmailRecipientRow {
  return { id: newRowId(), email: "" }
}

function telegramDestinationToken(chatId: string, messageThreadId?: string | null): string | null {
  const c = chatId.trim()
  if (!c) return null
  const t = (messageThreadId ?? "").trim()
  return t ? `${c}|${t}` : c
}

function telegramTopicTokenFromRow(row: TelegramDestinationRow): string | null {
  return telegramDestinationToken(row.chatId, row.messageThreadId)
}

function telegramPresetToken(preset: TelegramDestinationPreset): string | null {
  return telegramDestinationToken(preset.chatId, preset.messageThreadId)
}

function rowsFromTelegramTopics(topics: string[]): TelegramDestinationRow[] {
  if (topics.length === 0) return [emptyTelegramRow()]
  return topics.map((topic) => {
    const [chatId, messageThreadId] = topic.split("|")
    return {
      id: newRowId(),
      chatId: chatId?.trim() || "",
      messageThreadId: messageThreadId?.trim() || "",
    }
  })
}

function applyPresetToTelegramRows(
  preset: TelegramDestinationPreset,
  existing: TelegramDestinationRow[],
): { rows: TelegramDestinationRow[]; addedRowId: string | null } {
  const token = telegramPresetToken(preset)
  if (!token) return { rows: existing, addedRowId: null }

  const has = existing.some((r) => telegramTopicTokenFromRow(r) === token)
  if (has) return { rows: existing, addedRowId: null }

  const addedRowId = newRowId()
  const next = existing.length === 1 && !existing[0]?.chatId.trim() ? [] : existing
  return {
    rows: [
      ...next,
      {
        id: addedRowId,
        chatId: preset.chatId.trim(),
        messageThreadId: preset.messageThreadId?.trim() ?? "",
        linkedPresetId: preset.id,
      },
    ],
    addedRowId,
  }
}

function shouldShowTelegramPresetSaveButton(
  row: TelegramDestinationRow,
  nameByRowId: Record<string, string>,
  presets: TelegramDestinationPreset[],
): boolean {
  const name = (nameByRowId[row.id] ?? "").trim()
  const chat = row.chatId.trim()
  const thread = row.messageThreadId.trim()
  if (!chat || !name) return false

  if (row.linkedPresetId) {
    const base = presets.find((p) => p.id === row.linkedPresetId)
    if (!base) return true
    const baseName = (base.name ?? "").trim()
    const baseThread = (base.messageThreadId ?? "").trim()
    const baseChat = base.chatId.trim()
    return chat !== baseChat || thread !== baseThread || name !== baseName
  }

  return true
}

function rowsFromSlackChannels(channels: string[]): SlackDestinationRow[] {
  if (channels.length === 0) return [emptySlackRow()]
  return channels.map((channel) => ({
    id: newRowId(),
    webhookUrl: channel.trim(),
  }))
}

function rowsFromEmailRecipients(emails: string[]): EmailRecipientRow[] {
  if (emails.length === 0) return [emptyEmailRow()]
  return emails.map((email) => ({
    id: newRowId(),
    email: email.trim(),
  }))
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

function parseTelegramPresetsJson(input?: string | null): TelegramDestinationPreset[] {
  if (!input?.trim()) return []
  try {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: typeof x.id === "string" && x.id.trim() ? x.id.trim() : newRowId(),
        name: typeof x.name === "string" ? x.name : "",
        chatId: typeof x.chatId === "string" ? x.chatId : "",
        messageThreadId: typeof x.messageThreadId === "string" ? x.messageThreadId : undefined,
      }))
      .filter((x) => x.chatId.trim().length > 0)
  } catch {
    return []
  }
}

function parseRuleConfig(raw?: string | null): AlertRuleConfigPayload | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AlertRuleConfigPayload
  } catch {
    return null
  }
}

function toSeverityValue(value?: string | null): "critical" | "warning" | "info" {
  const normalized = (value || "").trim().toUpperCase()
  if (normalized === "CRITICAL" || normalized === "HIGH") return "critical"
  if (normalized === "WARNING" || normalized === "MEDIUM") return "warning"
  return "info"
}

function metricLabelFromCatalog(catalog: AppMetricCatalogItem[] | null | undefined, metricKey: string) {
  const opts = resolveMetricSelectOptions(catalog, metricKey)
  return opts.find((m) => m.value === metricKey)?.label || metricKey || "Metric"
}

function conditionTypeDisplayName(conditionType: string) {
  return conditionTypes.find((x) => x.value === conditionType)?.label ?? conditionType
}

/** Human-readable condition copy (no &lt; / &gt; symbols). */
function describeManualConditionText(metricLabel: string, c: ManualConditionRow): string {
  const typeName = conditionTypeDisplayName(c.conditionType)
  if (c.conditionType === "threshold") {
    const op = c.operator === "less_than" ? "is less than" : "is greater than"
    return `${metricLabel} (${typeName}): ${op} ${c.thresholdValue?.trim() || "?"}`
  }
  if (c.conditionType === "percent_change") {
    const op = c.operator === "less_than" ? "decreases by at least" : "increases by at least"
    return `${metricLabel} (${typeName}): ${op} ${c.percentChange?.trim() || "?"}% vs baseline`
  }
  if (c.conditionType === "consecutive") {
    const op = c.operator === "less_than" ? "stays below" : "stays above"
    return `${metricLabel} (${typeName}): ${op} ${c.thresholdValue?.trim() || "?"} for ${c.consecutiveDays || "?"} consecutive days`
  }
  return `${metricLabel} (${typeName})`
}

export function ManualAlertCreatorModal({
  open,
  onOpenChange,
  onCreated,
  rule,
  ruleVisibility = "ORG",
  cloneFrom,
}: ManualAlertCreatorModalProps) {
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [savingTelegramPresetRowId, setSavingTelegramPresetRowId] = useState<string | null>(null)
  /** Tăng sau khi lưu preset vào profile để useMemo preset đọc lại từ getCurrentUser(). */
  const [telegramPresetsRevision, setTelegramPresetsRevision] = useState(0)
  const [telegramPresetNamesByRowId, setTelegramPresetNamesByRowId] = useState<Record<string, string>>({})
  /** Dòng nào vừa lưu preset Telegram thành công — hiện icon tích xanh. */
  const [telegramPresetSaveSuccessRowIds, setTelegramPresetSaveSuccessRowIds] = useState<Record<string, true>>({})
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const [pendingDuplicateName, setPendingDuplicateName] = useState("")
  const [appSearch, setAppSearch] = useState("")
  const [telegramRows, setTelegramRows] = useState<TelegramDestinationRow[]>([emptyTelegramRow()])
  const [slackRows, setSlackRows] = useState<SlackDestinationRow[]>([emptySlackRow()])
  const [emailRows, setEmailRows] = useState<EmailRecipientRow[]>([emptyEmailRow()])
  const [step1Error, setStep1Error] = useState<string | undefined>(undefined)
  const [step2ListError, setStep2ListError] = useState<string | undefined>(undefined)
  const [step2FieldErrors, setStep2FieldErrors] = useState<Record<string, Step2ConditionErrors>>({})
  const [step3Errors, setStep3Errors] = useState<Step3SectionErrors>({})
  const [step, setStep] = useState(1)
  /** Chỉ khi Create from template: Giữ nguyên điều kiện template hay chỉnh tay. */
  const [cloneConditionMode, setCloneConditionMode] = useState<"keep" | "customize">("keep")

  const clearValidationErrors = useCallback(() => {
    setStep1Error(undefined)
    setStep2ListError(undefined)
    setStep2FieldErrors({})
    setStep3Errors({})
  }, [])
  const [formData, setFormData] = useState({
    conditionLogic: "all" as "all" | "any" | "always_true",
    conditions: [emptyConditionRow()] as ManualConditionRow[],
    selectedApps: ["all"],
    /** Metric key để sort thứ tự alert theo app; "" = không sort theo metric */
    scopeOrderByMetric: "",
    scopeOrderByDirection: "desc" as "asc" | "desc",
    alertName: "",
    severity: "warning",
    channels: { inApp: true, telegram: false, slack: false, lark: false, email: false },
    frequency: "daily",
    evaluationCooldownMinutes: "",
    dailyEvaluationHourUtc: "any",
    autoResolve: true,
  })

  const { data: appsData, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: open, cacheKey: "manual_alert_create_apps" }
  )

  const { data: metricsCatalog, loading: metricsCatalogLoading } = useApi(
    () => alertsApi.getMetricsCatalog(),
    { enabled: open, cacheKey: "alert_metrics_catalog" }
  )

  const apps = useMemo(
    () =>
      (appsData?.apps ?? []).map((app) => ({
        id: app.appId,
        name: app.displayName || app.name || app.appId,
        platform: app.platform || null,
        iconUri: app.iconUri || null,
      })),
    [appsData]
  )

  const filteredApps = useMemo(() => {
    const keyword = appSearch.trim().toLowerCase()
    if (!keyword) return apps
    return apps.filter(
      (app) => app.name.toLowerCase().includes(keyword) || app.id.toLowerCase().includes(keyword)
    )
  }, [apps, appSearch])

  const scopeOrderMetricOptions = useMemo(() => {
    const base = resolveMetricSelectOptions(metricsCatalog ?? null, formData.scopeOrderByMetric || "revenue")
    return [{ value: "__none__", label: "Default (dataset order)" }, ...base]
  }, [metricsCatalog, formData.scopeOrderByMetric])

  const isAllApps = formData.selectedApps.includes("all")
  const isEdit = !!rule
  const isClone = !isEdit && !!cloneFrom

  const cloneTemplateConditionDescription = useMemo(() => {
    if (!cloneFrom) return "—"
    return formatRuleConditionsSummary(cloneFrom)
  }, [cloneFrom])

  /** Clone từ template: chỉnh tay điều kiện hay giữ nguyên như template. */
  const showConditionEditor = !isClone || cloneConditionMode === "customize"

  /** Tab My Alerts hoặc rule PRIVATE đang sửa — không cấu hình Telegram/Slack/Email trên rule. */
  const isMyPrivateRule =
    ruleVisibility === "PRIVATE" || String(rule?.visibility ?? "").toUpperCase() === "PRIVATE"

  const telegramPresets = useMemo(() => {
    const u = getCurrentUser() as { telegramDestinationsJson?: string } | null
    return parseTelegramPresetsJson(u?.telegramDestinationsJson)
  }, [open, telegramPresetsRevision])

  const telegramDestinationTokensInForm = useMemo(() => {
    const s = new Set<string>()
    for (const r of telegramRows) {
      const t = telegramTopicTokenFromRow(r)
      if (t) s.add(t)
    }
    return s
  }, [telegramRows])

  useEffect(() => {
    if (!open) return

    const isPrivateFlow =
      ruleVisibility === "PRIVATE" ||
      (rule != null && String(rule.visibility ?? "").toUpperCase() === "PRIVATE")

    /** Khi clone: dùng dữ liệu template (ORG rule) nhưng không có id. */
    const sourceRule: AlertRule | null | undefined = isClone ? cloneFrom : rule

    const parsedConfig = parseRuleConfig(sourceRule?.ruleConfig || sourceRule?.filterConditions)
    const notificationChannels = parseJsonArray(sourceRule?.notificationChannels).map((item) => item.toUpperCase())

    setStep(1)
    if (isClone) setCloneConditionMode("keep")
    setAppSearch("")
    setDuplicateConfirmOpen(false)
    setPendingDuplicateName("")
    setTelegramPresetSaveSuccessRowIds({})
    setTelegramPresetNamesByRowId({})
    // PRIVATE rules still persist telegramTopics per-rule; only Slack/Email come from profile in UI.
    setTelegramRows(rowsFromTelegramTopics(parseJsonArray(sourceRule?.telegramTopics)))
    if (isPrivateFlow) {
      setSlackRows([emptySlackRow()])
      setEmailRows([emptyEmailRow()])
    } else {
      setSlackRows(rowsFromSlackChannels(parseJsonArray(sourceRule?.slackChannels)))
      setEmailRows(rowsFromEmailRecipients(parseJsonArray(sourceRule?.emailRecipients)))
    }

    if (!sourceRule) {
      setFormData({
        conditionLogic: "all",
        conditions: [emptyConditionRow()],
        selectedApps: ["all"],
        scopeOrderByMetric: "",
        scopeOrderByDirection: "desc",
        alertName: "",
        severity: "warning",
        channels: isPrivateFlow
          ? { inApp: true, telegram: false, slack: true, lark: false, email: true }
          : { inApp: true, telegram: false, slack: false, lark: false, email: false },
        frequency: "daily",
        evaluationCooldownMinutes: "",
        dailyEvaluationHourUtc: "any",
        autoResolve: true,
      })
      setTelegramRows([emptyTelegramRow()])
      setSlackRows([emptySlackRow()])
      setEmailRows([emptyEmailRow()])
      return
    }

    const scope = parsedConfig?.scope
    const selectedApps =
      scope?.allApps !== false
        ? ["all"]
        : scope?.appIds && scope.appIds.length > 0
          ? scope.appIds
          : ["all"]

    const scopeOrderRaw = scope?.orderByMetric?.trim() ?? ""
    const scopeDirRaw = (scope?.orderByDirection ?? "desc").toLowerCase() === "asc" ? "asc" : "desc"

    const { logic, rows } = buildConditionLogicAndRowsFromRule(sourceRule)

    /** Khi clone: tên mặc định "Copy of ..." thay vì giữ tên gốc. */
    const defaultName = isClone
      ? `Copy of ${sourceRule.name || "Alert Rule"}`
      : sourceRule.name || ""

    /** Khi clone PRIVATE: kế thừa kênh notify nhưng strip destinations (lấy từ profile). */
    const channelsForClone = isPrivateFlow
      ? {
          inApp: notificationChannels.includes("IN_APP"),
          telegram: notificationChannels.includes("TELEGRAM"),
          slack: notificationChannels.includes("SLACK"),
          lark: notificationChannels.includes("LARK"),
          email: notificationChannels.includes("EMAIL"),
        }
      : {
          inApp: notificationChannels.includes("IN_APP"),
          telegram: notificationChannels.includes("TELEGRAM"),
          slack: notificationChannels.includes("SLACK"),
          lark: notificationChannels.includes("LARK"),
          email: notificationChannels.includes("EMAIL"),
        }

    setFormData({
      conditionLogic: logic,
      conditions: rows,
      selectedApps,
      scopeOrderByMetric: scopeOrderRaw,
      scopeOrderByDirection: scopeDirRaw,
      alertName: defaultName,
      severity: toSeverityValue(sourceRule.severity),
      channels: channelsForClone,
      frequency: parsedConfig?.frequency || (sourceRule.timeWindowHours === 24 ? "daily" : sourceRule.timeWindowHours === 1 ? "hourly" : "realtime"),
      evaluationCooldownMinutes:
        parsedConfig?.evaluationCooldownMinutes != null && parsedConfig.evaluationCooldownMinutes > 0
          ? String(parsedConfig.evaluationCooldownMinutes)
          : "",
      dailyEvaluationHourUtc:
        parsedConfig?.dailyEvaluationHourUtc != null &&
        parsedConfig.dailyEvaluationHourUtc >= 0 &&
        parsedConfig.dailyEvaluationHourUtc <= 23
          ? String(parsedConfig.dailyEvaluationHourUtc)
          : "any",
      autoResolve: parsedConfig?.autoResolve ?? true,
    })
  }, [open, rule, cloneFrom, ruleVisibility, isClone])

  useEffect(() => {
    if (open) clearValidationErrors()
  }, [open, clearValidationErrors])

  const toggleSpecificApp = (appId: string, checked: boolean) => {
    setStep1Error(undefined)
    setFormData((current) => {
      const withoutAll = current.selectedApps.filter((id) => id !== "all")
      if (checked) {
        return { ...current, selectedApps: Array.from(new Set([...withoutAll, appId])) }
      }
      return { ...current, selectedApps: withoutAll.filter((id) => id !== appId) }
    })
  }

  const handleNext = () => {
    if (step === 1) {
      if (!isAllApps && formData.selectedApps.length === 0) {
        setStep1Error("Chọn All Apps hoặc ít nhất một app cụ thể.")
        return
      }
      setStep1Error(undefined)
    }
    if (step === 2) {
      const skipConditionValidation = isClone && cloneConditionMode === "keep"
      if (!skipConditionValidation) {
        if (formData.conditionLogic !== "always_true") {
          if (formData.conditions.length === 0) {
            setStep2ListError("Thêm ít nhất một điều kiện (Add condition).")
            setStep2FieldErrors({})
            return
          }
          setStep2ListError(undefined)
          const byId: Record<string, Step2ConditionErrors> = {}
          for (const c of formData.conditions) {
            const e: Step2ConditionErrors = {}
            if (!c.metric?.trim()) {
              e.metric = "Chọn metric."
            }
            if (c.conditionType === "threshold" && !c.thresholdValue?.trim()) {
              e.value = "Nhập giá trị threshold."
            }
            if (c.conditionType === "percent_change" && !c.percentChange?.trim()) {
              e.value = "Nhập phần trăm thay đổi."
            }
            if (c.conditionType === "consecutive" && !c.thresholdValue?.trim()) {
              e.value = "Nhập ngưỡng cho consecutive."
            }
            if (e.metric || e.value) {
              byId[c.id] = e
            }
          }
          if (Object.keys(byId).length > 0) {
            setStep2FieldErrors(byId)
            return
          }
          setStep2FieldErrors({})
        } else {
          setStep2ListError(undefined)
          setStep2FieldErrors({})
        }
      } else {
        setStep2ListError(undefined)
        setStep2FieldErrors({})
      }
    }
    if (step === 3) {
      const e: Step3SectionErrors = {}
      const cooldownRaw = formData.evaluationCooldownMinutes.trim()
      if (
        (formData.frequency === "realtime" || formData.frequency === "hourly") &&
        cooldownRaw.length > 0
      ) {
        const n = Number(cooldownRaw)
        if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
          e.frequency = "Cooldown phải là số nguyên phút ≥ 1 (hoặc để trống)."
        }
      }
      if (formData.frequency === "daily" && formData.dailyEvaluationHourUtc !== "any") {
        const h = Number(formData.dailyEvaluationHourUtc)
        if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isInteger(h)) {
          e.frequency = "Giờ chạy hằng ngày (GMT+7) phải từ 0–23."
        }
      }
      if (formData.channels.telegram) {
        const ok = telegramRows.some((row) => telegramTopicTokenFromRow(row))
        if (!ok) e.telegram = "Nhập ít nhất một Chat ID khi bật Telegram."
      }
      if (!isMyPrivateRule) {
        if (formData.channels.slack) {
          const badUrl = slackRows.some((row) => {
            const v = row.webhookUrl.trim()
            if (!v) return false
            try {
              const u = new URL(v)
              return !["http:", "https:"].includes(u.protocol)
            } catch {
              return true
            }
          })
          if (badUrl) e.slack = "Mỗi Slack webhook URL (nếu nhập) phải là http/https hợp lệ."
        }
        if (formData.channels.email) {
          const ok = emailRows.some((row) => row.email.trim().length > 0)
          if (!ok) e.email = "Nhập ít nhất một địa chỉ email."
        }
      }
      if (Object.keys(e).length > 0) {
        setStep3Errors(e)
        return
      }
      setStep3Errors({})
    }
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) {
      clearValidationErrors()
      setStep(step - 1)
    }
  }

  const formatTimestampYmdHisSSS = (date: Date) => {
    const yyyy = date.getFullYear().toString()
    const MM = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const HH = String(date.getHours()).padStart(2, "0")
    const mm = String(date.getMinutes()).padStart(2, "0")
    const ss = String(date.getSeconds()).padStart(2, "0")
    const SSS = String(date.getMilliseconds()).padStart(3, "0")
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}${SSS}`
  }

  const saveRuleWithName = async (name: string) => {
    try {
      setCreating(true)
      const payload = buildRulePayload(name)

      if (rule) {
        await alertsApi.updateAlertRule(rule.id, payload)
      } else {
        await alertsApi.createAlertRule(payload)
      }

      toast({ title: rule ? "Đã cập nhật alert rule" : "Đã tạo alert rule" })
      onCreated?.()
      onOpenChange(false)
      setStep(1)
      setPendingDuplicateName("")
    } catch (error: any) {
      toast({
        title: "Không thể tạo alert",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCreate = async () => {
    const name = (formData.alertName || generateAlertName()).trim()
    if (!name) {
      toast({ title: "Thiếu Alert name", description: "Vui lòng nhập tên alert.", variant: "destructive" })
      return
    }
    try {
      const vis: "ORG" | "PRIVATE" =
        rule?.visibility === "PRIVATE" || ruleVisibility === "PRIVATE" ? "PRIVATE" : "ORG"
      const existingRules = await alertsApi.getAlertRules(undefined, vis)
      const isDuplicate = existingRules.some((item) => {
        if (rule && item.id === rule.id) return false
        return item.name.trim().toLowerCase() === name.toLowerCase()
      })
      if (isDuplicate) {
        setPendingDuplicateName(name)
        setDuplicateConfirmOpen(true)
        return
      }
      await saveRuleWithName(name)
    } catch (error: any) {
      toast({
        title: "Không thể kiểm tra tên trùng",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleConfirmCreateWithTimestamp = async () => {
    const finalName = `${pendingDuplicateName}_${formatTimestampYmdHisSSS(new Date())}`
    setDuplicateConfirmOpen(false)
    await saveRuleWithName(finalName)
  }

  const generateAlertName = () => {
    if (formData.conditionLogic === "always_true") return "Manual alert (always true)"
    const c = formData.conditions[0]
    if (!c) return "Manual Alert"
    const metricLabel = metricLabelFromCatalog(metricsCatalog ?? null, c.metric)
    return describeManualConditionText(metricLabel, c)
  }

  const buildRulePayload = (name: string) => {
    const channels = Object.entries(formData.channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => {
        if (channel === "inApp") return "IN_APP"
        return channel.toUpperCase()
      })
    const telegramTopics = telegramRows
      .map((row) => telegramTopicTokenFromRow(row))
      .filter((value): value is string => !!value)
    const slackChannels = slackRows
      .map((row) => row.webhookUrl.trim())
      .filter((value) => value.length > 0)
    const emailRecipients = emailRows
      .map((row) => row.email.trim())
      .filter((value) => value.length > 0)

    const isAlwaysTrue = formData.conditionLogic === "always_true"
    const conditionsPayload = isAlwaysTrue
      ? []
      : formData.conditions.map((c, i) => {
          const mk = toMetricKey(c.metric)
          return {
            id: c.id || `c${i}`,
            metricKey: mk,
            metricUnit: toMetricUnit(mk),
            conditionType: c.conditionType,
            operator: c.operator,
            thresholdValue:
              c.conditionType === "threshold" || c.conditionType === "consecutive"
                ? c.thresholdValue
                  ? Number(c.thresholdValue)
                  : null
                : null,
            percentChange: c.conditionType === "percent_change" ? (c.percentChange ? Number(c.percentChange) : null) : null,
            consecutiveDays: c.conditionType === "consecutive" ? (c.consecutiveDays ? Number(c.consecutiveDays) : null) : null,
          }
        })
    const first = conditionsPayload[0]
    const defaultMetricWhenAlways = inferMetricKeyFromRuleType(rule?.ruleType)
    const anyPercent = !isAlwaysTrue && formData.conditions.some((c) => c.conditionType === "percent_change")
    const firstThreshold =
      !isAlwaysTrue
        ? (formData.conditions.find((c) => c.conditionType === "threshold") ?? formData.conditions[0])
        : undefined

    const evalCooldownParsed =
      formData.frequency === "realtime" || formData.frequency === "hourly"
        ? (() => {
            const t = formData.evaluationCooldownMinutes.trim()
            if (!t) return null
            const n = Number(t)
            return Number.isFinite(n) && n >= 1 && Number.isInteger(n) ? n : null
          })()
        : null

    const dailyHourParsed =
      formData.frequency === "daily" && formData.dailyEvaluationHourUtc !== "any"
        ? Number(formData.dailyEvaluationHourUtc)
        : null
    const dailyHourUtc =
      dailyHourParsed != null && dailyHourParsed >= 0 && dailyHourParsed <= 23 ? dailyHourParsed : null

    const ruleConfig: AlertRuleConfigPayload = {
      version: 2,
      source: "manual",
      conditionLogic: formData.conditionLogic,
      conditions: conditionsPayload,
      metricKey: isAlwaysTrue ? defaultMetricWhenAlways : (first?.metricKey ?? null),
      metricUnit: isAlwaysTrue ? toMetricUnit(defaultMetricWhenAlways) : (first?.metricUnit ?? null),
      conditionType: isAlwaysTrue ? null : (first?.conditionType ?? null),
      operator: isAlwaysTrue ? null : (first?.operator ?? null),
      thresholdValue: isAlwaysTrue ? null : (first?.thresholdValue ?? null),
      percentChange: isAlwaysTrue ? null : (first?.percentChange ?? null),
      consecutiveDays: isAlwaysTrue ? null : (first?.consecutiveDays ?? null),
      frequency: formData.frequency,
      evaluationCooldownMinutes: evalCooldownParsed,
      dailyEvaluationHourUtc: dailyHourUtc,
      autoResolve: formData.autoResolve,
      scope: {
        allApps: isAllApps,
        appIds: isAllApps ? [] : formData.selectedApps,
        ...(formData.scopeOrderByMetric.trim()
          ? {
              orderByMetric: toMetricKey(formData.scopeOrderByMetric),
              orderByDirection: formData.scopeOrderByDirection,
            }
          : {}),
      },
    }

    const joiner = formData.conditionLogic === "any" ? " or " : " and "
    const ruleExpression = isAlwaysTrue
      ? "Always true — fires every evaluation for each app in scope (no metric conditions)."
      : formData.conditions
          .map((c) =>
            describeManualConditionText(metricLabelFromCatalog(metricsCatalog ?? null, c.metric), c)
          )
          .join(joiner)

    const effectiveVisibility: "ORG" | "PRIVATE" =
      rule?.visibility === "PRIVATE" || ruleVisibility === "PRIVATE" ? "PRIVATE" : "ORG"

    const basePayload = {
      visibility: effectiveVisibility,
      name,
      description: rule?.description || "Created from manual alert wizard",
      ruleType: rule?.ruleType?.trim() || "MANUAL",
      severity: formData.severity.toUpperCase(),
      ruleExpression,
      thresholdValue:
        !isAlwaysTrue &&
        firstThreshold?.conditionType === "threshold" &&
        firstThreshold.thresholdValue
          ? Number(firstThreshold.thresholdValue)
          : null,
      timeWindowHours: formData.frequency === "daily" ? 24 : 1,
      comparisonPeriodHours: anyPercent ? 24 : null,
      filterConditions: JSON.stringify(ruleConfig),
      configVersion: rule?.configVersion ?? 1,
      ruleConfig: JSON.stringify(ruleConfig),
      messageTemplate: `${name} triggered`,
      isEnabled: rule?.isEnabled ?? true,
      cooldownMinutes:
        evalCooldownParsed != null && evalCooldownParsed > 0
          ? evalCooldownParsed
          : rule?.cooldownMinutes ?? 60,
      notificationChannels: JSON.stringify(channels.length > 0 ? channels : ["IN_APP"]),
      telegramTopics: JSON.stringify(formData.channels.telegram ? telegramTopics : []),
      emailRecipients: JSON.stringify(formData.channels.email ? emailRecipients : []),
      slackChannels: JSON.stringify(formData.channels.slack ? slackChannels : []),
      priority: formData.severity === "critical" ? 10 : formData.severity === "warning" ? 5 : 1,
    }

    if (effectiveVisibility === "PRIVATE") {
      const privateChannels = channels.length > 0 ? channels : ["IN_APP"]
      return {
        ...basePayload,
        notificationChannels: JSON.stringify(privateChannels),
        // PRIVATE: cho phép TELEGRAM per-rule (chatId|threadId). Slack/Email vẫn lấy từ profile.
        telegramTopics: JSON.stringify(formData.channels.telegram ? telegramTopics : []),
        emailRecipients: JSON.stringify([]),
        slackChannels: JSON.stringify([]),
      }
    }

    return basePayload
  }

  const saveTelegramPresetFromRow = async (row: TelegramDestinationRow) => {
    if (!isMyPrivateRule) return
    const chatId = row.chatId.trim()
    if (!chatId) {
      toast({ title: "Thiếu chatId", description: "Nhập chatId trước khi lưu preset.", variant: "destructive" })
      return
    }
    const messageThreadId = row.messageThreadId.trim()
    const presetNameRaw = (telegramPresetNamesByRowId[row.id] ?? "").trim()
    if (!presetNameRaw) {
      toast({ title: "Thiếu tên gợi nhớ", description: "Nhập tên preset để lưu.", variant: "destructive" })
      return
    }

    setSavingTelegramPresetRowId(row.id)
    try {
      const current = getCurrentUser() as { telegramDestinationsJson?: string } | null
      const existing = parseTelegramPresetsJson(current?.telegramDestinationsJson)

      let next: TelegramDestinationPreset[]
      let presetIdToLink: string

      const linked =
        row.linkedPresetId != null ? existing.find((p) => p.id === row.linkedPresetId) : undefined

      if (linked && row.linkedPresetId) {
        next = existing.map((p) =>
          p.id === row.linkedPresetId
            ? { ...p, name: presetNameRaw, chatId, messageThreadId: messageThreadId || undefined }
            : p,
        )
        presetIdToLink = row.linkedPresetId
      } else {
        if (row.linkedPresetId) {
          toast({
            title: "Preset không còn",
            description: "Preset đã xóa khỏi profile. Đang lưu theo Chat ID hiện tại.",
            variant: "destructive",
          })
        }
        const token = messageThreadId ? `${chatId}|${messageThreadId}` : chatId
        const already = existing.find((p) => {
          const t = p.messageThreadId?.trim()
            ? `${p.chatId.trim()}|${p.messageThreadId.trim()}`
            : p.chatId.trim()
          return t === token
        })

        if (already) {
          next = existing.map((p) =>
            p.id === already.id
              ? { ...p, name: presetNameRaw, chatId, messageThreadId: messageThreadId || undefined }
              : p,
          )
          presetIdToLink = already.id
        } else {
          const newId = newRowId()
          next = [
            ...existing,
            {
              id: newId,
              name: presetNameRaw,
              chatId,
              messageThreadId: messageThreadId || undefined,
            },
          ]
          presetIdToLink = newId
        }
      }

      const res = await authApi.updateMyProfile({
        telegramDestinationsJson: JSON.stringify(next),
      })
      if (!res.success || !res.data) throw new Error("Failed to update profile")

      const accessToken = getAccessToken()
      if (accessToken) {
        setAuthData(accessToken, getRefreshToken() ?? null, authUserFromMeDto(res.data))
      }

      setTelegramRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, linkedPresetId: presetIdToLink } : r)),
      )

      setTelegramPresetsRevision((n) => n + 1)
      toast({ title: "Đã lưu Telegram preset", description: `Saved: ${presetNameRaw}` })
      setTelegramPresetSaveSuccessRowIds((prev) => ({ ...prev, [row.id]: true }))
      window.setTimeout(() => {
        setTelegramPresetSaveSuccessRowIds((prev) => {
          if (!prev[row.id]) return prev
          const next = { ...prev }
          delete next[row.id]
          return next
        })
      }, 4000)
    } catch (e: any) {
      toast({ title: "Không thể lưu preset", description: e?.message || "Unknown error", variant: "destructive" })
    } finally {
      setSavingTelegramPresetRowId(null)
    }
  }

  const updateTelegramRow = (id: string, patch: Partial<TelegramDestinationRow>) => {
    setTelegramRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setStep3Errors((prev) => ({ ...prev, telegram: undefined }))
    setTelegramPresetSaveSuccessRowIds((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const updateSlackRow = (id: string, patch: Partial<SlackDestinationRow>) => {
    setSlackRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setStep3Errors((prev) => ({ ...prev, slack: undefined }))
  }

  const updateEmailRow = (id: string, patch: Partial<EmailRecipientRow>) => {
    setEmailRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setStep3Errors((prev) => ({ ...prev, email: undefined }))
  }

  const removeTelegramRow = (id: string) => {
    setTelegramRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptyTelegramRow()]))
    setTelegramPresetNamesByRowId((prev) => {
      if (!(id in prev)) return prev
      const n = { ...prev }
      delete n[id]
      return n
    })
    setTelegramPresetSaveSuccessRowIds((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const removeSlackRow = (id: string) => {
    setSlackRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptySlackRow()]))
  }

  const removeEmailRow = (id: string) => {
    setEmailRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptyEmailRow()]))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) clearValidationErrors()
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[min(85vh,900px)] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-hidden p-6 md:w-[60vw] md:!max-w-[60vw]">
        <div className="shrink-0 space-y-2 border-b border-slate-100 pb-3">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl">
              {isEdit ? "Edit Alert Rule" : isClone ? "Create Alert from Template" : "Create Alert Rule"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Step {step} of 4</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? "bg-indigo-600 text-white"
                      : s < step
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm ${s === step ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                  {s === 1
                    ? "Scope"
                    : s === 2
                      ? "Condition"
                      : s === 3
                        ? "Notifications"
                        : "Final"}
                </span>
                {s < 4 && <ChevronRight className="w-4 h-4 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select App(s) *</Label>
                  <div
                    className={cn(
                      "space-y-3 rounded-lg transition-[box-shadow]",
                      step1Error && "ring-2 ring-red-500/80 ring-offset-2"
                    )}
                  >
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 border-slate-200">
                      <Checkbox
                        checked={isAllApps}
                        onCheckedChange={(checked) => {
                          setStep1Error(undefined)
                          if (checked) {
                            setFormData((current) => ({ ...current, selectedApps: ["all"] }))
                          } else {
                            setFormData((current) => ({ ...current, selectedApps: [] }))
                          }
                        }}
                      />
                      <span className="text-sm font-medium">All Apps</span>
                    </label>

                    {!isAllApps && (
                      <>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            className="pl-9"
                            placeholder="Search by app name or appId"
                            value={appSearch}
                            onChange={(e) => setAppSearch(e.target.value)}
                          />
                        </div>

                        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2">
                          {appsLoading ? (
                            <div className="text-sm text-slate-500 py-6 flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading apps...
                            </div>
                          ) : filteredApps.length === 0 ? (
                            <div className="text-sm text-slate-500 py-6 text-center">No app found.</div>
                          ) : (
                            filteredApps.map((app) => {
                              const checked = formData.selectedApps.includes(app.id)
                              return (
                                <label
                                  key={app.id}
                                  className={`flex items-start gap-2 p-2 border rounded-md cursor-pointer hover:bg-slate-50 ${
                                    checked ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                                  }`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(next) => toggleSpecificApp(app.id, next === true)}
                                  />
                                  <Avatar className="h-8 w-8 shrink-0 rounded-md">
                                    <AvatarImage src={app.iconUri || "/placeholder.svg"} alt={app.name} className="object-cover" />
                                    <AvatarFallback className="rounded-md text-[10px] bg-slate-100 text-slate-600">
                                      {app.name.slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 truncate">{app.name}</p>
                                      {app.platform && (
                                        <Badge variant="outline" className="text-[10px] h-5 shrink-0 text-slate-600">
                                          {app.platform}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono truncate">{app.id}</p>
                                  </div>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {step1Error && (
                    <p className="text-sm text-red-600 mt-1.5" role="alert">
                      {step1Error}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div>
                    <Label>Order alerts by metric</Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Optional. Sorts processing order per app using each app&apos;s latest day in the evaluation window
                      (alerts, Slack batches, etc.). Leave default to keep loader order.
                    </p>
                  </div>
                  <Select
                    value={formData.scopeOrderByMetric.trim() ? formData.scopeOrderByMetric : "__none__"}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        scopeOrderByMetric: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full max-w-md bg-white">
                      <SelectValue placeholder="Default order" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOrderMetricOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.scopeOrderByMetric.trim() !== "" && (
                    <RadioGroup
                      value={formData.scopeOrderByDirection}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, scopeOrderByDirection: v as "asc" | "desc" }))
                      }
                      className="flex flex-wrap gap-3"
                    >
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                          formData.scopeOrderByDirection === "asc" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value="asc" id="scope-order-asc" />
                        <span>ASC (low → high)</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                          formData.scopeOrderByDirection === "desc" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value="desc" id="scope-order-desc" />
                        <span>DESC (high → low)</span>
                      </label>
                    </RadioGroup>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {isClone && cloneFrom && (
                  <div className="space-y-3">
                    <Label>Điều kiện (từ template)</Label>
                    <RadioGroup
                      value={cloneConditionMode}
                      onValueChange={(v) => {
                        const mode = v as "keep" | "customize"
                        setCloneConditionMode(mode)
                        if (mode === "keep") {
                          const { logic, rows } = buildConditionLogicAndRowsFromRule(cloneFrom)
                          setFormData((prev) => ({ ...prev, conditionLogic: logic, conditions: rows }))
                          setStep2ListError(undefined)
                          setStep2FieldErrors({})
                        }
                      }}
                      className="flex flex-wrap gap-4"
                    >
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                          cloneConditionMode === "keep" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value="keep" id="clone-cond-keep" />
                        <span className="text-sm font-medium">Giữ nguyên</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                          cloneConditionMode === "customize" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value="customize" id="clone-cond-customize" />
                        <span className="text-sm font-medium">Customize</span>
                      </label>
                    </RadioGroup>
                  </div>
                )}

                {isClone && cloneConditionMode === "keep" && (
                  <div className="space-y-2">
                    <Label className="text-slate-700">Mô tả điều kiện</Label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{cloneTemplateConditionDescription}</p>
                    </div>
                  </div>
                )}

                {showConditionEditor && (
                  <>
                <div className="flex items-center gap-2">
                  <Label>Combine conditions</Label>
                  {metricsCatalogLoading && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading catalog…
                    </span>
                  )}
                </div>
                <RadioGroup
                  value={formData.conditionLogic}
                  onValueChange={(v) =>
                    setFormData({ ...formData, conditionLogic: v as "all" | "any" | "always_true" })
                  }
                  className="flex flex-wrap gap-4"
                >
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                      formData.conditionLogic === "all" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                    }`}
                  >
                    <RadioGroupItem value="all" />
                    <span className="text-sm font-medium">All (AND)</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                      formData.conditionLogic === "any" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                    }`}
                  >
                    <RadioGroupItem value="any" />
                    <span className="text-sm font-medium">Any (OR)</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer ${
                      formData.conditionLogic === "always_true" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                    }`}
                  >
                    <RadioGroupItem value="always_true" />
                    <span className="text-sm font-medium">Always true</span>
                  </label>
                </RadioGroup>
                {formData.conditionLogic === "always_true" && (
                  <p className="text-sm text-slate-600 -mt-2">
                    Job sẽ tạo alert mỗi lần chạy cho từng app trong phạm vi có dữ liệu, không kiểm tra điều kiện metric.
                    Metric mặc định để tải dữ liệu / hiển thị theo loại rule (ví dụ MANUAL → revenue).
                  </p>
                )}

                {formData.conditionLogic !== "always_true" && (
                  <>
                <div className="flex items-center justify-between">
                  <Label className="text-base">Conditions *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={() => {
                      setStep2ListError(undefined)
                      setFormData((prev) => ({ ...prev, conditions: [...prev.conditions, emptyConditionRow()] }))
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add condition
                  </Button>
                </div>
                {step2ListError && (
                  <p className="text-sm text-red-600 -mt-2" role="alert">
                    {step2ListError}
                  </p>
                )}

                <div className="space-y-4">
                  {formData.conditions.map((c, idx) => {
                    const rowOptions = resolveMetricSelectOptions(metricsCatalog ?? null, c.metric)
                    const fe = step2FieldErrors[c.id]
                    const updateRow = (patch: Partial<ManualConditionRow>) => {
                      setFormData((prev) => ({
                        ...prev,
                        conditions: prev.conditions.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
                      }))
                      setStep2FieldErrors((prev) => {
                        const cur = prev[c.id]
                        if (!cur) return prev
                        const nextE = { ...cur }
                        if ("metric" in patch) delete nextE.metric
                        if (
                          "thresholdValue" in patch ||
                          "percentChange" in patch ||
                          "consecutiveDays" in patch ||
                          "conditionType" in patch
                        )
                          delete nextE.value
                        const next = { ...prev }
                        if (Object.keys(nextE).length === 0) delete next[c.id]
                        else next[c.id] = nextE
                        return next
                      })
                    }
                    const removeRow = () => {
                      if (formData.conditions.length <= 1) return
                      setFormData((prev) => ({
                        ...prev,
                        conditions: prev.conditions.filter((_, i) => i !== idx),
                      }))
                    }
                    return (
                      <Card key={c.id} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-800">Condition {idx + 1}</span>
                            {formData.conditions.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={removeRow}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Metric *</Label>
                            <Select value={c.metric} onValueChange={(v) => updateRow({ metric: v })}>
                              <SelectTrigger
                                className={cn("w-full", fe?.metric && "border-red-500 focus-visible:ring-red-500/30")}
                              >
                                <SelectValue placeholder="Choose a metric" />
                              </SelectTrigger>
                              <SelectContent>
                                {rowOptions.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fe?.metric && (
                              <p className="text-sm text-red-600" role="alert">
                                {fe.metric}
                              </p>
                            )}
                          </div>
                          <div className="border-t border-slate-100 pt-4 space-y-3">
                            <Label>Condition type *</Label>
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,18.5rem)_1fr] sm:gap-7 sm:items-start">
                              <RadioGroup
                                value={c.conditionType}
                                onValueChange={(v) => updateRow({ conditionType: v })}
                                className="flex flex-col gap-2 min-w-0"
                              >
                                {conditionTypes.map((ct) => (
                                  <label
                                    key={ct.value}
                                    className={`flex items-start gap-2.5 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                                      c.conditionType === ct.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                                    }`}
                                  >
                                    <RadioGroupItem value={ct.value} className="mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-900 leading-snug">{ct.label}</p>
                                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{ct.description}</p>
                                    </div>
                                  </label>
                                ))}
                              </RadioGroup>
                              <div className="space-y-4 min-w-0">
                              {c.conditionType === "threshold" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Operator</Label>
                                    <Select value={c.operator} onValueChange={(v) => updateRow({ operator: v })}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="less_than">Is less than</SelectItem>
                                        <SelectItem value="greater_than">Is greater than</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Value</Label>
                                    <Input
                                      type="number"
                                      placeholder="e.g., 5.00"
                                      value={c.thresholdValue}
                                      onChange={(e) => updateRow({ thresholdValue: e.target.value })}
                                      className={cn(fe?.value && "border-red-500 focus-visible:ring-red-500/30")}
                                    />
                                  </div>
                                </div>
                              )}
                              {c.conditionType === "percent_change" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Change direction</Label>
                                    <Select value={c.operator} onValueChange={(v) => updateRow({ operator: v })}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="less_than">Decreases by at least (vs baseline)</SelectItem>
                                        <SelectItem value="greater_than">Increases by at least (vs baseline)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Percentage (%)</Label>
                                    <Input
                                      type="number"
                                      placeholder="e.g., 20"
                                      value={c.percentChange}
                                      onChange={(e) => updateRow({ percentChange: e.target.value })}
                                      className={cn(fe?.value && "border-red-500 focus-visible:ring-red-500/30")}
                                    />
                                  </div>
                                </div>
                              )}
                              {c.conditionType === "consecutive" && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Operator</Label>
                                      <Select value={c.operator} onValueChange={(v) => updateRow({ operator: v })}>
                                        <SelectTrigger className="w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="less_than">Stays below threshold</SelectItem>
                                          <SelectItem value="greater_than">Stays above threshold</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Threshold value</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 5.00"
                                        value={c.thresholdValue}
                                        onChange={(e) => updateRow({ thresholdValue: e.target.value })}
                                        className={cn(fe?.value && "border-red-500 focus-visible:ring-red-500/30")}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Consecutive days</Label>
                                    <Select
                                      value={c.consecutiveDays}
                                      onValueChange={(v) => updateRow({ consecutiveDays: v })}
                                    >
                                      <SelectTrigger className="w-full sm:w-40">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[2, 3, 5, 7].map((d) => (
                                          <SelectItem key={d} value={d.toString()}>
                                            {d} days
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                              {fe?.value && (
                                <p className="text-sm text-red-600" role="alert">
                                  {fe.value}
                                </p>
                              )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
                  </>
                )}
                  </>
                )}

                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <RadioGroup
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v })}
                    className="flex gap-4"
                  >
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "critical" ? "border-red-500 bg-red-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="critical" />
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Critical</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "warning" ? "border-amber-500 bg-amber-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="warning" />
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">Warning</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                        formData.severity === "info" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                      }`}
                    >
                      <RadioGroupItem value="info" />
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Info</span>
                    </label>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Notification Channels</Label>
                  {isMyPrivateRule && (
                    <p className="text-sm text-slate-600">
                      Telegram destinations nhập ở dưới. Slack và email khi gửi lấy từ{" "}
                      <span className="font-medium text-slate-800">My Profile</span> — không nhập webhook/danh sách email
                      trên rule.
                    </p>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">In-app Notification</span>
                      <Switch
                        checked={formData.channels.inApp}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, inApp: c } })}
                      />
                    </div>
                    {isMyPrivateRule ? (
                      <>
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">Telegram</span>
                          </div>
                          <Switch
                            checked={formData.channels.telegram}
                            onCheckedChange={(c) => {
                              setStep3Errors((prev) => ({ ...prev, telegram: undefined }))
                              setFormData({ ...formData, channels: { ...formData.channels, telegram: c } })
                            }}
                          />
                        </div>
                        {formData.channels.telegram && (
                          <div
                            className={cn(
                              "rounded-lg border bg-slate-50 p-3 space-y-3",
                              step3Errors.telegram ? "border-red-500 ring-2 ring-red-500/25" : "border-slate-200",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-medium text-slate-900">Telegram destinations</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-white"
                                onClick={() => setTelegramRows((prev) => [...prev, emptyTelegramRow()])}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            </div>

                            {telegramPresets.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-slate-600">Group/Channel đã lưu — bấm để thêm</p>
                                <div className="flex flex-wrap gap-2">
                                  {telegramPresets.map((p) => {
                                    const token = telegramPresetToken(p)
                                    const already = token != null && telegramDestinationTokensInForm.has(token)
                                    const label = p.name?.trim() || "Preset"
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        disabled={already}
                                        title={
                                          already
                                            ? "Đã có trong danh sách destinations"
                                            : `${p.messageThreadId ? `${p.chatId}|${p.messageThreadId}` : p.chatId}`
                                        }
                                        onClick={() => {
                                          setStep3Errors((prev) => ({ ...prev, telegram: undefined }))
                                          setTelegramRows((prevRows) => {
                                            const { rows, addedRowId } = applyPresetToTelegramRows(p, prevRows)
                                            if (addedRowId) {
                                              const nm = (p.name ?? "").trim()
                                              setTelegramPresetNamesByRowId((n) => ({
                                                ...n,
                                                [addedRowId]: nm,
                                              }))
                                            }
                                            return rows
                                          })
                                        }}
                                        className={cn(
                                          "inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                                          already
                                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            : "cursor-pointer border-indigo-200 bg-white text-indigo-900 hover:border-indigo-400 hover:bg-indigo-50",
                                        )}
                                      >
                                        <span className="truncate">{label}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}

                            <div className="space-y-2">
                              {telegramRows.map((row) => (
                                <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2">
                                  <Input
                                    placeholder="Chat ID"
                                    value={row.chatId}
                                    onChange={(e) => updateTelegramRow(row.id, { chatId: e.target.value })}
                                  />
                                  <Input
                                    placeholder="messageThreadId (optional)"
                                    value={row.messageThreadId}
                                    onChange={(e) => updateTelegramRow(row.id, { messageThreadId: e.target.value })}
                                  />
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      placeholder="Preset name (to save)"
                                      value={telegramPresetNamesByRowId[row.id] ?? ""}
                                      onChange={(e) => {
                                        setTelegramPresetSaveSuccessRowIds((prev) => {
                                          if (!prev[row.id]) return prev
                                          const next = { ...prev }
                                          delete next[row.id]
                                          return next
                                        })
                                        setTelegramPresetNamesByRowId((prev) => ({
                                          ...prev,
                                          [row.id]: e.target.value,
                                        }))
                                      }}
                                    />
                                    {telegramPresetSaveSuccessRowIds[row.id] &&
                                    savingTelegramPresetRowId !== row.id ? (
                                      <span title="Đã lưu preset">
                                        <CheckCircle2
                                          className="h-5 w-5 shrink-0 text-emerald-600"
                                          aria-label="Đã lưu preset"
                                        />
                                      </span>
                                    ) : shouldShowTelegramPresetSaveButton(
                                        row,
                                        telegramPresetNamesByRowId,
                                        telegramPresets,
                                      ) ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="bg-white shrink-0"
                                        disabled={savingTelegramPresetRowId === row.id}
                                        onClick={() => void saveTelegramPresetFromRow(row)}
                                        title="Save this destination as a preset in My Profile"
                                      >
                                        {savingTelegramPresetRowId === row.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          "Save"
                                        )}
                                      </Button>
                                    ) : (
                                      <span className="w-10 shrink-0" aria-hidden />
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTelegramRow(row.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {step3Errors.telegram && (
                              <p className="text-sm text-red-600" role="alert">
                                {step3Errors.telegram}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">Slack</span>
                          </div>
                          <Switch
                            checked={formData.channels.slack}
                            onCheckedChange={(c) => {
                              setStep3Errors((prev) => ({ ...prev, slack: undefined }))
                              setFormData({ ...formData, channels: { ...formData.channels, slack: c } })
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">Lark</span>
                            <span className="text-xs text-slate-500">Chưa hỗ trợ cho My Alerts</span>
                          </div>
                          <Switch
                            checked={formData.channels.lark}
                            onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, lark: c } })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">Email</span>
                          </div>
                          <Switch
                            checked={formData.channels.email}
                            onCheckedChange={(c) => {
                              setStep3Errors((prev) => ({ ...prev, email: undefined }))
                              setFormData({ ...formData, channels: { ...formData.channels, email: c } })
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                    {!isMyPrivateRule ? (
                      <>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Telegram</span>
                      <Switch
                        checked={formData.channels.telegram}
                        onCheckedChange={(c) => {
                          setStep3Errors((prev) => ({ ...prev, telegram: undefined }))
                          setFormData({ ...formData, channels: { ...formData.channels, telegram: c } })
                        }}
                      />
                    </div>
                    {formData.channels.telegram && (
                      <div
                        className={cn(
                          "rounded-lg border bg-slate-50 p-3 space-y-3",
                          step3Errors.telegram ? "border-red-500 ring-2 ring-red-500/25" : "border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">Telegram destinations</p>
                          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => setTelegramRows((prev) => [...prev, emptyTelegramRow()])}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {telegramRows.map((row) => (
                            <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                              <Input
                                placeholder="Chat ID"
                                value={row.chatId}
                                onChange={(e) => updateTelegramRow(row.id, { chatId: e.target.value })}
                              />
                              <Input
                                placeholder="messageThreadId (optional)"
                                value={row.messageThreadId}
                                onChange={(e) => updateTelegramRow(row.id, { messageThreadId: e.target.value })}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeTelegramRow(row.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {step3Errors.telegram && (
                          <p className="text-sm text-red-600" role="alert">
                            {step3Errors.telegram}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Slack</span>
                      <Switch
                        checked={formData.channels.slack}
                        onCheckedChange={(c) => {
                          setStep3Errors((prev) => ({ ...prev, slack: undefined }))
                          setFormData({ ...formData, channels: { ...formData.channels, slack: c } })
                        }}
                      />
                    </div>
                    {formData.channels.slack && (
                      <div
                        className={cn(
                          "rounded-lg border bg-slate-50 p-3 space-y-3",
                          step3Errors.slack ? "border-red-500 ring-2 ring-red-500/25" : "border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">Slack webhook URLs</p>
                          <p className="text-xs text-slate-500">Tùy chọn — có thể để trống (ví dụ chỉ dùng webhook trong My Profile).</p>
                          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => setSlackRows((prev) => [...prev, emptySlackRow()])}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {slackRows.map((row) => (
                            <div key={row.id} className="grid grid-cols-[1fr_auto] gap-2">
                              <Input
                                placeholder="https://hooks.slack.com/services/..."
                                value={row.webhookUrl}
                                onChange={(e) => updateSlackRow(row.id, { webhookUrl: e.target.value })}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeSlackRow(row.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {step3Errors.slack && (
                          <p className="text-sm text-red-600" role="alert">
                            {step3Errors.slack}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Lark</span>
                      <Switch
                        checked={formData.channels.lark}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, lark: c } })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Email</span>
                      <Switch
                        checked={formData.channels.email}
                        onCheckedChange={(c) => {
                          setStep3Errors((prev) => ({ ...prev, email: undefined }))
                          setFormData({ ...formData, channels: { ...formData.channels, email: c } })
                        }}
                      />
                    </div>
                    {formData.channels.email && (
                      <div
                        className={cn(
                          "rounded-lg border bg-slate-50 p-3 space-y-3",
                          step3Errors.email ? "border-red-500 ring-2 ring-red-500/25" : "border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">Email recipients</p>
                          <Button type="button" variant="outline" size="sm" className="bg-white" onClick={() => setEmailRows((prev) => [...prev, emptyEmailRow()])}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {emailRows.map((row) => (
                            <div key={row.id} className="grid grid-cols-[1fr_auto] gap-2">
                              <Input
                                type="email"
                                placeholder="name@example.com"
                                value={row.email}
                                onChange={(e) => updateEmailRow(row.id, { email: e.target.value })}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeEmailRow(row.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {step3Errors.email && (
                          <p className="text-sm text-red-600" role="alert">
                            {step3Errors.email}
                          </p>
                        )}
                      </div>
                    )}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 md:items-start">
                  <div className="space-y-2">
                    <Label>Evaluation Frequency</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => {
                        setStep3Errors((p) => ({ ...p, frequency: undefined }))
                        setFormData((prev) => ({
                          ...prev,
                          frequency: v,
                          evaluationCooldownMinutes:
                            v === "realtime" || v === "hourly" ? prev.evaluationCooldownMinutes : "",
                          dailyEvaluationHourUtc: v === "daily" ? prev.dailyEvaluationHourUtc : "any",
                        }))
                      }}
                    >
                      <SelectTrigger className="w-1/2 min-w-[11rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily (after pipeline)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    {(formData.frequency === "realtime" || formData.frequency === "hourly") && (
                      <>
                        <Label>Cooldown (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          placeholder="Phút — để trống = mặc định"
                          value={formData.evaluationCooldownMinutes}
                          onChange={(e) => {
                            setStep3Errors((p) => ({ ...p, frequency: undefined }))
                            setFormData((prev) => ({ ...prev, evaluationCooldownMinutes: e.target.value }))
                          }}
                          className={cn(
                            "w-1/2 min-w-[6rem]",
                            step3Errors.frequency && "border-red-500 focus-visible:ring-red-500/30"
                          )}
                        />
                        <p className="text-xs text-slate-500">
                          Nếu nhập: chỉ đánh giá lại cho cùng app khi alert gần nhất của rule này đã cách hiện tại
                          &gt; số phút này (theo thời điểm tạo alert).
                        </p>
                      </>
                    )}
                    {formData.frequency === "daily" && (
                      <>
                        <Label>Daily run hour (GMT+7)</Label>
                        <Select
                          value={formData.dailyEvaluationHourUtc}
                          onValueChange={(v) => {
                            setStep3Errors((p) => ({ ...p, frequency: undefined }))
                            setFormData((prev) => ({ ...prev, dailyEvaluationHourUtc: v }))
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-1/2 min-w-[11rem]",
                              step3Errors.frequency && "border-red-500 focus-visible:ring-red-500/30"
                            )}
                          >
                            <SelectValue placeholder="Any time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any time (legacy)</SelectItem>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {String(i).padStart(2, "0")}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          Giờ theo múi GMT+7 (UTC+7). Job chỉ đánh giá trong đúng khung giờ đó;
                        </p>
                      </>
                    )}
                    {step3Errors.frequency && (
                      <p className="text-sm text-red-600" role="alert">
                        {step3Errors.frequency}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Auto-resolve</Label>
                    <Switch
                      checked={formData.autoResolve}
                      onCheckedChange={(c) => setFormData({ ...formData, autoResolve: c })}
                    />
                  </div>
                  {formData.autoResolve && (
                    <p className="text-sm text-slate-500">
                      Alert will auto-resolve when metric recovers to normal range
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Đặt tên và xem lại cấu hình trước khi lưu.</p>
                <div className="space-y-2">
                  <Label>Alert Name</Label>
                  <Input
                    placeholder="Auto-generated or enter custom name"
                    value={formData.alertName || generateAlertName()}
                    onChange={(e) => setFormData({ ...formData, alertName: e.target.value })}
                  />
                </div>
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Alert Preview</h3>
                    <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div className="md:col-span-2 xl:col-span-4">
                        <span className="text-slate-500">
                          Conditions (
                          {formData.conditionLogic === "always_true"
                            ? "always true"
                            : formData.conditionLogic === "any"
                              ? "OR"
                              : "AND"}
                          ):
                        </span>
                        <p className="mt-1 text-sm font-medium text-slate-800 break-words leading-snug">
                          {formData.conditionLogic === "always_true"
                            ? "Không có điều kiện metric — job luôn tạo alert cho mỗi app trong phạm vi có dữ liệu."
                            : formData.conditions
                                .map((c) =>
                                  describeManualConditionText(metricLabelFromCatalog(metricsCatalog ?? null, c.metric), c)
                                )
                                .join(formData.conditionLogic === "any" ? " or " : " and ")}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Apps:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.selectedApps.map((appId) => (
                            <Badge key={appId} variant="secondary" className="text-xs max-w-full">
                              {appId === "all" ? "All Apps" : apps.find((a) => a.id === appId)?.name || appId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {formData.scopeOrderByMetric.trim() !== "" && (
                        <div className="md:col-span-2 xl:col-span-4">
                          <span className="text-slate-500">App alert order:</span>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {metricLabelFromCatalog(metricsCatalog ?? null, formData.scopeOrderByMetric)} ·{" "}
                            {formData.scopeOrderByDirection.toUpperCase()}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Severity:</span>
                        <Badge
                          className={`ml-2 ${
                            formData.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : formData.severity === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {formData.severity}
                        </Badge>
                      </div>
                      {isMyPrivateRule && (
                        <div className="md:col-span-2 xl:col-span-4">
                          <span className="text-slate-500">Thông báo:</span>
                          <p className="mt-1 text-sm text-slate-800">
                            Sẽ gửi thông báo qua các kênh cấu hình ở bước 3 theo cấu hình của bạn trong My Profile.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700" disabled={creating}>
                <Check className="w-4 h-4 mr-1" />
                {creating
                  ? isEdit ? "Saving..." : "Creating..."
                  : isEdit ? "Save Alert" : "Create Alert"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tên Alert đã tồn tại</AlertDialogTitle>
            <AlertDialogDescription>
              Alert name `"{pendingDuplicateName}"` đã tồn tại. Bạn có muốn tiếp tục tạo mới không? Nếu tiếp tục, hệ thống sẽ thêm timestamp hiện tại vào cuối tên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateWithTimestamp}>Tiếp tục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

