"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { hasScreenFunction } from "@/lib/auth"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { CommissionConfigTab } from "./config/commission-config-tab"
import { CommissionRevenueTab } from "./revenue/commission-revenue-tab"

export function CommissionContent() {
  const canView = hasScreenFunction("s-commission", "view")
  const canManage = hasScreenFunction("s-commission", "manage")

  if (!canView && !canManage) {
    return <NoPermissionView message="You don’t have permission to access the Commission screen." />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Commission</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure and track revenue commissions per user.
        </p>
      </div>

      <Tabs defaultValue={canManage ? "config" : "revenue"} className="w-full">
        <TabsList>
          {canManage && <TabsTrigger value="config">Configuration</TabsTrigger>}
          <TabsTrigger value="revenue">Commission revenue</TabsTrigger>
        </TabsList>

        {canManage && (
          <TabsContent value="config" className="mt-6">
            <CommissionConfigTab />
          </TabsContent>
        )}

        <TabsContent value="revenue" className="mt-6">
          <CommissionRevenueTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
