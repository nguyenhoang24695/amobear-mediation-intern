"use client"

import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PersonaSwitcherDropdown } from "@/components/ai-specialized/persona-switcher-dropdown"

const links = [
  { href: "/agent-admin/categories", label: "Category profiles" },
  { href: "/apps", label: "Apps → open app → Playbook" },
  { href: "/ai-hub/data-analyst", label: "Data Analyst workspace" },
  { href: "/ai-hub/bod", label: "BOD portfolio workspace" },
]

export default function AiHubPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Hub</h1>
          <p className="text-muted-foreground text-sm">Specialized agents landing — daily brief & persona switcher land in Sprint 13.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Daily brief</CardTitle>
            <CardDescription>Portfolio summary, top P0 actions, and active handoffs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">Portfolio: 24 apps healthy · 5 apps warning · 2 apps critical</p>
            <p className="text-sm">Top P0: 3 crash spikes, 2 fill-rate drops, 1 ROAS collapse</p>
            <p className="text-sm">Active handoffs: PO→DA (4), UA→DA (2), QA→DevOps (1)</p>
            {links.map((l) => (
              <Button key={l.href} variant="outline" asChild>
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
            <PersonaSwitcherDropdown />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
