import type { MetaCreativeMediaSourceDto, MetaRequestAssetSelectionState } from "@/types/meta-ads"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export function getMetaAdsApiBaseUrl(): string {
  return API_BASE_URL.replace(/\/$/, "")
}

export function buildMetaRequestAssetContentUrl(assetId: number): string {
  return `${getMetaAdsApiBaseUrl()}/api/v1/meta-campaign-requests/assets/${assetId}/content`
}

function isImmediatePreviewUrl(url?: string | null): boolean {
  if (!url) return false
  return url.startsWith("blob:") || url.startsWith("data:")
}

export function getMediaPreviewSource(source?: MetaCreativeMediaSourceDto | null): { url: string; requiresAuth: boolean } {
  if (!source) return { url: "", requiresAuth: false }
  if (source.uploadedAssetId) {
    return {
      url: buildMetaRequestAssetContentUrl(source.uploadedAssetId),
      requiresAuth: true,
    }
  }

  return {
    url: source.imageUrl ?? "",
    requiresAuth: false,
  }
}

export function getSelectionPreviewSource(selection?: MetaRequestAssetSelectionState | null): { url: string; requiresAuth: boolean } {
  if (!selection) return { url: "", requiresAuth: false }

  if (selection.uploadedAssetId) {
    if (isImmediatePreviewUrl(selection.uploadedAssetPreviewUrl)) {
      return {
        url: selection.uploadedAssetPreviewUrl,
        requiresAuth: false,
      }
    }

    return {
      url: buildMetaRequestAssetContentUrl(selection.uploadedAssetId),
      requiresAuth: true,
    }
  }

  if (selection.mode === "meta_ref" && selection.metaPreviewUrl) {
    return {
      url: selection.metaPreviewUrl,
      requiresAuth: selection.metaPreviewRequiresAuth,
    }
  }

  return {
    url: selection.imageUrl,
    requiresAuth: false,
  }
}


