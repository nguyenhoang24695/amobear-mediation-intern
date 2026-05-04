"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  MailCheck,
  Plus,
  Sparkles,
} from "lucide-react"
import { AlertSlackFinanceRow } from "./alert-slack-finance-row"
import { AlertAppAvatar } from "./alert-app-avatar"
import { alertsApi, organizationsApi, structureApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { toUiAlertList, toUiSeverity, computeAverageResponseMinutes } from "./alert-center-view-model"
import type { AlertApiItem } from "./alert-center-view-model"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache } from "@/hooks/use-api"
import type { AlertCenterTimelineItem, AlertRule, AlertRuleConfigPayload } from "@/types/api"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { DailyInsightsFeed } from "./daily-insights-feed"
import {
  AlertRuleDetailsDialog,
  formatRuleConditionsSummary,
  parseAlertRuleConfig,
} from "./alert-rule-details-dialog"

const severityOptions = ["All", "HIGH", "MEDIUM", "LOW"] as const
const TIMELINE_PAGE_SIZE = 25
const REQUIRES_ATTENTION_MARK_READ_CHUNK = 200

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

/** Initials for avatar; nếu chỉ có UUID thì lấy 2 ký tự đầu (bỏ dấu gạch). */
function ruleCreatorInitials(displayName: string, userId: string): string {
  const t = displayName.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    const compact = userId.replace(/-/g, "")
    return compact.length >= 2 ? compact.slice(0, 2).toUpperCase() : "?"
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0]
    const b = parts[parts.length - 1][0]
    if (a && b) return `${a}${b}`.toUpperCase()
  }
  if (parts.length === 1) {
    const p = parts[0]
    if (p.includes("@")) return p.slice(0, 2).toUpperCase()
    if (p.length >= 2) return p.slice(0, 2).toUpperCase()
    if (p.length === 1) return `${p[0]}`.toUpperCase()
  }
  const compact = userId.replace(/-/g, "")
  return compact.length >= 2 ? compact.slice(0, 2).toUpperCase() : "?"
}

