import { ContextLibraryContent } from "@/components/ai-assistant/library/context-library-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function ContextLibraryPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="library">
      <ContextLibraryContent />
    </ScreenFunctionGuard>
  )
}
