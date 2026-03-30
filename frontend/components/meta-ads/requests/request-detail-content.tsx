"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { metaRequestsApi } from "@/lib/api/meta-ads"
import { formatMetaRequestId, formatUserGuidShort, groupValidationErrors } from "@/lib/meta-ads/mappers"
import type { MetaCampaignRequestDetailDto, MetaCreatedObjectDto, MetaRequestStatus } from "@/types/meta-ads"
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const SCREEN_META_REQUESTS = "s-meta-requests"

const statusConfig: Record<MetaRequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  executing: { label: "Executing", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
}

type ConfirmAction = "approve" | "reject" | "execute" | "retry"
type LogStatus = "success" | "error" | "pending"

const logStatusIcon: Record<LogStatus, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-slate-400" />,
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function getConfirmDescription(action: ConfirmAction): string {
  switch (action) {
    case "approve":
      return "Approve this request so it can be executed later."
    case "reject":
      return "Reject this request. The requester can revise and submit again."
    case "execute":
      return "This will create Meta objects through the backend. All objects will start in PAUSED state."
    case "retry":
      return "Retry execution of this failed request and reuse any objects already created."
  }
}

function getGenderLabel(detail: MetaCampaignRequestDetailDto): string {
  const genders = detail.payload.adSet.genders
  if (!genders?.length) return "ALL"
  return genders.join(", ").toUpperCase()
}

function getPlacementLabel(detail: MetaCampaignRequestDetailDto): string {
  const adSet = detail.payload.adSet
  if (adSet.publisherPlatforms.length || adSet.facebookPositions.length || adSet.instagramPositions.length) return "MANUAL"
  return "AUTOMATIC"
}

function getBudgetSummary(detail: MetaCampaignRequestDetailDto): string {
  const campaign = detail.payload.campaign
  const adSet = detail.payload.adSet
  if (campaign.dailyBudget) return `${campaign.dailyBudget}/day (campaign)`
  if (campaign.lifetimeBudget) return `${campaign.lifetimeBudget} lifetime (campaign)`
  if (adSet.dailyBudget) return `${adSet.dailyBudget}/day (ad set)`
  if (adSet.lifetimeBudget) return `${adSet.lifetimeBudget} lifetime (ad set)`
  return "—"
}

function sortCreatedObjects(objects: MetaCreatedObjectDto[]) {
  const order = { campaign: 1, adset: 2, creative: 3, ad: 4 }
  return [...objects].sort((left, right) => (order[left.entityType as keyof typeof order] ?? 99) - (order[right.entityType as keyof typeof order] ?? 99))
}

interface Props {
  requestId: string
}

