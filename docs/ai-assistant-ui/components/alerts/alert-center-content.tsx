"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Search,
  X,
  Download,
  Settings,
  CheckCircle2,
  ShieldCheck,
  CalendarIcon,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { AlertCard } from "./alert-card"
import { AlertDetailSheet } from "./alert-detail-sheet"
import { cn } from "@/lib/utils"

const severityOptions = ["All Severity", "Critical", "Warning", "Info"]
const appOptions = ["All Apps", "Puzzle Master", "Word Quest", "Racing Pro", "Fitness Tracker"]
const typeOptions = ["All Types", "Performance Drop", "Fill Rate", "Network Error", "Revenue Anomaly"]
const statusOptions = ["All Status", "Active", "Acknowledged", "Resolved", "Snoozed"]

// Mock alert data
const mockAlerts = [
  {
    id: "1",
    severity: "critical" as const,
    title: "eCPM Dropped Significantly",
    description: "AdMob Interstitial eCPM has dropped below threshold for Puzzle Master app",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: "active" as const,
    app: { name: "Puzzle Master", icon: "/puzzle-game-icon.png", id: "1" },
    network: "AdMob",
    adUnit: "Interstitial_Main",
    metrics: { from: 4.5, to: 2.1, change: -53 },
    metricLabel: "eCPM",
  },
  {
    id: "2",
    severity: "critical" as const,
    title: "Network Connection Failed",
    description: "Unity Ads SDK failing to initialize on Android devices, affecting all ad requests",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: "acknowledged" as const,
    app: { name: "Racing Pro", icon: "/racing-game-icon.png", id: "3" },
    network: "Unity Ads",
    adUnit: "Rewarded_Video",
    acknowledgedBy: "John Doe",
    acknowledgedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "3",
    severity: "critical" as const,
    title: "Fill Rate Critical Low",
    description: "Fill rate dropped to 12% for Rewarded Video ads in European regions",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "active" as const,
    app: { name: "Word Quest", icon: "/word-game-icon.jpg", id: "2" },
    network: "ironSource",
    adUnit: "Rewarded_Main",
    metrics: { from: 78, to: 12, change: -85 },
    metricLabel: "Fill Rate %",
  },
  {
    id: "4",
    severity: "warning" as const,
    title: "Revenue Trending Down",
    description: "Daily revenue has decreased 25% compared to 7-day average",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "active" as const,
    app: { name: "Fitness Tracker", icon: "/fitness-app-icon.jpg", id: "4" },
    metrics: { from: 245.8, to: 184.35, change: -25 },
    metricLabel: "Daily Revenue ($)",
  },
  {
    id: "5",
    severity: "warning" as const,
    title: "High Latency Detected",
    description: "Ad load times exceeding 3 seconds for Banner ads",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: "snoozed" as const,
    app: { name: "Puzzle Master", icon: "/puzzle-game-icon.png", id: "1" },
    network: "AppLovin",
    adUnit: "Banner_Bottom",
    snoozedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000),
    metrics: { from: 1.2, to: 3.8, change: 217 },
    metricLabel: "Load Time (sec)",
  },
  {
    id: "6",
    severity: "warning" as const,
    title: "Impression Discrepancy",
    description: "10% variance between AdMob reported impressions and internal tracking",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: "active" as const,
    app: { name: "Word Quest", icon: "/word-game-icon.jpg", id: "2" },
    network: "AdMob",
    adUnit: "Native_Feed",
  },
  {
    id: "7",
    severity: "warning" as const,
    title: "Waterfall Optimization Needed",
    description: "Current waterfall configuration may be suboptimal based on recent performance data",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: "active" as const,
    app: { name: "Racing Pro", icon: "/racing-game-icon.png", id: "3" },
  },
  {
    id: "8",
    severity: "warning" as const,
    title: "SDK Version Outdated",
    description: "ironSource SDK is 2 major versions behind, update recommended",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    status: "active" as const,
    network: "ironSource",
  },
  {
    id: "9",
    severity: "info" as const,
    title: "New Ad Format Available",
    description: "AppLovin now supports App Open ads format",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    status: "active" as const,
    network: "AppLovin",
  },
  {
    id: "10",
    severity: "info" as const,
    title: "Scheduled Maintenance",
    description: "AdMob API maintenance scheduled for Dec 20, 2024 02:00-04:00 UTC",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: "active" as const,
    network: "AdMob",
  },
]

interface ActiveFilter {
  type: string
  value: string
}

