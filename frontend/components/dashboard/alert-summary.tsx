"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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
import { formatAlertCardTitle, parseSlackFinanceFromAdditionalData } from "@/components/alerts/alert-center-view-model"
import { AlertSlackFinanceRow } from "@/components/alerts/alert-slack-finance-row"
import { AlertAppAvatar } from "@/components/alerts/alert-app-avatar"
import { hasScreenFunction } from "@/lib/auth"

export function AlertSummary() {
  const canViewAlerts = useMemo(
    () =>
      hasScreenFunction("s-dashboard", "view-alert-summary")
      && hasScreenFunction("s-alerts", "view"),
    []
  )
  const [expanded, setExpanded] = useState(false)
  const prevActiveTotalRef = useRef<number | null>(null)
  const { refreshKey } = useDashboardDate()

  // Fetch active alerts summary
  const { data: alertsSummary, loading: summaryLoading, refetch: refetchSummary } = useApi(
    () => alertsApi.getActiveAlertsSummary(),
    { enabled: canViewAlerts, cacheKey: "active_alerts_summary_today" }
  )

  // Fetch recent active alerts
  const { data: alertsData, loading: alertsLoading, refetch: refetchAlerts } = useApi(
    () => alertsApi.getActiveAlerts({ page: 1, pageSize: 5 }),
    { enabled: canViewAlerts, cacheKey: "active_alerts_today_page1_size5" } // Fetch always; only render when expanded
  )

  const activeTotal = alertsSummary?.Total ?? 0

  // Có alert active: mở mặc định lần đầu (hoặc khi Total nhảy từ 0 → >0). Không ép mở lại khi user đã thu gọn và Total chỉ giảm nhẹ.
  useEffect(() => {
    const prev = prevActiveTotalRef.current
    prevActiveTotalRef.current = activeTotal
    if (prev === null) {
      if (activeTotal > 0) setExpanded(true)
      return
    }
    if (prev === 0 && activeTotal > 0) setExpanded(true)
  }, [activeTotal])

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

  if (!canViewAlerts) {
    return null
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
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {summaryLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {severityCounts.critical > 0 && (
                    <Link href="/alert-center?severity=CRITICAL">
                      <Badge
                        variant="destructive"
                        className="cursor-pointer gap-1 px-2.5 py-1 transition-colors hover:bg-destructive/90"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {severityCounts.critical} Critical
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.high > 0 && (
                    <Link href="/alert-center?severity=HIGH">
                      <Badge className="cursor-pointer gap-1 bg-orange-100 px-2.5 py-1 text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/25">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        {severityCounts.high} High
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.medium > 0 && (
                    <Link href="/alert-center?severity=MEDIUM">
                      <Badge className="cursor-pointer gap-1 bg-amber-100 px-2.5 py-1 text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {severityCounts.medium} Medium
                      </Badge>
                    </Link>
                  )}
                  {severityCounts.low > 0 && (
                    <Link href="/alert-center?severity=LOW">
                      <Badge className="cursor-pointer gap-1 bg-blue-100 px-2.5 py-1 text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25">
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
            <Link href="/alert-center">
              <Button variant="link" className="h-auto p-0 text-sm text-primary">
                View All Alerts
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {alertsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No active alerts</div>
            ) : (
              alerts.map((alert) => (
                <Tooltip key={alert.id}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/alert-center/${alert.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-md bg-muted/50 p-3 transition-colors hover:bg-accent"
                    >
                      <AlertAppAvatar
                        appIconUri={alert.appIconUri}
                        appDisplayName={alert.appDisplayName}
                        appId={alert.appId}
                        severity={alert.severity}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {formatAlertCardTitle(alert)}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
                        {(() => {
                          const fin = parseSlackFinanceFromAdditionalData(alert.additionalData)
                          return fin ? <AlertSlackFinanceRow fin={fin} className="mt-1.5" /> : null
                        })()}
                        {alert.alertRuleName && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{alert.alertRuleName}</p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
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
