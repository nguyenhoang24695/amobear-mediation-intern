"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { metaIntegrationsApi, metaReferenceApi, metaRequestsApi } from "@/lib/api/meta-ads"
import {
  createEmptyCarouselCard,
  createEmptyFlexibleAsset,
  createEmptyMediaSelection,
  detailDtoToFormState,
  formStateToCreateDto,
  formStateToUpdateDto,
  groupValidationErrors,
} from "@/lib/meta-ads/mappers"
import type {
  AdVariantFormState,
  GroupedValidationErrors,
  MetaAdSetDraftValidationDto,
  MetaAppMappingDto,
  MetaCampaignRequestDetailDto,
  MetaAssetPreparationDto,
  MetaCreateCampaignReferenceDto,
  MetaFacebookPageReferenceDto,
  GeoCountryGroupDto,
  MetaGeoRegionDto,
  MetaIntegrationDto,
  MetaRequestAssetSelectionState,
  MetaPerformanceGoalReferenceDto,
  MetaRequestFormState,
  MetaRequestStatus,
} from "@/types/meta-ads"
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { getAllowedBillingEvents, getAllowedBidStrategies, getAllowedPerformanceGoalTypes, getAllowedPerformanceGoalsForBidStrategy, bidStrategyRequiresBidAmount, bidStrategyRequiresRoasGoal, resolveOptimizationGoal } from "./constants"
import { AccountAppSection } from "./section-account-app"
import { CampaignSettingsSection } from "./section-campaign-settings"
import { AdSetAudienceSection } from "./section-adset-audience"
import { AdSetBudgetSection } from "./section-adset-budget"
import { CreativeSection } from "./section-creative"
import { AdSection } from "./section-ad"
import { RequestSummaryRail } from "./summary-rail"
import { resolveMetaAppMappingPlatform } from "./platform"
import { captureVideoFrameToFile } from "./video-frame-capture"
export type RequestFormState = MetaRequestFormState

type RequestSectionTarget = "account-app" | "campaign-settings" | "adset-audience" | "adset-budget" | "creative" | "ad"
const MAX_AD_VARIANTS = 50

const requestSectionIds: Record<RequestSectionTarget, string> = {
  "account-app": "meta-request-section-account-app",
  "campaign-settings": "meta-request-section-campaign-settings",
  "adset-audience": "meta-request-section-adset-audience",
  "adset-budget": "meta-request-section-adset-budget",
  creative: "meta-request-section-creative",
  ad: "meta-request-section-ad",
}

