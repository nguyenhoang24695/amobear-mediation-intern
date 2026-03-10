import { KnowledgeBaseContent } from "@/components/ai-assistant/knowledge-base/knowledge-base-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function KnowledgeBasePage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="knowledge-base">
      <KnowledgeBaseContent />
    </ScreenFunctionGuard>
  )
}
