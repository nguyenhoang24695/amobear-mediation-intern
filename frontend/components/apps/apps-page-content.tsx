"use client"

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RefreshCw, Download, Search, X, Cloud, Smartphone, Layers, DollarSign, Loader2, AlertCircle, ArrowRight, ChevronDown, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { AppsTable } from "./apps-table"
import { Card } from "@/components/ui/card"
import { useApi } from "@/hooks/use-api"
import { structureApi, type StructureAppsResponse } from "@/lib/api/services"
import { loadStructureAppsProgressive } from "@/lib/apps/load-structure-apps-progressive"
import { hasScreenFunction, canEnterAppDetail } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_APPS = "s-apps"
const FN_VIEW = "view"
const FN_EXPORT = "export"
const FN_SYNC_FROM_ADMOB = "sync-from-admob"
const FN_PAUSE = "pause"
const FN_RESUME = "resume"
const FN_VIEW_IN_ADMOB = "view-in-admob"
const FN_SET_TYPE = "set-type"

const platformOptions = ["All Platforms", "ANDROID", "IOS"]
const statusOptions = ["All Status", "Active", "Others"]
const typeOptions = ["All Types", "game", "app"]
const wfOptions = ["All %WF", ">= 40%", "< 40%"]
const networkOptions = ["All Networks", "AdMob", "Unity Ads", "ironSource", "AppLovin"]
const ALL_ACCOUNTS_VALUE = "All Accounts"

interface ActiveFilter {
  type: string
  value: string
}

