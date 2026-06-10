"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  CreateMetaCampaignRequestDto,
  MetaAdVariantDto,
  MetaAssetPreparationDto,
  MetaAssetPreparationResponseDto,
  MetaCampaignRequestDetailDto,
  MetaCreatedObjectDto,
  MetaCreativeDraftDto,
  MetaCreativeMediaSourceDto,
  MetaCreativeType,
  MetaOperationLogDto,
  MetaRequestStatus,
  MetaDegreesOfFreedomSpecDto,
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
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProtectedMediaImage } from "../shared/protected-media-image"
import { AdvantageCreativeSummary } from "../shared/advantage-creative-summary"
const SCREEN_META_REQUESTS = "s-meta-requests"

type ConfirmAction = "approve" | "reject" | "execute" | "retry"
type LogStatus = "success" | "error" | "pending"
type ChecklistItem = { label: string; ok: boolean }
type UploadedAssetSlot = { requestAssetId: number; slotKey: string; kind: "image" | "video"; label: string }

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
      return "This will create Meta objects through the backend. Campaign starts PAUSED; Ad Set and Ads start ACTIVE."
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

/** Return all ad variants from a payload (backward compat: wraps legacy creative/ad fields). */
function getAllVariants(payload: CreateMetaCampaignRequestDto): MetaAdVariantDto[] {
  if (payload.adVariants && payload.adVariants.length > 0) return payload.adVariants
  if (payload.creative) {
    return [{
      sequenceNumber: 1,
      creative: payload.creative,
      ad: payload.ad ?? { name: "", status: "PAUSED" },
    }]
  }
  return []
}

