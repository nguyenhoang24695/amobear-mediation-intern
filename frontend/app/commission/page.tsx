import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScreenFunctionGuard } from "@/components/auth/screen-function-guard"
import { CommissionContent } from "@/components/commission/commission-content"

export default function CommissionPage() {
  return (
    <DashboardLayout>
      <ScreenFunctionGuard screenKey="s-commission" functionKey="view">
        <Suspense fallback={<CommissionPageSkeleton />}>
          <CommissionContent />
        </Suspense>
      </ScreenFunctionGuard>
    </DashboardLayout>
  )
}

function CommissionPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-7 w-40 bg-slate-200 rounded" />
        <div className="h-4 w-72 bg-slate-200 rounded mt-2" />
      </div>
      <div className="h-10 w-64 bg-slate-200 rounded" />
      <div className="h-64 bg-slate-200 rounded-lg" />
    </div>
  )
}
