"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MoreHorizontal,
  ExternalLink,
  Pause,
  Play,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Smartphone,
  ImageIcon,
  Trash2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Pagination } from "@/components/shared/pagination"
import { useToast } from "@/hooks/use-toast"
import type { App } from "@/types/api"
import { useMemo } from "react"

interface AppsTableProps {
  apps: App[]
  loading?: boolean
  searchQuery: string
  platformFilter: string
  statusFilter: string
  networkFilter: string
  selectedApps: string[]
  onSelectionChange: (apps: string[]) => void
}

type SortField = "name" | "adUnits" | "revenue" | "waterfallPct" | "ecpm" | "impressions" | "fillRate" | "lastSync"
type SortDirection = "asc" | "desc"

export function AppsTable({
  apps,
  loading = false,
  searchQuery,
  platformFilter,
  statusFilter,
  selectedApps,
  onSelectionChange,
}: AppsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [sortField, setSortField] = useState<SortField>("revenue")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAppForAction, setSelectedAppForAction] = useState<App | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Transform apps data to match table format
  const transformedApps = useMemo(() => {
    if (!apps || apps.length === 0) return []

    // Dữ liệu metrics đã được backend trả sẵn (mặc định cache 7 ngày; fallback today)
    return apps.map((app) => ({
      id: app.id.toString(),
      appId: app.appId,
      name: app.displayName || app.name,
      packageName: app.appId,
      icon: app.iconUri,
      platform: app.platform || "Unknown",
      adUnits: app.adUnitsCount || 0,
      waterfallAdUnits: app.waterfallAdUnitsCount ?? 0,
      adUnitsRevenue: app.todayAdUnitsRevenue ?? 0,
      adUnitsRevenueTrend: app.todayAdUnitsRevenueChangePct ?? 0,
      waterfallAdUnitsRevenue: app.todayWaterfallAdUnitsRevenue ?? 0,
      waterfallAdUnitsRevenueTrend: app.todayWaterfallAdUnitsRevenueChangePct ?? 0,
      revenue: app.todayRevenue || 0,
      revenueTrend: app.todayRevenueChangePct || 0,
      ecpm: app.todayEcpm ?? app.averageEcpm ?? 0,
      impressions: app.todayImpressions || 0,
      fillRate: app.todayFillRate || 0, // percent (0..100)
      status: app.approvalState === "APPROVED" ? "Active" : app.approvalState || "Active",
      lastSync: app.lastSyncedAt ? new Date(app.lastSyncedAt).toLocaleString() : "Never",
      _original: app,
    }))
  }, [apps])

  // Filter apps
  const filteredApps = transformedApps.filter((app) => {
    if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (platformFilter !== "All Platforms" && app.platform !== platformFilter) {
      return false
    }
    if (statusFilter !== "All Status" && app.status !== statusFilter) {
      return false
    }
    return true
  })

  // Helper: % WaterFall = tỷ trọng waterfall trong tổng revenue (waterfall / (adUnit + waterfall) * 100), null nếu tổng = 0
  const getWaterfallPct = (app: { adUnitsRevenue: number; waterfallAdUnitsRevenue: number }) => {
    const total = app.adUnitsRevenue + app.waterfallAdUnitsRevenue
    return total > 0 ? (app.waterfallAdUnitsRevenue / total) * 100 : null
  }

  // Sort apps (khi sort theo waterfallPct: giá trị 0/null đẩy xuống cuối)
  const sortedApps = [...filteredApps].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1
    switch (sortField) {
      case "name":
        return multiplier * a.name.localeCompare(b.name)
      case "adUnits":
        return multiplier * (a.adUnits + a.waterfallAdUnits - (b.adUnits + b.waterfallAdUnits))
      case "revenue":
        return multiplier * (a.revenue - b.revenue)
      case "waterfallPct": {
        const pa = getWaterfallPct(a)
        const pb = getWaterfallPct(b)
        const isEmpty = (p: number | null) => p == null || p === 0
        if (isEmpty(pa) && isEmpty(pb)) return 0
        if (isEmpty(pa)) return 1
        if (isEmpty(pb)) return -1
        return multiplier * (pa! - pb!)
      }
      case "ecpm":
        return multiplier * (a.ecpm - b.ecpm)
      case "impressions":
        return multiplier * (a.impressions - b.impressions)
      case "fillRate":
        return multiplier * (a.fillRate - b.fillRate)
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedApps.length / pageSize)
  const paginatedApps = sortedApps.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const toggleSelectAll = () => {
    if (selectedApps.length === paginatedApps.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(paginatedApps.map((app) => app.id))
    }
  }

  const toggleSelectApp = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedApps.includes(appId)) {
      onSelectionChange(selectedApps.filter((id) => id !== appId))
    } else {
      onSelectionChange([...selectedApps, appId])
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K"
    }
    return num.toString()
  }

  const getFillRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 80) return "text-amber-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
      case "Paused":
        return <Badge className="bg-slate-100 text-slate-600 border-0">Paused</Badge>
      case "Error":
        return <Badge className="bg-red-100 text-red-700 border-0">Error</Badge>
      default:
        return null
    }
  }



  const handlePauseResume = async () => {
    if (!selectedAppForAction) return
    setIsActionLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({
      title: selectedAppForAction.approvalState === "Active" ? "App Paused" : "App Resumed",
      description: `${selectedAppForAction.name} has been ${selectedAppForAction.approvalState === "Active" ? "paused" : "resumed"}`,
    })
    setIsActionLoading(false)
    setShowPauseModal(false)
    setSelectedAppForAction(null)
  }

  const handleDelete = async () => {
    if (!selectedAppForAction) return
    setIsActionLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({
      title: "App Deleted",
      description: `${selectedAppForAction.name} has been deleted`,
      variant: "destructive",
    })
    setIsActionLoading(false)
    setShowDeleteModal(false)
    setSelectedAppForAction(null)
  }

  // Get app for action from transformed apps
  const getAppForAction = () => {
    if (!selectedAppForAction) return null
    return transformedApps.find(a => a.id === selectedAppForAction.id.toString())
  }

  const handleRowClick = (appAdMobId: string) => {
    router.push(`/apps/${appAdMobId}`)
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  )

  // Loading state
  if (loading) {
    return (
      <Card className="border-slate-200">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
          <p className="text-sm text-slate-500">Loading apps...</p>
        </div>
      </Card>
    )
  }

  // Empty state
  if (filteredApps.length === 0) {
    return (
      <Card className="border-slate-200">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No apps found</h3>
          <p className="text-sm text-slate-500 mb-4">
            {searchQuery || platformFilter !== "All Platforms" || statusFilter !== "All Status"
              ? "Try adjusting your filters"
              : "Connect your AdMob account to get started"}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">Connect AdMob Account</Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-slate-200 overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr className="text-xs text-slate-500 font-medium">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedApps.length === paginatedApps.length && paginatedApps.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left min-w-[280px]">
                  <SortHeader field="name">App</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="adUnits">AdUnits</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="revenue">Revenue</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="waterfallPct">% WF</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="ecpm">eCPM</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="impressions">Impressions</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="fillRate">Fill Rate</SortHeader>
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Sync</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => handleRowClick(app.appId)}
                  className={cn(
                    "hover:bg-slate-50 transition-colors cursor-pointer",
                    selectedApps.includes(app.id) && "bg-blue-50 hover:bg-blue-50",
                  )}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedApps.includes(app.id)}
                      onCheckedChange={() => { }}
                      onClick={(e) => toggleSelectApp(app.id, e)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={app.icon || "/placeholder.svg"} alt={app.name} />
                        <AvatarFallback className="rounded-lg bg-slate-100">
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/apps/${app.appId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {app.name}
                        </Link>
                        <p className="text-xs text-slate-500">{app.packageName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        app.platform === "Android"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-slate-50 text-slate-700",
                      )}
                    >
                      {app.platform === "Android" ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.87 3.23c-1.31-.56-2.77-.87-4.32-.87-1.55 0-3.01.31-4.32.87L5.96 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85L6.69 9.48C3.66 11.08 1.6 14.06 1.6 17.5h20.8c0-3.44-2.06-6.42-5.09-8.02zM7.04 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z" />
                        </svg>
                      )}
                      {app.platform}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-sm">
                      <Link
                        href={`/apps/${app.appId}?tab=ad-units`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        {app.adUnits} ad
                      </Link>
                      <span className="text-slate-700">{app.waterfallAdUnits} waterfall</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex flex-col gap-0.5 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">ad unit</span>
                          <span className="font-medium text-slate-900">${app.adUnitsRevenue.toFixed(2)}</span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center text-xs",
                            app.adUnitsRevenueTrend >= 0 ? "text-green-600" : "text-red-600",
                          )}
                        >
                          {app.adUnitsRevenueTrend >= 0 ? (
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                          )}
                          {Math.abs(app.adUnitsRevenueTrend).toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">waterfall</span>
                          <span>${app.waterfallAdUnitsRevenue.toFixed(2)}</span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center text-xs",
                            app.waterfallAdUnitsRevenueTrend >= 0 ? "text-green-600" : "text-red-600",
                          )}
                        >
                          {app.waterfallAdUnitsRevenueTrend >= 0 ? (
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                          )}
                          {Math.abs(app.waterfallAdUnitsRevenueTrend).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const ratio = getWaterfallPct(app)
                      const isLow = ratio != null && ratio < 50
                      return (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isLow && "text-red-600",
                          )}
                        >
                          {ratio != null ? `${ratio.toFixed(1)}%` : "—"}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-900">${app.ecpm.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-900">{formatNumber(app.impressions)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm font-medium", getFillRateColor(app.fillRate))}>
                      {app.fillRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500">{app.lastSync}</span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/apps/${app.appId}`} className="flex items-center gap-2 cursor-pointer">
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => window.open("https://admob.google.com", "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View in AdMob
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        {app.status === "Active" ? (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => {
                              setSelectedAppForAction(app._original)
                              setShowPauseModal(true)
                            }}
                          >
                            <Pause className="w-4 h-4" />
                            Pause App
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => {
                              setSelectedAppForAction(app._original)
                              setShowPauseModal(true)
                            }}
                          >
                            <Play className="w-4 h-4" />
                            Resume App
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="gap-2 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                          onClick={() => {
                            setSelectedAppForAction(app._original)
                            setShowDeleteModal(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete App
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedApps.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
          itemName="apps"
        />
      </Card>

      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{getAppForAction()?.status === "Active" ? "Pause" : "Resume"} App?</DialogTitle>
            <DialogDescription>
              {getAppForAction()?.status === "Active"
                ? `Are you sure you want to pause "${getAppForAction()?.name}"? This will stop all ad serving for this app.`
                : `Are you sure you want to resume "${getAppForAction()?.name}"? This will enable ad serving for this app.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowPauseModal(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "flex-1",
                getAppForAction()?.status === "Active"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700",
              )}
              onClick={handlePauseResume}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : getAppForAction()?.status === "Active" ? (
                "Pause App"
              ) : (
                "Resume App"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete App?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{getAppForAction()?.name}"? This action cannot be undone and all
              associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowDeleteModal(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isActionLoading}>
              {isActionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete App"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
