"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2, RefreshCw, CheckCheck, History, CheckCircle2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { waterfallOptimizerApi } from "@/lib/api/services"
import type { WaterfallRecommendationRecordDto } from "@/types/api"

interface RecommendationWorkflowPanelProps {
  mediationGroupId: string
  title?: string
  compact?: boolean
  onAnalyzed?: () => void | Promise<void>
  onApplied?: () => void | Promise<void>
}

const formatDateTime = (value?: string) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
  } catch {
    return value
  }
}

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

export function RecommendationWorkflowPanel({
  mediationGroupId,
  title = "Recommendation Workflow",
  compact = false,
  onAnalyzed,
  onApplied,
}: RecommendationWorkflowPanelProps) {
  const { toast } = useToast()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const recommendationsCacheKey = `waterfall_optimizer_recommendations_${mediationGroupId}`
  const historyCacheKey = `waterfall_optimizer_history_${mediationGroupId}`

  const { data: recommendations = [], loading, refetch } = useApi(
    () => waterfallOptimizerApi.getRecommendations({ mediationGroupId }),
    { enabled: !!mediationGroupId, cacheKey: recommendationsCacheKey },
  )
  const recommendationList = recommendations ?? []

  const { data: applyHistory = [], refetch: refetchHistory } = useApi(
    () => waterfallOptimizerApi.getApplyHistory(mediationGroupId),
    { enabled: !!mediationGroupId, cacheKey: historyCacheKey },
  )
  const applyHistoryList = applyHistory ?? []

  const pending = useMemo(() => recommendationList.filter((item) => item.status === "pending"), [recommendationList])
  const approved = useMemo(() => recommendationList.filter((item) => item.status === "approved"), [recommendationList])
  const highPendingIds = useMemo(
    () => pending.filter((item) => item.priority === "High").map((item) => item.id),
    [pending],
  )
  const lastAnalysisAt = useMemo(() => {
    const sorted = [...recommendationList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return sorted[0]?.createdAt
  }, [recommendationList])

  const handleAnalyze = async () => {
    setBusyAction("analyze")
    try {
      await waterfallOptimizerApi.analyze({ mediationGroupId, dateRangeDays: 7 })
      await refetch()
      await onAnalyzed?.()
      toast({
        title: "Analyze completed",
        description: "A new recommendation snapshot has been created for this mediation group.",
      })
    } catch (error) {
      toast({
        title: "Analyze failed",
        description: error instanceof Error ? error.message : "Unable to run analysis.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleApprove = async (id: number) => {
    setBusyAction(`approve_${id}`)
    try {
      await waterfallOptimizerApi.approveRecommendation(id)
      await refetch()
    } catch (error) {
      toast({
        title: "Approve failed",
        description: error instanceof Error ? error.message : "Unable to approve the recommendation.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleReject = async (id: number) => {
    setBusyAction(`reject_${id}`)
    try {
      await waterfallOptimizerApi.rejectRecommendation(id)
      await refetch()
    } catch (error) {
      toast({
        title: "Reject failed",
        description: error instanceof Error ? error.message : "Unable to reject the recommendation.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleApproveHigh = async () => {
    if (highPendingIds.length === 0) return
    setBusyAction("approve_high")
    try {
      await waterfallOptimizerApi.bulkApprove(highPendingIds)
      await refetch()
      toast({
        title: "Approved",
        description: `Approved ${highPendingIds.length} high-priority recommendations.`,
      })
    } catch (error) {
      toast({
        title: "Bulk approve failed",
        description: error instanceof Error ? error.message : "Unable to approve recommendations in bulk.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleApplyApproved = async () => {
    if (approved.length === 0) return
    setBusyAction("apply")
    try {
      const response = await waterfallOptimizerApi.applyApproved(approved.map((item) => item.id))
      await refetch()
      await refetchHistory()
      await onApplied?.()
      toast({
        title: response.success ? "Apply completed" : "Apply failed",
        description: response.message ?? response.errorMessage ?? "Apply workflow finished.",
        variant: response.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Apply failed",
        description: error instanceof Error ? error.message : "Unable to apply approved recommendations.",
        variant: "destructive",
      })
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className={compact ? "pb-3" : undefined}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Real recommendation lifecycle: analyze, approve/reject, apply, and audit history.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent" onClick={() => void handleAnalyze()}>
                {busyAction === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-transparent"
                disabled={highPendingIds.length === 0}
                onClick={() => void handleApproveHigh()}
              >
                {busyAction === "approve_high" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Approve All High
              </Button>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" disabled={approved.length === 0} onClick={() => void handleApplyApproved()}>
                {busyAction === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Apply Approved
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 bg-transparent" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" />
                History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : undefined}>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">Pending: {pending.length}</Badge>
            <Badge variant="outline">Approved: {approved.length}</Badge>
            <Badge variant="outline">Applied: {recommendationList.filter((item) => item.status === "applied").length}</Badge>
            <Badge variant="outline">Last analysis: {formatDateTime(lastAnalysisAt)}</Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : recommendationList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No recommendation snapshots exist for this mediation group yet. Run `Analyze` to create the approval/apply workflow.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendationList.map((item: WaterfallRecommendationRecordDto) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
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
                        <span>Current floor: ${item.currentFloor.toFixed(2)}</span>
                        <span>Recommended: {item.recommendedFloor != null ? `$${item.recommendedFloor.toFixed(2)}` : "—"}</span>
                        <span>SoW: {item.currentSow.toFixed(2)}%</span>
                        <span>MR: {item.currentMatchRate != null ? `${item.currentMatchRate.toFixed(2)}%` : "—"}</span>
                        <span>Expires: {formatDateTime(item.expiresAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={item.status === "approved" || item.status === "applied" || item.status === "expired"}
                        onClick={() => void handleApprove(item.id)}
                      >
                        {busyAction === `approve_${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={item.status === "rejected" || item.status === "applied"}
                        onClick={() => void handleReject(item.id)}
                      >
                        {busyAction === `reject_${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Apply History</SheetTitle>
            <SheetDescription>Audit trail for recommendation apply operations on this mediation group.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 overflow-y-auto px-4 pb-4">
            {applyHistoryList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No apply history yet.
              </div>
            ) : (
              applyHistoryList.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">{item.action ?? "Apply recommendation"}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={statusClass[item.status] ?? "bg-slate-100 text-slate-700"}>
                      {item.status}
                    </Badge>
                  </div>
                  {item.errorMessage && <p className="mt-2 text-sm text-red-600">{item.errorMessage}</p>}
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Correlation ID: {item.correlationId ?? "—"}</p>
                    <p>Recommendation ID: {item.recommendationId ?? "—"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
