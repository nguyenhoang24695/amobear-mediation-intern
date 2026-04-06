import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { JobManagementContent } from "@/components/jobs/job-management-content"

export default function JobsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading jobs…</div>}>
        <JobManagementContent />
      </Suspense>
    </DashboardLayout>
  )
}

