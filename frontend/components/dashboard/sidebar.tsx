"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  LayoutDashboard,
  Smartphone,
  Layers,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Zap,
  Users,
  Building2,
  Briefcase,
  KeyRound,
  ListChecks,
  Activity,
  Shield,
  ListFilter,
  Bot,
  Library,
  BookOpen,
  PieChart,
  Gauge,
  Loader2,
  Megaphone,
  FileText,
  CreditCard,
  GitMerge,
  Database,
  Sparkles,
  Apple,
  Contact,
  BadgePercent,
  Music2,
  Star,
  Plus,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/shared/logo"
import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { reportsApi } from "@/lib/api/services"
import {
  PINNED_CUSTOM_REPORTS_CHANGED_EVENT,
} from "@/lib/reports/pinned-custom-reports"
import type { CustomReportListItem } from "@/types/reports"
import { useToast } from "@/hooks/use-toast"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { formatAlertBadgeCount } from "@/lib/alert-notification-state"
import {
  getCurrentUser,
  getUserInitials,
  getUserDisplayName,
  getUserRoleDisplayName,
  hasScreenFunction,
  type AuthUser,
} from "@/lib/auth"
import { logoutUser } from "@/lib/logout"
import { isSuperAdmin } from "@/lib/enums/user-role"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type NavItem = {
  icon: any
  label: string
  href: string
  hasSubmenu?: boolean
  badge?: number
  /** Show "New" badge for new features */
  isNew?: boolean
  /** Show "Testing" badge for features in QA */
  isTesting?: boolean
  /** Star + flame marker (e.g. AI Assistant) — tiêu điểm cần chú ý */
  spotlight?: boolean
  /** If false or returns false, item is hidden in sidebar. Default true. */
  isShow?: boolean | (() => boolean)
  children?: {
    icon: any
    label: string
    href: string
    isShow?: boolean | (() => boolean)
    isNew?: boolean
    /** Match ?reportId= for /reports saved-report links */
    reportId?: string | null
    /** Distinguish /reports index vs ?new=1 when reportId is null */
    reportsView?: "overview" | "index" | "new"
  }[]
}

function isNavChildVisible(child: { isShow?: boolean | (() => boolean) }): boolean {
  if (child.isShow === undefined) return true
  return typeof child.isShow === "function" ? child.isShow() : child.isShow
}

type ReportsNavChild = {
  href: string
  reportId?: string | null
  reportsView?: "overview" | "index" | "new"
}

function isReportsNavChildActive(
  child: ReportsNavChild,
  pathname: string,
  reportIdParam: string | null,
  isNewReportParam: boolean,
): boolean {
  if (child.reportsView === "overview") {
    return pathname === "/reports/overview"
  }

  if (pathname === "/reports/overview") {
    return false
  }

  if (child.reportId !== undefined) {
    if (pathname !== "/reports") return false
    if (child.reportId === null) {
      if (child.reportsView === "new") {
        return isNewReportParam && !reportIdParam
      }
      return !reportIdParam && !isNewReportParam
    }
    return reportIdParam === child.reportId
  }

  return pathname === child.href
}

