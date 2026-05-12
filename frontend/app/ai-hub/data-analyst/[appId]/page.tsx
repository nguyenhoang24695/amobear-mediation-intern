import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default async function DataAnalystAppPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  return <PersonaWorkspace title="AI Data Analyst" subtitle="Decomposition → SQL → chart for app-level deep dive." appId={appId} />
}
