"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"

const appData = [
  {
    rank: 1,
    name: "Weather Plus",
    revenue: 28456,
    percent: 22.2,
    ecpm: 5.82,
    impressions: "4.89M",
    change: 15.3,
    color: "#2563eb",
  },
  {
    rank: 2,
    name: "Puzzle Master",
    revenue: 24320,
    percent: 18.9,
    ecpm: 4.95,
    impressions: "4.91M",
    change: 8.7,
    color: "#7c3aed",
  },
  {
    rank: 3,
    name: "Word Challenge",
    revenue: 19850,
    percent: 15.5,
    ecpm: 4.52,
    impressions: "4.39M",
    change: -2.1,
    color: "#16a34a",
  },
  {
    rank: 4,
    name: "Racing Pro",
    revenue: 17640,
    percent: 13.7,
    ecpm: 4.28,
    impressions: "4.12M",
    change: 5.4,
    color: "#f59e0b",
  },
  {
    rank: 5,
    name: "Fitness Tracker",
    revenue: 14280,
    percent: 11.1,
    ecpm: 3.95,
    impressions: "3.62M",
    change: 12.8,
    color: "#ef4444",
  },
  {
    rank: 6,
    name: "Photo Editor",
    revenue: 12450,
    percent: 9.7,
    ecpm: 3.78,
    impressions: "3.29M",
    change: -4.2,
    color: "#06b6d4",
  },
  {
    rank: 7,
    name: "Music Player",
    revenue: 8920,
    percent: 6.9,
    ecpm: 3.45,
    impressions: "2.59M",
    change: 3.1,
    color: "#8b5cf6",
  },
  {
    rank: 8,
    name: "News Reader",
    revenue: 2540,
    percent: 2.0,
    ecpm: 2.85,
    impressions: "0.89M",
    change: -8.5,
    color: "#64748b",
  },
]

export function BreakdownByApp() {
  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={appData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              width={110}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-md p-3">
                      <p className="text-sm font-medium text-foreground">{data.name}</p>
                      <p className="text-sm text-muted-foreground">Revenue: ${data.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{data.percent}% of total</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {appData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">App Name</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">% of Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">eCPM</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Impressions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">vs Previous</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appData.map((app) => (
              <tr key={app.rank} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    #{app.rank}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: app.color }} />
                    <span className="text-sm font-medium text-foreground">{app.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  ${app.revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${app.percent}%`, backgroundColor: app.color }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">{app.percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">${app.ecpm.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{app.impressions}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${app.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {app.change > 0 ? "+" : ""}
                    {app.change}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {app.change > 0 ? (
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
