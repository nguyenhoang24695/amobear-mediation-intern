import { loadHelpDocMarkdown } from "@/lib/load-help-doc"
import { transformHelpMarkdown } from "@/lib/transform-help-markdown"
import { HelpMarkdown } from "@/components/help/help-markdown"

export default async function HelpIndexPage() {
  const raw = await loadHelpDocMarkdown(undefined)
  const content = transformHelpMarkdown(raw)
  return <HelpMarkdown content={content} />
}
