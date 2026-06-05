"use client"

import type { ReactNode } from "react"
import { HelpDocsSidebar } from "@/components/help/help-docs-sidebar"

export function HelpDocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-6">
      <HelpDocsSidebar />
      <div className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-4 md:p-6 lg:p-10">{children}</div>
      </div>
    </div>
  )
}
