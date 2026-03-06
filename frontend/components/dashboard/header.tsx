"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { NotificationPopup } from "@/components/shared/notification-popup"
import { UserDropdown } from "@/components/shared/user-dropdown"
import { GlobalSearch } from "@/components/shared/global-search"
import { DashboardDatePicker } from "./dashboard-date-picker"

export function Header() {
  return (
    <TooltipProvider>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        </div>

        {/* Center: Search */}
        <GlobalSearch />

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Date Range Picker with Apply and Refresh */}
          <DashboardDatePicker />

          {/* Notifications */}
          <NotificationPopup />

          {/* User Menu */}
          <UserDropdown />
        </div>
      </header>
    </TooltipProvider>
  )
}
