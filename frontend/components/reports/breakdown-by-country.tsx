"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"

const countryData = [
  {
    rank: 1,
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    revenue: 44960,
    percent: 35.0,
    ecpm: 8.92,
    impressions: "5.04M",
    change: 14.2,
  },
  {
    rank: 2,
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    revenue: 19268,
    percent: 15.0,
    ecpm: 6.85,
    impressions: "2.81M",
    change: 8.7,
  },
  {
    rank: 3,
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    revenue: 15422,
    percent: 12.0,
    ecpm: 6.45,
    impressions: "2.39M",
    change: 5.3,
  },
  {
    rank: 4,
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    revenue: 12846,
    percent: 10.0,
    ecpm: 7.25,
    impressions: "1.77M",
    change: 22.1,
  },
  {
    rank: 5,
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    revenue: 10277,
    percent: 8.0,
    ecpm: 5.92,
    impressions: "1.74M",
    change: 6.8,
  },
  {
    rank: 6,
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    revenue: 7709,
    percent: 6.0,
    ecpm: 5.75,
    impressions: "1.34M",
    change: -1.2,
  },
  {
    rank: 7,
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    revenue: 6423,
    percent: 5.0,
    ecpm: 5.25,
    impressions: "1.22M",
    change: 3.5,
  },
  {
    rank: 8,
    code: "BR",
    name: "Brazil",
    flag: "🇧🇷",
    revenue: 5138,
    percent: 4.0,
    ecpm: 2.85,
    impressions: "1.80M",
    change: 18.4,
  },
  {
    rank: 9,
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    revenue: 3854,
    percent: 3.0,
    ecpm: 1.45,
    impressions: "2.66M",
    change: 28.2,
  },
  {
    rank: 10,
    code: "Other",
    name: "Other",
    flag: "🌍",
    revenue: 2561,
    percent: 2.0,
    ecpm: 2.15,
    impressions: "1.19M",
    change: 4.5,
  },
]

const chartColors = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#bfdbfe",
  "#dbeafe",
  "#eff6ff",
  "#f8fafc",
  "#f1f5f9",
  "#e2e8f0",
]

export function BreakdownByCountry() {
  return (
    <div className="space-y-6">
      {/* Chart + Map Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizontal Bar Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countryData.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => {
                  const country = countryData.find((c) => c.name === payload.value)
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-10} y={0} dy={4} textAnchor="end" fill="var(--muted-foreground)" fontSize={12}>
                        {country?.flag} {payload.value}
                      </text>
                    </g>
                  )
                }}
                width={130}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-card border border-border rounded-lg shadow-md p-3">
                        <p className="text-sm font-medium text-foreground">
                          {data.flag} {data.name}
                        </p>
                        <p className="text-sm text-muted-foreground">Revenue: ${data.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">eCPM: ${data.ecpm.toFixed(2)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {countryData.slice(0, 8).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Countries Summary */}
        <div className="grid grid-cols-2 gap-3">
          {countryData.slice(0, 6).map((country) => (
            <div
              key={country.code}
              className="p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm font-medium text-foreground">{country.name}</span>
              </div>
              <p className="text-lg font-semibold text-foreground">${(country.revenue / 1000).toFixed(1)}k</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">eCPM ${country.ecpm.toFixed(2)}</span>
                <div className="flex items-center gap-1">
                  {country.change > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${country.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {country.change > 0 ? "+" : ""}
                    {country.change}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Country</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">% of Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">eCPM</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Impressions</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">vs Previous</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {countryData.map((country) => (
              <tr key={country.rank} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    #{country.rank}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{country.flag}</span>
                    <span className="text-sm font-medium text-foreground">{country.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  ${country.revenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary/100" style={{ width: `${country.percent * 2.5}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">{country.percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-foreground">${country.ecpm.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{country.impressions}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${country.change > 0 ? "text-green-600" : "text-red-600"}`}>
                    {country.change > 0 ? "+" : ""}
                    {country.change}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {country.change > 0 ? (
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
