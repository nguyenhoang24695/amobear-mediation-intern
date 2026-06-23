"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Calendar, RefreshCw } from "lucide-react"
import { NotificationPopup } from "@/components/shared/notification-popup"
import { UserDropdown } from "@/components/shared/user-dropdown"

export function Header() {
  return (
    <TooltipProvider>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search apps, networks, reports..."
              className="pl-9 pr-16 h-10 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <Button variant="outline" className="h-9 gap-2 text-sm text-slate-600 bg-transparent">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Last 7 days</span>
          </Button>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent">
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last updated: 2 min ago</p>
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <NotificationPopup />

          {/* User Menu */}
          <UserDropdown />
        </div>
      </header>
    </TooltipProvider>
  )
}
