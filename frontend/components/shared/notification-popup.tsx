"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, AlertTriangle, AlertCircle, Info, ArrowRight, BellOff, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { AlertCenterListItem } from "@/types/api"
import { cn } from "@/lib/utils"
import { formatAlertBadgeCount } from "@/lib/alert-notification-state"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { insightApi } from "@/lib/api/services"
import type { InsightUserNotification } from "@/types/api"

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

type ListFilter = "all" | "unread"

const ALERTS_PAGE_SIZE = 5

function appAvatarInitial(alert: AlertCenterListItem): string {
  const name = alert.appDisplayName?.trim()
  if (name) return name.slice(0, 1).toUpperCase()
  const id = alert.appId?.trim()
  if (id) return id.slice(0, 1).toUpperCase()
  return "?"
}

export function NotificationPopup() {
  const [listFilter, setListFilter] = useState<ListFilter>("all")
  const [visibleAlertCount, setVisibleAlertCount] = useState(ALERTS_PAGE_SIZE)
  const {
    alerts,
    unseenAlerts,
    unseenCount,
    totalOpenCount,
    seenAlertIds,
    markAlertsViewed,
    markAllAlertsViewed,
  } = useAlertNotifications()
  const [insightNotes, setInsightNotes] = useState<InsightUserNotification[]>([])

  const refreshInsights = useCallback(() => {
    void insightApi
      .getMyNotifications()
      .then((list) => setInsightNotes(list.slice(0, 6)))
      .catch(() => setInsightNotes([]))
  }, [])

  useEffect(() => {
    refreshInsights()
  }, [refreshInsights])

  useEffect(() => {
    setVisibleAlertCount(ALERTS_PAGE_SIZE)
  }, [listFilter])

  const insightUnread = insightNotes.filter((n) => !n.read).length
  const headerUnseen = unseenCount + insightUnread

  const sourceList = listFilter === "all" ? alerts : unseenAlerts
  const displayedAlerts = sourceList.slice(0, visibleAlertCount)
  const hasMoreAlerts = sourceList.length > visibleAlertCount

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
          {headerUnseen > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs">
              {formatAlertBadgeCount(headerUnseen)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <span className="text-sm text-slate-500">
            {totalOpenCount > 0 || insightNotes.length > 0
              ? `${headerUnseen} new · alerts + insights`
              : "No notifications"}
            </span>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className={cn(
                "text-sm font-medium rounded-full px-3 py-1 transition-colors",
                listFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setListFilter("unread")}
              className={cn(
                "text-sm font-medium rounded-full px-3 py-1 transition-colors inline-flex items-center gap-1.5",
                listFilter === "unread"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Unread
              {unseenCount > 0 && (
                <span
                  className={cn(
                    "tabular-nums text-xs min-w-[1.25rem] text-center rounded-full px-1",
                    listFilter === "unread" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {formatAlertBadgeCount(unseenCount)}
                </span>
              )}
            </button>
          </div>
        </div>

        {displayedAlerts.length > 0 || insightNotes.length > 0 ? (
          <div className="max-h-[min(420px,70vh)] overflow-y-auto overscroll-y-contain">
            <div className="divide-y divide-slate-100 pb-1">
              {insightNotes.map((note) => {
                const href = `/apps/${encodeURIComponent(note.appId)}?tab=ai-insight&date=${encodeURIComponent(note.insightDate)}`
                return (
                  <Link
                    key={note.id}
                    href={href}
                    onClick={() => {
                      if (!note.read) {
                        void insightApi.markNotificationsRead([note.id]).then(() => refreshInsights())
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors",
                      !note.read && "bg-indigo-50/50",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{note.title}</p>
                      {note.body ? (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{note.body}</p>
                      ) : null}
                      <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(note.createdAt)}</p>
                    </div>
                  </Link>
                )
              })}
              {displayedAlerts.map((alert) => {
                const styles = getTypeStyles(alert.severity)
                const Icon = styles.icon
                const href = `/alert-center/${alert.id}`

                const isUnread = !seenAlertIds.has(alert.id)

                return (
                  <Link
                    key={alert.id}
                    href={href}
                    onClick={() => void markAlertsViewed([alert.id])}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors",
                      isUnread && "bg-slate-50/80"
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0">
                      <Avatar className="h-10 w-10 rounded-lg border border-slate-200/80 bg-slate-50">
                        {alert.appIconUri ? (
                          <AvatarImage
                            src={alert.appIconUri}
                            alt={alert.appDisplayName || alert.appId || "App"}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                          {appAvatarInitial(alert)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white shadow-sm",
                          styles.bg
                        )}
                        aria-hidden
                      >
                        <Icon className={cn("h-2.5 w-2.5", styles.color)} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.alertType}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(alert.triggeredAt)}</p>
                    </div>
                  </Link>
                )
              })}
              {hasMoreAlerts && (
                <a
                  href="#"
                  className="block w-full text-center py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-slate-50 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    setVisibleAlertCount((n) => n + ALERTS_PAGE_SIZE)
                  }}
                >
                  Load more
                </a>
              )}
            </div>
          </div>
        ) : listFilter === "unread" && alerts.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">No unread alerts</p>
            <p className="text-xs text-slate-500 mt-1 text-center">Switch to All to see read notifications.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">No notifications</p>
            <p className="text-xs text-slate-500 mt-1">Alerts và daily insight sẽ hiện ở đây.</p>
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
