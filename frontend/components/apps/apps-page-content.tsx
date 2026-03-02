"use client"

import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Download, Search, X, Cloud, Smartphone, Layers, DollarSign, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { AppsTable } from "./apps-table"
import { Card } from "@/components/ui/card"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"

const platformOptions = ["All Platforms", "ANDROID", "IOS"]
const statusOptions = ["All Status", "Active", "Paused", "Error"]
const typeOptions = ["All Types", "game", "app"]
const wfOptions = ["All %WF", ">= 40%", "< 40%"]
const networkOptions = ["All Networks", "AdMob", "Unity Ads", "ironSource", "AppLovin"]
const ALL_ACCOUNTS_VALUE = "All Accounts"

interface ActiveFilter {
  type: string
  value: string
}

export function AppsPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [platform, setPlatform] = useState("All Platforms")
  const [status, setStatus] = useState("All Status")
  const [type, setType] = useState("All Types")
  const [wfFilter, setWfFilter] = useState("All %WF")
  const [network, setNetwork] = useState("All Networks")
  const [admobAccount, setAdmobAccount] = useState(ALL_ACCOUNTS_VALUE)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [updatingType, setUpdatingType] = useState<"game" | "app" | null>(null)

  // Fetch apps từ API (khi chọn "All Accounts" = getApps(), khi chọn 1 tài khoản = getApps(publisherId))
  const { data: appsResponse, loading: appsLoading, refetch: refetchApps } = useApi(
    () => structureApi.getApps(admobAccount === ALL_ACCOUNTS_VALUE ? undefined : admobAccount),
    { enabled: true, cacheKey: `apps_list_${admobAccount}` }
  )

  const apps = appsResponse?.apps || []
  const summary = appsResponse?.summary

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
        setStatus("All Status")
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
    setStatus("All Status")
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
      await refetchApps()
      setSelectedApps([])
    } finally {
      setUpdatingType(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Apps</h1>
            {appsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                {summaryStats.total}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Manage your mobile applications and ad units</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={platform} onValueChange={(v) => handleFilterChange("Platform", v)}>
              <SelectTrigger className="w-36 h-10 bg-white">
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

            <Select value={type} onValueChange={(v) => handleFilterChange("Type", v)}>
              <SelectTrigger className="w-32 h-10 bg-white">
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
              <SelectTrigger className="w-36 h-10 bg-white">
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
              <SelectTrigger className="w-44 h-10 bg-white min-w-[11rem]">
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
              <SelectTrigger className="w-32 h-10 bg-white">
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
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            className="h-10 gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => refetchApps()}
            disabled={appsLoading}
          >
            <RefreshCw className={`w-4 h-4 ${appsLoading ? 'animate-spin' : ''}`} />
            {appsLoading ? 'Syncing...' : 'Sync from AdMob'}
          </Button>
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

      {/* Sync Status Bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Cloud className="w-4 h-4 text-blue-500" />
            <span>
              Last synced: <span className="font-medium text-slate-900">
                {apps && apps.length > 0 && apps[0].lastSyncedAt 
                  ? new Date(apps[0].lastSyncedAt).toLocaleString()
                  : 'Never'}
              </span>
            </span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-blue-200" />
          <span className="text-slate-600">
            <span className="font-medium text-slate-900">{summaryStats.total}</span> apps
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">
            <span className="font-medium text-slate-900">{summaryStats.totalAdUnits.toLocaleString()}</span> ad units
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Auto-sync:</span>
          <Badge className="bg-green-100 text-green-700 border-0">Enabled</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Apps</p>
              {appsLoading ? (
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
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active</p>
              {appsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.active}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Ad Units</p>
              {appsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.totalAdUnits.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Waterfall Ad Units</p>
              {appsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">{summaryStats.totalWaterfallAdUnits.toLocaleString()}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg eCPM</p>
              {appsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-slate-900">
                  {summaryStats.avgEcpm > 0 ? `$${summaryStats.avgEcpm.toFixed(2)}` : '—'}
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Unused Waterfalls</p>
                {orphanWaterfallLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
                ) : (
                  <p className="text-xl font-semibold text-slate-900">{summaryStats.orphanWaterfallCount.toLocaleString()}</p>
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
      {selectedApps.length > 0 && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedApps.length} apps selected</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Pause Selected
            </Button>
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Resume Selected
            </Button>
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Export Selected
            </Button>
            <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0"
                disabled={updatingType !== null}
                onClick={() => bulkSetType("game")}
              >
                {updatingType === "game" ? "Setting as Game..." : "Set type: Game"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0"
              disabled={updatingType !== null}
              onClick={() => bulkSetType("app")}
            >
              {updatingType === "app" ? "Setting as App..." : "Set type: App"}
            </Button>
            <button onClick={() => setSelectedApps([])} className="text-sm text-slate-300 hover:text-white ml-2">
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
      />
    </div>
  )
}
