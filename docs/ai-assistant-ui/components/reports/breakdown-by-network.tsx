"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const networkData = [
  {
    rank: 1,
    name: "AdMob",
    revenue: 44960,
    percent: 35.0,
    ecpm: 5.12,
    impressions: "8.78M",
    change: 12.5,
    color: "#facc15",
  },
  {
    rank: 2,
    name: "Unity Ads",
    revenue: 32114,
    percent: 25.0,
    ecpm: 4.85,
    impressions: "6.62M",
    change: 8.2,
    color: "#1e293b",
  },
  {
    rank: 3,
    name: "ironSource",
    revenue: 23124,
    percent: 18.0,
    ecpm: 4.52,
    impressions: "5.12M",
    change: 15.8,
    color: "#9333ea",
  },
  {
    rank: 4,
    name: "AppLovin",
    revenue: 16677,
    percent: 13.0,
    ecpm: 4.28,
    impressions: "3.90M",
    change: -3.4,
    color: "#ef4444",
  },
  {
    rank: 5,
    name: "Meta",
    revenue: 7709,
    percent: 6.0,
    ecpm: 3.95,
    impressions: "1.95M",
    change: 5.1,
    color: "#3b82f6",
  },
  {
    rank: 6,
    name: "Vungle",
    revenue: 3873,
    percent: 3.0,
    ecpm: 3.65,
    impressions: "1.06M",
    change: -7.2,
    color: "#22c55e",
  },
]

export function BreakdownByNetwork() {
  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <div className="flex items-center gap-8">
        <div className="h-64 w-64 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={networkData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="revenue"
              >
                {networkData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3">
                        <p className="text-sm font-medium text-slate-900">{data.name}</p>
                        <p className="text-sm text-slate-600">${data.revenue.toLocaleString()}</p>
                        <p className="text-sm text-slate-600">{data.percent}% of total</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          {networkData.map((network) => (
            <div key={network.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: network.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{network.name}</p>
                <p className="text-xs text-slate-500">{network.percent}%</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">${(network.revenue / 1000).toFixed(1)}k</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Network</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">% of Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">eCPM</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Impressions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">vs Previous</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {networkData.map((network) => (
              <tr key={network.rank} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    #{network.rank}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: network.color }} />
                    <span className="text-sm font-medium text-slate-900">{network.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                  ${network.revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${network.percent}%`, backgroundColor: network.color }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 w-12">{network.percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">${network.ecpm.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{network.impressions}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${network.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {network.change > 0 ? "+" : ""}
                    {network.change}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {network.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
