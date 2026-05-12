"use client"

import { useParams } from "next/navigation"
import { PersonaWorkspace } from "@/components/ai-specialized/persona-workspace"

export default function PersonaHubPage() {
  const params = useParams()
  const persona = String(params?.persona ?? "")
  const appId = Array.isArray(params?.appId) ? params.appId[0] : undefined

  return <PersonaWorkspace title={`AI ${persona}`} subtitle="Generic persona route fallback." appId={appId} />
}
