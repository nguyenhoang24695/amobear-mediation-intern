import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { JobHistoryContent } from "@/components/jobs/job-history-content"

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function JobHistoryPage({ params }: PageProps) {
  const { jobId } = await params
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading history...</div>}>
        <JobHistoryContent jobId={jobId} />
      </Suspense>
    </DashboardLayout>
  )
}
