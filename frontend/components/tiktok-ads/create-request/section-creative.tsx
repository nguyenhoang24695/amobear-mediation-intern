"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Copy, ImageIcon, Loader2, Play, Plus, Trash2, Upload, Wand2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getTikTokRequestAssetPreviewSource } from "@/lib/tiktok-ads/media-preview"
import type { TikTokCreativeImageDto, TikTokCreativeVideoDto, TikTokIdentityOptionDto, TikTokReferenceResponseDto, TikTokRequestAssetDto } from "@/types/tiktok-ads"
import { ProtectedMediaImage, ProtectedMediaVideo } from "../shared/protected-media"
import { SearchableSelect } from "./searchable-select"
import { SectionShell } from "./section-shell"
import { buildCreativeAdName } from "./naming"
import type { TikTokMediaMode, TikTokRequestFormState } from "./types"
import { getCreativeImageMode, getCreativeVideoMode, hasCreativeMedia, optionLabel } from "./types"
import { VideoFrameThumbnailDialog } from "./video-frame-thumbnail-dialog"

type TikTokUploadKind = "image" | "video"
type TikTokCreativeDraft = TikTokRequestFormState["ad"]

const maxTikTokAdTexts = 5
const supportedTikTokIdentityType = "BC_AUTH_TT"

interface VideoRatioInfo {
  ratio: number
  label: string
}

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  uploadedAssetsById: Record<number, TikTokRequestAssetDto>
  videoRatiosByAssetId: Record<number, VideoRatioInfo>
  localVideoFilesByCreativeIndex: Record<number, File>
  uploadingKeys: Record<string, boolean>
  identityOptions: TikTokIdentityOptionDto[]
  identityLoading: boolean
  identityLoadError?: string | null
  creativeValidationMessages: Record<number, string | null | undefined>
  libraryVideos: TikTokCreativeVideoDto[]
  libraryImages: TikTokCreativeImageDto[]
  libraryLoading: boolean
  libraryLoadError?: string | null
  onLibrarySearch: (kind: "video" | "image", query: string) => void
  onLibraryEnabledChange: (enabled: boolean) => void
  onCreativeChange: (index: number, creative: TikTokCreativeDraft) => void
  onAdGroupChange: (adGroup: TikTokRequestFormState["adGroup"]) => void
  onAddCreative: () => void
  onDuplicateCreative: (index: number) => void
  onRemoveCreative: (index: number) => void
  onUpload: (index: number, kind: TikTokUploadKind, file: File | null) => void
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function normalizeIdentityType(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  return !normalized || normalized === "CUSTOMIZED_USER" ? supportedTikTokIdentityType : normalized
}

function isSupportedIdentity(identityType?: string | null, identityAuthorizedBcId?: string | null) {
  return normalizeIdentityType(identityType) === supportedTikTokIdentityType && Boolean(identityAuthorizedBcId?.trim())
}

function isSupportedIdentityOption(option: TikTokIdentityOptionDto) {
  return isSupportedIdentity(option.identityType, option.identityAuthorizedBcId)
}

