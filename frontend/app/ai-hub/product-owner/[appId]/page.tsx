import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function ProductOwnerPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI Product Owner" subtitle="Utility / game lens with funnel diagnosis and recommendations." appId={appId} />
}
