/** Thông báo mặc định khi không đọc được chi tiết từ backend. */
export const GENERIC_API_ERROR_VI = "Đã xảy ra lỗi. Vui lòng thử lại sau hoặc liên hệ quản trị."

function formatValidationErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null
  const parts: string[] = []
  for (const [k, v] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`)
    else if (typeof v === "string") parts.push(`${k}: ${v}`)
  }
  return parts.length > 0 ? parts.join("\n") : null
}

/**
 * Ưu tiên nội dung lỗi từ body JSON (ApiClient gắn `response.data`),
 * sau đó `Error.message`, cuối cùng là thông báo chung.
 */
export function getApiErrorMessage(err: unknown, genericMessage: string = GENERIC_API_ERROR_VI): string {
  const fromResponse = (): string | null => {
    const data = (err as { response?: { data?: unknown } })?.response?.data
    if (!data || typeof data !== "object") return null
    const o = data as Record<string, unknown>

    if (typeof o.error === "string" && o.error.trim()) return o.error.trim()

    if (typeof o.message === "string" && o.message.trim()) return o.message.trim()

    if (typeof o.detail === "string" && o.detail.trim()) {
      const title = typeof o.title === "string" ? o.title.trim() : ""
      return title ? `${title}\n${o.detail.trim()}` : o.detail.trim()
    }

    if (typeof o.title === "string" && o.title.trim()) return o.title.trim()

    const ve = formatValidationErrors(o.errors)
    if (ve) return ve

    if (o.error && typeof o.error === "object") {
      const inner = o.error as Record<string, unknown>
      if (typeof inner.message === "string" && inner.message.trim()) return inner.message.trim()
    }

    return null
  }

  const r = fromResponse()
  if (r) return r

  if (err instanceof Error) {
    const m = err.message?.trim() ?? ""
    if (m && m !== "Request failed") return m
  }

  return genericMessage
}
