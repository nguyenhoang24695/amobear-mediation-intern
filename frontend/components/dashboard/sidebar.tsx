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

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Smartphone, label: "Apps", href: "/apps" },
  { icon: Layers, label: "Mediation Groups", href: "/mediation" },
  { icon: BarChart3, label: "Reports", href: "/reports", hasSubmenu: true },
  { icon: Bell, label: "Alert Center", href: "/alerts", badge: 3 },
  { icon: Building2, label: "Organizations", href: "/organizations" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<AuthUser | null>(null)

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
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            // Only show Organizations menu for admin and super_admin roles
            if (item.label === "Organizations") {
              if (user?.role !== UserRole.Admin && user?.role !== UserRole.SuperAdmin) {
                return null
              }
            }

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.hasSubmenu && <ChevronRight className="w-4 h-4 text-slate-400" />}
                        {item.badge && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <Badge variant="destructive" className="absolute left-10 top-1 h-4 min-w-4 px-1 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
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
