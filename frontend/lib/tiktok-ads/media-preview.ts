import type { TikTokRequestAssetDto } from "@/types/tiktok-ads"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function getTikTokAdsApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, "")
}

export function buildTikTokRequestAssetContentUrl(assetId: number): string {
  return `${getTikTokAdsApiBaseUrl()}/api/v1/tiktok-campaign-requests/assets/${assetId}/content`
}

function isImmediatePreviewUrl(url?: string | null): boolean {
  if (!url) return false
  return url.startsWith("blob:") || url.startsWith("data:")
}

function resolveApiPreviewUrl(asset: TikTokRequestAssetDto): string {
  if (!asset.previewUrl) return buildTikTokRequestAssetContentUrl(asset.id)
  if (asset.previewUrl.startsWith("/")) return `${getTikTokAdsApiBaseUrl()}${asset.previewUrl}`
  return asset.previewUrl
}

export function getTikTokRequestAssetPreviewSource(asset?: TikTokRequestAssetDto | null): { url: string; requiresAuth: boolean } {
  if (!asset) return { url: "", requiresAuth: false }

  if (isImmediatePreviewUrl(asset.previewUrl)) {
    return { url: asset.previewUrl, requiresAuth: false }
  }

  return {
    url: resolveApiPreviewUrl(asset),
    requiresAuth: true,
  }
}