function RuleCreatorAvatar({
  createdBy,
  lookup,
}: {
  createdBy: string
  lookup: Map<string, { name: string; avatarUrl?: string | null }>
}) {
  const info = lookup.get(createdBy.toLowerCase())
  const displayName = (info?.name?.trim() || createdBy).trim()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          tabIndex={0}
        >
          <Avatar className="h-8 w-8 border border-slate-200 bg-slate-50">
            <AvatarImage src={info?.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-[10px] font-semibold bg-slate-100 text-slate-700">
              {ruleCreatorInitials(displayName, createdBy)}
            </AvatarFallback>
          </Avatar>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm font-medium">{displayName}</p>
      </TooltipContent>
    </Tooltip>
  )
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

export type AlertCenterTab = "alerts" | "my-alerts" | "daily-insights"

export function AlertCenterContentV2() {
  const router = useRouter()
  const pathname = usePathname()
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
  const showMyAlertsTab = hasScreenFunction("s-alerts", "setting-my-alerts")
  const canCreateAlertRule = hasScreenFunction("s-alerts", "create-rule")
  const canEditAlertRule = hasScreenFunction("s-alerts", "edit-rule")
  const canDeleteAlertRule = hasScreenFunction("s-alerts", "delete-rule")
  const [centerTab, setCenterTab] = useState<AlertCenterTab>("alerts")
  const isMyAlertsTab = centerTab === "my-alerts"
  const rulesVisibilityForApi: "ORG" | "PRIVATE" = isMyAlertsTab ? "PRIVATE" : "ORG"

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "daily-insights") {
      setCenterTab(showDailyInsights ? "daily-insights" : "alerts")
      return
    }
    if (tab === "my-alerts") {
      setCenterTab(showMyAlertsTab ? "my-alerts" : "alerts")
      return
    }
    if (tab === "alerts") {
      setCenterTab("alerts")
      return
    }
    if (!tab) {
      setCenterTab("alerts")
    }
  }, [searchParams, showDailyInsights, showMyAlertsTab])

  useEffect(() => {
    if (centerTab === "my-alerts") setShowAiBuilder(false)
  }, [centerTab])

  useEffect(() => {
    if (centerTab !== "my-alerts" || showMyAlertsTab) return
    setCenterTab("alerts")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tab")
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname)
  }, [centerTab, showMyAlertsTab, pathname, router, searchParams])

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

  const { data: summary, refetch: refetchOpenAlertsSummary } = useApi(() => alertsApi.getOpenAlertsSummary(), {
    cacheKey: "alerts_open_summary_v2",
  })
  const { data: rules, refetch: refetchRules, loading: rulesLoading } = useApi(
    () => alertsApi.getAlertRules(undefined, rulesVisibilityForApi),
    {
      enabled: centerTab === "alerts" || (centerTab === "my-alerts" && showMyAlertsTab),
      cacheKey: `alert_rules_v2_${rulesVisibilityForApi}`,
    },
  )
  const { data: privateQuota, refetch: refetchPrivateQuota } = useApi(() => alertsApi.getPrivateAlertRuleQuota(), {
    enabled: centerTab === "my-alerts" && showMyAlertsTab,
    cacheKey: "alert_private_quota",
  })
  const privateSlotsFull = Boolean(isMyAlertsTab && privateQuota && privateQuota.used >= privateQuota.max)
  const { data: appsData } = useApi(() => structureApi.getApps(), {
    cacheKey: "alert_center_filter_apps",
  })
  const orgId = getCurrentUser()?.organization?.id
  const { data: orgUsersPage } = useApi(
    () => organizationsApi.getUsers(orgId!, { page: 1, pageSize: 500 }),
    {
      enabled: Boolean(orgId),
      cacheKey: orgId ? `org_users_alert_rule_creators_${orgId}` : "org_users_alert_rule_creators_skip",
    },
  )

  const ruleCreatorLookup = useMemo(() => {
    const m = new Map<string, { name: string; avatarUrl?: string | null }>()
    for (const u of orgUsersPage?.items ?? []) {
      if (!u.id) continue
      m.set(u.id.toLowerCase(), {
        name: u.fullName?.trim() || u.email || u.id,
        avatarUrl: u.avatarUrl,
      })
    }
    return m
  }, [orgUsersPage])

  const [requiresAttentionPage, setRequiresAttentionPage] = useState(1)
  const [requiresAttentionPageSize, setRequiresAttentionPageSize] = useState(10)
  const [markReadLoading, setMarkReadLoading] = useState(false)

  const canViewAlertCenter = useMemo(
    () => hasScreenFunction("s-alerts", "view") || hasScreenFunction("s-alerts", "setting-my-alerts"),
    [],
  )

  const apiListSeverity = severity === "All" ? undefined : severity
  const apiListAppId = appFilter.trim() || undefined

  const { data: openAlertsPage, loading, refetch } = useApi(
    () =>
      alertsApi.getOpenAlerts({
        page: requiresAttentionPage,
        pageSize: requiresAttentionPageSize,
        appId: apiListAppId,
        severity: apiListSeverity,
      }),
    {
      enabled: canViewAlertCenter && (centerTab === "alerts" || centerTab === "my-alerts"),
      cacheKey: `alert_center_v2_open_${centerTab}_${requiresAttentionPage}_${requiresAttentionPageSize}_${apiListAppId ?? ""}_${apiListSeverity ?? "all"}`,
    },
  )

  const uiAlerts = useMemo(
    () => toUiAlertList((openAlertsPage?.Data ?? []) as AlertApiItem[]),
    [openAlertsPage],
  )

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

  /** Tab My Alerts: chỉ alert gắn rule PRIVATE của user (danh sách rule đã fetch theo visibility=PRIVATE). */
  const privateRuleIdSet = useMemo(() => {
    if (!isMyAlertsTab) return null
    const ids = new Set<number>()
    for (const r of rules ?? []) {
      if (Number.isFinite(r.id)) ids.add(r.id)
    }
    return ids
  }, [isMyAlertsTab, rules])

  const filteredAlerts = useMemo(() => {
    if (isMyAlertsTab && rulesLoading) return []

    const fromD = filterDateFrom.trim() ? parseLocalYmdStart(filterDateFrom.trim()) : null
    const toD = filterDateTo.trim() ? parseLocalYmdEnd(filterDateTo.trim()) : null
    const ruleNum = filterRuleId !== "all" && filterRuleId.trim() !== "" ? Number(filterRuleId) : null

    return uiAlerts.filter((alert) => {
      if (isMyAlertsTab && privateRuleIdSet) {
        if (alert.alertRuleId == null || !privateRuleIdSet.has(alert.alertRuleId)) return false
      }

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
  }, [
    uiAlerts,
    severity,
    appFilter,
    searchQuery,
    filterRuleId,
    filterDateFrom,
    filterDateTo,
    isMyAlertsTab,
    rulesLoading,
    privateRuleIdSet,
  ])

  const requiresAttentionTotalPages = Math.max(1, openAlertsPage?.TotalPages ?? 1)

  useEffect(() => {
    setRequiresAttentionPage(1)
  }, [severity, appFilter, searchQuery, filterRuleId, filterDateFrom, filterDateTo, isMyAlertsTab])

  useEffect(() => {
    setRequiresAttentionPage((p) => Math.min(Math.max(1, p), requiresAttentionTotalPages))
  }, [requiresAttentionTotalPages])

  const handleMarkRequiresAttentionAsRead = async () => {
    const ids = filteredAlerts.map((a) => a.numericId).filter((id) => Number.isFinite(id))
    if (ids.length === 0) return
    setMarkReadLoading(true)
    try {
      let updatedTotal = 0
      for (let i = 0; i < ids.length; i += REQUIRES_ATTENTION_MARK_READ_CHUNK) {
        const chunk = ids.slice(i, i + REQUIRES_ATTENTION_MARK_READ_CHUNK)
        const res = await alertsApi.markOpenAlertsViewed(chunk)
        updatedTotal += res.updated ?? 0
      }
      invalidateAlertCaches()
      toast({
        title: "Marked as read",
        description:
          updatedTotal > 0
            ? `${updatedTotal} alert(s) marked as read for this view.`
            : "No new read records (alerts may already be read).",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not mark alerts as read."
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setMarkReadLoading(false)
    }
  }

  const criticalCount = summary?.BySeverity?.HIGH ?? 0
  const warningCount = summary?.BySeverity?.MEDIUM ?? 0
  const infoCount = summary?.BySeverity?.LOW ?? 0
  const totalOpen = summary?.Total ?? 0

  const myAlertsSeverityCounts = useMemo(() => {
    if (!isMyAlertsTab) return null
    return {
      critical: filteredAlerts.filter((a) => a.severity === "critical").length,
      warning: filteredAlerts.filter((a) => a.severity === "warning").length,
      info: filteredAlerts.filter((a) => a.severity === "info").length,
    }
  }, [isMyAlertsTab, filteredAlerts])

  const triggeredNowAlerts = useMemo(
    () => uiAlerts.filter((a) => Date.now() - a.timestamp.getTime() <= 60 * 60000),
    [uiAlerts],
  )
  const triggeredTodayAlerts = useMemo(() => uiAlerts.filter((a) => isToday(a.timestamp)), [uiAlerts])
  const triggeredTodayCriticalCount = useMemo(
    () => triggeredTodayAlerts.filter((a) => a.severity === "critical").length,
    [triggeredTodayAlerts],
  )
  const triggeredTodayWarningCount = useMemo(
    () => triggeredTodayAlerts.filter((a) => a.severity === "warning").length,
    [triggeredTodayAlerts],
  )
  const triggeredTodayInfoCount = useMemo(
    () => triggeredTodayAlerts.filter((a) => a.severity === "info").length,
    [triggeredTodayAlerts],
  )
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
    invalidateCache("notification_open_alerts_in_app")
    invalidateCache("notification_open_alerts_all")
    invalidateCache("alerts_open_summary")
    invalidateCache("alerts_open_summary_v2")
    void refetchOpenAlertsSummary()
    void refetch()
  }

  const bumpTimeline = useCallback(() => setTimelineNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function loadFirstPage() {
      if (isMyAlertsTab) {
        setTimelineItems([])
        setTimelinePage(1)
        setTimelineHasMore(false)
        setTimelineTotalCount(0)
        timelineFetchLock.current = false
        setTimelineLoading(false)
        return
      }

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
  }, [timelineQueryParams, timelineNonce, isMyAlertsTab])

  const loadMoreTimeline = useCallback(async () => {
    if (isMyAlertsTab) return
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
  }, [timelineQueryParams, timelineHasMore, timelineLoading, timelineLoadingMore, timelinePage, isMyAlertsTab])

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
    invalidateCache("alert_rules_v2_ORG")
    invalidateCache("alert_rules_v2_PRIVATE")
    invalidateCache("alert_private_quota")
    invalidateCache("alert_rules_all")
    invalidateCache("alert_rules_enabled")
    invalidateCache("alert_rules_disabled")
    await refetchRules()
    void refetchPrivateQuota()
  }

  const openOverviewEdit = (rule: AlertRule) => {
    if (!canEditAlertRule) return
    setManualEditRule(rule)
    setShowManualCreator(true)
  }

  const handleOverviewToggle = async (rule: AlertRule) => {
    setOverviewTogglingId(rule.id)
    try {
      await alertsApi.toggleAlertRule(rule.id)
      invalidateCache("alert_rules_v2_ORG")
      invalidateCache("alert_rules_v2_PRIVATE")
      invalidateCache("alert_private_quota")
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
      invalidateCache("alert_rules_v2_ORG")
      invalidateCache("alert_rules_v2_PRIVATE")
      invalidateCache("alert_private_quota")
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
      invalidateCache("alert_rules_v2_ORG")
      invalidateCache("alert_rules_v2_PRIVATE")
      invalidateCache("alert_private_quota")
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

  const headerBreadcrumb = isMyAlertsTab
    ? "Alerts & Insights > My Alerts"
    : "Alerts & Insights > Alert Center"
  const headerTitle = isMyAlertsTab ? "My Alerts" : "Alert Center"
  const headerTagline = isMyAlertsTab
    ? privateQuota
      ? `Your personal alert rules — ${privateQuota.used} of ${privateQuota.max} slots used`
      : "Your personal alert rules"
    : "Real-time monitoring across 200+ apps"

  const handleCenterTabChange = useCallback(
    (value: string) => {
      const next = value as AlertCenterTab
      if (next === "daily-insights" && !showDailyInsights) return
      if (next === "my-alerts" && !showMyAlertsTab) return
      setCenterTab(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === "alerts") {
        params.delete("tab")
      } else {
        params.set("tab", next)
      }
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname)
    },
    [pathname, router, searchParams, showDailyInsights, showMyAlertsTab],
  )

  const alertsPanel = (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-2">{headerBreadcrumb}</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {headerTitle}
            <span className="text-amber-500 text-3xl">.</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">{headerTagline}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isMyAlertsTab && canCreateAlertRule ? (
            <Button
              className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setShowAiBuilder(true)}
            >
              Create Alert via AI
            </Button>
          ) : null}
          {canCreateAlertRule ? (
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent"
              disabled={privateSlotsFull}
              onClick={() => {
                setManualEditRule(null)
                setShowManualCreator(true)
              }}
            >
              {isMyAlertsTab ? <Plus className="w-4 h-4" /> : null}
              {isMyAlertsTab ? "Create Manually" : "Create Manual Alert"}
            </Button>
          ) : null}
          {!isMyAlertsTab ? (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAlertRulesPanelOpen(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {isMyAlertsTab ? (
        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="font-semibold text-slate-900">Alert Slots Used</span>
              <span className="text-sm text-slate-500 shrink-0">
                {privateQuota ? `${privateQuota.remaining} remaining` : "—"}
              </span>
            </div>
            <div className="[&_[data-slot=progress-indicator]]:bg-indigo-600 [&_[data-slot=progress]]:bg-slate-100">
              <Progress
                className="h-2.5"
                value={
                  privateQuota && privateQuota.max > 0
                    ? Math.min(100, Math.round((privateQuota.used / privateQuota.max) * 100))
                    : 0
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              {privateQuota
                ? `${privateQuota.used} of ${privateQuota.max} slots used`
                : "Loading slot usage…"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                {triggeredTodayCriticalCount} red • {triggeredTodayWarningCount} yellow • {triggeredTodayInfoCount} blue
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
      )}

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
                      <TableHead className="hidden md:table-cell max-w-[11rem]">Created by</TableHead>
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
                          <TableCell className="hidden md:table-cell max-w-[11rem]">
                            {rule.createdBy ? (
                              <RuleCreatorAvatar createdBy={rule.createdBy} lookup={ruleCreatorLookup} />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
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
                              {canEditAlertRule ? (
                                <Switch
                                  checked={rule.isEnabled}
                                  disabled={overviewTogglingId === rule.id}
                                  onCheckedChange={() => void handleOverviewToggle(rule)}
                                />
                              ) : null}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => setDetailsRule(rule)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </Button>
                              {canEditAlertRule ? (
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
                              ) : null}
                              {canEditAlertRule ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => openOverviewEdit(rule)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {canDeleteAlertRule ? (
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
                              ) : null}
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            Requires Attention
            <Badge className="bg-red-100 text-red-700">{openAlertsPage?.TotalCount ?? filteredAlerts.length}</Badge>
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-slate-300 bg-white"
            title="Mark all alerts that match the current filters as read (in-app)."
            onClick={() => void handleMarkRequiresAttentionAsRead()}
            disabled={markReadLoading || filteredAlerts.length === 0}
          >
            {markReadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Mark as read
          </Button>
        </div>

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
                  <CardContent className="p-6">
                    <div className="flex gap-3">
                      <AlertAppAvatar
                        appIconUri={alert.appIconUri}
                        appDisplayName={alert.appLabel}
                        appId={alert.appId}
                        severity={alert.severity}
                        size="md"
                      />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">{alert.title}</span>
                          <span className="text-xs text-slate-500 shrink-0">
                            Triggered {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {alert.value != null ? (
                            <span className="font-mono text-sm text-red-600">
                              {alert.metricLabel}: {alert.value.toFixed(2)}
                              {alert.threshold != null ? ` (threshold ${alert.threshold.toFixed(2)})` : ""}
                            </span>
                          ) : null}
                        </div>

                        {alert.slackFinance ? <AlertSlackFinanceRow fin={alert.slackFinance} /> : null}

                        <p className="text-sm text-slate-600">{alert.description}</p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent"
                            onClick={() => handleAcknowledge(alert.numericId)}
                            disabled={actionLoading != null}
                          >
                            {actionLoading?.id === alert.numericId && actionLoading.type === "ack"
                              ? "Acknowledging..."
                              : "Acknowledge"}
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
                            {actionLoading?.id === alert.numericId && actionLoading.type === "resolve"
                              ? "Resolving..."
                              : "Resolve"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {openAlertsPage && openAlertsPage.TotalCount > 0 ? (
              <Pagination
                currentPage={requiresAttentionPage}
                totalPages={requiresAttentionTotalPages}
                totalItems={openAlertsPage.TotalCount}
                pageSize={requiresAttentionPageSize}
                onPageChange={setRequiresAttentionPage}
                onPageSizeChange={(size) => {
                  setRequiresAttentionPageSize(size)
                  setRequiresAttentionPage(1)
                }}
                itemName="alerts"
              />
            ) : null}
          </div>
        )}
      </div>

      {!isMyAlertsTab ? (
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
      ) : null}

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
          {myAlertsSeverityCounts ? myAlertsSeverityCounts.critical : criticalCount} Critical
        </Badge>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
          {myAlertsSeverityCounts ? myAlertsSeverityCounts.warning : warningCount} Warning
        </Badge>
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
          {myAlertsSeverityCounts ? myAlertsSeverityCounts.info : infoCount} Info
        </Badge>
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={centerTab} onValueChange={handleCenterTabChange} className="w-full">
        <TabsList className="h-10 w-fit bg-slate-100 p-1 mb-2">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          {showMyAlertsTab ? <TabsTrigger value="my-alerts">My Alerts</TabsTrigger> : null}
          {showDailyInsights ? (
            <TabsTrigger value="daily-insights" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Insights
            </TabsTrigger>
          ) : null}
        </TabsList>
        {(centerTab === "alerts" || (centerTab === "my-alerts" && showMyAlertsTab)) && (
          <div className="mt-0 flex flex-col gap-6">{alertsPanel}</div>
        )}
        {showDailyInsights ? (
          <TabsContent value="daily-insights" className="mt-6">
            <DailyInsightsFeed />
          </TabsContent>
        ) : null}
      </Tabs>

      <AIAlertBuilderSheet
        open={showAiBuilder && canCreateAlertRule}
        onOpenChange={(open) => {
          if (open && !canCreateAlertRule) return
          setShowAiBuilder(open)
        }}
        onCreated={handleRuleCreated}
        ruleVisibility={isMyAlertsTab && showMyAlertsTab ? "PRIVATE" : "ORG"}
      />
      <ManualAlertCreatorModal
        open={showManualCreator}
        onOpenChange={(open) => {
          if (open && manualEditRule == null && !canCreateAlertRule) return
          if (open && manualEditRule != null && !canEditAlertRule) return
          setShowManualCreator(open)
          if (!open) setManualEditRule(null)
        }}
        onCreated={handleRuleCreated}
        rule={manualEditRule}
        ruleVisibility={isMyAlertsTab && showMyAlertsTab ? "PRIVATE" : "ORG"}
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

