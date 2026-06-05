"use client"

import type React from "react"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { DashboardDateProvider } from "@/contexts/dashboard-date-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <DashboardDateProvider>
      <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <div
          className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-60"}`}
        >
          <Header />
          <main className="min-w-0 p-4 md:p-6">{children}</main>
        </div>

        <MobileBottomNav />
      </div>
    </DashboardDateProvider>
  )
}
