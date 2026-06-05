"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UnifiedReport } from "@/components/ai-specialized/UnifiedReport"

type PersonaWorkspaceProps = {
  title: string
  subtitle: string
  appId?: string
}

export function PersonaWorkspace({ title, subtitle, appId }: PersonaWorkspaceProps) {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Current scope</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            App: <span className="font-mono">{appId ?? "portfolio"}</span>
          </CardContent>
        </Card>
        <UnifiedReport
          title={`${title} report`}
          healthScore={74.2}
          healthTier="fair"
          radar={[
            { label: "Growth", value: 70 },
            { label: "Quality", value: 76 },
            { label: "Monetization", value: 72 },
            { label: "Stability", value: 79 },
            { label: "Retention", value: 68 },
          ]}
          dimensions={[
            { key: "growth", label: "Growth", score: 70, note: "Stable trend." },
            { key: "quality", label: "Quality", score: 76, note: "Healthy baseline." },
            { key: "mon", label: "Monetization", score: 72, note: "Needs optimization." },
          ]}
          actions={[
            { id: "1", title: "Investigate top funnel drop", owner: "PO", due: "T+1" },
            { id: "2", title: "Validate SQL evidence", owner: "DA", due: "T+1" },
          ]}
          sources={[
            { name: "gold.fact_daily_app_metrics", layer: "gold" },
            { name: "silver.daily_sow_analysis", layer: "silver" },
          ]}
          ketLuan="The workspace is wired with shared components and ready for persona-specific deep logic."
        />
      </div>
    </DashboardLayout>
  )
}
