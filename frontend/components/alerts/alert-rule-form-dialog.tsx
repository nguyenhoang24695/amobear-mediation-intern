"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Send, Trash2 } from "lucide-react"
import type { AlertRule, UpsertAlertRuleRequest } from "@/types/api"
import { alertsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

interface AlertRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: AlertRule | null
  saving?: boolean
  onSubmit: (payload: UpsertAlertRuleRequest) => Promise<void>
}

const severityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

function parseJsonArray(input?: string | null): string[] {
  if (!input) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function splitCsv(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

type TelegramDestinationRow = {
  id: string
  chatId: string
  messageThreadId: string
  status: "idle" | "checking" | "valid" | "invalid"
  resolvedTitle?: string | null
  resolvedType?: string | null
  /** Tên forum topic từ getForumTopic */
  resolvedThreadTitle?: string | null
  errorMessage?: string | null
}

type SlackDestinationRow = {
  id: string
  webhookUrl: string
}

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `tg_${Math.random().toString(16).slice(2)}`
}

function emptyTelegramRow(): TelegramDestinationRow {
  return {
    id: newRowId(),
    chatId: "",
    messageThreadId: "",
    status: "idle",
  }
}

function telegramTopicTokenFromRow(row: TelegramDestinationRow): string | null {
  const chatId = row.chatId.trim()
  if (!chatId) return null
  const threadRaw = row.messageThreadId.trim()
  if (!threadRaw) return chatId
  return `${chatId}|${threadRaw}`
}

function rowsFromTelegramTopics(topics: string[]): TelegramDestinationRow[] {
  if (topics.length === 0) {
    return [emptyTelegramRow()]
  }

  return topics.map((topic) => {
    const trimmed = topic.trim()
    if (!trimmed) {
      return emptyTelegramRow()
    }

    const pipeIdx = trimmed.indexOf("|")
    if (pipeIdx === -1) {
      return {
        id: newRowId(),
        chatId: trimmed,
        messageThreadId: "",
        status: "idle" as const,
      }
    }

    const chatId = trimmed.slice(0, pipeIdx).trim()
    const thread = trimmed.slice(pipeIdx + 1).trim()
    return {
      id: newRowId(),
      chatId,
      messageThreadId: thread,
      status: "idle" as const,
    }
  })
}

function emptySlackRow(): SlackDestinationRow {
  return {
    id: `sl_${newRowId()}`,
    webhookUrl: "",
  }
}

function rowsFromSlackChannels(channels: string[]): SlackDestinationRow[] {
  if (channels.length === 0) return [emptySlackRow()]
  return channels.map((channel) => {
    const trimmed = channel.trim()
    return {
      id: `sl_${newRowId()}`,
      webhookUrl: trimmed,
    }
  })
}

export function AlertRuleFormDialog({
  open,
  onOpenChange,
  rule,
  saving = false,
  onSubmit,
}: AlertRuleFormDialogProps) {
  const isEdit = !!rule

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ruleType, setRuleType] = useState("")
  const [severity, setSeverity] = useState("MEDIUM")
  const [ruleExpression, setRuleExpression] = useState("")
  const [thresholdValue, setThresholdValue] = useState("")
  const [timeWindowHours, setTimeWindowHours] = useState("24")
  const [comparisonPeriodHours, setComparisonPeriodHours] = useState("")
  const [filterConditions, setFilterConditions] = useState("")
  const [messageTemplate, setMessageTemplate] = useState("")
  const [isEnabled, setIsEnabled] = useState(true)
  const [cooldownMinutes, setCooldownMinutes] = useState("60")
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["TELEGRAM"])
  const [telegramRows, setTelegramRows] = useState<TelegramDestinationRow[]>([emptyTelegramRow()])
  const [emailRecipientsCsv, setEmailRecipientsCsv] = useState("")
  const [slackRows, setSlackRows] = useState<SlackDestinationRow[]>([emptySlackRow()])
  const [priority, setPriority] = useState("50")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [telegramTestRowId, setTelegramTestRowId] = useState<string | null>(null)
  const [slackTestRowId, setSlackTestRowId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    setTelegramTestRowId(null)
    setSlackTestRowId(null)
    if (rule) {
      setName(rule.name ?? "")
      setDescription(rule.description ?? "")
      setRuleType(rule.ruleType ?? "")
      setSeverity(rule.severity ?? "MEDIUM")
      setRuleExpression(rule.ruleExpression ?? "")
      setThresholdValue(rule.thresholdValue != null ? String(rule.thresholdValue) : "")
      setTimeWindowHours(String(rule.timeWindowHours ?? 24))
      setComparisonPeriodHours(rule.comparisonPeriodHours != null ? String(rule.comparisonPeriodHours) : "")
      setFilterConditions(rule.filterConditions ?? "")
      setMessageTemplate(rule.messageTemplate ?? "")
      setIsEnabled(!!rule.isEnabled)
      setCooldownMinutes(String(rule.cooldownMinutes ?? 60))
      const normalizedChannels = parseJsonArray(rule.notificationChannels).map((item) => item.toUpperCase())
      setSelectedChannels(normalizedChannels.length > 0 ? normalizedChannels : ["TELEGRAM"])
      setTelegramRows(rowsFromTelegramTopics(parseJsonArray(rule.telegramTopics)))
      setEmailRecipientsCsv(parseJsonArray(rule.emailRecipients).join(", "))
      setSlackRows(rowsFromSlackChannels(parseJsonArray(rule.slackChannels)))
      setPriority(String(rule.priority ?? 50))
    } else {
      setName("")
      setDescription("")
      setRuleType("")
      setSeverity("MEDIUM")
      setRuleExpression("")
      setThresholdValue("")
      setTimeWindowHours("24")
      setComparisonPeriodHours("")
      setFilterConditions("")
      setMessageTemplate("")
      setIsEnabled(true)
      setCooldownMinutes("60")
      setSelectedChannels(["TELEGRAM"])
      setTelegramRows([emptyTelegramRow()])
      setEmailRecipientsCsv("")
      setSlackRows([emptySlackRow()])
      setPriority("50")
    }
    setErrors({})
  }, [open, rule])

  const normalizedChannels = useMemo(
    () => selectedChannels.map((item) => item.toUpperCase()),
    [selectedChannels],
  )
  const isTelegramEnabled = normalizedChannels.includes("TELEGRAM")
  const isEmailEnabled = normalizedChannels.includes("EMAIL")
  const isSlackEnabled = normalizedChannels.includes("SLACK")

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = "Name là bắt buộc."
    if (!ruleType.trim()) nextErrors.ruleType = "Rule type là bắt buộc."
    if (!severity.trim()) nextErrors.severity = "Severity là bắt buộc."
    if (!ruleExpression.trim()) nextErrors.ruleExpression = "Rule expression là bắt buộc."
    if (!messageTemplate.trim()) nextErrors.messageTemplate = "Message template là bắt buộc."
    if (normalizedChannels.length === 0) nextErrors.notificationChannels = "Chọn ít nhất 1 channel."
    if (!timeWindowHours || Number.isNaN(Number(timeWindowHours)) || Number(timeWindowHours) <= 0) {
      nextErrors.timeWindowHours = "Time window phải > 0."
    }
    if (!cooldownMinutes || Number.isNaN(Number(cooldownMinutes)) || Number(cooldownMinutes) < 0) {
      nextErrors.cooldownMinutes = "Cooldown phải >= 0."
    }
    if (!priority || Number.isNaN(Number(priority)) || Number(priority) < 1 || Number(priority) > 100) {
      nextErrors.priority = "Priority phải trong khoảng 1-100."
    }

    if (isTelegramEnabled) {
      const tokens = telegramRows.map((row) => telegramTopicTokenFromRow(row)).filter((t): t is string => !!t)
      if (tokens.length === 0) {
        nextErrors.telegramTopics = "Thêm ít nhất 1 Telegram destination (chat_id)."
      }

      telegramRows.forEach((row, idx) => {
        const chatId = row.chatId.trim()
        const threadRaw = row.messageThreadId.trim()
        if (!chatId && !threadRaw) return
        if (!chatId && threadRaw) {
          nextErrors[`telegramRows.${idx}.chatId`] = "chat_id là bắt buộc khi có messageThreadId."
        }
        if (threadRaw) {
          if (Number.isNaN(Number(threadRaw)) || !Number.isFinite(Number(threadRaw)) || Number(threadRaw) <= 0) {
            nextErrors[`telegramRows.${idx}.messageThreadId`] = "messageThreadId phải là số > 0."
          }
        }
      })
    }

    if (isSlackEnabled) {
      const webhooks = slackRows.map((row) => row.webhookUrl.trim()).filter((item) => item.length > 0)
      if (webhooks.length === 0) {
        nextErrors.slackChannels = "Thêm ít nhất 1 Slack webhook URL."
      }

      slackRows.forEach((row, idx) => {
        const value = row.webhookUrl.trim()
        if (!value) return
        try {
          const url = new URL(value)
          if (!["http:", "https:"].includes(url.protocol)) {
            nextErrors[`slackRows.${idx}.webhookUrl`] = "Webhook URL phải bắt đầu bằng http/https."
          }
        } catch {
          nextErrors[`slackRows.${idx}.webhookUrl`] = "Webhook URL không hợp lệ."
        }
      })
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((item) => item !== channel)
        : [...prev, channel],
    )
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload: UpsertAlertRuleRequest = {
      name: name.trim(),
      description: description.trim() || null,
      ruleType: ruleType.trim(),
      severity: severity.trim(),
      ruleExpression: ruleExpression.trim(),
      thresholdValue: thresholdValue.trim() === "" ? null : Number(thresholdValue),
      timeWindowHours: Number(timeWindowHours),
      comparisonPeriodHours: comparisonPeriodHours.trim() === "" ? null : Number(comparisonPeriodHours),
      filterConditions: filterConditions.trim() || null,
      messageTemplate: messageTemplate.trim(),
      isEnabled,
      cooldownMinutes: Number(cooldownMinutes),
      notificationChannels: JSON.stringify(normalizedChannels),
      telegramTopics: JSON.stringify(
        isTelegramEnabled
          ? telegramRows.map((row) => telegramTopicTokenFromRow(row)).filter((t): t is string => !!t)
          : [],
      ),
      emailRecipients: JSON.stringify(isEmailEnabled ? splitCsv(emailRecipientsCsv) : []),
      slackChannels: JSON.stringify(
        isSlackEnabled
          ? slackRows.map((row) => row.webhookUrl.trim()).filter((item) => item.length > 0)
          : [],
      ),
      priority: Number(priority),
    }
    await onSubmit(payload)
  }

  const updateTelegramRow = (id: string, patch: Partial<TelegramDestinationRow>) => {
    setTelegramRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (
        idx >= 0 &&
        (patch.chatId !== undefined || patch.messageThreadId !== undefined)
      ) {
        setErrors((ePrev) => {
          const next = { ...ePrev }
          delete next[`telegramRows.${idx}.chatId`]
          delete next[`telegramRows.${idx}.messageThreadId`]
          return next
        })
      }

      return prev.map((row) => {
        if (row.id !== id) return row
        const next: TelegramDestinationRow = { ...row, ...patch }

        // Nếu user sửa input (không phải flow verify), reset kết quả cũ.
        const isUserInputChange =
          patch.chatId !== undefined || patch.messageThreadId !== undefined
        if (isUserInputChange && patch.status === undefined) {
          next.status = "idle"
          next.resolvedTitle = null
          next.resolvedType = null
          next.resolvedThreadTitle = null
          next.errorMessage = null
        }

        return next
      })
    })
  }

  const updateSlackRow = (id: string, patch: Partial<SlackDestinationRow>) => {
    setSlackRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx >= 0 && patch.webhookUrl !== undefined) {
        setErrors((ePrev) => {
          const next = { ...ePrev }
          delete next[`slackRows.${idx}.webhookUrl`]
          return next
        })
      }
      return prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    })
  }

  const telegramRowsRef = useRef(telegramRows)
  telegramRowsRef.current = telegramRows

  const verifyTelegramRowById = useCallback(async (rowId: string) => {
    const row = telegramRowsRef.current.find((r) => r.id === rowId)
    if (!row || !row.chatId.trim()) return

    const rowIndex = telegramRowsRef.current.findIndex((r) => r.id === rowId)

    let messageThreadId: number | undefined
    const threadRaw = row.messageThreadId.trim()
    if (threadRaw) {
      const n = Number(threadRaw)
      if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) {
        if (rowIndex >= 0) {
          setErrors((prev) => ({
            ...prev,
            [`telegramRows.${rowIndex}.messageThreadId`]: "messageThreadId phải là số > 0.",
          }))
        }
        return
      }
      messageThreadId = n
    }

    updateTelegramRow(rowId, {
      status: "checking",
      resolvedTitle: null,
      resolvedType: null,
      resolvedThreadTitle: null,
      errorMessage: null,
    })
    try {
      const result = await alertsApi.validateTelegramChat({
        chatId: row.chatId.trim(),
        messageThreadId,
      })
      if (result.isValid) {
        updateTelegramRow(rowId, {
          status: "valid",
          resolvedTitle: result.chatTitle ?? null,
          resolvedType: result.chatType ?? null,
          resolvedThreadTitle: result.threadTitle?.trim() ? result.threadTitle.trim() : null,
          errorMessage: null,
        })
      } else {
        updateTelegramRow(rowId, {
          status: "invalid",
          resolvedTitle: null,
          resolvedType: null,
          resolvedThreadTitle: null,
          errorMessage: result.errorMessage?.trim() || "Chat not found",
        })
      }
    } catch {
      updateTelegramRow(rowId, {
        status: "invalid",
        resolvedTitle: null,
        resolvedType: null,
        resolvedThreadTitle: null,
        errorMessage: "Chat not found",
      })
    }
  }, [])

  const telegramAutoCheckKey = useMemo(() => {
    if (!isTelegramEnabled) return ""
    return telegramRows
      .map((r) => [r.id, r.chatId, r.messageThreadId].join(":"))
      .join("|")
  }, [isTelegramEnabled, telegramRows])

  useEffect(() => {
    if (!open || !isTelegramEnabled) return
    const t = window.setTimeout(() => {
      const rows = telegramRowsRef.current
      for (const r of rows) {
        if (!r.chatId.trim()) continue
        const tr = r.messageThreadId.trim()
        if (tr && (Number.isNaN(Number(tr)) || !Number.isFinite(Number(tr)) || Number(tr) <= 0)) continue
        void verifyTelegramRowById(r.id)
      }
    }, 450)
    return () => window.clearTimeout(t)
  }, [open, isTelegramEnabled, telegramAutoCheckKey, verifyTelegramRowById])

  const sendTelegramTestForRow = useCallback(
    async (rowId: string) => {
      const row = telegramRowsRef.current.find((r) => r.id === rowId)
      if (!row || !row.chatId.trim()) return

      const threadRaw = row.messageThreadId.trim()
      let messageThreadId: number | undefined
      if (threadRaw) {
        const n = Number(threadRaw)
        if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) {
          toast({
            title: "Lỗi",
            description: "messageThreadId phải là số > 0.",
            variant: "destructive",
          })
          return
        }
        messageThreadId = n
      }

      setTelegramTestRowId(rowId)
      try {
        await alertsApi.sendTelegramTest({
          chatId: row.chatId.trim(),
          messageThreadId,
        })
        toast({ title: "Đã gửi", description: "Kiểm tra Telegram để xem tin test." })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không gửi được tin test."
        toast({ title: "Lỗi", description: msg, variant: "destructive" })
      } finally {
        setTelegramTestRowId(null)
      }
    },
    [toast],
  )

  const sendSlackTestForRow = useCallback(
    async (rowId: string) => {
      const row = slackRows.find((r) => r.id === rowId)
      if (!row) return

      const webhookUrl = row.webhookUrl.trim()
      if (!webhookUrl) {
        toast({ title: "Lỗi", description: "Vui lòng nhập Slack webhook URL.", variant: "destructive" })
        return
      }

      try {
        const parsed = new URL(webhookUrl)
        if (!["http:", "https:"].includes(parsed.protocol)) {
          toast({ title: "Lỗi", description: "Webhook URL phải bắt đầu bằng http/https.", variant: "destructive" })
          return
        }
      } catch {
        toast({ title: "Lỗi", description: "Webhook URL không hợp lệ.", variant: "destructive" })
        return
      }

      setSlackTestRowId(rowId)
      try {
        await alertsApi.sendSlackTest({ webhookUrl })
        toast({ title: "Đã gửi", description: "Kiểm tra Slack destination để xem tin test." })
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không gửi được tin test Slack."
        toast({ title: "Lỗi", description: msg, variant: "destructive" })
      } finally {
        setSlackTestRowId(null)
      }
    },
    [slackRows, toast],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
          <DialogDescription>
            Cấu hình đầy đủ metadata, rule condition và notification cho alert rule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="REV-001" />
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Rule Type *</Label>
              <Input value={ruleType} onChange={(e) => setRuleType(e.target.value)} placeholder="REVENUE_DROP" />
              {errors.ruleType ? <p className="text-xs text-red-600">{errors.ruleType}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority (1-100)</Label>
              <Input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" min={1} max={100} />
              {errors.priority ? <p className="text-xs text-red-600">{errors.priority}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Enabled</Label>
              <div className="flex h-10 items-center">
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rule Expression *</Label>
            <Textarea value={ruleExpression} onChange={(e) => setRuleExpression(e.target.value)} rows={2} />
            {errors.ruleExpression ? <p className="text-xs text-red-600">{errors.ruleExpression}</p> : null}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Threshold Value</Label>
              <Input value={thresholdValue} onChange={(e) => setThresholdValue(e.target.value)} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Time Window (hours) *</Label>
              <Input value={timeWindowHours} onChange={(e) => setTimeWindowHours(e.target.value)} type="number" min={1} />
              {errors.timeWindowHours ? <p className="text-xs text-red-600">{errors.timeWindowHours}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Comparison Period (hours)</Label>
              <Input value={comparisonPeriodHours} onChange={(e) => setComparisonPeriodHours(e.target.value)} type="number" min={1} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Filter Conditions (JSON/string)</Label>
            <Textarea value={filterConditions} onChange={(e) => setFilterConditions(e.target.value)} rows={2} placeholder='{"publisher_id":"pub-xxx"}' />
          </div>

          <div className="space-y-2">
            <Label>Message Template *</Label>
            <Textarea value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} rows={2} />
            {errors.messageTemplate ? <p className="text-xs text-red-600">{errors.messageTemplate}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Cooldown (minutes)</Label>
            <Input value={cooldownMinutes} onChange={(e) => setCooldownMinutes(e.target.value)} type="number" min={0} />
            {errors.cooldownMinutes ? <p className="text-xs text-red-600">{errors.cooldownMinutes}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Notification Channels</Label>
            {errors.notificationChannels ? <p className="text-xs text-red-600">{errors.notificationChannels}</p> : null}
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedChannels.includes("TELEGRAM")}
                    onCheckedChange={() => toggleChannel("TELEGRAM")}
                  />
                  <span className="text-sm font-medium text-slate-800">TELEGRAM</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs text-slate-600">Telegram destinations</Label>
                  {errors.telegramTopics ? <p className="text-xs text-red-600">{errors.telegramTopics}</p> : null}

                  <div className="space-y-2">
                    {telegramRows.map((row, idx) => {
                      const chatErr = errors[`telegramRows.${idx}.chatId`]
                      const threadErr = errors[`telegramRows.${idx}.messageThreadId`]
                      return (
                        <div key={row.id} className="rounded-md border bg-white p-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                            <div className="space-y-1 sm:col-span-5">
                              <Label className="text-[11px] text-slate-600">chat_id *</Label>
                              <Input
                                value={row.chatId}
                                onChange={(e) => updateTelegramRow(row.id, { chatId: e.target.value })}
                                placeholder="-1001234567890 hoặc @channelusername"
                                disabled={!isTelegramEnabled}
                              />
                              {chatErr ? <p className="text-xs text-red-600">{chatErr}</p> : null}
                            </div>

                            <div className="space-y-1 sm:col-span-4">
                              <Label className="text-[11px] text-slate-600">messageThreadId (tùy chọn)</Label>
                              <Input
                                value={row.messageThreadId}
                                onChange={(e) => updateTelegramRow(row.id, { messageThreadId: e.target.value })}
                                placeholder="Forum thread id"
                                disabled={!isTelegramEnabled}
                                inputMode="numeric"
                              />
                              {threadErr ? <p className="text-xs text-red-600">{threadErr}</p> : null}
                            </div>

                            <div className="flex gap-2 sm:col-span-3 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex items-center gap-1.5 bg-transparent"
                                disabled={
                                  !isTelegramEnabled ||
                                  saving ||
                                  telegramTestRowId === row.id ||
                                  !row.chatId.trim()
                                }
                                onClick={() => void sendTelegramTestForRow(row.id)}
                                title="Gửi tin test qua Telegram"
                              >
                                {telegramTestRowId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Test</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                disabled={!isTelegramEnabled || saving || telegramRows.length <= 1}
                                onClick={() => setTelegramRows((prev) => prev.filter((r) => r.id !== row.id))}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 text-xs">
                            {row.status === "checking" ? (
                              <p className="flex items-center gap-1.5 text-slate-600">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Đang kiểm tra chat…
                              </p>
                            ) : null}
                            {row.status === "valid" ? (
                              <p className="text-green-700">
                                {row.resolvedTitle ? <span className="font-medium">{row.resolvedTitle}</span> : <span className="font-medium">OK</span>}
                                {row.resolvedType ? <span className="text-slate-600"> ({row.resolvedType})</span> : null}
                                {row.messageThreadId.trim() ? (
                                  <span className="text-slate-600">
                                    {" "}
                                    •{" "}
                                    {row.resolvedThreadTitle ? (
                                      <span className="font-medium text-green-800">{row.resolvedThreadTitle}</span>
                                    ) : (
                                      <span className="text-slate-500">Không lấy được tên topic (getForumTopic)</span>
                                    )}
                                  </span>
                                ) : null}
                              </p>
                            ) : null}
                            {row.status === "invalid" ? (
                              <p className="text-red-600">{row.errorMessage ?? "Chat not found"}</p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      disabled={!isTelegramEnabled || saving}
                      onClick={() => setTelegramRows((prev) => [...prev, emptyTelegramRow()])}
                    >
                      Add destination
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedChannels.includes("EMAIL")}
                    onCheckedChange={() => toggleChannel("EMAIL")}
                  />
                  <span className="text-sm font-medium text-slate-800">EMAIL</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs text-slate-600">Email Recipients</Label>
                  <Input
                    value={emailRecipientsCsv}
                    onChange={(e) => setEmailRecipientsCsv(e.target.value)}
                    placeholder="admin@example.com,ops@example.com"
                    disabled={!isEmailEnabled}
                  />
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedChannels.includes("SLACK")}
                    onCheckedChange={() => toggleChannel("SLACK")}
                  />
                  <span className="text-sm font-medium text-slate-800">SLACK</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs text-slate-600">Slack Webhook URLs</Label>
                  {errors.slackChannels ? <p className="text-xs text-red-600">{errors.slackChannels}</p> : null}

                  <div className="space-y-2">
                    {slackRows.map((row, idx) => {
                      const webhookErr = errors[`slackRows.${idx}.webhookUrl`]
                      return (
                        <div key={row.id} className="rounded-md border bg-white p-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                            <div className="space-y-1 sm:col-span-8">
                              <Label className="text-[11px] text-slate-600">webhookUrl *</Label>
                              <Input
                                value={row.webhookUrl}
                                onChange={(e) => updateSlackRow(row.id, { webhookUrl: e.target.value })}
                                placeholder="https://hooks.slack.com/services/..."
                                disabled={!isSlackEnabled}
                              />
                              {webhookErr ? <p className="text-xs text-red-600">{webhookErr}</p> : null}
                            </div>

                            <div className="flex gap-2 sm:col-span-4 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex items-center gap-1.5 bg-transparent"
                                disabled={!isSlackEnabled || saving || slackTestRowId === row.id || !row.webhookUrl.trim()}
                                onClick={() => void sendSlackTestForRow(row.id)}
                                title="Gửi tin test qua Slack"
                              >
                                {slackTestRowId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Test</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                disabled={!isSlackEnabled || saving || slackRows.length <= 1}
                                onClick={() => setSlackRows((prev) => prev.filter((r) => r.id !== row.id))}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      disabled={!isSlackEnabled || saving}
                      onClick={() => setSlackRows((prev) => [...prev, emptySlackRow()])}
                    >
                      Add Slack destination
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

