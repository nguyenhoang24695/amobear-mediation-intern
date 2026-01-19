"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, ArrowRight, Loader2 } from "lucide-react"
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
    { enabled: true }
  )

  // Fetch recent active alerts
  const { data: alertsData, loading: alertsLoading, refetch: refetchAlerts } = useApi(
    () => alertsApi.getActiveAlerts({ page: 1, pageSize: 5 }),
    { enabled: expanded } // Only fetch when expanded
  )

  // Only refetch when refreshKey changes (when Apply/Refresh button is clicked)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchSummary()
      if (expanded) {
        refetchAlerts()
      }
    }
  }, [refreshKey, refetchSummary, refetchAlerts, expanded])

  const severityCounts = alertsSummary
    ? {
        critical: alertsSummary.bySeverity?.["CRITICAL"] || 0,
        warning: alertsSummary.bySeverity?.["WARNING"] || 0,
        info: alertsSummary.bySeverity?.["INFO"] || 0,
      }
    : { critical: 0, warning: 0, info: 0 }

  const alerts = alertsData?.data || []

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "WARNING":
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return "destructive"
      case "WARNING":
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
                  <Link href="/alerts?severity=CRITICAL">
                    <Badge
                      variant="destructive"
                      className="gap-1 px-2.5 py-1 cursor-pointer hover:bg-red-600 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {severityCounts.critical} Critical
                    </Badge>
                  </Link>
                  <Link href="/alerts?severity=WARNING">
                    <Badge className="gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {severityCounts.warning} Warning
                    </Badge>
                  </Link>
                  <Link href="/alerts?severity=INFO">
                    <Badge className="gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors">
                      <Info className="w-3.5 h-3.5" />
                      {severityCounts.info} Info
                    </Badge>
                  </Link>
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
                <Link
                  key={alert.id}
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
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
