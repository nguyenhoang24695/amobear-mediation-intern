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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MediationGroupsTable } from "./mediation-groups-table"
import { cn } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"
import { structureApi, mediationGroupMetricsApi, alertsApi } from "@/lib/api/services"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"

const SCREEN_MEDIATION_GROUPS = "s-mediation-groups"
const FN_VIEW = "view"
const FN_CONFIG = "config"
const FN_EXPORT = "export"

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

const formatOptions = ["All Formats", "Banner", "Interstitial", "Rewarded", "Native", "App Open"]
const statusOptions = ["All Status", "Active", "Paused", "Error"]

const abTestOptions = [
  { value: "all", label: "All", count: null },
  { value: "running", label: "Running", count: 3 },
  { value: "completed", label: "Completed", count: 2 },
  { value: "none", label: "No Test", count: null },
]

interface ActiveFilter {
  type: string
  value: string
}

export function MediationGroupsPageContent() {
  const canView = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_VIEW)
  const canConfig = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_CONFIG)
  const canExport = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_EXPORT)

  const [searchQuery, setSearchQuery] = useState("")

  if (!canView) {
    return <NoPermissionView />
  }
  const [selectedApp, setSelectedApp] = useState("all")
  const [format, setFormat] = useState("All Formats")
  const [status, setStatus] = useState("All Status")
  const [abTestFilter, setAbTestFilter] = useState("all")
  const [onlyShowIssues, setOnlyShowIssues] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)

  // Fetch mediation groups from API (now includes metrics and ad sources from cache)
  const { data: mediationGroupsWithData, loading: groupsLoading, refetch: refetchGroups } = useApi(
    () => structureApi.getMediationGroups(),
    { 
      enabled: true,
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
    { enabled: true }
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

  // Fetch active alerts summary
  const { data: alertsSummary } = useApi(
    () => alertsApi.getActiveAlertsSummary(),
    { enabled: true }
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
    const issues = alertsSummary?.total || 0
    const groupsWithEcpm = groupsWithMetrics.filter((mg: any) => mg.ecpm > 0)
    const avgEcpm = groupsWithEcpm.length > 0
      ? groupsWithEcpm.reduce((sum: number, mg: any) => sum + mg.ecpm, 0) / groupsWithEcpm.length
      : 0

    return { total, active, abTests, issues, avgEcpm }
  }, [groupsWithMetrics, mediationGroups, alertsSummary])

  const handleFilterChange = (type: string, value: string) => {
    const isDefaultValue = value === "all" || value.startsWith("All")

    if (isDefaultValue) {
      setActiveFilters(activeFilters.filter((f) => f.type !== type))
    } else {
      let displayValue = value
      if (type === "App") {
        displayValue = appOptions.find((a) => a.value === value)?.label || value
      } else if (type === "A/B Test") {
        displayValue = abTestOptions.find((a) => a.value === value)?.label || value
      }

      const existing = activeFilters.find((f) => f.type === type)
      if (existing) {
        setActiveFilters(activeFilters.map((f) => (f.type === type ? { ...f, value: displayValue } : f)))
      } else {
        setActiveFilters([...activeFilters, { type, value: displayValue }])
      }
    }

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
      case "A/B Test":
        setAbTestFilter(value)
        break
    }
  }

  const handleIssuesToggle = (checked: boolean) => {
    setOnlyShowIssues(checked)
    if (checked) {
      const existing = activeFilters.find((f) => f.type === "Issues")
      if (!existing) {
        setActiveFilters([...activeFilters, { type: "Issues", value: "Only issues" }])
      }
    } else {
      setActiveFilters(activeFilters.filter((f) => f.type !== "Issues"))
    }
  }

  const removeFilter = (type: string) => {
    setActiveFilters(activeFilters.filter((f) => f.type !== type))
    switch (type) {
      case "App":
        setSelectedApp("all")
        break
      case "Format":
        setFormat("All Formats")
        break
      case "Status":
        setStatus("All Status")
        break
      case "A/B Test":
        setAbTestFilter("all")
        break
      case "Issues":
        setOnlyShowIssues(false)
        break
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setSelectedApp("all")
    setFormat("All Formats")
    setStatus("All Status")
    setAbTestFilter("all")
    setOnlyShowIssues(false)
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Mediation Groups</h1>
            {groupsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                {summaryStats.total}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Configure and optimize your ad waterfall settings</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
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
                  className="w-52 min-w-0 h-10 justify-between bg-white"
                  disabled={!apps}
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
                            <span className="h-5 w-5 rounded bg-slate-200 flex items-center justify-center text-xs font-medium shrink-0">
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
                          value={opt.value === "all" ? "all" : `${opt.label} ${opt.appId ?? ""}`}
                          onSelect={(selectedValue) => {
                            const id =
                              selectedValue === "all"
                                ? "all"
                                : appOptions.find((o) => o.value === selectedValue)?.value ??
                                  appOptions.find((o) => o.appId && `${o.label} ${o.appId}` === selectedValue)?.value ??
                                  selectedValue
                            handleFilterChange("App", id)
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
                                <span className="text-xs text-slate-500">
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
              <SelectTrigger className="w-36 h-10 bg-white">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => handleFilterChange("Status", v)}>
              <SelectTrigger className="w-32 h-10 bg-white">
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

            <Select value={abTestFilter} onValueChange={(v) => handleFilterChange("A/B Test", v)}>
              <SelectTrigger className="w-32 h-10 bg-white">
                <div className="flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="A/B Test" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {abTestOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{opt.label}</span>
                      {opt.count !== null && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-slate-100">
                          {opt.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Only show issues checkbox */}
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md bg-white h-10">
              <Checkbox
                id="issues"
                checked={onlyShowIssues}
                onCheckedChange={(checked) => handleIssuesToggle(checked as boolean)}
              />
              <label htmlFor="issues" className="text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                Only show issues
              </label>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="outline" className="h-10 gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {canConfig && (
            <Button variant="outline" className="h-10 gap-2 bg-transparent">
              <Pencil className="w-4 h-4" />
              Bulk Edit
            </Button>
          )}
          {canConfig && (
            <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.type}
              variant="secondary"
              className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
            >
              {filter.type}: {filter.value}
              <button onClick={() => removeFilter(filter.type)} className="ml-1 hover:bg-blue-100 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <button onClick={clearAllFilters} className="text-sm text-blue-600 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Summary Cards - Added A/B Tests Running card */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Groups</p>
              {groupsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.total}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active</p>
              {groupsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.active}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">A/B Tests Running</p>
              {groupsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.abTests}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Need Attention</p>
              <div className="flex items-center gap-1.5">
                {groupsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  <>
                    <p className="text-xl font-semibold text-slate-900">{summaryStats.issues}</p>
                    {summaryStats.issues > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg eCPM</p>
              {groupsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">
                  {summaryStats.avgEcpm > 0 ? `$${summaryStats.avgEcpm.toFixed(2)}` : '—'}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedGroups.length > 0 && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedGroups.length} groups selected</span>
          <div className="flex items-center gap-2">
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Pause All
              </Button>
            )}
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Resume All
              </Button>
            )}
            {canConfig && (
              <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Bulk Edit eCPM
              </Button>
            )}
            {canExport && (
              <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Export
              </Button>
            )}
            <button onClick={() => setSelectedGroups([])} className="text-sm text-slate-300 hover:text-white ml-2">
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Mediation Groups Table - Added abTestFilter prop */}
      <MediationGroupsTable
        mediationGroups={groupsWithMetrics || []}
        loading={groupsLoading}
        searchQuery={searchQuery}
        appFilter={selectedApp}
        formatFilter={format}
        statusFilter={status}
        onlyShowIssues={onlyShowIssues}
        abTestFilter={abTestFilter}
        selectedGroups={selectedGroups}
        onSelectionChange={setSelectedGroups}
        canConfig={canConfig}
      />
    </div>
  )
}
