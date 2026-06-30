"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Download,
  Search,
  X,
  Plus,
  Pencil,
  Layers,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  Check,
  FlaskConical,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MediationGroupsTable } from "./mediation-groups-table"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi, alertsApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { AD_FORMAT_OPTIONS, ALL_FORMATS_VALUE } from "@/lib/ad-format"

const SCREEN_MEDIATION_GROUPS = "s-mediation-groups"
const FN_VIEW = "view"
const FN_CONFIG = "config"
const FN_EXPORT = "export"

/** Bật lại = true khi muốn hiện Export, Bulk Edit, Create Group. */
const SHOW_GROUP_ACTIONS = false

/** Hiển thị appId: 10 ký tự đầu + ... + 10 ký tự cuối nếu dài hơn 20. */
function formatAppIdDisplay(appId: string): string {
  if (!appId) return ""
  return appId.length <= 20 ? appId : `${appId.slice(0, 5)}...${appId.slice(-12)}`
}

/** Hiển thị platform: ANDROID → AND, còn lại giữ nguyên. */
function formatPlatformDisplay(platform: string | undefined): string {
  if (!platform) return "—"
  return platform.toUpperCase().slice(0, 3)
}

const statusOptions = ["All Status", "Active", "Paused", "Error"]

interface ActiveFilter {
  type: string
  value: string
}

