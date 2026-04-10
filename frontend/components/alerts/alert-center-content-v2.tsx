"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AIAlertBuilderSheet } from "./ai-alert-builder-sheet"
import { ManualAlertCreatorModal } from "./manual-alert-creator-modal"
import { AlertRulesPanel } from "./alert-rules-panel"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Clock,
  CheckCircle2,
  Settings,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  ChevronLeft,
  Pencil,
  Play,
  Trash2,
  Eye,
} from "lucide-react"
import { AlertSlackFinanceRow } from "./alert-slack-finance-row"
import { alertsApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { toUiAlertList, toUiSeverity, computeAverageResponseMinutes } from "./alert-center-view-model"
import type { AlertApiItem } from "./alert-center-view-model"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache } from "@/hooks/use-api"
import type { AlertCenterTimelineItem, AlertRule, AlertRuleConfigPayload } from "@/types/api"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { hasScreenFunction } from "@/lib/auth"
import { DailyInsightsFeed } from "./daily-insights-feed"
import { Sparkles } from "lucide-react"
import {
  AlertRuleDetailsDialog,
  formatRuleConditionsSummary,
  parseAlertRuleConfig,
} from "./alert-rule-details-dialog"

const severityOptions = ["All", "HIGH", "MEDIUM", "LOW"] as const
const TIMELINE_PAGE_SIZE = 25

const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const isToday = (date: Date) => {
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

function parseLocalYmdStart(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x))
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

function parseLocalYmdEnd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x))
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
}

function extractMetricKeysFromRule(rule: AlertRule): string[] {
  const keys = new Set<string>()
  const cfg = parseAlertRuleConfig(rule)
  if (!cfg) return []
  if (cfg.metricKey) keys.add(cfg.metricKey)
  for (const c of cfg.conditions ?? []) {
    if (c.metricKey) keys.add(c.metricKey)
  }
  return [...keys]
}

function ruleMatchesOverviewAppTextFilter(
  rule: AlertRule,
  query: string,
  apps: { id: string; label: string }[],
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const cfg = parseAlertRuleConfig(rule)
  if (!cfg?.scope) return true
  if (cfg.scope.allApps) return true
  const ids = cfg.scope.appIds ?? []
  if (ids.length === 0) return true

  const idToLabel = new Map<string, string>()
  for (const a of apps) {
    idToLabel.set(a.id.toLowerCase(), a.label)
  }

  return ids.some((rawId) => {
    const idLower = rawId.toLowerCase()
    const label = (idToLabel.get(idLower) ?? "").toLowerCase()
    return idLower.includes(q) || label.includes(q)
  })
}

function ruleMatchesOverviewMetricFilter(rule: AlertRule, metricKey: string): boolean {
  if (!metricKey || metricKey === "all") return true
  return extractMetricKeysFromRule(rule).some((k) => k.toLowerCase() === metricKey.toLowerCase())
}

