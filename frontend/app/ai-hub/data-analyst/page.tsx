import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DataAnalystPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Data Analyst</h1>
          <p className="text-muted-foreground text-sm">
            Chat workspace flow: decomposition → validated SQL → result table → mermaid → finding with confidence.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Decomposition</CardTitle></CardHeader>
            <CardContent className="text-sm">Intent, dimensions, and metrics are extracted before SQL drafting.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">SQL Block (validated)</CardTitle></CardHeader>
            <CardContent className="font-mono text-xs">SELECT date, SUM(total_revenue) AS revenue ... LIMIT 100</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Result table</CardTitle></CardHeader>
            <CardContent className="text-sm">2 rows preview (mock): 2026-04-01 / 1234.56, 2026-04-02 / 1350.42</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Mermaid + finding</CardTitle></CardHeader>
            <CardContent className="text-sm">Revenue trend up, confidence 0.82.</CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
