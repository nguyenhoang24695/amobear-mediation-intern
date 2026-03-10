import { AdminSystemConfigContent } from "@/components/ai-assistant/admin/admin-system-config-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function AdminSystemConfigPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="system-config">
      <AdminSystemConfigContent />
    </ScreenFunctionGuard>
  )
}
