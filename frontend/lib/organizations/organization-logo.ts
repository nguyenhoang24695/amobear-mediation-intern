/** Logo stored in DB as data URL (data:image/...;base64,...). */
export function resolveOrganizationLogoSrc(logoUrl?: string | null): string | null {
  if (!logoUrl?.trim()) return null
  const trimmed = logoUrl.trim()
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed
  }
  return null
}

export function organizationLogoCacheKey(orgId: string, logoUrl?: string | null): string {
  const src = resolveOrganizationLogoSrc(logoUrl)
  if (!src) return `${orgId}:none`
  if (src.startsWith("data:")) return `${orgId}:data:${src.length}`
  return `${orgId}:${src}`
}
