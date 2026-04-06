/** Slug URL → file trong `content/help/` (chỉ các file được phép đọc). */
export const HELP_DOC_SLUGS = ["slack-user", "alert-rules"] as const
export type HelpDocSlug = (typeof HELP_DOC_SLUGS)[number]

export const HELP_DOC_FILES = {
  overview: "overview.md",
  "slack-user": "slack-user-configuration.md",
  "alert-rules": "alert-rule-configuration.md",
} as const

export type HelpNavItem = {
  slug: "" | HelpDocSlug
  title: string
  description?: string
}

/** Các trang con dưới nhóm "Alert Center" trong Help & Docs. */
export const HELP_ALERT_CENTER_CHILDREN: HelpNavItem[] = [
  { slug: "", title: "Tổng quan", description: "Mục lục và đường dẫn nhanh" },
  { slug: "slack-user", title: "Slack cho User", description: "Webhook trên Profile" },
  { slug: "alert-rules", title: "Alert Rule", description: "Tạo rule và kênh thông báo" },
]

const ALLOWED_FILES = new Set<string>(Object.values(HELP_DOC_FILES))

export function isAllowedHelpFile(fileName: string): boolean {
  return ALLOWED_FILES.has(pathBasename(fileName))
}

export function pathBasename(fileName: string): string {
  const parts = fileName.split(/[/\\]/)
  return parts[parts.length - 1] ?? fileName
}

export function helpFileNameForSlug(slug: string | undefined): string {
  if (!slug) return HELP_DOC_FILES.overview
  if (slug === "slack-user") return HELP_DOC_FILES["slack-user"]
  if (slug === "alert-rules") return HELP_DOC_FILES["alert-rules"]
  throw new Error("Unknown help slug")
}
