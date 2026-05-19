"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ChevronRight, Loader2, Save, Send, ShieldCheck, Trash2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { tiktokCampaignRequestsApi, tiktokReferenceApi } from "@/lib/api/tiktok-ads"
import { cn } from "@/lib/utils"
import type { TikTokCampaignRequestDetailDto, TikTokCreativeImageDto, TikTokCreativeVideoDto, TikTokIdentityOptionDto, TikTokReferenceResponseDto, TikTokRequestAssetDto, TikTokTargetingOptionsResponseDto, TikTokValidationResultDto } from "@/types/tiktok-ads"
import { AccountAppSection } from "./section-account-app"
import { AdGroupAudienceSection } from "./section-adgroup-audience"
import { AdGroupBudgetSection } from "./section-adgroup-budget"
import { CampaignSettingsSection } from "./section-campaign-settings"
import { CreativeSection } from "./section-creative"
import { TikTokRequestSummaryRail } from "./summary-rail"
import {
  buildIdempotencyKey,
  createDefaultTikTokRequestForm,
  normalizeTikTokRequestPayloadShape,
  requestSectionIds,
  sanitizeTikTokCreative,
  sanitizeTikTokRequestForm,
  type TikTokRequestFormState,
  type TikTokRequestSectionTarget,
} from "./types"

interface Props {
  requestId?: number
}

const THUMBNAIL_RATIO_TOLERANCE = 0.01

interface MediaDimensions {
  width: number
  height: number
  ratio: number
}

function getSectionWrapperClass(target: TikTokRequestSectionTarget, highlightedSection: TikTokRequestSectionTarget | null): string {
  const base = "-m-2 rounded-2xl p-2 scroll-mt-24 transition-all duration-500"
  if (highlightedSection !== target) return base
  return `${base} bg-sky-50/90 ring-2 ring-sky-200 ring-offset-2 ring-offset-sky-100/70 shadow-[0_0_0_8px_rgba(186,230,253,0.28)]`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function toMediaDimensions(width: number, height: number): MediaDimensions {
  if (!width || !height) throw new Error("Unable to read media dimensions.")
  return { width, height, ratio: width / height }
}

function readVideoDimensions(blob: Blob): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement("video")
    const cleanup = () => URL.revokeObjectURL(url)
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      try {
        resolve(toMediaDimensions(video.videoWidth, video.videoHeight))
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    video.onerror = () => {
      cleanup()
      reject(new Error("Unable to read video dimensions."))
    }
    video.src = url
    video.load()
  })
}

function readImageDimensions(blob: Blob): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new window.Image()
    const cleanup = () => URL.revokeObjectURL(url)
    image.onload = () => {
      try {
        resolve(toMediaDimensions(image.naturalWidth, image.naturalHeight))
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    image.onerror = () => {
      cleanup()
      reject(new Error("Unable to read image dimensions."))
    }
    image.src = url
  })
}

function ratiosMatch(expectedRatio: number, actualRatio: number): boolean {
  return Math.abs(expectedRatio - actualRatio) / expectedRatio <= THUMBNAIL_RATIO_TOLERANCE
}

