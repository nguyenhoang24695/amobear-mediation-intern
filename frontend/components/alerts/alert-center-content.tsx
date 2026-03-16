"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Download, Settings, AlertTriangle, AlertCircle, Info, ShieldCheck, ExternalLink } from "lucide-react"
import { alertsApi } from "@/lib/api/services"
import { useApi } from "@/hooks/use-api"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { cn } from "@/lib/utils"

const severityOptions = ["All", "HIGH", "MEDIUM", "LOW"]

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "Unknown"
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} days ago`
}

const severityStyles = {
  HIGH: {
    icon: AlertTriangle,
    badge: "bg-red-100 text-red-700 border-red-200",
    card: "border-l-red-500",
  },
  MEDIUM: {
    icon: AlertCircle,
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    card: "border-l-amber-500",
  },
  LOW: {
    icon: Info,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    card: "border-l-blue-500",
  },
} as const

export function AlertCenterContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [severity, setSeverity] = useState("All")

  useEffect(() => {
    const severityParam = searchParams.get("severity")
    if (!severityParam) return
    const normalized = severityParam.toUpperCase()
    if (severityOptions.includes(normalized)) {
      setSeverity(normalized)
    }
  }, [searchParams])

  const { data: summary } = useApi(
    () => alertsApi.getOpenAlertsSummary(),
    { cacheKey: "alerts_open_summary" }
  )

  const { alerts, loading, openAlertIds, markAlertsViewed } = useAlertNotifications()

  useEffect(() => {
    if (openAlertIds.length === 0) return
    markAlertsViewed(openAlertIds)
  }, [markAlertsViewed, openAlertIds])

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (severity !== "All" && alert.severity?.toUpperCase() !== severity) {
        return false
      }

      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        alert.alertType.toLowerCase().includes(q) ||
        alert.message.toLowerCase().includes(q) ||
        (alert.mediationGroupId ?? "").toLowerCase().includes(q)
      )
    })
  }, [alerts, severity, searchQuery])

  const criticalCount = summary?.BySeverity?.HIGH ?? 0
  const warningCount = summary?.BySeverity?.MEDIUM ?? 0
  const infoCount = summary?.BySeverity?.LOW ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alert Center</h1>
          <p className="text-sm text-slate-500 mt-1">Open alerts from automatic and semi-automatic workflows.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-2 bg-transparent" disabled>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="h-9 gap-2 bg-transparent" disabled>
            <Settings className="w-4 h-4" />
            Alert Rules
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg">
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="w-4 h-4" />
          {criticalCount} High
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 border-amber-200">
          <AlertCircle className="w-4 h-4" />
          {warningCount} Medium
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 border-blue-200">
          <Info className="w-4 h-4" />
          {infoCount} Low
        </Badge>
        <div className="h-6 w-px bg-slate-200 mx-2" />
        <Badge className="gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 border-0">
          {summary?.Total ?? 0} Open alerts
        </Badge>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by alert type, message, or mediation group..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-40">
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
          <CardContent className="py-12 text-center text-sm text-slate-500">Loading open alerts...</CardContent>
        </Card>
      ) : filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const normalizedSeverity = (alert.severity?.toUpperCase() || "LOW") as keyof typeof severityStyles
            const styles = severityStyles[normalizedSeverity] ?? severityStyles.LOW
            const Icon = styles.icon
            const href = alert.mediationGroupId
              ? `/mediation/${encodeURIComponent(alert.mediationGroupId)}?tab=waterfall-optimization`
              : "/alerts"

            return (
              <Card key={alert.id} className={cn("border-slate-200 border-l-4", styles.card)}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-slate-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className={styles.badge}>
                            {normalizedSeverity}
                          </Badge>
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                            {alert.status}
                          </Badge>
                          <span className="text-xs text-slate-400">{formatRelativeTime(alert.triggeredAt)}</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{alert.alertType}</h3>
                        <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {alert.mediationGroupId && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                              MG: {alert.mediationGroupId}
                            </Badge>
                          )}
                          {alert.appId && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                              App: {alert.appId}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="bg-transparent" asChild>
                        <Link href={href}>
                          View Context
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-slate-200">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No open alerts</h3>
            <p className="text-sm text-slate-500">Nothing matches the current filter.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
