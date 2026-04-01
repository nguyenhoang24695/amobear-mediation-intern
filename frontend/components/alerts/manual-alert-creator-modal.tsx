"use client"

import { useEffect, useMemo, useState } from "react"
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
import { AlertTriangle, AlertCircle, Info, ChevronRight, ChevronLeft, Check, Zap, Search, Loader2, Plus, Trash2 } from "lucide-react"
import { alertsApi, structureApi } from "@/lib/api/services"
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
import type { AlertRule, AlertRuleConfigPayload } from "@/types/api"

interface ManualAlertCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  rule?: AlertRule | null
}

type TelegramDestinationRow = {
  id: string
  chatId: string
  messageThreadId: string
}

type SlackDestinationRow = {
  id: string
  webhookUrl: string
}

type EmailRecipientRow = {
  id: string
  email: string
}

const metrics = [
  { value: "ecpm", label: "eCPM" },
  { value: "revenue", label: "Revenue" },
  { value: "fill_rate", label: "Fill Rate" },
  { value: "impressions", label: "Impressions" },
  { value: "dau", label: "DAU" },
  { value: "d1_retention", label: "D1 Retention" },
  { value: "d7_retention", label: "D7 Retention" },
]

const conditionTypes = [
  { value: "threshold", label: "Threshold", description: "Alert when metric crosses a fixed value" },
  { value: "percent_change", label: "% Change", description: "Alert when metric changes by percentage vs baseline" },
  { value: "consecutive", label: "Consecutive Days", description: "Alert after N consecutive days below/above value" },
]

function toMetricKey(value: string) {
  return value
}

