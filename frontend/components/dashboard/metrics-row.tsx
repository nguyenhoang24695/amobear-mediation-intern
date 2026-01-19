"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, Eye, Percent } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

const metrics = [
  {
    title: "Revenue Today",
    value: "$12,847.56",
    change: "+8.2%",
    trend: "up",
    icon: DollarSign,
    sparklineData: [
      { value: 400 },
      { value: 300 },
      { value: 500 },
      { value: 450 },
      { value: 470 },
      { value: 520 },
      { value: 580 },
    ],
    color: "#2563eb",
  },
  {
    title: "Average eCPM",
    value: "$4.52",
    change: "+3.1%",
    trend: "up",
    icon: Activity,
    sparklineData: [
      { value: 3.8 },
      { value: 4.0 },
      { value: 3.9 },
      { value: 4.2 },
      { value: 4.3 },
      { value: 4.4 },
      { value: 4.52 },
    ],
    color: "#2563eb",
  },
  {
    title: "Impressions",
    value: "2.84M",
    change: "+5.7%",
    trend: "up",
    icon: Eye,
    sparklineData: [
      { value: 2.5 },
      { value: 2.6 },
      { value: 2.55 },
      { value: 2.7 },
      { value: 2.75 },
      { value: 2.8 },
      { value: 2.84 },
    ],
    color: "#2563eb",
  },
  {
    title: "Fill Rate",
    value: "94.2%",
    change: "-0.3%",
    trend: "down",
    icon: Percent,
    sparklineData: [
      { value: 95 },
      { value: 94.8 },
      { value: 94.5 },
      { value: 94.6 },
      { value: 94.4 },
      { value: 94.3 },
      { value: 94.2 },
    ],
    color: "#ef4444",
  },
]

export function MetricsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{metric.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{metric.value}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge
                    variant="secondary"
                    className={`px-1.5 py-0.5 text-xs font-medium ${
                      metric.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    )}
                    {metric.change}
                  </Badge>
                  <span className="text-xs text-slate-400">vs yesterday</span>
                </div>
              </div>
              <div className="w-20 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.sparklineData}>
                    <defs>
                      <linearGradient id={`gradient-${metric.title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${metric.title})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
