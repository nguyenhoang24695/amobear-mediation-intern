/** Alias phổ biến → ISO alpha-2 (emoji cờ chuẩn). */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
}

const REGIONAL_INDICATOR_A = 0x1f1e6
const ASCII_A = 0x41

/**
 * Chuyển mã quốc gia 2 chữ (VD: US, VN) thành emoji lá cờ.
 * Trả null nếu không phải A–Z × 2 sau khi chuẩn hóa.
 */
export function iso3166Alpha2ToFlagEmoji(code: string | null | undefined): string | null {
  if (!code || typeof code !== "string") return null
  const normalized = COUNTRY_CODE_ALIASES[code.trim().toUpperCase()] ?? code.trim().toUpperCase()
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) return null
  const a = normalized.codePointAt(0)!
  const b = normalized.codePointAt(1)!
  if (a < ASCII_A || a > 0x5a || b < ASCII_A || b > 0x5a) return null
  return String.fromCodePoint(REGIONAL_INDICATOR_A + (a - ASCII_A), REGIONAL_INDICATOR_A + (b - ASCII_A))
}
