"use client"

import { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, AlertTriangle, RefreshCw, Zap, CheckCircle, Loader2, ArrowRight } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
import { hasScreenFunction, getCurrentUser, type AuthUser } from "@/lib/auth"
import { useDashboardDate } from "@/contexts/dashboard-date-context"

// Map activity type to icon and colors
const getActivityConfig = (type: string, severity: string) => {
  const severityLower = severity.toLowerCase()
  
  if (type === "alert") {
    if (severityLower === "critical") {
      return { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50" }
    }
    if (severityLower === "warning") {
      return { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-50" }
    }
    return { icon: AlertTriangle, color: "text-blue-500", bgColor: "bg-blue-50" }
  }
  
  if (type === "optimization") {
    return { icon: Zap, color: "text-purple-500", bgColor: "bg-purple-50" }
  }
  
  if (type === "sync") {
    return { icon: RefreshCw, color: "text-green-500", bgColor: "bg-green-50" }
  }
  
  if (type === "user") {
    return { icon: Settings, color: "text-blue-500", bgColor: "bg-blue-50" }
  }
  
  return { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-50" }
}

export function RecentActivities() {
  const { refreshKey } = useDashboardDate()
  const canViewActivityLogs = hasScreenFunction("s-activity-logs", "view")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    setUser(getCurrentUser())
    setAuthLoaded(true)
  }, [])

  const isSuperAdminOrAdmin = user?.role === "super_admin" || user?.role === "admin"

  const queryParams = useMemo(() => {
    const params: any = { limit: 5 }
    if (authLoaded && !isSuperAdminOrAdmin && user?.id) {
      params.userId = user.id
    }
    return params
  }, [authLoaded, isSuperAdminOrAdmin, user?.id])

  const { data, loading, error, refetch } = useApi(
    () => dashboardApi.getRecentActivities(queryParams),
    {
      enabled: authLoaded,
      cacheKey: `dashboard_recent_activities_5_${authLoaded ? (isSuperAdminOrAdmin ? 'all' : user?.id) : 'wait'}`,
    }
  )

  useEffect(() => {
    if (refreshKey > 0 && authLoaded) {
      refetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when dashboard refresh is triggered
  }, [refreshKey, authLoaded])

  const activities = useMemo(() => data?.activities?.slice(0, 5) ?? [], [data])

  if (loading || !authLoaded) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center text-sm text-slate-500 py-8">Unable to load recent activities</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">No recent activities</div>
        ) : (
          <>
            <div className="space-y-3">
              {activities.map((activity) => {
                const { icon: Icon, color, bgColor } = getActivityConfig(activity.type, activity.severity)

                const activityItem = (
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                    <div className={`mt-0.5 rounded-full p-2 ${bgColor}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">{activity.title}</p>
                      {activity.description ? (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{activity.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{activity.relativeTime}</span>
                  </div>
                )

                if (!canViewActivityLogs) {
                  return <div key={activity.id}>{activityItem}</div>
                }

                return (
                  <Link key={activity.id} href={activity.resourceUrl || "/activity-logs"} className="block">
                    {activityItem}
                  </Link>
                )
              })}
            </div>

            {canViewActivityLogs ? (
              <Link href="/activity-logs">
                <Button variant="link" className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
                  View Activity Logs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
