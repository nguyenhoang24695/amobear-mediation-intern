const ALLOWED = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
])

export function getHelpUploadExtension(fileName: string): string {
  const base = fileName.trim().toLowerCase()
  const i = base.lastIndexOf(".")
  if (i < 0) return ""
  return base.slice(i)
}

export function isHelpUploadAllowedFile(file: File): boolean {
  const ext = getHelpUploadExtension(file.name)
  return ext !== "" && ALLOWED.has(ext)
}

export const HELP_UPLOAD_ACCEPT_HINT = "PDF, TXT, MD, DOCX, PNG, JPG, JPEG, GIF, WEBP"
