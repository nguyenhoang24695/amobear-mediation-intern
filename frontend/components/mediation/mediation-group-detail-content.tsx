"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
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
  RefreshCw,
  MoreHorizontal,
  Pause,
  Copy,
  Trash2,
  Gift,
  Star,
  FlaskConical,
  Download,
  Loader2,
} from "lucide-react"
import { MediationGroupOverviewTab } from "./mediation-group-detail/overview-tab"
import { WaterfallOptimizationTab } from "./mediation-group-detail/waterfall-optimization-tab"
import { ABTestsTab } from "./mediation-group-detail/ab-tests-tab"
import { CreateABTestModal } from "./modals/create-ab-test-modal"
import { ApplyVariantModal } from "./modals/apply-variant-modal"
import { useToast } from "@/hooks/use-toast"

// Mock group data
const groupData = {
  id: "1",
  name: "Weather Plus - Rewarded Video - US Tier 1",
  appName: "Weather Plus Pro",
  appId: "app_123",
  format: "Rewarded",
  status: "Active",
  admobGroupId: "ca-app-pub-1234567890123456/9876543210",
  hasRunningTest: true,
  testDay: 5,
  testDuration: 14,
}

export function MediationGroupDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const initialTab = searchParams.get("tab") || "waterfall-optimization"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [createTestModalOpen, setCreateTestModalOpen] = useState(false)
  const [applyVariantModalOpen, setApplyVariantModalOpen] = useState(false)
  const [applyMode, setApplyMode] = useState<"direct" | "test-winner">("direct")
  const [isSyncing, setIsSyncing] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/mediation/${groupData.id}?${params.toString()}`, { scroll: false })
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

  const handleApplyDirect = () => {
    setApplyMode("direct")
    setApplyVariantModalOpen(true)
  }

  const handleApplyWinner = () => {
    setApplyMode("test-winner")
    setApplyVariantModalOpen(true)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    toast({
      title: "Syncing...",
      description: "Syncing mediation group with AdMob",
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    toast({
      title: "Sync Complete",
      description: "Mediation group has been synced successfully",
    })
    setIsSyncing(false)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href="/mediation"
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Mediation Groups
        </Link>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Group Info */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-slate-900">{groupData.name}</h1>
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/apps/${groupData.appId}`}>
                <Badge
                  variant="outline"
                  className="gap-1 bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {groupData.appName}
                </Badge>
              </Link>
              <Badge className="gap-1 bg-green-100 text-green-700 border-0">
                <Gift className="w-3 h-3" />
                {groupData.format}
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-0">{groupData.status}</Badge>
              {groupData.hasRunningTest && (
                <Link href={`/mediation/tests/1`}>
                  <Badge className="gap-1.5 bg-purple-100 text-purple-700 border-0 cursor-pointer hover:bg-purple-200 transition-colors">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={() => window.open("https://admob.google.com", "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              View in AdMob
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Now
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2 bg-transparent text-sm text-amber-600 border-amber-200 hover:bg-amber-50"
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
          <TabsList className="h-11 p-1 bg-slate-100 w-fit">
            <TabsTrigger value="overview" className="px-4 data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="waterfall-optimization"
              className="px-4 data-[state=active]:bg-white gap-1.5 data-[state=active]:text-blue-600"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Waterfall & Optimization
            </TabsTrigger>
            <TabsTrigger value="ab-tests" className="px-4 data-[state=active]:bg-white gap-1.5">
              A/B Tests
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-slate-200 text-slate-600">
                3
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="performance" className="px-4 data-[state=active]:bg-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="change-history" className="px-4 data-[state=active]:bg-white">
              Change History
            </TabsTrigger>
          </TabsList>

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
            />
          </TabsContent>
          <TabsContent value="ab-tests" className="mt-6">
            <ABTestsTab onCreateTest={handleRunABTest} hasRunningTest={groupData.hasRunningTest} />
          </TabsContent>
          <TabsContent value="performance" className="mt-6">
            <div className="flex items-center justify-center h-64 text-slate-500">
              Performance tab content coming soon...
            </div>
          </TabsContent>
          <TabsContent value="change-history" className="mt-6">
            <div className="flex items-center justify-center h-64 text-slate-500">
              Change History tab content coming soon...
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <CreateABTestModal open={createTestModalOpen} onOpenChange={setCreateTestModalOpen} />
        <ApplyVariantModal open={applyVariantModalOpen} onOpenChange={setApplyVariantModalOpen} mode={applyMode} />
      </div>
    </TooltipProvider>
  )
}
