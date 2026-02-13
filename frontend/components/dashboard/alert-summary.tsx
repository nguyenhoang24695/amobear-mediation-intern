"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, ArrowRight, Loader2, AlertOctagon } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { alertsApi } from "@/lib/api/services"
import { formatDistanceToNow } from "date-fns"
import { useDashboardDate } from "@/contexts/dashboard-date-context"
import { useEffect } from "react"

export function AlertSummary() {
  const [expanded, setExpanded] = useState(false)
  const { refreshKey } = useDashboardDate()

  // Fetch active alerts summary
  const { data: alertsSummary, loading: summaryLoading, refetch: refetchSummary } = useApi(
    () => alertsApi.getActiveAlertsSummary(),
    { enabled: true, cacheKey: "active_alerts_summary_today" }
  )

  // Fetch recent active alerts
  const { data: alertsData, loading: alertsLoading, refetch: refetchAlerts } = useApi(
    () => alertsApi.getActiveAlerts({ page: 1, pageSize: 5 }),
    { enabled: true, cacheKey: "active_alerts_today_page1_size5" } // Fetch always; only render when expanded
  )

  // Refetch only when Apply/Refresh is clicked (one run per refreshKey change)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchSummary()
      if (expanded) {
        refetchAlerts()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on refreshKey to avoid multiple refetches
  }, [refreshKey])

  const severityCounts = alertsSummary
    ? {
        critical: alertsSummary.BySeverity?.["CRITICAL"] || 0,
        high: alertsSummary.BySeverity?.["HIGH"] || 0,
        medium: alertsSummary.BySeverity?.["MEDIUM"] || 0,
        low: alertsSummary.BySeverity?.["LOW"] || 0,
      }
    : { critical: 0, high: 0, medium: 0, low: 0 }

  const alerts = alertsData?.data || []

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "HIGH":
        return <AlertOctagon className="w-4 h-4 text-orange-500" />
      case "MEDIUM":
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case "LOW":
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-slate-400" />
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return "destructive"
      case "HIGH":
        return "secondary"
      case "MEDIUM":
        return "secondary"
      case "LOW":
        return "secondary"
      default:
        return "secondary"
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {summaryLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <>
                  {severityCounts.critical > 0 && (
                    <Link href="/alerts?severity=CRITICAL">
                      <Badge
                        variant="destructive"
                        className="gap-1 px-2.5 py-1 cursor-pointer hover:bg-red-600 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {severityCounts.critical} Critical
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.high > 0 && (
                    <Link href="/alerts?severity=HIGH">
                      <Badge className="gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer transition-colors">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        {severityCounts.high} High
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.medium > 0 && (
                    <Link href="/alerts?severity=MEDIUM">
                      <Badge className="gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {severityCounts.medium} Medium
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.low > 0 && (
                    <Link href="/alerts?severity=LOW">
                      <Badge className="gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors">
                        <Info className="w-3.5 h-3.5" />
                        {severityCounts.low} Low
                      </Badge>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <Button variant="link" className="text-sm text-blue-600 hover:text-blue-700 p-0 h-auto">
                View All Alerts
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {alertsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-500">No active alerts</div>
            ) : (
              alerts.map((alert) => (
                <Tooltip key={alert.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/alerts/${alert.id}`}
                      className="flex items-start gap-3 p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer block"
                    >
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{alert.message}</p>
                        {alert.alertRuleName && (
                          <p className="text-xs text-slate-500 mt-0.5">{alert.alertRuleName}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {alert.triggeredAt
                          ? formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })
                          : "—"}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  {alert.alertRuleDescription && (
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">{alert.alertRuleDescription}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
