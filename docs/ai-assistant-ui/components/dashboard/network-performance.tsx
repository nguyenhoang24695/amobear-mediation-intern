"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const networks = [
  { name: "AdMob Bidding", percentage: 35, revenue: "$4,496.65", color: "#2563eb" },
  { name: "Meta Audience", percentage: 25, revenue: "$3,211.89", color: "#0ea5e9" },
  { name: "Unity Ads", percentage: 18, revenue: "$2,312.56", color: "#8b5cf6" },
  { name: "AppLovin MAX", percentage: 12, revenue: "$1,541.71", color: "#f59e0b" },
  { name: "Others", percentage: 10, revenue: "$1,284.75", color: "#64748b" },
]

export function NetworkPerformance() {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Revenue by Ad Network</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {networks.map((network) => (
            <div key={network.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: network.color }} />
                  <span className="text-sm font-medium text-slate-700">{network.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{network.revenue}</span>
                  <span className="text-sm font-semibold text-slate-900 w-12 text-right">{network.percentage}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${network.percentage}%`,
                    backgroundColor: network.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total Revenue</span>
            <span className="text-lg font-bold text-slate-900">$12,847.56</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
