import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function UaPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI UA Marketing" subtitle="Alias route for UA workspace." appId={appId} />
}
