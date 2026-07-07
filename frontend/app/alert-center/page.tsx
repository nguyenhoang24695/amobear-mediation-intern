import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AlertCenterEntryGuard } from "@/components/auth/alert-center-entry-guard"
import { AlertCenterContentV2 } from "@/components/alerts/alert-center-content-v2"

export default function AlertCenterPage() {
  return (
    <DashboardLayout>
      <AlertCenterEntryGuard>
        <Suspense fallback={<AlertCenterSkeleton />}>
          <AlertCenterContentV2 />
        </Suspense>
      </AlertCenterEntryGuard>
    </DashboardLayout>
  )
}

function AlertCenterSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-16 rounded-lg bg-muted" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}