export function MediationGroupsPageContent() {
  const canView = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_VIEW)
  const canConfig = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_CONFIG)
  const canExport = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_EXPORT)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApp, setSelectedApp] = useState("all")
  const [format, setFormat] = useState(ALL_FORMATS_VALUE)
  const [status, setStatus] = useState("All Status")
  const [onlyShowIssues, setOnlyShowIssues] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)

  // Fetch mediation groups from API (now includes metrics and ad sources from cache)
  const { data: mediationGroupsWithData, loading: groupsLoading } = useApi(
    () => structureApi.getMediationGroups(),
    { 
      enabled: canView,
      cacheKey: 'mediation_groups_all' // Cache key for frontend cache
    }
  )

  // Transform cached data to match expected format
  const mediationGroups = useMemo(() => {
    if (!mediationGroupsWithData) return []
    return mediationGroupsWithData.map((group: any) => ({
      id: group.id,
      mediationGroupId: group.mediationGroupId,
      name: group.name,
      displayName: group.displayName,
      adFormat: group.adFormat,
      platform: group.platform,
      state: group.state,
      publisherId: group.publisherId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      lastSyncedAt: group.lastSyncedAt,
    }))
  }, [mediationGroupsWithData])

  // Groups with metrics (from cache)
  const groupsWithMetrics = useMemo(() => {
    if (!mediationGroupsWithData) return []
    return mediationGroupsWithData.map((group: any) => ({
      id: group.id,
      mediationGroupId: group.mediationGroupId,
      name: group.name,
      displayName: group.displayName,
      adFormat: group.adFormat,
      platform: group.platform,
      state: group.state,
      publisherId: group.publisherId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      lastSyncedAt: group.lastSyncedAt,
      adSources: group.adSources || [],
      ecpm: group.ecpm || 0,
      ecpmChangePct: group.ecpmChangePct || 0, // Use EcpmChangePct from cache
      revenue: group.revenue || 0,
      impressions: group.impressions || 0,
      fillRate: group.fillRate || 0,
      countries: group.countries || [],
      // App info from cache
      appId: group.appId,
      appAdMobId: group.appAdMobId,
      appName: group.appName,
      appIconUri: group.appIconUri,
    }))
  }, [mediationGroupsWithData])

  // Fetch apps for filter dropdown
  const { data: appsResponse } = useApi(
    () => structureApi.getApps(),
    { enabled: canView }
  )
  
  const apps = appsResponse?.apps || []

  // Update app options from API (label, appId, platform, iconUri for display & search)
  const appOptions = useMemo(() => {
    const allOption = { value: "all", label: "All Apps", appId: undefined as string | undefined, platform: undefined as string | undefined, iconUri: undefined as string | undefined }
    if (!apps || apps.length === 0) return [allOption]
    return [
      allOption,
      ...apps.map((app) => ({
        value: app.id.toString(),
        label: app.displayName || app.name,
        appId: app.appId,
        platform: app.platform,
        iconUri: app.iconUri,
      })),
    ]
  }, [apps])

  const canViewAlertsCenter = useMemo(() => hasScreenFunction("s-alerts", "view"), [])

  // Fetch active alerts summary
  const { data: alertsSummary } = useApi(
    () => alertsApi.getActiveAlertsSummary(),
    { enabled: canView && canViewAlertsCenter }
  )

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!groupsWithMetrics || groupsWithMetrics.length === 0) {
      if (!mediationGroups) return { total: 0, active: 0, abTests: 0, issues: 0, avgEcpm: 0 }
      return {
        total: mediationGroups.length,
        active: mediationGroups.filter(mg => mg.state === "ENABLED" || !mg.state).length,
        abTests: 0,
        issues: alertsSummary?.Total || 0,
        avgEcpm: 0,
      }
    }

    const total = groupsWithMetrics.length
    const active = groupsWithMetrics.filter((mg: any) => mg.state === "ENABLED" || !mg.state).length
    const abTests = 0 // TODO: Fetch from A/B tests API
    const issues = alertsSummary?.Total || 0
    const groupsWithEcpm = groupsWithMetrics.filter((mg: any) => mg.ecpm > 0)
    const avgEcpm = groupsWithEcpm.length > 0
      ? groupsWithEcpm.reduce((sum: number, mg: any) => sum + mg.ecpm, 0) / groupsWithEcpm.length
      : 0

    return { total, active, abTests, issues, avgEcpm }
  }, [groupsWithMetrics, mediationGroups, alertsSummary])

  const handleFilterChange = (type: string, value: string) => {
    const isDefaultValue =
      (type === "App" && value === "all") ||
      (type === "Format" && value === ALL_FORMATS_VALUE) ||
      (type === "Status" && value === "All Status") ||
      (type === "A/B Test" && value === "all")

    setActiveFilters((current) => {
    if (isDefaultValue) {
        return current.filter((f) => f.type !== type)
      }

      let displayValue = value
      if (type === "App") {
        displayValue = appOptions.find((a) => a.value === value)?.label || value
      } else if (type === "Format") {
        displayValue = AD_FORMAT_OPTIONS.find((option) => option.value === value)?.label || value
      }

      const existing = current.find((f) => f.type === type)
      if (existing) {
        return current.map((f) => (f.type === type ? { ...f, value: displayValue } : f))
      }

      return [...current, { type, value: displayValue }]
    })

    switch (type) {
      case "App":
        setSelectedApp(value)
        break
      case "Format":
        setFormat(value)
        break
      case "Status":
        setStatus(value)
        break
    }
  }

  const handleIssuesToggle = (checked: boolean) => {
    setOnlyShowIssues(checked)
    if (checked) {
      setActiveFilters((current) => {
        const existing = current.find((f) => f.type === "Issues")
        return existing ? current : [...current, { type: "Issues", value: "Only issues" }]
      })
    } else {
      setActiveFilters((current) => current.filter((f) => f.type !== "Issues"))
    }
  }

  const removeFilter = (type: string) => {
    setActiveFilters((current) => current.filter((f) => f.type !== type))
    switch (type) {
      case "App":
        setSelectedApp("all")
        break
      case "Format":
        setFormat(ALL_FORMATS_VALUE)
        break
      case "Status":
        setStatus("All Status")
        break
      case "Issues":
        setOnlyShowIssues(false)
        break
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setSelectedApp("all")
    setFormat(ALL_FORMATS_VALUE)
    setStatus("All Status")
    setOnlyShowIssues(false)
    setSearchQuery("")
  }

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Mediation Groups</h1>
            {groupsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="secondary" className="font-medium">
                {summaryStats.total}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Configure and optimize your ad waterfall settings</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-card pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* App Dropdown with Search (by name or appId), display: logo, name, platform, appId */}
            <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={appPopoverOpen}
                  className="h-10 w-52 min-w-0 justify-between bg-card"
                  disabled={apps.length === 0}
                >
                  {selectedApp === "all" ? (
                    <span className="truncate">All Apps</span>
                  ) : (
                    (() => {
                      const opt = appOptions.find((a) => a.value === selectedApp)
                      return opt ? (
                        <span className="flex items-center gap-2 min-w-0">
                          {opt.iconUri ? (
                            <img src={opt.iconUri} alt="" className="h-5 w-5 rounded shrink-0" />
                          ) : (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                              {(opt.label || "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                      ) : (
                        <span className="truncate">All Apps</span>
                      )
                    })()
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command shouldFilter={true}>
                  <CommandInput placeholder="Search by app name or app ID..." />
                  <CommandList>
                    <CommandEmpty>No app found.</CommandEmpty>
                    <CommandGroup>
                      {appOptions.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.value === "all" ? "all" : `${opt.label} ${opt.appId ?? ""} ${opt.value}`}
                          onSelect={() => {
                            handleFilterChange("App", opt.value)
                            setAppPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4 shrink-0", selectedApp === opt.value ? "opacity-100" : "opacity-0")}
                          />
                          {opt.value === "all" ? (
                            <span className="font-medium">All Apps</span>
                          ) : (
                            <>
                              {opt.iconUri ? (
                                <img src={opt.iconUri} alt="" className="h-8 w-8 rounded shrink-0" />
                              ) : (
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {(opt.label || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="flex flex-col min-w-0 text-left">
                                <span className="font-medium truncate">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {[formatPlatformDisplay(opt.platform), formatAppIdDisplay(opt.appId ?? "")].filter(Boolean).join(" · ")}
                                </span>
                              </div>
                            </>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={format} onValueChange={(v) => handleFilterChange("Format", v)}>
              <SelectTrigger className="h-10 w-36 bg-card">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {AD_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => handleFilterChange("Status", v)}>
              <SelectTrigger className="h-10 w-32 bg-card">
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

            {/* Only show issues checkbox */}
            {/* <div className="flex h-10 items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Checkbox
                id="issues"
                checked={onlyShowIssues}
                onCheckedChange={(checked) => handleIssuesToggle(checked as boolean)}
              />
              <label htmlFor="issues" className="cursor-pointer whitespace-nowrap text-sm text-muted-foreground">
                Only show issues
              </label>
            </div> */}
            </div>
          </div>

        {/* Right: Actions (ẩn khi SHOW_GROUP_ACTIONS = false) */}
        <div className="flex items-center gap-2">
          {SHOW_GROUP_ACTIONS && canExport && (
            <Button variant="outline" className="h-10 gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {SHOW_GROUP_ACTIONS && canConfig && (
            <Button variant="outline" className="h-10 gap-2 bg-transparent">
              <Pencil className="w-4 h-4" />
              Bulk Edit
            </Button>
          )}
          {SHOW_GROUP_ACTIONS && canConfig && (
            <Button className="h-10 gap-2">
              <Plus className="w-4 h-4" />
              Create Group
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

      {/* Summary Cards - Added A/B Tests Running card */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Groups</p>
              {groupsLoading ? (
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
              <Layers className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              {groupsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.active}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/15">
              <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A/B Tests Running</p>
              {groupsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{summaryStats.abTests}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Need Attention</p>
              <div className="flex items-center gap-1.5">
                {groupsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-xl font-semibold text-foreground">{summaryStats.issues}</p>
                    {summaryStats.issues > 0 && <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-300" />}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/15">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg eCPM</p>
              {groupsLoading ? (
                <Loader2 className="mt-1 h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-xl font-semibold text-foreground">
                  {summaryStats.avgEcpm > 0 ? `$${summaryStats.avgEcpm.toFixed(2)}` : '—'}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedGroups.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-primary sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{selectedGroups.length} groups selected</span>
          <div className="flex flex-wrap items-center gap-2">
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Pause All
              </Button>
            )}
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Resume All
              </Button>
            )}
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 max-w-full border-0 text-left whitespace-normal">
                Bulk Edit eCPM
              </Button>
            )}
            {canExport && (
              <Button variant="secondary" size="sm" className="h-8 border-0">
                Export
              </Button>
            )}
            <button onClick={() => setSelectedGroups([])} className="text-sm text-primary hover:underline sm:ml-2">
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Mediation Groups Table */}
      <MediationGroupsTable
        mediationGroups={groupsWithMetrics || []}
        loading={groupsLoading}
        searchQuery={searchQuery}
        appFilter={selectedApp}
        formatFilter={format}
        statusFilter={status}
        onlyShowIssues={onlyShowIssues}
        selectedGroups={selectedGroups}
        onSelectionChange={setSelectedGroups}
        canConfig={canConfig}
      />
    </div>
  )
}
