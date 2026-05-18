"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, ImageIcon, Loader2, Play, Plus, Trash2, Upload, Wand2 } from "lucide-react"
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

type TikTokUploadKind = "image" | "video"
type TikTokCreativeDraft = TikTokRequestFormState["ad"]

interface VideoRatioInfo {
  ratio: number
  label: string
}

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  uploadedAssetsById: Record<number, TikTokRequestAssetDto>
  videoRatiosByAssetId: Record<number, VideoRatioInfo>
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
  return !normalized || normalized === "CUSTOMIZED_USER" ? "AUTH_CODE" : normalized
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

function isCreativeReady(creative: TikTokCreativeDraft) {
  const hasVideo = Boolean(creative.videoId?.trim() || creative.videoAssetId)
  const hasImage = creative.imageIds.length > 0 || creative.imageAssetIds.length > 0
  const hasCopy = Boolean(creative.adName.trim() && creative.adText?.trim() && creative.callToAction && creative.landingPageUrl?.trim())
  const hasIdentity = Boolean(creative.identityId?.trim())
  return hasVideo && hasImage && hasCopy && hasIdentity
}

export function CreativeSection({
  form,
  reference,
  uploadedAssetsById,
  videoRatiosByAssetId,
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
  const lastGeneratedNamesRef = useRef<Record<number, string>>({})

  function resolveVideoMode(index: number, creative: TikTokCreativeDraft): TikTokMediaMode {
    return videoModeOverrides[index] ?? getCreativeVideoMode(creative)
  }

  function resolveImageMode(index: number, creative: TikTokCreativeDraft): TikTokMediaMode {
    return imageModeOverrides[index] ?? getCreativeImageMode(creative)
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
    onCreativeChange(index, { ...creative, videoId: "", videoAssetId: undefined })
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
      description="Create one or more video ads under the same TikTok campaign and ad group."
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
              Add creative
            </Button>
          </div>

          {creatives.map((creative, index) => {
            const videoMode = resolveVideoMode(index, creative)
            const imageMode = resolveImageMode(index, creative)
            const videoAsset = creative.videoAssetId ? uploadedAssetsById[creative.videoAssetId] ?? null : null
            const imageAssetId = creative.imageAssetIds[0]
            const imageAsset = imageAssetId ? uploadedAssetsById[imageAssetId] ?? null : null
            const libraryVideoId = videoMode === "library" ? creative.videoId?.trim() ?? "" : ""
            const libraryImageId = imageMode === "library" ? creative.imageIds[0] ?? "" : ""
            const selectedLibraryVideo = libraryVideoId ? libraryVideos.find((v) => v.videoId === libraryVideoId) ?? null : null
            const selectedLibraryImage = libraryImageId ? libraryImages.find((i) => i.imageId === libraryImageId) ?? null : null
            const libraryEmptyMessage = libraryLoadError
              ? libraryLoadError
              : libraryLoading
                ? "Loading TikTok library..."
                : form.tikTokAdAccountRowId
                  ? "No matching asset in TikTok library."
                  : "Select an ad account first."
            const videoRatio = creative.videoAssetId ? videoRatiosByAssetId[creative.videoAssetId] : undefined
            const imageUploadGatedByVideo = videoMode === "upload" && (!creative.videoAssetId || !videoRatio)
            const imageUploadDisabled = imageMode === "upload" && imageUploadGatedByVideo
            const imageUploadDisabledReason = !creative.videoAssetId
              ? "Upload video before uploading the cover image."
              : "Video dimensions are loading before cover image validation."
            const selectedIdentityKey = identityOptionKey(creative.identityId, creative.identityType, creative.identityAuthorizedBcId)
            const selectedIdentityKnown = identityOptions.some((option) => option.key === selectedIdentityKey)
            const identityEmptyMessage = form.tikTokAdAccountRowId
              ? identityLoadError || "No usable identities found for this ad account."
              : "Select an ad account first."
            const identitySelectOptions = selectedIdentityKey && !selectedIdentityKnown
              ? [
                {
                  key: selectedIdentityKey,
                  label: `${creative.identityId} (${normalizeIdentityType(creative.identityType)}, previously selected)`,
                  identityId: creative.identityId ?? "",
                  identityType: normalizeIdentityType(creative.identityType),
                  identityAuthorizedBcId: creative.identityAuthorizedBcId,
                  displayName: null,
                } satisfies TikTokIdentityOptionDto,
                ...identityOptions,
              ]
              : identityOptions
            const videoPreview = getTikTokRequestAssetPreviewSource(videoAsset)
            const imagePreview = getTikTokRequestAssetPreviewSource(imageAsset)
            const validationMessage = creativeValidationMessages[index]
            const uploadingVideo = Boolean(uploadingKeys[uploadKey(index, "video")])
            const uploadingImage = Boolean(uploadingKeys[uploadKey(index, "image")])
            const videoAssetFallback = creative.videoAssetId ? `Uploaded video asset #${creative.videoAssetId}` : undefined
            const imageAssetFallback = creative.imageAssetIds.length ? `Uploaded image asset #${creative.imageAssetIds.join(", ")}` : undefined
            const generatedAdName = buildCreativeAdName(form, creative, index)
            const previewFallback = (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Play className="h-8 w-8" />
                <p className="max-w-[160px] truncate text-xs">{creative.videoId || videoAssetFallback || "Media preview"}</p>
              </div>
            )

            return (
              <TabsContent key={index} value={creativeTabValue(index)} className="mt-0">
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700">Creative #{index + 1}</Badge>
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
                                  onCreativeChange(index, { ...creative, videoId: picked.videoId, videoAssetId: undefined })
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
                                        {option.width && option.height ? `${option.width}x${option.height}` : ""}{option.duration ? ` · ${Number(option.duration).toFixed(1)}s` : ""}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              />
                              {selectedLibraryVideo && !selectedLibraryVideo.displayable ? (
                                <p className="text-xs text-amber-700">This video is not displayable on TikTok anymore.</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-600">TikTok video_id</Label>
                              <Input
                                value={creative.videoId ?? ""}
                                onChange={(event) => onCreativeChange(index, { ...creative, videoId: event.target.value.trim(), videoAssetId: undefined })}
                                placeholder="v10033..."
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
                                <p className="text-xs text-amber-700">This image is not displayable on TikTok anymore.</p>
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
                            disabled={!form.tikTokAdAccountRowId || identityLoading || identityOptions.length === 0}
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
                          {form.tikTokAdAccountRowId && !identityLoading && identityOptions.length === 0 ? (
                            <p className="text-xs text-amber-700">{identityEmptyMessage}</p>
                          ) : selectedIdentityKey && !selectedIdentityKnown ? (
                            <p className="text-xs text-amber-700">This identity is not available from TikTok anymore. Choose a current identity before submit.</p>
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
                        <div className="space-y-2 md:col-span-2">
                          <Label>Ad text</Label>
                          <Textarea rows={3} value={creative.adText ?? ""} onChange={(event) => onCreativeChange(index, { ...creative, adText: event.target.value })} />
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
                          {videoMode === "upload" && videoPreview.url ? (
                            <ProtectedMediaVideo className="h-full w-full object-cover" controls fallback={previewFallback} requiresAuth={videoPreview.requiresAuth} src={videoPreview.url} />
                          ) : videoMode === "library" && selectedLibraryVideo?.previewUrl ? (
                            <video className="h-full w-full object-cover" controls src={selectedLibraryVideo.previewUrl} poster={selectedLibraryVideo.videoCoverUrl ?? undefined} />
                          ) : videoMode === "library" && selectedLibraryVideo?.videoCoverUrl ? (
                            <img alt={selectedLibraryVideo.fileName ?? "TikTok library video"} className="h-full w-full object-cover" src={selectedLibraryVideo.videoCoverUrl} />
                          ) : imageMode === "upload" && imagePreview.url ? (
                            <ProtectedMediaImage alt={imageAsset?.fileName ?? "Uploaded TikTok image"} className="h-full w-full object-cover" fallback={previewFallback} requiresAuth={imagePreview.requiresAuth} src={imagePreview.url} />
                          ) : imageMode === "library" && selectedLibraryImage?.imageUrl ? (
                            <img alt={selectedLibraryImage.fileName ?? "TikTok library image"} className="h-full w-full object-cover" src={selectedLibraryImage.imageUrl} />
                          ) : (
                            previewFallback
                          )}
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="line-clamp-3 text-xs text-slate-800">{creative.adText || "Ad text preview"}</p>
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
