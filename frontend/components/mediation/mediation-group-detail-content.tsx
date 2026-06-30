"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Copy,
  Trash2,
  Gift,
  Star,
  FlaskConical,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { MediationGroupOverviewTab } from "./mediation-group-detail/overview-tab"
import { WaterfallOptimizationTab } from "./mediation-group-detail/waterfall-optimization-tab"
import { ABTestsTab } from "./mediation-group-detail/ab-tests-tab"
import { CreateABTestModal } from "./modals/create-ab-test-modal"
import { ApplyVariantModal, type ApplyDirectChanges } from "./modals/apply-variant-modal"
import { SyncNowModal } from "./modals/sync-now-modal"
import { useApi } from "@/hooks/use-api"
import { structureApi } from "@/lib/api/services"

// Helper to format ad format
const formatAdFormat = (format?: string): string => {
  if (!format) return "Unknown"
  return format
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function MediationGroupDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const mediationGroupIdFromParams = (params as any)?.id as string | undefined
  const hasValidId = !!mediationGroupIdFromParams

  // Fetch mediation group by AdMob mediation_group_id (cache key đồng nhất: mediation_group_detail_{mediationGroupId})
  const { data: groupDetail, loading, refetch: refetchGroupDetail } = useApi(
    () => structureApi.getMediationGroupByAdMobId(mediationGroupIdFromParams!),
    {
      enabled: hasValidId,
      cacheKey: hasValidId ? `mediation_group_detail_${mediationGroupIdFromParams}` : undefined,
    },
  )

  const initialTab = searchParams.get("tab") || "waterfall-optimization"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [createTestModalOpen, setCreateTestModalOpen] = useState(false)
  const [applyVariantModalOpen, setApplyVariantModalOpen] = useState(false)
  const [applyMode, setApplyMode] = useState<"direct" | "test-winner">("direct")
  const [applyDirectChanges, setApplyDirectChanges] = useState<ApplyDirectChanges | undefined>(undefined)
  const [applyMediationGroupId, setApplyMediationGroupId] = useState<string | undefined>(undefined)
  const [syncNowModalOpen, setSyncNowModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Extract data from API response (cache key: dashboard:mediationgroup:{mediationGroupId}:detail:today)
  const groupData = useMemo(() => {
    if (!groupDetail) return null
    const d = groupDetail as unknown as Record<string, unknown>
    const mediationGroupId = (d.mediationGroupId ?? d.MediationGroupId ?? mediationGroupIdFromParams) as string
    return {
      id: d.id as number,
      mediationGroupId,
      name: (d.displayName ?? d.DisplayName ?? d.name ?? d.Name) as string || "Unknown Mediation Group",
      appName: (d.appName ?? d.AppName) as string || "Unknown App",
      appId: (d.appId ?? d.AppId) as number | undefined,
      appAdMobId: (d.appAdMobId ?? d.AppAdMobId) as string | undefined,
      appIconUri: (d.appIconUri ?? d.AppIconUri) as string | undefined,
      format: formatAdFormat((d.adFormat ?? d.AdFormat) as string | undefined),
      status: (d.state ?? d.State) as string || "Unknown",
      admobGroupId: mediationGroupId,
      hasRunningTest: false, // TODO: Fetch from A/B tests API
      testDay: 0,
      testDuration: 0,
    }
  }, [groupDetail, mediationGroupIdFromParams])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const qs = new URLSearchParams(searchParams.toString())
    qs.set("tab", tab)
    const idForUrl = groupData?.mediationGroupId ?? mediationGroupIdFromParams ?? ""
    router.push(`/mediation/${idForUrl}?${qs.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleRunABTest = () => {
    setCreateTestModalOpen(true)
  }

  const handleApplyDirect = (changes: ApplyDirectChanges, mediationGroupId: string) => {
    setApplyMode("direct")
    setApplyDirectChanges(changes)
    setApplyMediationGroupId(mediationGroupId)
    setApplyVariantModalOpen(true)
  }

  const handleApplyWinner = () => {
    setApplyMode("test-winner")
    setApplyVariantModalOpen(true)
  }

  const handleSync = () => {
    setSyncNowModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!groupData || !groupDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Mediation group not found</p>
        <Link
          href="/mediation"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to Mediation Groups
        </Link>
      </div>
    )
  }

  // Build AdMob URL
  const admobUrl = groupData.admobGroupId
    ? `https://admob.google.com/mediation/groups/${groupData.admobGroupId}`
    : "https://admob.google.com"

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href="/mediation"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Mediation Groups
        </Link>

        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Group Info */}
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="break-words text-xl font-bold text-foreground">{groupData.name}</h1>
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {groupData.appId && (
                <Link href={groupData.appAdMobId ? `/apps/${groupData.appAdMobId}` : "#"}>
                  <Badge
                    variant="outline"
                    className="flex cursor-pointer items-center gap-1 border-border bg-muted/40 hover:bg-muted"
                  >
                    {groupData.appIconUri && (
                      <img
                        src={groupData.appIconUri}
                        alt=""
                        className="w-3 h-3 rounded"
                      />
                    )}
                    {groupData.appName}
                  </Badge>
                </Link>
              )}
              <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Gift className="w-3 h-3" />
                {groupData.format}
              </Badge>
              <Badge className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{groupData.status}</Badge>
              {groupData.hasRunningTest && (
                <Link href={`/mediation/tests/1`}>
                  <Badge className="cursor-pointer gap-1.5 border-0 bg-primary/10 text-primary transition-colors hover:bg-primary/15">
                    <FlaskConical className="w-3 h-3" />
                    A/B Test Running
                    <span className="text-purple-500">•</span>
                    Day {groupData.testDay}/{groupData.testDuration}
                  </Badge>
                </Link>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={() => window.open(admobUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              View in AdMob
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={handleSync}
            >
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </Button>

            <Button
              variant="outline"
              className="h-9 gap-2 border-amber-500/30 bg-transparent text-sm text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
            >
              <Pause className="w-4 h-4" />
              Pause Group
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-9 p-0 bg-transparent">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2">
                  <Copy className="w-4 h-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Navigation - Updated with URL support */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="h-11 w-max min-w-full gap-1 bg-muted p-1">
              <TabsTrigger value="overview" className="shrink-0 px-4 data-[state=active]:bg-background">
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="waterfall-optimization"
                className="shrink-0 gap-1.5 px-4 data-[state=active]:bg-background data-[state=active]:text-primary"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Waterfall & Optimization
              </TabsTrigger>
              <TabsTrigger value="ab-tests" className="shrink-0 gap-1.5 px-4 data-[state=active]:bg-background">
                A/B Tests
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  3
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="performance" className="shrink-0 px-4 data-[state=active]:bg-background">
                Performance
              </TabsTrigger>
              <TabsTrigger value="change-history" className="shrink-0 px-4 data-[state=active]:bg-background">
                Change History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <MediationGroupOverviewTab />
          </TabsContent>
          <TabsContent value="waterfall-optimization" className="mt-6">
            <WaterfallOptimizationTab
              onRunABTest={handleRunABTest}
              onApplyDirect={handleApplyDirect}
              hasRunningTest={groupData.hasRunningTest}
              testDay={groupData.testDay}
              testDuration={groupData.testDuration}
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="ab-tests" className="mt-6">
            <ABTestsTab onCreateTest={handleRunABTest} hasRunningTest={groupData.hasRunningTest} />
          </TabsContent>
          <TabsContent value="performance" className="mt-6">
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Performance tab content coming soon...
            </div>
          </TabsContent>
          <TabsContent value="change-history" className="mt-6">
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Change History tab content coming soon...
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <CreateABTestModal open={createTestModalOpen} onOpenChange={setCreateTestModalOpen} />
        <ApplyVariantModal
          open={applyVariantModalOpen}
          onOpenChange={setApplyVariantModalOpen}
          mode={applyMode}
          mediationGroupId={applyMode === "direct" ? applyMediationGroupId : undefined}
          changes={applyMode === "direct" ? applyDirectChanges : undefined}
          onSuccess={() => {
            setApplyVariantModalOpen(false)
            void refetchGroupDetail()
            setRefreshKey((k) => k + 1)
          }}
        />
        <SyncNowModal
          open={syncNowModalOpen}
          onOpenChange={setSyncNowModalOpen}
          mediationGroupId={groupData?.mediationGroupId ?? mediationGroupIdFromParams ?? ""}
          onSuccess={() => {
            setSyncNowModalOpen(false)
            void refetchGroupDetail()
            setRefreshKey((k) => k + 1)
          }}
        />
      </div>
    </TooltipProvider>
  )
}
