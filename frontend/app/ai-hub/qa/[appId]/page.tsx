import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function QaPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI QA" subtitle="Gate banner GO/Conditional/BLOCK, version compare, bug-event correlation." appId={appId} />
}