const settingsSidebarChildren: NonNullable<NavItem["children"]> = [
  { icon: Building2, label: "Organizations", href: "/organizations", isShow: () => hasScreenFunction("s-orgs", "view") },
  { icon: Briefcase, label: "Job Management", href: "/jobs", isShow: () => hasScreenFunction("s-jobs", "view") },
  {
    icon: ListChecks,
    label: "Waterfall Config",
    href: "/waterfall-rules",
    isShow: () => hasScreenFunction("s-waterfall-rules", "view-configs") || hasScreenFunction("s-waterfall-rules", "view-rules"),
  },
  { icon: Layers, label: "Waterfall Automation", href: "/waterfall-apply", isShow: () => hasScreenFunction("s-waterfall-apply", "view"), isNew: true },
  { icon: Shield, label: "Permissions", href: "/permissions", isShow: () => hasScreenFunction("s-permissions", "view") },
  {
    icon: BadgePercent,
    label: "Commission",
    href: "/commission",
    isShow: () => hasScreenFunction("s-commission", "view") || hasScreenFunction("s-commission", "manage"),
  },
  {
    icon: KeyRound,
    label: "Data Accounts",
    href: "/data-accounts",
    isShow: () =>
      hasScreenFunction("s-data-accounts", "view") ||
      hasScreenFunction("s-meta-accounts", "view") ||
      hasScreenFunction("s-tiktok-accounts", "view"),
  },
  { icon: Database, label: "Data Sources", href: "/data-sources", isShow: () => hasScreenFunction("s-data-sources", "view") },
  {
    icon: Apple,
    label: "Apple App Store",
    href: "/data-sources/apple",
    isShow: () => hasScreenFunction("s-data-accounts", "view"),
  },
  { icon: Contact, label: "vCard Generator", href: "/settings/vcard-generator", isShow: true, isNew: true },
  {
    icon: Wrench,
    label: "Maintenance Management",
    href: "/settings/maintenance",
    isShow: () => isSuperAdmin(getCurrentUser()?.role),
  },
  {
    icon: Sparkles,
    label: "AI Insight Templates",
    href: "/insight-templates",
    isShow: () => hasScreenFunction("s-insight-settings", "manage-templates"),
  },
  {
    icon: Zap,
    label: "Insight Generation",
    href: "/insight-generation",
    isShow: () => hasScreenFunction("s-insight-settings", "view-generation"),
  },
]

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", isShow: true },
  {
    icon: Smartphone,
    label: "Apps",
    href: "/apps",
    isShow: () => hasScreenFunction("s-apps", "view"),
  },
  {
    icon: ListFilter,
    label: "Waterfall",
    href: "/waterfall",
    isShow: () => hasScreenFunction("s-waterfall", "view")
  },
  { icon: Layers, label: "Mediation Groups", href: "/mediation", isShow: () => hasScreenFunction("s-mediation-groups", "view") },
  { icon: BarChart3, label: "Reports", href: "/reports", isShow: () => hasScreenFunction("s-reports", "view") },
  {
    icon: PieChart,
    label: "My Reports",
    href: "/reports/my-reports",
    isShow: () => hasScreenFunction("s-my-reports", "view"),
    isTesting: true,
  },
  {
    icon: Bell,
    label: "Alert Center",
    href: "/alert-center",
    isShow: () =>
      hasScreenFunction("s-alerts", "view") || hasScreenFunction("s-alerts", "setting-my-alerts"),
  },
  { icon: Activity, label: "Activity Logs", href: "/activity-logs", isShow: () => hasScreenFunction("s-activity-logs", "view") },
  {
    icon: Gauge,
    label: "Monitoring",
    href: "#",
    hasSubmenu: true,
    isShow: () => hasScreenFunction("s-monitoring-admob", "view"),
    children: [
      {
        icon: Smartphone,
        label: "AdMob",
        href: "/monitoring/admob",
        isShow: () => hasScreenFunction("s-monitoring-admob", "view"),
      },
    ],
  },
  {
    icon: Megaphone,
    label: "Meta Ads",
    href: "#",
    hasSubmenu: true,
    isNew: false,
    isShow: () =>
      [
        ["s-meta-requests", "view"],
        ["s-meta-requests", "create"],
        ["s-meta-accounts", "view"],
        ["s-meta-campaigns", "view"],
        ["s-meta-automation", "view"],
      ].some(([screen, fn]) => hasScreenFunction(screen, fn)),
    children: [
      {
        icon: BarChart3,
        label: "Insights",
        href: "/meta-ads/insights",
        isNew: false,
        isShow: () => ["view"].some((fn) => hasScreenFunction("s-meta-campaigns", fn)),
      },
      {
        icon: FileText,
        label: "Requests",
        href: "/meta-ads/requests",
        isShow: () => ["view", "create", "approve", "execute", "retry"].some((fn) => hasScreenFunction("s-meta-requests", fn)),
      },
      {
        icon: FileText,
        label: "Campaigns",
        href: "/meta-ads/campaigns",
        isShow: () => ["view", "edit"].some((fn) => hasScreenFunction("s-meta-campaigns", fn)),
      },
      {
        icon: CreditCard,
        label: "Ad Accounts",
        href: "/meta-ads/ad-accounts",
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-meta-accounts", fn)),
      },
      {
        icon: GitMerge,
        label: "App Mappings",
        href: "/meta-ads/app-mappings",
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-meta-accounts", fn)),
      },
    ],
  },
  {
    icon: Music2,
    label: "TikTok Ads",
    href: "#",
    hasSubmenu: true,
    isNew: true,
    isShow: () =>
      [
        ["s-tiktok-accounts", "view"],
        ["s-tiktok-campaigns", "view"],
        ["s-tiktok-requests", "view"],
        ["s-tiktok-requests", "create"],
        ["s-tiktok-automation", "view"],
      ].some(([screen, fn]) => hasScreenFunction(screen, fn)),
    children: [
      {
        icon: BarChart3,
        label: "Dashboard",
        href: "/tiktok-ads/dashboard",
        isNew: true,
        isShow: () => hasScreenFunction("s-tiktok-campaigns", "view"),
      },
      {
        icon: CreditCard,
        label: "Ad Accounts",
        href: "/tiktok-ads/ad-accounts",
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-tiktok-accounts", fn)),
      },
      {
        icon: GitMerge,
        label: "App Mappings",
        href: "/tiktok-ads/app-mappings",
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-tiktok-accounts", fn)),
      },
      {
        icon: FileText,
        label: "Requests",
        href: "/tiktok-ads/requests",
        isShow: () => ["view", "create", "approve", "execute", "retry"].some((fn) => hasScreenFunction("s-tiktok-requests", fn)),
      },
      {
        icon: Megaphone,
        label: "Campaigns",
        href: "/tiktok-ads/campaigns",
        isShow: () => hasScreenFunction("s-tiktok-campaigns", "view"),
      },
    ],
  },
  {
    icon: Star,
    label: "AdMob Ads",
    href: "#",
    hasSubmenu: true,
    isShow: () =>
      ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-admob-app-mappings", fn)),
    children: [
      {
        icon: GitMerge,
        label: "App Mappings",
        href: "/admob-ads/app-mappings",
        isShow: () => hasScreenFunction("s-admob-app-mappings", "view"),
      },
    ],
  },
  {
    icon: Bot,
    label: "AI Assistant",
    href: "#",
    hasSubmenu: true,
    spotlight: true,
    isShow: () =>
      [
        "chat",
        "library",
        "knowledge-base",
        "usage",
        "quota",
        "role-prompts",
        "metrics-catalog",
        "system-config",
        "settings",
      ].some((fn) => hasScreenFunction("s-ai-assistant", fn)),
    children: [

      { icon: Bot, label: "Chat", href: "/ai-assistant", isShow: () => hasScreenFunction("s-ai-assistant", "chat") },
      { icon: Library, label: "Library", href: "/ai-assistant/library", isShow: () => hasScreenFunction("s-ai-assistant", "library") },
      { icon: BookOpen, label: "Knowledge Base", href: "/ai-assistant/knowledge-base", isShow: () => hasScreenFunction("s-ai-assistant", "knowledge-base") },
      { icon: PieChart, label: "AI Usage", href: "/ai-assistant/usage", isShow: () => hasScreenFunction("s-ai-assistant", "usage") },
      { icon: Gauge, label: "Quota", href: "/ai-assistant/admin/quota", isShow: () => hasScreenFunction("s-ai-assistant", "quota") },
      { icon: Shield, label: "Role Prompts", href: "/ai-assistant/admin/role-prompts", isShow: () => hasScreenFunction("s-ai-assistant", "role-prompts") },
      { icon: ListChecks, label: "Metrics Catalog", href: "/ai-assistant/admin/metrics-catalog", isShow: () => hasScreenFunction("s-ai-assistant", "metrics-catalog") },
      { icon: Zap, label: "System Config", href: "/ai-assistant/admin/system-config", isShow: () => hasScreenFunction("s-ai-assistant", "system-config") },
      { icon: Settings, label: "Settings", href: "/ai-assistant/settings", isShow: () => hasScreenFunction("s-ai-assistant", "settings") },
    ],
  },
  {
    icon: Settings,
    label: "Settings",
    href: "#",
    hasSubmenu: true,
    isShow: () => settingsSidebarChildren.some(isNavChildVisible),
    children: settingsSidebarChildren,
  },
]

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 hidden h-screen border-r border-slate-200 bg-white md:flex",
            props.collapsed ? "w-16" : "w-60",
          )}
        />
      }
    >
      <SidebarInner {...props} />
    </Suspense>
  )
}

