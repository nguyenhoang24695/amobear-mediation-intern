import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function UaMarketingPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI UA Marketing" subtitle="Channel × country matrix, ROAS heatmap, cohort LTV curves, kill-list." appId={appId} />
}
