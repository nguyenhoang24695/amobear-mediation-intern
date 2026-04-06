const PREFIX = "__CAT__:"
const SEP = "\n---\n"

export function packDescription(category: string, body: string): string {
  const c = category.trim()
  if (!c) return body.trim()
  return `${PREFIX}${c}${SEP}${body.trim()}`
}

export function unpackDescription(description: string | null | undefined): { category: string; body: string } {
  if (!description) return { category: "", body: "" }
  if (!description.startsWith(PREFIX)) return { category: "", body: description }
  const rest = description.slice(PREFIX.length)
  const sepIdx = rest.indexOf(SEP)
  if (sepIdx === -1) return { category: "", body: description }
  return {
    category: rest.slice(0, sepIdx).trim(),
    body: rest.slice(sepIdx + SEP.length).trim(),
  }
}
