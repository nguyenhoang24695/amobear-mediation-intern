import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { HELP_DOC_SLUGS, type HelpDocSlug } from "@/lib/help-docs"
import { loadHelpDocMarkdown } from "@/lib/load-help-doc"
import { transformHelpMarkdown } from "@/lib/transform-help-markdown"
import { HelpMarkdown } from "@/components/help/help-markdown"

const TITLES: Record<HelpDocSlug, string> = {
  "slack-user": "Slack cho User — Help",
  "alert-rules": "Alert Rule — Help",
}

export function generateStaticParams() {
  return HELP_DOC_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (!HELP_DOC_SLUGS.includes(slug as HelpDocSlug)) {
    return { title: "Help" }
  }
  return { title: `${TITLES[slug as HelpDocSlug]} — Nexus` }
}

export default async function HelpDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!HELP_DOC_SLUGS.includes(slug as HelpDocSlug)) {
    notFound()
  }

  let raw: string
  try {
    raw = await loadHelpDocMarkdown(slug)
  } catch {
    notFound()
  }

  const content = transformHelpMarkdown(raw)
  return <HelpMarkdown content={content} />
}
