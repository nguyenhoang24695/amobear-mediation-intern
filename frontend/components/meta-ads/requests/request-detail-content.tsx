"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { getMediaPreviewSource } from "@/lib/meta-ads/media-preview"
import { copyTextToClipboard } from "@/lib/utils"
import type {
  MetaCampaignRequestDetailDto,
  MetaCreatedObjectDto,
  MetaCreativeDraftDto,
  MetaCreativeMediaSourceDto,
  MetaCreativeType,
  MetaOperationLogDto,
  MetaRequestStatus,
} from "@/types/meta-ads"
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
  ImageIcon,
  Smartphone,
  Video,
  GalleryHorizontal,
  FileText,
  Pencil,
  ChevronDown,
  Copy,
  Bug,
  Braces,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProtectedMediaImage } from "../shared/protected-media-image"
const SCREEN_META_REQUESTS = "s-meta-requests"

type ConfirmAction = "approve" | "reject" | "execute" | "retry"
type LogStatus = "success" | "error" | "pending"
type ChecklistItem = { label: string; ok: boolean }

const statusConfig: Record<MetaRequestStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  executing: { label: "Executing", className: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
}

const logStatusIcon: Record<LogStatus, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-slate-400" />,
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
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
  return "-"
}

function formatCallToAction(value?: string | null): string {
  if (!value) return "-"
  return value.replaceAll("_", " ")
}

function getCreativeType(detail: MetaCampaignRequestDetailDto): MetaCreativeType {
  return detail.payload.creative.type ?? "SINGLE_IMAGE"
}

function getCreativeCommon(creative: MetaCreativeDraftDto) {
  return {
    name: creative.common?.name ?? creative.name ?? "",
    pageId: creative.common?.pageId ?? creative.pageId ?? "",
    instagramActorId: creative.common?.instagramActorId ?? creative.instagramActorId ?? "",
  }
}

function getSingleImageCreative(creative: MetaCreativeDraftDto) {
  return creative.singleImage ?? {
    message: creative.message,
    headline: creative.headline,
    description: creative.description,
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    image: {
      mode: creative.imageHash ? "meta_ref" : creative.imageUrl ? "external_url" : "meta_ref",
      imageHash: creative.imageHash,
      imageUrl: creative.imageUrl,
    },
  }
}

function getSingleVideoCreative(creative: MetaCreativeDraftDto) {
  return creative.singleVideo ?? {
    message: creative.message,
    headline: creative.headline,
    description: creative.description,
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    video: null,
    thumbnail: null,
  }
}

function getCarouselCreative(creative: MetaCreativeDraftDto) {
  return creative.carousel ?? {
    message: creative.message,
    callToActionType: creative.callToActionType,
    cards: [],
  }
}

function getExistingPostCreative(creative: MetaCreativeDraftDto) {
  return creative.existingPost ?? { sourcePostId: null }
}


function getMediaSourceValue(source?: MetaCreativeMediaSourceDto | null, kind: "image" | "video" = "image"): string {
  if (!source) return "-"
  if (source.uploadedAssetId) return `Uploaded Asset #${source.uploadedAssetId}`
  if (kind === "video" && source.videoId) return `Meta Video ID: ${source.videoId}`
  if (source.imageHash) return `Meta Image Hash: ${source.imageHash}`
  if (source.imageUrl) return source.imageUrl
  return "-"
}

function getCreativeSummaryHeadline(detail: MetaCampaignRequestDetailDto): string {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).headline ?? "-"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).cards[0]?.headline ?? "-"
    case "EXISTING_POST":
      return getExistingPostCreative(creative).sourcePostId ?? "-"
    default:
      return getSingleImageCreative(creative).headline ?? "-"
  }
}

function getCreativeSummaryCallToAction(detail: MetaCampaignRequestDetailDto): string {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).callToActionType ?? "-"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).callToActionType ?? "-"
    case "EXISTING_POST":
      return "EXISTING_POST"
    default:
      return getSingleImageCreative(creative).callToActionType ?? "-"
  }
}

