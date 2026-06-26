"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const revenueData = [
  {
    day: "Mon",
    revenue: 10200,
    previousRevenue: 9800,
    ecpm: 4.2,
    impressions: 2.43,
  },
  {
    day: "Tue",
    revenue: 11500,
    previousRevenue: 10200,
    ecpm: 4.35,
    impressions: 2.64,
  },
  {
    day: "Wed",
    revenue: 10800,
    previousRevenue: 11000,
    ecpm: 4.28,
    impressions: 2.52,
  },
  {
    day: "Thu",
    revenue: 12300,
    previousRevenue: 10500,
    ecpm: 4.45,
    impressions: 2.77,
  },
  {
    day: "Fri",
    revenue: 13100,
    previousRevenue: 11200,
    ecpm: 4.52,
    impressions: 2.89,
  },
  {
    day: "Sat",
    revenue: 11800,
    previousRevenue: 10800,
    ecpm: 4.38,
    impressions: 2.69,
  },
  {
    day: "Sun",
    revenue: 12847,
    previousRevenue: 11500,
    ecpm: 4.52,
    impressions: 2.84,
  },
];

const tabConfig = {
  revenue: {
    key: "revenue",
    label: "Revenue",
    format: (v: number) => `$${(v / 1000).toFixed(1)}k`,
    color: "#2563eb",
  },
  ecpm: {
    key: "ecpm",
    label: "eCPM",
    format: (v: number) => `$${v.toFixed(2)}`,
    color: "#16a34a",
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    format: (v: number) => `${v.toFixed(2)}M`,
    color: "#7c3aed",
  },
};

export function RevenueChart() {
  const [activeTab, setActiveTab] = useState<
    "revenue" | "ecpm" | "impressions"
  >("revenue");
  const config = tabConfig[activeTab];

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Revenue Overview
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Last 7 days performance
            </CardDescription>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="revenue" className="text-xs px-3">
                Revenue
              </TabsTrigger>
              <TabsTrigger value="ecpm" className="text-xs px-3">
                eCPM
              </TabsTrigger>
              <TabsTrigger value="impressions" className="text-xs px-3">
                Impressions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={config.color}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={config.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={config.format}
                dx={-10}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3">
                        <p className="text-sm font-medium ">
                          {label}
                        </p>
                        <p className="text-sm text-slate-600">
                          {config.label}:{" "}
                          <span
                            className="font-semibold"
                            style={{ color: config.color }}
                          >
                            {config.format(payload[0].value as number)}
                          </span>
                        </p>
                        {activeTab === "revenue" && payload[1] && (
                          <p className="text-xs text-slate-400 mt-1">
                            Previous:{" "}
                            {config.format(payload[1].value as number)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={config.key}
                stroke={config.color}
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
              {activeTab === "revenue" && (
                <Line
                  type="monotone"
                  dataKey="previousRevenue"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
