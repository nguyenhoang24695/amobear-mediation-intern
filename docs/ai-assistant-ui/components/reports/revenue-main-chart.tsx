"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"

interface RevenueMainChartProps {
  chartType: "line" | "bar" | "area"
  selectedMetrics: string[]
  compareEnabled: boolean
}

const chartData = [
  {
    date: "Dec 1",
    revenue: 3850,
    previousRevenue: 3420,
    ecpm: 4.2,
    previousEcpm: 3.9,
    impressions: 917,
    fillRate: 94.2,
  },
  {
    date: "Dec 2",
    revenue: 4120,
    previousRevenue: 3680,
    ecpm: 4.35,
    previousEcpm: 4.1,
    impressions: 947,
    fillRate: 94.8,
  },
  {
    date: "Dec 3",
    revenue: 3920,
    previousRevenue: 3550,
    ecpm: 4.28,
    previousEcpm: 4.0,
    impressions: 916,
    fillRate: 93.9,
  },
  {
    date: "Dec 4",
    revenue: 4380,
    previousRevenue: 3890,
    ecpm: 4.45,
    previousEcpm: 4.2,
    impressions: 984,
    fillRate: 95.1,
  },
  {
    date: "Dec 5",
    revenue: 4650,
    previousRevenue: 4020,
    ecpm: 4.52,
    previousEcpm: 4.15,
    impressions: 1028,
    fillRate: 95.5,
  },
  {
    date: "Dec 6",
    revenue: 4280,
    previousRevenue: 3780,
    ecpm: 4.38,
    previousEcpm: 4.05,
    impressions: 977,
    fillRate: 94.6,
  },
  {
    date: "Dec 7",
    revenue: 4520,
    previousRevenue: 3950,
    ecpm: 4.48,
    previousEcpm: 4.12,
    impressions: 1009,
    fillRate: 95.2,
  },
  {
    date: "Dec 8",
    revenue: 4180,
    previousRevenue: 3720,
    ecpm: 4.32,
    previousEcpm: 4.0,
    impressions: 968,
    fillRate: 94.4,
  },
  {
    date: "Dec 9",
    revenue: 4420,
    previousRevenue: 3880,
    ecpm: 4.42,
    previousEcpm: 4.1,
    impressions: 1000,
    fillRate: 95.0,
  },
  {
    date: "Dec 10",
    revenue: 4680,
    previousRevenue: 4100,
    ecpm: 4.55,
    previousEcpm: 4.2,
    impressions: 1028,
    fillRate: 95.6,
  },
  {
    date: "Dec 11",
    revenue: 4350,
    previousRevenue: 3820,
    ecpm: 4.4,
    previousEcpm: 4.08,
    impressions: 989,
    fillRate: 94.8,
  },
  {
    date: "Dec 12",
    revenue: 4580,
    previousRevenue: 4050,
    ecpm: 4.5,
    previousEcpm: 4.18,
    impressions: 1018,
    fillRate: 95.3,
  },
  {
    date: "Dec 13",
    revenue: 4850,
    previousRevenue: 4280,
    ecpm: 4.62,
    previousEcpm: 4.25,
    impressions: 1050,
    fillRate: 95.8,
  },
  {
    date: "Dec 14",
    revenue: 4720,
    previousRevenue: 4150,
    ecpm: 4.58,
    previousEcpm: 4.22,
    impressions: 1030,
    fillRate: 95.5,
  },
  {
    date: "Dec 15",
    revenue: 6234,
    previousRevenue: 4520,
    ecpm: 4.85,
    previousEcpm: 4.35,
    impressions: 1286,
    fillRate: 96.2,
  },
  {
    date: "Dec 16",
    revenue: 4980,
    previousRevenue: 4380,
    ecpm: 4.68,
    previousEcpm: 4.28,
    impressions: 1064,
    fillRate: 95.9,
  },
  {
    date: "Dec 17",
    revenue: 4650,
    previousRevenue: 4100,
    ecpm: 4.55,
    previousEcpm: 4.2,
    impressions: 1022,
    fillRate: 95.4,
  },
  {
    date: "Dec 18",
    revenue: 4420,
    previousRevenue: 3920,
    ecpm: 4.45,
    previousEcpm: 4.12,
    impressions: 993,
    fillRate: 95.0,
  },
  {
    date: "Dec 19",
    revenue: 4580,
    previousRevenue: 4050,
    ecpm: 4.52,
    previousEcpm: 4.18,
    impressions: 1013,
    fillRate: 95.2,
  },
  {
    date: "Dec 20",
    revenue: 4750,
    previousRevenue: 4180,
    ecpm: 4.6,
    previousEcpm: 4.22,
    impressions: 1033,
    fillRate: 95.6,
  },
  {
    date: "Dec 21",
    revenue: 4380,
    previousRevenue: 3880,
    ecpm: 4.42,
    previousEcpm: 4.08,
    impressions: 991,
    fillRate: 94.8,
  },
  {
    date: "Dec 22",
    revenue: 4120,
    previousRevenue: 3650,
    ecpm: 4.35,
    previousEcpm: 4.0,
    impressions: 947,
    fillRate: 94.5,
  },
  {
    date: "Dec 23",
    revenue: 3980,
    previousRevenue: 3520,
    ecpm: 4.28,
    previousEcpm: 3.95,
    impressions: 930,
    fillRate: 94.2,
  },
  {
    date: "Dec 24",
    revenue: 3650,
    previousRevenue: 3250,
    ecpm: 4.15,
    previousEcpm: 3.85,
    impressions: 880,
    fillRate: 93.8,
  },
  {
    date: "Dec 25",
    revenue: 3420,
    previousRevenue: 3050,
    ecpm: 4.05,
    previousEcpm: 3.75,
    impressions: 845,
    fillRate: 93.5,
  },
  {
    date: "Dec 26",
    revenue: 3850,
    previousRevenue: 3380,
    ecpm: 4.2,
    previousEcpm: 3.9,
    impressions: 917,
    fillRate: 94.0,
  },
  {
    date: "Dec 27",
    revenue: 4180,
    previousRevenue: 3680,
    ecpm: 4.35,
    previousEcpm: 4.02,
    impressions: 961,
    fillRate: 94.6,
  },
  {
    date: "Dec 28",
    revenue: 4420,
    previousRevenue: 3920,
    ecpm: 4.45,
    previousEcpm: 4.1,
    impressions: 994,
    fillRate: 95.0,
  },
  {
    date: "Dec 29",
    revenue: 4650,
    previousRevenue: 4080,
    ecpm: 4.55,
    previousEcpm: 4.18,
    impressions: 1022,
    fillRate: 95.4,
  },
  {
    date: "Dec 30",
    revenue: 4520,
    previousRevenue: 3980,
    ecpm: 4.5,
    previousEcpm: 4.12,
    impressions: 1004,
    fillRate: 95.2,
  },
]

