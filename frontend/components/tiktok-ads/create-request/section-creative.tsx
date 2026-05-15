"use client"

import { Loader2, Play, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTikTokRequestAssetPreviewSource } from "@/lib/tiktok-ads/media-preview"
import type { TikTokIdentityOptionDto, TikTokRequestAssetDto } from "@/types/tiktok-ads"
import { ProtectedMediaImage, ProtectedMediaVideo } from "../shared/protected-media"
import { SearchableSelect } from "./searchable-select"
import { SectionShell } from "./section-shell"
import type { TikTokMediaMode, TikTokRequestFormState } from "./types"
import { hasCreativeMedia } from "./types"

type TikTokUploadKind = "image" | "video"

interface Props {
  form: TikTokRequestFormState
  mediaMode: TikTokMediaMode
  uploadedVideoAsset: TikTokRequestAssetDto | null
  uploadedImageAsset: TikTokRequestAssetDto | null
  uploadingVideo: boolean
  uploadingImage: boolean
  identityOptions: TikTokIdentityOptionDto[]
  identityLoading: boolean
  identityLoadError?: string | null
  identityConfirmed: boolean
  imageUploadDisabled?: boolean
  imageUploadDisabledReason?: string
  creativeValidationMessage?: string | null
  onChange: (patch: Partial<TikTokRequestFormState>) => void
  onMediaModeChange: (mode: TikTokMediaMode) => void
  onUpload: (kind: TikTokUploadKind, file: File | null) => void
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

export function CreativeSection({
  form,
  mediaMode,
  uploadedVideoAsset,
  uploadedImageAsset,
  uploadingVideo,
  uploadingImage,
  identityOptions,
  identityLoading,
  identityLoadError,
  identityConfirmed,
  imageUploadDisabled = false,
  imageUploadDisabledReason,
  creativeValidationMessage,
  onChange,
  onMediaModeChange,
  onUpload,
}: Props) {
  const ready = hasCreativeMedia(form)
  const uploadedVideoPreview = getTikTokRequestAssetPreviewSource(uploadedVideoAsset)
  const uploadedImagePreview = getTikTokRequestAssetPreviewSource(uploadedImageAsset)
  const videoAssetFallback = form.ad.videoAssetId ? `Uploaded video asset #${form.ad.videoAssetId}` : undefined
  const imageAssetFallback = form.ad.imageAssetIds.length ? `Uploaded image asset #${form.ad.imageAssetIds.join(", ")}` : undefined
  const selectedIdentityKey = identityOptionKey(form.ad.identityId, form.ad.identityType, form.ad.identityAuthorizedBcId)
  const selectedIdentityKnown = identityOptions.some((option) => option.key === selectedIdentityKey)
  const identityEmptyMessage = form.tikTokAdAccountRowId
    ? identityLoadError || "No usable identities found for this ad account."
    : "Select an ad account first."
  const identitySelectOptions = selectedIdentityKey && !selectedIdentityKnown
    ? [
        {
          key: selectedIdentityKey,
          label: `${form.ad.identityId} (${normalizeIdentityType(form.ad.identityType)}, previously selected)`,
          identityId: form.ad.identityId ?? "",
          identityType: normalizeIdentityType(form.ad.identityType),
          identityAuthorizedBcId: form.ad.identityAuthorizedBcId,
          displayName: null,
        } satisfies TikTokIdentityOptionDto,
        ...identityOptions,
      ]
    : identityOptions
  const previewFallback = (
    <div className="flex flex-col items-center gap-2 text-slate-400">
      <Play className="h-10 w-10" />
      <p className="max-w-[180px] truncate text-xs">{ready ? form.ad.videoId || videoAssetFallback : "Media preview"}</p>
    </div>
  )

  const uploadBox = (kind: TikTokUploadKind, label: string, asset: TikTokRequestAssetDto | null, fallback: string | undefined, uploading: boolean, disabled = false, disabledReason?: string) => (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">{label}</Label>
          <p className="mt-1 text-xs text-slate-500">{assetLabel(asset, fallback)}</p>
          {disabled && disabledReason ? <p className="mt-1 text-xs text-amber-700">{disabledReason}</p> : null}
        </div>
        <Badge variant="outline">{kind}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          className="max-w-md"
          type="file"
          accept={kind === "image" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/quicktime,video/x-m4v"}
          disabled={uploading || disabled}
          onChange={(event) => {
            onUpload(kind, event.target.files?.[0] ?? null)
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

  return (
    <SectionShell
      eyebrow="Creative"
      title="TikTok Creative"
      description="Choose format, media source, and identity for the TikTok ad."
      ready={ready}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Ad format</Label>
              <div className="flex h-10 items-center rounded-md border bg-slate-50 px-3 text-sm font-medium text-slate-700">
                Single video
              </div>
            </div>

            <div className="space-y-2">
              <Label>Media source</Label>
              <Select value={mediaMode} onValueChange={(value) => onMediaModeChange(value as TikTokMediaMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload asset</SelectItem>
                  <SelectItem value="existing">Existing TikTok ID</SelectItem>
                </SelectContent>
              </Select>
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
                  onChange({
                    ad: {
                      ...form.ad,
                      identityId: identity.identityId,
                      identityType: identity.identityType,
                      identityAuthorizedBcId: identity.identityAuthorizedBcId ?? undefined,
                    },
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
              ) : selectedIdentityKey && !identityConfirmed ? (
                <p className="text-xs text-amber-700">This identity is not available from TikTok anymore. Choose a current identity before submit.</p>
              ) : null}
            </div>
          </div>

          {mediaMode === "upload" ? (
            <div className="space-y-3">
              {uploadBox("video", "Upload video", uploadedVideoAsset, videoAssetFallback, uploadingVideo)}
              {uploadBox("image", "Upload cover image", uploadedImageAsset, imageAssetFallback, uploadingImage, imageUploadDisabled, imageUploadDisabledReason)}
              {creativeValidationMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {creativeValidationMessage}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>TikTok video_id</Label>
                <Input
                  value={form.ad.videoId ?? ""}
                  onChange={(event) => onChange({ ad: { ...form.ad, videoId: event.target.value.trim(), videoAssetId: undefined } })}
                  placeholder="v10033..."
                />
              </div>
              <div className="space-y-2">
                <Label>TikTok cover image_ids</Label>
                <Input
                  value={form.ad.imageIds.join(", ")}
                  onChange={(event) => onChange({ ad: { ...form.ad, imageIds: splitCsv(event.target.value), imageAssetIds: [] } })}
                  placeholder="ad-site-i18n-sg/..."
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={form.ad.displayName ?? ""} onChange={(event) => onChange({ ad: { ...form.ad, displayName: event.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>App name</Label>
              <Input value={form.ad.appName ?? ""} onChange={(event) => onChange({ ad: { ...form.ad, appName: event.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>Avatar icon web URI</Label>
              <Input value={form.ad.avatarIconWebUri ?? ""} onChange={(event) => onChange({ ad: { ...form.ad, avatarIconWebUri: event.target.value } })} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-3 shadow-sm">
          <div className="overflow-hidden rounded-[22px] bg-white">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <div className="h-7 w-7 rounded-full bg-slate-900" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{form.ad.displayName || form.ad.appName || "TikTok identity"}</p>
                <p className="text-[10px] text-slate-500">Sponsored</p>
              </div>
            </div>
            <div className="flex aspect-[9/16] items-center justify-center bg-slate-100">
              {uploadedVideoPreview.url && mediaMode === "upload" ? (
                <ProtectedMediaVideo className="h-full w-full object-cover" controls fallback={previewFallback} requiresAuth={uploadedVideoPreview.requiresAuth} src={uploadedVideoPreview.url} />
              ) : uploadedImagePreview.url && mediaMode === "upload" ? (
                <ProtectedMediaImage alt={uploadedImageAsset?.fileName ?? "Uploaded TikTok image"} className="h-full w-full object-cover" fallback={previewFallback} requiresAuth={uploadedImagePreview.requiresAuth} src={uploadedImagePreview.url} />
              ) : (
                previewFallback
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="line-clamp-3 text-xs text-slate-800">{form.ad.adText || "Ad text preview"}</p>
              <div className="rounded bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white">{form.ad.callToAction || "INSTALL_NOW"}</div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
