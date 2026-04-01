"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, AlertTriangle, AlertCircle, Info, ArrowRight, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAlertBadgeCount } from "@/lib/alert-notification-state"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "Unknown"
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function NotificationPopup() {
  const { alerts, unseenCount, totalOpenCount, markAlertsViewed, markAllAlertsViewed } = useAlertNotifications()
  const recentAlerts = alerts.slice(0, 8)

  const getTypeStyles = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
      case "HIGH":
        return {
          icon: AlertTriangle,
          bg: "bg-red-100",
          color: "text-red-600",
        }
      case "MEDIUM":
      case "WARNING":
        return {
          icon: AlertCircle,
          bg: "bg-amber-100",
          color: "text-amber-600",
        }
      default:
        return {
          icon: Info,
          bg: "bg-blue-100",
          color: "text-blue-600",
        }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 relative bg-transparent">
          <Bell className="w-4 h-4 text-slate-600" />
          {unseenCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs">
              {formatAlertBadgeCount(unseenCount)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          <span className="text-sm text-slate-500">
            {totalOpenCount > 0 ? `${unseenCount} new / ${totalOpenCount} open` : "No open alerts"}
          </span>
        </div>

        {recentAlerts.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-slate-100">
              {recentAlerts.map((alert) => {
                const styles = getTypeStyles(alert.severity)
                const Icon = styles.icon
                const href = alert.mediationGroupId
                  ? `/mediation/${encodeURIComponent(alert.mediationGroupId)}?tab=waterfall-optimization`
                  : "/alert-center"

                return (
                  <Link
                    key={alert.id}
                    href={href}
                    onClick={() => markAlertsViewed([alert.id])}
                    className={cn("flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors")}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", styles.bg)}>
                      <Icon className={cn("w-4 h-4", styles.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.alertType}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(alert.triggeredAt)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">No open alerts</p>
            <p className="text-xs text-slate-500 mt-1">The alert queue is empty.</p>
          </div>
        )}

        <div className="border-t border-slate-200">
          <Link
            href="/alert-center"
            onClick={markAllAlertsViewed}
            className="flex items-center justify-center gap-1 py-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-slate-50 transition-colors"
          >
            View All Notifications
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
