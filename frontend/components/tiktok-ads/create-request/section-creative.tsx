"use client"

import { useEffect } from "react"
import { ImageIcon, Loader2, Play, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTikTokRequestAssetPreviewSource } from "@/lib/tiktok-ads/media-preview"
import type { TikTokReferenceResponseDto, TikTokRequestAssetDto } from "@/types/tiktok-ads"
import { ProtectedMediaImage, ProtectedMediaVideo } from "../shared/protected-media"
import { SectionShell } from "./section-shell"
import type { TikTokMediaMode, TikTokRequestFormState } from "./types"
import { hasCreativeMedia, optionLabel } from "./types"

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  mediaMode: TikTokMediaMode
  uploadedAsset: TikTokRequestAssetDto | null
  uploading: boolean
  onChange: (patch: Partial<TikTokRequestFormState>) => void
  onAdFormatChange: (format: string) => void
  onMediaModeChange: (mode: TikTokMediaMode) => void
  onUpload: (file: File | null) => void
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function normalizeIdentityType(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  return !normalized || normalized === "CUSTOMIZED_USER" ? "AUTH_CODE" : normalized
}

function isDeprecatedCustomIdentity(value?: string | null) {
  return value?.trim().toUpperCase() === "CUSTOMIZED_USER"
}

function assetLabel(asset: TikTokRequestAssetDto | null) {
  if (!asset) return "No uploaded asset"
  const sizeMb = asset.sizeBytes > 0 ? `${(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB` : "unknown size"
  return `${asset.fileName} · ${sizeMb}`
}

export function CreativeSection({ form, reference, mediaMode, uploadedAsset, uploading, onChange, onAdFormatChange, onMediaModeChange, onUpload }: Props) {
  const isImage = form.ad.adFormat === "SINGLE_IMAGE"
  const isVideo = form.ad.adFormat === "SINGLE_VIDEO"
  const allowedIdentityTypes = reference.identityTypes.filter((option) => !isDeprecatedCustomIdentity(option.key))
  const identityTypes = allowedIdentityTypes.length > 0
    ? allowedIdentityTypes
    : [{ key: "AUTH_CODE", label: "Authorized TikTok identity" }]
  const normalizedIdentityType = normalizeIdentityType(form.ad.identityType)
  const selectedIdentityType = identityTypes.some((option) => option.key === form.ad.identityType)
    ? form.ad.identityType
    : identityTypes.find((option) => option.key === normalizedIdentityType)?.key ?? identityTypes[0]?.key ?? "AUTH_CODE"
  const ready = hasCreativeMedia(form)
  const uploadedPreview = getTikTokRequestAssetPreviewSource(uploadedAsset)
  const previewFallback = (
    <div className="flex flex-col items-center gap-2 text-slate-400">
      {isImage ? <ImageIcon className="h-10 w-10" /> : <Play className="h-10 w-10" />}
      <p className="max-w-[180px] truncate text-xs">{ready ? (isImage ? form.ad.imageIds[0] : form.ad.videoId) : "Media preview"}</p>
    </div>
  )

  useEffect(() => {
    if (form.ad.identityType === selectedIdentityType) return
    onChange({
      ad: {
        ...form.ad,
        identityType: selectedIdentityType,
        identityId: isDeprecatedCustomIdentity(form.ad.identityType) ? undefined : form.ad.identityId,
      },
    })
  }, [form.ad, normalizedIdentityType, onChange, selectedIdentityType])

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
              <Select value={form.ad.adFormat} onValueChange={onAdFormatChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reference.adFormats.map((option) => (
                    <SelectItem key={option.key} value={option.key} disabled={option.key === "CAROUSEL"}>
                      {optionLabel(option)}{option.key === "CAROUSEL" ? " (soon)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Identity type</Label>
              <Select value={selectedIdentityType} onValueChange={(value) => onChange({ ad: { ...form.ad, identityType: value } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {identityTypes.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mediaMode === "upload" ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-semibold">{isImage ? "Upload image" : "Upload video"}</Label>
                  <p className="mt-1 text-xs text-slate-500">{assetLabel(uploadedAsset)}</p>
                </div>
                <Badge variant="outline">{isImage ? "image" : "video"}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Input
                  className="max-w-md"
                  type="file"
                  accept={isImage ? "image/png,image/jpeg,image/webp" : "video/mp4,video/quicktime,video/x-m4v"}
                  disabled={uploading}
                  onChange={(event) => onUpload(event.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Uploading" : "Stored asset"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{isVideo ? "TikTok video_id" : "TikTok image_ids"}</Label>
              <Input
                value={isVideo ? form.ad.videoId ?? "" : form.ad.imageIds.join(", ")}
                onChange={(event) => onChange({
                  ad: isVideo
                    ? { ...form.ad, videoId: event.target.value.trim(), videoAssetId: undefined, imageIds: [], imageAssetIds: [] }
                    : { ...form.ad, imageIds: splitCsv(event.target.value), imageAssetIds: [], videoId: "", videoAssetId: undefined },
                })}
                placeholder={isVideo ? "v10033..." : "ad-site-i18n-sg/..., ad-site-i18n-sg/..."}
              />
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
              <Label>Identity ID</Label>
              <Input value={form.ad.identityId ?? ""} onChange={(event) => onChange({ ad: { ...form.ad, identityId: event.target.value } })} />
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
              {uploadedPreview.url && mediaMode === "upload" && isImage ? (
                <ProtectedMediaImage alt={uploadedAsset?.fileName ?? "Uploaded TikTok image"} className="h-full w-full object-cover" fallback={previewFallback} requiresAuth={uploadedPreview.requiresAuth} src={uploadedPreview.url} />
              ) : uploadedPreview.url && mediaMode === "upload" && isVideo ? (
                <ProtectedMediaVideo className="h-full w-full object-cover" controls fallback={previewFallback} requiresAuth={uploadedPreview.requiresAuth} src={uploadedPreview.url} />
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
