"use client"

import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function AgentAdminPlaybooksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Playbook Admin</h1>
        <p className="text-muted-foreground text-sm">Open an app and manage its playbook versioning.</p>
        <Link className="text-primary underline" href="/apps">Go to apps list</Link>
      </div>
    </DashboardLayout>
  )
}
