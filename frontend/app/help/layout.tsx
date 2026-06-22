import type { ReactNode } from "react"
import type { Metadata } from "next"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { HelpDocsShell } from "@/components/help/help-docs-shell"

export const metadata: Metadata = {
  title: "Help & Docs — Nexus",
  description: "Hướng dẫn Alert Center, webhook tích hợp và tài liệu vận hành Nexus",
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <HelpDocsShell>{children}</HelpDocsShell>
    </DashboardLayout>
  )
}
