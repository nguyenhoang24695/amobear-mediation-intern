"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User, Sparkles, Check, Edit2 } from "lucide-react"
import { alertsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

interface AIAlertBuilderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
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

export function AIAlertBuilderSheet({ open, onOpenChange, onCreated }: AIAlertBuilderSheetProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const handleCreateAlert = async (preview: AlertPreview) => {
    try {
      setCreating(true)
      await alertsApi.createAlertRule({
        name: preview.name,
        description: "Created from AI alert builder",
        ruleType: "AI_BUILDER",
        severity: preview.severity.toUpperCase(),
        ruleExpression: preview.condition,
        thresholdValue: null,
        timeWindowHours: 1,
        comparisonPeriodHours: 24,
        filterConditions: JSON.stringify({ apps: preview.apps, metric: preview.metric }),
        messageTemplate: `${preview.name} triggered`,
        isEnabled: true,
        cooldownMinutes: 60,
        notificationChannels: "IN_APP",
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
          content: `Alert "${preview.name}" da duoc tao thanh cong! Ban co the xem va quan ly alert nay trong trang My Alerts.`,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-slate-200">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Alert Builder
          </SheetTitle>
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-4">
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
        </ScrollArea>

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
    </Sheet>
  )
}

