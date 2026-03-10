import { AdminMetricsCatalogContent } from "@/components/ai-assistant/admin/admin-metrics-catalog-content"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"

export default function AdminMetricsCatalogPage() {
  return (
    <ScreenFunctionGuard screenKey="s-ai-assistant" functionKey="metrics-catalog">
      <AdminMetricsCatalogContent />
    </ScreenFunctionGuard>
  )
}
