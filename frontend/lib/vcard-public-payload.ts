import type { VCardInput } from "@/lib/vcard"
import { base64UrlDecodeUtf8, base64UrlEncodeUtf8 } from "@/lib/base64url"

export type VCardPublicPayload = {
  v: 1
  data: Partial<VCardInput> & Pick<VCardInput, "firstName" | "lastName">
}

function prune<T extends Record<string, any>>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    if (typeof v === "string" && v.trim() === "") continue
    if (typeof v === "object" && !Array.isArray(v)) {
      const child = prune(v)
      if (Object.keys(child).length === 0) continue
      out[k] = child
      continue
    }
    out[k] = v
  }
  return out
}

export function encodeVCardPublicPayload(input: VCardInput): string {
  const payload: VCardPublicPayload = { v: 1, data: prune(input) }
  // Legacy sync encode (giữ lại cho nơi chưa migrate)
  return JSON.stringify(payload)
}

export async function encodeVCardPublicPayloadCompressed(input: VCardInput): Promise<string> {
  const payload: VCardPublicPayload = { v: 1, data: prune(input) }
  // Encode sync để tránh treo/hang ở một số môi trường browser khi dùng CompressionStream/gzip.
  return base64UrlEncodeUtf8(JSON.stringify(payload))
}

export async function decodeVCardPublicPayload(encoded: string): Promise<VCardInput | null> {
  try {
    const json = base64UrlDecodeUtf8(encoded)
    const parsed = JSON.parse(json) as VCardPublicPayload
    if (!parsed || parsed.v !== 1 || !parsed.data?.firstName || !parsed.data?.lastName) return null
    return {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      org: parsed.data.org ?? "",
      jobTitle: parsed.data.jobTitle ?? "",
      mobileNumber: parsed.data.mobileNumber ?? "",
      workNumber: parsed.data.workNumber ?? "",
      workEmail: parsed.data.workEmail ?? "",
      personalEmail: parsed.data.personalEmail ?? "",
      website1: parsed.data.website1 ?? "",
      website2: parsed.data.website2 ?? "",
      telegram: parsed.data.telegram ?? "",
      whatsapp: parsed.data.whatsapp ?? "",
      zalo: parsed.data.zalo ?? "",
      facebook: parsed.data.facebook ?? "",
      linkedin: parsed.data.linkedin ?? "",
      homeAddress: parsed.data.homeAddress,
      workAddress: parsed.data.workAddress,
      notes: parsed.data.notes ?? "",
    }
  } catch {
    return null
  }
}

