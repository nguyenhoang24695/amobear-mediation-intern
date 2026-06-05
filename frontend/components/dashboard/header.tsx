"use client"

import { usePathname } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Logo } from "@/components/shared/logo"
import { NotificationPopup } from "@/components/shared/notification-popup"
import { UserDropdown } from "@/components/shared/user-dropdown"
import { GlobalSearch } from "@/components/shared/global-search"
import { getDashboardPageTitle } from "@/lib/navigation/dashboard-nav"
import { DashboardDatePicker } from "./dashboard-date-picker"

export function Header() {
  const pathname = usePathname()
  const pageTitle = getDashboardPageTitle(pathname)

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Logo size={28} className="overflow-hidden rounded-lg md:hidden" />
          <h1 className="truncate text-base font-semibold text-slate-900 md:text-lg">{pageTitle}</h1>
        </div>

        <div className="hidden flex-1 md:block">
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <div className="hidden md:flex">
            <DashboardDatePicker />
          </div>
          <NotificationPopup />
          <UserDropdown />
        </div>
      </header>
    </TooltipProvider>
  )
}
