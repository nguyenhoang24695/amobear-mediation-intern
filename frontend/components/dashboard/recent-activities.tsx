"use client"

import { useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, AlertTriangle, RefreshCw, Zap, CheckCircle, Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { dashboardApi } from "@/lib/api/services"
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
  // Temporarily disabled - always show empty state
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center text-sm text-slate-500 py-8">No recent activities</div>
      </CardContent>
    </Card>
  )
}
