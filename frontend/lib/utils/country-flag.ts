/** Alias phổ biến → ISO alpha-2 (emoji cờ chuẩn). */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
}

const REGIONAL_INDICATOR_A = 0x1f1e6
const ASCII_A = 0x41

/**
 * Chuẩn hóa mã 2 chữ (VD: uk → GB). Trả null nếu không hợp lệ.
 */
export function normalizeIso3166Alpha2(code: string | null | undefined): string | null {
  if (!code || typeof code !== "string") return null
  const upper = code.trim().toUpperCase()
  const iso = COUNTRY_CODE_ALIASES[upper] ?? upper
  if (iso.length !== 2 || !/^[A-Z]{2}$/.test(iso)) return null
  return iso
}

/**
 * Tên quốc gia hiển thị (theo locale), dựa trên ISO 3166-1 alpha-2.
 */
export function iso3166Alpha2ToCountryName(code: string | null | undefined, locale = "vi"): string {
  const raw = code?.trim()
  if (!raw) return ""
  const iso = normalizeIso3166Alpha2(raw)
  if (!iso) return raw
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" })
    return dn.of(iso) ?? raw
  } catch {
    return raw
  }
}

/**
 * Chuyển mã quốc gia 2 chữ (VD: US, VN) thành emoji lá cờ.
 * Trả null nếu không phải A–Z × 2 sau khi chuẩn hóa.
 */
export function iso3166Alpha2ToFlagEmoji(code: string | null | undefined): string | null {
  const normalized = normalizeIso3166Alpha2(code)
  if (!normalized) return null
  const a = normalized.codePointAt(0)!
  const b = normalized.codePointAt(1)!
  if (a < ASCII_A || a > 0x5a || b < ASCII_A || b > 0x5a) return null
  return String.fromCodePoint(REGIONAL_INDICATOR_A + (a - ASCII_A), REGIONAL_INDICATOR_A + (b - ASCII_A))
}
