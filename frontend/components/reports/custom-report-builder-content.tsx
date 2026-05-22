"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CalendarIcon,
  ChevronDown,
  Save,
  Search,
  ArrowUpDown,
  HelpCircle,
  Smartphone,
  Download,
  X,
  AlertCircle,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { enUS } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { useApi } from "@/hooks/use-api"
import { useCustomReportQuery } from "@/hooks/use-custom-report-query"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { organizationsApi, reportsApi, structureApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import type { CustomReportCatalogItem } from "@/types/reports"

const datePresets = [
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last30", label: "Last 30 days", days: 30 },
  { id: "last90", label: "Last 90 days", days: 90 },
] as const

const FILTER_DATE_RANGE = "Date range"
const FILTER_APPS = "Apps"
const FILTER_COMMISSION_USER = "Commission User"
const FILTER_REVENUE_SOURCE = "Revenue source"

const DEFAULT_PARAMETERS: CustomReportCatalogItem[] = [
  { id: "app", label: "App", category: "Core" },
  { id: "date", label: "Date", category: "Time" },
  { id: "platform", label: "Platform", category: "Core" },
]

const DEFAULT_METRICS: CustomReportCatalogItem[] = [
  { id: "estimated_revenue", label: "Estimated revenue", category: "Revenue", format: "currency" },
  { id: "observed_ecpm", label: "Observed eCPM", category: "Revenue", format: "currency" },
  { id: "requests", label: "Requests", category: "Volume", format: "number" },
  { id: "match_rate", label: "Match rate", category: "Performance", format: "percent" },
  { id: "matched_requests", label: "Matched requests", category: "Volume", format: "number" },
  { id: "show_rate", label: "Show rate", category: "Performance", format: "percent" },
  { id: "impressions", label: "Impressions", category: "Volume", format: "number" },
  { id: "arpdau_ads", label: "ARPDAU (ads)", category: "Revenue", format: "currency" },
  { id: "iap_net_revenue", label: "IAP net revenue", category: "Revenue", format: "currency" },
  { id: "total_revenue_usd", label: "Total revenue (IAA + IAP)", category: "Revenue", format: "currency" },
]

const revenueSourceOptions = ["All", "Ads", "InAppPurchase", "Subscription"]

interface ActiveFilter {
  type: string
  value: string
}

function upsertActiveFilter(filters: ActiveFilter[], type: string, value: string): ActiveFilter[] {
  if (value === "All") return filters.filter((f) => f.type !== type)
  const existing = filters.find((f) => f.type === type)
  if (existing) return filters.map((f) => (f.type === type ? { type, value } : f))
  return [...filters, { type, value }]
}

function formatMetricValue(
  value: number | string | null | undefined,
  metricId: string,
  metricCatalog: CustomReportCatalogItem[],
): string {
  if (value === undefined || value === null) return "—"
  const metric = metricCatalog.find((m) => m.id === metricId)
  if (!metric || typeof value === "string") return String(value)

  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return String(value)

  switch (metric.format) {
    case "currency":
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} US$`
    case "percent":
      return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    case "number":
      return num.toLocaleString("en-US")
    default:
      return String(num)
  }
}

function renderParameterCell(paramId: string, row: Record<string, string | number | null>) {
  if (paramId === "app") {
    const appName = String(row.app_display_name ?? row.app ?? "")
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <Avatar className="h-10 w-10 rounded-lg shrink-0">
          <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600">
            <Smartphone className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{appName}</div>
          <div className="text-xs text-slate-500">{String(row.app_sub ?? "")}</div>
        </div>
      </div>
    )
  }

  return (
    <span className="text-sm text-slate-700 whitespace-nowrap">
      {String(row[paramId] ?? "—")}
    </span>
  )
}

export function CustomReportBuilderContent() {
  const canManageCommission = hasScreenFunction("s-commission", "manage")
  const currentUser = getCurrentUser()
  const orgId = currentUser?.organization?.id

  const [catalogParameters, setCatalogParameters] = useState(DEFAULT_PARAMETERS)
  const [catalogMetrics, setCatalogMetrics] = useState(DEFAULT_METRICS)

  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [activePresetDays, setActivePresetDays] = useState(30)

  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)
  const [appsInitialized, setAppsInitialized] = useState(false)

  const [selectedParameters, setSelectedParameters] = useState<string[]>(["app", "date"])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "estimated_revenue",
    "observed_ecpm",
    "requests",
    "match_rate",
    "matched_requests",
    "show_rate",
    "impressions",
  ])

  const [sidebarSearch, setSidebarSearch] = useState("")
  const [commissionUser, setCommissionUser] = useState("All")
  const [revenueSource, setRevenueSource] = useState("All")
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { type: FILTER_DATE_RANGE, value: "Last 30 days" },
  ])
  const [sortColumn, setSortColumn] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [commissionUsers, setCommissionUsers] = useState<{ email: string; label: string }[]>([])

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { cacheKey: "reports_apps_list" },
  )

  const availableApps = useMemo(() => {
    const apps = appsResponse?.apps ?? []
    return apps.filter((a) => a.appId && (a.approvalState === "APPROVED" || !a.approvalState))
  }, [appsResponse])

  useEffect(() => {
    reportsApi.getCatalog().then((c) => {
      if (c.dimensions?.length) setCatalogParameters(c.dimensions)
      if (c.metrics?.length) setCatalogMetrics(c.metrics)
    }).catch(() => {
      /* use defaults */
    })
  }, [])

  useEffect(() => {
    if (appsInitialized || appsLoading || availableApps.length === 0) return
    const firstId = availableApps[0]?.appId
    if (firstId) {
      setSelectedApps([firstId])
      syncAppsActiveFilter([firstId], availableApps)
    }
    setAppsInitialized(true)
  }, [appsInitialized, appsLoading, availableApps])

  useEffect(() => {
    if (!canManageCommission || !orgId) return
    organizationsApi
      .getUsers(orgId, { page: 1, pageSize: 50 })
      .then((res) => {
        const items = (res.items ?? []).map((u) => ({
          email: u.email,
          label: u.fullName ? `${u.fullName} (${u.email})` : u.email,
        }))
        setCommissionUsers(items)
      })
      .catch(() => setCommissionUsers([]))
  }, [canManageCommission, orgId])

  const commissionUsernamesForQuery = useMemo((): string[] | null => {
    if (!canManageCommission) return null
    if (commissionUser === "All") return null
    return [commissionUser]
  }, [canManageCommission, commissionUser])

  const { data: reportData, loading: reportLoading, error: reportError } = useCustomReportQuery({
    startDate,
    endDate,
    selectedAppIds: selectedApps,
    dimensions: selectedParameters,
    metrics: selectedMetrics,
    revenueSource,
    commissionUsernames: commissionUsernamesForQuery,
    sortBy: sortColumn,
    sortDir: sortDirection,
    enabled: selectedApps.length > 0,
  })

  const dateSelectValue =
    activePresetDays === 7 ? "7" : activePresetDays === 30 ? "30" : activePresetDays === 90 ? "90" : "custom"

  const toggleParameter = (paramId: string) => {
    setSelectedParameters((prev) =>
      prev.includes(paramId) ? prev.filter((id) => id !== paramId) : [...prev, paramId],
    )
  }

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId],
    )
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  const selectedAppLabels = availableApps
    .filter((a) => selectedApps.includes(a.appId))
    .map((a) => a.displayName || a.name)

  const dateRangeLabel =
    activePresetDays > 0
      ? `Last ${activePresetDays} days`
      : `${format(startDate, "M/d/yyyy", { locale: enUS })} – ${format(endDate, "M/d/yyyy", { locale: enUS })}`

  const filteredParameters = useMemo(() => {
    if (!sidebarSearch.trim()) return catalogParameters
    const q = sidebarSearch.toLowerCase()
    return catalogParameters.filter((p) => p.label.toLowerCase().includes(q))
  }, [sidebarSearch, catalogParameters])

  const filteredMetrics = useMemo(() => {
    if (!sidebarSearch.trim()) return catalogMetrics
    const q = sidebarSearch.toLowerCase()
    return catalogMetrics.filter((m) => m.label.toLowerCase().includes(q))
  }, [sidebarSearch, catalogMetrics])

  const applyDatePreset = (days: number) => {
    setEndDate(new Date())
    setStartDate(subDays(new Date(), days))
    setActivePresetDays(days)
    setDatePopoverOpen(false)
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, `Last ${days} days`))
  }

  const onCustomDateSelect = (range: DateRange | undefined) => {
    if (range?.from) setStartDate(range.from)
    if (range?.to) setEndDate(range.to)
    if (range?.from && range?.to) {
      setActivePresetDays(0)
      const label = `${format(range.from, "M/d/yyyy", { locale: enUS })} – ${format(range.to, "M/d/yyyy", { locale: enUS })}`
      setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_DATE_RANGE, label))
    }
  }

  const handleDateSelectChange = (value: string) => {
    if (value === "custom") {
      setActivePresetDays(0)
      setDatePopoverOpen(true)
      return
    }
    applyDatePreset(Number(value))
  }

  const handleCommissionUserChange = (value: string) => {
    setCommissionUser(value)
    const label =
      value === "All"
        ? "All"
        : commissionUsers.find((u) => u.email === value)?.label ?? value
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_COMMISSION_USER, label))
  }

  const handleRevenueSourceChange = (value: string) => {
    setRevenueSource(value)
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_REVENUE_SOURCE, value))
  }

  const syncAppsActiveFilter = (appIds: string[], apps: App[]) => {
    const value =
      appIds.length === 0
        ? "None selected"
        : appIds.length === apps.length
          ? "All apps"
          : appIds.length === 1
            ? apps.find((a) => a.appId === appIds[0])?.displayName ??
              apps.find((a) => a.appId === appIds[0])?.name ??
              "1 app"
            : `${appIds.length} apps`
    setActiveFilters((prev) => upsertActiveFilter(prev, FILTER_APPS, value))
  }

  const toggleAppWithFilter = (appId: string) => {
    setSelectedApps((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
      syncAppsActiveFilter(next, availableApps)
      return next
    })
  }

  const removeFilter = (type: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.type !== type))
    switch (type) {
      case FILTER_DATE_RANGE:
        applyDatePreset(30)
        break
      case FILTER_APPS:
        if (availableApps[0]?.appId) {
          setSelectedApps([availableApps[0].appId])
          syncAppsActiveFilter([availableApps[0].appId], availableApps)
        }
        break
      case FILTER_COMMISSION_USER:
        setCommissionUser("All")
        break
      case FILTER_REVENUE_SOURCE:
        setRevenueSource("All")
        break
    }
  }

  const clearAllFilters = () => {
    applyDatePreset(30)
    const firstId = availableApps[0]?.appId
    if (firstId) {
      setSelectedApps([firstId])
      syncAppsActiveFilter([firstId], availableApps)
    }
    setCommissionUser("All")
    setRevenueSource("All")
    setActiveFilters([{ type: FILTER_DATE_RANGE, value: "Last 30 days" }])
  }

  const appsTriggerLabel =
    selectedAppLabels.length === 0
      ? appsLoading
        ? "Loading apps..."
        : "Select apps"
      : selectedAppLabels.length === 1
        ? selectedAppLabels[0]
        : selectedAppLabels.length === availableApps.length
          ? "All apps"
          : `${selectedAppLabels.length} apps`

  const tableRows = reportData?.rows ?? []
  const tableTotals = reportData?.totals ?? {}

  const tableContent = reportLoading ? (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  ) : reportError ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8 gap-2">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm text-red-600">{reportError}</p>
    </div>
  ) : selectedParameters.length === 0 || selectedMetrics.length === 0 ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-slate-600">
        Select at least one parameter and one metric in the right panel to view the report.
      </p>
    </div>
  ) : tableRows.length === 0 ? (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center p-8">
      <p className="text-sm text-slate-600">No data for the selected filters.</p>
    </div>
  ) : (
    <Table>
      <TableHeader className="sticky top-0 bg-white z-10">
        <TableRow className="border-b-0">
          {selectedParameters.map((paramId) => {
            const param = catalogParameters.find((p) => p.id === paramId)
            return (
              <TableHead
                key={paramId}
                className="text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 whitespace-nowrap"
                onClick={() => handleSort(paramId)}
              >
                <div className="flex items-center gap-1">
                  {param?.label}
                  {sortColumn === paramId && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                  <HelpCircle className="h-3 w-3 text-slate-300" />
                </div>
              </TableHead>
            )
          })}
          {selectedMetrics.map((metricId) => {
            const metric = catalogMetrics.find((m) => m.id === metricId)
            return (
              <TableHead
                key={metricId}
                className="text-xs font-medium text-slate-600 text-right cursor-pointer hover:bg-slate-50 whitespace-nowrap"
                onClick={() => handleSort(metricId)}
              >
                <div className="flex items-center justify-end gap-1">
                  {metric?.label}
                  {sortColumn === metricId && <ArrowUpDown className="h-3 w-3 text-slate-400" />}
                  <HelpCircle className="h-3 w-3 text-slate-300" />
                </div>
              </TableHead>
            )
          })}
        </TableRow>
        <TableRow className="border-b">
          {selectedParameters.map((paramId) => (
            <TableHead key={`bar-p-${paramId}`} className="h-1 p-0">
              <div className="h-1 bg-emerald-500" />
            </TableHead>
          ))}
          {selectedMetrics.map((metricId) => (
            <TableHead key={`bar-m-${metricId}`} className="h-1 p-0">
              <div className="h-1 bg-blue-500" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableRows.map((row, idx) => (
          <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
            {selectedParameters.map((paramId) => (
              <TableCell key={paramId} className="py-2">
                {renderParameterCell(paramId, row)}
              </TableCell>
            ))}
            {selectedMetrics.map((metricId) => (
              <TableCell key={metricId} className="text-sm text-right text-slate-700 py-2">
                {formatMetricValue(row[metricId], metricId, catalogMetrics)}
              </TableCell>
            ))}
          </TableRow>
        ))}
        <TableRow className="bg-slate-100 font-semibold border-t-2 border-slate-300">
          {selectedParameters.map((paramId, index) => (
            <TableCell key={`total-${paramId}`} className="py-3">
              {index === 0 ? (
                <span className="text-sm font-bold text-slate-900">Total</span>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </TableCell>
          ))}
          {selectedMetrics.map((metricId) => (
            <TableCell
              key={`total-${metricId}`}
              className="text-sm text-right font-bold text-slate-900 py-3"
            >
              {formatMetricValue(tableTotals[metricId], metricId, catalogMetrics)}
            </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Custom Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build ad activity reports with custom parameters and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 gap-2 bg-transparent" type="button">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700" type="button">
            <Save className="w-4 h-4" />
            Save report
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <CardDescription>Date range, apps, and report criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <Select value={dateSelectValue} onValueChange={handleDateSelectChange}>
              <SelectTrigger className="w-44 h-10 bg-white">
                <CalendarIcon className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>

            {(dateSelectValue === "custom" || activePresetDays === 0) && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 bg-white border-slate-200" type="button">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-1 p-2 border-b border-slate-100">
                    {datePresets.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={activePresetDays === preset.days ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-7 text-xs",
                          activePresetDays === preset.days && "bg-blue-600 hover:bg-blue-700",
                        )}
                        onClick={() => applyDatePreset(preset.days)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Calendar
                    mode="range"
                    locale={enUS}
                    selected={{ from: startDate, to: endDate }}
                    onSelect={onCustomDateSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 min-w-[11rem] max-w-[280px] justify-between bg-white border-slate-200 font-normal"
                  type="button"
                  disabled={appsLoading}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{appsTriggerLabel}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search apps..." />
                  <CommandList>
                    <CommandEmpty>No apps found.</CommandEmpty>
                    <CommandGroup>
                      <div className="flex gap-2 px-2 py-1.5 border-b border-slate-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const ids = availableApps.map((a) => a.appId)
                            setSelectedApps(ids)
                            syncAppsActiveFilter(ids, availableApps)
                          }}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedApps([])
                            syncAppsActiveFilter([], availableApps)
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                      {availableApps.map((app) => (
                        <CommandItem
                          key={app.appId}
                          value={app.displayName || app.name}
                          onSelect={() => toggleAppWithFilter(app.appId)}
                          className="cursor-pointer"
                        >
                          <Checkbox checked={selectedApps.includes(app.appId)} className="mr-2" />
                          <Avatar className="h-8 w-8 rounded-lg mr-2">
                            <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs">
                              {(app.displayName || app.name).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {app.displayName || app.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {app.platform} · {app.appStoreId || app.appId}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {canManageCommission && (
              <Select value={commissionUser} onValueChange={handleCommissionUserChange}>
                <SelectTrigger className="w-52 h-10 bg-white">
                  <SelectValue placeholder="Commission User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {commissionUsers.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={revenueSource} onValueChange={handleRevenueSourceChange}>
              <SelectTrigger className="w-44 h-10 bg-white">
                <SelectValue placeholder="Revenue source" />
              </SelectTrigger>
              <SelectContent>
                {revenueSourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source === "InAppPurchase" ? "In-App Purchase" : source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
              <span className="text-sm text-slate-500">Active filters:</span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.type}
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
                >
                  {filter.type}: {filter.value}
                  <button
                    type="button"
                    onClick={() => removeFilter(filter.type)}
                    className="ml-1 hover:bg-blue-100 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_18rem] gap-6">
        <Card className="border-slate-200 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-medium">Report results</CardTitle>
            <CardDescription>
              {dateRangeLabel}
              {selectedAppLabels.length > 0 && ` · ${appsTriggerLabel}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[min(70vh,720px)]">
            {tableContent}
          </CardContent>
        </Card>

        <Card className="border-slate-200 flex flex-col min-h-[320px] xl:min-h-0">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-medium">Parameters & Metrics</CardTitle>
            <CardDescription>Choose columns to display in the table</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 p-0 min-h-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search parameters or metrics..."
                  className="pl-9 h-10 bg-white border-slate-200"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1 max-h-[min(70vh,640px)]">
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Parameters ({selectedParameters.length})
                </div>
                <div className="space-y-1">
                  {filteredParameters.map((param) => {
                    const isSelected = selectedParameters.includes(param.id)
                    return (
                      <button
                        key={param.id}
                        type="button"
                        onClick={() => toggleParameter(param.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors text-left",
                          isSelected
                            ? "bg-emerald-50 text-emerald-800"
                            : "hover:bg-slate-50 text-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "w-1 h-5 rounded-full shrink-0",
                            isSelected ? "bg-emerald-500" : "bg-transparent",
                          )}
                        />
                        <span className="flex-1">{param.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Metrics ({selectedMetrics.length})
                </div>
                <div className="space-y-1">
                  {filteredMetrics.map((metric) => {
                    const isSelected = selectedMetrics.includes(metric.id)
                    return (
                      <button
                        key={metric.id}
                        type="button"
                        onClick={() => toggleMetric(metric.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors text-left",
                          isSelected ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "w-1 h-5 rounded-full shrink-0",
                            isSelected ? "bg-blue-500" : "bg-transparent",
                          )}
                        />
                        <span className="flex-1 leading-snug">{metric.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
