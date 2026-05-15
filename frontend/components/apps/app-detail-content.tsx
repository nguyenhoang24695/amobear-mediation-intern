"use client"

import { useState, useEffect, useCallback } from "react"
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
import { copyTextToClipboard } from "@/lib/utils"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import type { App, MediationGroup, WaterfallAdUnit } from "@/types/api"

const SCREEN_APPS = "s-apps"
const FN_VIEW_DETAILS = "view-details"
const FN_SYNC_FROM_ADMOB = "sync-from-admob"
import { AppOverviewTab } from "./app-detail/app-overview-tab"
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
import { PersonaSwitcherDropdown } from "@/components/ai-specialized/persona-switcher-dropdown"

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

  const { data: mediationGroups, loading: mediationGroupsLoading } = useApi<MediationGroup[]>(
    () => structureApi.getAppMediationGroups(app!.id),
    {
      enabled: hasValidAppId && !!app?.id,
      cacheKey: app?.id != null ? `app_mediation_groups_${app.id}` : undefined,
    },
  )
  const { data: waterfallAdUnits, loading: waterfallAdUnitsLoading } = useApi<WaterfallAdUnit[]>(
    () => structureApi.getAppWaterfallAdUnits(app!.id),
    {
      enabled: hasValidAppId && !!app?.id,
      cacheKey: app?.id != null ? `app_waterfall_ad_units_${app.id}` : undefined,
    },
  )

  const mediationGroupsCount = mediationGroups?.length ?? 0
  const waterfallAdUnitsCount = waterfallAdUnits?.length ?? 0

  // --- Permissions ---------------------------------------------------------
  const canSyncFromAdmob = hasScreenFunction(SCREEN_APPS, FN_SYNC_FROM_ADMOB)

  // Per-tab visibility: sub-perm `view-details:<tab>` la single source of truth
  // (parent `view-details` la shortcut all-in-one, da xu ly trong hasAppDetailTab).
  // Cac quyen action nhu `configure-insight` / `regenerate-insight` chi gate
  // THAO TAC ben trong tab (da co check rieng trong cac tab component), khong
  // anh huong viec hien thi tab.
  const canViewOverview = hasAppDetailTab("overview")
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
    canViewAdUnits && "ad-units",
    canViewAdUnitsMediation && "ad-units-mediation",
    canViewWaterfallAdUnits && "waterfall-ad-units",
    canViewMediationGroups && "mediation-groups",
    canViewMediationGroupsMediation && "mediation-groups-mediation",
    canViewPerformance && "performance",
    showAiInsightTab && "ai-insight",
    showInsightConfigTab && "insight-config",
    showPlaybookTab && "playbook",
    canViewSettingsTab && "settings",
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
  const [copied, setCopied] = useState(false)
  const [syncPerformanceModalOpen, setSyncPerformanceModalOpen] = useState(false)


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

  const copyToClipboard = async (text: string) => {
    try {
      const copiedText = await copyTextToClipboard(text)
      if (!copiedText) return

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy app ID", error)
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
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {searchParams.get("from") === "account" ? "Back to Account" : "Back to Apps"}
        </Link>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: App Info */}
          <div className="flex items-start gap-4">
            <img
              src={app?.iconUri || "/placeholder.svg"}
              alt={app?.displayName || app?.name || "App"}
              className="w-16 h-16 rounded-xl border border-slate-200 shadow-sm object-cover"
            />
            <div className="flex flex-col gap-2">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {appLoading ? "Loading..." : app?.displayName || app?.name || "Unnamed App"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {app?.appId || "--"}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => { if (app?.appId) { void copyToClipboard(app.appId) } }}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? "Copied!" : "Copy App ID"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-200">
                  <Apple className="w-3 h-3" />
                  {app?.platform || "Unknown"}
                </Badge>
                <Badge className="bg-green-100 text-green-700 border-0">
                  {app?.approvalState || "Unknown"}
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">
                  {app?.appId || "--"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {canSyncFromAdmob && (
              <Button
                className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => setSyncPerformanceModalOpen(true)}
                disabled={!app?.appId || appLoading}
              >
                <RefreshCw className="w-4 h-4" />
                Sync Performance
              </Button>
            )}
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={() => window.open("https://admob.google.com", "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              View in AdMob
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={() => window.open("https://apps.apple.com", "_blank")}
            >
              <Apple className="w-4 h-4" />
              View in App Store
            </Button>
            <PersonaSwitcherDropdown appId={String(app?.id ?? "")} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-9 p-0 bg-transparent">
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
                  onClick={() => { if (app?.appId) { void copyToClipboard(app.appId) } }}
                  disabled={!app?.appId}
                >
                  <Copy className="w-4 h-4" />
                  Copy App ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-amber-600">
                  <Pause className="w-4 h-4" />
                  Pause App
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Delete App
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-11 p-1 bg-slate-100 w-fit">
            {canViewOverview ? (
              <TabsTrigger value="overview" className="px-4 data-[state=active]:bg-white">
                Overview
              </TabsTrigger>
            ) : null}
            {canViewAdUnits ? (
              <TabsTrigger value="ad-units" className="px-4 data-[state=active]:bg-white">
                Ad Units
                <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                  deprecated
                </Badge>
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-xs">
                  {app?.adUnitsCount ?? 0}
                </Badge>
              </TabsTrigger>
            ) : null}
            {canViewAdUnitsMediation ? (
              <TabsTrigger value="ad-units-mediation" className="px-4 data-[state=active]:bg-white">
                Ad Units (Bronze)
              </TabsTrigger>
            ) : null}
            {canViewWaterfallAdUnits ? (
              <TabsTrigger value="waterfall-ad-units" className="px-4 data-[state=active]:bg-white">
                Waterfall Ad Units
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-xs">
                  {waterfallAdUnitsLoading ? "..." : waterfallAdUnitsCount}
                </Badge>
              </TabsTrigger>
            ) : null}
            {canViewMediationGroups ? (
              <TabsTrigger value="mediation-groups" className="px-4 data-[state=active]:bg-white">
                Mediation Groups
                <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                  deprecated
                </Badge>
                <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-xs">
                  {mediationGroupsLoading ? "..." : mediationGroupsCount}
                </Badge>
              </TabsTrigger>
            ) : null}
            {canViewMediationGroupsMediation ? (
              <TabsTrigger value="mediation-groups-mediation" className="px-4 data-[state=active]:bg-white">
                Mediation Groups (Bronze)
              </TabsTrigger>
            ) : null}
            {canViewPerformance ? (
              <TabsTrigger value="performance" className="px-4 data-[state=active]:bg-white">
                Performance
              </TabsTrigger>
            ) : null}
            {showAiInsightTab ? (
              <TabsTrigger value="ai-insight" className="px-4 data-[state=active]:bg-white gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Insight
              </TabsTrigger>
            ) : null}
            {showInsightConfigTab ? (
              <TabsTrigger value="insight-config" className="px-4 data-[state=active]:bg-white gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Insight config
              </TabsTrigger>
            ) : null}
            {showPlaybookTab ? (
              <TabsTrigger value="playbook" className="px-4 data-[state=active]:bg-white gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                AI Playbook
              </TabsTrigger>
            ) : null}
            {canViewSettingsTab ? (
              <TabsTrigger value="settings" className="px-4 data-[state=active]:bg-white">
                Settings
              </TabsTrigger>
            ) : null}
          </TabsList>

          {canViewOverview ? (
            <TabsContent value="overview" className="mt-6">
              <AppOverviewTab onNavigateToTab={handleTabChange} />
            </TabsContent>
          ) : null}
          {canViewAdUnits ? (
            <TabsContent value="ad-units" className="mt-6">
              <AppAdUnitsTab />
            </TabsContent>
          ) : null}
          {canViewAdUnitsMediation ? (
            <TabsContent value="ad-units-mediation" className="mt-6">
              <AppAdUnitsMediationTab appRowId={app?.id} />
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
          {canViewMediationGroups ? (
            <TabsContent value="mediation-groups" className="mt-6">
              <AppMediationGroupsTab
                mediationGroups={mediationGroups ?? null}
                loadingMediationGroups={mediationGroupsLoading}
              />
            </TabsContent>
          ) : null}
          {canViewMediationGroupsMediation ? (
            <TabsContent value="mediation-groups-mediation" className="mt-6">
              <AppMediationGroupsMediationTab appRowId={app?.id} />
            </TabsContent>
          ) : null}
          {canViewPerformance ? (
            <TabsContent value="performance" className="mt-6">
              {appLoading ? (
                <div className="flex items-center justify-center h-40 text-sm text-slate-500">Loading app…</div>
              ) : app?.appId ? (
                <AppPerformanceTab appId={app.appId} />
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
