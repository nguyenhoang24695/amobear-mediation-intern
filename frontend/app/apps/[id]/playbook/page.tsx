"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

/**
 * Legacy route kept for backward-compat.
 * Canonical surface: App Detail tabs (`/apps/:appId?tab=playbook`) to preserve app header + menu.
 */
export default function AppPlaybookAdminPage() {
  const params = useParams()
  const appId = String((params as any)?.id ?? "")
  const router = useRouter()

  useEffect(() => {
    if (!appId) return
    router.replace(`/apps/${appId}?tab=playbook`)
  }, [appId, router])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Redirecting…</h1>
          <p className="text-muted-foreground text-sm">Opening AI Playbook inside App Detail tabs.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

