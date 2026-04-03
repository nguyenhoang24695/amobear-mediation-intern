"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, CheckCircle2, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { useApi } from "@/hooks/use-api"
import { dataSourcesApi } from "@/lib/api/services"
import { SourcesOverviewGrid } from "./sources-overview-grid"
import { SyncJobsTimeline } from "./sync-jobs-timeline"
import { DataQualityMonitor } from "./data-quality-monitor"
import { ArchitectureDiagram } from "./architecture-diagram"

const SCREEN_DATA_SOURCES = "s-data-sources"

export function DataSourcesContent() {
  const canView = hasScreenFunction(SCREEN_DATA_SOURCES, "view")
  const { data: overview, loading: loadingOverview, error: errOverview } = useApi(
    () => dataSourcesApi.getOverview(),
    { enabled: canView, cacheKey: "data-sources-overview" }
  )
  const { data: timeline, loading: loadingTimeline, error: errTimeline } = useApi(
    () => dataSourcesApi.getTimeline(),
    { enabled: canView, cacheKey: "data-sources-timeline" }
  )

  const stats = useMemo(() => {
    if (!overview) {
      return [
        { label: "Total Sources", value: "—", icon: Database, color: "text-blue-600" },
        { label: "Jobs enabled", value: "—", icon: RefreshCw, color: "text-green-600" },
        { label: "Quality OK", value: "—", icon: CheckCircle2, color: "text-emerald-600" },
        { label: "Warnings + critical", value: "—", icon: AlertTriangle, color: "text-amber-600" },
        { label: "Timeline jobs", value: "—", icon: Clock, color: "text-slate-600" },
      ]
    }
    const jobs = overview.sources.flatMap((s) => s.domains.flatMap((d) => d.jobs))
    const enabled = jobs.filter((j) => j.enabled).length
    const q = overview.quality
    const ok = q.filter((r) => r.status === "healthy").length
    const bad = q.filter((r) => r.status === "warning" || r.status === "critical").length
    return [
      { label: "Total Sources", value: String(overview.sources.length), icon: Database, color: "text-blue-600" },
      { label: "Jobs enabled", value: String(enabled), icon: RefreshCw, color: "text-green-600" },
      { label: "Quality OK", value: String(ok), icon: CheckCircle2, color: "text-emerald-600" },
      { label: "Warnings + critical", value: String(bad), icon: AlertTriangle, color: "text-amber-600" },
      { label: "Timeline jobs", value: timeline ? String(timeline.jobs.length) : "—", icon: Clock, color: "text-slate-600" },
    ]
  }, [overview, timeline])

  if (!canView) {
    return <NoPermissionView />
  }

  const loading = loadingOverview || loadingTimeline
  const err = errOverview || errTimeline

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Sources</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nexus observability: registry, Hangfire schedules, ingestion checkpoints, and catalogued tables
          </p>
        </div>
        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading
            </span>
          ) : err ? (
            "Check API / permissions"
          ) : (
            "Live from API"
          )}
        </Badge>
      </div>

      {err && (
        <p className="text-sm text-red-600">
          {err.message || "Failed to load data sources. Ensure you are logged in and migration applied."}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 font-mono">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overview && <SourcesOverviewGrid sources={overview.sources} />}
      {timeline && timeline.jobs.length > 0 && <SyncJobsTimeline timeline={timeline} />}
      {overview && <DataQualityMonitor rows={overview.quality} />}

      <ArchitectureDiagram />

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Revenue double-counting prevention
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-amber-700">
            AppMetrica and Adjust can both carry revenue-like signals. AdMob remains the operational source of truth for ad
            revenue; Adjust is used for MMP / campaign dimensions and IAP reference. Align consumption with{" "}
            <span className="font-medium">docs/100 — Data Storage Architecture</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
