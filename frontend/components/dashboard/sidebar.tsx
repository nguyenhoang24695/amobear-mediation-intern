"use client"

import { useState, useEffect } from "react"
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
  Link2,
  CreditCard,
  GitMerge,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAlertNotifications } from "@/hooks/use-alert-notifications"
import { formatAlertBadgeCount } from "@/lib/alert-notification-state"
import {
  getCurrentUser,
  getUserInitials,
  getUserDisplayName,
  hasScreenFunction,
  type AuthUser,
} from "@/lib/auth"
import { logoutUser } from "@/lib/logout"

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
  /** If false or returns false, item is hidden in sidebar. Default true. */
  isShow?: boolean | (() => boolean)
  children?: { icon: any; label: string; href: string; isShow?: boolean | (() => boolean); isNew?: boolean }[]
}

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
  { icon: BarChart3, label: "Reports", href: "/reports", isShow: true },
  { icon: Bell, label: "Alert Center", href: "/alert-center", isShow: true },
  { icon: Activity, label: "Activity Logs", href: "/activity-logs", isShow: () => hasScreenFunction("s-activity-logs", "view") },
  {
    icon: Megaphone,
    label: "Meta Ads",
    href: "#",
    hasSubmenu: true,
    isNew: true,
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
        icon: Link2,
        label: "Integrations",
        href: "/meta-ads/integrations",
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-meta-accounts", fn)),
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
    icon: Bot,
    label: "AI Assistant",
    href: "#",
    hasSubmenu: true,
    isNew: true,
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
    isShow: true,
    children: [
      { icon: Building2, label: "Organizations", href: "/organizations", isShow: () => hasScreenFunction("s-orgs", "view") },
      { icon: Briefcase, label: "Job Management", href: "/jobs", isShow: () => hasScreenFunction("s-jobs", "view") },
      { icon: ListChecks, label: "Waterfall Config", href: "/waterfall-rules", isShow: () => hasScreenFunction("s-waterfall-rules", "view-configs") || hasScreenFunction("s-waterfall-rules", "view-rules") },
      { icon: Layers, label: "Waterfall Automation", href: "/waterfall-apply", isShow: () => hasScreenFunction("s-waterfall-apply", "view"), isNew: true },
      { icon: Shield, label: "Permissions", href: "/permissions", isShow: () => hasScreenFunction("s-permissions", "view") },
      { icon: KeyRound, label: "Data Accounts", href: "/data-accounts", isShow: () => hasScreenFunction("s-data-accounts", "view") }
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { unseenCount: alertNotificationCount, openAlertIds, markAlertsViewed } = useAlertNotifications()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutAllDevices, setLogoutAllDevices] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
          "fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="font-semibold text-slate-900">Mediation Pro</span>}
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
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
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
              (item as any).children.some(
                (child: any) => pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href)),
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
                    {item.isNew && (
                      <Badge className="h-5 px-1.5 text-xs bg-green-500 hover:bg-green-600">
                        New
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
                    {badgeCount && !hasSubmenu && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {formatAlertBadgeCount(badgeCount)}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && badgeCount && !hasSubmenu && (
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
                        onClick={item.href === "/alert-center" ? () => markAlertsViewed(openAlertIds) : undefined}
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
                      const childVisible =
                        child.isShow === undefined
                          ? true
                          : typeof child.isShow === "function"
                            ? child.isShow()
                            : child.isShow
                      if (!childVisible) return null

                      const childActive =
                        pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href))

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
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>Help & Docs</span>}
              </button>
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
                  <p className="text-xs text-slate-500 truncate">{user?.role || "User"}</p>
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
            <DialogTitle>Log out of Mediation Pro?</DialogTitle>
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


