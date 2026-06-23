import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { JobManagementContent } from "@/components/jobs/job-management-content"

export default function JobsPage() {
  return (
    <DashboardLayout>
      <JobManagementContent />
    </DashboardLayout>
  )
}
