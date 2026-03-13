export const ALL_FORMATS_VALUE = "all"

export const AD_FORMAT_OPTIONS = [
  { value: ALL_FORMATS_VALUE, label: "All Formats" },
  { value: "BANNER", label: "Banner" },
  { value: "INTERSTITIAL", label: "Interstitial" },
  { value: "REWARDED", label: "Rewarded" },
  { value: "NATIVE", label: "Native" },
  { value: "APP_OPEN", label: "App Open" },
] as const

const AD_FORMAT_LABELS: Record<string, string> = {
  BANNER: "Banner",
  INTERSTITIAL: "Interstitial",
  REWARDED: "Rewarded",
  NATIVE: "Native",
  APP_OPEN: "App Open",
}

export function normalizeAdFormat(format?: string | null): string | undefined {
  if (!format) return undefined

  return format
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
}

export function formatAdFormatLabel(format?: string | null): string {
  const normalized = normalizeAdFormat(format)
  if (!normalized) return "Unknown"

  return (
    AD_FORMAT_LABELS[normalized] ??
    normalized
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}
