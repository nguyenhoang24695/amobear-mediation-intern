import { AiAssistantContent } from "@/components/ai-assistant/ai-assistant-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function AiAssistantPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="chat">
        <AiAssistantContent />
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
