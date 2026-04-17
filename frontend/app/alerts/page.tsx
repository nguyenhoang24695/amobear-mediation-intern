import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AlertCenterEntryGuard } from "@/components/auth/alert-center-entry-guard"
import { AlertCenterContent } from "@/components/alerts/alert-center-content"

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <AlertCenterEntryGuard>
        <Suspense fallback={<AlertsPageSkeleton />}>
          <AlertCenterContent />
        </Suspense>
      </AlertCenterEntryGuard>
    </DashboardLayout>
  )
}

function AlertsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-64 bg-slate-200 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded" />
          <div className="h-9 w-28 bg-slate-200 rounded" />
        </div>
      </div>
      {/* Summary bar skeleton */}
      <div className="h-16 bg-slate-200 rounded-lg" />
      {/* Filter bar skeleton */}
      <div className="h-20 bg-slate-200 rounded-lg" />
      {/* Alert cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-200 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