function getCreativeType(creative: MetaCreativeDraftDto): MetaCreativeType {
  return (creative.type ?? "SINGLE_IMAGE") as MetaCreativeType
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

function getFlexibleCreative(creative: MetaCreativeDraftDto) {
  return creative.flexible ?? {
    primaryTexts: [],
    headlines: [],
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    assets: [],
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

function getRequestValueEventLabel(value?: string | null): string {
  const normalized = value?.trim().toUpperCase()
  if (normalized === "IN_APP_AD_IMPRESSION" || normalized === "AD_IMPRESSION") return "In-app ad impression"
  return "In-app purchase"
}

function getShortMetaAssetId(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.length <= 18 ? trimmed : `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`
}

function addUploadedAssetSlot(slots: UploadedAssetSlot[], source: MetaCreativeMediaSourceDto | null | undefined, kind: "image" | "video", slotKey: string, label: string) {
  if (!source?.uploadedAssetId || source.uploadedAssetId <= 0) return
  slots.push({ requestAssetId: source.uploadedAssetId, slotKey, kind, label })
}

function collectUploadedAssetSlots(payload?: CreateMetaCampaignRequestDto | null): UploadedAssetSlot[] {
  if (!payload) return []
  const slots: UploadedAssetSlot[] = []

  for (const variant of getAllVariants(payload)) {
    const sequence = variant.sequenceNumber || 1
    const prefix = `variant-${sequence}`
    const creative = variant.creative ?? {}
    const creativeType = getCreativeType(creative)

    if (creativeType === "SINGLE_VIDEO") {
      const video = getSingleVideoCreative(creative)
      addUploadedAssetSlot(slots, video.video, "video", `${prefix}.singleVideo.video`, `Variation ${sequence} video`)
      addUploadedAssetSlot(slots, video.thumbnail, "image", `${prefix}.singleVideo.thumbnail`, `Variation ${sequence} thumbnail`)
      continue
    }

    if (creativeType === "CAROUSEL_IMAGE") {
      const carousel = getCarouselCreative(creative)
      ;(carousel.cards ?? []).forEach((card, index) => {
        addUploadedAssetSlot(slots, card.image, "image", `${prefix}.carousel.cards[${index}].image`, `Variation ${sequence} card ${index + 1}`)
      })
      continue
    }

    if (creativeType === "FLEXIBLE") {
      const flexible = getFlexibleCreative(creative)
      ;(flexible.assets ?? []).forEach((asset, index) => {
        addUploadedAssetSlot(slots, asset.image, "image", `${prefix}.flexible.assets[${index}].image`, `Variation ${sequence} flexible ${index + 1} image`)
        addUploadedAssetSlot(slots, asset.video, "video", `${prefix}.flexible.assets[${index}].video`, `Variation ${sequence} flexible ${index + 1} video`)
        addUploadedAssetSlot(slots, asset.thumbnail, "image", `${prefix}.flexible.assets[${index}].thumbnail`, `Variation ${sequence} flexible ${index + 1} thumbnail`)
      })
      continue
    }

    if (creativeType !== "EXISTING_POST") {
      const image = getSingleImageCreative(creative)
      addUploadedAssetSlot(slots, image.image, "image", `${prefix}.singleImage.image`, `Variation ${sequence} image`)
    }
  }

  return slots
}

function buildPreparationByAssetId(response?: MetaAssetPreparationResponseDto | null): Map<number, MetaAssetPreparationDto> {
  const map = new Map<number, MetaAssetPreparationDto>()
  for (const asset of response?.assets ?? []) {
    map.set(asset.requestAssetId, asset)
  }
  return map
}

function getAssetPreparationClasses(status?: string): string {
  switch (status) {
    case "ready":
      return "border-green-200 bg-green-50 text-green-700"
    case "failed":
      return "border-red-200 bg-red-50 text-red-700"
    case "uploading":
    case "processing":
      return "border-blue-200 bg-blue-50 text-blue-700"
    default:
      return "border-amber-200 bg-amber-50 text-amber-700"
  }
}

function getAssetPreparationLabel(status?: string): string {
  switch (status) {
    case "ready":
      return "Ready on Meta"
    case "failed":
      return "Failed"
    case "uploading":
      return "Uploading to Meta"
    case "processing":
      return "Processing video"
    case "pending":
      return "Queued"
    default:
      return "Queued after save"
  }
}

function getRequestPerformanceGoalSummary(detail: MetaCampaignRequestDetailDto): string {
  const adSet = detail.payload.adSet
  if (adSet.performanceGoalType === "VALUE") {
    return `Maximize value of conversions${adSet.performanceGoalValueType ? ` - ${getRequestValueEventLabel(adSet.performanceGoalValueType)}` : ""}`
  }
  if (adSet.performanceGoalType === "APP_EVENT") {
    return adSet.performanceGoalEventName ? `Maximize number of app events - ${adSet.performanceGoalEventName}` : "Maximize number of app events"
  }
  return "Maximize number of app installs"
}
function getCreativeSummaryHeadline(creative: MetaCreativeDraftDto): string {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).headline ?? "-"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).cards[0]?.headline ?? "-"
    case "FLEXIBLE":
      return getFlexibleCreative(creative).headlines?.[0] ?? "-"
    case "EXISTING_POST":
      return getExistingPostCreative(creative).sourcePostId ?? "-"
    default:
      return getSingleImageCreative(creative).headline ?? "-"
  }
}

function getCreativeSummaryCallToAction(creative: MetaCreativeDraftDto): string {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).callToActionType ?? "-"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).callToActionType ?? "-"
    case "FLEXIBLE":
      return getFlexibleCreative(creative).callToActionType ?? "-"
    case "EXISTING_POST":
      return "EXISTING_POST"
    default:
      return getSingleImageCreative(creative).callToActionType ?? "-"
  }
}

