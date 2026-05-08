import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function MediationPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI Mediation / AdOps" subtitle="Waterfall visualizer, eCPM trend, fill heatmap, concentration risk." appId={appId} />
}
