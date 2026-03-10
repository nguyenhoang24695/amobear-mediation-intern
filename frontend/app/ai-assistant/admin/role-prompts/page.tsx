import { AdminRolePromptsContent } from "@/components/ai-assistant/admin/admin-role-prompts-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function AdminRolePromptsPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="role-prompts">
      <AdminRolePromptsContent />
    </ScreenFunctionGuard>
  )
}
