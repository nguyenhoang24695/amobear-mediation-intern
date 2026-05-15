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
import type { TikTokCampaignRequestDetailDto, TikTokIdentityOptionDto, TikTokReferenceResponseDto, TikTokRequestAssetDto, TikTokTargetingOptionsResponseDto, TikTokValidationResultDto } from "@/types/tiktok-ads"
import { AccountAppSection } from "./section-account-app"
import { AdGroupAudienceSection } from "./section-adgroup-audience"
import { AdGroupBudgetSection } from "./section-adgroup-budget"
import { AdSection } from "./section-ad"
import { CampaignSettingsSection } from "./section-campaign-settings"
import { CreativeSection } from "./section-creative"
import { TikTokRequestSummaryRail } from "./summary-rail"
import {
  buildIdempotencyKey,
  createDefaultTikTokRequestForm,
  getMediaMode,
  normalizeTikTokRequestPayloadShape,
  requestSectionIds,
  sanitizeTikTokRequestForm,
  type TikTokMediaMode,
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
  return sanitizeTikTokRequestForm({
    ...fallback,
    ...normalized,
    campaign: { ...fallback.campaign, ...normalized.campaign },
    adGroup: { ...fallback.adGroup, ...normalized.adGroup },
    ad: { ...fallback.ad, ...normalized.ad },
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
  const [draftId, setDraftId] = useState<number | null>(requestId ?? null)
  const [serverStatus, setServerStatus] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [mediaMode, setMediaMode] = useState<TikTokMediaMode>("upload")
  const [uploadedVideoAsset, setUploadedVideoAsset] = useState<TikTokRequestAssetDto | null>(null)
  const [uploadedImageAsset, setUploadedImageAsset] = useState<TikTokRequestAssetDto | null>(null)
  const [videoRatio, setVideoRatio] = useState<number | null>(null)
  const [videoRatioLabel, setVideoRatioLabel] = useState<string | null>(null)
  const [creativeValidationMessage, setCreativeValidationMessage] = useState<string | null>(null)
  const [identityOptions, setIdentityOptions] = useState<TikTokIdentityOptionDto[]>([])
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityLoadError, setIdentityLoadError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
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
    () => reference?.appMappings.find((mapping) => mapping.appRowId === form?.appRowId),
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
    if (selectedAppMapping && !matched.some((mapping) => mapping.appRowId === selectedAppMapping.appRowId)) {
      return [selectedAppMapping, ...matched]
    }
    return matched
  }, [reference, selectedAdAccount, selectedAppMapping])

  useEffect(() => {
    let cancelled = false

    async function hydrateUploadedAssets(payload: TikTokRequestFormState) {
      setUploadedVideoAsset(null)
      setUploadedImageAsset(null)
      setVideoRatio(null)
      setVideoRatioLabel(null)
      setCreativeValidationMessage(null)

      if (payload.ad.videoAssetId) {
        try {
          const videoAsset = await tiktokCampaignRequestsApi.getAsset(payload.ad.videoAssetId)
          if (cancelled) return
          setUploadedVideoAsset(videoAsset)

          const { blob } = await tiktokCampaignRequestsApi.getAssetContentBlob(payload.ad.videoAssetId)
          const dimensions = await readVideoDimensions(blob)
          if (!cancelled) {
            setVideoRatio(dimensions.ratio)
            setVideoRatioLabel(formatAspectRatio(dimensions))
          }
        } catch (error) {
          if (!cancelled) {
            toast({ title: "Read video dimensions failed", description: errorMessage(error), variant: "destructive" })
          }
        }
      }

      const imageAssetId = payload.ad.imageAssetIds[0]
      if (imageAssetId) {
        try {
          const imageAsset = await tiktokCampaignRequestsApi.getAsset(imageAssetId)
          if (!cancelled) setUploadedImageAsset(imageAsset)
        } catch (error) {
          if (!cancelled) {
            toast({ title: "Load cover image failed", description: errorMessage(error), variant: "destructive" })
          }
        }
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
          setMediaMode(getMediaMode(parsed))
          await hydrateUploadedAssets(parsed)
        } else {
          const next = createDefaultTikTokRequestForm(ref)
          setForm(next)
          setDraftId(null)
          setServerStatus("draft")
          setValidationErrors([])
          setMediaMode(getMediaMode(next))
          setUploadedVideoAsset(null)
          setUploadedImageAsset(null)
          setVideoRatio(null)
          setVideoRatioLabel(null)
          setCreativeValidationMessage(null)
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

  const updateForm = useCallback((patch: Partial<TikTokRequestFormState>) => {
    setForm((current) => {
      if (!current) return current
      return sanitizeTikTokRequestForm({ ...current, ...patch })
    })
    setIsDirty(true)
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
      ad: {
        ...form.ad,
        landingPageUrl: form.ad.landingPageUrl || selectedAppMapping?.downloadUrl || "",
      },
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
    const selectedKey = identityOptionKey(form.ad.identityId, form.ad.identityType, form.ad.identityAuthorizedBcId)
    if (identityLoading) return "TikTok identities are still loading for the selected ad account."
    if (identityLoadError) return `Unable to load TikTok identities: ${identityLoadError}`
    if (identityOptions.length === 0) return "Selected TikTok ad account has no usable identities."
    if (!selectedKey) return "TikTok identity is required."
    if (!identityOptions.some((option) => option.key === selectedKey)) return "Selected TikTok identity is no longer available. Choose a current identity."
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

  async function handleUpload(kind: "image" | "video", file: File | null) {
    if (!file || !form) return
    if (kind === "image") {
      if (!form.ad.videoAssetId) {
        const message = "Video ads require a video before uploading the cover image."
        setCreativeValidationMessage(message)
        console.warn("TikTok creative validation:", message)
        toast({ title: "Upload video first", description: message, variant: "destructive" })
        return
      }
      if (videoRatio == null) {
        const message = "Wait for the uploaded video dimensions to load, then upload the cover image."
        setCreativeValidationMessage(message)
        console.warn("TikTok creative validation:", message)
        toast({ title: "Video dimensions unavailable", description: message, variant: "destructive" })
        return
      }
    }

    if (kind === "video") setUploadingVideo(true)
    else setUploadingImage(true)
    try {
      let nextVideoRatio = videoRatio
      let nextVideoRatioLabel = videoRatioLabel
      if (kind === "video") {
        setCreativeValidationMessage(null)
        const dimensions = await readVideoDimensions(file)
        nextVideoRatio = dimensions.ratio
        nextVideoRatioLabel = formatAspectRatio(dimensions)
      } else if (videoRatio != null) {
        const dimensions = await readImageDimensions(file)
        if (!ratiosMatch(videoRatio, dimensions.ratio)) {
          const message = `Cover image ratio ${formatAspectRatio(dimensions)} must match video ratio ${videoRatioLabel ?? formatRatio(videoRatio)}.`
          setCreativeValidationMessage(message)
          console.warn("TikTok creative validation:", message, { videoRatio, imageRatio: dimensions.ratio })
          toast({ title: "Thumbnail ratio mismatch", description: message, variant: "destructive" })
          return
        }
      }

      const asset = await tiktokCampaignRequestsApi.uploadAsset(file, kind)
      if (kind === "video") {
        setUploadedVideoAsset(asset)
        setUploadedImageAsset(null)
        setVideoRatio(nextVideoRatio)
        setVideoRatioLabel(nextVideoRatioLabel)
      } else {
        setUploadedImageAsset(asset)
      }
      setCreativeValidationMessage(null)
      updateForm({
        ad: {
          ...form.ad,
          videoId: kind === "video" ? "" : form.ad.videoId,
          imageIds: kind === "image" || kind === "video" ? [] : form.ad.imageIds,
          videoAssetId: kind === "video" ? asset.id : form.ad.videoAssetId,
          imageAssetIds: kind === "image" ? [asset.id] : (kind === "video" ? [] : form.ad.imageAssetIds),
        },
      })
      toast({ title: "Creative uploaded", description: asset.fileName })
    } catch (error) {
      const message = errorMessage(error)
      setCreativeValidationMessage(message)
      console.warn("TikTok creative upload failed:", message)
      toast({ title: "Upload creative failed", description: message, variant: "destructive" })
    } finally {
      if (kind === "video") setUploadingVideo(false)
      else setUploadingImage(false)
    }
  }

  function handleMediaModeChange(mode: TikTokMediaMode) {
    if (!form) return
    setMediaMode(mode)
    if (mode === "existing") {
      setUploadedVideoAsset(null)
      setUploadedImageAsset(null)
      setVideoRatio(null)
      setVideoRatioLabel(null)
      setCreativeValidationMessage(null)
    }
    updateForm({
      ad: mode === "existing"
        ? { ...form.ad, videoAssetId: undefined, imageAssetIds: [] }
        : { ...form.ad, videoId: "", imageIds: [] },
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
  const saveDisabled = saving || validating || submitting || uploadingVideo || uploadingImage
  const videoCoverUploadBlocked = mediaMode === "upload" && (!form.ad.videoAssetId || videoRatio == null)
  const videoCoverUploadBlockedReason = !form.ad.videoAssetId
    ? "Upload video before uploading the cover image."
    : "Video dimensions are loading before cover image validation."
  const selectedIdentityKey = identityOptionKey(form.ad.identityId, form.ad.identityType, form.ad.identityAuthorizedBcId)
  const identityConfirmed = Boolean(selectedIdentityKey && identityOptions.some((option) => option.key === selectedIdentityKey))

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
          <div id={requestSectionIds["adgroup-audience"]} className={cn(getSectionWrapperClass("adgroup-audience", highlightedSection))}>
            <AdGroupAudienceSection form={form} reference={reference} targetingOptions={targetingOptions} targetingLoading={targetingLoading} onChange={updateForm} />
          </div>
          <div id={requestSectionIds["adgroup-budget"]} className={cn(getSectionWrapperClass("adgroup-budget", highlightedSection))}>
            <AdGroupBudgetSection form={form} reference={reference} selectedAdAccount={selectedAdAccount} selectedAppMapping={selectedAppMapping} onChange={updateForm} />
          </div>
          <div id={requestSectionIds.creative} className={cn(getSectionWrapperClass("creative", highlightedSection))}>
            <CreativeSection
              form={form}
              mediaMode={mediaMode}
              uploadedVideoAsset={uploadedVideoAsset}
              uploadedImageAsset={uploadedImageAsset}
              uploadingVideo={uploadingVideo}
              uploadingImage={uploadingImage}
              identityOptions={identityOptions}
              identityLoading={identityLoading}
              identityLoadError={identityLoadError}
              identityConfirmed={identityConfirmed}
              imageUploadDisabled={videoCoverUploadBlocked}
              imageUploadDisabledReason={videoCoverUploadBlocked ? videoCoverUploadBlockedReason : undefined}
              creativeValidationMessage={creativeValidationMessage}
              onChange={updateForm}
              onMediaModeChange={handleMediaModeChange}
              onUpload={(kind, file) => void handleUpload(kind, file)}
            />
          </div>
          <div id={requestSectionIds.ad} className={cn(getSectionWrapperClass("ad", highlightedSection))}>
            <AdSection form={form} reference={reference} onChange={updateForm} />
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