function formatRatio(ratio: number): string {
  return ratio.toFixed(3)
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function formatAspectRatio(dimensions: MediaDimensions): string {
  const width = Math.round(dimensions.width)
  const height = Math.round(dimensions.height)
  const divisor = greatestCommonDivisor(width, height)
  return `${width / divisor}:${height / divisor}`
}

function uploadKey(index: number, kind: "image" | "video") {
  return `${index}:${kind}`
}

function getTargetingPlacementParam(form: TikTokRequestFormState) {
  const placements = form.adGroup.placementType === "PLACEMENT_TYPE_NORMAL" && form.adGroup.placements.length > 0
    ? form.adGroup.placements
    : ["PLACEMENT_TIKTOK"]
  return Array.from(new Set(placements.map((item) => item.trim().toUpperCase()).filter(Boolean))).join(",")
}

function getTargetingOperatingSystem(form: TikTokRequestFormState, selectedAppMapping?: { appPlatform?: string | null } | null) {
  const fromForm = form.adGroup.operatingSystems.find((item) => item.trim())
  const raw = fromForm || selectedAppMapping?.appPlatform || ""
  const normalized = raw.trim().toUpperCase()
  return normalized === "ANDROID" || normalized === "IOS" ? normalized : undefined
}

function normalizeIdentityType(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  return !normalized || normalized === "CUSTOMIZED_USER" ? "AUTH_CODE" : normalized
}

function identityOptionKey(identityId?: string | null, identityType?: string | null, identityAuthorizedBcId?: string | null) {
  if (!identityId?.trim()) return ""
  return `${normalizeIdentityType(identityType)}:${identityId.trim()}:${identityAuthorizedBcId?.trim() ?? ""}`
}

function mergeWithDefault(payload: Partial<TikTokRequestFormState>, reference: TikTokReferenceResponseDto): TikTokRequestFormState {
  const fallback = createDefaultTikTokRequestForm(reference)
  const normalized = normalizeTikTokRequestPayloadShape(payload)
  const ads = normalized.ads?.length ? normalized.ads : [normalized.ad ?? fallback.ad]
  return sanitizeTikTokRequestForm({
    ...fallback,
    ...normalized,
    campaign: { ...fallback.campaign, ...normalized.campaign },
    adGroup: { ...fallback.adGroup, ...normalized.adGroup },
    ad: { ...fallback.ad, ...ads[0] },
    ads: ads.map((ad) => ({ ...fallback.ad, ...ad })),
  })
}

function parsePayload(detail: TikTokCampaignRequestDetailDto, reference: TikTokReferenceResponseDto): TikTokRequestFormState {
  try {
    const parsed = normalizeTikTokRequestPayloadShape(JSON.parse(detail.payloadJson))
    return mergeWithDefault({ ...parsed, idempotencyKey: parsed.idempotencyKey ?? detail.idempotencyKey }, reference)
  } catch {
    return mergeWithDefault({ idempotencyKey: detail.idempotencyKey }, reference)
  }
}

export function CreateTikTokRequestContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [reference, setReference] = useState<TikTokReferenceResponseDto | null>(null)
  const [form, setForm] = useState<TikTokRequestFormState | null>(null)
  const [activeAdGroupIndex, setActiveAdGroupIndex] = useState(0)
  const [draftId, setDraftId] = useState<number | null>(requestId ?? null)
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadedAssetsById, setUploadedAssetsById] = useState<Record<number, TikTokRequestAssetDto>>({})
  const [videoRatiosByAssetId, setVideoRatiosByAssetId] = useState<Record<number, { ratio: number; label: string }>>({})
  const [creativeValidationMessages, setCreativeValidationMessages] = useState<Record<number, string | null>>({})
  const [identityOptions, setIdentityOptions] = useState<TikTokIdentityOptionDto[]>([])
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityLoadError, setIdentityLoadError] = useState<string | null>(null)
  const [libraryVideos, setLibraryVideos] = useState<TikTokCreativeVideoDto[]>([])
  const [libraryImages, setLibraryImages] = useState<TikTokCreativeImageDto[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryLoadError, setLibraryLoadError] = useState<string | null>(null)
  const [librarySearch, setLibrarySearch] = useState<{ video: string; image: string }>({ video: "", image: "" })
  const [libraryEnabled, setLibraryEnabled] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({})
  const [targetingOptions, setTargetingOptions] = useState<TikTokTargetingOptionsResponseDto | null>(null)
  const [targetingLoading, setTargetingLoading] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [highlightedSection, setHighlightedSection] = useState<TikTokRequestSectionTarget | null>(null)

  const selectedAdAccount = useMemo(
    () => reference?.adAccounts.find((account) => account.id === form?.tikTokAdAccountRowId),
    [form?.tikTokAdAccountRowId, reference],
  )
  const selectedAppMapping = useMemo(
    () => reference?.appMappings.find((mapping) => mapping.appRowId === form?.appRowId) ?? reference?.appMappings.find((mapping) => mapping.tikTokAppId === form?.adGroup.appId),
    [form?.appRowId, reference],
  )
  const targetingAdAccountId = form?.tikTokAdAccountRowId ?? 0
  const targetingObjectiveType = form?.campaign.objectiveType || "APP_PROMOTION"
  const targetingPlacements = form ? getTargetingPlacementParam(form) : "PLACEMENT_TIKTOK"
  const targetingOperatingSystem = form ? getTargetingOperatingSystem(form, selectedAppMapping) : undefined
  const accountScopedAppMappings = useMemo(() => {
    if (!reference || !selectedAdAccount) return []
    const advertiserId = selectedAdAccount.advertiserId
    const matched = reference.appMappings.filter((mapping) => mapping.advertiserIds?.some((id) => id === advertiserId))
    if (selectedAppMapping && !matched.some((mapping) => mapping.id === selectedAppMapping.id)) {
      return [selectedAppMapping, ...matched]
    }
    return matched
  }, [reference, selectedAdAccount, selectedAppMapping])

  useEffect(() => {
    let cancelled = false

    async function hydrateUploadedAssets(payload: TikTokRequestFormState) {
      setUploadedAssetsById({})
      setVideoRatiosByAssetId({})
      setCreativeValidationMessages({})

      const ads = payload.ads.length ? payload.ads : [payload.ad]
      const assetIds = Array.from(new Set(ads.flatMap((ad) => [...(ad.videoAssetIds ?? []), ...ad.imageAssetIds]).filter((id): id is number => Boolean(id))))
      const nextAssets: Record<number, TikTokRequestAssetDto> = {}
      const nextRatios: Record<number, { ratio: number; label: string }> = {}

      for (const assetId of assetIds) {
        try {
          const asset = await tiktokCampaignRequestsApi.getAsset(assetId)
          if (cancelled) return
          nextAssets[assetId] = asset

          if (asset.kind === "video") {
            const { blob } = await tiktokCampaignRequestsApi.getAssetContentBlob(assetId)
            const dimensions = await readVideoDimensions(blob)
            if (cancelled) return
            nextRatios[assetId] = { ratio: dimensions.ratio, label: formatAspectRatio(dimensions) }
          }
        } catch (error) {
          if (!cancelled) {
            toast({ title: "Load creative asset failed", description: errorMessage(error), variant: "destructive" })
          }
        }
      }

      if (!cancelled) {
        setUploadedAssetsById(nextAssets)
        setVideoRatiosByAssetId(nextRatios)
      }
    }

    async function load() {
      setLoading(true)
      try {
        const ref = await tiktokReferenceApi.getCreateCampaign()
        if (cancelled) return
        setReference(ref)

        if (requestId) {
          const detail = await tiktokCampaignRequestsApi.getRequest(requestId)
          if (cancelled) return
          const parsed = parsePayload(detail, ref)
          setForm(parsed)
          setDraftId(detail.id)
          setServerStatus(detail.status)
          setValidationErrors(detail.validationErrors ?? [])
          if (parsed.adGroups.some((group) => group.ads.some((ad) => (ad.videoIds?.length ?? 0) > 0 || ad.videoId?.trim()))) setLibraryEnabled(true)
          await hydrateUploadedAssets(parsed)
        } else {
          const next = createDefaultTikTokRequestForm(ref)
          setForm(next)
          setDraftId(null)
          setServerStatus("draft")
          setValidationErrors([])
          setUploadedAssetsById({})
          setVideoRatiosByAssetId({})
          setCreativeValidationMessages({})
        }

        setIsDirty(false)
      } catch (error) {
        toast({ title: "Load TikTok request form failed", description: errorMessage(error), variant: "destructive" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    }
  }, [requestId, toast])

  const requestedLibraryVideoIds = useMemo(
    () => form?.ads.flatMap((ad) => ad.videoIds?.length ? ad.videoIds : ad.videoId ? [ad.videoId] : []) ?? [],
    [form?.ads],
  )
  const requestedLibraryImageIds = useMemo(
    () => form?.ads.flatMap((ad) => ad.imageIds ?? []) ?? [],
    [form?.ads],
  )

  useEffect(() => {
    let cancelled = false
    const adAccountId = targetingAdAccountId
    if (!adAccountId) {
      setTargetingOptions(null)
      setTargetingLoading(false)
      return
    }
    const selectedAdAccountId = adAccountId

    async function loadTargetingOptions() {
      setTargetingLoading(true)
      try {
        const options = await tiktokReferenceApi.getTargetingOptions(selectedAdAccountId, {
          objectiveType: targetingObjectiveType,
          placements: targetingPlacements,
          operatingSystem: targetingOperatingSystem,
          levelRange: "TO_PROVINCE",
        })
        if (!cancelled) setTargetingOptions(options)
      } catch (error) {
        if (!cancelled) {
          setTargetingOptions({
            locations: [],
            languages: [],
            source: "client-fallback",
            loadedAt: new Date().toISOString(),
            errorMessage: errorMessage(error),
          })
        }
      } finally {
        if (!cancelled) setTargetingLoading(false)
      }
    }

    void loadTargetingOptions()
    return () => { cancelled = true }
  }, [targetingAdAccountId, targetingObjectiveType, targetingOperatingSystem, targetingPlacements])

  useEffect(() => {
    let cancelled = false
    const adAccountId = targetingAdAccountId
    if (!adAccountId) {
      setIdentityOptions([])
      setIdentityLoading(false)
      setIdentityLoadError(null)
      return
    }

    async function loadIdentities() {
      setIdentityLoading(true)
      setIdentityLoadError(null)
      try {
        const identities = await tiktokReferenceApi.getIdentities(adAccountId)
        if (!cancelled) setIdentityOptions(identities)
      } catch (error) {
        if (!cancelled) {
          setIdentityOptions([])
          setIdentityLoadError(errorMessage(error))
        }
      } finally {
        if (!cancelled) setIdentityLoading(false)
      }
    }

    void loadIdentities()
    return () => { cancelled = true }
  }, [targetingAdAccountId])

  useEffect(() => {
    let cancelled = false
    const adAccountId = targetingAdAccountId
    if (!adAccountId || !libraryEnabled) {
      if (!libraryEnabled) {
        setLibraryVideos([])
        setLibraryImages([])
        setLibraryLoadError(null)
      }
      return
    }

    const handle = window.setTimeout(async () => {
      setLibraryLoading(true)
      setLibraryLoadError(null)
      try {
        const [videoPage, imagePage] = await Promise.all([
          tiktokReferenceApi.getLibraryVideos(adAccountId, { search: librarySearch.video || undefined, videoIds: requestedLibraryVideoIds, pageSize: 50 }),
          tiktokReferenceApi.getLibraryImages(adAccountId, { search: librarySearch.image || undefined, imageIds: requestedLibraryImageIds, pageSize: 50 }),
        ])
        if (cancelled) return
        setLibraryVideos(videoPage.items)
        setLibraryImages(imagePage.items)
      } catch (error) {
        if (!cancelled) {
          setLibraryVideos([])
          setLibraryImages([])
          setLibraryLoadError(errorMessage(error))
        }
      } finally {
        if (!cancelled) setLibraryLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [targetingAdAccountId, libraryEnabled, librarySearch.video, librarySearch.image, requestedLibraryVideoIds, requestedLibraryImageIds])

  const handleLibrarySearch = useCallback((kind: "video" | "image", query: string) => {
    setLibrarySearch((prev) => prev[kind] === query ? prev : { ...prev, [kind]: query })
  }, [])

  const handleLibraryEnabledChange = useCallback((enabled: boolean) => {
    setLibraryEnabled((prev) => prev || enabled)
  }, [])

  const updateForm = useCallback((patch: Partial<TikTokRequestFormState>) => {
    setForm((current) => {
      if (!current) return current
      const groups = current.adGroups?.length ? [...current.adGroups] : [{ adGroup: current.adGroup, ads: current.ads }]
      const safeIndex = Math.min(activeAdGroupIndex, Math.max(groups.length - 1, 0))
      if (patch.adGroup || patch.ads || patch.ad) {
        const currentGroup = groups[safeIndex] ?? { adGroup: current.adGroup, ads: current.ads }
        groups[safeIndex] = {
          adGroup: patch.adGroup ?? currentGroup.adGroup,
          ads: patch.ads ?? currentGroup.ads,
        }
      }
      return sanitizeTikTokRequestForm({ ...current, ...patch, adGroups: groups })
    })
    setIsDirty(true)
  }, [activeAdGroupIndex])

  const selectAdGroup = useCallback((index: number) => {
    setActiveAdGroupIndex(index)
    setForm((current) => {
      if (!current) return current
      const group = current.adGroups?.[index]
      if (!group) return current
      return sanitizeTikTokRequestForm({ ...current, adGroup: group.adGroup, ads: group.ads, ad: group.ads[0] })
    })
  }, [])

  const navigateToSection = useCallback((target: TikTokRequestSectionTarget) => {
    const element = document.getElementById(requestSectionIds[target])
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" })
    setHighlightedSection(target)
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    highlightTimeoutRef.current = setTimeout(() => setHighlightedSection(null), 1400)
  }, [])

  const persistDraft = useCallback(async (options?: { silent?: boolean }) => {
    if (!form) throw new Error("Form is not ready")
    if (!form.tikTokAdAccountRowId) throw new Error("Select a TikTok ad account before saving.")
    if (!form.appRowId) throw new Error("Select an app mapping before saving.")

    const payload = sanitizeTikTokRequestForm({
      ...form,
      idempotencyKey: form.idempotencyKey || buildIdempotencyKey(),
      adGroup: {
        ...form.adGroup,
        appId: selectedAppMapping?.tikTokAppId ?? form.adGroup.appId,
        appDownloadUrl: selectedAppMapping?.downloadUrl ?? form.adGroup.appDownloadUrl,
      },
      ads: form.ads.map((ad) => ({
        ...ad,
        landingPageUrl: ad.landingPageUrl || selectedAppMapping?.downloadUrl || "",
      })),
      adGroups: (form.adGroups?.length ? form.adGroups : [{ adGroup: form.adGroup, ads: form.ads }]).map((group) => ({
        adGroup: {
          ...group.adGroup,
          appId: selectedAppMapping?.tikTokAppId ?? group.adGroup.appId,
          appDownloadUrl: selectedAppMapping?.downloadUrl ?? group.adGroup.appDownloadUrl,
        },
        ads: group.ads.map((ad) => ({
          ...ad,
          landingPageUrl: ad.landingPageUrl || selectedAppMapping?.downloadUrl || "",
        })),
      })),
    })

    const detail = draftId ? await tiktokCampaignRequestsApi.update(draftId, payload) : await tiktokCampaignRequestsApi.create(payload)
    setDraftId(detail.id)
    setServerStatus(detail.status)
    setValidationErrors(detail.validationErrors ?? [])
    setForm(reference ? parsePayload(detail, reference) : payload)
    setIsDirty(false)

    if (!draftId && !requestId) {
      router.replace(`/tiktok-ads/requests/${detail.id}/edit`)
    }
    if (!options?.silent) {
      toast({ title: "Draft saved", description: `Request #${detail.id}` })
    }

    return detail
  }, [draftId, form, reference, requestId, router, selectedAppMapping, toast])

  const runValidation = useCallback(async (id: number): Promise<TikTokValidationResultDto> => {
    const result = await tiktokCampaignRequestsApi.validate(id)
    setValidationErrors(result.errors ?? [])
    toast({
      title: result.isValid ? "Validation passed" : "Validation failed",
      description: result.errors?.join("; ") || undefined,
      variant: result.isValid ? "default" : "destructive",
    })
    return result
  }, [toast])

  function getIdentitySelectionIssue() {
    if (!form?.tikTokAdAccountRowId) return null
    if (identityLoading) return "TikTok identities are still loading for the selected ad account."
    if (identityLoadError) return `Unable to load TikTok identities: ${identityLoadError}`
    if (identityOptions.length === 0) return "Selected TikTok ad account has no usable identities."
    const ads = form.ads.length ? form.ads : [form.ad]
    for (let index = 0; index < ads.length; index += 1) {
      const selectedKey = identityOptionKey(ads[index].identityId, ads[index].identityType, ads[index].identityAuthorizedBcId)
      const prefix = ads.length === 1 ? "TikTok identity" : `Creative #${index + 1} identity`
      if (!selectedKey) return `${prefix} is required.`
      if (!identityOptions.some((option) => option.key === selectedKey)) return `${prefix} is no longer available. Choose a current identity.`
    }
    return null
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      const detail = await persistDraft()
      if (requestId) router.push(`/tiktok-ads/requests/${detail.id}`)
    } catch (error) {
      toast({ title: "Save draft failed", description: errorMessage(error), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleValidate() {
    setValidating(true)
    try {
      const identityIssue = getIdentitySelectionIssue()
      if (identityIssue) {
        setValidationErrors([identityIssue])
        toast({ title: "Validation failed", description: identityIssue, variant: "destructive" })
        return
      }
      const detail = !draftId || isDirty ? await persistDraft({ silent: true }) : null
      await runValidation(detail?.id ?? draftId!)
    } catch (error) {
      toast({ title: "Validate request failed", description: errorMessage(error), variant: "destructive" })
    } finally {
      setValidating(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const detail = !draftId || isDirty ? await persistDraft({ silent: true }) : null
      const currentId = detail?.id ?? draftId
      if (!currentId) throw new Error("Draft is not saved")
      const identityIssue = getIdentitySelectionIssue()
      if (identityIssue) {
        setValidationErrors([identityIssue])
        toast({ title: "Submit request failed", description: identityIssue, variant: "destructive" })
        return
      }
      const validation = await runValidation(currentId)
      if (!validation.isValid) return
      const submitted = await tiktokCampaignRequestsApi.submit(currentId)
      toast({ title: "Request submitted", description: `Request #${submitted.id} is pending approval.` })
      router.push(`/tiktok-ads/requests/${submitted.id}`)
    } catch (error) {
      toast({ title: "Submit request failed", description: errorMessage(error), variant: "destructive" })
    } finally {
      setSubmitOpen(false)
      setSubmitting(false)
    }
  }

  async function handleUpload(index: number, kind: "image" | "video", file: File | null) {
    if (!file || !form) return
    const creative = form.ads[index]
    if (!creative) return
    const setCreativeMessage = (message: string | null) => {
      setCreativeValidationMessages((current) => ({ ...current, [index]: message }))
    }
    if (kind === "image") {
      if ((creative.videoAssetIds?.length ?? 0) === 0) {
        const message = "Video ads require a video before uploading the cover image."
        setCreativeMessage(message)
        console.warn("TikTok creative validation:", message)
        toast({ title: "Upload video first", description: message, variant: "destructive" })
        return
      }
      const videoRatioInfo = videoRatiosByAssetId[creative.videoAssetIds[0]]
      if (!videoRatioInfo) {
        const message = "Wait for the uploaded video dimensions to load, then upload the cover image."
        setCreativeMessage(message)
        console.warn("TikTok creative validation:", message)
        toast({ title: "Video dimensions unavailable", description: message, variant: "destructive" })
        return
      }
    }

    setUploadingKeys((current) => ({ ...current, [uploadKey(index, kind)]: true }))
    try {
      let nextVideoRatioInfo: { ratio: number; label: string } | null = null
      if (kind === "video") {
        setCreativeMessage(null)
        const dimensions = await readVideoDimensions(file)
        nextVideoRatioInfo = { ratio: dimensions.ratio, label: formatAspectRatio(dimensions) }
      } else if ((creative.videoAssetIds?.length ?? 0) > 0) {
        const videoRatioInfo = videoRatiosByAssetId[creative.videoAssetIds[0]]
        const dimensions = await readImageDimensions(file)
        if (videoRatioInfo && !ratiosMatch(videoRatioInfo.ratio, dimensions.ratio)) {
          const message = `Cover image ratio ${formatAspectRatio(dimensions)} must match video ratio ${videoRatioInfo.label ?? formatRatio(videoRatioInfo.ratio)}.`
          setCreativeMessage(message)
          console.warn("TikTok creative validation:", message, { videoRatio: videoRatioInfo.ratio, imageRatio: dimensions.ratio })
          toast({ title: "Thumbnail ratio mismatch", description: message, variant: "destructive" })
          return
        }
      }

      const asset = await tiktokCampaignRequestsApi.uploadAsset(file, kind)
      setUploadedAssetsById((current) => ({ ...current, [asset.id]: asset }))
      if (kind === "video") {
        setVideoRatiosByAssetId((current) => nextVideoRatioInfo ? ({ ...current, [asset.id]: nextVideoRatioInfo }) : current)
      }
      setCreativeMessage(null)
      const nextAds = form.ads.map((item, itemIndex) => itemIndex === index
        ? {
            ...item,
            videoId: kind === "video" ? "" : item.videoId,
            videoIds: kind === "video" ? [] : item.videoIds,
            imageIds: kind === "image" ? [] : item.imageIds,
            videoAssetId: kind === "video" ? asset.id : item.videoAssetId,
            videoAssetIds: kind === "video" ? [...(item.videoAssetIds ?? []), asset.id] : item.videoAssetIds,
            imageAssetIds: kind === "image" ? [asset.id] : item.imageAssetIds,
          }
        : item)
      updateForm({
        ad: nextAds[0],
        ads: nextAds,
      })
      toast({ title: "Creative uploaded", description: asset.fileName })
    } catch (error) {
      const message = errorMessage(error)
      setCreativeMessage(message)
      console.warn("TikTok creative upload failed:", message)
      toast({ title: "Upload creative failed", description: message, variant: "destructive" })
    } finally {
      setUploadingKeys((current) => ({ ...current, [uploadKey(index, kind)]: false }))
    }
  }

  function handleCreativeChange(index: number, creative: TikTokRequestFormState["ad"]) {
    if (!form) return
    const nextAds = form.ads.map((item, itemIndex) => itemIndex === index ? sanitizeTikTokCreative(creative) : item)
    setCreativeValidationMessages((current) => ({ ...current, [index]: null }))
    updateForm({ ad: nextAds[0], ads: nextAds })
  }

  function handleAddCreative() {
    if (!form) return
    const base = form.ads[form.ads.length - 1] ?? form.ad
    const nextCreative = sanitizeTikTokCreative({
      ...base,
      adName: "",
      videoId: "",
      videoIds: [],
      imageIds: [],
      videoAssetId: undefined,
      videoAssetIds: [],
      imageAssetIds: [],
    })
    const nextAds = [...form.ads, nextCreative]
    updateForm({ ad: nextAds[0], ads: nextAds })
  }

  function handleDuplicateCreative(index: number) {
    if (!form) return
    const source = form.ads[index]
    if (!source) return
    const duplicate = sanitizeTikTokCreative({ ...source, adName: source.adName ? `${source.adName}_COPY` : "" })
    const nextAds = [...form.ads.slice(0, index + 1), duplicate, ...form.ads.slice(index + 1)]
    updateForm({ ad: nextAds[0], ads: nextAds })
  }

  function handleRemoveCreative(index: number) {
    if (!form || form.ads.length <= 1) return
    const nextAds = form.ads.filter((_, itemIndex) => itemIndex !== index)
    updateForm({ ad: nextAds[0], ads: nextAds })
    setCreativeValidationMessages((current) => {
      const next: Record<number, string | null> = {}
      nextAds.forEach((_, itemIndex) => {
        const oldIndex = itemIndex >= index ? itemIndex + 1 : itemIndex
        if (current[oldIndex]) next[itemIndex] = current[oldIndex]
      })
      return next
    })
  }

  function discard() {
    router.push(requestId ? `/tiktok-ads/requests/${requestId}` : "/tiktok-ads/requests")
  }

  if (loading || !reference || !form) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-md border bg-white text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading TikTok request form...
      </div>
    )
  }

  const title = requestId ? "Edit TikTok Request" : "New TikTok Request"
  const saveDisabled = saving || validating || submitting || Object.values(uploadingKeys).some(Boolean)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
            <Link className="hover:text-slate-900" href="/tiktok-ads/requests">TikTok Requests</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">{title}</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Status: {serverStatus ?? "draft"}</Badge>
              {draftId ? <Badge variant="outline">Request #{draftId}</Badge> : <Badge className="bg-slate-100 text-slate-700">Unsaved draft</Badge>}
              {isDirty ? <Badge className="bg-amber-50 text-amber-700">Unsaved changes</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => (isDirty ? setDiscardOpen(true) : discard())}>
            <Trash2 className="mr-2 h-4 w-4" />
            Discard
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleSaveDraft()} disabled={saveDisabled}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleValidate()} disabled={saveDisabled}>
            {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Validate
          </Button>
          <Button type="button" onClick={() => setSubmitOpen(true)} disabled={saveDisabled}>
            <Send className="mr-2 h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <p>Request only creates an internal draft on save/submit; new media is uploaded to TikTok during Execute after approval.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div id={requestSectionIds["account-app"]} className={cn(getSectionWrapperClass("account-app", highlightedSection))}>
            <AccountAppSection form={form} reference={reference} appMappings={accountScopedAppMappings} selectedAdAccount={selectedAdAccount} selectedAppMapping={selectedAppMapping} onChange={updateForm} />
          </div>
          <div id={requestSectionIds["campaign-settings"]} className={cn(getSectionWrapperClass("campaign-settings", highlightedSection))}>
            <CampaignSettingsSection form={form} reference={reference} selectedAppMapping={selectedAppMapping} locations={targetingOptions?.locations} onChange={updateForm} />
          </div>
          {form.adGroups.length > 1 ? (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Adsets copied from source campaign</h3>
                  <p className="text-xs text-slate-500">Choose an adset to edit its targeting, budget, and creatives.</p>
                </div>
                <Badge variant="secondary">{form.adGroups.length} adsets</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.adGroups.map((group, index) => (
                  <Button key={`${group.adGroup.adGroupName}-${index}`} type="button" size="sm" variant={index === activeAdGroupIndex ? "default" : "outline"} onClick={() => selectAdGroup(index)}>
                    Adset #{index + 1}: {group.adGroup.adGroupName || "Untitled"} ({group.ads.length} ads)
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div id={requestSectionIds["adgroup-audience"]} className={cn(getSectionWrapperClass("adgroup-audience", highlightedSection))}>
            <AdGroupAudienceSection form={form} reference={reference} targetingOptions={targetingOptions} targetingLoading={targetingLoading} onChange={updateForm} />
          </div>
          <div id={requestSectionIds["adgroup-budget"]} className={cn(getSectionWrapperClass("adgroup-budget", highlightedSection))}>
            <AdGroupBudgetSection form={form} reference={reference} selectedAdAccount={selectedAdAccount} selectedAppMapping={selectedAppMapping} onChange={updateForm} />
          </div>
          <div id={requestSectionIds.creative} className={cn(getSectionWrapperClass("creative", highlightedSection))}>
            <CreativeSection
              form={form}
              reference={reference}
              uploadedAssetsById={uploadedAssetsById}
              videoRatiosByAssetId={videoRatiosByAssetId}
              uploadingKeys={uploadingKeys}
              identityOptions={identityOptions}
              identityLoading={identityLoading}
              identityLoadError={identityLoadError}
              creativeValidationMessages={creativeValidationMessages}
              libraryVideos={libraryVideos}
              libraryImages={libraryImages}
              libraryLoading={libraryLoading}
              libraryLoadError={libraryLoadError}
              onLibrarySearch={handleLibrarySearch}
              onLibraryEnabledChange={handleLibraryEnabledChange}
              onCreativeChange={handleCreativeChange}
              onAdGroupChange={(adGroup) => updateForm({ adGroup })}
              onAddCreative={handleAddCreative}
              onDuplicateCreative={handleDuplicateCreative}
              onRemoveCreative={handleRemoveCreative}
              onUpload={(index, kind, file) => void handleUpload(index, kind, file)}
            />
          </div>
        </div>

        <TikTokRequestSummaryRail
          form={form}
          reference={reference}
          validationErrors={validationErrors}
          serverStatus={serverStatus}
          selectedAppMapping={selectedAppMapping}
          isPersisted={Boolean(draftId)}
          onNavigateToSection={navigateToSection}
        />
      </div>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>Unsaved changes in this request will be discarded.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit TikTok request?</AlertDialogTitle>
            <AlertDialogDescription>The latest draft will be saved, validated, and submitted for approval if valid.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={(event) => { event.preventDefault(); void handleSubmit() }}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


