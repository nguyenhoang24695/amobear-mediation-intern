"use client"

import type React from "react"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
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
import {
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Check,
  GripVertical,
  Trash2,
  Undo2,
  Plus,
  Lock,
  AlertCircle,
  RotateCcw,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { structureApi, waterfallManagementApi, waterfallRecommendationSettingsApi } from "@/lib/api/services"
import { buildActivityLogsHref } from "@/lib/activity-logs"
import type { AdUnit, App, WaterfallRecommendationRuleGroupDto } from "@/types/api"
import { AddAdSourceModal } from "../modals/add-ad-source-modal"
import type { ApplyDirectChanges } from "../modals/apply-variant-modal"
import { Loader2, Save, RefreshCw, Settings } from "lucide-react"

interface WaterfallOptimizationTabProps {
  onRunABTest: () => void
  /** Called with real changes + mediationGroupId to open the Apply Direct modal. */
  onApplyDirect: (changes: ApplyDirectChanges, mediationGroupId: string) => void
  hasRunningTest: boolean
  testDay: number
  testDuration: number
  /** Incremented after successful Apply/Sync so the tab refetches group detail + recommendations. */
  refreshKey?: number
}

interface WaterfallSource {
  id: string
  name: string
  floor: number
  ecpm: number
  status: "active" | "inactive"
  // Track changes
  originalFloor?: number
  changeType?: "modified" | "new" | "removed"
  network?: string
  revenue30Days?: number | null
  admobNetworkWaterfallAdUnitId?: string
  /** 8-Rule recommendation: REMOVE | TEST | REDUCE | KEEP | INCREASE | ADD LAYER | ADD HIGHER */
  recommendationAction?: string
  /** Recommendation reason returned by the API (shown as tooltip for Suggested). */
  reason?: string
  /** SoW % (0–100) từ recommendation — hiển thị trong tooltip để debug. */
  sowPercent?: number
  /** Match rate % (0–100) từ recommendation — hiển thị trong tooltip để debug. */
  matchRatePercent?: number | null
}

interface BiddingSource {
  id: string
  name: string
  floor: number | null
  status: "active" | "inactive"
  ecpm7d: number
  changeType?: "new" | "removed"
}

export function WaterfallOptimizationTab({
  onRunABTest,
  onApplyDirect,
  hasRunningTest,
  testDay,
  testDuration,
  refreshKey = 0,
}: WaterfallOptimizationTabProps) {
  const params = useParams()
  const { toast } = useToast()
  const manualReorderEnabled = false
  const manualStatusToggleEnabled = false
  const biddingEditingEnabled = false
  const abTestingEnabled = false
  const mediationGroupIdFromParams = (params as { id?: string })?.id as string | undefined
  const hasValidId = !!mediationGroupIdFromParams

  const { data: groupDetail, loading: loadingDetail, refetch: refetchGroupDetail } = useApi(
    () => structureApi.getMediationGroupByAdMobId(mediationGroupIdFromParams!),
    { enabled: hasValidId, cacheKey: hasValidId ? `mediation_group_detail_${mediationGroupIdFromParams}` : undefined }
  )

  const mediationGroupId = (groupDetail as { mediationGroupId?: string } | undefined)?.mediationGroupId ?? mediationGroupIdFromParams ?? ""
  const appIdFromDetail = (groupDetail as { appId?: number; AppId?: number } | undefined)?.appId ?? (groupDetail as { AppId?: number })?.AppId
  const appAdMobIdFromDetail = (groupDetail as { appAdMobId?: string; AppAdMobId?: string } | undefined)?.appAdMobId ?? (groupDetail as { AppAdMobId?: string })?.AppAdMobId
  const appName = (groupDetail as { appName?: string; AppName?: string } | undefined)?.appName ?? (groupDetail as { AppName?: string })?.AppName
  const appIconUri = (groupDetail as { appIconUri?: string; AppIconUri?: string } | undefined)?.appIconUri ?? (groupDetail as { AppIconUri?: string })?.AppIconUri
  const platform = (groupDetail as { platform?: string; Platform?: string } | undefined)?.platform ?? (groupDetail as { Platform?: string })?.Platform

  /** Extract the AdMob app id prefix from adUnitMappings keys (ca-app-pub-xxx/unitId) when detail API does not return appAdMobId. */
  const derivedAppAdMobIdFromMappings = useMemo(() => {
    const rawLines = (groupDetail as { mediationGroupLines?: unknown; MediationGroupLines?: unknown })?.mediationGroupLines
      ?? (groupDetail as { MediationGroupLines?: unknown })?.MediationGroupLines
    if (typeof rawLines !== "object" || rawLines === null) return undefined
    const lines = Array.isArray(rawLines) ? rawLines : Object.values(rawLines as Record<string, unknown>)
    for (const line of lines) {
      const mappings = (line as { adUnitMappings?: Record<string, string>; AdUnitMappings?: Record<string, string> })?.adUnitMappings
        ?? (line as { AdUnitMappings?: Record<string, string> })?.AdUnitMappings
      if (!mappings) continue
      const firstKey = Object.keys(mappings)[0]
      if (firstKey?.includes("/")) return firstKey.split("/")[0]
    }
    return undefined
  }, [groupDetail])

  const appAdMobId = appAdMobIdFromDetail ?? derivedAppAdMobIdFromMappings

  /** Resolve the app (internal id) when appAdMobId exists, from detail or adUnitKey, so getAppAdUnits(app.id) can be called. */
  const { data: appByAdMobId } = useApi(
    () => structureApi.getAppByAppId(appAdMobId!),
    { enabled: !!appAdMobId && appIdFromDetail == null, cacheKey: appAdMobId && !appIdFromDetail ? `app_by_appid_${appAdMobId}` : undefined }
  )
  const effectiveAppId = appIdFromDetail ?? (appByAdMobId as App | undefined)?.id ?? (appByAdMobId as { Id?: number })?.Id

  /** Fetch app Ad Unit details to show the correct DisplayName. Always enabled when effectiveAppId is available. */
  const { data: appAdUnits, loading: loadingAppAdUnits } = useApi(
    () => structureApi.getAppAdUnits(effectiveAppId!),
    { enabled: !!effectiveAppId, cacheKey: effectiveAppId != null ? `app_ad_units_${effectiveAppId}` : undefined }
  )
  /** Ad units inside the mediation group, extracted from mediationGroupLines (list/array or object) via each line.adUnitMappings entry. */
  const mediationAdUnitsFromMappings = useMemo(() => {
    const rawLines = (groupDetail as { mediationGroupLines?: unknown; MediationGroupLines?: unknown })?.mediationGroupLines
      ?? (groupDetail as { MediationGroupLines?: unknown })?.MediationGroupLines
    if (typeof rawLines !== "object" || rawLines === null) return []
    type LineShape = {
      id?: string
      displayName?: string
      adSourceId?: string
      cpmMicros?: string
      state?: string
      adUnitMappings?: Record<string, string>
      AdUnitMappings?: Record<string, string>
    }
    // The API may return a list (array) or an object (key = line id); iterate through every line.
    const lineList: LineShape[] = Array.isArray(rawLines)
      ? (rawLines as LineShape[])
      : Object.values(rawLines as Record<string, LineShape>)
    const seen = new Set<string>()
    const result: { adUnitKey: string; unitId: string; lineDisplayName?: string; cpmFloor?: number }[] = []
    for (const line of lineList) {
      if (!line || typeof line !== "object") continue
      const mappings = line.adUnitMappings ?? line.AdUnitMappings ?? {}
      const lineDisplayName = line.displayName ?? (line as { DisplayName?: string }).DisplayName
      const cpmMicros = line.cpmMicros ?? (line as { CpmMicros?: string }).CpmMicros
      const cpmFloor = cpmMicros != null && cpmMicros !== "" ? parseInt(String(cpmMicros), 10) / 1_000_000 : undefined
      for (const adUnitKey of Object.keys(mappings)) {
        if (seen.has(adUnitKey)) continue
        seen.add(adUnitKey)
        const unitId = adUnitKey.includes("/") ? adUnitKey.split("/").slice(-1)[0]! : adUnitKey
        result.push({ adUnitKey, unitId, lineDisplayName, cpmFloor })
      }
    }
    return result
  }, [groupDetail])

  /** Build adUnitKey values from mediationGroupLines so API responses can be filtered to only the mediation group's ad units. */
  const mediationAdUnitKeySet = useMemo(
    () => new Set(mediationAdUnitsFromMappings.map((u) => u.adUnitKey)),
    [mediationAdUnitsFromMappings]
  )

  /** Ad unit details from getAppAdUnits: keep only adUnitIds present in mediationGroupLines and map adUnitKey -> displayName, adFormat, ecpm. */
  const adUnitDetailsByKey = useMemo(() => {
    const list = (appAdUnits as (AdUnit & { DisplayName?: string; AdUnitId?: string })[] | undefined) ?? []
    const map: Record<string, { displayName: string; adFormat?: string; ecpm?: number }> = {}
    for (const u of list) {
      const adUnitKey = (u.adUnitId ?? u.AdUnitId)?.trim()
      if (!adUnitKey || !mediationAdUnitKeySet.has(adUnitKey)) continue
      const displayName = (u.displayName ?? u.DisplayName ?? u.name)?.trim() || ""
      const ecpm = u.ecpm != null ? Number(u.ecpm) : undefined
      map[adUnitKey] = { displayName: displayName || adUnitKey, adFormat: u.adFormat, ecpm }
    }
    return map
  }, [appAdUnits, mediationAdUnitKeySet])

  const [selectedAdUnitIds, setSelectedAdUnitIds] = useState<string[]>([])
  const [adUnitsPageSize, setAdUnitsPageSize] = useState(15)
  const [adUnitsPage, setAdUnitsPage] = useState(1)

  // Rule Groups: fetch all rule groups and the app's current mapping.
  const { data: ruleGroupsData } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRuleGroups(),
    { cacheKey: "all_rule_groups" }
  )
  const ruleGroups = (ruleGroupsData ?? []) as WaterfallRecommendationRuleGroupDto[]

  const { data: appRuleGroupMapping, refetch: refetchAppRuleGroupMapping } = useApi(
    () => waterfallRecommendationSettingsApi.getAppRuleGroupMapping(mediationGroupId, "mediation_group"),
    { enabled: !!mediationGroupId, cacheKey: mediationGroupId ? `mg_rule_group_${mediationGroupId}` : undefined }
  )

  const [selectedRuleGroupId, setSelectedRuleGroupId] = useState<number | null>(null)
  const [savingRuleGroup, setSavingRuleGroup] = useState(false)
  const [rerunningRecommendation, setRerunningRecommendation] = useState(false)
  const [ruleGroupChanged, setRuleGroupChanged] = useState(false)

  // Sync selectedRuleGroupId khi appRuleGroupMapping load xong
  useEffect(() => {
    if (appRuleGroupMapping) {
      setSelectedRuleGroupId(
        appRuleGroupMapping.effectiveGroupId ?? appRuleGroupMapping.groupId ?? null
      )
      setRuleGroupChanged(false)
    }
  }, [appRuleGroupMapping])

  const handleRuleGroupChange = (value: string) => {
    const newGroupId = value === "none" ? null : parseInt(value, 10)
    setSelectedRuleGroupId(newGroupId)
    setRuleGroupChanged(newGroupId !== (appRuleGroupMapping?.groupId ?? null))
  }

  const handleSaveRuleGroup = async () => {
    if (!mediationGroupId) return
    setSavingRuleGroup(true)
    try {
      await waterfallRecommendationSettingsApi.updateAppRuleGroupMapping(
        mediationGroupId,
        selectedRuleGroupId,
        "mediation_group"
      )
      await refetchAppRuleGroupMapping()
      setRuleGroupChanged(false)
    } catch (err) {
      console.error("Failed to save rule group mapping:", err)
    } finally {
      setSavingRuleGroup(false)
    }
  }

  const handleRerunRecommendation = async () => {
    if (!mediationGroupId) return
    setRerunningRecommendation(true)
    try {
      await waterfallRecommendationSettingsApi.rerunRecommendation(mediationGroupId, selectedRuleGroupId)
      await refetchRecommendations()
      // Increment forceRefreshKey to force optimizedWaterfall re-initialization with fresh data.
      setForceRefreshKey((k) => k + 1)
    } catch (err) {
      console.error("Failed to rerun recommendation:", err)
    } finally {
      setRerunningRecommendation(false)
    }
  }

  // Recommendations: do not pass start/end/min so the server uses default 7d + 3% + 0.9% and returns cached data. Do not call SoWData separately; ecpmByAdSourceId comes from recommendations.
  const { data: recommendationsResponse, refetch: refetchRecommendations } = useApi(
    () => structureApi.getMediationGroupRecommendationsByAdMobId(mediationGroupIdFromParams!),
    {
      enabled: hasValidId && !!mediationGroupIdFromParams,
      cacheKey: hasValidId ? `mg_recommendations_${mediationGroupIdFromParams}` : undefined,
    }
  )
  const recommendations = recommendationsResponse?.recommendations ?? []
  const { data: applyPolicy, loading: loadingPolicy, refetch: refetchPolicy } = useApi(
    () => waterfallManagementApi.getPolicy(mediationGroupId),
    {
      enabled: !!mediationGroupId,
      cacheKey: mediationGroupId ? `waterfall_apply_policy_${mediationGroupId}` : undefined,
    }
  )
  const DEFAULT_POLICY_INTERVAL_DAYS = 7
  const MIN_POLICY_INTERVAL_DAYS = 1
  const MAX_POLICY_INTERVAL_DAYS = 30

  const parsePolicyIntervalDays = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed < MIN_POLICY_INTERVAL_DAYS || parsed > MAX_POLICY_INTERVAL_DAYS) {
      return null
    }
    return parsed
  }

  const formatPolicyIntervalLabel = (intervalDays: number): string => {
    return `${intervalDays}-day${intervalDays === 1 ? "" : "s"}`
  }

  const [policyApplyMode, setPolicyApplyMode] = useState<string>("manual")
  const [policyIntervalDays, setPolicyIntervalDays] = useState(String(DEFAULT_POLICY_INTERVAL_DAYS))
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [policyConfirmOpen, setPolicyConfirmOpen] = useState(false)

  const currentSetupHeaderClassName = "border-b border-border bg-[#00BAA7] p-4 text-white dark:bg-[#134E4A]"
  const optimizedHeaderClassName = "bg-[#B922FF] p-4 text-white dark:bg-[#4C1D95]"

  useEffect(() => {
    if (applyPolicy?.applyMode) {
      setPolicyApplyMode(applyPolicy.applyMode)
      setPolicyIntervalDays(String(applyPolicy.intervalDays ?? DEFAULT_POLICY_INTERVAL_DAYS))
    }
  }, [applyPolicy])

  const parsedPolicyIntervalDays = useMemo(() => parsePolicyIntervalDays(policyIntervalDays), [policyIntervalDays])
  const currentPolicyIntervalDays = applyPolicy?.intervalDays ?? DEFAULT_POLICY_INTERVAL_DAYS
  const hasPolicyChanges = !!applyPolicy && (
    policyApplyMode !== applyPolicy.applyMode
    || (policyApplyMode !== "manual"
      && parsedPolicyIntervalDays != null
      && parsedPolicyIntervalDays !== currentPolicyIntervalDays)
  )

  // Refetch group detail + recommendations when Apply/Sync succeeds (parent increments refreshKey).
  useEffect(() => {
    if (refreshKey > 0 && hasValidId) {
      void refetchGroupDetail()
      void refetchRecommendations()
      void refetchPolicy()
    }
  }, [refreshKey, hasValidId, refetchGroupDetail, refetchRecommendations, refetchPolicy])

  /** Last updated time from group detail, shown in the Current column. */
  const updatedAt = useMemo(() => {
    const d = groupDetail as { updatedAt?: string } | undefined
    return d?.updatedAt
  }, [groupDetail])

  const formatUpdatedAt = (iso: string | undefined): string => {
    if (!iso) return "â€”"
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
    } catch {
      return iso
    }
  }

  const _formatPolicyDueAtLegacy = (iso: string | undefined): string => {
    if (!iso) return "Ã¢â‚¬â€"
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  void _formatPolicyDueAtLegacy

  const formatPolicyDueAtGmt7 = (iso: string | undefined): string => {
    if (!iso) return "-"
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  const formatPolicyModeLabel = (mode: string | undefined): string => {
    switch (mode) {
      case "semi_auto":
        return "semi-auto"
      case "auto":
        return "automatic"
      default:
        return "manual"
    }
  }

  const buildPolicyConfirmContent = (
    fromMode: string | undefined,
    toMode: string,
    intervalDays: number | null,
    currentIntervalDaysValue: number,
  ) => {
    const fromLabel = formatPolicyModeLabel(fromMode)
    const intervalLabel = formatPolicyIntervalLabel(intervalDays ?? currentIntervalDaysValue)

    if (toMode === "auto") {
      if (fromMode === "auto") {
        return {
          title: "Update automatic interval?",
          description: `Do you want to update the automatic apply interval for this mediation group to ${intervalLabel}? The system will use the new interval for the next due cycle and still apply actionable waterfall changes automatically when due.`,
          confirmLabel: "Update Auto Interval",
        }
      }

      return {
        title: "Switch to automatic mode?",
        description: `Do you want to switch this mediation group from ${fromLabel} mode to automatic mode with a ${intervalLabel} interval? The system will apply actionable waterfall changes automatically when that cycle reaches its due date.`,
        confirmLabel: "Switch to Auto",
      }
    }

    if (toMode === "semi_auto") {
      if (fromMode === "semi_auto") {
        return {
          title: "Update semi-auto interval?",
          description: `Do you want to update the semi-auto interval for this mediation group to ${intervalLabel}? The system will use the new interval for the next due cycle and create alerts without auto-applying waterfall changes.`,
          confirmLabel: "Update Semi-auto Interval",
        }
      }

      return {
        title: "Switch to semi-auto mode?",
        description: `Do you want to switch this mediation group from ${fromLabel} mode to semi-auto mode with a ${intervalLabel} interval? The system will create an alert when that cycle reaches its due date, but it will not apply waterfall changes automatically.`,
        confirmLabel: "Switch to Semi-auto",
      }
    }

    return {
      title: "Switch to manual mode?",
      description: `Do you want to switch this mediation group from ${fromLabel} mode to manual mode? Automatic apply and due alerts for this policy will stop until the mode is changed again. The current interval setting will be kept for future re-enable.` ,
      confirmLabel: "Switch to Manual",
    }
  }

  const openPolicyConfirm = () => {
    if (!mediationGroupId || !applyPolicy || !hasPolicyChanges || savingPolicy) return

    if (policyApplyMode !== "manual" && parsedPolicyIntervalDays == null) {
      toast({
        title: "Invalid interval",
        description: `Interval must be a whole number between ${MIN_POLICY_INTERVAL_DAYS} and ${MAX_POLICY_INTERVAL_DAYS}.`,
        variant: "destructive",
      })
      return
    }

    setPolicyConfirmOpen(true)
  }

  const savePolicy = async () => {
    if (!mediationGroupId || !applyPolicy || !hasPolicyChanges) return
    if (policyApplyMode !== "manual" && parsedPolicyIntervalDays == null) return

    setSavingPolicy(true)
    try {
      await waterfallManagementApi.updatePolicy(mediationGroupId, {
        applyMode: policyApplyMode,
        intervalDays: policyApplyMode === "manual" ? null : parsedPolicyIntervalDays,
      })
      await refetchPolicy()
      setPolicyConfirmOpen(false)
      toast({
        title: "Policy saved",
        description: policyApplyMode === "manual"
          ? `Apply policy updated to ${policyApplyMode.replace("_", "-")}.`
          : `Apply policy updated to ${policyApplyMode.replace("_", "-")} with a ${formatPolicyIntervalLabel(parsedPolicyIntervalDays ?? currentPolicyIntervalDays)} interval.`,
      })
    } catch (err) {
      console.error("Failed to update waterfall apply policy:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update waterfall apply policy.",
        variant: "destructive",
      })
    } finally {
      setSavingPolicy(false)
    }
  }

  const policyConfirmContent = buildPolicyConfirmContent(
    applyPolicy?.applyMode,
    policyApplyMode,
    parsedPolicyIntervalDays,
    currentPolicyIntervalDays,
  )

  // eCPM by adSourceId comes from recommendations (observedEcpm); no separate SoWData API call.
  const ecpmByAdSourceId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of recommendations) {
      const ecpm = r.observedEcpm != null ? Number(r.observedEcpm) : null
      if (ecpm != null && ecpm > 0 && (!map[r.adSourceId] || ecpm > (map[r.adSourceId] ?? 0))) {
        map[r.adSourceId] = ecpm
      }
    }
    return map
  }, [recommendations])

  // Match rate (%) by adSourceId comes from recommendations (matchRatePercent) as fallback when the API does not return match rate per line.
  const matchRateByAdSourceId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of recommendations) {
      const mr = r.matchRatePercent != null ? Number(r.matchRatePercent) : null
      if (mr != null && !Number.isNaN(mr) && r.adSourceId) {
        map[r.adSourceId] = mr
      }
    }
    return map
  }, [recommendations])

  // Match rate (%) from mediation group detail API (StarRocks bronze.mediation_table) takes priority over recommendations.
  const matchRateFromMediationLines = useMemo(() => {
    const rawLines = (groupDetail as { mediationGroupLines?: unknown; MediationGroupLines?: unknown })?.mediationGroupLines
      ?? (groupDetail as { MediationGroupLines?: unknown })?.MediationGroupLines
    if (typeof rawLines !== "object" || rawLines === null) return { byLineId: {} as Record<string, number>, byAdSourceId: {} as Record<string, number> }
    const byLineId: Record<string, number> = {}
    const byAdSourceId: Record<string, number> = {}
    const entries = Array.isArray(rawLines) ? (rawLines as unknown[]).map((v, i) => [String(i), v]) : Object.entries(rawLines as Record<string, unknown>)
    for (const [key, line] of entries) {
      const keyStr = String(key)
      const row = line as { id?: string; adSourceId?: string; matchRatePercent?: number; MatchRatePercent?: number }
      const mr = row?.matchRatePercent ?? row?.MatchRatePercent
      const num = mr != null ? Number(mr) : NaN
      if (!Number.isNaN(num)) {
        const lineId: string = typeof row?.id === "string" ? row.id : keyStr
        if (lineId) byLineId[lineId] = num
        const adSourceId = typeof row?.adSourceId === "string" ? row.adSourceId : ""
        if (adSourceId) byAdSourceId[adSourceId] = num
      }
    }
    return { byLineId, byAdSourceId }
  }, [groupDetail])

  // Build from mediation_group_lines_json (PostgreSQL) using the Dolphin 2.0 format.
  const currentSetup = useMemo(() => {
    const detail = groupDetail as {
      mediationGroupLines?: Record<
        string,
        { id?: string; displayName?: string; adSourceId?: string; cpmMode?: string; cpmMicros?: string; state?: string }
      >
      totalRevenue7Days?: number
      revenue?: number
    } | undefined
    if (!detail) {
      return {
        bidding: [] as BiddingSource[],
        waterfall: [] as WaterfallSource[],
        estimatedMonthly: 0,
      }
    }
    const rawLines = (detail as { mediationGroupLines?: unknown; MediationGroupLines?: unknown }).mediationGroupLines
      ?? (detail as { MediationGroupLines?: unknown }).MediationGroupLines
      ?? {}
    const linesObj = typeof rawLines === "object" && rawLines !== null
      ? (rawLines as Record<string, {
        id?: string
        displayName?: string
        adSourceId?: string
        cpmMicros?: string
        state?: string
        admobNetworkWaterfallAdUnitId?: string
        AdmobNetworkWaterfallAdUnitId?: string
        revenue30Days?: number
        Revenue30Days?: number
      }>)
      : {}
    const entries = Object.entries(linesObj)

    // Bidding: lines do not have cpmMicros, matching Dolphin's BiddingTable behavior.
    const biddingList: BiddingSource[] = entries
      .filter(([, line]) => !line.cpmMicros || line.cpmMicros === "")
      .map(([key, line]) => ({
        id: line.id ?? key ?? `b_${line.adSourceId ?? ""}`,
        name: line.displayName ?? line.adSourceId ?? "Unknown",
        floor: null,
        status: line.state === "DISABLED" || line.state === "REMOVED" ? ("inactive" as const) : ("active" as const),
        ecpm7d: ecpmByAdSourceId[line.adSourceId ?? ""] ?? 0,
      }))

    // Original waterfall: derived only from mediation_group_lines_json; floor = cpmMicros/1e6 and id = AdMob key so Apply REMOVED works correctly.
    const waterfallList: WaterfallSource[] = entries
      .filter(([, line]) => line.cpmMicros != null && line.cpmMicros !== "")
      .sort(([, a], [, b]) => parseInt(b.cpmMicros ?? "0", 10) - parseInt(a.cpmMicros ?? "0", 10))
      .map(([key, line]) => {
        const cpmMicros = parseFloat(line.cpmMicros ?? "0") || 0
        const floor = cpmMicros / 1_000_000
        const revenue30Days = line.revenue30Days ?? line.Revenue30Days ?? null
        const admobNetworkWaterfallAdUnitId = line.admobNetworkWaterfallAdUnitId ?? line.AdmobNetworkWaterfallAdUnitId
        return {
          id: line.id ?? key ?? `w_${line.adSourceId ?? ""}`,
          name: line.displayName ?? line.adSourceId ?? "Unknown",
          floor,
          ecpm: floor, // Current reflects the JSON source; SoW eCPM is only used for recommendations in the Optimized column.
          status: line.state === "DISABLED" || line.state === "REMOVED" ? ("inactive" as const) : ("active" as const),
          network: line.adSourceId ?? "",
          revenue30Days,
          admobNetworkWaterfallAdUnitId,
        }
      })

    const rev7 = detail.totalRevenue7Days ?? detail.revenue ?? 0
    const estimatedMonthly = rev7 > 0 ? Math.round((rev7 * 30) / 7) : 0
    return { bidding: biddingList, waterfall: waterfallList, estimatedMonthly }
  }, [groupDetail, ecpmByAdSourceId])

  // Optimized (Suggested): derived only from API recommendations, without merging with Current.
  const recommendedWaterfall = useMemo(() => {
    if (recommendations.length === 0) return []
    const mapped = recommendations.map((r, i) => {
      const floor = (r.newFloorMicros ?? r.currentFloorMicros) / 1_000_000
      const originalFloor = r.currentFloorMicros / 1_000_000
      const isNewSuggestedLine = r.lineId.startsWith("suggested_")
      return {
        id: `rec_${r.lineId}_${i}`,
        name: r.displayName ?? r.adSourceId ?? "Unknown",
        floor,
        ecpm: r.observedEcpm ?? floor,
        status: r.action === "REMOVE" ? ("inactive" as const) : ("active" as const),
        originalFloor,
        changeType: isNewSuggestedLine ? ("new" as const) : r.action === "REMOVE" ? ("removed" as const) : r.action !== "KEEP" ? ("modified" as const) : undefined,
        network: r.adSourceId,
        recommendationAction: r.action,
        reason: r.reason,
        sowPercent: r.sowPercent,
        matchRatePercent: r.matchRatePercent,
      } satisfies WaterfallSource
    })
    return mapped.sort((a, b) => b.floor - a.floor)
  }, [recommendations])

  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [viewMode, setViewMode] = useState("side-by-side")
  const [showMode, setShowMode] = useState("all")
  const [currentBiddingOpen, setCurrentBiddingOpen] = useState(true)
  const [currentWaterfallOpen, setCurrentWaterfallOpen] = useState(true)
  const [optimizedBiddingOpen, setOptimizedBiddingOpen] = useState(true)
  const [optimizedWaterfallOpen, setOptimizedWaterfallOpen] = useState(true)

  const [optimizedBidding, setOptimizedBidding] = useState<BiddingSource[]>([])
  const [optimizedWaterfall, setOptimizedWaterfall] = useState<WaterfallSource[]>([])
  const [aiSuggestedWaterfall, setAiSuggestedWaterfall] = useState<WaterfallSource[]>([])
  const lastInitKey = useRef<string>("")
  const [forceRefreshKey, setForceRefreshKey] = useState(0)

  useEffect(() => {
    if (!hasValidId || !groupDetail) return
    const key = `${mediationGroupIdFromParams}_${recommendations.length}_${currentSetup.waterfall.length}_${forceRefreshKey}`
    if (lastInitKey.current === key) return
    lastInitKey.current = key
    setOptimizedBidding([...currentSetup.bidding])
    if (recommendedWaterfall.length > 0) {
      setOptimizedWaterfall([...recommendedWaterfall])
      setAiSuggestedWaterfall([...recommendedWaterfall])
    } else {
      setOptimizedWaterfall([])
      setAiSuggestedWaterfall([])
    }
  }, [mediationGroupIdFromParams, hasValidId, groupDetail, currentSetup.bidding, currentSetup.waterfall, recommendations.length, recommendedWaterfall, forceRefreshKey])

  // Editing state
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingFloorValue, setEditingFloorValue] = useState("")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Modal state
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false)
  const [addSourceType, setAddSourceType] = useState<"bidding" | "waterfall">("waterfall")

  // Check if user has made manual changes from AI suggestion
  const hasManualChanges = useCallback(() => {
    // Compare current optimized with AI suggested
    if (optimizedWaterfall.length !== aiSuggestedWaterfall.length) return true

    for (let i = 0; i < optimizedWaterfall.length; i++) {
      const current = optimizedWaterfall[i]
      const suggested = aiSuggestedWaterfall[i]
      if (!suggested) return true
      if (current.id !== suggested.id || current.floor !== suggested.floor || current.status !== suggested.status) {
        return true
      }
    }
    return optimizedWaterfall.some((s) => s.changeType === "new" || s.changeType === "removed")
  }, [optimizedWaterfall, aiSuggestedWaterfall])

  // Calculate change summary: added/removed based on recommendation vs current; modified from the optimized state.
  const calculateChanges = useCallback(() => {
    const modifiedFloors = optimizedWaterfall.filter((s) => s.changeType === "modified" && s.status !== "inactive")

    // Added: every source with changeType="new", whether it comes from a recommendation or was manually added by the user.
    const addedCount = optimizedWaterfall.filter((s) => s.changeType === "new").length

    // Removed: every current row that is no longer mapped into optimized (based on lineId rec_<id>_*),
    // whether caused by a recommendation REMOVE or manually marked removed by the user.
    const active = optimizedWaterfall.filter((s) => s.changeType !== "removed")
    const removedCount = currentSetup.waterfall.filter(
      (c) => !active.some((o) => o.id.startsWith(`rec_${c.id}_`)),
    ).length

    const avgFloorIncrease =
      modifiedFloors.length > 0
        ? modifiedFloors.reduce((sum, s) => sum + (s.floor - (s.originalFloor || 0)), 0) / modifiedFloors.length
        : 0

    // Recalculate estimated monthly based on changes
    const baseMonthly = currentSetup.estimatedMonthly
    const improvementFactor =
      1 + (avgFloorIncrease / 100) * 0.5 + addedCount * 0.02 - removedCount * 0.015
    const estimatedMonthly = Math.round(baseMonthly * improvementFactor)
    const improvement = ((estimatedMonthly - baseMonthly) / baseMonthly) * 100

    return {
      modifiedCount: modifiedFloors.length,
      addedCount,
      removedCount,
      avgFloorIncrease,
      estimatedMonthly,
      improvement: improvement.toFixed(1),
      hasChanges:
        modifiedFloors.length > 0 ||
        addedCount > 0 ||
        removedCount > 0,
    }
  }, [optimizedWaterfall, currentSetup.waterfall, currentSetup.estimatedMonthly])

  const changes = calculateChanges()

  /** Normalize network/title into adSourceId for the apply API (backend currently supports only "admob"). */
  const toAdSourceIdForApply = (network?: string): string => {
    if (!network) return "1215381445328257950"
    const n = network.toLowerCase()
    if (n === "admob" || n === "admob network") return "1215381445328257950"
    return network
  }

  /** Compute the real change set to pass into the Apply Direct popup (modified floors, added, removed). */
  const getApplyDirectChanges = useCallback((): ApplyDirectChanges => {
    const active = optimizedWaterfall.filter((s) => s.changeType !== "removed")

    const floorsModified = optimizedWaterfall
      .filter(
        (s) =>
          s.changeType !== "removed" &&
          s.changeType !== "new" &&
          s.originalFloor != null &&
          Math.abs(s.floor - s.originalFloor) > 1e-9,
      )
      .map((s) => {
        const match = s.id.match(/^rec_(.+)_\d+$/)
        const lineId = match ? match[1] : ""
        return { name: s.name, lineId, oldValue: s.originalFloor!, newValue: s.floor }
      })

    const sourcesAdded = optimizedWaterfall
      .filter((s) => s.changeType === "new")
      .map((s) => ({
        name: s.name,
        floor: s.floor,
        adSourceId: toAdSourceIdForApply(s.network),
      }))

    const sourcesRemoved = currentSetup.waterfall
      .filter((c) => !active.some((o) => o.id.startsWith(`rec_${c.id}_`)))
      .map((c) => ({ name: c.name, lineId: c.id }))

    const adUnits = mediationAdUnitsFromMappings.map((unit) => ({
      adUnitKey: unit.adUnitKey,
      displayName: adUnitDetailsByKey[unit.adUnitKey]?.displayName ?? unit.unitId,
    }))

    const selectedKeys = selectedAdUnitIds.length > 0
      ? selectedAdUnitIds
      : adUnits.map((unit) => unit.adUnitKey)

    return { floorsModified, sourcesAdded, sourcesRemoved, adUnits, selectedAdUnitKeys: selectedKeys }
  }, [optimizedWaterfall, currentSetup.waterfall, mediationAdUnitsFromMappings, adUnitDetailsByKey, selectedAdUnitIds])

  const handleApplyDirectClick = () => {
    onApplyDirect(getApplyDirectChanges(), mediationGroupId)
  }

  // Determine banner state
  const getBannerState = (): "optimization" | "running" | "optimized" | "unsaved" => {
    if (hasManualChanges() && changes.hasChanges) return "unsaved"
    if (hasRunningTest) return "running"
    if (changes.hasChanges) return "optimization"
    return "optimized"
  }

  const bannerState = getBannerState()

  // Handle inline eCPM floor editing
  const startEditing = (source: WaterfallSource) => {
    if (source.changeType === "removed") return
    setEditingFloorId(source.id)
    setEditingFloorValue(source.floor.toFixed(2))
  }

  const saveFloorEdit = (sourceId: string) => {
    const newFloor = Number.parseFloat(editingFloorValue)
    if (isNaN(newFloor) || newFloor <= 0) {
      setEditingFloorId(null)
      return
    }

    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          const originalFloor = source.originalFloor ?? source.floor
          const isModified = newFloor !== originalFloor
          return {
            ...source,
            floor: newFloor,
            originalFloor: source.changeType === "new" ? undefined : originalFloor,
            changeType: source.changeType === "new" ? "new" : isModified ? "modified" : undefined,
          }
        }
        return source
      }),
    )
    setEditingFloorId(null)
  }

  const cancelFloorEdit = () => {
    setEditingFloorId(null)
    setEditingFloorValue("")
  }

  // Handle keyboard events for editing
  const handleFloorKeyDown = (e: React.KeyboardEvent, sourceId: string) => {
    if (e.key === "Enter") {
      saveFloorEdit(sourceId)
    } else if (e.key === "Escape") {
      cancelFloorEdit()
    }
  }

  // Handle source removal (mark as removed, not actually delete)
  const markSourceRemoved = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return { ...source, changeType: "removed" }
        }
        return source
      }),
    )
  }

  // Undo removal
  const undoRemoval = (sourceId: string) => {
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          const isModified = source.originalFloor !== undefined && source.floor !== source.originalFloor
          return { ...source, changeType: isModified ? "modified" : undefined }
        }
        return source
      }),
    )
  }

  // Handle drag and drop reordering
  const handleDragStart = (e: React.DragEvent, sourceId: string) => {
    if (!manualReorderEnabled) {
      e.preventDefault()
      return
    }
    setDraggedItemId(sourceId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!manualReorderEnabled) return
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (!manualReorderEnabled) return
    if (draggedItemId !== null && dragOverIndex !== null) {
      const draggedIndex = optimizedWaterfall.findIndex((s) => s.id === draggedItemId)
      if (draggedIndex !== -1 && draggedIndex !== dragOverIndex) {
        const newWaterfall = [...optimizedWaterfall]
        const [draggedItem] = newWaterfall.splice(draggedIndex, 1)
        newWaterfall.splice(dragOverIndex, 0, draggedItem)
        setOptimizedWaterfall(newWaterfall)
      }
    }
    setDraggedItemId(null)
    setDragOverIndex(null)
  }

  // Handle adding new source
  const handleAddSource = (source: {
    type: "bidding" | "waterfall"
    network: string
    name: string
    floor: number
    status: "active" | "inactive"
  }) => {
    if (source.type === "waterfall") {
      const newSource: WaterfallSource = {
        id: `w_new_${Date.now()}`,
        name: source.name,
        floor: source.floor,
        ecpm: source.floor * 1.02, // Estimate
        status: source.status,
        network: source.network,
        changeType: "new",
      }
      setOptimizedWaterfall((prev) => [...prev, newSource])
    } else {
      const newSource: BiddingSource = {
        id: `b_new_${Date.now()}`,
        name: source.network,
        floor: null,
        status: source.status,
        ecpm7d: 0,
        changeType: "new",
      }
      setOptimizedBidding((prev) => [...prev, newSource])
    }
  }

  // Reset to AI suggestion
  const resetToAISuggestion = () => {
    setOptimizedWaterfall([...aiSuggestedWaterfall])
    setOptimizedBidding([...currentSetup.bidding])
  }

  // Discard all changes
  const discardAllChanges = () => {
    resetToAISuggestion()
  }

  // Toggle source status
  const toggleSourceStatus = (sourceId: string) => {
    if (!manualStatusToggleEnabled) return
    setOptimizedWaterfall((prev) =>
      prev.map((source) => {
        if (source.id === sourceId) {
          return { ...source, status: source.status === "active" ? "inactive" : "active" }
        }
        return source
      }),
    )
  }

  const activeWaterfall = optimizedWaterfall.filter((s) => s.changeType !== "removed")
  const currentAvgFloor =
    currentSetup.waterfall.length > 0
      ? currentSetup.waterfall.reduce((sum, s) => sum + s.floor, 0) / currentSetup.waterfall.length
      : 0
  const optimizedAvgFloor =
    activeWaterfall.length > 0 ? activeWaterfall.reduce((sum, s) => sum + s.floor, 0) / activeWaterfall.length : 0

  // Ad units pagination & selection (hooks must run before any return).
  const paginatedAdUnits = useMemo(() => {
    const list = mediationAdUnitsFromMappings
    const start = (adUnitsPage - 1) * adUnitsPageSize
    return list.slice(start, start + adUnitsPageSize)
  }, [mediationAdUnitsFromMappings, adUnitsPage, adUnitsPageSize])
  const totalAdUnits = mediationAdUnitsFromMappings.length
  const totalAdUnitsPages = Math.max(1, Math.ceil(totalAdUnits / adUnitsPageSize))
  const toggleAdUnitSelection = useCallback((adUnitKey: string) => {
    setSelectedAdUnitIds((prev) =>
      prev.includes(adUnitKey) ? prev.filter((id) => id !== adUnitKey) : [...prev, adUnitKey],
    )
  }, [])
  const toggleAllAdUnitsSelection = useCallback(() => {
    setSelectedAdUnitIds((prev) => {
      if (prev.length === paginatedAdUnits.length) return []
      return paginatedAdUnits.map((u) => u.adUnitKey)
    })
  }, [paginatedAdUnits])

  if (loadingDetail && hasValidId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading waterfall configuration...</div>
      </div>
    )
  }

  const hasNoSources =
    !loadingDetail && currentSetup.bidding.length === 0 && currentSetup.waterfall.length === 0 && hasValidId
  if (hasNoSources) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
        <p className="text-foreground">No bidding or waterfall sources for this mediation group.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync structure from AdMob or add ad sources in the mediation group configuration.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 pb-64 sm:pb-36 lg:pb-28">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Apply Policy</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Configure how this mediation group handles the waterfall apply cycle and interval.</p>
              </div>
              <div className="flex flex-col gap-1 lg:items-end">
                <div className="flex flex-wrap items-end gap-2">
                  <Select value={policyApplyMode} onValueChange={setPolicyApplyMode} disabled={loadingPolicy || savingPolicy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="semi_auto">Semi-auto</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Interval (days)</p>
                    <Input
                      type="number"
                      min={MIN_POLICY_INTERVAL_DAYS}
                      max={MAX_POLICY_INTERVAL_DAYS}
                      step={1}
                      value={policyIntervalDays}
                      onChange={(event) => setPolicyIntervalDays(event.target.value)}
                      disabled={loadingPolicy || savingPolicy || policyApplyMode === "manual"}
                      className="w-[140px] bg-background disabled:bg-muted"
                    />
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={openPolicyConfirm}
                    disabled={loadingPolicy || savingPolicy || !applyPolicy || !hasPolicyChanges || (policyApplyMode !== "manual" && parsedPolicyIntervalDays == null)}
                  >
                    {savingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {policyApplyMode === "manual"
                    ? "Manual mode keeps the saved interval unchanged until semi-auto or auto is enabled again."
                    : parsedPolicyIntervalDays == null
                      ? `Interval must be between ${MIN_POLICY_INTERVAL_DAYS} and ${MAX_POLICY_INTERVAL_DAYS} days.`
                      : `Current edit: ${formatPolicyIntervalLabel(parsedPolicyIntervalDays)}.`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last observed apply</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatUpdatedAt(applyPolicy?.lastObservedApplyAt ?? undefined)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Next due (GMT+7)</p>
                <p className="mt-1 text-sm font-medium text-foreground">{formatPolicyDueAtGmt7(applyPolicy?.dueAt ?? undefined)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Apply source</p>
                <p className="mt-1 text-sm font-medium text-foreground">{applyPolicy?.lastApplySource ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Interval</p>
                <p className="mt-1 text-sm font-medium text-foreground">{applyPolicy?.intervalDays ?? 7} days</p>
                {applyPolicy?.isDue && (
                  <Badge className="mt-2 border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300">Due now</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Ad units + Optimization Status Banner (two columns like Current Setup / Optimized) */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Left column: Ad units */}
          <Card className="border-border overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">Ad units</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="link" className="h-auto p-0 text-primary text-sm" asChild>
                    <a href={effectiveAppId ? `/apps/${effectiveAppId}` : "#"}>Add ad units</a>
                  </Button>
                  <span className="text-border">|</span>
                  <Button
                    variant="link"
                    className={cn("h-auto p-0 text-sm", selectedAdUnitIds.length ? "text-foreground" : "text-muted-foreground cursor-not-allowed")}
                    disabled={selectedAdUnitIds.length === 0}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mediationAdUnitsFromMappings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No ad units were found in this mediation group (`mediationGroupLines` / `adUnitMappings` are empty).
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="w-10 px-3 py-2.5 text-left">
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={paginatedAdUnits.length > 0 && selectedAdUnitIds.length === paginatedAdUnits.length}
                              onChange={toggleAllAdUnitsSelection}
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left font-medium text-foreground">Ad unit</th>
                          <th className="px-3 py-2.5 text-left font-medium text-foreground">Ad Format</th>
                          <th className="px-3 py-2.5 text-left font-medium text-foreground">App</th>
                          <th className="px-3 py-2.5 text-left font-medium text-foreground">
                            <span className="inline-flex items-center gap-1">
                              eCPM
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground cursor-help"><HelpCircle className="w-3.5 h-3.5" /></span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  Effective CPM from ad unit performance (API apps/adunits).
                                </TooltipContent>
                              </Tooltip>
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAdUnits.map((unit) => {
                          const details = adUnitDetailsByKey[unit.adUnitKey]
                          return (
                            <tr key={unit.adUnitKey} className="border-b border-border hover:bg-muted/40">
                              <td className="w-10 px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  className="rounded border-border"
                                  checked={selectedAdUnitIds.includes(unit.adUnitKey)}
                                  onChange={() => toggleAdUnitSelection(unit.adUnitKey)}
                                />
                              </td>
                              <td className="px-3 py-2.5 font-medium text-foreground">
                                {loadingAppAdUnits && !details
                                  ? "Loading..."
                                  : (details?.displayName ?? unit.unitId)}
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">
                                {details?.adFormat ?? "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  {appIconUri ? (
                                    <img src={appIconUri} alt="" className="w-8 h-8 rounded object-contain bg-muted" />
                                  ) : (
                                    <span className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">App</span>
                                  )}
                                  <div>
                                    <div className="font-medium text-foreground">{appName || "—"}</div>
                                    <div className="text-xs text-muted-foreground">{platform ? `${platform} • Free` : "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">
                                {details?.ecpm != null && details.ecpm > 0
                                  ? `$${details.ecpm.toFixed(2)}`
                                  : "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t bg-muted/40 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Show rows:</span>
                      <Select value={String(adUnitsPageSize)} onValueChange={(v) => { setAdUnitsPageSize(Number(v)); setAdUnitsPage(1) }}>
                        <SelectTrigger className="w-16 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 15, 25, 50].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>
                        {(adUnitsPage - 1) * adUnitsPageSize + 1}-{Math.min(adUnitsPage * adUnitsPageSize, totalAdUnits)} of {totalAdUnits}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={adUnitsPage <= 1}
                        onClick={() => setAdUnitsPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={adUnitsPage >= totalAdUnitsPages}
                        onClick={() => setAdUnitsPage((p) => Math.min(totalAdUnitsPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Right column: Optimization Status Banner + Rule Group */}
          <div className="flex flex-col gap-4">
            {/* Optimization Status Banner */}
            {!bannerDismissed && (
              <>
                {/* STATE A - Has Optimization Available */}
                {bannerState === "optimization" && (
                  <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg p-4 flex items-start gap-3 relative">
                    <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Optimization Available</h3>
                      <p className="text-sm text-foreground mt-0.5">
                        Our analysis suggests changes that could increase eCPM by ~{changes.improvement}% ($
                        {(changes.estimatedMonthly - currentSetup.estimatedMonthly).toFixed(0)})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Review recommendations in the lifecycle panel before pushing to production.
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => document.getElementById("changes-summary-card")?.scrollIntoView({ behavior: "smooth" })}
                        >
                          View Changes
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={handleApplyDirectClick}>
                          Apply Direct
                        </Button>
                        <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90" onClick={onRunABTest} disabled={!abTestingEnabled}>
                          Run A/B Test
                        </Button>
                      </div>
                    </div>
                    <button onClick={() => setBannerDismissed(true)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* STATE B - A/B Test Running */}
                {bannerState === "running" && (
                  <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg p-4 flex items-start gap-3">
                    <FlaskConical className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">A/B Test In Progress</h3>
                      <p className="text-sm text-foreground mt-0.5">
                        Testing optimized waterfall • Day {testDay} of {testDuration} • Traffic split: 50/50
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Early results: Variant B (Optimized) leading by +8.2% eCPM
                      </p>
                      <Progress
                        value={(testDay / testDuration) * 100}
                        className="h-2 mt-3 max-w-xs bg-primary/20 [&>div]:bg-primary"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 bg-transparent flex-shrink-0">
                      View Test Details
                    </Button>
                  </div>
                )}

                {/* STATE C - No Optimization Needed */}
                {bannerState === "optimized" && (
                  <div className="bg-emerald-500/10 border-l-4 border-emerald-500 rounded-r-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Waterfall Optimized</h3>
                      <p className="text-sm text-foreground mt-0.5">Current configuration is performing optimally</p>
                      <p className="text-xs text-muted-foreground mt-1">Re-run analysis anytime to refresh the suggested setup.</p>
                    </div>
                    <Button variant="link" className="h-auto p-0 text-emerald-600 dark:text-emerald-300" onClick={() => void handleRerunRecommendation()}>
                      Re-analyze Now
                    </Button>
                  </div>
                )}

                {/* STATE D - Has Unsaved Changes */}
                {bannerState === "unsaved" && (
                  <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg p-4 flex items-start gap-3">
                    <Pencil className="w-5 h-5 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Unsaved Changes</h3>
                      <p className="text-sm text-foreground mt-0.5">
                        You have modified the optimized waterfall configuration
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {changes.modifiedCount + changes.addedCount + changes.removedCount} changes pending • Don&apos;t forget
                        to apply or test
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button variant="link" className="h-auto p-0 text-destructive" onClick={discardAllChanges}>
                          Discard Changes
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-full bg-transparent sm:w-auto" onClick={handleApplyDirectClick}>
                          Apply Direct
                        </Button>
                        <Button size="sm" className="h-8 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={onRunABTest} disabled={!abTestingEnabled}>
                          Run A/B Test
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Rule Group Selection */}
            <div className="bg-muted/40 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Recommendation Rule Group</h4>
              </div>
              <div className="flex flex-col gap-3">
                <Select
                  value={selectedRuleGroupId != null ? String(selectedRuleGroupId) : "none"}
                  onValueChange={handleRuleGroupChange}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Select rule group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No rule group (use default)</span>
                    </SelectItem>
                    {ruleGroups
                      .filter((g) => g.isActive)
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          <div className="flex items-center gap-2">
                            {group.color && (
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                            )}
                            <span>{group.name}</span>
                            <span className="text-xs text-muted-foreground">({group.ruleCount} rules)</span>
                            {group.isDefault && (
                              <Badge variant="outline" className="text-xs h-5 px-1.5">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {appRuleGroupMapping?.effectiveGroupName ? (
                  <p className="text-xs text-muted-foreground">
                    Effective group: <span className="font-medium text-foreground">{appRuleGroupMapping.effectiveGroupName}</span>
                    {appRuleGroupMapping.effectiveSource ? ` (${appRuleGroupMapping.effectiveSource})` : ""}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 flex-1"
                    onClick={handleSaveRuleGroup}
                    disabled={!ruleGroupChanged || savingRuleGroup}
                  >
                    {savingRuleGroup ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 flex-1"
                    onClick={handleRerunRecommendation}
                    disabled={rerunningRecommendation}
                  >
                    {rerunningRecommendation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Rerun
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Side-by-Side Waterfall Comparison */}
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Waterfall Configuration</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 bg-transparent" asChild>
                <Link
                  href={buildActivityLogsHref({
                    domain: "waterfall",
                    targetType: "mediation_group",
                    targetId: mediationGroupId,
                    mediationGroupId,
                  })}
                >
                  <Activity className="w-4 h-4" />
                  View Activity
                </Link>
              </Button>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[140px] h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                  <SelectItem value="current-only">Current Only</SelectItem>
                  <SelectItem value="optimized-only">Optimized Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={showMode} onValueChange={setShowMode}>
                <SelectTrigger className="w-[130px] h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="changed">Changed Only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-transparent"
                onClick={() => {
                  setCurrentBiddingOpen(true)
                  setCurrentWaterfallOpen(true)
                  setOptimizedBiddingOpen(true)
                  setOptimizedWaterfallOpen(true)
                }}
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-transparent"
                onClick={() => {
                  setCurrentBiddingOpen(false)
                  setCurrentWaterfallOpen(false)
                  setOptimizedBiddingOpen(false)
                  setOptimizedWaterfallOpen(false)
                }}
              >
                Collapse All
              </Button>
              {hasManualChanges() && (
                <Button variant="link" className="h-9 text-primary gap-1" onClick={resetToAISuggestion}>
                  <RotateCcw className="w-4 h-4" />
                  Reset to AI Suggestion
                </Button>
              )}
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {/* LEFT COLUMN - Current Setup (READ-ONLY) */}
            <Card className="border-border overflow-hidden">
              {/* Teal header */}
              <div className={currentSetupHeaderClassName}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">CURRENT SETUP</h3>
                      <Lock className="w-4 h-4 text-white/80" />
                    </div>
                    <p className="text-sm text-white/80">Variant A • Active • Read-only</p>
                    <p className="mt-1 text-xs text-white/70">Last updated: {formatUpdatedAt(updatedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Estimated Monthly</p>
                    <p className="text-2xl font-bold text-white">${currentSetup.estimatedMonthly}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* Bidding Section */}
                <Collapsible open={currentBiddingOpen} onOpenChange={setCurrentBiddingOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/40 rounded-md">
                    <span className="text-sm font-medium text-foreground">
                      Bidding ({currentSetup.bidding.length} sources)
                    </span>
                    {currentBiddingOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {currentSetup.bidding.map((source) => (
                      <div key={source.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{source.name}</p>
                          <p className="text-xs text-muted-foreground">No floor • Active</p>
                        </div>
                        <p className="text-sm text-muted-foreground">7D: ${source.ecpm7d.toFixed(2)} eCPM</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Waterfall Section */}
                <Collapsible open={currentWaterfallOpen} onOpenChange={setCurrentWaterfallOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/40 rounded-md">
                    <span className="text-sm font-medium text-foreground">
                      Waterfall ({currentSetup.waterfall.length} sources)
                    </span>
                    {currentWaterfallOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {currentSetup.waterfall.map((source, index) => {
                      const matchRate = matchRateFromMediationLines.byLineId[source.id]
                        ?? (source.network ? matchRateFromMediationLines.byAdSourceId[source.network] : undefined)
                        ?? (source.network ? matchRateByAdSourceId[source.network] : undefined)
                      return (
                        <div key={source.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{source.name}</p>
                            <p className="text-xs text-muted-foreground">${source.floor.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Updated: {formatUpdatedAt(updatedAt)}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-0.5">
                            <p className="text-sm text-muted-foreground">eCPM: ${source.ecpm.toFixed(2)}</p>
                            {matchRate != null && !Number.isNaN(matchRate) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground cursor-help">MR: {matchRate.toFixed(1)}%</p>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p>Match rate: requests with ads returned divided by total requests.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Revenue 30D: {source.revenue30Days != null ? `$${source.revenue30Days.toFixed(2)}` : "—"}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* RIGHT COLUMN - Optimized Suggested (EDITABLE) */}
            <Card className="border-border overflow-hidden">
              {/* Purple header */}
              <div className={optimizedHeaderClassName}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">OPTIMIZED (Suggested)</h3>
                      <Pencil className="w-4 h-4 text-white/80" />
                      {hasManualChanges() && (
                        <Badge className="border-0 bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-100 text-xs">
                          Unsaved changes
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/80">Variant B • Editable</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">Estimated Monthly</p>
                    <p className="text-2xl font-bold text-white">
                      ${changes.estimatedMonthly}{" "}
                      <span
                        className={cn(
                          "text-sm",
                          Number.parseFloat(changes.improvement) >= 0 ? "text-emerald-300" : "text-destructive",
                        )}
                      >
                        ({Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                        {changes.improvement}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {/* Bidding Section */}
                <Collapsible open={optimizedBiddingOpen} onOpenChange={setOptimizedBiddingOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/40 rounded-md">
                    <span className="text-sm font-medium text-foreground">
                      Bidding ({optimizedBidding.filter((s) => s.changeType !== "removed").length} sources)
                    </span>
                    {optimizedBiddingOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {optimizedBidding.map((source) => (
                      <div
                        key={source.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg group",
                          source.changeType === "new" ? "bg-emerald-500/10" : "bg-muted/40",
                        )}
                      >
                        <Switch checked={source.status === "active"} disabled className="data-[state=checked]:bg-emerald-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{source.name}</p>
                            {source.changeType === "new" && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-xs">NEW</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            No floor • {source.status === "active" ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">7D: ${source.ecpm7d.toFixed(2)} eCPM</p>
                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {/* Add Bidding Source Button */}
                    <button
                      disabled={!biddingEditingEnabled}
                      className="flex items-center gap-2 w-full cursor-not-allowed p-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bidding Source (Coming soon)
                    </button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Waterfall Section */}
                <Collapsible open={optimizedWaterfallOpen} onOpenChange={setOptimizedWaterfallOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/40 rounded-md">
                    <span className="text-sm font-medium text-foreground">
                      Waterfall ({optimizedWaterfall.filter((s) => s.changeType !== "removed").length} sources)
                    </span>
                    {optimizedWaterfallOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {optimizedWaterfall.map((source, index) => {
                      const isRemoved = source.changeType === "removed"
                      const isModified = source.changeType === "modified"
                      const isNew = source.changeType === "new"
                      const hasReason = typeof source.reason === "string" && source.reason.trim() !== ""
                      const hasRecommendationMetrics = source.sowPercent != null || source.matchRatePercent != null
                      const hasRecommendationTooltip = hasReason || hasRecommendationMetrics
                      const displayIndex =
                        optimizedWaterfall.filter((s, i) => i < index && s.changeType !== "removed").length + 1

                      return (
                        <div
                          key={source.id}
                          draggable={!isRemoved && manualReorderEnabled}
                          onDragStart={(e) => handleDragStart(e, source.id)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex flex-wrap items-center gap-3 p-3 rounded-lg group transition-all",
                            isRemoved && "bg-destructive/10 opacity-60",
                            isModified && !isRemoved && "bg-amber-500/10",
                            isNew && !isRemoved && "bg-emerald-500/10",
                            !isRemoved && !isModified && !isNew && "bg-muted/40",
                            dragOverIndex === index &&
                              draggedItemId !== source.id &&
                              "border-2 border-primary border-dashed",
                            draggedItemId === source.id && "opacity-50",
                          )}
                        >
                          {/* Drag Handle */}
                          {!isRemoved && manualReorderEnabled && (
                            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          {(isRemoved || !manualReorderEnabled) && <div className="w-4" />}

                          {/* Position Number */}
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center",
                              isRemoved ? "bg-destructive/20 text-destructive line-through" : "bg-primary/10 text-primary",
                            )}
                          >
                            {isRemoved ? "-" : displayIndex}
                          </span>

                          {/* Source Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {hasRecommendationTooltip ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 cursor-help">
                                      <p
                                        className={cn(
                                          "min-w-0 break-words text-sm font-medium text-foreground",
                                          isRemoved && "line-through text-muted-foreground",
                                        )}
                                      >
                                        {source.name}
                                      </p>
                                      {isNew && (
                                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-xs">NEW</Badge>
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {hasReason && <p className="text-sm">{source.reason}</p>}
                                    {hasRecommendationMetrics && (
                                      <p className={cn("text-xs text-muted-foreground", hasReason && "mt-1 border-t border-border pt-1")}>
                                        SoW: {source.sowPercent != null ? `${Number(source.sowPercent).toFixed(2)}%` : "—"} • MR: {source.matchRatePercent != null ? `${Number(source.matchRatePercent).toFixed(1)}%` : "—"}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <>
                                  <p
                                    className={cn(
                                      "min-w-0 break-words text-sm font-medium text-foreground",
                                      isRemoved && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {source.name}
                                  </p>
                                  {isNew && !isRemoved && (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-xs">NEW</Badge>
                                  )}
                                </>
                              )}
                              {isModified && !isRemoved && (
                                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0 text-xs">MODIFIED</Badge>
                              )}
                              {isRemoved && <Badge className="bg-destructive/10 text-destructive border-0 text-xs">REMOVED</Badge>}
                              {source.recommendationAction && source.recommendationAction !== "KEEP" && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                                  {source.recommendationAction}
                                </Badge>
                              )}
                            </div>

                            {/* eCPM Floor - Editable */}
                            <div className="flex items-center gap-2">
                              {editingFloorId === source.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingFloorValue}
                                    onChange={(e) => setEditingFloorValue(e.target.value)}
                                    onKeyDown={(e) => handleFloorKeyDown(e, source.id)}
                                    onBlur={() => saveFloorEdit(source.id)}
                                    className="h-6 w-24 text-xs px-1 ring-2 ring-ring"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <button
                                  onClick={() => !isRemoved && startEditing(source)}
                                  disabled={isRemoved}
                                  className={cn(
                                    "text-xs flex items-center gap-1",
                                    isRemoved
                                      ? "text-muted-foreground line-through cursor-not-allowed"
                                      : "text-muted-foreground hover:text-primary hover:underline cursor-pointer",
                                  )}
                                >
                                  ${source.floor.toFixed(2)}
                                  {!isRemoved && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                </button>
                              )}
                              {isModified && source.originalFloor && !isRemoved && (
                                <span className="text-xs text-muted-foreground line-through">
                                  Was: ${source.originalFloor.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actual eCPM */}
                          <p
                            className={cn(
                              "order-last w-full pl-10 text-xs text-muted-foreground sm:pl-16",
                              isRemoved && "line-through text-muted-foreground",
                            )}
                          >
                            7D: ${source.ecpm.toFixed(2)}
                          </p>

                          {/* Status Toggle */}
                          {!isRemoved && (
                            <Switch
                              checked={source.status === "active"}
                              onCheckedChange={() => toggleSourceStatus(source.id)}
                              disabled={!manualStatusToggleEnabled}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          )}

                          {/* Delete / Undo Button */}
                          {isRemoved ? (
                            <button
                              onClick={() => undoRemoval(source.id)}
                              className="text-primary hover:text-primary/80 text-xs flex items-center gap-1"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              Undo
                            </button>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => markSourceRemoved(source.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Remove this source?</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )
                    })}

                    {/* Add Waterfall Source Button */}
                    <button
                      onClick={() => {
                        setAddSourceType("waterfall")
                        setAddSourceModalOpen(true)
                      }}
                      className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Waterfall Source
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 3: Changes Summary Card */}
        <Card className="border-border" id="changes-summary-card">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold text-foreground">Changes Summary</CardTitle>
              </div>
              {!changes.hasChanges && (
                <Badge variant="outline" className="text-muted-foreground">
                  No changes
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {changes.hasChanges ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 space-y-2">
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {changes.modifiedCount > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        {changes.modifiedCount} eCPM floors modified (avg {changes.avgFloorIncrease >= 0 ? "+" : ""}$
                        {changes.avgFloorIncrease.toFixed(2)})
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {changes.addedCount} sources added
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      {changes.removedCount} sources removed
                    </li>
                    <li
                      className={cn(
                        "flex items-start gap-2 font-medium",
                        Number.parseFloat(changes.improvement) >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-destructive",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                          Number.parseFloat(changes.improvement) >= 0 ? "bg-emerald-500" : "bg-destructive",
                        )}
                      />
                      Estimated impact: {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}$
                      {changes.estimatedMonthly - currentSetup.estimatedMonthly}/month (
                      {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                      {changes.improvement}%)
                    </li>
                  </ul>
                </div>
                <div className="min-w-0 space-y-4">
                  {/* Confidence Score */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Recommendation Workflow</span>
                      {hasManualChanges() ? (
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                            <span>Review needed</span>
                            <AlertCircle className="w-3.5 h-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>Manual edits should be reviewed against approved recommendations before apply.</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="font-medium text-foreground">Tracked</span>
                      )}
                    </div>
                    {!hasManualChanges() && (
                      <>
                        <Progress value={100} className="h-2" />
                        <p className="text-xs text-muted-foreground">Approve/apply history is tracked in the lifecycle panel.</p>
                      </>
                    )}
                    {hasManualChanges() && <p className="text-xs text-muted-foreground">Manual floor/add/remove changes applied</p>}
                  </div>

                  {/* Mini Comparison Table */}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[560px] w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="whitespace-nowrap p-2 text-left font-medium text-muted-foreground">Metric</th>
                          <th className="whitespace-nowrap p-2 text-right font-medium text-muted-foreground">Current</th>
                          <th className="whitespace-nowrap p-2 text-right font-medium text-muted-foreground">Optimized</th>
                          <th className="whitespace-nowrap p-2 text-right font-medium text-muted-foreground">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="p-2 text-foreground">Est. Monthly Revenue</td>
                          <td className="p-2 text-right text-muted-foreground">${currentSetup.estimatedMonthly}</td>
                          <td className="p-2 text-right text-foreground font-medium">${changes.estimatedMonthly}</td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              Number.parseFloat(changes.improvement) >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-destructive",
                            )}
                          >
                            {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}$
                            {changes.estimatedMonthly - currentSetup.estimatedMonthly} (
                            {Number.parseFloat(changes.improvement) >= 0 ? "+" : ""}
                            {changes.improvement}%)
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="p-2 text-foreground">Waterfall Sources</td>
                          <td className="p-2 text-right text-muted-foreground">{currentSetup.waterfall.length}</td>
                          <td className="p-2 text-right text-foreground font-medium">
                            {optimizedWaterfall.filter((s) => s.changeType !== "removed").length}
                          </td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              changes.addedCount - changes.removedCount >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-destructive",
                            )}
                          >
                            {changes.addedCount - changes.removedCount >= 0 ? "+" : ""}
                            {changes.addedCount - changes.removedCount}
                          </td>
                        </tr>
                        <tr className="border-t border-border">
                          <td className="p-2 text-foreground">Avg eCPM Floor</td>
                          <td className="p-2 text-right text-muted-foreground">${currentAvgFloor.toFixed(2)}</td>
                          <td className="p-2 text-right text-foreground font-medium">${optimizedAvgFloor.toFixed(2)}</td>
                          <td
                            className={cn(
                              "p-2 text-right font-medium",
                              optimizedAvgFloor - currentAvgFloor >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-destructive",
                            )}
                          >
                            {optimizedAvgFloor - currentAvgFloor >= 0 ? "+" : ""}$
                            {(optimizedAvgFloor - currentAvgFloor).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No changes from current configuration</p>
                <p className="text-sm text-muted-foreground mt-1">Modify the optimized waterfall or use AI suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Sticky Bottom Action Bar */}
        <div className="fixed bottom-20 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 pb-3 pt-3 shadow-lg backdrop-blur sm:bottom-0 sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:pl-[240px]">
            <div className="min-w-0 text-center lg:text-left">
              {changes.hasChanges && (
                <Button variant="link" className="h-auto min-h-9 p-0 text-destructive" onClick={discardAllChanges}>
                  Discard All Changes
                </Button>
              )}
              {!changes.hasChanges && <span className="text-sm text-muted-foreground">Make changes to enable actions</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-3">
              <Button
                variant="outline"
                className="w-full bg-transparent lg:w-auto"
                onClick={handleApplyDirectClick}
                disabled={!changes.hasChanges}
              >
                Apply Direct
              </Button>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 lg:w-auto" onClick={onRunABTest} disabled={!changes.hasChanges || !abTestingEnabled}>
                Run A/B Test
              </Button>
            </div>
          </div>
        </div>

        {/* Add Ad Source Modal */}
        <AddAdSourceModal
          open={addSourceModalOpen}
          onOpenChange={setAddSourceModalOpen}
          sourceType={addSourceType}
          onAddSource={handleAddSource}
        />

        <AlertDialog open={policyConfirmOpen} onOpenChange={setPolicyConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{policyConfirmContent.title}</AlertDialogTitle>
              <AlertDialogDescription>{policyConfirmContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={savingPolicy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={savingPolicy}
                onClick={(event) => {
                  event.preventDefault()
                  void savePolicy()
                }}
              >
                {savingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {policyConfirmContent.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
