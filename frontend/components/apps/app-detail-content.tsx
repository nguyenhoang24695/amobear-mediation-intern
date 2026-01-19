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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  RefreshCw,
  MoreHorizontal,
  Apple,
  Pause,
  Trash2,
  Settings,
  Check,
  Loader2,
} from "lucide-react"
import { AppOverviewTab } from "./app-detail/app-overview-tab"
import { AppAdUnitsTab } from "./app-detail/app-ad-units-tab"
import { AppMediationGroupsTab } from "./app-detail/app-mediation-groups-tab"
import { useToast } from "@/hooks/use-toast"

// Mock app data
const appData = {
  id: "1",
  name: "Weather Plus Pro",
  packageName: "com.weatherplus.pro",
  platform: "iOS",
  status: "Active",
  admobAppId: "ca-app-pub-1234567890123456~1234567890",
  icon: "/weather-app-icon-blue-gradient.jpg",
  adUnitsCount: 12,
  mediationGroupsCount: 8,
}

export function AppDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const initialTab = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [copied, setCopied] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/apps/${appData.id}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    toast({
      title: "Syncing...",
      description: "Syncing app data with AdMob",
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    toast({
      title: "Sync Complete",
      description: "App data has been synced successfully",
    })
    setIsSyncing(false)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href="/apps"
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apps
        </Link>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: App Info */}
          <div className="flex items-start gap-4">
            <img
              src={appData.icon || "/placeholder.svg"}
              alt={appData.name}
              className="w-16 h-16 rounded-xl border border-slate-200 shadow-sm object-cover"
            />
            <div className="flex flex-col gap-2">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{appData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {appData.packageName}
                  </code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => copyToClipboard(appData.packageName)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? "Copied!" : "Copy package name"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-200">
                  <Apple className="w-3 h-3" />
                  {appData.platform}
                </Badge>
                <Badge className="bg-green-100 text-green-700 border-0">{appData.status}</Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">
                  {appData.admobAppId}
                </Badge>
              </div>
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
              onClick={() => window.open("https://apps.apple.com", "_blank")}
            >
              <Apple className="w-4 h-4" />
              View in App Store
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 w-9 p-0 bg-transparent">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" />
                  App Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => copyToClipboard(appData.admobAppId)}>
                  <Copy className="w-4 h-4" />
                  Copy App ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-amber-600">
                  <Pause className="w-4 h-4" />
                  Pause App
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Delete App
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-11 p-1 bg-slate-100 w-fit">
            <TabsTrigger value="overview" className="px-4 data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="ad-units" className="px-4 data-[state=active]:bg-white">
              Ad Units
              <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-xs">
                {appData.adUnitsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="mediation-groups" className="px-4 data-[state=active]:bg-white">
              Mediation Groups
              <Badge variant="secondary" className="ml-2 bg-slate-200 text-slate-600 text-xs">
                {appData.mediationGroupsCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="performance" className="px-4 data-[state=active]:bg-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="settings" className="px-4 data-[state=active]:bg-white">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <AppOverviewTab onNavigateToTab={handleTabChange} />
          </TabsContent>
          <TabsContent value="ad-units" className="mt-6">
            <AppAdUnitsTab />
          </TabsContent>
          <TabsContent value="mediation-groups" className="mt-6">
            <AppMediationGroupsTab />
          </TabsContent>
          <TabsContent value="performance" className="mt-6">
            <div className="flex items-center justify-center h-64 text-slate-500">
              Performance tab content coming soon...
            </div>
          </TabsContent>
          <TabsContent value="settings" className="mt-6">
            <div className="flex items-center justify-center h-64 text-slate-500">
              Settings tab content coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