function assetLabel(asset: TikTokRequestAssetDto | null, fallback?: string) {
  if (!asset) return fallback ?? "No uploaded asset"
  const sizeMb = asset.sizeBytes > 0 ? `${(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "unknown size"
  return `${asset.fileName} - ${sizeMb}`
}

function identityOptionKey(identityId?: string | null, identityType?: string | null, identityAuthorizedBcId?: string | null) {
  if (!identityId?.trim()) return ""
  return `${normalizeIdentityType(identityType)}:${identityId.trim()}:${identityAuthorizedBcId?.trim() ?? ""}`
}

function uploadKey(index: number, kind: TikTokUploadKind) {
  return `${index}:${kind}`
}

function creativeTabValue(index: number) {
  return `creative-${index}`
}

function creativeTabIndex(value: string) {
  const parsed = Number(value.replace("creative-", ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function mediaModeLabel(mode: TikTokMediaMode) {
  return mode === "upload" ? "Upload" : mode === "library" ? "TikTok library" : "Existing ID"
}

function dimensionsLabel(width?: number | null, height?: number | null) {
  return width && height ? `${width}x${height}` : "unknown"
}

function mediaRatio(width?: number | null, height?: number | null) {
  return width && height && height > 0 ? width / height : null
}

function libraryRatioMismatchMessage(video: TikTokCreativeVideoDto | null, image: TikTokCreativeImageDto | null) {
  const videoRatio = mediaRatio(video?.width, video?.height)
  const imageRatio = mediaRatio(image?.width, image?.height)
  if (!videoRatio || !imageRatio || Math.abs(videoRatio - imageRatio) <= 0.01) return null
  return `Cover image ratio must match selected video ratio. Video is ${dimensionsLabel(video?.width, video?.height)}, image is ${dimensionsLabel(image?.width, image?.height)}.`
}

function isCreativeReady(creative: TikTokCreativeDraft) {
  const hasVideo = (creative.videoIds?.length ?? 0) > 0 || (creative.videoAssetIds?.length ?? 0) > 0
  const hasImage = creative.imageIds.length > 0 || creative.imageAssetIds.length > 0
  const hasCopy = Boolean(creative.adName.trim() && creative.callToAction && creative.landingPageUrl?.trim())
  const hasIdentity = Boolean(creative.identityId?.trim())
  return hasVideo && hasImage && hasCopy && hasIdentity
}

export function CreativeSection({
  form,
  reference,
  uploadedAssetsById,
  videoRatiosByAssetId,
  localVideoFilesByCreativeIndex,
  uploadingKeys,
  identityOptions,
  identityLoading,
  identityLoadError,
  creativeValidationMessages,
  libraryVideos,
  libraryImages,
  libraryLoading,
  libraryLoadError,
  onLibrarySearch,
  onLibraryEnabledChange,
  onCreativeChange,
  onAdGroupChange,
  onAddCreative,
  onDuplicateCreative,
  onRemoveCreative,
  onUpload,
}: Props) {
  const ready = hasCreativeMedia(form)
  const creatives = form.ads.length ? form.ads : [form.ad]
  const [activeCreativeTab, setActiveCreativeTab] = useState(creativeTabValue(0))
  const [videoModeOverrides, setVideoModeOverrides] = useState<Record<number, TikTokMediaMode>>({})
  const [imageModeOverrides, setImageModeOverrides] = useState<Record<number, TikTokMediaMode>>({})
  const [thumbnailEditorIndex, setThumbnailEditorIndex] = useState<number | null>(null)
  const lastGeneratedNamesRef = useRef<Record<number, string>>({})

  function resolveVideoMode(index: number, creative: TikTokCreativeDraft): TikTokMediaMode {
    const computed = getCreativeVideoMode(creative)
    const override = videoModeOverrides[index]
    if (process.env.NODE_ENV !== "production" && override === "upload" && (creative.videoIds?.length ?? 0) > 0) {
      console.debug("TikTok creative video mode override keeps upload while videoIds exist", { index, videoIds: creative.videoIds, videoAssetIds: creative.videoAssetIds })
    }
    return override ?? computed
  }

  function resolveImageMode(index: number, creative: TikTokCreativeDraft): TikTokMediaMode {
    const computed = getCreativeImageMode(creative)
    const override = imageModeOverrides[index]
    if (process.env.NODE_ENV !== "production" && override === "upload" && creative.imageIds.length > 0) {
      console.debug("TikTok creative image mode override keeps upload while imageIds exist", { index, imageIds: creative.imageIds, imageAssetIds: creative.imageAssetIds })
    }
    return override ?? computed
  }

  useEffect(() => {
    if (creativeTabIndex(activeCreativeTab) >= creatives.length) {
      setActiveCreativeTab(creativeTabValue(Math.max(0, creatives.length - 1)))
    }
  }, [activeCreativeTab, creatives.length])

  useEffect(() => {
    const nextIndex = creatives.findIndex((creative, index) => {
      const generatedName = buildCreativeAdName(form, creative, index)
      const currentName = creative.adName.trim()
      const previousGeneratedName = lastGeneratedNamesRef.current[index]?.trim()
      const knownGeneratedName = Object.values(lastGeneratedNamesRef.current).some((name) => name.trim() === currentName)
      return Boolean(generatedName) && generatedName !== currentName && (!currentName || currentName === previousGeneratedName || knownGeneratedName)
    })
    if (nextIndex < 0) return

    const creative = creatives[nextIndex]
    const generatedName = buildCreativeAdName(form, creative, nextIndex)
    lastGeneratedNamesRef.current[nextIndex] = generatedName
    onCreativeChange(nextIndex, { ...creative, adName: generatedName })
  }, [creatives, form, onCreativeChange])

  function handleAddCreative() {
    const nextIndex = creatives.length
    onAddCreative()
    setActiveCreativeTab(creativeTabValue(nextIndex))
  }

  function handleDuplicateCreative(index: number) {
    onDuplicateCreative(index)
    setActiveCreativeTab(creativeTabValue(index + 1))
  }

  function handleRemoveCreative(index: number) {
    const nextIndex = Math.max(0, Math.min(index, creatives.length - 2))
    onRemoveCreative(index)
    setActiveCreativeTab(creativeTabValue(nextIndex))
  }

  function handleVideoModeChange(index: number, creative: TikTokCreativeDraft, mode: TikTokMediaMode) {
    setVideoModeOverrides((prev) => ({ ...prev, [index]: mode }))
    if (mode === "library") onLibraryEnabledChange(true)
    onCreativeChange(index, { ...creative, videoId: "", videoIds: [], videoAssetId: undefined, videoAssetIds: [] })
  }

  function handleImageModeChange(index: number, creative: TikTokCreativeDraft, mode: TikTokMediaMode) {
    setImageModeOverrides((prev) => ({ ...prev, [index]: mode }))
    if (mode === "library") onLibraryEnabledChange(true)
    onCreativeChange(index, { ...creative, imageIds: [], imageAssetIds: [] })
  }

  function applyGeneratedAdName(index: number, creative: TikTokCreativeDraft) {
    const generatedName = buildCreativeAdName(form, creative, index)
    if (!generatedName) return
    lastGeneratedNamesRef.current[index] = generatedName
    onCreativeChange(index, { ...creative, adName: generatedName })
  }

  function handleAdNameChange(index: number, creative: TikTokCreativeDraft, value: string) {
    const generatedName = buildCreativeAdName(form, creative, index)
    if (value.trim() !== generatedName) {
      delete lastGeneratedNamesRef.current[index]
    } else {
      lastGeneratedNamesRef.current[index] = generatedName
    }
    onCreativeChange(index, { ...creative, adName: value })
  }

  return (
    <SectionShell
      eyebrow="Creative"
      title="TikTok Creatives"
      description="Select video assets and define up to 5 ad texts for this ad set. TikTok combines them automatically."
      ready={ready}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[220px]">
          <div className="space-y-2">
            <Label>Ad format</Label>
            <div className="flex h-10 items-center rounded-md border bg-slate-50 px-3 text-sm font-medium text-slate-700">
              Single video
            </div>
          </div>
        </div>

        <TikTokAdTextVariationEditor
          values={form.adGroup.adTexts?.length ? form.adGroup.adTexts : form.ads.flatMap((creative) => creative.adTexts?.length ? creative.adTexts : creative.adText ? [creative.adText] : []).slice(0, maxTikTokAdTexts)}
          onChange={(adTexts) => onAdGroupChange({ ...form.adGroup, adTexts })}
        />

        <Tabs value={activeCreativeTab} onValueChange={setActiveCreativeTab} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-50 p-2">
            <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {creatives.map((creative, index) => {
                const tabReady = isCreativeReady(creative)
                const label = creative.adName.trim() || `Ad ${index + 1}`
                const hasMessage = Boolean(creativeValidationMessages[index])
                return (
                  <TabsTrigger
                    key={index}
                    value={creativeTabValue(index)}
                    className="min-w-[110px] justify-start gap-2 px-3 py-2 text-xs data-[state=active]:bg-white"
                  >
                    <span className={tabReady && !hasMessage ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-amber-500"} />
                    <span className="max-w-[120px] truncate">{label}</span>
                    {creatives.length > 1 ? <span className="text-[10px] text-slate-400">#{index + 1}</span> : null}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            <Button type="button" variant="outline" size="sm" onClick={handleAddCreative}>
              <Plus className="mr-2 h-4 w-4" />
              Add video asset
            </Button>
          </div>

          {creatives.map((creative, index) => {
            const videoMode = resolveVideoMode(index, creative)
            const imageMode = resolveImageMode(index, creative)
            const videoAssetId = creative.videoAssetIds?.[0] ?? creative.videoAssetId
            const videoAsset = videoAssetId ? uploadedAssetsById[videoAssetId] ?? null : null
            const localVideoFile = localVideoFilesByCreativeIndex[index] ?? null
            const imageAssetId = creative.imageAssetIds[0]
            const imageAsset = imageAssetId ? uploadedAssetsById[imageAssetId] ?? null : null
            const primaryVideoId = creative.videoIds?.[0]?.trim() ?? creative.videoId?.trim() ?? ""
            const libraryVideoId = videoMode === "library" ? primaryVideoId : ""
            const libraryImageId = imageMode === "library" ? creative.imageIds[0] ?? "" : ""
            const selectedLibraryVideo = primaryVideoId ? libraryVideos.find((v) => v.videoId === primaryVideoId) ?? null : null
            const selectedLibraryImage = libraryImageId ? libraryImages.find((i) => i.imageId === libraryImageId) ?? null : null
            const libraryEmptyMessage = libraryLoadError
              ? libraryLoadError
              : libraryLoading
                ? "Loading TikTok library..."
                : form.tikTokAdAccountRowId
                  ? "No matching asset in TikTok library."
                  : "Select an ad account first."
            const videoRatio = videoAssetId ? videoRatiosByAssetId[videoAssetId] : undefined
            const imageUploadGatedByVideo = videoMode === "upload" && (!videoAssetId || !videoRatio)
            const imageUploadDisabled = imageMode === "upload" && imageUploadGatedByVideo
            const imageUploadDisabledReason = !videoAssetId
              ? "Upload video before uploading the cover image."
              : "Video dimensions are loading before cover image validation."
            const supportedIdentityOptions = identityOptions.filter(isSupportedIdentityOption)
            const selectedIdentityKey = identityOptionKey(creative.identityId, creative.identityType, creative.identityAuthorizedBcId)
            const selectedIdentitySupported = isSupportedIdentity(creative.identityType, creative.identityAuthorizedBcId)
            const selectedIdentityKnown = supportedIdentityOptions.some((option) => option.key === selectedIdentityKey)
            const identityEmptyMessage = form.tikTokAdAccountRowId
              ? identityLoadError || "No Business Center authorized TikTok identities found for this ad account."
              : "Select an ad account first."
            const identitySelectOptions = supportedIdentityOptions
            const videoPreview = getTikTokRequestAssetPreviewSource(videoAsset)
            const imagePreview = getTikTokRequestAssetPreviewSource(imageAsset)
            const libraryRatioMessage = videoMode === "library" && imageMode === "library" ? libraryRatioMismatchMessage(selectedLibraryVideo, selectedLibraryImage) : null
            const validationMessage = libraryRatioMessage ?? creativeValidationMessages[index]
            const uploadingVideo = Boolean(uploadingKeys[uploadKey(index, "video")])
            const uploadingImage = Boolean(uploadingKeys[uploadKey(index, "image")])
            const videoAssetFallback = videoAssetId ? `Uploaded video asset #${videoAssetId}` : undefined
            const imageAssetFallback = creative.imageAssetIds.length ? `Uploaded image asset #${creative.imageAssetIds.join(", ")}` : undefined
            const generatedAdName = buildCreativeAdName(form, creative, index)
            const previewFallback = (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Play className="h-8 w-8" />
                <p className="max-w-[160px] truncate text-xs">{creative.videoIds?.[0] || creative.videoId || videoAssetFallback || "Media preview"}</p>
              </div>
            )

            return (
              <TabsContent key={index} value={creativeTabValue(index)} className="mt-0">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700">Video asset #{index + 1}</Badge>
                      <Badge variant="outline">Video: {mediaModeLabel(videoMode)}</Badge>
                      <Badge variant="outline">Thumbnail: {mediaModeLabel(imageMode)}</Badge>
                      {videoRatio ? <Badge variant="outline">Video {videoRatio.label}</Badge> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDuplicateCreative(index)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={creatives.length <= 1} onClick={() => handleRemoveCreative(index)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-md border bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-sm font-semibold">Video</Label>
                            <Select value={videoMode} onValueChange={(value) => handleVideoModeChange(index, creative, value as TikTokMediaMode)}>
                              <SelectTrigger className="h-8 w-[160px] bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upload">Upload</SelectItem>
                                <SelectItem value="existing">Existing ID</SelectItem>
                                <SelectItem value="library">TikTok library</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {videoMode === "upload" ? (
                            <UploadBox
                              kind="video"
                              label="Upload video"
                              asset={videoAsset}
                              fallback={videoAssetFallback}
                              uploading={uploadingVideo}
                              onUpload={(file) => onUpload(index, "video", file)}
                            />
                          ) : videoMode === "library" ? (
                            <div className="space-y-2">
                              <SearchableSelect
                                value={libraryVideoId}
                                options={libraryVideos}
                                placeholder={libraryLoading ? "Loading videos..." : "Select a video from library..."}
                                searchPlaceholder="Search by file name..."
                                emptyMessage={libraryEmptyMessage}
                                disabled={!form.tikTokAdAccountRowId}
                                shouldFilter={false}
                                onSearchChange={(query) => onLibrarySearch("video", query)}
                                getValue={(option) => option.videoId}
                                getSearchText={(option) => `${option.fileName ?? ""} ${option.videoId} ${option.materialId ?? ""}`}
                                onValueChange={(value) => {
                                  const picked = libraryVideos.find((v) => v.videoId === value)
                                  if (!picked) return
                                  onCreativeChange(index, { ...creative, videoId: picked.videoId, videoIds: Array.from(new Set([...(creative.videoIds ?? []), picked.videoId])), videoAssetId: undefined, videoAssetIds: [] })
                                }}
                                renderValue={(option) => (
                                  <span className="flex min-w-0 items-center gap-2">
                                    {option.videoCoverUrl ? <img src={option.videoCoverUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" /> : null}
                                    <span className="min-w-0 truncate font-medium text-slate-900">{option.fileName || option.videoId}</span>
                                  </span>
                                )}
                                renderOption={(option) => (
                                  <div className="flex min-w-0 items-center gap-2 py-0.5">
                                    {option.videoCoverUrl ? <img src={option.videoCoverUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : null}
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-slate-900">{option.fileName || option.videoId}</div>
                                      <div className="truncate font-mono text-xs text-slate-400">
                                        {option.width && option.height ? `${option.width}x${option.height}` : ""}{option.duration ? ` / ${option.duration}s` : ""}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              />
                              {selectedLibraryVideo && !selectedLibraryVideo.displayable ? (
                                <p className="text-xs text-amber-700">Preview unavailable because the current TikTok account has no permission to read this video. The video_id is still retained for submit.</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">TikTok video_id</Label>
                              <Input
                                value={(creative.videoIds?.length ? creative.videoIds : creative.videoId ? [creative.videoId] : []).join("\n")}
                                onChange={(event) => { const videoIds = event.target.value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 50); onCreativeChange(index, { ...creative, videoId: videoIds[0] ?? "", videoIds, videoAssetId: undefined, videoAssetIds: [] }) }}
                                placeholder="One TikTok video_id per line, max 50"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 rounded-md border bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-sm font-semibold">Cover image</Label>
                            <Select value={imageMode} onValueChange={(value) => handleImageModeChange(index, creative, value as TikTokMediaMode)}>
                              <SelectTrigger className="h-8 w-[160px] bg-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upload">Upload</SelectItem>
                                <SelectItem value="existing">Existing ID</SelectItem>
                                <SelectItem value="library">TikTok library</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {imageMode === "upload" ? (
                            <div className="space-y-3">
                              <UploadBox
                                kind="image"
                                label="Upload cover image"
                                asset={imageAsset}
                                fallback={imageAssetFallback}
                                uploading={uploadingImage}
                                disabled={imageUploadDisabled}
                                disabledReason={imageUploadDisabled ? imageUploadDisabledReason : undefined}
                                onUpload={(file) => onUpload(index, "image", file)}
                              />
                              <div className="rounded-md border bg-white px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-medium text-slate-700">Create thumbnail from video frame</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {localVideoFile && videoMode === "upload"
                                        ? "Open editor to capture any frame from the uploaded local video."
                                        : "Upload a local video first to extract a thumbnail frame."}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingImage || videoMode !== "upload" || !localVideoFile || imageUploadDisabled}
                                    onClick={() => setThumbnailEditorIndex(index)}
                                  >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Create from video frame
                                  </Button>
                                </div>
                              </div>
                              <VideoFrameThumbnailDialog
                                videoFile={localVideoFile}
                                open={thumbnailEditorIndex === index}
                                onOpenChange={(open) => setThumbnailEditorIndex(open ? index : null)}
                                onUseFrame={(file) => onUpload(index, "image", file)}
                              />
                            </div>
                          ) : imageMode === "library" ? (
                            <div className="space-y-2">
                              <SearchableSelect
                                value={libraryImageId}
                                options={libraryImages}
                                placeholder={libraryLoading ? "Loading images..." : "Select a cover image..."}
                                searchPlaceholder="Search by file name..."
                                emptyMessage={libraryEmptyMessage}
                                disabled={!form.tikTokAdAccountRowId}
                                shouldFilter={false}
                                onSearchChange={(query) => onLibrarySearch("image", query)}
                                getValue={(option) => option.imageId}
                                getSearchText={(option) => `${option.fileName ?? ""} ${option.imageId} ${option.materialId ?? ""}`}
                                onValueChange={(value) => {
                                  const picked = libraryImages.find((i) => i.imageId === value)
                                  if (!picked) return
                                  onCreativeChange(index, { ...creative, imageIds: [picked.imageId], imageAssetIds: [] })
                                }}
                                renderValue={(option) => (
                                  <span className="flex min-w-0 items-center gap-2">
                                    {option.imageUrl ? <img src={option.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" /> : null}
                                    <span className="min-w-0 truncate font-medium text-slate-900">{option.fileName || option.imageId}</span>
                                  </span>
                                )}
                                renderOption={(option) => (
                                  <div className="flex min-w-0 items-center gap-2 py-0.5">
                                    {option.imageUrl ? <img src={option.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : null}
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-slate-900">{option.fileName || option.imageId}</div>
                                      <div className="truncate font-mono text-xs text-slate-400">
                                        {option.width && option.height ? `${option.width}x${option.height}` : ""}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              />
                              {selectedLibraryImage && !selectedLibraryImage.displayable ? (
                                <p className="text-xs text-amber-700">Preview unavailable because the current TikTok account has no permission to read this image. The image_id is still retained for submit.</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">TikTok cover image_ids</Label>
                              <Input
                                value={creative.imageIds.join(", ")}
                                onChange={(event) => onCreativeChange(index, { ...creative, imageIds: splitCsv(event.target.value), imageAssetIds: [] })}
                                placeholder="ad-site-i18n-sg/..."
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {validationMessage ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                          {validationMessage}
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Ad name</Label>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={!generatedAdName} onClick={() => applyGeneratedAdName(index, creative)}>
                              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                              Generate
                            </Button>
                          </div>
                          <Input value={creative.adName} onChange={(event) => handleAdNameChange(index, creative, event.target.value)} />
                          <div className="rounded-md border bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">Pattern: <code className="rounded bg-white px-1 py-0.5">ADGROUP_FORMAT_INDEX</code></p>
                            <p className={generatedAdName ? "mt-1 font-mono text-xs text-slate-700" : "mt-1 text-xs italic text-slate-400"}>{generatedAdName || "Enter an ad group name to generate an ad name."}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>TikTok identity</Label>
                          <SearchableSelect
                            value={selectedIdentityKey}
                            options={identitySelectOptions}
                            placeholder={identityLoading ? "Loading identities..." : "Select identity..."}
                            searchPlaceholder="Search by identity name, ID, type, BC ID..."
                            emptyMessage={identityEmptyMessage}
                            disabled={!form.tikTokAdAccountRowId || identityLoading || identitySelectOptions.length === 0}
                            onValueChange={(value) => {
                              const identity = identitySelectOptions.find((option) => option.key === value)
                              if (!identity) return
                              onCreativeChange(index, {
                                ...creative,
                                identityId: identity.identityId,
                                identityType: identity.identityType,
                                identityAuthorizedBcId: identity.identityAuthorizedBcId ?? undefined,
                              })
                            }}
                            getValue={(option) => option.key}
                            getSearchText={(option) => `${option.label} ${option.identityId} ${option.identityType} ${option.identityAuthorizedBcId ?? ""}`}
                            renderValue={(option) => (
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium text-slate-900">{option.displayName || option.identityId}</span>
                                <span className="truncate font-mono text-xs text-slate-500">{option.identityType}</span>
                              </span>
                            )}
                            renderOption={(option) => (
                              <div className="min-w-0 py-0.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{option.identityType}</Badge>
                                  {option.identityAuthorizedBcId ? <span className="truncate font-mono text-xs text-slate-500">BC {option.identityAuthorizedBcId}</span> : null}
                                </div>
                                <div className="truncate text-sm font-medium text-slate-900">{option.displayName || option.identityId}</div>
                                <div className="truncate font-mono text-xs text-slate-400">{option.identityId}</div>
                              </div>
                            )}
                          />
                          {form.tikTokAdAccountRowId && !identityLoading && identitySelectOptions.length === 0 ? (
                            <p className="text-xs text-amber-700">{identityEmptyMessage}</p>
                          ) : selectedIdentityKey && !selectedIdentityKnown ? (
                            <p className="text-xs text-amber-700">{selectedIdentitySupported ? "This identity is not available from TikTok anymore. Choose a current Business Center authorized identity before submit." : "The previously selected identity is not supported. Choose a Business Center authorized TikTok identity before submit."}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>Call to action</Label>
                          <Select value={creative.callToAction ?? "INSTALL_NOW"} onValueChange={(value) => onCreativeChange(index, { ...creative, callToAction: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {reference.callToActions.map((option) => (
                                <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Landing page URL</Label>
                          <Input value={creative.landingPageUrl ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, landingPageUrl: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Tracking URL</Label>
                          <Input value={creative.trackingUrl ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, trackingUrl: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Display name</Label>
                          <Input value={creative.displayName ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, displayName: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>App name</Label>
                          <Input value={creative.appName ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, appName: event.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Avatar icon web URI</Label>
                          <Input value={creative.avatarIconWebUri ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, avatarIconWebUri: event.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="sticky top-4 h-fit rounded-[24px] border border-slate-900 bg-slate-950 p-1 shadow-sm">
                      <div className="overflow-hidden rounded-[18px] bg-white">
                        <div className="flex items-center gap-2 border-b px-3 py-2">
                          <div className="h-7 w-7 rounded-full bg-slate-900" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">{creative.displayName || creative.appName || "TikTok identity"}</p>
                            <p className="text-[10px] text-slate-500">Sponsored</p>
                          </div>
                        </div>
                        <div className="flex aspect-[9/16] items-center justify-center bg-slate-100">
                          {selectedLibraryVideo?.previewUrl ? (
                            <video className="h-full w-full object-cover" controls src={selectedLibraryVideo.previewUrl} poster={selectedLibraryVideo.videoCoverUrl ?? undefined} />
                          ) : selectedLibraryVideo?.videoCoverUrl ? (
                            <img alt={selectedLibraryVideo.fileName ?? "TikTok library video"} className="h-full w-full object-cover" src={selectedLibraryVideo.videoCoverUrl} />
                          ) : videoMode === "upload" && videoPreview.url ? (
                            <ProtectedMediaVideo className="h-full w-full object-cover" controls fallback={previewFallback} requiresAuth={videoPreview.requiresAuth} src={videoPreview.url} />
                          ) : imageMode === "upload" && imagePreview.url ? (
                            <ProtectedMediaImage alt={imageAsset?.fileName ?? "Uploaded TikTok image"} className="h-full w-full object-cover" fallback={previewFallback} requiresAuth={imagePreview.requiresAuth} src={imagePreview.url} />
                          ) : imageMode === "library" && selectedLibraryImage?.imageUrl ? (
                            <img alt={selectedLibraryImage.fileName ?? "TikTok library image"} className="h-full w-full object-cover" src={selectedLibraryImage.imageUrl} />
                          ) : (
                            previewFallback
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="line-clamp-3 text-xs text-slate-800">{form.adGroup.adTexts?.find((item) => item.trim()) || "Ad text preview"}</p>
                          <div className="rounded bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white">{creative.callToAction || "INSTALL_NOW"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </SectionShell>
  )
}

function normalizeTextRows(values?: string[] | null) {
  const rows = values?.length ? values.slice(0, maxTikTokAdTexts) : [""]
  return rows.length ? rows : [""]
}

function TikTokAdTextVariationEditor({
  values,
  onChange,
}: {
  values: string[]
  onChange: (values: string[]) => void
}) {
  const rows = normalizeTextRows(values)

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs font-medium text-slate-700">Ad texts <span className="text-red-500">*</span></Label>
          <p className="text-[11px] text-slate-400">Add up to {maxTikTokAdTexts} texts. TikTok rotates these texts with all videos in this ad set.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange([...rows, ""])}
          disabled={rows.length >= maxTikTokAdTexts}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />Add text
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((value, textIndex) => (
          <div key={`tiktok-ad-text-${textIndex}`} className="flex items-start gap-2">
            <Textarea
              rows={3}
              value={value}
              placeholder={`Ad text ${textIndex + 1}`}
              onChange={(event) => {
                const nextValues = [...rows]
                nextValues[textIndex] = event.target.value
                onChange(nextValues)
              }}
              className="resize-none bg-white text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-8 px-2 text-red-600"
              onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== textIndex))}
              disabled={rows.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UploadBox({
  kind,
  label,
  asset,
  fallback,
  uploading,
  disabled = false,
  disabledReason,
  onUpload,
}: {
  kind: TikTokUploadKind
  label: string
  asset: TikTokRequestAssetDto | null
  fallback?: string
  uploading: boolean
  disabled?: boolean
  disabledReason?: string
  onUpload: (file: File | null) => void
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-sm font-semibold">{label}</Label>
          <p className="mt-1 truncate text-xs text-slate-500">{assetLabel(asset, fallback)}</p>
          {disabled && disabledReason ? <p className="mt-1 text-xs text-amber-700">{disabledReason}</p> : null}
        </div>
        <Badge variant="outline">{kind === "image" ? <ImageIcon className="mr-1 h-3 w-3" /> : null}{kind}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-md"
          type="file"
          accept={kind === "image" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/quicktime,video/x-m4v"}
          disabled={uploading || disabled}
          onChange={(event) => {
            onUpload(event.target.files?.[0] ?? null)
            event.currentTarget.value = ""
          }}
        />
        <Button type="button" variant="outline" disabled={uploading || disabled}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading" : "Stored asset"}
        </Button>
      </div>
    </div>
  )
}
