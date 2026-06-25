"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, AlertTriangle, AlertCircle, Info, ArrowRight, BellOff, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { AlertCenterListItem } from "@/types/api"
import { formatAlertCardTitle } from "@/components/alerts/alert-center-view-model"
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

const NOTIFICATIONS_PAGE_SIZE = 5

type MergedNotificationItem =
  | { kind: "insight"; sortAt: number; note: InsightUserNotification }
  | { kind: "alert"; sortAt: number; alert: AlertCenterListItem }

function parseSortTime(iso?: string | null): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : 0
}

function appAvatarInitial(alert: AlertCenterListItem): string {
  const name = alert.appDisplayName?.trim()
  if (name) return name.slice(0, 1).toUpperCase()
  const id = alert.appId?.trim()
  if (id) return id.slice(0, 1).toUpperCase()
  return "?"
}

export function NotificationPopup() {
  const [listFilter, setListFilter] = useState<ListFilter>("all")
  const [visibleItemCount, setVisibleItemCount] = useState(NOTIFICATIONS_PAGE_SIZE)
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
      .then((list) => setInsightNotes(Array.isArray(list) ? list : []))
      .catch(() => setInsightNotes([]))
  }, [])

  useEffect(() => {
    refreshInsights()
  }, [refreshInsights])

  useEffect(() => {
    setVisibleItemCount(NOTIFICATIONS_PAGE_SIZE)
  }, [listFilter])

  const insightUnread = insightNotes.filter((n) => !n.read).length
  const headerUnseen = unseenCount + insightUnread
  const unreadTabBadgeCount = insightUnread + unseenCount

  const insightPool = useMemo(
    () => (listFilter === "unread" ? insightNotes.filter((n) => !n.read) : insightNotes),
    [insightNotes, listFilter]
  )

  const alertPool = listFilter === "all" ? alerts : unseenAlerts

  const mergedTimeline = useMemo(() => {
    const items: MergedNotificationItem[] = []
    for (const note of insightPool) {
      items.push({ kind: "insight", sortAt: parseSortTime(note.createdAt), note })
    }
    for (const alert of alertPool) {
      items.push({ kind: "alert", sortAt: parseSortTime(alert.triggeredAt), alert })
    }
    items.sort((a, b) => {
      if (b.sortAt !== a.sortAt) return b.sortAt - a.sortAt
      if (a.kind !== b.kind) return a.kind === "insight" ? -1 : 1
      const idA = a.kind === "insight" ? a.note.id : String(a.alert.id)
      const idB = b.kind === "insight" ? b.note.id : String(b.alert.id)
      return idA.localeCompare(idB, undefined, { numeric: true })
    })
    return items
  }, [insightPool, alertPool])

  const displayedMerged = mergedTimeline.slice(0, visibleItemCount)
  const hasMoreItems = mergedTimeline.length > visibleItemCount

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
          <Bell className="h-4 w-4 text-muted-foreground" />
          {headerUnseen > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs">
              {formatAlertBadgeCount(headerUnseen)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-1rem)] max-w-[380px] p-0 shadow-lg" sideOffset={8}>
        <div className="border-b">
          <div className="flex flex-col gap-1 px-3 py-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between min-[360px]:px-4">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <span className="text-xs text-muted-foreground min-[360px]:text-right min-[360px]:text-sm">
            {totalOpenCount > 0 || insightNotes.length > 0
              ? `${headerUnseen} new · alerts + insights`
              : "No notifications"}
            </span>
          </div>
          <div className="flex gap-2 px-3 pb-3 min-[360px]:px-4">
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className={cn(
                "text-sm font-medium rounded-full px-3 py-1 transition-colors",
                listFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              Unread
              {unreadTabBadgeCount > 0 && (
                <span
                  className={cn(
                    "tabular-nums text-xs min-w-[1.25rem] text-center rounded-full px-1",
                    listFilter === "unread" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {formatAlertBadgeCount(unreadTabBadgeCount)}
                </span>
              )}
            </button>
          </div>
        </div>

        {displayedMerged.length > 0 ? (
          <div className="max-h-[min(420px,70vh)] overflow-y-auto overscroll-y-contain">
            <div className="divide-y divide-border pb-1">
              {displayedMerged.map((item) => {
                if (item.kind === "insight") {
                  const note = item.note
                  const href = `/apps/${encodeURIComponent(note.appId)}?tab=ai-insight&date=${encodeURIComponent(note.insightDate)}`
                  return (
                    <Link
                      key={`insight-${note.id}`}
                      href={href}
                      onClick={() => {
                        if (!note.read) {
                          void insightApi.markNotificationsRead([note.id]).then(() => refreshInsights())
                        }
                      }}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 transition-colors hover:bg-accent min-[360px]:px-4",
                        !note.read && "bg-primary/10",
                      )}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{note.title}</p>
                        {note.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{note.body}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(note.createdAt)}</p>
                      </div>
                    </Link>
                  )
                }

                const alert = item.alert
                const styles = getTypeStyles(alert.severity)
                const Icon = styles.icon
                const href = `/alert-center/${alert.id}`
                const isUnread = !seenAlertIds.has(alert.id)

                return (
                  <Link
                    key={`alert-${alert.id}`}
                    href={href}
                    onClick={() => void markAlertsViewed([alert.id])}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 transition-colors hover:bg-accent min-[360px]:px-4",
                      isUnread && "bg-primary/10"
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0">
                      <Avatar className="h-10 w-10 rounded-lg border bg-muted">
                        {alert.appIconUri ? (
                          <AvatarImage
                            src={alert.appIconUri}
                            alt={alert.appDisplayName || alert.appId || "App"}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-lg bg-muted text-sm font-medium text-muted-foreground">
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
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{formatAlertCardTitle(alert)}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(alert.triggeredAt)}</p>
                    </div>
                  </Link>
                )
              })}
              {hasMoreItems && (
                <a
                  href="#"
                  className="block w-full py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-accent"
                  onClick={(e) => {
                    e.preventDefault()
                    setVisibleItemCount((n) => n + NOTIFICATIONS_PAGE_SIZE)
                  }}
                >
                  Load more
                </a>
              )}
            </div>
          </div>
        ) : listFilter === "unread" && (alerts.length > 0 || insightNotes.length > 0) ? (
          <div className="flex flex-col items-center justify-center px-3 py-12 min-[360px]:px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No unread items</p>
            <p className="mt-1 text-center text-xs text-muted-foreground">Switch to All to see read insights and alerts.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-3 py-12 min-[360px]:px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">Alerts và daily insight sẽ hiện ở đây.</p>
          </div>
        )}

        <div className="border-t">
          <Link
            href="/alert-center"
            onClick={markAllAlertsViewed}
            className="flex items-center justify-center gap-1 px-3 py-3 text-center text-sm text-primary transition-colors hover:bg-accent"
          >
            View All Notifications
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
