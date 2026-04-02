"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Timer,
  Bell,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  History,
  Link2,
  ExternalLink,
  Edit,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area } from "recharts"
import { alertsApi } from "@/lib/api/services"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { toAlertUiItem, toUiSeverity } from "./alert-center-view-model"
import type { AlertApiItem } from "./alert-center-view-model"
import type { AlertRule } from "@/types/api"
import { ManualAlertCreatorModal } from "./manual-alert-creator-modal"

interface AlertDetailPageContentProps {
  alertId: string
}

type TimelineEntry = {
  type: "history" | "notification"
  title: string
  description: string
  time: Date
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    label: "Critical",
    bgClass: "bg-red-100",
    iconClass: "text-red-600",
  },
  warning: {
    icon: AlertCircle,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Warning",
    bgClass: "bg-amber-100",
    iconClass: "text-amber-600",
  },
  info: {
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Info",
    bgClass: "bg-blue-100",
    iconClass: "text-blue-600",
  },
}

const revenueHistoricalData = [
  { day: "Mon", value: 1308, threshold: 916 },
  { day: "Tue", value: 1295, threshold: 916 },
  { day: "Wed", value: 1180, threshold: 916 },
  { day: "Thu", value: 1050, threshold: 916 },
  { day: "Fri", value: 950, threshold: 916 },
  { day: "Sat", value: 890, threshold: 916 },
  { day: "Sun", value: 890, threshold: 916 },
]

const timelineEvents = [
  {
    type: "triggered",
    icon: AlertTriangle,
    title: "Alert Triggered",
    description: "Revenue dropped below threshold",
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    type: "notification",
    icon: Bell,
    title: "Notification Sent",
    description: "Email sent to team@example.com",
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 1000),
  },
  {
    type: "notification",
    icon: Bell,
    title: "Telegram Notification",
    description: "Posted to Alerts channel",
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120 * 1000),
  },
]

const relatedAlerts = [
  { id: "rel-1", title: "Fill rate dropped for same ad unit", severity: "warning", time: "2 hours ago" },
  { id: "rel-2", title: "Network latency increased", severity: "info", time: "3 hours ago" },
]

const correlatedMetrics = [
  { label: "eCPM", value: "$5.63", change: -3, trend: "down", status: "warning" },
  { label: "Fill Rate", value: "88%", change: 0, trend: "stable", status: "healthy" },
  { label: "DAU", value: "45K", change: -8, trend: "down", status: "warning" },
  { label: "Impressions", value: "2.1M", change: -15, trend: "down", status: "warning" },
]

const aiInsights = "Revenue giảm 32% chủ yếu do impressions giảm 15% kết hợp với eCPM giảm 3%. Khuyến nghị kiểm tra:\n1. AdMob waterfall — có thay đổi floor price gần đây không?\n2. DAU giảm 8% — check UA campaigns, có campaign nào bị pause?\n3. So sánh fill rate theo ad network — network nào fill kém?\n\nMức độ: Cần action trong 24h"

const suggestedActions = [
  { id: "1", action: "Increase floor price to $2.50", impact: "May improve eCPM by 15%" },
  { id: "2", action: "Enable backup ad network", impact: "Ensures fill rate stability" },
  { id: "3", action: "Review waterfall configuration", impact: "Optimize ad source priorities" },
]

const formatNumber2 = (value: number) => value.toFixed(2)

function AlertTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const uniqueEntries = payload.filter((entry, index, items) => {
    const key = String(entry.dataKey ?? "")
    return items.findIndex((item) => String(item.dataKey ?? "") === key) === index
  })

  const currentValue = uniqueEntries.find((entry) => entry.dataKey === "value")?.value
  const thresholdValue = uniqueEntries.find((entry) => entry.dataKey === "threshold")?.value

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {typeof currentValue === "number" && (
        <div className="mt-1 text-sm text-blue-500">Current Value : ${formatNumber2(currentValue)}</div>
      )}
      {typeof thresholdValue === "number" && (
        <div className="mt-1 text-sm text-red-400">Configured Threshold : ${formatNumber2(thresholdValue)}</div>
      )}
    </div>
  )
}