export function AlertCenterContent() {
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState("")
  const [severity, setSeverity] = useState("All Severity")
  const [app, setApp] = useState("All Apps")
  const [type, setType] = useState("All Types")
  const [status, setStatus] = useState("All Status")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<(typeof mockAlerts)[0] | null>(null)
  const [showDetailSheet, setShowDetailSheet] = useState(false)

  useEffect(() => {
    const severityParam = searchParams.get("severity")
    const appParam = searchParams.get("app")

    if (severityParam) {
      const capitalizedSeverity = severityParam.charAt(0).toUpperCase() + severityParam.slice(1)
      setSeverity(capitalizedSeverity)
      setActiveFilters((prev) => {
        const filtered = prev.filter((f) => f.type !== "Severity")
        return [...filtered, { type: "Severity", value: capitalizedSeverity }]
      })
    }

    if (appParam) {
      // Map app ID to app name if needed
      const appName = appOptions.find((a) => a.toLowerCase().includes(appParam)) || "All Apps"
      if (appName !== "All Apps") {
        setApp(appName)
        setActiveFilters((prev) => {
          const filtered = prev.filter((f) => f.type !== "App")
          return [...filtered, { type: "App", value: appName }]
        })
      }
    }
  }, [searchParams])

  // Summary counts
  const criticalCount = mockAlerts.filter((a) => a.severity === "critical" && a.status !== "resolved").length
  const warningCount = mockAlerts.filter((a) => a.severity === "warning" && a.status !== "resolved").length
  const infoCount = mockAlerts.filter((a) => a.severity === "info" && a.status !== "resolved").length
  const resolvedCount = 156

  const filteredAlerts = mockAlerts.filter((alert) => {
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    if (severity !== "All Severity" && alert.severity !== severity.toLowerCase()) {
      return false
    }
    if (app !== "All Apps" && alert.app?.name !== app) {
      return false
    }
    if (status !== "All Status" && alert.status !== status.toLowerCase()) {
      return false
    }
    return true
  })

  const handleFilterChange = (filterType: string, value: string) => {
    if (value.startsWith("All")) {
      setActiveFilters(activeFilters.filter((f) => f.type !== filterType))
    } else {
      const existing = activeFilters.find((f) => f.type === filterType)
      if (existing) {
        setActiveFilters(activeFilters.map((f) => (f.type === filterType ? { ...f, value } : f)))
      } else {
        setActiveFilters([...activeFilters, { type: filterType, value }])
      }
    }

    switch (filterType) {
      case "Severity":
        setSeverity(value)
        break
      case "App":
        setApp(value)
        break
      case "Type":
        setType(value)
        break
      case "Status":
        setStatus(value)
        break
    }
  }

  const removeFilter = (filterType: string) => {
    setActiveFilters(activeFilters.filter((f) => f.type !== filterType))
    switch (filterType) {
      case "Severity":
        setSeverity("All Severity")
        break
      case "App":
        setApp("All Apps")
        break
      case "Type":
        setType("All Types")
        break
      case "Status":
        setStatus("All Status")
        break
      case "Date Range":
        setDateRange(undefined)
        break
    }
  }

  const handleAlertClick = (alert: (typeof mockAlerts)[0]) => {
    setSelectedAlertForDetail(alert)
    setShowDetailSheet(true)
  }

  const handleSeverityBadgeClick = (severityValue: string) => {
    if (severity === severityValue) {
      handleFilterChange("Severity", "All Severity")
    } else {
      handleFilterChange("Severity", severityValue)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alert Center</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage alerts across all your apps</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="h-9 gap-2 bg-transparent">
            <Settings className="w-4 h-4" />
            Alert Rules
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg">
        <button
          onClick={() => handleSeverityBadgeClick("Critical")}
          className={cn("transition-all", severity === "Critical" && "ring-2 ring-red-400 ring-offset-2 rounded-full")}
        >
          <Badge
            variant="destructive"
            className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-red-600 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {criticalCount} Critical
          </Badge>
        </button>
        <button
          onClick={() => handleSeverityBadgeClick("Warning")}
          className={cn("transition-all", severity === "Warning" && "ring-2 ring-amber-400 ring-offset-2 rounded-full")}
        >
          <Badge className="gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors">
            <AlertCircle className="w-4 h-4" />
            {warningCount} Warning
          </Badge>
        </button>
        <button
          onClick={() => handleSeverityBadgeClick("Info")}
          className={cn("transition-all", severity === "Info" && "ring-2 ring-blue-400 ring-offset-2 rounded-full")}
        >
          <Badge className="gap-1.5 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors">
            <Info className="w-4 h-4" />
            {infoCount} Info
          </Badge>
        </button>
        <div className="h-6 w-px bg-slate-200 mx-2" />
        <Badge className="gap-1.5 px-3 py-1.5 text-sm bg-green-100 text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {resolvedCount} Resolved (30d)
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search alerts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={severity} onValueChange={(v) => handleFilterChange("Severity", v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={app} onValueChange={(v) => handleFilterChange("App", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => handleFilterChange("Type", v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => handleFilterChange("Status", v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-44 justify-start gap-2 bg-transparent">
                    <CalendarIcon className="w-4 h-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range)
                      if (range?.from) {
                        const existing = activeFilters.find((f) => f.type === "Date Range")
                        if (!existing) {
                          setActiveFilters([...activeFilters, { type: "Date Range", value: "Custom" }])
                        }
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">Active filters:</span>
              {activeFilters.map((filter) => (
                <Badge key={filter.type} variant="secondary" className="gap-1 bg-blue-50 text-blue-700">
                  {filter.type}: {filter.value}
                  <button onClick={() => removeFilter(filter.type)} className="ml-1 hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500"
                onClick={() => {
                  setActiveFilters([])
                  setSeverity("All Severity")
                  setApp("All Apps")
                  setType("All Types")
                  setStatus("All Status")
                  setDateRange(undefined)
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert List */}
      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onClick={() => handleAlertClick(alert)} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-slate-200">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">All Clear!</h3>
            <p className="text-sm text-slate-500">No alerts match your current filters</p>
          </div>
        </Card>
      )}

      {/* Alert Detail Sheet */}
      <AlertDetailSheet alert={selectedAlertForDetail} open={showDetailSheet} onOpenChange={setShowDetailSheet} />
    </div>
  )
}
