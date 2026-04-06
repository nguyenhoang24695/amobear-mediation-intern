import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { InsightTemplatesPageContent } from "@/components/settings-insight/insight-templates-page-content"

export default function InsightTemplatesPage() {
  return (
    <DashboardLayout>
      {/* Full-width work area (mockup): bù padding main của layout */}
      <div className="w-full max-w-none min-h-[calc(100dvh-5.5rem)] -mx-6 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="p-6 text-sm text-slate-500">Đang tải…</p>}>
          <InsightTemplatesPageContent />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