function toMetricUnit(metricKey: string) {
  if (metricKey === "revenue" || metricKey === "ecpm") return "usd"
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

function telegramTopicTokenFromRow(row: TelegramDestinationRow): string | null {
  const chatId = row.chatId.trim()
  if (!chatId) return null
  const threadId = row.messageThreadId.trim()
  return threadId ? `${chatId}|${threadId}` : chatId
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

export function ManualAlertCreatorModal({ open, onOpenChange, onCreated, rule }: ManualAlertCreatorModalProps) {
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState(false)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const [pendingDuplicateName, setPendingDuplicateName] = useState("")
  const [appSearch, setAppSearch] = useState("")
  const [telegramRows, setTelegramRows] = useState<TelegramDestinationRow[]>([emptyTelegramRow()])
  const [slackRows, setSlackRows] = useState<SlackDestinationRow[]>([emptySlackRow()])
  const [emailRows, setEmailRows] = useState<EmailRecipientRow[]>([emptyEmailRow()])
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    metric: "",
    selectedApps: ["all"],
    alertName: "",
    conditionType: "threshold",
    operator: "less_than",
    thresholdValue: "",
    percentChange: "",
    consecutiveDays: "3",
    severity: "warning",
    channels: { inApp: true, telegram: false, slack: false, lark: false, email: false },
    frequency: "daily",
    autoResolve: true,
  })

  const { data: appsData, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: open, cacheKey: "manual_alert_create_apps" }
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

  const isAllApps = formData.selectedApps.includes("all")
  const isEdit = !!rule

  useEffect(() => {
    if (!open) return

    const parsedConfig = parseRuleConfig(rule?.ruleConfig || rule?.filterConditions)
    const notificationChannels = parseJsonArray(rule?.notificationChannels).map((item) => item.toUpperCase())

    setStep(1)
    setAppSearch("")
    setDuplicateConfirmOpen(false)
    setPendingDuplicateName("")
    setTelegramRows(rowsFromTelegramTopics(parseJsonArray(rule?.telegramTopics)))
    setSlackRows(rowsFromSlackChannels(parseJsonArray(rule?.slackChannels)))
    setEmailRows(rowsFromEmailRecipients(parseJsonArray(rule?.emailRecipients)))

    if (!rule) {
      setFormData({
        metric: "",
        selectedApps: ["all"],
        alertName: "",
        conditionType: "threshold",
        operator: "less_than",
        thresholdValue: "",
        percentChange: "",
        consecutiveDays: "3",
        severity: "warning",
        channels: { inApp: true, telegram: false, slack: false, lark: false, email: false },
        frequency: "daily",
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

    setFormData({
      metric: parsedConfig?.metricKey || "",
      selectedApps,
      alertName: rule.name || "",
      conditionType: parsedConfig?.conditionType || "threshold",
      operator: parsedConfig?.operator || "less_than",
      thresholdValue:
        parsedConfig?.thresholdValue != null
          ? String(parsedConfig.thresholdValue)
          : rule.thresholdValue != null
            ? String(rule.thresholdValue)
            : "",
      percentChange: parsedConfig?.percentChange != null ? String(parsedConfig.percentChange) : "",
      consecutiveDays: parsedConfig?.consecutiveDays != null ? String(parsedConfig.consecutiveDays) : "3",
      severity: toSeverityValue(rule.severity),
      channels: {
        inApp: notificationChannels.includes("IN_APP"),
        telegram: notificationChannels.includes("TELEGRAM"),
        slack: notificationChannels.includes("SLACK"),
        lark: notificationChannels.includes("LARK"),
        email: notificationChannels.includes("EMAIL"),
      },
      frequency: parsedConfig?.frequency || (rule.timeWindowHours === 24 ? "daily" : rule.timeWindowHours === 1 ? "hourly" : "realtime"),
      autoResolve: parsedConfig?.autoResolve ?? true,
    })
  }, [open, rule])

  const toggleSpecificApp = (appId: string, checked: boolean) => {
    setFormData((current) => {
      const withoutAll = current.selectedApps.filter((id) => id !== "all")
      if (checked) {
        return { ...current, selectedApps: Array.from(new Set([...withoutAll, appId])) }
      }
      return { ...current, selectedApps: withoutAll.filter((id) => id !== appId) }
    })
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
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
      const existingRules = await alertsApi.getAlertRules()
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
    const metricLabel = metrics.find((m) => m.value === formData.metric)?.label || "Metric"
    if (formData.conditionType === "threshold") {
      return `${metricLabel} ${formData.operator === "less_than" ? "<" : ">"} ${formData.thresholdValue || "?"}`
    }
    if (formData.conditionType === "percent_change") {
      return `${metricLabel} ${formData.operator === "less_than" ? "drops" : "increases"} ${formData.percentChange || "?"}%`
    }
    return `${metricLabel} below threshold for ${formData.consecutiveDays} days`
  }

  const buildRulePayload = (name: string) => {
    const channels = Object.entries(formData.channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => {
        if (channel === "inApp") return "IN_APP"
        return channel.toUpperCase()
      })
    const metricKey = toMetricKey(formData.metric)
    const telegramTopics = telegramRows
      .map((row) => telegramTopicTokenFromRow(row))
      .filter((value): value is string => !!value)
    const slackChannels = slackRows
      .map((row) => row.webhookUrl.trim())
      .filter((value) => value.length > 0)
    const emailRecipients = emailRows
      .map((row) => row.email.trim())
      .filter((value) => value.length > 0)

    const ruleConfig: AlertRuleConfigPayload = {
      version: 1,
      source: "manual",
      metricKey,
      metricUnit: toMetricUnit(metricKey),
      conditionType: formData.conditionType,
      operator: formData.operator,
      thresholdValue: formData.thresholdValue ? Number(formData.thresholdValue) : null,
      percentChange: formData.percentChange ? Number(formData.percentChange) : null,
      consecutiveDays: formData.consecutiveDays ? Number(formData.consecutiveDays) : null,
      frequency: formData.frequency,
      autoResolve: formData.autoResolve,
      scope: {
        allApps: isAllApps,
        appIds: isAllApps ? [] : formData.selectedApps,
      },
    }

    const ruleExpression =
      formData.conditionType === "threshold"
        ? `${formData.metric} ${formData.operator === "less_than" ? "<" : ">"} ${formData.thresholdValue || "0"}`
        : formData.conditionType === "percent_change"
          ? `${formData.metric} ${formData.operator === "less_than" ? "drop" : "increase"} ${formData.percentChange || "0"}%`
          : `${formData.metric} consecutive ${formData.consecutiveDays} days`

    return {
      name,
      description: rule?.description || "Created from manual alert wizard",
      ruleType: rule?.ruleType?.trim() || "MANUAL",
      severity: formData.severity.toUpperCase(),
      ruleExpression,
      thresholdValue: formData.conditionType === "threshold" ? Number(formData.thresholdValue || 0) : null,
      timeWindowHours: formData.frequency === "daily" ? 24 : 1,
      comparisonPeriodHours: formData.conditionType === "percent_change" ? 24 : null,
      filterConditions: JSON.stringify(ruleConfig),
      configVersion: rule?.configVersion ?? 1,
      ruleConfig: JSON.stringify(ruleConfig),
      messageTemplate: `${name} triggered`,
      isEnabled: rule?.isEnabled ?? true,
      cooldownMinutes: rule?.cooldownMinutes ?? 60,
      notificationChannels: JSON.stringify(channels.length > 0 ? channels : ["IN_APP"]),
      telegramTopics: JSON.stringify(formData.channels.telegram ? telegramTopics : []),
      emailRecipients: JSON.stringify(formData.channels.email ? emailRecipients : []),
      slackChannels: JSON.stringify(formData.channels.slack ? slackChannels : []),
      priority: formData.severity === "critical" ? 10 : formData.severity === "warning" ? 5 : 1,
    }
  }

  const handleTestRule = async () => {
    const name = (formData.alertName || generateAlertName()).trim() || "Manual Alert Test"
    try {
      setTesting(true)
      const payload = buildRulePayload(name)
      const result = await alertsApi.testAlertRule(payload)
      if (result.triggered) {
        const previewApps = result.matches
          .map((match) => match.appId)
          .filter((value): value is string => !!value)
          .slice(0, 3)
        toast({
          title: "Rule matched current data",
          description:
            previewApps.length > 0
              ? `${result.matchCount} match(es). Apps: ${previewApps.join(", ")}${result.matchCount > previewApps.length ? "..." : ""}`
              : `${result.matchCount} match(es) found.`,
        })
      } else {
        toast({
          title: "No current matches",
          description: "This rule does not match any current data right now.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Unable to test rule",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const updateTelegramRow = (id: string, patch: Partial<TelegramDestinationRow>) => {
    setTelegramRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const updateSlackRow = (id: string, patch: Partial<SlackDestinationRow>) => {
    setSlackRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const updateEmailRow = (id: string, patch: Partial<EmailRecipientRow>) => {
    setEmailRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const removeTelegramRow = (id: string) => {
    setTelegramRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptyTelegramRow()]))
  }

  const removeSlackRow = (id: string) => {
    setSlackRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptySlackRow()]))
  }

  const removeEmailRow = (id: string) => {
    setEmailRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : [emptyEmailRow()]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80vh] w-[90vw] max-w-[90vw] md:h-[80vh] md:w-[60vw] md:!max-w-[60vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEdit ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
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
                {s === 1 ? "What to Monitor" : s === 2 ? "Condition" : "Notifications"}
              </span>
              {s < 3 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          ))}
        </div>

        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Alert Preview</h3>
            <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-medium break-words">{formData.alertName || generateAlertName() || "-"}</p>
              </div>
              <div>
                <span className="text-slate-500">Metric:</span>
                <p className="font-medium">{metrics.find((m) => m.value === formData.metric)?.label || "-"}</p>
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
            </div>

            <Button variant="outline" className="w-full mt-4 gap-2 bg-white" type="button" onClick={() => void handleTestRule()} disabled={testing}>
              <Zap className="w-4 h-4" />
              {testing ? "Testing..." : "Test Rule"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Select Metric *</Label>
                  <Select value={formData.metric} onValueChange={(v) => setFormData({ ...formData, metric: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a metric to monitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select App(s) *</Label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 border-slate-200">
                      <Checkbox
                        checked={isAllApps}
                        onCheckedChange={(checked) => {
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
                </div>

                <div className="space-y-2">
                  <Label>Alert Name</Label>
                  <Input
                    placeholder="Auto-generated or enter custom name"
                    value={formData.alertName || generateAlertName()}
                    onChange={(e) => setFormData({ ...formData, alertName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Condition Type *</Label>
                  <RadioGroup
                    value={formData.conditionType}
                    onValueChange={(v) => setFormData({ ...formData, conditionType: v })}
                    className="grid grid-cols-1 gap-3"
                  >
                    {conditionTypes.map((ct) => (
                      <label
                        key={ct.value}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                          formData.conditionType === ct.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
                        }`}
                      >
                        <RadioGroupItem value={ct.value} />
                        <div>
                          <p className="font-medium text-slate-900">{ct.label}</p>
                          <p className="text-sm text-slate-500">{ct.description}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {formData.conditionType === "threshold" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select value={formData.operator} onValueChange={(v) => setFormData({ ...formData, operator: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="less_than">Less than (&lt;)</SelectItem>
                          <SelectItem value="greater_than">Greater than (&gt;)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5.00"
                        value={formData.thresholdValue}
                        onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.conditionType === "percent_change" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Change Direction</Label>
                      <Select value={formData.operator} onValueChange={(v) => setFormData({ ...formData, operator: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="less_than">Decreases by</SelectItem>
                          <SelectItem value="greater_than">Increases by</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Percentage (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 20"
                        value={formData.percentChange}
                        onChange={(e) => setFormData({ ...formData, percentChange: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {formData.conditionType === "consecutive" && (
                  <div className="space-y-2">
                    <Label>Consecutive Days</Label>
                    <Select
                      value={formData.consecutiveDays}
                      onValueChange={(v) => setFormData({ ...formData, consecutiveDays: v })}
                    >
                      <SelectTrigger className="w-32">
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">In-app Notification</span>
                      <Switch
                        checked={formData.channels.inApp}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, inApp: c } })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Telegram</span>
                      <Switch
                        checked={formData.channels.telegram}
                        onCheckedChange={(c) =>
                          setFormData({ ...formData, channels: { ...formData.channels, telegram: c } })
                        }
                      />
                    </div>
                    {formData.channels.telegram && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
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
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm">Slack</span>
                      <Switch
                        checked={formData.channels.slack}
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, slack: c } })}
                      />
                    </div>
                    {formData.channels.slack && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">Slack webhook URLs</p>
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
                        onCheckedChange={(c) => setFormData({ ...formData, channels: { ...formData.channels, email: c } })}
                      />
                    </div>
                    {formData.channels.email && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
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
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evaluation Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily (after pipeline)</SelectItem>
                    </SelectContent>
                  </Select>
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
          </div>

        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-6">
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
            {step < 3 ? (
              <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700" disabled={creating}>
                <Check className="w-4 h-4 mr-1" />
                {creating ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Alert" : "Create Alert"}
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

