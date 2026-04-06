import type { ReactNode } from "react"
import type { Metadata } from "next"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { HelpDocsShell } from "@/components/help/help-docs-shell"

export const metadata: Metadata = {
  title: "Help & Docs — Mediation Pro",
  description: "Hướng dẫn Alert Center, Slack user và cấu hình alert rule",
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <HelpDocsShell>{children}</HelpDocsShell>
    </DashboardLayout>
  )
}