const metricConfig: Record<string, { color: string; format: (v: number) => string; label: string }> = {
  revenue: { color: "#2563eb", format: (v) => `$${v.toLocaleString()}`, label: "Revenue" },
  ecpm: { color: "#16a34a", format: (v) => `$${v.toFixed(2)}`, label: "eCPM" },
  impressions: { color: "#7c3aed", format: (v) => `${v}K`, label: "Impressions" },
  fillRate: { color: "#f59e0b", format: (v) => `${v.toFixed(1)}%`, label: "Fill Rate" },
}

export function RevenueMainChart({ chartType, selectedMetrics, compareEnabled }: RevenueMainChartProps) {
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    }

    const renderMetrics = () =>
      selectedMetrics.map((metric) => {
        const config = metricConfig[metric]
        const previousKey = `previous${metric.charAt(0).toUpperCase() + metric.slice(1)}`

        if (chartType === "bar") {
          return <Bar key={metric} dataKey={metric} fill={config.color} radius={[4, 4, 0, 0]} name={config.label} />
        }

        if (chartType === "line") {
          return (
            <g key={metric}>
              <Line
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                name={config.label}
              />
              {compareEnabled && chartData[0][previousKey as keyof (typeof chartData)[0]] !== undefined && (
                <Line
                  type="monotone"
                  dataKey={previousKey}
                  stroke={config.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  dot={false}
                  name={`Previous ${config.label}`}
                />
              )}
            </g>
          )
        }

        // Area chart
        return (
          <g key={metric}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={metric}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
              name={config.label}
            />
            {compareEnabled && chartData[0][previousKey as keyof (typeof chartData)[0]] !== undefined && (
              <Line
                type="monotone"
                dataKey={previousKey}
                stroke={config.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                dot={false}
                name={`Previous ${config.label}`}
              />
            )}
          </g>
        )
      })

    const commonAxisProps = {
      xAxis: (
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          dy={10}
          interval="preserveStartEnd"
        />
      ),
      yAxis: (
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v) => {
            if (selectedMetrics[0] === "revenue") return `$${(v / 1000).toFixed(1)}k`
            if (selectedMetrics[0] === "ecpm") return `$${v}`
            if (selectedMetrics[0] === "fillRate") return `${v}%`
            return `${v}K`
          }}
          dx={-10}
        />
      ),
      grid: <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />,
      tooltip: (
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3 min-w-40">
                  <p className="text-sm font-medium text-slate-900 mb-2">{label}</p>
                  {payload.map((entry, idx) => {
                    const metricKey = entry.dataKey?.toString().replace("previous", "").toLowerCase() || ""
                    const config = metricConfig[metricKey] || metricConfig[entry.dataKey?.toString() || "revenue"]
                    const isPrevious = entry.dataKey?.toString().startsWith("previous")
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color, opacity: isPrevious ? 0.5 : 1 }}
                          />
                          <span className="text-slate-600">{isPrevious ? `Prev ${config?.label}` : config?.label}</span>
                        </div>
                        <span className="font-medium text-slate-900">{config?.format(entry.value as number)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }
            return null
          }}
        />
      ),
      legend: selectedMetrics.length > 1 && (
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
        />
      ),
    }

    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          {commonAxisProps.grid}
          {commonAxisProps.xAxis}
          {commonAxisProps.yAxis}
          {commonAxisProps.tooltip}
          {commonAxisProps.legend}
          {renderMetrics()}
        </BarChart>
      )
    }

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {commonAxisProps.grid}
          {commonAxisProps.xAxis}
          {commonAxisProps.yAxis}
          {commonAxisProps.tooltip}
          {commonAxisProps.legend}
          {renderMetrics()}
        </LineChart>
      )
    }

    return (
      <AreaChart {...commonProps}>
        {commonAxisProps.grid}
        {commonAxisProps.xAxis}
        {commonAxisProps.yAxis}
        {commonAxisProps.tooltip}
        {commonAxisProps.legend}
        {renderMetrics()}
      </AreaChart>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
