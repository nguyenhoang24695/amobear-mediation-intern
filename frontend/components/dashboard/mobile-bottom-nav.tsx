"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Smartphone,
  BarChart3,
  LayoutGrid,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/enums/user-role"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { formatAlertBadgeCount } from "@/lib/alert-notification-state"
import {
  isAnyMoreNavSectionActive,
  isMoreNavSectionActive,
  MOBILE_MORE_NAV_ITEMS,
  resolveMobileMoreNavHref,
  resolveMobileMoreNavItemHref,
} from "@/lib/navigation/dashboard-nav"
import { MOBILE_MORE_NAV_ICONS } from "@/lib/navigation/mobile-nav-icons"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { MobileSearchSheet } from "@/components/dashboard/mobile-search-sheet"

type BottomNavItem = {
  icon: React.ElementType
  label: string
  href: string
  isShow?: boolean | (() => boolean)
  match?: (pathname: string) => boolean
}

function isVisible(flag?: boolean | (() => boolean)): boolean {
  if (flag === undefined) return true
  return typeof flag === "function" ? flag() : flag
}

function hasMetaIntegrationListAccess(): boolean {
  return hasScreenFunction("s-meta-accounts", "view") || (
    hasScreenFunction("s-meta-accounts", "create") &&
    hasScreenFunction("s-meta-accounts", "edit")
  )
}

const bottomNavItems: BottomNavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Home",
    href: "/",
    isShow: true,
    match: (pathname) => pathname === "/",
  },
  {
    icon: Smartphone,
    label: "Apps",
    href: "/apps",
    isShow: () => hasScreenFunction("s-apps", "view"),
    match: (pathname) => pathname === "/apps" || pathname.startsWith("/apps/"),
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/nav/reports",
    isShow: () =>
      hasScreenFunction("s-reports", "view") ||
      hasScreenFunction("s-overview-report", "view") ||
      hasScreenFunction("s-waterfall-report", "view") ||
      hasScreenFunction("s-my-reports", "view"),
    match: (pathname) =>
      pathname === "/nav/reports" || pathname.startsWith("/reports"),
  },
]

function canShowMoreItem(label: string): boolean {
  switch (label) {
    case "Alerts":
      return hasScreenFunction("s-alerts", "view") || hasScreenFunction("s-alerts", "setting-my-alerts")
    case "Waterfall":
      return hasScreenFunction("s-waterfall", "view")
    case "Mediation":
      return hasScreenFunction("s-mediation-groups", "view")
    case "Monitoring":
      return hasScreenFunction("s-monitoring-admob", "view")
    case "Activity":
      return hasScreenFunction("s-activity-logs", "view")
    case "My Reports":
      return hasScreenFunction("s-my-reports", "view")
    case "Meta Ads":
      return hasScreenFunction("s-meta-campaigns", "view") || hasScreenFunction("s-meta-requests", "view")
    case "TikTok Ads":
      return hasScreenFunction("s-tiktok-campaigns", "view") || hasScreenFunction("s-tiktok-requests", "view")
    case "AI Assistant":
      return hasScreenFunction("s-ai-assistant", "chat")
    case "Organizations":
      return hasScreenFunction("s-orgs", "view")
    case "Jobs":
      return hasScreenFunction("s-jobs", "view")
    case "Permissions":
      return hasScreenFunction("s-permissions", "view")
    case "Commission":
      return hasScreenFunction("s-commission", "view") || hasScreenFunction("s-commission", "manage")
    case "Data Accounts":
      return (
        hasScreenFunction("s-data-accounts", "view") ||
        hasMetaIntegrationListAccess() ||
        hasScreenFunction("s-tiktok-accounts", "view")
      )
    case "Data Sources":
      return hasScreenFunction("s-data-sources", "view")
    case "WF Config":
      return (
        hasScreenFunction("s-waterfall-rules", "view-configs") ||
        hasScreenFunction("s-waterfall-rules", "view-rules") ||
        hasScreenFunction("s-waterfall-apply", "view")
      )
    case "Insights":
      return (
        hasScreenFunction("s-insight-settings", "manage-templates") ||
        hasScreenFunction("s-insight-settings", "view-generation")
      )
    case "Maintenance":
      return isSuperAdmin(getCurrentUser()?.role)
    case "Profile":
    case "Help":
      return true
    default:
      return true
  }
}

function MobileBottomNavInner() {
  const pathname = usePathname()
  const { unseenCount: alertNotificationCount, openAlertIds, markAlertsViewed } = useAlertNotifications()
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const visibleBottomItems = bottomNavItems.filter((item) => isVisible(item.isShow))
  const visibleMoreItems = useMemo(
    () => MOBILE_MORE_NAV_ITEMS.filter((item) => canShowMoreItem(item.label)),
    [],
  )
  const isMoreActive = isAnyMoreNavSectionActive(pathname) || moreOpen

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-end gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex h-[4.25rem] min-w-0 flex-1 items-center justify-around rounded-full border border-slate-200/80 bg-white/95 px-1 shadow-[0_4px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          {visibleBottomItems.map((item) => {
            const href = resolveMobileMoreNavHref(item.label, item.href)
            const isActive = item.match ? item.match(pathname) : pathname === href

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors",
                  isActive
                    ? "bg-slate-200/70 text-blue-600"
                    : "text-slate-500 active:bg-slate-100/60 active:text-slate-700",
                )}
              >
                <item.icon className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.25]")} />
                <span className={cn("truncate text-[10px] font-medium leading-none", isActive && "text-blue-600")}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors",
              isMoreActive
                ? "bg-slate-200/70 text-blue-600"
                : "text-slate-500 active:bg-slate-100/60 active:text-slate-700",
            )}
            aria-label="More navigation"
          >
            <span className="relative">
              <LayoutGrid className={cn("h-[22px] w-[22px]", isMoreActive && "stroke-[2.25]")} />
              {alertNotificationCount > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                  {formatAlertBadgeCount(alertNotificationCount)}
                </span>
              )}
            </span>
            <span className={cn("text-[10px] font-medium leading-none", isMoreActive && "text-blue-600")}>
              More
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-[0_4px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-colors active:bg-slate-50"
          aria-label="Search"
        >
          <Search className="h-6 w-6" />
        </button>
      </nav>

      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[75dvh] rounded-t-2xl px-4 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
            <SheetDescription>Quick access to all sections</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid max-h-[55dvh] grid-cols-4 gap-2 overflow-y-auto">
            {visibleMoreItems.map((item) => {
              const Icon = MOBILE_MORE_NAV_ICONS[item.label] ?? LayoutGrid
              const href = resolveMobileMoreNavItemHref(item)
              const isActive = isMoreNavSectionActive(pathname, item)
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={() => {
                    if (item.href === "/alert-center") {
                      void markAlertsViewed(openAlertIds)
                    }
                    setMoreOpen(false)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition-colors",
                    isActive ? "bg-slate-200/70 text-blue-600" : "text-slate-600 hover:bg-slate-100/60",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  )
}