export function AlertDetailPageContent({ alertId }: AlertDetailPageContentProps) {
  const { toast } = useToast()
  const [actionLoading, setActionLoading] = useState<"ack" | "resolve" | "snooze" | null>(null)
  const [editRuleOpen, setEditRuleOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [editRuleLoading, setEditRuleLoading] = useState(false)
  const [persistedTimeline, setPersistedTimeline] = useState<TimelineEntry[]>([])
  const id = Number(alertId)

  const { data: detailData, loading, refetch } = useApi(
    () => alertsApi.getAlertResult(id),
    {
      enabled: Number.isFinite(id),
      cacheKey: `alert_result_${id}`,
    }
  )

  const alert = useMemo(() => {
    const raw = detailData?.alert
    if (!raw) return null
    return toAlertUiItem(raw as AlertApiItem)
  }, [detailData])

  const SeverityIcon = severityConfig[alert ? toUiSeverity(alert.severity) : "info"].icon

  const serverTimeline = useMemo(() => {
    if (!detailData) return []
    return (detailData.timeline ?? []).map((item) => ({
      type: item.type === "notification" ? "notification" : "history",
      title: item.title || "Action",
      description: item.description || "No details",
      time: new Date(item.occurredAt),
    })) as TimelineEntry[]
  }, [detailData])

  useEffect(() => {
    const validItems = serverTimeline
      .filter((item) => !Number.isNaN(item.time.getTime()))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
    if (validItems.length > 0) {
      setPersistedTimeline(validItems)
    }
  }, [serverTimeline])

  const timelineData = useMemo(() => {
    if (persistedTimeline.length > 0) {
      return [...persistedTimeline]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 8)
    }
    return [...timelineEvents].sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [persistedTimeline])

  const relatedAlertItems = useMemo(() => {
    const rows = detailData?.relatedAlerts ?? []
    if (rows.length === 0) return relatedAlerts
    return rows
      .map((item) => ({
        id: String(item.id),
        title: item.alertRuleName || item.alertType || item.message,
        severity: toUiSeverity(item.severity),
        time: formatDistanceToNow(new Date(item.triggeredAt), { addSuffix: true }),
      }))
  }, [detailData])

  const trendData = useMemo(() => {
    const rows = detailData?.trend ?? []
    if (rows.length === 0) return revenueHistoricalData
    return rows.map((item) => ({
      day: item.label,
      value: item.value,
      threshold: item.threshold ?? alert?.threshold ?? null,
    }))
  }, [detailData, alert])

  const relatedMetricItems = useMemo(() => {
    const rows = detailData?.relatedMetrics ?? []
    if (rows.length === 0) return correlatedMetrics
    return rows.map((item) => ({
      label: item.label,
      value: item.value,
      change: item.changePercent ?? 0,
      trend: (item.changePercent ?? 0) < 0 ? "down" : (item.changePercent ?? 0) > 0 ? "up" : "stable",
      status: item.status === "warning" ? "warning" : "healthy",
    }))
  }, [detailData])

  const suggestedActionItems = useMemo(() => {
    return detailData?.suggestedActions?.length ? detailData.suggestedActions : suggestedActions
  }, [detailData])

  const aiInsightText = detailData?.aiInsight || aiInsights

  const invalidateAlertCaches = () => {
    invalidateCache("notification_open_alerts_all")
    invalidateCache("alerts_open_summary")
    invalidateCache("alerts_open_summary_v2")
  }

  const handleAcknowledge = async () => {
    if (!alert) return
    try {
      setActionLoading("ack")
      await alertsApi.acknowledgeAlert(alert.numericId, { acknowledgedBy: "UI_USER" })
      setPersistedTimeline((prev) => [
        {
          type: "history",
          title: "ACKNOWLEDGED",
          description: "Alert acknowledged by UI_USER",
          time: new Date(),
        },
        ...prev,
      ])
      toast({ title: "Đã acknowledge alert" })
      invalidateAlertCaches()
      await refetch()
    } catch (error: any) {
      toast({ title: "Không thể acknowledge", description: error?.message || "Unknown error", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async () => {
    if (!alert) return
    try {
      setActionLoading("resolve")
      await alertsApi.resolveAlert(alert.numericId, { resolvedBy: "UI_USER" })
      setPersistedTimeline((prev) => [
        {
          type: "history",
          title: "RESOLVED",
          description: "Alert resolved by UI_USER",
          time: new Date(),
        },
        ...prev,
      ])
      toast({ title: "Đã resolve alert" })
      invalidateAlertCaches()
      await refetch()
    } catch (error: any) {
      toast({ title: "Không thể resolve", description: error?.message || "Unknown error", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSnooze = async () => {
    if (!alert) return
    try {
      setActionLoading("snooze")
      await alertsApi.snoozeAlert(alert.numericId, { snoozedMinutes: 240, snoozedBy: "UI_USER" })
      setPersistedTimeline((prev) => [
        {
          type: "history",
          title: "SNOOZED",
          description: "Alert snoozed for 4 hours by UI_USER",
          time: new Date(),
        },
        ...prev,
      ])
      toast({ title: "Đã snooze alert 4 giờ" })
      invalidateAlertCaches()
      await refetch()
    } catch (error: any) {
      toast({ title: "Không thể snooze", description: error?.message || "Unknown error", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenEditRule = async () => {
    const ruleId = detailData?.alert?.alertRuleId
    if (!ruleId) {
      toast({ title: "Không tìm thấy Alert Rule", variant: "destructive" })
      return
    }

    try {
      setEditRuleLoading(true)
      const rule = await alertsApi.getAlertRule(ruleId)
      if (rule.ruleType.toUpperCase() !== "MANUAL") {
        toast({
          title: "Chưa hỗ trợ",
          description: "Wizard Edit hiện mới áp dụng cho Manual Alert Rule.",
          variant: "destructive",
        })
        return
      }
      setEditingRule(rule)
      setEditRuleOpen(true)
    } catch (error: any) {
      toast({
        title: "Không thể tải Alert Rule",
        description: error?.message || "Unknown error",
        variant: "destructive",
      })
    } finally {
      setEditRuleLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Card className="border-slate-200">
          <CardContent className="py-10 text-center text-slate-500">Loading alert detail...</CardContent>
        </Card>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Card className="border-slate-200">
          <CardContent className="py-10 text-center text-slate-500">Alert not found.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/alert-center">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Alerts
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <p className="text-sm text-slate-500">Alerts & Insights &gt; Alert Detail</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleOpenEditRule()} disabled={editRuleLoading}>
              <Edit className="w-4 h-4" />
              {editRuleLoading ? "Loading..." : "Edit Rule"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${severityConfig[alert.severity].bgClass}`}>
              <SeverityIcon className={`w-6 h-6 ${severityConfig[alert.severity].iconClass}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={severityConfig[alert.severity].badgeClass}>
                  {severityConfig[alert.severity].label}
                </Badge>
                {alert.status === "active" && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Triggered
                  </Badge>
                )}
                {alert.status === "resolved" && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Resolved</Badge>
                )}
                <span className="text-sm text-slate-400">
                  {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 mb-2">{alert.title}</h1>
              <p className="text-slate-600">{alert.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100">
            <Link href={alert.appId ? `/apps/${encodeURIComponent(alert.appId)}` : "/apps"}>
              <Button variant="outline" className="gap-2 bg-slate-50 hover:bg-slate-100">
                <Image src={alert.appIconUri || "/placeholder.svg?height=24&width=24"} alt="app" width={24} height={24} className="rounded" />
                <span className="font-medium">{alert.appLabel || "Unknown app"}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-slate-700">{alert.networkLabel || "N/A"}</span>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-600">{alert.entityLabel || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <div className="text-4xl font-bold font-mono text-red-700">{alert.value.toFixed(2)}</div>
                  <div className="text-sm text-slate-600 mt-1">Threshold: {alert.threshold.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-red-600">
                    {alert.percentDelta != null ? `${alert.percentDelta > 0 ? "↑" : "↓"}${Math.abs(alert.percentDelta).toFixed(2)}%` : "No baseline"}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Metric: {alert.metricLabel}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">7-Day Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        content={<AlertTrendTooltip />}
                      />
                      <ReferenceLine
                        y={alert.threshold}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{ value: `Threshold (${formatNumber2(alert.threshold)})`, position: "insideTopRight", fill: "#ef4444", fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="value" fill="url(#colorValue)" stroke="#3b82f6" strokeWidth={2} />
                      <Line
                        type="monotone"
                        dataKey="threshold"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={(props: { cx: number; cy: number; index: number; payload: { value: number } }) => {
                          const { cx, cy, index, payload } = props
                          const isLastDay = index === trendData.length - 1
                          const isBelowThreshold = payload.value < alert.threshold
                          return (
                            <circle
                              key={index}
                              cx={cx}
                              cy={cy}
                              r={isLastDay ? 6 : 4}
                              fill={isBelowThreshold ? "#ef4444" : "#3b82f6"}
                              stroke="white"
                              strokeWidth={2}
                            />
                          )
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-indigo-50 border-l-4 border-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{aiInsightText}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Event Timeline</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                  {timelineData.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-[25px] w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center ${
                          event.type === "history" ? "border-red-500" : "border-blue-500"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${event.type === "history" ? "bg-red-500" : "bg-blue-500"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-900">{event.title}</span>
                          <span className="text-xs text-slate-400">{format(event.time, "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        <p className="text-sm text-slate-500">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Related Metrics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {relatedMetricItems.map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-500">{metric.label}</p>
                      <p className="text-lg font-semibold text-slate-900">{metric.value}</p>
                    </div>
                    <div className={`text-sm font-medium ${metric.status === "warning" ? "text-amber-600" : "text-green-600"}`}>
                      {metric.trend === "down" ? "↓" : metric.trend === "up" ? "↑" : "↔"}{formatNumber2(Math.abs(metric.change))}%
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Related Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {relatedAlertItems.map((related) => (
                  <Link
                    key={related.id}
                    href={`/alert-center/${related.id}`}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                  >
                    {related.severity === "warning" ? (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : related.severity === "critical" ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 block truncate">{related.title}</span>
                      <span className="text-xs text-slate-400">{related.time}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Suggested Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {suggestedActionItems.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 bg-white/70 rounded-lg border border-white">
                    <p className="text-sm font-medium text-slate-700">{suggestion.action}</p>
                    <p className="text-xs text-slate-500 mt-1">{suggestion.impact}</p>
                    <Button variant="outline" size="sm" className="h-7 gap-1 mt-2 bg-white text-xs">
                      Apply
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Actions</h3>
                <div className="space-y-2">
                  {alert.status !== "acknowledged" && (
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleAcknowledge} disabled={actionLoading != null}>
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading === "ack" ? "Acknowledging..." : "Acknowledge"}
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={handleSnooze} disabled={actionLoading != null}>
                    <Timer className="w-4 h-4" />
                    {actionLoading === "snooze" ? "Snoozing..." : "Snooze 4h"}
                  </Button>
                  <Button className="w-full justify-start gap-2" onClick={handleResolve} disabled={actionLoading != null}>
                    <CheckCircle2 className="w-4 h-4" />
                    {actionLoading === "resolve" ? "Resolving..." : "Resolve"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ManualAlertCreatorModal
        open={editRuleOpen}
        onOpenChange={(nextOpen) => {
          setEditRuleOpen(nextOpen)
          if (!nextOpen) setEditingRule(null)
        }}
        onCreated={() => {
          invalidateAlertCaches()
          void refetch()
        }}
        rule={editingRule}
      />
    </div>
  )
}