function getCreativeChecklist(detail: MetaCampaignRequestDetailDto): ChecklistItem[] {
  const creative = detail.payload.creative
  const common = getCreativeCommon(creative)

  if (getCreativeType(detail) === "SINGLE_VIDEO") {
    const video = getSingleVideoCreative(creative)
    return [
      { label: "Creative name", ok: !!common.name },
      { label: "Facebook Page ID", ok: !!common.pageId },
      { label: "Message", ok: !!video.message },
      { label: "Headline", ok: !!video.headline },
      { label: "CTA", ok: !!video.callToActionType },
      { label: "Video source", ok: !!(video.video?.uploadedAssetId || video.video?.videoId) },
    ]
  }

  if (getCreativeType(detail) === "CAROUSEL_IMAGE") {
    const carousel = getCarouselCreative(creative)
    return [
      { label: "Creative name", ok: !!common.name },
      { label: "Facebook Page ID", ok: !!common.pageId },
      { label: "CTA", ok: !!carousel.callToActionType },
      { label: "At least 2 cards", ok: (carousel.cards?.length ?? 0) >= 2 },
      {
        label: "Cards complete",
        ok: (carousel.cards ?? []).length > 0 && (carousel.cards ?? []).every((card) => !!card.headline && !!(card.image?.uploadedAssetId || card.image?.imageHash || card.image?.imageUrl)),
      },
    ]
  }

  if (getCreativeType(detail) === "EXISTING_POST") {
    const existingPost = getExistingPostCreative(creative)
    return [
      { label: "Creative name", ok: !!common.name },
      { label: "Facebook Page ID", ok: !!common.pageId },
      { label: "Source Post ID", ok: !!existingPost.sourcePostId },
    ]
  }

  const image = getSingleImageCreative(creative)
  return [
    { label: "Creative name", ok: !!common.name },
    { label: "Facebook Page ID", ok: !!common.pageId },
    { label: "Message", ok: !!image.message },
    { label: "Headline", ok: !!image.headline },
    { label: "CTA", ok: !!image.callToActionType },
    { label: "Image source", ok: !!(image.image?.uploadedAssetId || image.image?.imageHash || image.image?.imageUrl) },
  ]
}

function isCreativeComplete(detail: MetaCampaignRequestDetailDto): boolean {
  return getCreativeChecklist(detail).every((item) => item.ok)
}

function getCreativePreviewImage(detail: MetaCampaignRequestDetailDto): { url: string; requiresAuth: boolean } {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return getMediaPreviewSource(getSingleVideoCreative(creative).thumbnail)
    case "CAROUSEL_IMAGE":
      return getMediaPreviewSource(getCarouselCreative(creative).cards[0]?.image)
    case "EXISTING_POST":
      return { url: "", requiresAuth: false }
    default:
      return getMediaPreviewSource(getSingleImageCreative(creative).image)
  }
}

function getCreativePreviewHeadline(detail: MetaCampaignRequestDetailDto): string {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).headline ?? "Video creative"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).cards[0]?.headline ?? "Carousel creative"
    case "EXISTING_POST":
      return getExistingPostCreative(creative).sourcePostId ? `Existing Post ${getExistingPostCreative(creative).sourcePostId}` : "Existing post preview"
    default:
      return getSingleImageCreative(creative).headline ?? "Creative headline"
  }
}
function getCreativePreviewMessage(detail: MetaCampaignRequestDetailDto): string {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).message ?? "Video preview will use the selected source at execute time."
    case "CAROUSEL_IMAGE": {
      const carousel = getCarouselCreative(creative)
      return carousel.message ?? `${carousel.cards?.length ?? 0} carousel cards`
    }
    case "EXISTING_POST":
      return "Existing post preview will be resolved from Meta post."
    default:
      return getSingleImageCreative(creative).message ?? "Creative preview will update as you fill the form."
  }
}

