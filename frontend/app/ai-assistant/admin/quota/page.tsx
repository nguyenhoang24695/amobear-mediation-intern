import { AdminQuotaContent } from "@/components/ai-assistant/admin/admin-quota-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function AdminQuotaPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="quota">
      <AdminQuotaContent />
    </ScreenFunctionGuard>
  )
}