export function AlertCenterContentV2() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [severity, setSeverity] = useState<string>("All")
  const [appFilter, setAppFilter] = useState<string>("")
  const [showAiBuilder, setShowAiBuilder] = useState(false)
  const [showManualCreator, setShowManualCreator] = useState(false)
  const [manualEditRule, setManualEditRule] = useState<AlertRule | null>(null)
  const [rulesOverviewAppQuery, setRulesOverviewAppQuery] = useState("")
  const [rulesOverviewMetric, setRulesOverviewMetric] = useState("all")
  const [rulesOverviewStatus, setRulesOverviewStatus] = useState<"all" | "enabled" | "disabled">("all")
  const [overviewTogglingId, setOverviewTogglingId] = useState<number | null>(null)
  const [overviewDeletingId, setOverviewDeletingId] = useState<number | null>(null)
  const [overviewRunningId, setOverviewRunningId] = useState<number | null>(null)
  const [detailsRule, setDetailsRule] = useState<AlertRule | null>(null)
  const [alertRulesPanelOpen, setAlertRulesPanelOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<{ id: number; type: "ack" | "resolve" } | null>(null)

  const [filtersCollapsed, setFiltersCollapsed] = useState(true)
  const [filterRuleId, setFilterRuleId] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  const [timelineItems, setTimelineItems] = useState<AlertCenterTimelineItem[]>([])
  const [timelinePage, setTimelinePage] = useState(1)
  const [timelineHasMore, setTimelineHasMore] = useState(false)
  const [timelineTotalCount, setTimelineTotalCount] = useState(0)
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [timelineLoadingMore, setTimelineLoadingMore] = useState(false)
  const [timelineNonce, setTimelineNonce] = useState(0)
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const timelineFetchLock = useRef(false)

  const showDailyInsights = hasScreenFunction("s-alerts", "view-daily-insights")
  const [centerTab, setCenterTab] = useState<"alerts" | "daily-insights">("alerts")

  useEffect(() => {
    if (searchParams.get("tab") === "daily-insights" && showDailyInsights) {
      setCenterTab("daily-insights")
    }
  }, [searchParams, showDailyInsights])

  useEffect(() => {
    const severityParam = searchParams.get("severity")
    const appIdParam = searchParams.get("appId")
    if (severityParam) {
      const normalized = severityParam.toUpperCase()
      if (severityOptions.includes(normalized as (typeof severityOptions)[number])) {
        setSeverity(normalized)
      }
    }
    if (appIdParam) setAppFilter(appIdParam)
  }, [searchParams])

  const { data: summary } = useApi(() => alertsApi.getOpenAlertsSummary(), { cacheKey: "alerts_open_summary_v2" })
  const { data: rules, refetch: refetchRules, loading: rulesLoading } = useApi(() => alertsApi.getAlertRules(), {
    cacheKey: "alert_rules_v2_overview",
  })
  const { data: appsData } = useApi(() => structureApi.getApps(), {
    cacheKey: "alert_center_filter_apps",
  })
  const { alerts, loading, refetch } = useAlertNotifications({ inAppOnly: false })
  const uiAlerts = useMemo(() => toUiAlertList(alerts as AlertApiItem[]), [alerts])

  const filterAppsOptions = useMemo(() => {
    return (appsData?.apps ?? []).map((app) => ({
      id: app.appId,
      label: app.displayName || app.name || app.appId,
    }))
  }, [appsData])

  const timelineQueryParams = useMemo(() => {
    const appId = appFilter.trim() || undefined
    const alertRuleIdParam =
      filterRuleId !== "all" && filterRuleId.trim() !== "" ? Number(filterRuleId) : undefined
    const from =
      filterDateFrom.trim() !== "" ? parseLocalYmdStart(filterDateFrom.trim()).toISOString() : undefined
    const to =
      filterDateTo.trim() !== "" ? parseLocalYmdEnd(filterDateTo.trim()).toISOString() : undefined
    return {
      appId,
      alertRuleId: Number.isFinite(alertRuleIdParam as number) ? alertRuleIdParam : undefined,
      from,
      to,
    }
  }, [appFilter, filterRuleId, filterDateFrom, filterDateTo])

  const filteredAlerts = useMemo(() => {
    const fromD = filterDateFrom.trim() ? parseLocalYmdStart(filterDateFrom.trim()) : null
    const toD = filterDateTo.trim() ? parseLocalYmdEnd(filterDateTo.trim()) : null
    const ruleNum = filterRuleId !== "all" && filterRuleId.trim() !== "" ? Number(filterRuleId) : null

    return uiAlerts.filter((alert) => {
      const severityMatch =
        severity === "All" ||
        (severity === "HIGH" && alert.severity === "critical") ||
        (severity === "MEDIUM" && alert.severity === "warning") ||
        (severity === "LOW" && alert.severity === "info")

      if (!severityMatch) return false
      if (appFilter && (alert.appId || "").toLowerCase() !== appFilter.toLowerCase()) return false
      if (ruleNum != null && Number.isFinite(ruleNum) && alert.alertRuleId !== ruleNum) return false
      if (fromD && alert.timestamp.getTime() < fromD.getTime()) return false
      if (toD && alert.timestamp.getTime() > toD.getTime()) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        alert.title.toLowerCase().includes(q) ||
        alert.description.toLowerCase().includes(q) ||
        (alert.appId || "").toLowerCase().includes(q) ||
        (alert.appLabel || "").toLowerCase().includes(q) ||
        (alert.appStoreId || "").toLowerCase().includes(q) ||
        (alert.entityLabel || "").toLowerCase().includes(q)
      )
    })
  }, [uiAlerts, severity, appFilter, searchQuery, filterRuleId, filterDateFrom, filterDateTo])

  const criticalCount = summary?.BySeverity?.HIGH ?? 0
  const warningCount = summary?.BySeverity?.MEDIUM ?? 0
  const infoCount = summary?.BySeverity?.LOW ?? 0
  const totalOpen = summary?.Total ?? uiAlerts.length

  const triggeredNowAlerts = useMemo(
    () => uiAlerts.filter((a) => Date.now() - a.timestamp.getTime() <= 60 * 60000),
    [uiAlerts]
  )
  const triggeredTodayAlerts = useMemo(() => uiAlerts.filter((a) => isToday(a.timestamp)), [uiAlerts])
  const averageResponseMinutes = useMemo(() => computeAverageResponseMinutes(uiAlerts), [uiAlerts])

  /** Newest first (occurredAt desc, then history id desc for stable ties). */
  const sortedTimelineItems = useMemo(() => {
    return [...timelineItems].sort((a, b) => {
      const ta = new Date(a.occurredAt).getTime()
      const tb = new Date(b.occurredAt).getTime()
      if (tb !== ta) return tb - ta
      return b.id - a.id
    })
  }, [timelineItems])

  const rulesSorted = useMemo(() => [...(rules ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [rules])

  const appIdToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of filterAppsOptions) {
      m.set(a.id.toLowerCase(), a.label)
    }
    return m
  }, [filterAppsOptions])

  const rulesMetricOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of rules ?? []) {
      for (const k of extractMetricKeysFromRule(r)) set.add(k)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rules])

  const filteredRulesOverview = useMemo(() => {
    return rulesSorted.filter((r) => {
      if (rulesOverviewStatus === "enabled" && !r.isEnabled) return false
      if (rulesOverviewStatus === "disabled" && r.isEnabled) return false
      if (!ruleMatchesOverviewAppTextFilter(r, rulesOverviewAppQuery, filterAppsOptions)) return false
      if (!ruleMatchesOverviewMetricFilter(r, rulesOverviewMetric)) return false
      return true
    })
  }, [rulesSorted, rulesOverviewStatus, rulesOverviewAppQuery, rulesOverviewMetric, filterAppsOptions])

  const formatRuleScope = useCallback(
    (rule: AlertRule) => {
      const cfg = parseAlertRuleConfig(rule)
      if (!cfg?.scope) return "—"
      if (cfg.scope.allApps) return "All apps"
      const ids = cfg.scope.appIds ?? []
      if (ids.length === 0) return "All apps"
      return ids.map((id) => appIdToLabel.get(id.toLowerCase()) ?? id).join(", ")
    },
    [appIdToLabel],
  )

  const invalidateAlertCaches = () => {
    invalidateCache("notification_open_alerts_all")
    invalidateCache("alerts_open_summary")
    invalidateCache("alerts_open_summary_v2")
  }

  const bumpTimeline = useCallback(() => setTimelineNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function loadFirstPage() {
      setTimelineLoading(true)
      timelineFetchLock.current = true
      try {
        const res = await alertsApi.getAlertCenterTimeline({
          page: 1,
          pageSize: TIMELINE_PAGE_SIZE,
          ...timelineQueryParams,
        })
        if (cancelled) return
        setTimelineItems(res.data)
        setTimelinePage(1)
        setTimelineHasMore(res.hasNextPage)
        setTimelineTotalCount(res.totalCount)
      } catch (error: unknown) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error"
          toast({ title: "Could not load timeline", description: message, variant: "destructive" })
          setTimelineItems([])
          setTimelineHasMore(false)
          setTimelineTotalCount(0)
        }
      } finally {
        timelineFetchLock.current = false
        if (!cancelled) setTimelineLoading(false)
      }
    }

    void loadFirstPage()
    return () => {
      cancelled = true
    }
  }, [timelineQueryParams, timelineNonce])

  const loadMoreTimeline = useCallback(async () => {
    if (!timelineHasMore || timelineLoading || timelineLoadingMore || timelineFetchLock.current) return
    const nextPage = timelinePage + 1
    timelineFetchLock.current = true
    setTimelineLoadingMore(true)
    try {
      const res = await alertsApi.getAlertCenterTimeline({
        page: nextPage,
        pageSize: TIMELINE_PAGE_SIZE,
        ...timelineQueryParams,
      })
      setTimelineItems((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        const extra = res.data.filter((r) => !seen.has(r.id))
        return [...prev, ...extra]
      })
      setTimelinePage(nextPage)
      setTimelineHasMore(res.hasNextPage)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast({ title: "Could not load more timeline", description: message, variant: "destructive" })
    } finally {
      timelineFetchLock.current = false
      setTimelineLoadingMore(false)
    }
  }, [timelineQueryParams, timelineHasMore, timelineLoading, timelineLoadingMore, timelinePage])

  const onTimelineScroll = useCallback(() => {
    const el = timelineScrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < 80) {
      void loadMoreTimeline()
    }
  }, [loadMoreTimeline])

  const handleRuleCreated = async () => {
    setManualEditRule(null)
    invalidateAlertCaches()
    invalidateCache("alert_rules_v2_overview")
    invalidateCache("alert_rules_all")
    invalidateCache("alert_rules_enabled")
    invalidateCache("alert_rules_disabled")
    await refetchRules()
  }

  const openOverviewEdit = (rule: AlertRule) => {
    setManualEditRule(rule)
    setShowManualCreator(true)
  }

  const handleOverviewToggle = async (rule: AlertRule) => {
    setOverviewTogglingId(rule.id)
    try {
      await alertsApi.toggleAlertRule(rule.id)
      invalidateCache("alert_rules_v2_overview")
      invalidateCache("alert_rules_all")
      invalidateCache("alert_rules_enabled")
      invalidateCache("alert_rules_disabled")
      await refetchRules()
      toast({
        title: "Đã cập nhật",
        description: `Rule ${rule.name} đã ${rule.isEnabled ? "tắt" : "bật"}.`,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể đổi trạng thái rule."
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setOverviewTogglingId(null)
    }
  }

  const handleOverviewDelete = async (rule: AlertRule) => {
    const confirmed = window.confirm(`Xóa alert rule "${rule.name}"?`)
    if (!confirmed) return
    setOverviewDeletingId(rule.id)
    try {
      await alertsApi.deleteAlertRule(rule.id)
      invalidateCache("alert_rules_v2_overview")
      invalidateCache("alert_rules_all")
      invalidateCache("alert_rules_enabled")
      invalidateCache("alert_rules_disabled")
      await refetchRules()
      toast({ title: "Đã xóa", description: `Rule ${rule.name} đã được xóa.` })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể xóa alert rule."
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setOverviewDeletingId(null)
    }
  }

  const handleOverviewRunNow = async (rule: AlertRule) => {
    setOverviewRunningId(rule.id)
    try {
      const res = await alertsApi.runAlertRuleNow(rule.id)
      invalidateAlertCaches()
      invalidateCache("alert_rules_v2_overview")
      invalidateCache("alert_rules_all")
      invalidateCache("alert_rules_enabled")
      invalidateCache("alert_rules_disabled")
      await refetchRules()
      await refetch()
      bumpTimeline()
      toast({
        title: "Đã chạy rule",
        description:
          res.alertsCreated > 0
            ? `Tạo ${res.alertsCreated} alert mới; thông báo đã được xếp hàng.`
            : "Không có alert mới (điều kiện không khớp hoặc bị cooldown/dedup).",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Không thể chạy rule."
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setOverviewRunningId(null)
    }
  }

  const handleAcknowledge = async (id: number) => {
    try {
      setActionLoading({ id, type: "ack" })
      await alertsApi.acknowledgeAlert(id, { acknowledgedBy: "UI_USER" })
      invalidateAlertCaches()
      await refetch()
      bumpTimeline()
      toast({ title: "Đã acknowledge alert" })
    } catch (error: any) {
      toast({ title: "Không thể acknowledge", description: error?.message || "Unknown error", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const clearTimelineFilters = () => {
    setFilterRuleId("all")
    setFilterDateFrom("")
    setFilterDateTo("")
    setAppFilter("")
  }

  const handleResolve = async (id: number) => {
    try {
      setActionLoading({ id, type: "resolve" })
      await alertsApi.resolveAlert(id, { resolvedBy: "UI_USER" })
      invalidateAlertCaches()
      await refetch()
      bumpTimeline()
      toast({ title: "Đã resolve alert" })
    } catch (error: any) {
      toast({ title: "Không thể resolve", description: error?.message || "Unknown error", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const alertsPanel = (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-2">Alerts & Insights &gt; Alert Center</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Alert Center
            <span className="text-amber-500 text-3xl">.</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">Real-time monitoring across 200+ apps</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowAiBuilder(true)}
          >
            Create Alert via AI
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2 bg-transparent"
            onClick={() => {
              setManualEditRule(null)
              setShowManualCreator(true)
            }}
          >
            Create Manual Alert
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAlertRulesPanelOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-slate-900">{totalOpen}</div>
            <p className="text-sm text-slate-500">Active alerts</p>
            <p className="text-xs text-slate-400 mt-2">Open alerts in queue</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{triggeredNowAlerts.length}</div>
                <p className="text-sm text-slate-600">Triggered now</p>
                <p className="text-xs text-slate-500 mt-2">
                  {triggeredNowAlerts.filter((a) => a.severity === "critical").length} critical •{" "}
                  {triggeredNowAlerts.filter((a) => a.severity === "warning").length} warning
                </p>
              </div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-slate-900">{triggeredTodayAlerts.length}</div>
            <p className="text-sm text-slate-500">Triggered today</p>
            <p className="text-xs text-slate-400 mt-2">
              {criticalCount} red • {warningCount} yellow • {infoCount} blue
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-slate-900">
              {averageResponseMinutes != null ? `${averageResponseMinutes} min` : "--"}
            </div>
            <p className="text-sm text-slate-500">Avg response time</p>
            <p className="text-xs text-slate-400 mt-2">Based on acknowledged/resolved alerts</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Alert Rules Overview
            </h2>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 min-w-[200px] flex-1 max-w-sm">
                <Label className="text-xs text-slate-500">App</Label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    className="pl-9"
                    placeholder="Search by app name or appId..."
                    value={rulesOverviewAppQuery}
                    onChange={(e) => setRulesOverviewAppQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <Label className="text-xs text-slate-500">Metric</Label>
                <Select value={rulesOverviewMetric} onValueChange={setRulesOverviewMetric}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All metrics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All metrics</SelectItem>
                    {rulesMetricOptions.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <Label className="text-xs text-slate-500">Status</Label>
                <Select
                  value={rulesOverviewStatus}
                  onValueChange={(v) => setRulesOverviewStatus(v as "all" | "enabled" | "disabled")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading rules…
              </div>
            ) : filteredRulesOverview.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No rules match the filters.</p>
            ) : (
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="min-w-[200px] max-w-[min(28rem,40vw)]">Conditions</TableHead>
                      <TableHead className="hidden md:table-cell">Apps</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[240px] min-w-[240px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRulesOverview.map((rule) => {
                      const condSummary = formatRuleConditionsSummary(rule)
                      return (
                        <TableRow key={rule.id} className="border-slate-200">
                          <TableCell className="max-w-[220px]">
                            <span className="font-medium text-slate-900 truncate block" title={rule.name}>
                              {rule.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {rule.ruleType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[min(28rem,40vw)] align-top">
                            <span
                              className="text-xs text-slate-600 whitespace-normal line-clamp-3 leading-snug"
                              title={condSummary}
                            >
                              {condSummary}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[240px]">
                            <span className="text-xs text-slate-600 whitespace-normal">
                              {formatRuleScope(rule)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.isEnabled
                                  ? "bg-green-100 text-green-700 border-0"
                                  : "bg-slate-100 text-slate-600 border-0"
                              }
                            >
                              {rule.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5 flex-nowrap">
                              <Switch
                                checked={rule.isEnabled}
                                disabled={overviewTogglingId === rule.id}
                                onCheckedChange={() => void handleOverviewToggle(rule)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setDetailsRule(rule)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => void handleOverviewRunNow(rule)}
                                disabled={
                                  overviewRunningId === rule.id ||
                                  overviewDeletingId === rule.id ||
                                  overviewTogglingId === rule.id
                                }
                                title="Run now"
                              >
                                {overviewRunningId === rule.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 text-indigo-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => openOverviewEdit(rule)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => void handleOverviewDelete(rule)}
                                disabled={overviewDeletingId === rule.id}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Requires Attention
          <Badge className="ml-2 bg-red-100 text-red-700">{filteredAlerts.length}</Badge>
        </h2>

        <Card className="border-slate-200 mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search by title, message, appId, mediation group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? "All Severity" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading alerts...
            </CardContent>
          </Card>
        ) : filteredAlerts.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-12 text-center text-slate-500 text-sm">
              No alerts match the current filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === "critical"
                    ? "border-l-red-500 bg-red-50"
                    : alert.severity === "warning"
                      ? "border-l-amber-500 bg-amber-50"
                      : "border-l-blue-500 bg-blue-50"
                } border-slate-200`}
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {alert.severity === "critical" ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : alert.severity === "warning" ? (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600" />
                      )}
                      <span className="font-semibold text-slate-900">{alert.title}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Triggered {formatRelativeTime(alert.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 ml-8">
                    {alert.value != null ? (
                      <span className="font-mono text-sm text-red-600">
                        {alert.metricLabel}: {alert.value.toFixed(2)}
                        {alert.threshold != null ? ` (threshold ${alert.threshold.toFixed(2)})` : ""}
                      </span>
                    ) : null}
                  </div>

                  {alert.slackFinance ? (
                    <AlertSlackFinanceRow fin={alert.slackFinance} className="ml-8 mt-1" />
                  ) : null}

                  <p className="ml-8 text-sm text-slate-600">{alert.description}</p>

                  <div className="ml-8 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => handleAcknowledge(alert.numericId)}
                      disabled={actionLoading != null}
                    >
                      {actionLoading?.id === alert.numericId && actionLoading.type === "ack" ? "Acknowledging..." : "Acknowledge"}
                    </Button>
                    <Button size="sm" variant="outline" className="bg-transparent" asChild>
                      <Link href={`/alert-center/${alert.id}`}>View Detail</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                      onClick={() => handleResolve(alert.numericId)}
                      disabled={actionLoading != null}
                    >
                      {actionLoading?.id === alert.numericId && actionLoading.type === "resolve" ? "Resolving..." : "Resolve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timeline
          {timelineTotalCount > 0 ? (
            <span className="text-sm font-normal text-slate-500">({timelineTotalCount} events)</span>
          ) : null}
        </h2>
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="flex max-h-[min(520px,58vh)] min-h-[240px] flex-col overflow-hidden md:flex-row">
              <aside
                className={cn(
                  "flex shrink-0 flex-col border-slate-200 bg-white md:min-h-0 md:h-full",
                  "border-b md:border-b-0 md:border-r",
                  filtersCollapsed ? "md:w-11" : "md:w-60 lg:w-64",
                  "w-full"
                )}
              >
                <button
                  type="button"
                  onClick={() => setFiltersCollapsed((c) => !c)}
                  className={cn(
                    "flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50",
                    filtersCollapsed && "md:justify-center md:px-1 md:py-3"
                  )}
                  title={filtersCollapsed ? "Show filters" : "Hide filters"}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-700" />
                  {!filtersCollapsed ? (
                    <>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Filters</span>
                      <ChevronLeft className="hidden h-4 w-4 shrink-0 text-slate-500 md:block" aria-hidden />
                      <ChevronDown
                        className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform md:hidden rotate-180"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-semibold text-slate-900 md:hidden">Filters</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500 md:hidden" aria-hidden />
                    </>
                  )}
                </button>
                {!filtersCollapsed && (
                  <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 md:min-h-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">Alert rule</Label>
                      <Select value={filterRuleId} onValueChange={setFilterRuleId}>
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="All rules" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All rules</SelectItem>
                          {rulesSorted.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">App</Label>
                      <Select
                        value={appFilter.trim() === "" ? "all" : appFilter}
                        onValueChange={(v) => setAppFilter(v === "all" ? "" : v)}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="All apps" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All apps</SelectItem>
                          {filterAppsOptions.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="truncate">{a.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">From date</Label>
                      <Input
                        type="date"
                        className="h-9 bg-white"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600">To date</Label>
                      <Input
                        type="date"
                        className="h-9 bg-white"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full bg-white"
                      onClick={clearTimelineFilters}
                    >
                      Clear filters
                    </Button>
                    <p className="text-[11px] leading-snug text-slate-500">
                      Also applies to the open-alerts list above. Local calendar dates.
                    </p>
                  </div>
                )}
              </aside>
              <div
                ref={timelineScrollRef}
                onScroll={onTimelineScroll}
                className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6 space-y-4"
              >
              {timelineLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading timeline…
                </div>
              ) : timelineItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">No timeline events yet.</p>
              ) : (
                <>
                  {sortedTimelineItems.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="w-2 h-2 shrink-0 rounded-full bg-slate-400 mt-2" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-slate-500">
                          {format(new Date(entry.occurredAt), "dd/MM/yyyy HH:mm")}
                        </p>
                        <p className="text-sm font-medium text-slate-900">{entry.title}</p>
                        {entry.subtitle ? (
                          <p className="text-xs text-slate-600 break-words">{entry.subtitle}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 uppercase">
                          <span>{entry.action}</span>
                          {entry.actionBy ? <span>· {entry.actionBy}</span> : null}
                          {entry.newStatus ? <span>· {entry.newStatus}</span> : null}
                        </div>
                        <Link
                          href={`/alert-center/${entry.alertResultId}`}
                          className="inline-block text-xs font-medium text-indigo-600 hover:underline"
                        >
                          View alert
                        </Link>
                      </div>
                    </div>
                  ))}
                  {timelineLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading more…
                    </div>
                  ) : null}
                  {!timelineHasMore && timelineItems.length > 0 ? (
                    <p className="text-center text-xs text-slate-400 pt-1">End of timeline</p>
                  ) : null}
                </>
              )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
          {criticalCount} Critical
        </Badge>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
          {warningCount} Warning
        </Badge>
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
          {infoCount} Info
        </Badge>
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      {showDailyInsights ? (
        <Tabs
          value={centerTab}
          onValueChange={(v) => setCenterTab(v as "alerts" | "daily-insights")}
          className="w-full"
        >
          <TabsList className="h-10 w-fit bg-slate-100 p-1 mb-2">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="daily-insights" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Insights
            </TabsTrigger>
          </TabsList>
          <TabsContent value="alerts" className="mt-0 flex flex-col gap-6">
            {alertsPanel}
          </TabsContent>
          <TabsContent value="daily-insights" className="mt-6">
            <DailyInsightsFeed />
          </TabsContent>
        </Tabs>
      ) : (
        alertsPanel
      )}

      <AIAlertBuilderSheet open={showAiBuilder} onOpenChange={setShowAiBuilder} onCreated={handleRuleCreated} />
      <ManualAlertCreatorModal
        open={showManualCreator}
        onOpenChange={(open) => {
          setShowManualCreator(open)
          if (!open) setManualEditRule(null)
        }}
        onCreated={handleRuleCreated}
        rule={manualEditRule}
      />
      <AlertRulesPanel open={alertRulesPanelOpen} onOpenChange={setAlertRulesPanelOpen} />
      <AlertRuleDetailsDialog
        rule={detailsRule}
        open={detailsRule != null}
        onOpenChange={(open) => {
          if (!open) setDetailsRule(null)
        }}
        appIdToLabel={appIdToLabel}
      />
    </div>
  )
}