function getSectionWrapperClass(target: RequestSectionTarget, highlightedSection: RequestSectionTarget | null): string {
  const base = "-m-2 rounded-2xl p-2 scroll-mt-24 transition-all duration-500"
  if (highlightedSection !== target) return base
  return `${base} bg-amber-50/80 ring-2 ring-amber-200 ring-offset-2 ring-offset-amber-100/60 shadow-[0_0_0_8px_rgba(253,230,138,0.22)] animate-pulse`
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function sanitizeRequestFormState(state: RequestFormState): RequestFormState {
  const next = { ...state }

  const allowedPerformanceGoals = getAllowedPerformanceGoalTypes(next.campaignObjective)
  if (!allowedPerformanceGoals.includes(next.performanceGoalType)) {
    next.performanceGoalType = allowedPerformanceGoals[0] ?? "APP_INSTALLS"
  }

  const allowedPerformanceGoalsForBidStrategy = getAllowedPerformanceGoalsForBidStrategy(next.bidStrategy)
  if (!allowedPerformanceGoalsForBidStrategy.includes(next.performanceGoalType)) {
    next.performanceGoalType = allowedPerformanceGoalsForBidStrategy[0] ?? "APP_INSTALLS"
  }

  next.optimizationGoal = resolveOptimizationGoal(next.performanceGoalType)

  if (next.performanceGoalType !== "APP_EVENT") {
    next.performanceGoalEventName = ""
  }

  if (next.performanceGoalType !== "VALUE") {
    next.performanceGoalValueType = "IN_APP_PURCHASE"
  } else if (!["IN_APP_PURCHASE", "PURCHASE", "IN_APP_AD_IMPRESSION", "AD_IMPRESSION"].includes(next.performanceGoalValueType.trim().toUpperCase())) {
    next.performanceGoalValueType = "IN_APP_PURCHASE"
  } else if (next.performanceGoalValueType.trim().toUpperCase() === "PURCHASE") {
    next.performanceGoalValueType = "IN_APP_PURCHASE"
  } else if (next.performanceGoalValueType.trim().toUpperCase() === "AD_IMPRESSION") {
    next.performanceGoalValueType = "IN_APP_AD_IMPRESSION"
  }

  const allowedBillingEvents = getAllowedBillingEvents(next.optimizationGoal)
  if (!allowedBillingEvents.includes(next.billingEvent)) {
    next.billingEvent = allowedBillingEvents[0] ?? "IMPRESSIONS"
  }

  const allowedBidStrategies = getAllowedBidStrategies(next.performanceGoalType)
  if (!allowedBidStrategies.includes(next.bidStrategy)) {
    next.bidStrategy = allowedBidStrategies[0] ?? "LOWEST_COST_WITHOUT_CAP"
  }

  if (!bidStrategyRequiresBidAmount(next.bidStrategy)) {
    next.bidAmount = ""
  }
  if (!bidStrategyRequiresRoasGoal(next.bidStrategy)) {
    next.roasAverageFloor = ""
  }

  next.countryGroupIds = Array.isArray(next.countryGroupIds)
    ? next.countryGroupIds.filter((id) => Number.isFinite(id) && id > 0)
    : []

  if (!Array.isArray(next.flexiblePrimaryTexts) || next.flexiblePrimaryTexts.length === 0) next.flexiblePrimaryTexts = [""]
  if (!Array.isArray(next.flexibleHeadlines) || next.flexibleHeadlines.length === 0) next.flexibleHeadlines = [""]
  if (!Array.isArray(next.flexibleAssets) || next.flexibleAssets.length === 0) next.flexibleAssets = [createEmptyFlexibleAsset()]

  return next
}


function clearMetaLibrarySelection(selection: MetaRequestFormState["singleImageImage"], adAccountId: string): MetaRequestFormState["singleImageImage"] {
  if (selection.mode !== "meta_ref" || selection.metaRefSource !== "from_meta") return selection
  if (selection.metaAdAccountId === adAccountId) return selection

  return {
    ...selection,
    imageHash: "",
    videoId: "",
    metaRefSource: "manual",
    metaPreviewUrl: "",
    metaPreviewRequiresAuth: false,
    metaPlayableUrl: "",
    metaAssetId: "",
    metaAssetName: "",
    metaAssetType: "",
    metaAdAccountId: "",
  }
}

function clearMetaLibrarySelectionsForAccountChange(state: RequestFormState): RequestFormState {
  return {
    ...state,
    // Primary variant (flat fields)
    singleImageImage: clearMetaLibrarySelection(state.singleImageImage, state.adAccountId),
    singleVideoVideo: clearMetaLibrarySelection(state.singleVideoVideo, state.adAccountId),
    singleVideoThumbnail: clearMetaLibrarySelection(state.singleVideoThumbnail, state.adAccountId),
    carouselCards: state.carouselCards.map((card) => ({
      ...card,
      image: clearMetaLibrarySelection(card.image, state.adAccountId),
    })),
    flexibleAssets: state.flexibleAssets.map((asset) => ({
      ...asset,
      image: clearMetaLibrarySelection(asset.image, state.adAccountId),
      video: clearMetaLibrarySelection(asset.video, state.adAccountId),
      thumbnail: clearMetaLibrarySelection(asset.thumbnail, state.adAccountId),
    })),
    // Additional variants
    additionalVariants: state.additionalVariants.map((variant) => ({
      ...variant,
      singleImageImage: clearMetaLibrarySelection(variant.singleImageImage, state.adAccountId),
      singleVideoVideo: clearMetaLibrarySelection(variant.singleVideoVideo, state.adAccountId),
      singleVideoThumbnail: clearMetaLibrarySelection(variant.singleVideoThumbnail, state.adAccountId),
      carouselCards: variant.carouselCards.map((card) => ({
        ...card,
        image: clearMetaLibrarySelection(card.image, state.adAccountId),
      })),
      flexibleAssets: variant.flexibleAssets.map((asset) => ({
        ...asset,
        image: clearMetaLibrarySelection(asset.image, state.adAccountId),
        video: clearMetaLibrarySelection(asset.video, state.adAccountId),
        thumbnail: clearMetaLibrarySelection(asset.thumbnail, state.adAccountId),
      })),
    })),
  }
}
function createDefaultFormState(): RequestFormState {
  return sanitizeRequestFormState({
    adAccountId: "",
    appRowId: "",
    paidMediaAppBindingId: "",
    objective: "OUTCOME_APP_PROMOTION",
    budgetStrategy: "CBO",
    campaignName: "",
    buyingType: "AUCTION",
    campaignObjective: "OUTCOME_APP_PROMOTION",
    specialAdCategories: [],
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    isAdSetBudgetSharingEnabled: true,
    campaignDailyBudget: "20",
    campaignLifetimeBudget: "",
    adSetName: "",
    geoMode: "GLOBAL",
    countries: [],
    excludedCountries: [],
    regionKeys: [],
    countryGroupIds: [],
    cityTargets: [],
    ageMin: 18,
    ageMax: 65,
    gender: "ALL",
    placementMode: "AUTOMATIC",
    publisherPlatforms: [],
    facebookPositions: [],
    instagramPositions: [],
    adSetDailyBudget: "20",
    adSetLifetimeBudget: "",
    billingEvent: "IMPRESSIONS",
    optimizationGoal: "APP_INSTALLS",
    performanceGoalType: "APP_INSTALLS",
    performanceGoalEventName: "",
    performanceGoalValueType: "IN_APP_PURCHASE",
    bidAmount: "",
    roasAverageFloor: "",
    advantageAudience: true,
    startTime: formatDateTimeLocal(new Date()),
    endTime: "",
    creativeType: "SINGLE_MEDIA",
    creativeName: "",
    facebookPageId: "",
    instagramActorId: "",
    singleImagePrimaryText: "",
    singleImagePrimaryTexts: [""],
    singleImageHeadline: "",
    singleImageHeadlines: [""],
    singleImageDescription: "",
    singleImageCallToAction: "LEARN_MORE",
    singleImageLinkUrl: "",
    singleImageImage: createEmptyMediaSelection("meta_ref"),
    singleVideoPrimaryText: "",
    singleVideoPrimaryTexts: [""],
    singleVideoHeadline: "",
    singleVideoHeadlines: [""],
    singleVideoDescription: "",
    singleVideoCallToAction: "LEARN_MORE",
    singleVideoLinkUrl: "",
    singleVideoVideo: createEmptyMediaSelection("meta_ref"),
    singleVideoThumbnail: createEmptyMediaSelection("meta_ref"),
    carouselPrimaryText: "",
    carouselCallToAction: "LEARN_MORE",
    carouselCards: [createEmptyCarouselCard(), createEmptyCarouselCard()],
    flexiblePrimaryTexts: [""],
    flexibleHeadlines: [""],
    flexibleCallToAction: "LEARN_MORE",
    flexibleLinkUrl: "",
    flexibleAssets: [createEmptyFlexibleAsset()],
    existingPostId: "",
    adName: "",
    trackingSpecs: "",
    advantageCreativeAllOptimizations: true,
    advantageCreativeAddTextOverlay: true,
    advantageCreativeImageTouchups: true,
    advantageCreativeMusicGeneration: true,
    advantageCreativeTextOptimizations: true,
    advantageCreativeImageAnimation: true,
    advantageCreativeInlineComment: true,
    additionalVariants: [],
  })
}

function createEmptyAdVariant(seq: number, form: Pick<RequestFormState, "facebookPageId" | "instagramActorId">): AdVariantFormState {
  return {
    sequenceNumber: seq,
    creativeType: "SINGLE_MEDIA",
    mediaType: undefined,
    creativeName: "",
    facebookPageId: form.facebookPageId,
    instagramActorId: form.instagramActorId,
    singleImagePrimaryText: "",
    singleImagePrimaryTexts: [""],
    singleImageHeadline: "",
    singleImageHeadlines: [""],
    singleImageDescription: "",
    singleImageCallToAction: "LEARN_MORE",
    singleImageLinkUrl: "",
    singleImageImage: createEmptyMediaSelection("meta_ref"),
    singleVideoPrimaryText: "",
    singleVideoPrimaryTexts: [""],
    singleVideoHeadline: "",
    singleVideoHeadlines: [""],
    singleVideoDescription: "",
    singleVideoCallToAction: "LEARN_MORE",
    singleVideoLinkUrl: "",
    singleVideoVideo: createEmptyMediaSelection("meta_ref"),
    singleVideoThumbnail: createEmptyMediaSelection("meta_ref"),
    carouselPrimaryText: "",
    carouselCallToAction: "LEARN_MORE",
    carouselCards: [createEmptyCarouselCard(), createEmptyCarouselCard()],
    flexiblePrimaryTexts: [""],
    flexibleHeadlines: [""],
    flexibleCallToAction: "LEARN_MORE",
    flexibleLinkUrl: "",
    flexibleAssets: [createEmptyFlexibleAsset()],
    existingPostId: "",
    adName: "",
    trackingSpecs: "",
    advantageCreativeAllOptimizations: true,
    advantageCreativeAddTextOverlay: true,
    advantageCreativeImageTouchups: true,
    advantageCreativeMusicGeneration: true,
    advantageCreativeTextOptimizations: true,
    advantageCreativeImageAnimation: true,
    advantageCreativeInlineComment: true,
  }
}

function hasSelectedMedia(selection: MetaRequestAssetSelectionState, kind: "image" | "video") {
  return !!(
    selection.uploadedAssetId ||
    selection.metaAssetId ||
    selection.metaPreviewUrl ||
    selection.uploadedAssetPreviewUrl ||
    (kind === "video" ? selection.videoId || selection.metaPlayableUrl : selection.imageHash || selection.imageUrl)
  )
}

function addUploadedAssetId(ids: Set<number>, selection?: MetaRequestAssetSelectionState | null) {
  if (selection?.uploadedAssetId && Number.isFinite(selection.uploadedAssetId)) {
    ids.add(selection.uploadedAssetId)
  }
}

function collectUploadedAssetIds(form: RequestFormState): number[] {
  const ids = new Set<number>()

  addUploadedAssetId(ids, form.singleImageImage)
  addUploadedAssetId(ids, form.singleVideoVideo)
  addUploadedAssetId(ids, form.singleVideoThumbnail)

  for (const card of form.carouselCards) {
    addUploadedAssetId(ids, card.image)
  }

  for (const asset of form.flexibleAssets) {
    addUploadedAssetId(ids, asset.image)
    addUploadedAssetId(ids, asset.video)
    addUploadedAssetId(ids, asset.thumbnail)
  }

  for (const variant of form.additionalVariants) {
    addUploadedAssetId(ids, variant.singleImageImage)
    addUploadedAssetId(ids, variant.singleVideoVideo)
    addUploadedAssetId(ids, variant.singleVideoThumbnail)
    for (const card of variant.carouselCards) {
      addUploadedAssetId(ids, card.image)
    }
    for (const asset of variant.flexibleAssets) {
      addUploadedAssetId(ids, asset.image)
      addUploadedAssetId(ids, asset.video)
      addUploadedAssetId(ids, asset.thumbnail)
    }
  }

  return Array.from(ids)
}

function buildUploadedMediaSelection(asset: { id: number; fileName: string }, file: File, kind: "image" | "video"): MetaRequestAssetSelectionState {
  return {
    ...createEmptyMediaSelection("uploaded_asset"),
    mode: "uploaded_asset",
    uploadedAssetId: asset.id,
    uploadedAssetName: asset.fileName,
    uploadedAssetPreviewUrl: kind === "image" ? URL.createObjectURL(file) : "",
    imageHash: "",
    imageUrl: "",
    videoId: "",
  }
}

type TokenState = "none" | "ready" | "not_tested" | "expired" | "missing_permissions" | "invalid" | "disabled"

function buildIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "")
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`
}

function parseValidationErrorsJson(validationErrorsJson?: string | null): GroupedValidationErrors {
  if (!validationErrorsJson) return {}

  try {
    const parsed = JSON.parse(validationErrorsJson) as string[]
    return groupValidationErrors(Array.isArray(parsed) ? parsed : [])
  } catch {
    return {}
  }
}

function invalidateMetaRequestCaches(status?: MetaRequestStatus | null) {
  const baseKeys = [
    "meta-requests:list:all:all:all",
    "meta-requests:list:draft:all:all",
    "meta-requests:list:pending_approval:all:all",
    "meta-requests:list:approved:all:all",
    "meta-requests:list:failed:all:all",
  ]

  if (status && !baseKeys.includes(`meta-requests:list:${status}:all:all`)) {
    baseKeys.push(`meta-requests:list:${status}:all:all`)
  }

  baseKeys.forEach((key) => invalidateCache(key))
}

function deriveTokenState(input: {
  adAccountId: string
  canViewMetaAccounts: boolean
  selectedAdAccountActive?: boolean
  integrationEnabled?: boolean
  hasAccessToken?: boolean
  tokenStatus?: string | null
}): TokenState {
  if (!input.adAccountId) return "none"
  if (!input.selectedAdAccountActive || !input.integrationEnabled) return "disabled"
  if (!input.canViewMetaAccounts) return "none"

  switch (input.tokenStatus) {
    case "VALID":
      return "ready"
    case "EXPIRED":
      return "expired"
    case "MISSING_SCOPES":
      return "missing_permissions"
    case "ACCESS_DENIED":
    case "INVALID":
      return "invalid"
    case "NOT_TESTED":
    default:
      return input.hasAccessToken ? "not_tested" : "invalid"
  }
}

interface Props {
  requestId?: number
}

export function CreateRequestContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEditMode = requestId != null && Number.isFinite(requestId)
  const numericRequestId = isEditMode ? Number(requestId) : null
  const canViewMetaAccounts = hasScreenFunction("s-meta-accounts", "view")

  const [form, setForm] = useState<RequestFormState>(() => createDefaultFormState())
  const [draftId, setDraftId] = useState<number | null>(null)
  const [serverStatus, setServerStatus] = useState<MetaRequestStatus | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(buildIdempotencyKey)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<GroupedValidationErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [loadedRequestId, setLoadedRequestId] = useState<number | null>(null)
  const [facebookPageSource, setFacebookPageSource] = useState<"promote_pages" | "access_token_all">("promote_pages")
  const [highlightedSection, setHighlightedSection] = useState<RequestSectionTarget | null>(null)
  const [activeVariantTab, setActiveVariantTab] = useState("variant-1")
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [adSetDraftValidation, setAdSetDraftValidation] = useState<MetaAdSetDraftValidationDto | null>(null)
  const [adSetDraftValidationLoading, setAdSetDraftValidationLoading] = useState(false)
  const highlightTimeoutRef = useRef<number | null>(null)
  const adSetDraftValidationSeqRef = useRef(0)

  const {
    data: referenceData,
    loading: referenceLoading,
    error: referenceError,
  } = useApi<MetaCreateCampaignReferenceDto>(
    () => metaReferenceApi.getCreateCampaignReference(),
    { cacheKey: "meta-reference:create-campaign" }
  )

  const {
    data: editDetail,
    loading: editLoading,
    error: editError,
  } = useApi<MetaCampaignRequestDetailDto>(
    () => metaRequestsApi.getById(numericRequestId as number),
    {
      enabled: numericRequestId != null,
      cacheKey: numericRequestId != null ? `meta-request:${numericRequestId}` : "meta-request:new",
    }
  )

  const { data: integrations } = useApi<MetaIntegrationDto[]>(
    () => metaIntegrationsApi.list(),
    {
      enabled: canViewMetaAccounts,
      cacheKey: "meta-integrations:list",
    }
  )

  const {
    data: accountScopedAppMappings,
    loading: accountScopedAppMappingsLoading,
    error: accountScopedAppMappingsError,
  } = useApi<MetaAppMappingDto[]>(
    () => metaReferenceApi.getAdAccountAppMappings(Number(form.adAccountId)),
    {
      enabled: !!form.adAccountId,
      cacheKey: form.adAccountId ? `meta-reference:ad-account:${form.adAccountId}:app-mappings` : "meta-reference:ad-account:none:app-mappings",
    }
  )


  const {
    data: facebookPages,
    loading: facebookPagesLoading,
    error: facebookPagesError,
  } = useApi<MetaFacebookPageReferenceDto[]>(
    () => metaReferenceApi.getAdAccountFacebookPages(Number(form.adAccountId), facebookPageSource),
    {
      enabled: !!form.adAccountId,
      cacheKey: form.adAccountId ? `meta-reference:ad-account:${form.adAccountId}:facebook-pages:${facebookPageSource}` : "meta-reference:ad-account:none:facebook-pages",
    }
  )

  const {
    data: performanceGoalReference,
    loading: performanceGoalReferenceLoading,
    error: performanceGoalReferenceError,
    refetch: refetchPerformanceGoalReference,
  } = useApi<MetaPerformanceGoalReferenceDto>(
    () => metaReferenceApi.getAppPerformanceGoals(
      Number(form.appRowId),
      form.adAccountId ? Number(form.adAccountId) : null,
      form.paidMediaAppBindingId ? Number(form.paidMediaAppBindingId) : null,
    ),
    {
      enabled: !!form.appRowId && !Number.isNaN(Number(form.appRowId)),
      cacheKey: form.appRowId ? `meta-reference:app:${form.appRowId}:ad-account:${form.adAccountId || "none"}:binding:${form.paidMediaAppBindingId || "none"}:performance-goals` : "meta-reference:app:none:performance-goals",
    }
  )
  const {
    data: geoRegions,
    loading: geoRegionsLoading,
    error: geoRegionsError,
  } = useApi<MetaGeoRegionDto[]>(
    () => metaReferenceApi.getGeoRegions(),
    { cacheKey: "meta-reference:geo:regions" }
  )
  const {
    data: geoCountryGroups,
    loading: geoCountryGroupsLoading,
    error: geoCountryGroupsError,
    refetch: refetchGeoCountryGroups,
  } = useApi<GeoCountryGroupDto[]>(
    () => metaReferenceApi.getGeoCountryGroups(),
    { cacheKey: "meta-reference:geo:country-groups" }
  )

  const assetPreparationCacheKey = draftId ? `meta-request:${draftId}:asset-preparation` : "meta-request:new:asset-preparation"
  const {
    data: assetPreparation,
    loading: assetPreparationLoading,
    refetch: refetchAssetPreparation,
  } = useApi(
    () => metaRequestsApi.getAssetPreparation(draftId as number),
    {
      enabled: draftId != null,
      cacheKey: assetPreparationCacheKey,
    }
  )

  const assetPreparationById = useMemo(() => {
    const map = new Map<number, MetaAssetPreparationDto>()
    const parsedAdAccountId = form.adAccountId ? Number(form.adAccountId) : null
    const currentAdAccountId = parsedAdAccountId != null && Number.isFinite(parsedAdAccountId) ? parsedAdAccountId : null
    for (const asset of assetPreparation?.assets ?? []) {
      if (currentAdAccountId != null && asset.metaAdAccountId != null && asset.metaAdAccountId !== currentAdAccountId) {
        continue
      }
      map.set(asset.requestAssetId, asset)
    }
    return map
  }, [assetPreparation, form.adAccountId])

  const hasActiveAssetPreparation = useMemo(() => {
    return (assetPreparation?.assets ?? []).some((asset) => ["pending", "uploading", "processing"].includes(asset.status))
  }, [assetPreparation])

  useEffect(() => {
    if (!draftId || !hasActiveAssetPreparation) return

    const intervalId = window.setInterval(() => {
      void refetchAssetPreparation()
    }, 7000)

    return () => window.clearInterval(intervalId)
  }, [draftId, hasActiveAssetPreparation, refetchAssetPreparation])

  const selectedAdAccount = referenceData?.adAccounts.find((account) => account.id.toString() === form.adAccountId)
  const availableAppMappings = form.adAccountId ? (accountScopedAppMappings ?? []) : []
  const selectedAppMapping = availableAppMappings.find((mapping) => mapping.id.toString() === form.paidMediaAppBindingId)
    ?? referenceData?.appMappings.find((mapping) => mapping.id.toString() === form.paidMediaAppBindingId)
  const selectedAppPlatform = resolveMetaAppMappingPlatform(selectedAppMapping)
  const selectedIntegration = integrations?.find((integration) => integration.id === selectedAdAccount?.metaIntegrationId)

  const tokenState = deriveTokenState({
    adAccountId: form.adAccountId,
    canViewMetaAccounts,
    selectedAdAccountActive: selectedAdAccount?.isActive,
    integrationEnabled: selectedIntegration?.isEnabled,
    hasAccessToken: selectedIntegration?.hasAccessToken,
    tokenStatus: selectedIntegration?.tokenStatus,
  })

  const isSubmitBlocked = submitting || saving || validating || tokenState === "expired" || tokenState === "missing_permissions" || tokenState === "invalid" || tokenState === "disabled"

  useEffect(() => {
    const requiresValueDraftValidation =
      form.performanceGoalType === "VALUE"
      || bidStrategyRequiresRoasGoal(form.bidStrategy)
    const hasMinimumDraft =
      !!form.adAccountId
      && !!form.paidMediaAppBindingId
      && !!form.campaignName.trim()
      && !!form.adSetName.trim()
      && (!!form.campaignDailyBudget.trim() || !!form.campaignLifetimeBudget.trim() || !!form.adSetDailyBudget.trim() || !!form.adSetLifetimeBudget.trim())

    if (!requiresValueDraftValidation || !hasMinimumDraft) {
      adSetDraftValidationSeqRef.current += 1
      setAdSetDraftValidation(null)
      setAdSetDraftValidationLoading(false)
      return
    }

    const sequence = adSetDraftValidationSeqRef.current + 1
    adSetDraftValidationSeqRef.current = sequence
    setAdSetDraftValidationLoading(true)

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await metaReferenceApi.validateAdSetDraft(formStateToCreateDto(form))
        if (adSetDraftValidationSeqRef.current === sequence) {
          setAdSetDraftValidation(result)
        }
      } catch (error) {
        if (adSetDraftValidationSeqRef.current === sequence) {
          const message = error instanceof Error ? error.message : "Unable to verify Meta ad set draft right now."
          setAdSetDraftValidation({
            isValid: true,
            valueOptimizationEligibilityStatus: "unknown",
            warning: message,
            errors: [],
          })
        }
      } finally {
        if (adSetDraftValidationSeqRef.current === sequence) {
          setAdSetDraftValidationLoading(false)
        }
      }
    }, 800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [form])

  const scrollToSection = (target: RequestSectionTarget) => {
    setHighlightedSection(target)
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current)
    }
    if (typeof document !== "undefined") {
      const element = document.getElementById(requestSectionIds[target])
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSection((current) => (current === target ? null : current))
      highlightTimeoutRef.current = null
    }, 2200)
  }

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const updateForm = (patch: Partial<RequestFormState>) => {
    setForm((previous) => {
      const next = { ...previous, ...patch }

      if (patch.campaignObjective && patch.campaignObjective !== previous.campaignObjective) {
        const allowedPerformanceGoals = getAllowedPerformanceGoalTypes(patch.campaignObjective)
        if (!allowedPerformanceGoals.includes(next.performanceGoalType)) {
          next.performanceGoalType = allowedPerformanceGoals[0] ?? "APP_INSTALLS"
          next.performanceGoalEventName = ""
          next.performanceGoalValueType = "IN_APP_PURCHASE"
        }
      }

      if (patch.objective && patch.objective !== previous.objective && !patch.campaignObjective) {
        next.campaignObjective = patch.objective
      }

      // Variants only supported for SINGLE_MEDIA. If user switches to another type,
      // drop any additional variants (they wouldn't have meaningful per-variant media for non-supported types).
      if (
        patch.creativeType &&
        patch.creativeType !== previous.creativeType &&
        patch.creativeType !== "SINGLE_MEDIA" &&
        next.additionalVariants.length > 0
      ) {
        next.additionalVariants = []
      }

      const normalizedNext = patch.adAccountId && patch.adAccountId !== previous.adAccountId ? clearMetaLibrarySelectionsForAccountChange(next) : next

      return sanitizeRequestFormState(normalizedNext)
    })

    setIsDirty(true)
  }

  // ── Ad variant management ────────────────────────────────────────────
  const totalVariants = 1 + form.additionalVariants.length
  // Multi-variant ads only make sense when each variant has its own image/video.
  // For CAROUSEL / FLEXIBLE / EXISTING_POST, force a single variant.
  const supportsVariants = form.creativeType === "SINGLE_MEDIA"
  const canAddVariant = supportsVariants && totalVariants < MAX_AD_VARIANTS
  const maxSeqNumber = form.additionalVariants.reduce((max, v) => Math.max(max, v.sequenceNumber), 1)

  // If the active variant tab disappears (e.g. user changed creative type), reset to variant-1.
  useEffect(() => {
    if (activeVariantTab === "variant-1") return
    const seq = Number(activeVariantTab.replace("variant-", ""))
    if (!Number.isFinite(seq) || !form.additionalVariants.some((v) => v.sequenceNumber === seq)) {
      setActiveVariantTab("variant-1")
    }
  }, [activeVariantTab, form.additionalVariants])

  const handleAddVariant = () => {
    if (!canAddVariant) return
    const newSeq = maxSeqNumber + 1
    const newVariant = createEmptyAdVariant(newSeq, form)
    updateForm({ additionalVariants: [...form.additionalVariants, newVariant] })
    setActiveVariantTab(`variant-${newSeq}`)
  }

  const handleBulkMediaUpload = async (files: File[]) => {
    if (!supportsVariants || bulkUploading) return

    const inputFiles = files.filter(Boolean)
    if (inputFiles.length === 0) return

    const primaryHasMedia = hasSelectedMedia(form.singleImageImage, "image") || hasSelectedMedia(form.singleVideoVideo, "video")
    const primaryCanBeFilled = !primaryHasMedia
    const remainingAdditionalSlots = Math.max(0, MAX_AD_VARIANTS - (1 + form.additionalVariants.length))
    const capacity = remainingAdditionalSlots + (primaryCanBeFilled ? 1 : 0)

    if (capacity <= 0) {
      toast({ title: "Maximum variations reached", description: `Meta supports up to ${MAX_AD_VARIANTS} media variations.` })
      return
    }

    const acceptedFiles = inputFiles.slice(0, capacity)
    if (acceptedFiles.length < inputFiles.length) {
      toast({
        title: "Some files were skipped",
        description: `Added ${acceptedFiles.length}/${inputFiles.length} files. Maximum is ${MAX_AD_VARIANTS} variations.`,
      })
    }

    setBulkUploading(true)
    setBulkProgress({ done: 0, total: acceptedFiles.length })

    const primaryPatch: Partial<RequestFormState> = {}
    const newVariants: AdVariantFormState[] = []
    const failedFiles: string[] = []
    let fillPrimaryNext = primaryCanBeFilled
    let nextSeq = maxSeqNumber + 1
    let firstNewVariantSeq: number | null = null
    let uploadedCount = 0

    for (const [index, file] of acceptedFiles.entries()) {
      const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image"
      const mediaType = kind === "video" ? "VIDEO" : "IMAGE"

      try {
        const asset = await metaRequestsApi.uploadAsset(file, kind)
        const mediaSelection = buildUploadedMediaSelection(asset, file, kind)
        let thumbnailSelection: MetaRequestAssetSelectionState | null = null

        if (kind === "video") {
          try {
            const thumbnailFile = await captureVideoFrameToFile({ videoFile: file, timestampSeconds: 5 })
            const thumbnailAsset = await metaRequestsApi.uploadAsset(thumbnailFile, "image")
            thumbnailSelection = buildUploadedMediaSelection(thumbnailAsset, thumbnailFile, "image")
          } catch (error) {
            const message = error instanceof Error ? error.message : "Cannot generate thumbnail from this video."
            toast({ title: "Thumbnail generation failed", description: `${file.name}: ${message}`, variant: "destructive" })
          }
        }

        if (fillPrimaryNext) {
          if (kind === "video") {
            primaryPatch.mediaType = "VIDEO"
            primaryPatch.singleVideoVideo = mediaSelection
            if (thumbnailSelection) primaryPatch.singleVideoThumbnail = thumbnailSelection
          } else {
            primaryPatch.mediaType = "IMAGE"
            primaryPatch.singleImageImage = mediaSelection
          }
          fillPrimaryNext = false
        } else {
          const variant = createEmptyAdVariant(nextSeq++, form)
          variant.mediaType = mediaType
          if (kind === "video") {
            variant.singleVideoVideo = mediaSelection
            if (thumbnailSelection) variant.singleVideoThumbnail = thumbnailSelection
          } else {
            variant.singleImageImage = mediaSelection
          }
          newVariants.push(variant)
          firstNewVariantSeq ??= variant.sequenceNumber
        }

        uploadedCount += 1
      } catch {
        failedFiles.push(file.name)
      } finally {
        setBulkProgress({ done: index + 1, total: acceptedFiles.length })
      }
    }

    if (uploadedCount > 0) {
      updateForm({
        ...primaryPatch,
        additionalVariants: [...form.additionalVariants, ...newVariants],
      })

      if (firstNewVariantSeq != null) {
        setActiveVariantTab(`variant-${firstNewVariantSeq}`)
      } else if (Object.keys(primaryPatch).length > 0) {
        setActiveVariantTab("variant-1")
      }
    }

    if (failedFiles.length > 0) {
      toast({
        title: "Some files failed",
        description: `Added ${uploadedCount} variation${uploadedCount === 1 ? "" : "s"}. Failed: ${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}`,
        variant: "destructive",
      })
    } else if (uploadedCount > 0) {
      toast({ title: "Media variations added", description: `Added ${uploadedCount} file${uploadedCount === 1 ? "" : "s"}.` })
    }

    setBulkUploading(false)
    setBulkProgress(null)
  }

  /** Duplicate the primary variant (Variation #1 — backed by flat form fields). */
  const handleDuplicatePrimaryVariant = () => {
    if (!canAddVariant) return
    const newSeq = maxSeqNumber + 1
    const copy: AdVariantFormState = {
      sequenceNumber: newSeq,
      creativeType: form.creativeType,
      mediaType: form.mediaType,
      creativeName: form.creativeName ? `${form.creativeName} (Copy)` : "",
      facebookPageId: form.facebookPageId,
      instagramActorId: form.instagramActorId,
      singleImagePrimaryText: form.singleImagePrimaryText,
      singleImagePrimaryTexts: [...form.singleImagePrimaryTexts],
      singleImageHeadline: form.singleImageHeadline,
      singleImageHeadlines: [...form.singleImageHeadlines],
      singleImageDescription: form.singleImageDescription,
      singleImageCallToAction: form.singleImageCallToAction,
      singleImageLinkUrl: form.singleImageLinkUrl,
      singleImageImage: { ...form.singleImageImage },
      singleVideoPrimaryText: form.singleVideoPrimaryText,
      singleVideoPrimaryTexts: [...form.singleVideoPrimaryTexts],
      singleVideoHeadline: form.singleVideoHeadline,
      singleVideoHeadlines: [...form.singleVideoHeadlines],
      singleVideoDescription: form.singleVideoDescription,
      singleVideoCallToAction: form.singleVideoCallToAction,
      singleVideoLinkUrl: form.singleVideoLinkUrl,
      singleVideoVideo: { ...form.singleVideoVideo },
      singleVideoThumbnail: { ...form.singleVideoThumbnail },
      carouselPrimaryText: form.carouselPrimaryText,
      carouselCallToAction: form.carouselCallToAction,
      carouselCards: form.carouselCards.map((c) => ({ ...c })),
      flexiblePrimaryTexts: [...form.flexiblePrimaryTexts],
      flexibleHeadlines: [...form.flexibleHeadlines],
      flexibleCallToAction: form.flexibleCallToAction,
      flexibleLinkUrl: form.flexibleLinkUrl,
      flexibleAssets: form.flexibleAssets.map((a) => ({ ...a })),
      existingPostId: form.existingPostId,
      adName: form.adName ? `${form.adName} (Copy)` : "",
      trackingSpecs: form.trackingSpecs,
      advantageCreativeAllOptimizations: form.advantageCreativeAllOptimizations,
      advantageCreativeAddTextOverlay: form.advantageCreativeAddTextOverlay,
      advantageCreativeImageTouchups: form.advantageCreativeImageTouchups,
      advantageCreativeMusicGeneration: form.advantageCreativeMusicGeneration,
      advantageCreativeTextOptimizations: form.advantageCreativeTextOptimizations,
      advantageCreativeImageAnimation: form.advantageCreativeImageAnimation,
      advantageCreativeInlineComment: form.advantageCreativeInlineComment,
    }
    updateForm({ additionalVariants: [...form.additionalVariants, copy] })
    setActiveVariantTab(`variant-${newSeq}`)
  }

  /** Duplicate an additional variant by its sequenceNumber. */
  const handleDuplicateVariant = (seqNumber: number) => {
    if (!canAddVariant) return
    const source = form.additionalVariants.find((v) => v.sequenceNumber === seqNumber)
    if (!source) return
    const newSeq = maxSeqNumber + 1
    const copy: AdVariantFormState = {
      ...source,
      sequenceNumber: newSeq,
      creativeName: source.creativeName ? `${source.creativeName} (Copy)` : "",
      adName: source.adName ? `${source.adName} (Copy)` : "",
      carouselCards: source.carouselCards.map((c) => ({ ...c })),
      flexibleAssets: source.flexibleAssets.map((a) => ({ ...a })),
    }
    updateForm({ additionalVariants: [...form.additionalVariants, copy] })
    setActiveVariantTab(`variant-${newSeq}`)
  }

  const handleDeleteVariant = (seqNumber: number) => {
    if (activeVariantTab === `variant-${seqNumber}`) {
      setActiveVariantTab("variant-1")
    }
    updateForm({ additionalVariants: form.additionalVariants.filter((v) => v.sequenceNumber !== seqNumber) })
  }

  const handleUpdateAdditionalVariant = (seqNumber: number, patch: Partial<AdVariantFormState>) => {
    updateForm({
      additionalVariants: form.additionalVariants.map((v) =>
        v.sequenceNumber === seqNumber ? { ...v, ...patch } : v
      ),
    })
  }

  const syncFromDetail = (statusDetail: MetaCampaignRequestDetailDto) => {
    setDraftId(statusDetail.id)
    setServerStatus(statusDetail.status)
    setIdempotencyKey(statusDetail.idempotencyKey || idempotencyKey)
    setValidationErrors(parseValidationErrorsJson(statusDetail.validationErrorsJson))
    setIsDirty(false)
  }

  useEffect(() => {
    if (!editDetail || loadedRequestId === editDetail.id) return
    setForm(sanitizeRequestFormState(detailDtoToFormState(editDetail)))
    syncFromDetail(editDetail)
    setLoadedRequestId(editDetail.id)
  }, [editDetail, loadedRequestId])
  useEffect(() => {
    if (!form.adAccountId) {
      setFacebookPageSource("promote_pages")
    }
  }, [form.adAccountId])


  const persistDraft = async ({ silent }: { silent?: boolean } = {}) => {
    const previousStatus = serverStatus
    const response = draftId
      ? await metaRequestsApi.update(draftId, formStateToUpdateDto(form))
      : await metaRequestsApi.create(formStateToCreateDto(form, idempotencyKey))

    syncFromDetail(response)
    invalidateMetaRequestCaches(response.status)
    invalidateCache("meta-reference:create-campaign")
    invalidateCache(`meta-request:${response.id}`)

    if (response.metaAdAccountId && collectUploadedAssetIds(form).length > 0) {
      try {
        const queued = await metaRequestsApi.queueAssetPreparation(response.id)
        invalidateCache(`meta-request:${response.id}:asset-preparation`)
        if (draftId === response.id) {
          await refetchAssetPreparation(() => Promise.resolve(queued))
        }
      } catch (queueError) {
        const message = queueError instanceof Error ? queueError.message : "Asset preparation queue failed."
        toast({ title: "Meta asset preparation not queued", description: message, variant: "destructive" })
      }
    }

    if (!silent) {
      const sentBackForApproval = !!previousStatus && previousStatus !== "draft" && response.status === "pending_approval"
      toast({
        title: sentBackForApproval ? "Changes saved" : draftId ? "Draft updated" : "Draft saved",
        description: sentBackForApproval
          ? "Request was returned for approval."
          : "Your Meta campaign request draft has been saved.",
      })
    }

    return response
  }

  const handleRetryAssetPreparation = async (assetId: number) => {
    if (!form.adAccountId) {
      toast({ title: "Select a Meta ad account", description: "Assets are uploaded to Meta per ad account before execution.", variant: "destructive" })
      return
    }

    try {
      await metaRequestsApi.retryAssetMetaUpload(assetId, Number(form.adAccountId))
      if (draftId) {
        invalidateCache(`meta-request:${draftId}:asset-preparation`)
        await refetchAssetPreparation()
      }
      toast({ title: "Retry queued", description: "The asset will be uploaded to Meta again." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to retry Meta upload."
      toast({ title: "Retry failed", description: message, variant: "destructive" })
    }
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const saved = await persistDraft()
      if (isEditMode && saved.status === "pending_approval") {
        router.push(`/meta-ads/requests/${saved.id}`)
      }
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Failed to save draft."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    try {
      setValidating(true)
      const detail = draftId || isDirty ? await persistDraft({ silent: true }) : null
      const currentDraftId = detail?.id ?? draftId

      if (!currentDraftId) {
        throw new Error("Draft must be created before validation.")
      }

      const result = await metaRequestsApi.validate(currentDraftId)
      const groupedErrors = groupValidationErrors(result.errors)
      setValidationErrors(groupedErrors)
      invalidateCache(`meta-request:${currentDraftId}`)

      if (result.isValid) {
        toast({ title: "Validation passed", description: "Request is ready to submit for approval." })
      } else {
        toast({ title: "Validation failed", description: "Please fix the validation issues before submitting.", variant: "destructive" })
      }
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Validation failed."
      toast({ title: "Validation failed", description: message, variant: "destructive" })
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const detail = !draftId || isDirty ? await persistDraft({ silent: true }) : null
      const currentDraftId = detail?.id ?? draftId
      if (!currentDraftId) throw new Error("Draft must be saved before submitting.")

      const submitted = await metaRequestsApi.submit(currentDraftId)
      syncFromDetail(submitted)
      invalidateMetaRequestCaches(submitted.status)
      invalidateCache(`meta-request:${submitted.id}`)
      setSubmitOpen(false)
      toast({ title: "Request submitted for approval" })
      router.push(`/meta-ads/requests/${submitted.id}`)
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Submit failed."
      toast({ title: "Submit failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const discardHref = isEditMode && draftId ? `/meta-ads/requests/${draftId}` : "/meta-ads/requests"
  const showSubmitButton = !isEditMode || serverStatus === null || serverStatus === "draft"

  if (referenceLoading || (isEditMode && editLoading && loadedRequestId == null)) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading request form...
      </div>
    )
  }

  if (referenceError || !referenceData || (isEditMode && editError)) {
    return (
      <div className="py-24 text-center text-sm text-red-600">
        {editError?.message ?? referenceError?.message ?? "Unable to load Meta Ads reference data."}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
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
            <span className="text-slate-900 font-medium">{isEditMode ? "Edit" : "Create"}</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">{isEditMode ? "Edit Meta Campaign Request" : "Create Meta Campaign Request"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEditMode
              ? "Update the request payload. Saving changes for a non-draft request sends it back for approval."
              : "Internal request only. Meta objects are created after approval and execution. Campaign starts PAUSED; Ad Set and Ads start ACTIVE."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => (isDirty ? setDiscardOpen(true) : router.push(discardHref))}>
            Discard
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleSaveDraft()} disabled={saving || referenceLoading || editLoading}>
            {saving ? "Saving..." : isEditMode ? "Save Changes" : draftId ? "Update Draft" : "Save Draft"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleValidate()} disabled={validating || referenceLoading || editLoading}>
            {validating ? "Validating..." : "Validate"}
          </Button>
          {showSubmitButton ? (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              disabled={isSubmitBlocked}
              onClick={() => setSubmitOpen(true)}
              title={tokenState !== "ready" && tokenState !== "none" ? "Integration readiness issue" : ""}
            >
              Submit for Approval
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900">
          {isEditMode ? (
            <>
              <strong>Editing an approved, rejected, completed, or failed request will require approval again.</strong> Existing execution history stays visible in activity logs, but the request itself returns to the approval flow after changes are saved.
            </>
          ) : (
            <>
              <strong>This request will NOT create a live campaign.</strong> Meta objects are created only after internal approval and execution. Campaign starts in <strong>PAUSED</strong> state; Ad Set and Ads start in <strong>ACTIVE</strong> state.
            </>
          )}
        </div>
      </div>
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div id={requestSectionIds["account-app"]} className={getSectionWrapperClass("account-app", highlightedSection)}>
            <AccountAppSection
              form={form}
              onChange={updateForm}
              tokenState={tokenState}
              adAccounts={referenceData.adAccounts}
              appMappings={availableAppMappings}
              selectedAppMapping={selectedAppMapping}
              appMappingsLoading={accountScopedAppMappingsLoading}
              appMappingsMessage={accountScopedAppMappingsError?.message ?? null}
              objectives={referenceData.objectives}
              integrationName={selectedIntegration?.displayName}
            />
          </div>
          <div id={requestSectionIds["campaign-settings"]} className={getSectionWrapperClass("campaign-settings", highlightedSection)}>
            <CampaignSettingsSection
              form={form}
              onChange={updateForm}
              objectives={referenceData.objectives}
              bidStrategies={referenceData.bidStrategies}
              currencyCode={selectedAdAccount?.currency}
              selectedAppMapping={selectedAppMapping}
            />
          </div>
          <div id={requestSectionIds["adset-audience"]} className={getSectionWrapperClass("adset-audience", highlightedSection)}>
            <AdSetAudienceSection
              form={form}
              onChange={updateForm}
              regions={geoRegions ?? []}
              regionsLoading={geoRegionsLoading}
              regionsMessage={geoRegionsError?.message ?? null}
              countryGroups={geoCountryGroups ?? []}
              countryGroupsLoading={geoCountryGroupsLoading}
              countryGroupsMessage={geoCountryGroupsError?.message ?? null}
              onCountryGroupsChanged={() => void refetchGeoCountryGroups()}
              metaAdAccountId={form.adAccountId ? Number(form.adAccountId) : null}
            />
          </div>
          <div id={requestSectionIds["adset-budget"]} className={getSectionWrapperClass("adset-budget", highlightedSection)}>
                <AdSetBudgetSection form={form} onChange={updateForm} currencyCode={selectedAdAccount?.currency} appPlatform={selectedAppPlatform} appRowId={form.appRowId ? Number(form.appRowId) : null} performanceGoalReference={performanceGoalReference ?? null} performanceGoalReferenceLoading={performanceGoalReferenceLoading} performanceGoalReferenceMessage={performanceGoalReferenceError?.message ?? null} refreshPerformanceGoalReference={refetchPerformanceGoalReference} adSetDraftValidation={adSetDraftValidation} adSetDraftValidationLoading={adSetDraftValidationLoading} />
          </div>
          {/* Creative section — variations now live inside CreativeSection itself,
              between Primary Text/Headline (shared above) and Description/CTA (shared below). */}
          <div id={requestSectionIds["creative"]} className={getSectionWrapperClass("creative", highlightedSection)}>
            <CreativeSection
              form={form}
              onChange={updateForm}
              facebookPages={facebookPages ?? []}
              facebookPagesLoading={facebookPagesLoading}
              selectedAppMapping={selectedAppMapping}
              adAccountId={form.adAccountId ? Number(form.adAccountId) : null}
              facebookPagesMessage={facebookPagesError?.message ?? null}
              facebookPageSource={facebookPageSource}
              onFacebookPageSourceChange={setFacebookPageSource}
              additionalVariants={form.additionalVariants}
              activeVariantTab={activeVariantTab}
              onActiveVariantTabChange={setActiveVariantTab}
              onAddVariant={handleAddVariant}
              onDuplicateVariant={(seq) => {
                if (seq === "primary") {
                  handleDuplicatePrimaryVariant()
                } else {
                  handleDuplicateVariant(seq)
                }
              }}
              onDeleteVariant={handleDeleteVariant}
              onUpdateAdditionalVariant={handleUpdateAdditionalVariant}
              canAddVariant={canAddVariant}
              supportsVariants={supportsVariants}
              onBulkMediaUpload={handleBulkMediaUpload}
              bulkUploading={bulkUploading}
              bulkProgress={bulkProgress}
              assetPreparationById={assetPreparationById}
              assetPreparationLoading={assetPreparationLoading}
              onRetryAssetPreparation={handleRetryAssetPreparation}
            />
          </div>
          {/* Ad section — shared. Ad Name for additional variants is auto-suffixed `_v{N}` by the mapper. */}
          <div id={requestSectionIds["ad"]} className={getSectionWrapperClass("ad", highlightedSection)}>
            <AdSection form={form} onChange={updateForm} />
          </div>
        </div>

        <div className="w-72 flex-shrink-0 sticky top-20">
          <RequestSummaryRail
            form={form}
            serverStatus={serverStatus}
            validationErrors={validationErrors}
            tokenState={tokenState}
            selectedAppMapping={selectedAppMapping}
            isPersisted={!!draftId}
            onNavigateToSection={scrollToSection}
          />
        </div>
      </div>

      {showSubmitButton ? (
        <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit for Approval?</AlertDialogTitle>
              <AlertDialogDescription>
                This will submit your campaign request for internal review. No Meta objects will be created at this stage. After approval and execution, Campaign will be created in <strong>PAUSED</strong> state while Ad Set and Ads are created in <strong>ACTIVE</strong> state.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submitting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
              >
                {submitting ? "Submitting..." : "Submit for Approval"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All unsaved edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => router.push(discardHref)}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