function getCreativeChecklist(creative: MetaCreativeDraftDto): ChecklistItem[] {
  const common = getCreativeCommon(creative)

  if (getCreativeType(creative) === "SINGLE_VIDEO") {
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

  if (getCreativeType(creative) === "CAROUSEL_IMAGE") {
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

  if (getCreativeType(creative) === "FLEXIBLE") {
    const flexible = getFlexibleCreative(creative)
    return [
      { label: "Creative name", ok: !!common.name },
      { label: "Facebook Page ID", ok: !!common.pageId },
      { label: "Primary text", ok: (flexible.primaryTexts?.length ?? 0) > 0 },
      { label: "Headline", ok: (flexible.headlines?.length ?? 0) > 0 },
      { label: "CTA", ok: !!flexible.callToActionType },
      { label: "At least 1 asset", ok: (flexible.assets?.length ?? 0) > 0 },
    ]
  }

  if (getCreativeType(creative) === "EXISTING_POST") {
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

function isCreativeComplete(creative: MetaCreativeDraftDto): boolean {
  return getCreativeChecklist(creative).every((item) => item.ok)
}

function getCreativePreviewImage(creative: MetaCreativeDraftDto): { url: string; requiresAuth: boolean } {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return getMediaPreviewSource(getSingleVideoCreative(creative).thumbnail)
    case "CAROUSEL_IMAGE":
      return getMediaPreviewSource(getCarouselCreative(creative).cards[0]?.image)
    case "FLEXIBLE": {
      const flexible = getFlexibleCreative(creative)
      const firstAsset = flexible.assets?.[0]
      return firstAsset?.assetType === "VIDEO"
        ? getMediaPreviewSource(firstAsset.thumbnail)
        : getMediaPreviewSource(firstAsset?.image)
    }
    case "EXISTING_POST":
      return { url: "", requiresAuth: false }
    default:
      return getMediaPreviewSource(getSingleImageCreative(creative).image)
  }
}

function getCreativePreviewHeadline(creative: MetaCreativeDraftDto): string {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).headline ?? "Video creative"
    case "CAROUSEL_IMAGE":
      return getCarouselCreative(creative).cards[0]?.headline ?? "Carousel creative"
    case "FLEXIBLE":
      return getFlexibleCreative(creative).headlines?.[0] ?? "Flexible creative"
    case "EXISTING_POST":
      return getExistingPostCreative(creative).sourcePostId ? `Existing Post ${getExistingPostCreative(creative).sourcePostId}` : "Existing post preview"
    default:
      return getSingleImageCreative(creative).headline ?? "Creative headline"
  }
}
function getCreativePreviewMessage(creative: MetaCreativeDraftDto): string {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return getSingleVideoCreative(creative).message ?? "Video preview will use the selected source at execute time."
    case "CAROUSEL_IMAGE": {
      const carousel = getCarouselCreative(creative)
      return carousel.message ?? `${carousel.cards?.length ?? 0} carousel cards`
    }
    case "FLEXIBLE": {
      const flexible = getFlexibleCreative(creative)
      return flexible.primaryTexts?.[0] ?? `${flexible.assets?.length ?? 0} flexible assets`
    }
    case "EXISTING_POST":
      return "Existing post preview will be resolved from Meta post."
    default:
      return getSingleImageCreative(creative).message ?? "Creative preview will update as you fill the form."
  }
}

function getCreativePreviewCallToAction(creative: MetaCreativeDraftDto): string {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return formatCallToAction(getSingleVideoCreative(creative).callToActionType)
    case "CAROUSEL_IMAGE":
      return formatCallToAction(getCarouselCreative(creative).callToActionType)
    case "FLEXIBLE":
      return formatCallToAction(getFlexibleCreative(creative).callToActionType)
    case "EXISTING_POST":
      return "VIEW POST"
    default:
      return formatCallToAction(getSingleImageCreative(creative).callToActionType)
  }
}

