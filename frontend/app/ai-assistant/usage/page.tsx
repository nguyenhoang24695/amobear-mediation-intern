import { UsageDashboardContent } from "@/components/ai-assistant/usage/usage-dashboard-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function UsagePage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="usage">
      <UsageDashboardContent />
    </ScreenFunctionGuard>
  )
}
