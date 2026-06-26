"use client"

import { usePathname } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Logo } from "@/components/shared/logo"
import { NotificationPopup } from "@/components/shared/notification-popup"
import { UserDropdown } from "@/components/shared/user-dropdown"
import { GlobalSearch } from "@/components/shared/global-search"
import { DashboardDatePicker } from "./dashboard-date-picker"

export function Header() {
  const pathname = usePathname()
  const isDashboard = pathname === "/"

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:h-16 md:px-6">
        <Logo size={28} className="shrink-0 overflow-hidden rounded-lg md:hidden" />

        <div className="hidden min-w-0 flex-1 md:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 md:ml-0 lg:gap-3">
          {isDashboard && (
            <div className="hidden lg:flex">
              <DashboardDatePicker />
            </div>
          )}
          <NotificationPopup />
          <UserDropdown />
        </div>
      </header>
    </TooltipProvider>
  )
}
