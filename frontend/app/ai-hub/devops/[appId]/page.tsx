import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function DevopsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI DevOps" subtitle="Crash trend by version, stack hits, SDK hygiene, and release risk." appId={appId} />
}
