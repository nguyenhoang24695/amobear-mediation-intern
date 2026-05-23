"use client"

import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useApi } from "@/hooks/use-api"
import { reportsApi } from "@/lib/api/services"
import { CustomReportBuilderContent } from "@/components/reports/custom-report-builder-content"
import { SavedReportsIndexContent } from "@/components/reports/saved-reports-index-content"

export function ReportsPageContent() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get("reportId")
  const isNewReport = searchParams.get("new") === "1"

  const { data: savedReports, loading } = useApi(
    () => reportsApi.listSaved(),
    { cacheKey: "custom_reports_saved_list" },
  )

  if (reportId || isNewReport) {
    return <CustomReportBuilderContent />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (savedReports && savedReports.length > 0) {
    return <SavedReportsIndexContent reports={savedReports} />
  }

  return <CustomReportBuilderContent />
}
