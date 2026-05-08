import { base64UrlDecodeUtf8, base64UrlEncodeUtf8 } from "@/lib/base64url"

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function gzipBytes(input: Uint8Array): Promise<Uint8Array> {
  // Browser support: Chrome/Edge/Safari mới. Nếu không có, fallback ở caller.
  const cs = new CompressionStream("gzip")
  const writer = cs.writable.getWriter()
  writer.write(input)
  await writer.close()
  const ab = await new Response(cs.readable).arrayBuffer()
  return new Uint8Array(ab)
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip")
  const writer = ds.writable.getWriter()
  writer.write(input)
  await writer.close()
  const ab = await new Response(ds.readable).arrayBuffer()
  return new Uint8Array(ab)
}

export async function gzipBase64UrlEncodeUtf8(input: string): Promise<string> {
  try {
    if (typeof CompressionStream === "undefined") {
      return base64UrlEncodeUtf8(input)
    }
    const bytes = new TextEncoder().encode(input)
    const gz = await gzipBytes(bytes)
    return `g.${bytesToBase64Url(gz)}`
  } catch {
    // Một số môi trường có CompressionStream nhưng không hỗ trợ gzip ổn định
    return base64UrlEncodeUtf8(input)
  }
}

export async function gzipBase64UrlDecodeUtf8(input: string): Promise<string> {
  if (input.startsWith("g.")) {
    const body = input.slice(2)
    if (typeof DecompressionStream === "undefined") {
      // Không giải nén được: coi như invalid
      throw new Error("DecompressionStream is not available")
    }
    const gz = base64UrlToBytes(body)
    const bytes = await gunzipBytes(gz)
    return new TextDecoder().decode(bytes)
  }

  // Legacy: không nén
  return base64UrlDecodeUtf8(input)
}

