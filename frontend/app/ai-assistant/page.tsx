import { Suspense } from "react"
import { AiAssistantContent } from "@/components/ai-assistant/ai-assistant-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function AiAssistantPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="chat">
        <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-5rem)] text-slate-500">Đang tải...</div>}>
          <AiAssistantContent />
        </Suspense>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}
