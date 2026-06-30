"use client"

import { useState, useEffect, useCallback, useRef, type PointerEvent } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Apple,
  Pause,
  Trash2,
  Settings,
  Check,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react"
import { useApi, invalidateCache } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"
import { hasScreenFunction, hasAppDetailTab, canEnterAppDetail } from "@/lib/auth"
import { copyTextToClipboard, cn } from "@/lib/utils"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import type { App, WaterfallAdUnit } from "@/types/api"

const SCREEN_APPS = "s-apps"
const FN_SYNC_FROM_ADMOB = "sync-from-admob"
import { AppOverviewTab } from "./app-detail/app-overview-tab"
import { AppDashboardTab } from "./app-detail/app-dashboard-tab"
import { AppAdUnitsTab } from "./app-detail/app-ad-units-tab"
import { AppWaterfallAdUnitsTab } from "./app-detail/app-waterfall-ad-units-tab"
import { AppMediationGroupsTab } from "./app-detail/app-mediation-groups-tab"
import { AppAdUnitsMediationTab } from "./app-detail/app-ad-units-mediation-tab"
import { AppMediationGroupsMediationTab } from "./app-detail/app-mediation-groups-mediation-tab"
import { AppSettingsTab } from "./app-detail/app-settings-tab"
import { AppAiInsightsTab } from "./app-detail/app-ai-insights-tab"
import { AppInsightConfigTab } from "./app-detail/app-insight-config-tab"
import { AppPerformanceTab } from "./app-detail/app-performance-tab"
import { SyncAppPerformanceModal } from "./app-detail/sync-app-performance-modal"
import { AppPlaybookEditorPanel } from "./app-detail/playbook/app-playbook-editor-panel"
export function AppDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()

  const appIdFromParams = (params as any)?.id as string | undefined
  const hasValidAppId = !!appIdFromParams

  const appCacheKey = hasValidAppId ? `app_detail_${appIdFromParams}` : undefined
  const { data: app, loading: appLoading, refetch: refetchApp } = useApi<App>(
    () => structureApi.getAppByAppId(appIdFromParams!),
    {
      enabled: hasValidAppId,
      cacheKey: appCacheKey,
    },
  )

  const handleAppUpdated = useCallback(() => {
    if (appCacheKey) {
      invalidateCache(appCacheKey)
    }
    refetchApp()
  }, [appCacheKey, refetchApp])

  const { data: waterfallAdUnits, loading: waterfallAdUnitsLoading } = useApi<WaterfallAdUnit[]>(
    () => structureApi.getAppWaterfallAdUnits(app!.id),
    {
      enabled: hasValidAppId && !!app?.id,
      cacheKey: app?.id != null ? `app_waterfall_ad_units_${app.id}` : undefined,
    },
  )

  const mediationGroupsCount = app?.mediationGroupsCount ?? 0
  const waterfallAdUnitsCount = waterfallAdUnits?.length ?? 0
  const dashboardAppId = app?.appId ?? appIdFromParams

  // --- Permissions ---------------------------------------------------------
  const canSyncFromAdmob = hasScreenFunction(SCREEN_APPS, FN_SYNC_FROM_ADMOB)

  // Per-tab visibility: mỗi tab map `view-details:<suffix>` (hasAppDetailTab).
  const canViewOverview = hasAppDetailTab("overview")
  const canViewDashboard = hasAppDetailTab("dashboard")
  const canViewAdUnits = hasAppDetailTab("ad-units")
  const canViewAdUnitsMediation = hasAppDetailTab("ad-units-mediation")
  const canViewWaterfallAdUnits = hasAppDetailTab("waterfall-ad-units")
  const canViewMediationGroups = hasAppDetailTab("mediation-groups")
  const canViewMediationGroupsMediation = hasAppDetailTab("mediation-groups-mediation")
  const canViewPerformance = hasAppDetailTab("performance")
  const showAiInsightTab = hasAppDetailTab("ai-insight")
  const showInsightConfigTab = hasAppDetailTab("insight-config")
  const showPlaybookTab = hasAppDetailTab("playbook")
  const canViewSettingsTab = hasAppDetailTab("settings")

  // Danh sach tab duoc phep, theo dung thu tu render
  const allowedTabs = [
    canViewOverview && "overview",
    canViewDashboard && "dashboard",
    canViewAdUnitsMediation && "ad-units-mediation",
    canViewMediationGroupsMediation && "mediation-groups-mediation",
    canViewWaterfallAdUnits && "waterfall-ad-units",
    canViewPerformance && "performance",
    showAiInsightTab && "ai-insight",
    showInsightConfigTab && "insight-config",
    showPlaybookTab && "playbook",
    canViewSettingsTab && "settings",
    canViewAdUnits && "ad-units",
    canViewMediationGroups && "mediation-groups",
  ].filter(Boolean) as string[]
  const fallbackTab = allowedTabs[0] ?? "overview"

  const normalizeTab = (tab: string | null) => {
    if (!tab) return fallbackTab
    // Backward-compat: các tab AI-Specialize cũ đã được gom vào "ai-insight"
    let resolved = tab
    if (["po-agent", "da-agent", "ua-agent", "med-agent", "dev-agent", "qa-agent"].includes(tab)) {
      resolved = "ai-insight"
    }
    // Neu user khong co quyen tab nay -> fallback sang tab dau tien duoc phep
    if (!allowedTabs.includes(resolved)) {
      return fallbackTab
    }
    return resolved
  }

  const initialTab = normalizeTab(searchParams.get("tab"))
  const [activeTab, setActiveTab] = useState(initialTab)
  const [copiedField, setCopiedField] = useState<"appId" | "appStoreId" | null>(null)
  const [syncPerformanceModalOpen, setSyncPerformanceModalOpen] = useState(false)

  const tabScrollRef = useRef<HTMLDivElement>(null)
  const tabPointerDragRef = useRef<{ id: number; startX: number; startScrollLeft: number; dragged: boolean }>({
    id: -1,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  })
  const [tabScrollEdges, setTabScrollEdges] = useState({ canLeft: false, canRight: false })

  const updateTabScrollEdges = useCallback(() => {
    const el = tabScrollRef.current
    if (!el) return
    const eps = 2
    const { scrollLeft, scrollWidth, clientWidth } = el
    setTabScrollEdges({
      canLeft: scrollLeft > eps,
      canRight: scrollLeft + clientWidth < scrollWidth - eps,
    })
  }, [])

  useEffect(() => {
    updateTabScrollEdges()
    const el = tabScrollRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => updateTabScrollEdges())
    ro.observe(el)
    return () => ro.disconnect()
  }, [allowedTabs.join(","), updateTabScrollEdges])

  useEffect(() => {
    const root = tabScrollRef.current
    if (!root) return
    const active = root.querySelector('[data-state="active"]') as HTMLElement | null
    active?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
    requestAnimationFrame(() => updateTabScrollEdges())
  }, [activeTab, updateTabScrollEdges])

  const onTabStripPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return
    if (e.button !== 0) return
    const el = e.currentTarget
    tabPointerDragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      dragged: false,
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const onTabStripPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const s = tabPointerDragRef.current
    if (s.id !== e.pointerId) return
    const el = tabScrollRef.current
    if (!el) return
    const dx = e.clientX - s.startX
    el.scrollLeft = s.startScrollLeft - dx
    if (Math.abs(dx) > 6) s.dragged = true
    updateTabScrollEdges()
  }, [updateTabScrollEdges])

  const finishTabStripPointer = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = tabPointerDragRef.current
      if (s.id !== e.pointerId) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      if (s.dragged) {
        const block = (ev: Event) => {
          ev.preventDefault()
          ev.stopImmediatePropagation()
        }
        document.addEventListener("click", block, { capture: true, once: true })
      }
      s.id = -1
      s.dragged = false
      updateTabScrollEdges()
    },
    [updateTabScrollEdges],
  )

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    const targetId = (app?.appId ?? appIdFromParams) ?? ""
    router.push(`/apps/${targetId}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get("tab"))
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  const copyToClipboard = async (text: string, field: "appId" | "appStoreId") => {
    try {
      const copiedText = await copyTextToClipboard(text)
      if (!copiedText) return

      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error(`Failed to copy ${field}`, error)
    }
  }

  if (!canEnterAppDetail()) {
    return <NoPermissionView />
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href={searchParams.get("from") === "account" && searchParams.get("accountId") ? `/data-accounts/${searchParams.get("accountId")}` : "/apps"}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {searchParams.get("from") === "account" ? "Back to Account" : "Back to Apps"}
        </Link>

        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: App Info */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <img
              src={app?.iconUri || "/placeholder.svg"}
              alt={app?.displayName || app?.name || "App"}
              className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover shadow-sm sm:h-16 sm:w-16"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="min-w-0 break-words text-xl font-semibold text-foreground sm:text-2xl">
                    {appLoading ? "Loading..." : app?.displayName || app?.name || "Unnamed App"}
                  </h1>
                  <Badge variant="outline" className="gap-1 border-border bg-muted/40 text-foreground">
                    <Apple className="w-3 h-3" />
                    {app?.platform || "Unknown"}
                  </Badge>
                  <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    {app?.approvalState || "Unknown"}
                  </Badge>
                </div>
                <div className="mt-1 flex min-w-0 max-w-full items-center gap-2">
                  <code className="block min-w-0 max-w-full truncate rounded bg-muted px-2 py-0.5 font-mono text-sm text-muted-foreground">
                    {app?.appId || "--"}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { if (app?.appId) { void copyToClipboard(app.appId, "appId") } }}
                        className="rounded p-1 transition-colors hover:bg-muted"
                      >
                        {copiedField === "appId" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copiedField === "appId" ? "Copied!" : "Copy App ID"}</TooltipContent>
                  </Tooltip>
                </div>
                {app?.appStoreId ? (
                  <div className="mt-1 flex min-w-0 max-w-full items-center gap-2">
                    <code className="block min-w-0 max-w-full truncate rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-sm text-amber-800 dark:text-amber-300">
                      {app.appStoreId}
                    </code>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { void copyToClipboard(app.appStoreId!, "appStoreId") }}
                          className="rounded p-1 transition-colors hover:bg-muted"
                        >
                          {copiedField === "appStoreId" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{copiedField === "appStoreId" ? "Copied!" : "Copy App Store ID"}</TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {canSyncFromAdmob && (
              <Button
                className="h-9 w-full gap-2 sm:w-auto"
                onClick={() => setSyncPerformanceModalOpen(true)}
                disabled={!app?.appId || appLoading}
              >
                <RefreshCw className="w-4 h-4" />
                Sync Performance
              </Button>
            )}
            <Button
              variant="outline"
              className="h-9 w-full gap-2 bg-transparent text-sm sm:w-auto"
              onClick={() => window.open("https://admob.google.com", "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              View in AdMob
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full gap-2 bg-transparent text-sm sm:w-auto"
              onClick={() => window.open("https://apps.apple.com", "_blank")}
            >
              <Apple className="w-4 h-4" />
              View in App Store
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-9 shrink-0 bg-transparent p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" />
                  App Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => {
                    const targetId = (app?.appId ?? appIdFromParams) ?? ""
                    if (!targetId) return
                    router.push(`/apps/${targetId}?tab=playbook`)
                  }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  AI Playbook
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => { if (app?.appId) { void copyToClipboard(app.appId, "appId") } }}
                  disabled={!app?.appId}
                >
                  <Copy className="w-4 h-4" />
                  Copy App ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-amber-600 dark:text-amber-300">
                  <Pause className="w-4 h-4" />
                  Pause App
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Delete App
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
          <div className="flex w-full max-w-full min-w-0 items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden h-9 w-9 shrink-0 rounded-lg border-border bg-card shadow-sm sm:inline-flex"
              disabled={!tabScrollEdges.canLeft}
              aria-label="Cuộn tab sang trái"
              onClick={() => {
                tabScrollRef.current?.scrollBy({ left: -260, behavior: "smooth" })
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              ref={tabScrollRef}
              onScroll={updateTabScrollEdges}
              onPointerDown={onTabStripPointerDown}
              onPointerMove={onTabStripPointerMove}
              onPointerUp={finishTabStripPointer}
              onPointerCancel={finishTabStripPointer}
              onLostPointerCapture={() => {
                tabPointerDragRef.current.id = -1
                tabPointerDragRef.current.dragged = false
                updateTabScrollEdges()
              }}
              className={cn(
                "min-w-0 flex-1 cursor-grab overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth active:cursor-grabbing",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                "select-none",
              )}
            >
              <TabsList className="inline-flex h-11 w-max flex-nowrap items-center justify-start gap-0 rounded-lg bg-muted p-1">
                {canViewOverview ? (
                  <TabsTrigger value="overview" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Overview
                  </TabsTrigger>
                ) : null}
                {canViewDashboard ? (
                  <TabsTrigger value="dashboard" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Dashboard
                  </TabsTrigger>
                ) : null}
                {canViewAdUnitsMediation ? (
                  <TabsTrigger value="ad-units-mediation" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Ad Units
                    <Badge variant="outline" className="ml-2 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                      New
                    </Badge>
                  </TabsTrigger>
                ) : null}
                {canViewMediationGroupsMediation ? (
                  <TabsTrigger value="mediation-groups-mediation" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Mediation Groups
                    <Badge variant="outline" className="ml-2 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                      New
                    </Badge>
                  </TabsTrigger>
                ) : null}
                {canViewWaterfallAdUnits ? (
                  <TabsTrigger value="waterfall-ad-units" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Waterfall Ad Units
                    <Badge variant="secondary" className="ml-2 bg-secondary text-xs text-secondary-foreground">
                      {waterfallAdUnitsLoading ? "..." : waterfallAdUnitsCount}
                    </Badge>
                  </TabsTrigger>
                ) : null}
                {canViewPerformance ? (
                  <TabsTrigger value="performance" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Performance
                  </TabsTrigger>
                ) : null}
                {showAiInsightTab ? (
                  <TabsTrigger value="ai-insight" className="shrink-0 flex-none gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Insight
                  </TabsTrigger>
                ) : null}
                {showInsightConfigTab ? (
                  <TabsTrigger value="insight-config" className="shrink-0 flex-none gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Insight config
                  </TabsTrigger>
                ) : null}
                {showPlaybookTab ? (
                  <TabsTrigger value="playbook" className="shrink-0 flex-none gap-1.5 px-3 sm:px-4 data-[state=active]:bg-background">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    AI Playbook
                  </TabsTrigger>
                ) : null}
                {canViewSettingsTab ? (
                  <TabsTrigger value="settings" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Settings
                  </TabsTrigger>
                ) : null}
                {canViewAdUnits ? (
                  <TabsTrigger value="ad-units" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Ad Units
                    <Badge variant="outline" className="ml-2 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-800 dark:text-amber-300">
                      deprecated
                    </Badge>
                    <Badge variant="secondary" className="ml-2 bg-secondary text-xs text-secondary-foreground">
                      {app?.adUnitsCount ?? 0}
                    </Badge>
                  </TabsTrigger>
                ) : null}
                {canViewMediationGroups ? (
                  <TabsTrigger value="mediation-groups" className="shrink-0 flex-none px-3 sm:px-4 data-[state=active]:bg-background">
                    Mediation Groups
                    <Badge variant="outline" className="ml-2 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-800 dark:text-amber-300">
                      deprecated
                    </Badge>
                    <Badge variant="secondary" className="ml-2 bg-secondary text-xs text-secondary-foreground">
                      {appLoading ? "..." : mediationGroupsCount}
                    </Badge>
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden h-9 w-9 shrink-0 rounded-lg border-border bg-card shadow-sm sm:inline-flex"
              disabled={!tabScrollEdges.canRight}
              aria-label="Cuộn tab sang phải"
              onClick={() => {
                tabScrollRef.current?.scrollBy({ left: 260, behavior: "smooth" })
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {canViewOverview ? (
            <TabsContent value="overview" className="mt-6">
              <AppOverviewTab onNavigateToTab={handleTabChange} />
            </TabsContent>
          ) : null}
          {canViewDashboard ? (
            <TabsContent value="dashboard" className="mt-6">
              {dashboardAppId ? <AppDashboardTab appId={dashboardAppId} /> : null}
            </TabsContent>
          ) : null}
          {canViewAdUnitsMediation ? (
            <TabsContent value="ad-units-mediation" className="mt-6">
              <AppAdUnitsMediationTab appRowId={app?.id} />
            </TabsContent>
          ) : null}
          {canViewMediationGroupsMediation ? (
            <TabsContent value="mediation-groups-mediation" className="mt-6">
              <AppMediationGroupsMediationTab appRowId={app?.id} />
            </TabsContent>
          ) : null}
          {canViewWaterfallAdUnits ? (
            <TabsContent value="waterfall-ad-units" className="mt-6">
              <AppWaterfallAdUnitsTab
                waterfallAdUnits={waterfallAdUnits ?? null}
                loadingWaterfallAdUnits={waterfallAdUnitsLoading}
              />
            </TabsContent>
          ) : null}
          {canViewPerformance ? (
            <TabsContent value="performance" className="mt-6">
              {appLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading app…</div>
              ) : app?.appId ? (
                <AppPerformanceTab
                  key={app.appId}
                  appId={app.appId}
                  publisherTimezoneOffsetHours={app.publisherTimezoneOffsetHours ?? null}
                />
              ) : null}
            </TabsContent>
          ) : null}
          {showAiInsightTab && app?.appId ? (
            <TabsContent value="ai-insight" className="mt-6">
              <AppAiInsightsTab appId={app.appId} appRowId={app.id} initialDateYmd={searchParams.get("date")} />
            </TabsContent>
          ) : null}
          {showInsightConfigTab && app?.appId ? (
            <TabsContent value="insight-config" className="mt-6 w-full min-w-0">
              <AppInsightConfigTab appId={app.appId} />
            </TabsContent>
          ) : null}
          {showPlaybookTab && app?.appId ? (
            <TabsContent value="playbook" className="mt-6 w-full min-w-0">
              <AppPlaybookEditorPanel appId={app.appId} appRowId={app.id} />
            </TabsContent>
          ) : null}
          {canViewSettingsTab ? (
            <TabsContent value="settings" className="mt-6">
              <AppSettingsTab app={app ?? null} onAppUpdated={handleAppUpdated} />
            </TabsContent>
          ) : null}
          {canViewAdUnits ? (
            <TabsContent value="ad-units" className="mt-6">
              <AppAdUnitsTab />
            </TabsContent>
          ) : null}
          {canViewMediationGroups ? (
            <TabsContent value="mediation-groups" className="mt-6">
              <AppMediationGroupsTab />
            </TabsContent>
          ) : null}
        </Tabs>

        {app?.appId && (
          <SyncAppPerformanceModal
            open={syncPerformanceModalOpen}
            onOpenChange={setSyncPerformanceModalOpen}
            appId={app.appId}
            appName={app.displayName || app.name}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