export function RequestDetailContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const canApprove = hasScreenFunction(SCREEN_META_REQUESTS, "approve")
  const canExecute = hasScreenFunction(SCREEN_META_REQUESTS, "execute")
  const canRetry = hasScreenFunction(SCREEN_META_REQUESTS, "retry")

  if (requestId === "create") {
    router.replace("/meta-ads/requests/create")
    return null
  }

  const numericRequestId = Number(requestId)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: detail, loading, error, refetch } = useApi(
    () => metaRequestsApi.getById(numericRequestId),
    {
      enabled: Number.isFinite(numericRequestId),
      cacheKey: `meta-request:${numericRequestId}`,
    }
  )

  const groupedValidationErrors = useMemo(() => {
    if (!detail?.validationErrorsJson) return {}
    try {
      const parsed = JSON.parse(detail.validationErrorsJson) as string[]
      return groupValidationErrors(Array.isArray(parsed) ? parsed : [])
    } catch {
      return {}
    }
  }, [detail?.validationErrorsJson])

  const handleAction = async (action: ConfirmAction) => {
    if (!detail) return

    try {
      setActionLoading(true)
      if (action === "approve") {
        await metaRequestsApi.approve(detail.id, { comment: "Approved from request detail." })
      } else if (action === "reject") {
        await metaRequestsApi.reject(detail.id, { reason: "Rejected from request detail." })
      } else if (action === "execute") {
        await metaRequestsApi.execute(detail.id, {})
      } else {
        await metaRequestsApi.retry(detail.id, {})
      }

      invalidateCache(`meta-request:${detail.id}`)
      invalidateCache("meta-reference:create-campaign")
      await refetch()
      toast({
        title:
          action === "approve"
            ? "Request approved"
            : action === "reject"
              ? "Request rejected"
              : action === "execute"
                ? "Execution started"
                : "Retry started",
      })
      setConfirmAction(null)
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Request action failed."
      toast({ title: "Action failed", description: message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading request detail...
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="py-24 text-center text-sm text-red-600">
        {error?.message ?? "Meta campaign request not found."}
      </div>
    )
  }

  const createdObjects = sortCreatedObjects(detail.createdObjects)
  const hasValidationErrors = Object.keys(groupedValidationErrors).length > 0

  return (
    <div className="space-y-5">
      <div>
        <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          <Link href="/meta-ads/requests" className="hover:text-slate-700">
            Meta Ads
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/meta-ads/requests" className="hover:text-slate-700">
            Requests
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 font-medium">{formatMetaRequestId(detail.id)}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/meta-ads/requests")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-bold text-slate-900">{formatMetaRequestId(detail.id)}</h1>
              <Badge className={`text-xs ${statusConfig[detail.status].className}`}>{statusConfig[detail.status].label}</Badge>
            </div>
            <p className="text-sm text-slate-600 pl-11">{detail.campaignName}</p>
            <div className="flex items-center gap-4 pl-11 text-xs text-slate-500 flex-wrap">
              <span>
                App: <strong className="text-slate-700">{detail.appDisplayName ?? detail.appId ?? "—"}</strong>
              </span>
              <span>
                Account: <strong className="text-slate-700 font-mono">{detail.metaAdAccountName ?? detail.metaAdAccountId}</strong>
              </span>
              <span>
                By: <strong className="text-slate-700">{formatUserGuidShort(detail.requestedBy)}</strong>
              </span>
              <span>
                Created: <strong className="text-slate-700">{formatDateTime(detail.createdAt)}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {detail.status === "pending_approval" && canApprove ? (
              <>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmAction("reject")}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setConfirmAction("approve")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            ) : null}
            {detail.status === "approved" && canExecute ? (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setConfirmAction("execute")}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Execute Request
              </Button>
            ) : null}
            {detail.status === "failed" && canRetry ? (
              <Button variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => setConfirmAction("retry")}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {detail.status === "failed" ? (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Request execution failed</p>
            <p className="text-xs text-red-600 mt-0.5">{detail.failureSummary ?? "Execution failed. Check operation logs for more details."}</p>
          </div>
        </div>
      ) : null}

      {detail.status === "completed" ? (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">
            All Meta objects created successfully. They start in <strong>PAUSED</strong> state on Meta.
          </p>
        </div>
      ) : null}

      {hasValidationErrors ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-800">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(groupedValidationErrors).map(([group, messages]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-red-900 uppercase tracking-wide mb-1">{group}</p>
                <ul className="space-y-1 pl-4">
                  {messages.map((message, index) => (
                    <li key={`${group}-${index}`} className="list-disc text-xs text-red-700">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Request Payload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <DetailRow label="Objective" value={detail.payload.campaign.objective} mono />
                <DetailRow label="Buying Type" value={detail.payload.campaign.buyingType ?? "—"} mono />
                <DetailRow label="Countries" value={detail.payload.adSet.countries.join(", ") || "—"} />
                <DetailRow
                  label="Age Range"
                  value={`${detail.payload.adSet.ageMin ?? "—"}–${detail.payload.adSet.ageMax ?? "—"}`}
                />
                <DetailRow label="Gender" value={getGenderLabel(detail)} />
                <DetailRow label="Placement" value={getPlacementLabel(detail)} />
                <DetailRow label="Optimization Goal" value={detail.payload.adSet.optimizationGoal} mono />
                <DetailRow label="Budget" value={getBudgetSummary(detail)} />
                <DetailRow label="Creative Name" value={detail.payload.creative.name} />
                <DetailRow label="Facebook Page ID" value={detail.payload.creative.pageId ?? "—"} mono />
                <DetailRow label="Headline" value={detail.payload.creative.headline ?? "—"} />
                <DetailRow label="CTA" value={detail.payload.creative.callToActionType ?? "—"} mono />
                <DetailRow label="Ad Name" value={detail.payload.ad.name} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">Operation Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.operationLogs.length === 0 ? (
                <p className="text-sm text-slate-400">No operation logs yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {detail.operationLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 relative">
                        <div className="relative z-10 flex-shrink-0 bg-white">
                          {logStatusIcon[(log.status === "succeeded" ? "success" : log.status === "failed" ? "error" : "pending") as LogStatus]}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold text-slate-900">{log.step}</p>
                            <span className="text-xs text-slate-400">{formatDateTime(log.startedAt)}</span>
                          </div>
                          <p className="text-xs text-slate-500">Attempt #{log.attemptNumber}</p>
                          {log.errorMessage ? <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p> : null}
                          {log.correlationId ? <p className="text-[11px] text-slate-400 mt-1 font-mono">Correlation: {log.correlationId}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TimelineEntry label="Created" value={formatDateTime(detail.createdAt)} done />
              <TimelineEntry label="Submitted" value={formatDateTime(detail.submittedAt)} done={!!detail.submittedAt} />
              <TimelineEntry label="Approved" value={formatDateTime(detail.approvedAt)} done={!!detail.approvedAt} />
              <TimelineEntry label="Rejected" value={formatDateTime(detail.rejectedAt)} done={!!detail.rejectedAt} />
              <TimelineEntry label="Executed" value={formatDateTime(detail.executedAt)} done={!!detail.executedAt} />
              <TimelineEntry label="Failed" value={formatDateTime(detail.failedAt)} done={!!detail.failedAt} />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Created Meta Objects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {createdObjects.length === 0 ? (
                <p className="text-[11px] text-slate-400">No Meta objects created yet.</p>
              ) : (
                createdObjects.map((object) => (
                  <ObjectRow key={`${object.entityType}-${object.localId}`} label={object.entityType} metaId={object.externalId} localId={object.localId.toString()} />
                ))
              )}
              {createdObjects.length > 0 ? (
                <p className="text-[11px] text-slate-400 pt-1">All created objects are expected to be in <strong>PAUSED</strong> state on Meta.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {confirmAction ? (
        <AlertDialog open onOpenChange={() => !actionLoading && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="capitalize">{confirmAction} request?</AlertDialogTitle>
              <AlertDialogDescription>{getConfirmDescription(confirmAction)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={actionLoading}
                onClick={(event) => {
                  event.preventDefault()
                  void handleAction(confirmAction)
                }}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="col-span-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-slate-900 font-medium mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  )
}

function TimelineEntry({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Clock className="w-3.5 h-3.5 text-slate-300" />}
        <span className={done ? "text-slate-700" : "text-slate-400"}>{label}</span>
      </div>
      <span className={done ? "text-slate-500" : "text-slate-300"}>{value}</span>
    </div>
  )
}

function ObjectRow({ label, metaId, localId }: { label: string; metaId: string; localId: string }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 capitalize">{label}</p>
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </div>
      <p className="text-[11px] font-mono text-blue-700 mt-0.5">Meta ID: {metaId}</p>
      <p className="text-[11px] font-mono text-slate-400">Local ID: {localId}</p>
    </div>
  )
}