function getCreativePreviewIcon(creative: MetaCreativeDraftDto) {
  switch (getCreativeType(creative)) {
    case "SINGLE_VIDEO":
      return <Video className="w-6 h-6 text-slate-300" />
    case "CAROUSEL_IMAGE":
      return <GalleryHorizontal className="w-6 h-6 text-slate-300" />
    case "FLEXIBLE":
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
  const isCreate = requestId === "create"
  const numericRequestId = Number(requestId)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [retryingAssetId, setRetryingAssetId] = useState<number | null>(null)
  const [retryingAllFailedAssets, setRetryingAllFailedAssets] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({})

  const { data: detail, loading, error, refetch } = useApi(
    () => metaRequestsApi.getById(numericRequestId),
    {
      enabled: !isCreate && Number.isFinite(numericRequestId),
      cacheKey: `meta-request:${numericRequestId}`,
    }
  )

  const uploadedAssetSlots = useMemo(() => collectUploadedAssetSlots(detail?.payload), [detail?.payload])
  const hasUploadedAssets = uploadedAssetSlots.length > 0

  const {
    data: assetPreparation,
    loading: assetPreparationLoading,
    refetch: refetchAssetPreparation,
  } = useApi<MetaAssetPreparationResponseDto>(
    () => metaRequestsApi.getAssetPreparation(numericRequestId),
    {
      enabled: !isCreate && Number.isFinite(numericRequestId) && hasUploadedAssets,
      cacheKey: `meta-request:${numericRequestId}:asset-preparation`,
    }
  )

  const assetPreparationById = useMemo(() => buildPreparationByAssetId(assetPreparation), [assetPreparation])
  const activeAssetPreparation = useMemo(() => {
    return (assetPreparation?.assets ?? []).some((asset) => ["pending", "uploading", "processing"].includes(asset.status))
  }, [assetPreparation])
  const failedAssetPreparations = useMemo(() => {
    return (assetPreparation?.assets ?? []).filter((asset) => asset.status === "failed")
  }, [assetPreparation])

  useEffect(() => {
    if (!hasUploadedAssets || !activeAssetPreparation) return

    const intervalId = window.setInterval(() => {
      void refetchAssetPreparation()
    }, 7000)

    return () => window.clearInterval(intervalId)
  }, [activeAssetPreparation, hasUploadedAssets, refetchAssetPreparation])

  // Auto-poll the request while it is being executed in the background (variant creative+ad jobs run on Hangfire).
  // Stops automatically once the finalizer marks it completed or a variant marks it failed.
  useEffect(() => {
    if (detail?.status !== "executing") return

    const intervalId = window.setInterval(() => {
      void refetch()
    }, 7000)

    return () => window.clearInterval(intervalId)
  }, [detail?.status, refetch])

  useEffect(() => {
    if (!isCreate) return
    router.replace("/meta-ads/requests/create")
  }, [isCreate, router])

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

  if (isCreate) return null

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

  const handleRetryAssetPreparation = async (assetId: number) => {
    if (!detail) return

    try {
      setRetryingAssetId(assetId)
      await metaRequestsApi.retryAssetMetaUpload(assetId, detail.metaAdAccountId)
      invalidateCache(`meta-request:${detail.id}:asset-preparation`)
      await refetchAssetPreparation()
      toast({ title: "Retry queued", description: "The asset will be uploaded to Meta again." })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Unable to retry Meta upload."
      toast({ title: "Retry failed", description: message, variant: "destructive" })
    } finally {
      setRetryingAssetId(null)
    }
  }

  const handleRetryAllFailedAssetPreparations = async () => {
    if (!detail || failedAssetPreparations.length === 0) return

    const failedAssetIds = Array.from(new Set(failedAssetPreparations.map((asset) => asset.requestAssetId)))
    let failedQueueCount = 0

    try {
      setRetryingAllFailedAssets(true)
      for (const assetId of failedAssetIds) {
        try {
          setRetryingAssetId(assetId)
          await metaRequestsApi.retryAssetMetaUpload(assetId, detail.metaAdAccountId)
        } catch {
          failedQueueCount += 1
        }
      }

      invalidateCache(`meta-request:${detail.id}:asset-preparation`)
      await refetchAssetPreparation()

      const queuedCount = failedAssetIds.length - failedQueueCount
      if (failedQueueCount > 0) {
        toast({
          title: "Some retries could not be queued",
          description: `${queuedCount}/${failedAssetIds.length} failed assets were queued for Meta upload retry.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Retries queued",
          description: `${failedAssetIds.length} failed asset${failedAssetIds.length === 1 ? "" : "s"} will be uploaded to Meta again.`,
        })
      }
    } finally {
      setRetryingAssetId(null)
      setRetryingAllFailedAssets(false)
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

  const allVariants = getAllVariants(detail.payload)
  const primaryCreative = allVariants[0]?.creative ?? detail.payload.creative ?? {}
  const creativeType = getCreativeType(primaryCreative)
  const creativeCommon = getCreativeCommon(primaryCreative)
  const createdObjects = sortCreatedObjects(detail.createdObjects)
  const hasValidationErrors = Object.keys(groupedValidationErrors).length > 0
  const preparedAssetIds = new Set((assetPreparation?.assets ?? []).filter((asset) => asset.status === "ready").map((asset) => asset.requestAssetId))
  const readyAssetCount = uploadedAssetSlots.filter((slot) => preparedAssetIds.has(slot.requestAssetId)).length
  const failedAssetCount = failedAssetPreparations.length
  const assetsReadyForExecution = !hasUploadedAssets || assetPreparation?.isReadyForExecution === true
  const assetPreparationBlocked = hasUploadedAssets && !assetsReadyForExecution

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
              {hasUploadedAssets ? (
                <Badge variant="outline" className={assetPreparationBlocked ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700"}>
                  {assetPreparationLoading && !assetPreparation ? <Loader2 className="h-3 w-3 animate-spin" /> : assetPreparationBlocked ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {assetPreparationBlocked ? `Assets preparing on Meta (${readyAssetCount}/${uploadedAssetSlots.length} ready)` : "All Meta assets ready"}
                </Badge>
              ) : null}
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

            {detail.status === "approved" && canExecute ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setConfirmAction("execute")}
                disabled={assetPreparationBlocked}
                title={assetPreparationBlocked ? "Assets are still uploading to Meta. Execution will be available when all assets are ready." : undefined}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Execute Request
              </Button>
            ) : null}
            {detail.status === "failed" && canRetry ? (
              <Button
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => setConfirmAction("retry")}
                disabled={assetPreparationBlocked}
                title={assetPreparationBlocked ? "Assets are still uploading to Meta. Retry will be available when all assets are ready." : undefined}
              >
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
            Editing this request will re-validate it, and it will be ready to execute immediately after changes are saved.
          </p>
        </div>
      ) : null}

      {assetPreparationBlocked ? (
        <div className="flex flex-wrap items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {failedAssetCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm text-amber-800">
              {failedAssetCount > 0
                ? `${failedAssetCount} asset upload${failedAssetCount === 1 ? "" : "s"} failed on Meta. Retry failed uploads before execution.`
                : "Assets are still uploading to Meta. Execution will be available when all assets are ready."}
            </p>
          </div>
          {failedAssetCount > 0 && canCreate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              disabled={retryingAllFailedAssets}
              onClick={() => void handleRetryAllFailedAssetPreparations()}
            >
              {retryingAllFailedAssets ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              Retry all failed uploads
            </Button>
          ) : null}
        </div>
      ) : null}

      {detail.status === "failed" ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {latestFailedLog?.metaErrorUserTitle ?? "Request execution failed"}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {latestFailedLog?.metaErrorUserMsg ?? detail.failureSummary ?? "Execution failed. Check operation logs for more details."}
              </p>
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
                {latestFailedLog.metaErrorUserTitle ? (
                  <div className="text-sm font-semibold text-red-800 bg-red-100/30 border border-red-200/50 rounded-md px-3 py-2.5">
                    {latestFailedLog.metaErrorUserTitle}
                  </div>
                ) : null}
                {latestFailedLog.metaErrorUserMsg ? (
                  <ValueBlock label="What happened" value={latestFailedLog.metaErrorUserMsg} preserveWhitespace />
                ) : null}
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
            Meta objects created successfully. Campaign starts in <strong>PAUSED</strong> state; Ad Set and Ads start in <strong>ACTIVE</strong> state on Meta.
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
                {detail.payload.adSet.excludedCountries && detail.payload.adSet.excludedCountries.length > 0 && (
                  <DetailRow label="Excluded Countries" value={detail.payload.adSet.excludedCountries.join(", ")} />
                )}
                <DetailRow label="Age Range" value={`${detail.payload.adSet.ageMin ?? "-"}-${detail.payload.adSet.ageMax ?? "-"}`} />
                <DetailRow label="Gender" value={getGenderLabel(detail)} />
                <DetailRow label="Placement" value={getPlacementLabel(detail)} />
                <DetailRow label="Performance Goal" value={getRequestPerformanceGoalSummary(detail)} mono />
                <DetailRow label="Budget" value={getBudgetSummary(detail)} />
                <DetailRow label="Creative Type" value={creativeType.replaceAll("_", " ")} mono />
                <DetailRow label="Creative Name" value={creativeCommon.name || "-"} />
                <DetailRow label="Facebook Page ID" value={creativeCommon.pageId || "-"} mono />
                <DetailRow label="Headline / Reference" value={getCreativeSummaryHeadline(primaryCreative)} />
                <DetailRow label="CTA / Mode" value={getCreativeSummaryCallToAction(primaryCreative)} mono />
                <DetailRow label="Ad Name" value={allVariants[0]?.ad?.name ?? detail.payload.ad?.name ?? "-"} />
                {allVariants.length > 1 && (
                  <DetailRow label="Ad Variations" value={`${allVariants.length} variations`} />
                )}
              </div>
            </CardContent>
          </Card>

          <AdvantageCreativeSummary
            degreesOfFreedomSpec={primaryCreative.degreesOfFreedomSpec}
            creativeType={creativeType}
          />

          {/* Creative card — tabs when multiple variants, plain card when single */}
          {allVariants.length > 1 ? (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  Creative — {allVariants.length} Variations
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-1">
                  Primary text, headline, description, CTA, and page are shared across all variations. Each variation differs only by its image/video.
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={`variant-${allVariants[0].sequenceNumber}`}>
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    {allVariants.map((variant, index) => {
                      const vc = variant.creative ?? {}
                      const vcComplete = isCreativeComplete(vc)
                      return (
                        <TabsTrigger
                          key={variant.sequenceNumber}
                          value={`variant-${variant.sequenceNumber}`}
                          className="text-xs gap-1.5"
                        >
                          Variation #{index + 1}
                          <span className={`w-1.5 h-1.5 rounded-full ${vcComplete ? "bg-green-500" : "bg-amber-400"}`} />
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                  {allVariants.map((variant, index) => {
                    const vc = variant.creative ?? {}
                    const vcType = getCreativeType(vc)
                    const vcCommon = getCreativeCommon(vc)
                    const vcChecklist = getCreativeChecklist(vc)
                    const vcComplete = isCreativeComplete(vc)
                    const vcPreview = getCreativePreviewImage(vc)
                    return (
                      <TabsContent key={variant.sequenceNumber} value={`variant-${variant.sequenceNumber}`}>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-xs text-slate-500">
                            Ad: &ldquo;{variant.ad?.name || "-"}&rdquo; · Variation #{index + 1} of {allVariants.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 font-mono px-2 py-0.5">
                              {vcType}
                            </Badge>
                            <Badge className={vcComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                              {vcComplete ? "Complete" : "Incomplete"}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                              <DetailRow label="Creative Type" value={vcType.replaceAll("_", " ")} mono />
                              <DetailRow label="Creative Name" value={vcCommon.name || "-"} />
                              <DetailRow label="Facebook Page ID" value={vcCommon.pageId || "-"} mono />
                              <DetailRow label="Instagram Actor ID" value={vcCommon.instagramActorId || "-"} mono />
                            </div>
                            <CreativeTypeSnapshot
                              creative={vc}
                              assetPreparationById={assetPreparationById}
                              canRetryAssetPreparation={canCreate}
                              retryingAssetId={retryingAssetId}
                              onRetryAssetPreparation={handleRetryAssetPreparation}
                            />
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Required Creative Fields</p>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {vcChecklist.map((item) => (
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
                                  {vcPreview.url ? (
                                    <ProtectedMediaImage
                                      src={vcPreview.url}
                                      requiresAuth={vcPreview.requiresAuth}
                                      alt="Creative preview"
                                      className="h-full w-full object-cover"
                                      fallback={getCreativePreviewIcon(vc)}
                                    />
                                  ) : (
                                    getCreativePreviewIcon(vc)
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-900">{getCreativePreviewHeadline(vc)}</p>
                                  <p className="line-clamp-2 text-[9px] leading-tight text-slate-500">{getCreativePreviewMessage(vc)}</p>
                                </div>
                                <div className="pt-0.5">
                                  <div className="rounded bg-blue-600 py-1 text-center">
                                    <span className="text-[9px] font-semibold text-white">{getCreativePreviewCallToAction(vc)}</span>
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
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            // Single variant — existing card layout
            allVariants.map((variant) => {
              const vc = variant.creative ?? {}
              const vcType = getCreativeType(vc)
              const vcCommon = getCreativeCommon(vc)
              const vcChecklist = getCreativeChecklist(vc)
              const vcComplete = isCreativeComplete(vc)
              const vcPreview = getCreativePreviewImage(vc)
              return (
                <Card key={variant.sequenceNumber} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                        Creative
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 font-mono px-2 py-0.5">
                          {vcType}
                        </Badge>
                        <Badge className={vcComplete ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {vcComplete ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Snapshot of the request creative payload that will be transformed into the matching Meta creative shape during execution.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          <DetailRow label="Creative Type" value={vcType.replaceAll("_", " ")} mono />
                          <DetailRow label="Creative Name" value={vcCommon.name || "-"} />
                          <DetailRow label="Facebook Page ID" value={vcCommon.pageId || "-"} mono />
                          <DetailRow label="Instagram Actor ID" value={vcCommon.instagramActorId || "-"} mono />
                        </div>

                        <CreativeTypeSnapshot
                          creative={vc}
                          assetPreparationById={assetPreparationById}
                          canRetryAssetPreparation={canCreate}
                          retryingAssetId={retryingAssetId}
                          onRetryAssetPreparation={handleRetryAssetPreparation}
                        />

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Required Creative Fields</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {vcChecklist.map((item) => (
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
                              {vcPreview.url ? (
                                <ProtectedMediaImage
                                  src={vcPreview.url}
                                  requiresAuth={vcPreview.requiresAuth}
                                  alt="Creative preview"
                                  className="h-full w-full object-cover"
                                  fallback={getCreativePreviewIcon(vc)}
                                />
                              ) : (
                                getCreativePreviewIcon(vc)
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-slate-900">{getCreativePreviewHeadline(vc)}</p>
                              <p className="line-clamp-2 text-[9px] leading-tight text-slate-500">{getCreativePreviewMessage(vc)}</p>
                            </div>
                            <div className="pt-0.5">
                              <div className="rounded bg-blue-600 py-1 text-center">
                                <span className="text-[9px] font-semibold text-white">{getCreativePreviewCallToAction(vc)}</span>
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
              )
            })
          )}

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
                <p className="text-[11px] text-slate-400 pt-1">Campaign is expected to be <strong>PAUSED</strong>; Ad Set and Ads are expected to be <strong>ACTIVE</strong> on Meta.</p>
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

function AssetPreparationStatusLine({
  source,
  label,
  preparationById,
  canRetry,
  retryingAssetId,
  onRetry,
}: {
  source?: MetaCreativeMediaSourceDto | null
  label: string
  preparationById: Map<number, MetaAssetPreparationDto>
  canRetry: boolean
  retryingAssetId: number | null
  onRetry: (assetId: number) => void | Promise<void>
}) {
  const assetId = source?.uploadedAssetId
  if (!assetId) return null

  const preparation = preparationById.get(assetId)
  const status = preparation?.status
  const isFailed = status === "failed"
  const metaId = getShortMetaAssetId(preparation?.metaImageHash ?? preparation?.metaVideoId)

  return (
    <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <Badge variant="outline" className={getAssetPreparationClasses(status)}>
          {status === "ready" ? <CheckCircle2 className="h-3 w-3" /> : status === "failed" ? <AlertTriangle className="h-3 w-3" /> : status === "uploading" || status === "processing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
          {getAssetPreparationLabel(status)}
        </Badge>
        <span>{label}</span>
        <span className="font-mono text-slate-400">Asset #{assetId}</span>
        {metaId ? <span className="font-mono text-slate-400">Meta {metaId}</span> : null}
        {isFailed && canRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={retryingAssetId === assetId} onClick={() => void onRetry(assetId)}>
            {retryingAssetId === assetId ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            Retry upload to Meta
          </Button>
        ) : null}
      </div>
      {isFailed && preparation?.errorMessage ? (
        <p className="text-[11px] text-red-600">{preparation.errorMessage}</p>
      ) : null}
    </div>
  )
}

function CreativeTypeSnapshot({
  creative,
  assetPreparationById,
  canRetryAssetPreparation,
  retryingAssetId,
  onRetryAssetPreparation,
}: {
  creative: MetaCreativeDraftDto
  assetPreparationById: Map<number, MetaAssetPreparationDto>
  canRetryAssetPreparation: boolean
  retryingAssetId: number | null
  onRetryAssetPreparation: (assetId: number) => void | Promise<void>
}) {
  const creativeType = getCreativeType(creative)
  const common = getCreativeCommon(creative)

  const renderAssetPreparation = (source: MetaCreativeMediaSourceDto | null | undefined, label: string) => (
    <AssetPreparationStatusLine
      source={source}
      label={label}
      preparationById={assetPreparationById}
      canRetry={canRetryAssetPreparation}
      retryingAssetId={retryingAssetId}
      onRetry={onRetryAssetPreparation}
    />
  )

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
        <div className="space-y-2">
          {renderAssetPreparation(video.video, "Video asset")}
          {renderAssetPreparation(video.thumbnail, "Thumbnail asset")}
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
                    {renderAssetPreparation(card.image, `Card ${index + 1} image asset`)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }


  if (creativeType === "FLEXIBLE") {
    const flexible = getFlexibleCreative(creative)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailRow label="Call To Action" value={formatCallToAction(flexible.callToActionType)} mono />
          <DetailRow label="Asset Count" value={(flexible.assets?.length ?? 0).toString()} mono />
        </div>
        <ValueBlock label="Link URL" value={flexible.linkUrl} breakAll />
        <ValueBlock label="Primary Texts" value={(flexible.primaryTexts ?? []).join("\n\n")} preserveWhitespace />
        <ValueBlock label="Headlines" value={(flexible.headlines ?? []).join("\n")} preserveWhitespace />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Flexible Assets</p>
          {(flexible.assets ?? []).map((asset, index) => (
            <div key={`${asset.assetType}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-medium">Asset {index + 1} ({asset.assetType ?? "IMAGE"})</p>
              <p className="font-mono text-[12px] text-slate-500 break-all">{asset.assetType === "VIDEO" ? getMediaSourceValue(asset.video, "video") : getMediaSourceValue(asset.image)}</p>
              {asset.assetType === "VIDEO" ? (
                <div className="space-y-2">
                  {renderAssetPreparation(asset.video, `Flexible asset ${index + 1} video`)}
                  {renderAssetPreparation(asset.thumbnail, `Flexible asset ${index + 1} thumbnail`)}
                </div>
              ) : (
                renderAssetPreparation(asset.image, `Flexible asset ${index + 1} image`)
              )}
            </div>
          ))}
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
        <div>
          <ValueBlock label="Image Source" value={getMediaSourceValue(image.image)} mono breakAll />
          {renderAssetPreparation(image.image, "Image asset")}
        </div>
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








