import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { InsightGenerationPageContent } from "@/components/settings-insight/insight-generation-page-content"

export default function InsightGenerationPage() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <InsightGenerationPageContent />
      </div>
    </DashboardLayout>
  )
}
