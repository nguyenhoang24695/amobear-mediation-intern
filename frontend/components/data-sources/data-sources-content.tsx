"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, RefreshCw, CheckCircle2, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { useApi } from "@/hooks/use-api"
import { dataSourcesApi } from "@/lib/api/services"
import { SourcesOverviewGrid } from "./sources-overview-grid"
import { SyncJobsTimeline } from "./sync-jobs-timeline"
import { DataQualityMonitor } from "./data-quality-monitor"
import { ArchitectureDiagram } from "./architecture-diagram"
import { SourceDetailsTab } from "./source-details-tab"
import { DataSourceRunsTab } from "./data-source-runs-tab"

const SCREEN_DATA_SOURCES = "s-data-sources"

export function DataSourcesContent() {
  const [mainTab, setMainTab] = useState("overview")
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
        { label: "Total Sources", value: "—", icon: Database, color: "text-primary" },
        { label: "Jobs enabled", value: "—", icon: RefreshCw, color: "text-emerald-600 dark:text-emerald-300" },
        { label: "Quality OK", value: "—", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-300" },
        { label: "Warnings + critical", value: "—", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-300" },
        { label: "Timeline jobs", value: "—", icon: Clock, color: "text-muted-foreground" },
      ]
    }
    const jobs = overview.sources.flatMap((s) => s.domains.flatMap((d) => d.jobs))
    const enabled = jobs.filter((j) => j.enabled).length
    const q = overview.quality
    const ok = q.filter((r) => r.status === "healthy").length
    const bad = q.filter((r) => r.status === "warning" || r.status === "critical").length
    return [
      { label: "Total Sources", value: String(overview.sources.length), icon: Database, color: "text-primary" },
      { label: "Jobs enabled", value: String(enabled), icon: RefreshCw, color: "text-emerald-600 dark:text-emerald-300" },
      { label: "Quality OK", value: String(ok), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-300" },
      { label: "Warnings + critical", value: String(bad), icon: AlertTriangle, color: "text-amber-600 dark:text-amber-300" },
      { label: "Timeline jobs", value: timeline ? String(timeline.jobs.length) : "—", icon: Clock, color: "text-muted-foreground" },
    ]
  }, [overview, timeline])

  if (!canView) {
    return <NoPermissionView />
  }

  const loading = loadingOverview || loadingTimeline
  const err = errOverview || errTimeline

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nexus observability: registry, Hangfire schedules, ingestion checkpoints, and catalogued tables
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-border bg-muted/40 text-muted-foreground">
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
        <p className="text-sm text-destructive">
          {err.message || "Failed to load data sources. Ensure you are logged in and migration applied."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`shrink-0 p-2 rounded-lg bg-muted/40 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-foreground font-mono">{stat.value}</p>
                  <p className="break-words text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="mb-4 inline-flex h-auto min-w-max justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview" className="space-y-6 mt-0">
          {overview && <SourcesOverviewGrid sources={overview.sources} />}
          {timeline && timeline.jobs.length > 0 && <SyncJobsTimeline timeline={timeline} />}
          {overview && <DataQualityMonitor rows={overview.quality} />}

          <ArchitectureDiagram />

          <Card className="border-fuchsia-500/25 bg-fuchsia-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-fuchsia-800 dark:text-fuchsia-200">Qonversion (IAP / subscription)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-fuchsia-800/90 dark:text-fuchsia-100/90">
                Nguồn IAP độc lập với AdMob IAA: webhook, GCS, web crawler và API reconciliation → StarRocks Bronze/Silver/Gold;{" "}
                <span className="font-mono text-xs">app_id</span> thống nhất AdMob. Trên tab{" "}
                <span className="font-medium">Details</span> chọn nguồn Qonversion để xem health theo ngày và backfill.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/25 bg-amber-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Revenue double-counting prevention
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-amber-800/90 dark:text-amber-100/90">
                AppMetrica and Adjust can both carry revenue-like signals. AdMob remains the operational source of truth for ad
                revenue; Adjust is used for MMP / campaign dimensions and IAP reference. Align consumption with{" "}
                <span className="font-medium">docs/100 — Data Storage Architecture</span>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details" className="mt-0">
          <SourceDetailsTab sources={overview?.sources ?? []} enabled={mainTab === "details" && Boolean(overview)} />
        </TabsContent>
        <TabsContent value="runs" className="mt-0">
          <DataSourceRunsTab sources={overview?.sources ?? []} enabled={mainTab === "runs" && Boolean(overview)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
