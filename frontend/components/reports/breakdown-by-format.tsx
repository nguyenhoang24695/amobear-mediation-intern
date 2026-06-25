"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Gift, Square, RectangleHorizontal, LayoutGrid } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"

const formatData = [
  {
    rank: 1,
    name: "Rewarded",
    revenue: 51383,
    percent: 40.0,
    ecpm: 8.25,
    impressions: "6.23M",
    change: 18.2,
    color: "#f59e0b",
    icon: Gift,
  },
  {
    rank: 2,
    name: "Interstitial",
    revenue: 38537,
    percent: 30.0,
    ecpm: 5.82,
    impressions: "6.62M",
    change: 9.5,
    color: "#8b5cf6",
    icon: Square,
  },
  {
    rank: 3,
    name: "Banner",
    revenue: 25691,
    percent: 20.0,
    ecpm: 1.85,
    impressions: "13.88M",
    change: -2.3,
    color: "#3b82f6",
    icon: RectangleHorizontal,
  },
  {
    rank: 4,
    name: "Native",
    revenue: 12846,
    percent: 10.0,
    ecpm: 4.15,
    impressions: "3.10M",
    change: 25.8,
    color: "#22c55e",
    icon: LayoutGrid,
  },
]

export function BreakdownByFormat() {
  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-md p-3">
                      <p className="text-sm font-medium text-foreground">{data.name}</p>
                      <p className="text-sm text-muted-foreground">Revenue: ${data.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">eCPM: ${data.ecpm.toFixed(2)}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
              {formatData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {formatData.map((format) => (
          <div
            key={format.name}
            className="p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${format.color}20` }}
              >
                <format.icon className="w-4 h-4" style={{ color: format.color }} />
              </div>
              <span className="text-sm font-medium text-foreground">{format.name}</span>
            </div>
            <p className="text-xl font-semibold text-foreground">${(format.revenue / 1000).toFixed(1)}k</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">eCPM ${format.ecpm.toFixed(2)}</span>
              <div className="flex items-center gap-1">
                {format.change > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${format.change > 0 ? "text-green-600" : "text-red-600"}`}>
                  {format.change > 0 ? "+" : ""}
                  {format.change}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Format</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">% of Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">eCPM</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Impressions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">vs Previous</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {formatData.map((format) => (
              <tr key={format.rank} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    #{format.rank}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <format.icon className="w-4 h-4" style={{ color: format.color }} />
                    <span className="text-sm font-medium text-foreground">{format.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  ${format.revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${format.percent}%`, backgroundColor: format.color }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">{format.percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">${format.ecpm.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{format.impressions}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${format.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {format.change > 0 ? "+" : ""}
                    {format.change}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {format.change > 0 ? (
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
