"use client"

import { AiSettingsContent } from "@/components/ai-assistant/settings/ai-settings-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function AiAssistantSettingsPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="settings">
      <div className="flex-1 overflow-auto">
        <AiSettingsContent />
      </div>
    </ScreenFunctionGuard>
  )
}