function getCreativePreviewCallToAction(detail: MetaCampaignRequestDetailDto): string {
  const creative = detail.payload.creative
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return formatCallToAction(getSingleVideoCreative(creative).callToActionType)
    case "CAROUSEL_IMAGE":
      return formatCallToAction(getCarouselCreative(creative).callToActionType)
    case "EXISTING_POST":
      return "VIEW POST"
    default:
      return formatCallToAction(getSingleImageCreative(creative).callToActionType)
  }
}

function getCreativePreviewIcon(detail: MetaCampaignRequestDetailDto) {
  switch (getCreativeType(detail)) {
    case "SINGLE_VIDEO":
      return <Video className="w-6 h-6 text-slate-300" />
    case "CAROUSEL_IMAGE":
      return <GalleryHorizontal className="w-6 h-6 text-slate-300" />
    case "EXISTING_POST":
      return <FileText className="w-6 h-6 text-slate-300" />
    default:
      return <ImageIcon className="w-6 h-6 text-slate-300" />
  }
}

function sortCreatedObjects(objects: MetaCreatedObjectDto[]) {
  const order = { campaign: 1, adset: 2, creative: 3, ad: 4 }
  return [...objects].sort((left, right) => (order[left.entityType as keyof typeof order] ?? 99) - (order[right.entityType as keyof typeof order] ?? 99))
}

function getLogStatus(log: MetaOperationLogDto): LogStatus {
  if (log.status === "succeeded") return "success"
  if (log.status === "failed") return "error"
  return "pending"
}

function formatOperationAction(log: MetaOperationLogDto): string {
  const raw = (log.action ?? log.step ?? "operation").trim()
  if (!raw) return "Operation"
  return raw
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatStepLabel(step?: string | null): string {
  if (!step?.trim()) return "-"
  return step.replaceAll("_", " ").toUpperCase()
}

function formatLogStatusLabel(status?: string | null): string {
  switch (status) {
    case "succeeded":
      return "Succeeded"
    case "failed":
      return "Failed"
    default:
      return "Started"
  }
}

function getLogStatusClasses(status?: string | null): string {
  if (status === "succeeded") return "bg-green-100 text-green-700"
  if (status === "failed") return "bg-red-100 text-red-700"
  return "bg-slate-100 text-slate-600"
}


function tryFormatJson(value?: string | null): string {
  if (!value?.trim()) return ""
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value.trim()
  }
}

function buildOperationErrorSummary(log: MetaOperationLogDto): string {
  const parts = [
    log.summaryMessage?.trim(),
    log.errorMessage?.trim(),
    log.metaErrorType ? `${log.metaErrorType}${log.metaErrorCode ? ` (${log.metaErrorCode})` : ""}` : null,
    log.metaTraceId ? `Trace: ${log.metaTraceId}` : null,
  ].filter((part): part is string => !!part)

  return parts.length > 0 ? parts.join("\n") : "No error summary available."
}

function getLatestFailedLog(logs: MetaOperationLogDto[]): MetaOperationLogDto | null {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (logs[index]?.status === "failed") return logs[index]
  }
  return null
}

function hasLogDebugPayload(log: MetaOperationLogDto): boolean {
  return !!(log.requestJson?.trim() || log.responseJson?.trim() || log.errorMessage?.trim())
}

interface Props {
  requestId: string
}

