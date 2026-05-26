import type { MetaAppMappingDto } from "@/types/meta-ads"

export function resolveMetaAppMappingPlatform(mapping?: MetaAppMappingDto | null): string | null {
  const direct = normalizePlatform(mapping?.platform)
  if (direct) return direct

  const urlPlatform = [
    mapping?.objectStoreUrl,
    mapping?.storeUrlOverride,
    mapping?.deepLinkUrlOverride,
  ].map(resolvePlatformFromUrl).find(Boolean)
  if (urlPlatform) return urlPlatform

  if (mapping?.packageName || mapping?.storeIdentifierType === "package_name") return "ANDROID"
  if (mapping?.appStoreId || mapping?.storeIdentifierType === "app_store_id") return "IOS"
  return null
}

function normalizePlatform(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toUpperCase()
  if (normalized === "ANDROID") return "ANDROID"
  if (normalized === "IOS" || normalized === "IPHONE" || normalized === "IPAD") return "IOS"
  return null
}

function resolvePlatformFromUrl(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith("market://") || normalized.includes("play.google.com")) return "ANDROID"
  if (normalized.startsWith("itms-apps://") || normalized.includes("apps.apple.com") || normalized.includes("itunes.apple.com")) return "IOS"
  return null
}
