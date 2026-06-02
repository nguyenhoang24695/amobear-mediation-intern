"use client"

import { useCallback } from "react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { reportsApi } from "@/lib/api/services"
import { CustomReportBuilderContent } from "@/components/reports/custom-report-builder-content"
import { SavedReportsIndexContent } from "@/components/reports/saved-reports-index-content"

/** Force remount when switching saved report vs new report — avoids stale title/filters in one instance. */
function customReportBuilderKey(
  reportId: string | null,
  isNewReport: boolean,
  folder: string | null,
): string {
  if (reportId) return `report:${reportId}`
  if (isNewReport) return `new:${folder?.trim() || ""}`
  return "default"
}

export function ReportsPageContent() {
  const searchParams = useSearchParams()
  const reportId = searchParams.get("reportId")
  const isNewReport = searchParams.get("new") === "1"
  const folder = searchParams.get("folder")
  const builderKey = customReportBuilderKey(reportId, isNewReport, folder)

  const { data: savedReports, loading: loadingReports, refetch: refetchReports } = useApi(
    () => reportsApi.listSaved(),
    { cacheKey: "custom_reports_saved_list" },
  )

  const { data: folders, loading: loadingFolders, refetch: refetchFolders } = useApi(
    () => reportsApi.listFolders(),
    { cacheKey: "custom_reports_folders_list" },
  )

  const handleDataChange = useCallback(() => {
    invalidateCache("custom_reports_saved_list")
    invalidateCache("custom_reports_folders_list")
    void refetchReports()
    void refetchFolders()
  }, [refetchReports, refetchFolders])

  if (reportId || isNewReport) {
    return <CustomReportBuilderContent key={builderKey} />
  }

  if (loadingReports || loadingFolders) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const reportList = savedReports ?? []
  const folderList = folders ?? []

  if (reportList.length > 0 || folderList.length > 0) {
    return (
      <SavedReportsIndexContent
        reports={reportList}
        folders={folderList}
        onDataChange={handleDataChange}
      />
    )
  }

  return <CustomReportBuilderContent key={builderKey} />
}
