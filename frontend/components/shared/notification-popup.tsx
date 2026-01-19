"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight, BellOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success"
  title: string
  description: string
  time: string
  read: boolean
  link?: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "critical",
    title: "Fill Rate Critical Drop",
    description: "Weather Plus - Banner - US dropped below 50%",
    time: "2 hours ago",
    read: false,
    link: "/alerts/1",
  },
  {
    id: "2",
    type: "warning",
    title: "eCPM Declining",
    description: "Game Master - Interstitial showing -15% eCPM trend",
    time: "5 hours ago",
    read: false,
    link: "/alerts/2",
  },
  {
    id: "3",
    type: "success",
    title: "A/B Test Completed",
    description: "Waterfall Optimization Test #2 completed with winner",
    time: "1 day ago",
    read: true,
    link: "/mediation/tests/1",
  },
  {
    id: "4",
    type: "info",
    title: "New User Joined",
    description: "jane.doe@company.com accepted invitation",
    time: "2 days ago",
    read: true,
    link: "/users/2",
  },
  {
    id: "5",
    type: "warning",
    title: "Low Fill Rate Warning",
    description: "3 ad units showing fill rate below 80%",
    time: "3 days ago",
    read: true,
    link: "/alerts?severity=warning",
  },
]

export function NotificationPopup() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const getTypeStyles = (type: Notification["type"]) => {
    switch (type) {
      case "critical":
        return {
          icon: AlertTriangle,
          bg: "bg-red-100",
          color: "text-red-600",
        }
      case "warning":
        return {
          icon: AlertCircle,
          bg: "bg-amber-100",
          color: "text-amber-600",
        }
      case "info":
        return {
          icon: Info,
          bg: "bg-blue-100",
          color: "text-blue-600",
        }
      case "success":
        return {
          icon: CheckCircle,
          bg: "bg-green-100",
          color: "text-green-600",
        }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 relative bg-transparent">
          <Bell className="w-4 h-4 text-slate-600" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        {notifications.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const styles = getTypeStyles(notification.type)
                const Icon = styles.icon

                return (
                  <Link
                    key={notification.id}
                    href={notification.link || "#"}
                    onClick={() => {
                      markAsRead(notification.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors",
                      !notification.read && "bg-blue-50/50",
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", styles.bg)}
                    >
                      <Icon className={cn("w-4 h-4", styles.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notification.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />}
                  </Link>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">You're all caught up!</p>
            <p className="text-xs text-slate-500 mt-1">No new notifications</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200">
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
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