function SidebarInner({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reportIdParam = pathname === "/reports" ? searchParams.get("reportId") : null
  const isNewReportParam = pathname === "/reports" && searchParams.get("new") === "1"
  const router = useRouter()
  const { toast } = useToast()
  const { unseenCount: alertNotificationCount, openAlertIds, markAlertsViewed } = useAlertNotifications()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutAllDevices, setLogoutAllDevices] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [pinnedReports, setPinnedReports] = useState<CustomReportListItem[]>([])

  const loadPinnedReports = useCallback(async () => {
    if (!hasScreenFunction("s-reports", "view")) {
      setPinnedReports([])
      return
    }
    try {
      const items = await reportsApi.listPinned()
      setPinnedReports(items)
    } catch {
      setPinnedReports([])
    }
  }, [])

  useEffect(() => {
    void loadPinnedReports()
    const onPinnedChanged = () => void loadPinnedReports()
    window.addEventListener(PINNED_CUSTOM_REPORTS_CHANGED_EVENT, onPinnedChanged)
    return () => window.removeEventListener(PINNED_CUSTOM_REPORTS_CHANGED_EVENT, onPinnedChanged)
  }, [loadPinnedReports])

  const sidebarNavItems = useMemo((): NavItem[] => {
    return navItems.map((item) => {
      if (item.label !== "Reports" || !hasScreenFunction("s-reports", "view")) return item
      return {
        ...item,
        href: "#",
        hasSubmenu: true,
        children: [
          {
            icon: BarChart3,
            label: "Overview Report",
            href: "/reports/overview",
            reportsView: "overview",
          },
          {
            icon: BarChart3,
            label: "Waterfall Report",
            href: "/reports/waterfall",
          },
          {
            icon: BarChart3,
            label: "All reports",
            href: "/reports",
            reportId: null,
            reportsView: "index",
          },
          {
            icon: Plus,
            label: "New report",
            href: "/reports?new=1",
            reportId: null,
            reportsView: "new",
          },
          ...pinnedReports.map((report) => ({
            icon: FileText,
            label: report.name,
            href: `/reports?reportId=${report.id}`,
            reportId: report.id,
          })),
        ],
      }
    })
  }, [pinnedReports])

  useEffect(() => {
    setOpenMenus({})
  }, [pathname])

  useEffect(() => {
    // Get user from localStorage
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const { apiFailed } = await logoutUser(logoutAllDevices)
    if (apiFailed) {
      toast({
        title: "Logged out",
        description: "Your local session has been cleared.",
        variant: "default",
      })
    } else {
      toast({
        title: logoutAllDevices ? "Logged out from all devices" : "Logged out",
        description: logoutAllDevices
          ? "You have been logged out from all devices."
          : "You have been logged out successfully.",
      })
    }
    setIsLoggingOut(false)
    setShowLogoutModal(false)
    router.push("/login")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Logo size={32} className="rounded-lg overflow-hidden" />


            {!collapsed && <span className="font-semibold text-slate-900">Nexus</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-600"
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          {sidebarNavItems.map((item) => {
            const isVisible =
              item.isShow === undefined
                ? true
                : typeof item.isShow === "function"
                  ? item.isShow()
                  : item.isShow
            if (!isVisible) return null
            const hasSubmenu = !!item.hasSubmenu
            const anyChildActive =
              Array.isArray((item as any).children) &&
              (item as any).children.some((child: any) =>
                item.label === "Reports"
                  ? isReportsNavChildActive(child, pathname, reportIdParam, isNewReportParam)
                  : pathname === child.href ||
                    (child.href !== "/" && pathname.startsWith(child.href.split("?")[0])),
              )

            const isExpanded = hasSubmenu ? openMenus[item.label] ?? anyChildActive : false
            const isActive = hasSubmenu
              ? anyChildActive
              : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            const badgeCount = item.href === "/alert-center" ? alertNotificationCount : item.badge

            const content = (
              <div
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.spotlight && (
                      <span className="flex shrink-0 cursor-default items-center gap-0"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-600" aria-hidden />
                      </span>
                    )}
                    {item.isNew && (
                      <Badge className="h-5 px-1.5 text-xs bg-green-500 hover:bg-green-600">
                        New
                      </Badge>
                    )}
                    {item.isTesting && (
                      <Badge className="h-5 px-1.5 text-xs bg-amber-500 hover:bg-amber-600">
                        Testing
                      </Badge>
                    )}
                    {hasSubmenu && (
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    )}
                    {typeof badgeCount === "number" && badgeCount > 0 && !hasSubmenu && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {formatAlertBadgeCount(badgeCount)}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && typeof badgeCount === "number" && badgeCount > 0 && !hasSubmenu && (
                  <Badge variant="destructive" className="absolute left-10 top-1 h-4 min-w-4 px-1 text-xs">
                    {formatAlertBadgeCount(badgeCount)}
                  </Badge>
                )}
              </div>
            )

            return (
              <div key={item.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {hasSubmenu ? (
                      // hasSubmenu: kh?ng di?u hu?ng, ch? toggle collapse/expand
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenus((prev) => ({
                            ...prev,
                            [item.label]: !isExpanded,
                          }))
                        }
                        className="w-full text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={item.href === "/alert-center" ? () => void markAlertsViewed(openAlertIds) : undefined}
                        className="block"
                      >
                        {content}
                      </Link>
                    )}
                  </TooltipTrigger>
                  {collapsed && !item.children && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Submenu items (vd: Settings) */}
                {!collapsed && isExpanded && (item as any).children && (item as any).children.length > 0 && (
                  <div className="mt-0.5 ml-5 space-y-0.5">
                    {(item as any).children.map((child: any) => {
                      if (!isNavChildVisible(child)) return null

                      const childActive =
                        item.label === "Reports"
                          ? isReportsNavChildActive(child, pathname, reportIdParam, isNewReportParam)
                          : pathname === child.href ||
                            (child.href !== "/" && pathname.startsWith(child.href.split("?")[0]))

                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                            childActive
                              ? "bg-blue-50 text-blue-600"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                          )}
                        >
                          {child.icon && <child.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="flex-1 text-left">{child.label}</span>
                          {child.isNew && (
                            <Badge className="h-4 px-1.5 text-[10px] bg-green-500 hover:bg-green-600">
                              New
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="px-4">
          <div className="border-t border-slate-200" />
        </div>

        {/* Help Link */}
        <div className="px-2 py-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/help"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith("/help")
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>Help & Docs</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>Help & Docs</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className={cn("flex items-center gap-3 group", collapsed && "justify-center")}>
            <Link href="/profile" className={cn("flex items-center gap-3 flex-1 min-w-0", collapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{getUserRoleDisplayName(user)}</p>
                </div>
              )}
            </Link>
            {!collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>Log out</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </div>
      </aside>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle>Log out of Nexus?</DialogTitle>
            <DialogDescription>You will need to sign in again to access your account.</DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="sidebar-logout-all"
              checked={logoutAllDevices}
              onCheckedChange={(checked: boolean) => setLogoutAllDevices(checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="sidebar-logout-all" className="text-sm font-medium cursor-pointer">
                Log out from all devices
              </label>
              <p className="text-xs text-slate-500">This will end all your active sessions</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Log out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
