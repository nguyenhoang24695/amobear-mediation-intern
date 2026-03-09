"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, CheckCheck, CheckCircle2, Filter } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { waterfallOptimizerApi } from "@/lib/api/services"
import { RecommendationWorkflowPanel } from "./recommendation-workflow-panel"

const SCREEN_MEDIATION_GROUPS = "s-mediation-groups"
const FN_VIEW = "view"

const priorityClass: Record<string, string> = {
  High: "bg-red-100 text-red-700 border-red-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
}

const statusClass: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  applied: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expired: "bg-orange-100 text-orange-700 border-orange-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
}

const formatDateTime = (value?: string) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return value
  }
}

export function WaterfallOptimizerContent() {
  const canView = hasScreenFunction(SCREEN_MEDIATION_GROUPS, FN_VIEW)
  const { toast } = useToast()

  const [selectedAppId, setSelectedAppId] = useState("all")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedMediationGroupId, setSelectedMediationGroupId] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("pending")
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const { data: filters } = useApi(() => waterfallOptimizerApi.getFilters(), {
    enabled: canView,
    cacheKey: "waterfall_optimizer_filters",
  })

  const recommendationParams = useMemo(
    () => ({
      appId: selectedAppId !== "all" ? selectedAppId : undefined,
      platform: selectedPlatform !== "all" ? selectedPlatform : undefined,
      mediationGroupId: selectedMediationGroupId !== "all" ? selectedMediationGroupId : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
    }),
    [selectedAppId, selectedPlatform, selectedMediationGroupId, selectedStatus],
  )

  const { data: recommendations = [], loading, refetch } = useApi(
    () => waterfallOptimizerApi.getRecommendations(recommendationParams),
    {
      enabled: canView,
      cacheKey: `waterfall_optimizer_page_${selectedAppId}_${selectedPlatform}_${selectedMediationGroupId}_${selectedStatus}`,
    },
  )
  const recommendationList = recommendations ?? []

  const grouped = useMemo(() => {
    return {
      high: recommendationList.filter((item) => item.priority === "High"),
      medium: recommendationList.filter((item) => item.priority === "Medium"),
      low: recommendationList.filter((item) => item.priority === "Low"),
    }
  }, [recommendationList])

  const approvedGroups = useMemo(() => new Set(recommendationList.filter((item) => item.status === "approved").map((item) => item.mediationGroupId)), [recommendationList])

  const handleAnalyze = async () => {
    if (selectedAppId === "all" && selectedMediationGroupId === "all") {
      toast({
        title: "Thiếu phạm vi analyze",
        description: "Chọn ít nhất một app hoặc mediation group trước khi chạy analyze.",
        variant: "destructive",
      })
      return
    }

    setBusyAction("analyze")
    try {
      await waterfallOptimizerApi.analyze({
        appId: selectedAppId !== "all" ? selectedAppId : undefined,
        mediationGroupId: selectedMediationGroupId !== "all" ? selectedMediationGroupId : undefined,
        dateRangeDays: 7,
      })
      await refetch()
      toast({
        title: "Analyze completed",
        description: "Đã refresh recommendation snapshot theo filter hiện tại.",
      })
    } catch (error) {
      toast({
        title: "Analyze failed",
        description: error instanceof Error ? error.message : "Không thể chạy analyze.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleApproveAllHigh = async () => {
    const ids = grouped.high.filter((item) => item.status === "pending").map((item) => item.id)
    if (ids.length === 0) return

    setBusyAction("approve")
    try {
      await waterfallOptimizerApi.bulkApprove(ids)
      await refetch()
      toast({
        title: "Approved",
        description: `Đã approve ${ids.length} recommendation ưu tiên cao.`,
      })
    } catch (error) {
      toast({
        title: "Bulk approve failed",
        description: error instanceof Error ? error.message : "Không thể approve hàng loạt.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleApplyApproved = async () => {
    const approved = recommendationList.filter((item) => item.status === "approved")
    if (approved.length === 0) return
    if (approvedGroups.size > 1) {
      toast({
        title: "Apply bị giới hạn",
        description: "Hiện chỉ apply approved recommendations của cùng một mediation group trong mỗi lần chạy.",
        variant: "destructive",
      })
      return
    }

    setBusyAction("apply")
    try {
      const response = await waterfallOptimizerApi.applyApproved(approved.map((item) => item.id))
      await refetch()
      toast({
        title: response.success ? "Apply completed" : "Apply failed",
        description: response.message ?? response.errorMessage ?? "Apply workflow finished.",
        variant: response.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Apply failed",
        description: error instanceof Error ? error.message : "Không thể apply approved recommendations.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Waterfall Optimizer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze recommendation snapshots, bulk approve theo priority và apply có audit trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void handleAnalyze()}>
            {busyAction === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Analysis
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void handleApproveAllHigh()} disabled={grouped.high.filter((item) => item.status === "pending").length === 0}>
            {busyAction === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Approve All High
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => void handleApplyApproved()} disabled={recommendationList.filter((item) => item.status === "approved").length === 0}>
            {busyAction === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Apply Approved
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-slate-500" />
            Filter Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select value={selectedAppId} onValueChange={setSelectedAppId}>
            <SelectTrigger>
              <SelectValue placeholder="App" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {(filters?.apps ?? []).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger>
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {(filters?.platforms ?? []).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMediationGroupId} onValueChange={setSelectedMediationGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Mediation Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mediation Groups</SelectItem>
              {(filters?.mediationGroups ?? []).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(filters?.statuses ?? []).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Recommendations</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{recommendationList.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">High Priority</p>
            <p className="mt-2 text-3xl font-semibold text-red-600">{grouped.high.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{recommendationList.filter((item) => item.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Applied</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{recommendationList.filter((item) => item.status === "applied").length}</p>
          </CardContent>
        </Card>
      </div>

      {selectedMediationGroupId !== "all" && (
        <RecommendationWorkflowPanel mediationGroupId={selectedMediationGroupId} onApplied={async () => { await refetch() }} />
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : recommendationList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
              Không có recommendation nào theo filter hiện tại.
            </div>
          ) : (
            <div className="space-y-6">
              {[
                { key: "high", label: "High Priority", items: grouped.high },
                { key: "medium", label: "Medium Priority", items: grouped.medium },
                { key: "low", label: "Low Priority", items: grouped.low },
              ].map((group) =>
                group.items.length === 0 ? null : (
                  <div key={group.key} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{item.instanceName}</span>
                              <Badge variant="outline" className={priorityClass[item.priority] ?? "bg-slate-100 text-slate-700"}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline" className={statusClass[item.status] ?? "bg-slate-100 text-slate-700"}>
                                {item.status}
                              </Badge>
                              <Badge variant="outline">{item.action}</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{item.reason}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>MG: {item.mediationGroupName ?? item.mediationGroupId}</span>
                              <span>Current floor: ${item.currentFloor.toFixed(2)}</span>
                              <span>Recommended: {item.recommendedFloor != null ? `$${item.recommendedFloor.toFixed(2)}` : "—"}</span>
                              <span>Created: {formatDateTime(item.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Link href={`/mediation/${encodeURIComponent(item.mediationGroupId)}?tab=waterfall-optimization`} className="text-sm text-blue-600 hover:underline">
                              Open MG
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
