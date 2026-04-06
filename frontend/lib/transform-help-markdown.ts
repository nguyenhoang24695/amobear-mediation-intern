/**
 * Chuẩn hóa link nội bộ trong Markdown help để hoạt động trong app (/help/...).
 * Ảnh `images/...` → `/help-images/...` (file đặt trong `public/help-images/`).
 */
export function transformHelpMarkdown(markdown: string): string {
  let s = markdown
  s = s.replace(/\]\(\.\/slack-user-configuration\.md\)/g, "](/help/slack-user)")
  s = s.replace(/\]\(\.\/alert-rule-configuration\.md\)/g, "](/help/alert-rules)")
  s = s.replace(/\]\(\.\/README\.md\)/g, "](/help)")
  s = s.replace(/\]\(\.\/images\/README\.md\)/g, "](/help)")
  s = s.replace(/\]\(images\//g, "](/help-images/")
  return s
}