export function AppsPageContent() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [platform, setPlatform] = useState("All Platforms")
  const [status, setStatus] = useState("Active")
  const [type, setType] = useState("All Types")
  const [wfFilter, setWfFilter] = useState("All %WF")
  const [network, setNetwork] = useState("All Networks")
  const [admobAccount, setAdmobAccount] = useState(ALL_ACCOUNTS_VALUE)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [updatingType, setUpdatingType] = useState<"game" | "app" | null>(null)
  const [appsResponse, setAppsResponse] = useState<StructureAppsResponse | null>(null)
  const [appsLoading, setAppsLoading] = useState(true)
  const [backgroundAppsLoading, setBackgroundAppsLoading] = useState(false)
  const loadAbortRef = useRef<AbortController | null>(null)

  const loadApps = useCallback(async () => {
    loadAbortRef.current?.abort()
    const controller = new AbortController()
    loadAbortRef.current = controller

    setAppsLoading(true)
    setBackgroundAppsLoading(false)
    setAppsResponse(null)

    try {
      const response = await loadStructureAppsProgressive({
        ...(admobAccount !== ALL_ACCOUNTS_VALUE ? { publisherId: admobAccount } : {}),
        approvalState: "all",
        signal: controller.signal,
        onFirstPage: (firstPage) => {
          if (controller.signal.aborted) return
          setAppsResponse(firstPage)
          setAppsLoading(false)

          const totalPages =
            firstPage.totalPages ??
            (firstPage.summary?.totalApps
              ? Math.ceil(firstPage.summary.totalApps / 50)
              : 1)
          if (totalPages > 1) setBackgroundAppsLoading(true)
        },
        onPage: (pageResponse, page) => {
          if (controller.signal.aborted || page <= 1) return
          setAppsResponse((prev) =>
            prev
              ? {
                  ...prev,
                  apps: [...prev.apps, ...pageResponse.apps],
                  summary: prev.summary,
                }
              : pageResponse,
          )
        },
      })

      if (!controller.signal.aborted) {
        setAppsResponse(response)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Failed to load apps", error)
      }
    } finally {
      if (!controller.signal.aborted) {
        setBackgroundAppsLoading(false)
        setAppsLoading(false)
      }
    }
  }, [admobAccount])

  useEffect(() => {
    void loadApps()
    return () => {
      loadAbortRef.current?.abort()
    }
  }, [loadApps])

  const apps = appsResponse?.apps || []
  const summary = appsResponse?.summary
  const activeFilterCount = activeFilters.length + (searchQuery.trim() ? 1 : 0)

  // Số waterfall chưa được gắn với ad unit nào (orphan). Gọi theo publisherId khi chọn 1 account.
  const { data: orphanWaterfallData, loading: orphanWaterfallLoading } = useApi(
    () => structureApi.getOrphanWaterfallCount(admobAccount === ALL_ACCOUNTS_VALUE ? undefined : admobAccount),
    { enabled: true, cacheKey: `orphan_waterfall_count_${admobAccount}` }
  )
  const orphanWaterfallCount = orphanWaterfallData?.count ?? 0

  // Danh sách AdMob accounts cho dropdown: lấy unique publisherId từ apps khi đang "All Accounts"
  const [admobAccountOptions, setAdmobAccountOptions] = useState<string[]>([])
  useEffect(() => {
    if (admobAccount === ALL_ACCOUNTS_VALUE && apps.length > 0) {
      const ids = Array.from(new Set(apps.map((a) => a.publisherId).filter(Boolean))) as string[]
      setAdmobAccountOptions(ids.sort())
    }
  }, [admobAccount, apps])
  const admobAccountSelectOptions = useMemo(() => {
    const opts = [ALL_ACCOUNTS_VALUE, ...admobAccountOptions]
    if (admobAccount !== ALL_ACCOUNTS_VALUE && admobAccount && !admobAccountOptions.includes(admobAccount)) {
      opts.push(admobAccount)
    }
    return opts
  }, [admobAccountOptions, admobAccount])

  // Summary từ API: Total Apps = tất cả (kể cả chưa APPROVED), Active = đã APPROVED, Total Ad Units / Total Waterfall Ad Units, orphan waterfall count
  const summaryStats = useMemo(() => {
    if (!appsResponse) return { total: 0, active: 0, totalAdUnits: 0, totalWaterfallAdUnits: 0, avgEcpm: 0, orphanWaterfallCount: 0 }
    return {
      total: summary?.totalApps ?? apps.length,
      active: summary?.totalApprovedApps ?? apps.filter(app => app.approvalState === "APPROVED" || !app.approvalState).length,
      totalAdUnits: summary?.totalAdUnits ?? 0,
      totalWaterfallAdUnits: summary?.totalWaterfallAdUnits ?? 0,
      avgEcpm: summary?.averageEcpm ?? 0,
      orphanWaterfallCount,
    }
  }, [appsResponse, apps, summary, orphanWaterfallCount])

  const handleFilterChange = (type: string, value: string) => {
    if (value.startsWith("All")) {
      setActiveFilters(activeFilters.filter((f) => f.type !== type))
    } else {
      const existing = activeFilters.find((f) => f.type === type)
      if (existing) {
        setActiveFilters(activeFilters.map((f) => (f.type === type ? { ...f, value } : f)))
      } else {
        setActiveFilters([...activeFilters, { type, value }])
      }
    }

    switch (type) {
      case "Platform":
        setPlatform(value)
        break
      case "Status":
        setStatus(value)
        break
      case "Type":
        setType(value)
        break
      case "% WF":
        setWfFilter(value)
        break
      case "Network":
        setNetwork(value)
        break
      case "AdMob Account":
        setAdmobAccount(value)
        break
    }
  }

  const removeFilter = (type: string) => {
    setActiveFilters(activeFilters.filter((f) => f.type !== type))
    switch (type) {
      case "Platform":
        setPlatform("All Platforms")
        break
      case "Status":
        setStatus("Active")
        break
      case "Type":
        setType("All Types")
        break
      case "% WF":
        setWfFilter("All %WF")
        break
      case "Network":
        setNetwork("All Networks")
        break
      case "AdMob Account":
        setAdmobAccount(ALL_ACCOUNTS_VALUE)
        break
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setPlatform("All Platforms")
    setStatus("Active")
    setType("All Types")
    setWfFilter("All %WF")
    setNetwork("All Networks")
    setAdmobAccount(ALL_ACCOUNTS_VALUE)
    setSearchQuery("")
  }

  const bulkSetType = async (targetType: "game" | "app") => {
    if (!apps || selectedApps.length === 0) return
    const appIds = apps
      .filter((app) => selectedApps.includes(app.id.toString()))
      .map((app) => app.appId)
      .filter(Boolean)

    if (appIds.length === 0) return

    try {
      setUpdatingType(targetType)
      await structureApi.updateAppsType({ appIds, type: targetType })
      await loadApps()
      setSelectedApps([])
    } finally {
      setUpdatingType(null)
    }
  }

  const canView = hasScreenFunction(SCREEN_APPS, FN_VIEW)
  const canExport = hasScreenFunction(SCREEN_APPS, FN_EXPORT)
  const canSyncFromAdmob = hasScreenFunction(SCREEN_APPS, FN_SYNC_FROM_ADMOB)
  const canPause = hasScreenFunction(SCREEN_APPS, FN_PAUSE)
  const canResume = hasScreenFunction(SCREEN_APPS, FN_RESUME)
  // Có thể click sang trang detail nếu có ít nhất một quyền tab view-details:*
  const canViewDetails = canEnterAppDetail()
  const canViewInAdmob = hasScreenFunction(SCREEN_APPS, FN_VIEW_IN_ADMOB)
  const canSetType = hasScreenFunction(SCREEN_APPS, FN_SET_TYPE)

  const filterSelectClassName = "h-10 w-full bg-card lg:w-auto"
  const filterControls: ReactNode = (
    <>
      <Select value={platform} onValueChange={(v) => handleFilterChange("Platform", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-36`}>
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          {platformOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => handleFilterChange("Status", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-32`}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={(v) => handleFilterChange("Type", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-32`}>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={network} onValueChange={(v) => handleFilterChange("Network", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-36`}>
          <SelectValue placeholder="Network" />
        </SelectTrigger>
        <SelectContent>
          {networkOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={admobAccount} onValueChange={(v) => handleFilterChange("AdMob Account", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-44`}>
          <SelectValue placeholder="AdMob Account" />
        </SelectTrigger>
        <SelectContent>
          {admobAccountSelectOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt === ALL_ACCOUNTS_VALUE ? "All Accounts" : opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={wfFilter} onValueChange={(v) => handleFilterChange("% WF", v)}>
        <SelectTrigger className={`${filterSelectClassName} lg:w-32`}>
          <SelectValue placeholder="% WF" />
        </SelectTrigger>
        <SelectContent>
          {wfOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Apps</h1>
            {appsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="secondary" className="font-medium">
                {summaryStats.total}
                {backgroundAppsLoading ? "…" : ""}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage your mobile applications and ad units</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3">
        {/* Left: Search & Filters */}
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative w-full xl:w-80 xl:shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, app ID, or store ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-card pl-9"
            />
          </div>

          <div className="hidden w-full min-w-0 lg:flex lg:flex-wrap lg:gap-2">
            {filterControls}
          </div>

          <Collapsible open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} className="w-full lg:hidden">
            <div className="rounded-xl border border-border bg-card/60">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeFilterCount > 0 ? "Tap to review or refine current filters" : "Tap to choose platform, status, network, and more"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border px-3 pb-3 pt-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filterControls}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Right: Actions */}
        <div
          className={`grid w-full gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end ${
            canExport && canSyncFromAdmob ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {canExport && (
            <Button variant="outline" className="h-10 w-full gap-2 bg-transparent sm:w-auto">
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {canSyncFromAdmob && (
            <Button 
              className="h-10 w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto"
              onClick={() => void loadApps()}
              disabled={appsLoading || backgroundAppsLoading}
            >
              <RefreshCw className={`w-4 h-4 ${appsLoading || backgroundAppsLoading ? 'animate-spin' : ''}`} />
              {appsLoading || backgroundAppsLoading ? 'Syncing...' : 'Sync from AdMob'}
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.type}
              variant="secondary"
              className="gap-1 border border-primary/20 bg-primary/10 pr-1 text-primary"
            >
              {filter.type}: {filter.value}
              <button onClick={() => removeFilter(filter.type)} className="ml-1 rounded p-0.5 hover:bg-primary/15">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <button onClick={clearAllFilters} className="text-sm text-primary hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Sync Status Bar */}
      <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-4 w-4 text-primary" />
            <span>
              Last synced: <span className="font-medium text-foreground">
                {apps && apps.length > 0 && apps[0].lastSyncedAt 
                  ? new Date(apps[0].lastSyncedAt).toLocaleString()
                  : 'Never'}
              </span>
            </span>
          </div>
          <div className="hidden h-4 w-px bg-primary/20 sm:block" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{summaryStats.total}</span> apps
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{summaryStats.totalAdUnits.toLocaleString()}</span> ad units
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Auto-sync:</span>
          <Badge className="border-0 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300">Enabled</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Apps</p>
              {appsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.total}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/15">
              <Smartphone className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              {appsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.active}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/15">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Ad Units</p>
              {appsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.totalAdUnits.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Layers className="h-5 w-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Waterfall Ad Units</p>
              {appsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.totalWaterfallAdUnits.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg eCPM</p>
              {appsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">
                  {summaryStats.avgEcpm > 0 ? `$${summaryStats.avgEcpm.toFixed(2)}` : '—'}
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/15">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unused Waterfalls</p>
                {orphanWaterfallLoading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-xl font-semibold text-foreground">{summaryStats.orphanWaterfallCount.toLocaleString()}</p>
                )}
              </div>
            </div>
            {summaryStats.orphanWaterfallCount > 0 && (
              <Link
                href={admobAccount === ALL_ACCOUNTS_VALUE ? "/waterfall" : `/waterfall?publisherId=${encodeURIComponent(admobAccount)}`}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-1"
              >
                View details
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedApps.length > 0 && (canPause || canResume || canExport || canSetType) && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-primary">
          <span className="text-sm font-medium">{selectedApps.length} apps selected</span>
          <div className="flex items-center gap-2">
            {canPause && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Pause Selected
              </Button>
            )}
            {canResume && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Resume Selected
              </Button>
            )}
            {canExport && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Export Selected
              </Button>
            )}
            {canSetType && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-0"
                  disabled={updatingType !== null}
                  onClick={() => bulkSetType("game")}
                >
                  {updatingType === "game" ? "Setting as Game..." : "Set type: Game"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 border-0"
                  disabled={updatingType !== null}
                  onClick={() => bulkSetType("app")}
                >
                  {updatingType === "app" ? "Setting as App..." : "Set type: App"}
                </Button>
              </>
            )}
            <button onClick={() => setSelectedApps([])} className="ml-2 text-sm text-primary hover:underline">
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Apps Table */}
      <AppsTable
        apps={apps || []}
        loading={appsLoading}
        searchQuery={searchQuery}
        platformFilter={platform}
        statusFilter={status}
        typeFilter={type}
        wfFilter={wfFilter}
        networkFilter={network}
        selectedApps={selectedApps}
        onSelectionChange={setSelectedApps}
        canViewDetails={canViewDetails}
        canViewInAdmob={canViewInAdmob}
        canPause={canPause}
        canResume={canResume}
      />
    </div>
  )
}
