"use client"

import type { ReactNode } from "react"
import { HelpDocsSidebar } from "@/components/help/help-docs-sidebar"

export function HelpDocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <HelpDocsSidebar />
      <div className="flex-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-10">{children}</div>
      </div>
    </div>
  )
}