export function RequestDetailContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const canCreate = hasScreenFunction(SCREEN_META_REQUESTS, "create")
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
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({})

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

  const latestFailedLog = useMemo(() => getLatestFailedLog(detail?.operationLogs ?? []), [detail?.operationLogs])

  useEffect(() => {
    if (!detail?.operationLogs) return
    const nextState: Record<number, boolean> = {}
    for (const log of detail.operationLogs) {
      if (log.status === "failed") {
        nextState[log.id] = true
      }
    }
    setExpandedLogs(nextState)
  }, [detail?.operationLogs])

  const handleCopy = async (label: string, value?: string | null) => {
    if (!value?.trim()) {
      toast({ title: `${label} is empty`, variant: "destructive" })
      return
    }

    const copied = await copyTextToClipboard(value)
    toast({
      title: copied ? `${label} copied` : `Unable to copy ${label.toLowerCase()}`,
      variant: copied ? "default" : "destructive",
    })
  }

  const jumpToOperationLog = (logId: number) => {
    setExpandedLogs((current) => ({ ...current, [logId]: true }))
    if (typeof document === "undefined") return
    document.getElementById(`meta-operation-log-${logId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

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
      const errorResponse = apiError instanceof Error ? (apiError as Error & { response?: { data?: { message?: string; detail?: MetaCampaignRequestDetailDto } } }).response : undefined
      const failedDetail = errorResponse?.data?.detail
      const message = failedDetail?.failureSummary ?? errorResponse?.data?.message ?? (apiError instanceof Error ? apiError.message : "Request action failed.")

      if (action === "execute" || action === "retry") {
        invalidateCache(`meta-request:${detail.id}`)
        invalidateCache("meta-reference:create-campaign")
        await refetch()
      }

      setConfirmAction(null)
      toast({
        title: action === "execute" || action === "retry" ? "Execution failed" : "Action failed",
        description: message,
        variant: "destructive",
      })
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

  const creativeType = getCreativeType(detail)
  const creativeCommon = getCreativeCommon(detail.payload.creative)
  const creativeChecklist = getCreativeChecklist(detail)
  const creativeComplete = isCreativeComplete(detail)
  const previewImage = getCreativePreviewImage(detail)
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
                App: <strong className="text-slate-700">{detail.appDisplayName ?? detail.appId ?? "-"}</strong>
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
            {canCreate && detail.status !== "executing" ? (
              <Button variant="outline" onClick={() => router.push(`/meta-ads/requests/${detail.id}/edit`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Request
              </Button>
            ) : null}
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

      {detail.status !== "draft" && detail.status !== "executing" ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Editing this request will return it to <strong>Pending Approval</strong> after changes are saved.
          </p>
        </div>
      ) : null}

      {detail.status === "failed" ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Request execution failed</p>
              <p className="text-xs text-red-600 mt-0.5">{detail.failureSummary ?? "Execution failed. Check operation logs for more details."}</p>
            </div>
          </div>

          {latestFailedLog ? (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Latest Meta Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-red-100 text-red-700">{formatOperationAction(latestFailedLog)}</Badge>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                    {formatStepLabel(latestFailedLog.step)}
                  </Badge>
                  {latestFailedLog.httpStatusCode ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                      HTTP {latestFailedLog.httpStatusCode}
                    </Badge>
                  ) : null}
                  {latestFailedLog.metaErrorCode ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                      Meta {latestFailedLog.metaErrorCode}{latestFailedLog.metaErrorSubcode ? `/${latestFailedLog.metaErrorSubcode}` : ""}
                    </Badge>
                  ) : null}
                </div>
                {latestFailedLog.resourcePath ? <ValueBlock label="Resource Path" value={latestFailedLog.resourcePath} mono breakAll /> : null}
                <ValueBlock label="Summary" value={latestFailedLog.summaryMessage ?? latestFailedLog.errorMessage ?? detail.failureSummary ?? "-"} preserveWhitespace />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => jumpToOperationLog(latestFailedLog.id)}>
                    Jump to Failed Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
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
                <DetailRow label="Buying Type" value={detail.payload.campaign.buyingType ?? "-"} mono />
                <DetailRow label="Countries" value={detail.payload.adSet.countries.join(", ") || "-"} />
                <DetailRow label="Age Range" value={`${detail.payload.adSet.ageMin ?? "-"}-${detail.payload.adSet.ageMax ?? "-"}`} />
                <DetailRow label="Gender" value={getGenderLabel(detail)} />
                <DetailRow label="Placement" value={getPlacementLabel(detail)} />
                <DetailRow label="Optimization Goal" value={detail.payload.adSet.optimizationGoal} mono />
                <DetailRow label="Budget" value={getBudgetSummary(detail)} />
                <DetailRow label="Creative Type" value={creativeType.replaceAll("_", " ")} mono />
                <DetailRow label="Creative Name" value={creativeCommon.name || "-"} />
                <DetailRow label="Facebook Page ID" value={creativeCommon.pageId || "-"} mono />
                <DetailRow label="Headline / Reference" value={getCreativeSummaryHeadline(detail)} />
                <DetailRow label="CTA / Mode" value={getCreativeSummaryCallToAction(detail)} mono />
                <DetailRow label="Ad Name" value={detail.payload.ad.name} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  Creative
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 font-mono px-2 py-0.5">
                    {creativeType}
                  </Badge>
                  <Badge className={creativeComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                    {creativeComplete ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">Snapshot of the request creative payload that will be transformed into the matching Meta creative shape during execution.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <DetailRow label="Creative Type" value={creativeType.replaceAll("_", " ")} mono />
                    <DetailRow label="Creative Name" value={creativeCommon.name || "-"} />
                    <DetailRow label="Facebook Page ID" value={creativeCommon.pageId || "-"} mono />
                    <DetailRow label="Instagram Actor ID" value={creativeCommon.instagramActorId || "-"} mono />
                  </div>

                  <CreativeTypeSnapshot detail={detail} />

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Required Creative Fields</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {creativeChecklist.map((item) => (
                        <div key={item.label} className={`flex items-center gap-1.5 ${item.ok ? "text-green-700" : "text-amber-700"}`}>
                          {item.ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Creative Preview</p>
                  <div className="w-44 overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </div>
                    <div className="space-y-1.5 p-2">
                      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-100">
                        {previewImage.url ? (
                          <ProtectedMediaImage
                            src={previewImage.url}
                            requiresAuth={previewImage.requiresAuth}
                            alt="Creative preview"
                            className="h-full w-full object-cover"
                            fallback={getCreativePreviewIcon(detail)}
                          />
                        ) : (
                          getCreativePreviewIcon(detail)
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-900">{getCreativePreviewHeadline(detail)}</p>
                        <p className="line-clamp-2 text-[9px] leading-tight text-slate-500">{getCreativePreviewMessage(detail)}</p>
                      </div>
                      <div className="pt-0.5">
                        <div className="rounded bg-blue-600 py-1 text-center">
                          <span className="text-[9px] font-semibold text-white">{getCreativePreviewCallToAction(detail)}</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-400">Sponsored</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                    <Smartphone className="w-3 h-3" />
                    <span>Preview only</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-slate-900">Operation Logs</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-300">
                  {detail.operationLogs.length} step{detail.operationLogs.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {detail.operationLogs.length === 0 ? (
                <p className="text-sm text-slate-400">No operation logs yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {detail.operationLogs.map((log) => {
                      const status = getLogStatus(log)
                      const expanded = !!expandedLogs[log.id]
                      const formattedRequest = tryFormatJson(log.requestJson)
                      const formattedResponse = tryFormatJson(log.responseJson)
                      const formattedErrorSummary = buildOperationErrorSummary(log)

                      return (
                        <div key={log.id} id={`meta-operation-log-${log.id}`} className="relative flex items-start gap-3">
                          <div className="relative z-10 flex-shrink-0 bg-white">
                            {logStatusIcon[status]}
                          </div>
                          <div className="min-w-0 flex-1 pb-1">
                            <Collapsible open={expanded} onOpenChange={(open) => setExpandedLogs((current) => ({ ...current, [log.id]: open }))}>
                              <div className={`rounded-lg border px-4 py-3 ${log.status === "failed" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"}`}>
                                <CollapsibleTrigger className="w-full text-left">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900">{formatOperationAction(log)}</p>
                                        <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                                          {formatStepLabel(log.step)}
                                        </Badge>
                                        <Badge className={`text-[10px] ${getLogStatusClasses(log.status)}`}>{formatLogStatusLabel(log.status)}</Badge>
                                        {log.httpStatusCode ? (
                                          <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                                            HTTP {log.httpStatusCode}
                                          </Badge>
                                        ) : null}
                                        {log.metaErrorCode ? (
                                          <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                                            Meta {log.metaErrorCode}{log.metaErrorSubcode ? `/${log.metaErrorSubcode}` : ""}
                                          </Badge>
                                        ) : null}
                                      </div>
                                      <p className="text-xs text-slate-500">{log.summaryMessage ?? log.errorMessage ?? "No summary available."}</p>
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                        <span>{formatDateTime(log.startedAt)}</span>
                                        <span>Attempt #{log.attemptNumber}</span>
                                        {log.resourcePath ? <span className="font-mono text-slate-500">{log.resourcePath}</span> : null}
                                        {log.correlationId ? <span className="font-mono">Correlation: {log.correlationId}</span> : null}
                                      </div>
                                    </div>
                                    <ChevronDown className={`mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="pt-4">
                                  <div className="grid gap-3 lg:grid-cols-3">
                                    <OperationLogPanel
                                      title="Request to Meta"
                                      icon={<Braces className="h-3.5 w-3.5" />}
                                      value={formattedRequest}
                                      emptyLabel="No request payload captured."
                                      onCopy={() => void handleCopy("Request payload", formattedRequest)}
                                    />
                                    <OperationLogPanel
                                      title="Response from Meta"
                                      icon={<Braces className="h-3.5 w-3.5" />}
                                      value={formattedResponse}
                                      emptyLabel={log.status === "failed" && log.errorMessage ? "Legacy log: raw Meta response was not captured for this failure." : "No response payload captured."}
                                      onCopy={() => void handleCopy("Response payload", formattedResponse)}
                                    />
                                    <OperationLogPanel
                                      title="Error Summary"
                                      icon={<Bug className="h-3.5 w-3.5" />}
                                      value={formattedErrorSummary}
                                      emptyLabel="No error summary available."
                                      onCopy={() => void handleCopy("Error summary", formattedErrorSummary)}
                                      footer={
                                        <div className="space-y-1 text-[11px] text-slate-500">
                                          {log.metaErrorType ? <p>Type: <span className="font-mono text-slate-700">{log.metaErrorType}</span></p> : null}
                                          {log.metaTraceId ? <p>Trace: <span className="font-mono text-slate-700">{log.metaTraceId}</span></p> : null}
                                          {log.resourcePath ? <p>Endpoint: <span className="font-mono text-slate-700 break-all">{log.resourcePath}</span></p> : null}
                                        </div>
                                      }
                                    />
                                  </div>
                                  {!hasLogDebugPayload(log) ? (
                                    <p className="mt-3 text-[11px] text-slate-400">This operation log predates the extended debug payload and only contains minimal legacy data.</p>
                                  ) : null}
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          </div>
                        </div>
                      )
                    })}
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

function CreativeTypeSnapshot({ detail }: { detail: MetaCampaignRequestDetailDto }) {
  const creative = detail.payload.creative
  const creativeType = getCreativeType(detail)
  const common = getCreativeCommon(creative)

  if (creativeType === "SINGLE_VIDEO") {
    const video = getSingleVideoCreative(creative)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailRow label="Headline" value={video.headline ?? "-"} />
          <DetailRow label="Call To Action" value={formatCallToAction(video.callToActionType)} mono />
          <DetailRow label="Video Source" value={getMediaSourceValue(video.video, "video")} mono />
          <DetailRow label="Thumbnail Source" value={getMediaSourceValue(video.thumbnail)} mono />
        </div>
        <ValueBlock label="Link URL" value={video.linkUrl} breakAll />
        <ValueBlock label="Primary Text" value={video.message} preserveWhitespace />
        <ValueBlock label="Description" value={video.description} preserveWhitespace />
        <p className="text-[11px] text-slate-400">Facebook Page ID {common.pageId || "-"} will be used to build object_story_spec.video_data at execute time.</p>
      </div>
    )
  }

  if (creativeType === "CAROUSEL_IMAGE") {
    const carousel = getCarouselCreative(creative)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailRow label="Call To Action" value={formatCallToAction(carousel.callToActionType)} mono />
          <DetailRow label="Card Count" value={(carousel.cards?.length ?? 0).toString()} mono />
        </div>
        <ValueBlock label="Primary Text" value={carousel.message} preserveWhitespace />
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700">Carousel Cards</p>
          {(carousel.cards ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No carousel cards in this payload.</p>
          ) : (
            (carousel.cards ?? []).map((card, index) => (
              <div key={`${index}-${card.headline ?? "card"}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-[96px_minmax(0,1fr)]">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white">
                    {(() => {
                      const preview = getMediaPreviewSource(card.image)
                      return preview.url ? (
                        <ProtectedMediaImage
                          src={preview.url}
                          requiresAuth={preview.requiresAuth}
                          alt={`Carousel card ${index + 1}`}
                          className="h-full w-full object-cover"
                          fallback={<GalleryHorizontal className="w-5 h-5 text-slate-300" />}
                        />
                      ) : (
                        <GalleryHorizontal className="w-5 h-5 text-slate-300" />
                      )
                    })()}
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <DetailRow label="Card" value={`#${index + 1}`} mono />
                      <DetailRow label="Headline" value={card.headline ?? "-"} />
                    </div>
                    <ValueBlock label="Description" value={card.description} />
                    <ValueBlock label="Link URL" value={card.linkUrl} breakAll />
                    <ValueBlock label="Image Source" value={getMediaSourceValue(card.image)} mono breakAll />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (creativeType === "EXISTING_POST") {
    const existingPost = getExistingPostCreative(creative)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailRow label="Source Post ID" value={existingPost.sourcePostId ?? "-"} mono />
          <DetailRow label="Mode" value="object_story_id" mono />
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          This request will reuse an existing Facebook Page post instead of building inline image or video story data.
        </div>
      </div>
    )
  }

  const image = getSingleImageCreative(creative)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <DetailRow label="Headline" value={image.headline ?? "-"} />
        <DetailRow label="Call To Action" value={formatCallToAction(image.callToActionType)} mono />
      </div>
      <ValueBlock label="Primary Text" value={image.message} preserveWhitespace />
      <ValueBlock label="Description" value={image.description} preserveWhitespace />
      <div className="grid gap-4 md:grid-cols-2">
        <ValueBlock label="Image Source" value={getMediaSourceValue(image.image)} mono breakAll />
        <ValueBlock label="Link URL" value={image.linkUrl} breakAll />
      </div>
    </div>
  )
}

function OperationLogPanel({
  title,
  icon,
  value,
  emptyLabel,
  onCopy,
  footer,
}: {
  title: string
  icon: ReactNode
  value?: string
  emptyLabel: string
  onCopy: () => void
  footer?: ReactNode
}) {
  const hasValue = !!value?.trim()

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {icon}
          <span>{title}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500" onClick={onCopy}>
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <div className="space-y-3 p-3">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-100">
          {hasValue ? value : emptyLabel}
        </pre>
        {footer}
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="col-span-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-slate-900 font-medium mt-0.5 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</p>
    </div>
  )
}

function ValueBlock({ label, value, mono, preserveWhitespace, breakAll }: { label: string; value?: string | null; mono?: boolean; preserveWhitespace?: boolean; breakAll?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{label}</p>
      <div className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 ${mono ? "font-mono text-xs" : ""} ${preserveWhitespace ? "whitespace-pre-wrap" : ""} ${breakAll ? "break-all" : ""}`}>
        {value?.trim() ? value : "-"}
      </div>
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

