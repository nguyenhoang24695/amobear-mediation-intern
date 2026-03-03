"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  Shield,
  ListFilter,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/services"
import { clearAuthData, getRefreshToken, getCurrentUser, getUserInitials, getUserDisplayName, type AuthUser } from "@/lib/auth"
import { UserRole } from "@/lib/enums/user-role"

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
  children?: { icon: any; label: string; href: string; adminOnly?: boolean }[]
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Smartphone, label: "Apps", href: "/apps" },
  { icon: ListFilter, label: "Waterfall", href: "/waterfall" },
  { icon: Layers, label: "Mediation Groups", href: "/mediation" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: Bell, label: "Alert Center", href: "/alerts", badge: 3 },
  {
    icon: Settings,
    label: "Settings",
    href: "#",
    hasSubmenu: true,
    children: [
      { icon: Building2, label: "Organizations", href: "/organizations", adminOnly: true },
      { icon: Briefcase, label: "Job Management", href: "/jobs", adminOnly: true },
      { icon: ListChecks, label: "Waterfall Rules", href: "/waterfall-rules", adminOnly: true },
      { icon: Shield, label: "Permissions", href: "/permissions", adminOnly: true },
      { icon: KeyRound, label: "Data Accounts", href: "/data-accounts", adminOnly: true  }
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenMenus({})
  }, [pathname])

  useEffect(() => {
    // Get user from localStorage
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

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
                    {hasSubmenu && (
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    )}
                    {item.badge && !hasSubmenu && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && item.badge && !hasSubmenu && (
                  <Badge variant="destructive" className="absolute left-10 top-1 h-4 min-w-4 px-1 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            )

            return (
              <div key={item.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {hasSubmenu ? (
                      // hasSubmenu: kh�ng di?u hu?ng, ch? toggle collapse/expand
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
                      <Link href={item.href} className="block">
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
                      // Only show some items for admin / super_admin
                      if (child.adminOnly) {
                        if (user?.role !== UserRole.Admin && user?.role !== UserRole.SuperAdmin) {
                          return null
                        }
                      }

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
                    onClick={async () => {
                      try {
                        // Call logout API
                        const refreshToken = getRefreshToken()
                        if (refreshToken) {
                          await authApi.logout(refreshToken)
                        }

                        // Clear all authentication data
                        clearAuthData()

                        // Show success message
                        toast({
                          title: "Logged out",
                          description: "You have been logged out successfully.",
                        })

                        // Redirect to login
                        router.push("/login")
                      } catch (err) {
                        // Even if API call fails, clear local data and redirect
                        clearAuthData()

                        toast({
                          title: "Logged out",
                          description: "Your local session has been cleared.",
                          variant: "default",
                        })

                        router.push("/login")
                      }
                    }}
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
    </TooltipProvider>
  )
}
