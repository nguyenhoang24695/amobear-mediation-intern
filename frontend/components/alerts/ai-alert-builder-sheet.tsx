"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, User, Sparkles, Check, Edit2 } from "lucide-react"
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
import type { AlertRuleConfigPayload } from "@/types/api"

interface AIAlertBuilderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  ruleVisibility?: "ORG" | "PRIVATE"
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  alertPreview?: AlertPreview
  suggestions?: string[]
}

interface AlertPreview {
  name: string
  metric: string
  apps: string[]
  condition: string
  severity: "critical" | "warning" | "info"
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Xin chao! Toi la AI Alert Assistant. Hay mo ta alert ban muon tao, vi du:\n\n- 'Alert khi eCPM giam duoi $5 cho Puzzle Blast'\n- 'Thong bao khi revenue giam hon 20% so voi tuan truoc'\n- 'Canh bao D1 retention duoi 35% trong 3 ngay lien tiep'",
    suggestions: [
      "Alert khi eCPM < $5 cho tat ca apps",
      "Revenue giam 20% vs 7d avg",
      "D1 Retention < 35% trong 3 ngay",
    ],
  },
]

export function AIAlertBuilderSheet({ open, onOpenChange, onCreated, ruleVisibility = "ORG" }: AIAlertBuilderSheetProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const [pendingPreview, setPendingPreview] = useState<AlertPreview | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: appsData } = useApi(() => structureApi.getApps(), {
    enabled: open,
    cacheKey: "ai_alert_builder_apps",
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Toi da hieu yeu cau cua ban. Day la alert toi de xuat:",
        alertPreview: {
          name: input.includes("eCPM") ? "eCPM < $5.00" : input.includes("revenue") ? "Revenue Drop > 20%" : "Custom Alert",
          metric: input.includes("eCPM") ? "eCPM" : input.includes("revenue") ? "Revenue" : "D1 Retention",
          apps: input.includes("Puzzle") ? ["Puzzle Blast"] : ["All Apps"],
          condition: input,
          severity: input.includes("critical") || input.includes("eCPM") ? "critical" : "warning",
        },
      }

      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
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

  const createRuleFromPreview = async (preview: AlertPreview, nameOverride?: string) => {
    try {
      setCreating(true)
      const finalName = (nameOverride || preview.name).trim()
      const availableApps = appsData?.apps ?? []
      const normalizeMetricKey = (value: string) => {
        const normalized = value.trim().toLowerCase()
        if (normalized.includes("fill")) return "fill_rate"
        if (normalized.includes("impression")) return "impressions"
        if (normalized.includes("ecpm")) return "ecpm"
        if (normalized.includes("profit") || normalized.includes("net profit") || normalized.includes("loi nhuan"))
          return "profit"
        if (normalized.includes("cost") || normalized.includes("spend") || normalized.includes("ua cost"))
          return "cost"
        return "revenue"
      }
      const parsePreviewConfig = (): AlertRuleConfigPayload => {
        const metricKey = normalizeMetricKey(preview.metric)
        const rawCondition = preview.condition.toLowerCase()
        const matchedAppIds = preview.apps
          .map((label) => {
            const target = label.trim().toLowerCase()
            const matched = availableApps.find((app) => {
              const appName = (app.displayName || app.name || app.appId).trim().toLowerCase()
              return appName === target || app.appId.trim().toLowerCase() === target
            })
            return matched?.appId ?? null
          })
          .filter((value): value is string => value != null)

        const numberMatch = rawCondition.match(/(\d+(?:\.\d+)?)/)
        const numericValue = numberMatch ? Number(numberMatch[1]) : null
        const isPercentChange = rawCondition.includes("%") || rawCondition.includes("drop") || rawCondition.includes("increase")
        const operator = rawCondition.includes(">") || rawCondition.includes("increase") ? "greater_than" : "less_than"
        const metricUnit =
          metricKey === "revenue" || metricKey === "ecpm" || metricKey === "cost" || metricKey === "profit"
            ? "usd"
            : metricKey === "fill_rate"
              ? "percent"
              : "count"
        const conditionType = isPercentChange ? "percent_change" : "threshold"
        const thresholdValue = !isPercentChange ? numericValue : null
        const percentChange = isPercentChange ? numericValue : null

        return {
          version: 2,
          source: "ai",
          conditionLogic: "all",
          conditions: [
            {
              id: "c0",
              metricKey,
              metricUnit,
              conditionType,
              operator,
              thresholdValue,
              percentChange,
              consecutiveDays: null,
            },
          ],
          metricKey,
          metricUnit,
          conditionType,
          operator,
          thresholdValue,
          percentChange,
          frequency: "daily",
          evaluationCooldownMinutes: null,
          dailyEvaluationHourUtc: null,
          autoResolve: true,
          prompt: preview.condition,
          scope: {
            allApps: preview.apps.some((item) => item.toLowerCase() === "all apps") || matchedAppIds.length === 0,
            appIds: matchedAppIds,
          },
        }
      }
      const ruleConfig = parsePreviewConfig()
      await alertsApi.createAlertRule({
        visibility: ruleVisibility === "PRIVATE" ? "PRIVATE" : "ORG",
        name: finalName,
        description: "Created from AI alert builder",
        ruleType: "AI_BUILDER",
        severity: preview.severity.toUpperCase(),
        ruleExpression: preview.condition,
        thresholdValue: null,
        timeWindowHours: 1,
        comparisonPeriodHours: 24,
        filterConditions: JSON.stringify(ruleConfig),
        configVersion: 1,
        ruleConfig: JSON.stringify(ruleConfig),
        messageTemplate: `${finalName} triggered`,
        isEnabled: true,
        cooldownMinutes: 60,
        notificationChannels: JSON.stringify(["IN_APP"]),
        telegramTopics: null,
        emailRecipients: null,
        slackChannels: null,
        priority: preview.severity === "critical" ? 10 : preview.severity === "warning" ? 5 : 1,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Alert "${finalName}" da duoc tao thanh cong! Ban co the xem va quan ly alert nay trong trang My Alerts.`,
        },
      ])
      toast({ title: "Đã tạo alert rule từ AI" })
      onCreated?.()
    } catch (error: any) {
      toast({
        title: "Không thể tạo alert từ AI",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCreateAlert = async (preview: AlertPreview) => {
    try {
      const existingRules = await alertsApi.getAlertRules(undefined, ruleVisibility === "PRIVATE" ? "PRIVATE" : "ORG")
      const isDuplicate = existingRules.some((rule) => rule.name.trim().toLowerCase() === preview.name.trim().toLowerCase())
      if (isDuplicate) {
        setPendingPreview(preview)
        setDuplicateConfirmOpen(true)
        return
      }
      await createRuleFromPreview(preview)
    } catch (error: any) {
      toast({
        title: "Không thể kiểm tra tên trùng",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleConfirmCreateWithTimestamp = async () => {
    if (!pendingPreview) return
    const finalName = `${pendingPreview.name}_${formatTimestampYmdHisSSS(new Date())}`
    setDuplicateConfirmOpen(false)
    const preview = pendingPreview
    setPendingPreview(null)
    await createRuleFromPreview(preview, finalName)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-slate-200">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Alert Builder
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                )}

                <div className={`max-w-[85%] ${message.role === "user" ? "order-first" : ""}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>

                  {message.alertPreview && (
                    <Card className="mt-3 border-amber-300 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-slate-900">{message.alertPreview.name}</h4>
                          <Badge
                            className={
                              message.alertPreview.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : message.alertPreview.severity === "warning"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                            }
                          >
                            {message.alertPreview.severity}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Metric:</span>
                            <span className="font-medium">{message.alertPreview.metric}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Apps:</span>
                            <div className="flex gap-1">
                              {message.alertPreview.apps.map((app) => (
                                <Badge key={app} variant="secondary" className="text-xs">
                                  {app}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Condition:</span>
                            <p className="text-slate-700 mt-1">{message.alertPreview.condition}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleCreateAlert(message.alertPreview!)}
                            disabled={creating}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {creating ? "Creating..." : "Create Alert"}
                          </Button>
                          <Button size="sm" variant="outline" className="bg-white">
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {message.suggestions && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-sm p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mo ta alert ban muon tao..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-slate-500 mt-2 text-center">Tip: Mo ta bang tieng Viet hoac tieng Anh deu duoc</p>
        </div>
      </SheetContent>
      <AlertDialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tên Alert đã tồn tại</AlertDialogTitle>
            <AlertDialogDescription>
              Alert name &quot;{pendingPreview?.name || ""}&quot; đã tồn tại. Bạn có muốn tiếp tục tạo mới không? Nếu tiếp tục, hệ thống sẽ thêm timestamp hiện tại vào cuối tên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateWithTimestamp}>Tiếp tục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

