"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ArrowLeft, ExternalLink, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ApplyVariantModal } from "./modals/apply-variant-modal"

// Mock test data
const testData = {
  id: "test-2",
  name: "Waterfall Optimization Test #2",
  status: "completed" as const,
  mediationGroupName: "Weather Plus - Rewarded Video - US Tier 1",
  mediationGroupId: "1",
  startDate: "October 9, 2025",
  endDate: "January 7, 2026",
  duration: 90,
  trafficSplit: "50%",
  totalImpressions: "2.4M",
  impressionsA: "1.2M",
  impressionsB: "1.2M",
  confidence: 99,
  winner: "B",
  variantA: {
    name: "Original",
    scaledMonthly: 859,
    estEarnings: 1390,
    ecpm: 56.4,
    matchRate: 99.12,
  },
  variantB: {
    name: "Optimized",
    scaledMonthly: 954,
    estEarnings: 1540,
    ecpm: 63.08,
    matchRate: 99.03,
    improvement: {
      scaledMonthly: 11.1,
      estEarnings: 10.8,
      ecpm: 11.8,
    },
  },
}

// Mock chart data
const chartData = [
  {
    name: "Scaled Revenue",
    variantA: 100,
    variantB: 111.1,
  },
  {
    name: "Scaled Impressions",
    variantA: 100,
    variantB: 100.2,
  },
  {
    name: "Match Rate",
    variantA: 99.12,
    variantB: 99.03,
  },
  {
    name: "eCPM",
    variantA: 100,
    variantB: 111.8,
  },
]

// Mock waterfall data
const waterfallDataA = [
  { id: "w1", name: "Inter81.15", floor: 81.15, status: "Active" },
  { id: "w2", name: "Inter65.93", floor: 65.93, status: "Active" },
  { id: "w3", name: "Inter50.72", floor: 50.72, status: "Active" },
  { id: "w4", name: "Inter40.57", floor: 40.57, status: "Active" },
  { id: "w5", name: "Inter30.43", floor: 30.43, status: "Active" },
]

const waterfallDataB = [
  { id: "w1", name: "Inter191.42", floor: 191.42, status: "Incomplete", changed: true },
  { id: "w2", name: "Inter153.14", floor: 153.14, status: "Incomplete", changed: true },
  { id: "w3", name: "Inter122.50", floor: 122.5, status: "Incomplete", changed: true },
  { id: "w4", name: "Inter85.75", floor: 85.75, status: "Incomplete", changed: true },
  { id: "w5", name: "Inter47.16", floor: 47.16, status: "Incomplete", changed: true },
]

export function ABTestDetailContent() {
  const [chartTab, setChartTab] = useState("summary")
  const [variantAWaterfallOpen, setVariantAWaterfallOpen] = useState(true)
  const [variantBWaterfallOpen, setVariantBWaterfallOpen] = useState(true)
  const [applyModalOpen, setApplyModalOpen] = useState(false)

  const isCompleted = testData.status === "completed"
  const isRunning = testData.status === "running"

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href={`/mediation/${testData.mediationGroupId}`}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          {testData.mediationGroupName}
        </Link>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-slate-900">A/B Test: {testData.name}</h1>
            <Badge
              className={cn(
                "w-fit",
                isCompleted ? "bg-green-100 text-green-700 border-0" : "bg-purple-100 text-purple-700 border-0",
              )}
            >
              {isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </div>

        {/* Winner Recommendation Banner */}
        {isCompleted && testData.winner && (
          <Card className="border-l-4 border-l-green-500 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {testData.winner}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700">
                    Variant {testData.winner} will most likely increase future earnings
                  </h3>
                  <p className="text-sm text-slate-600">
                    {testData.confidence}% (estimated) chance that {testData.winner} will perform better than A
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="link" className="text-slate-600">
                    Keep Variant A
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => setApplyModalOpen(true)}>
                    Apply Variant B
                  </Button>
                </div>
                <div className="text-right text-sm border-l border-slate-200 pl-4 ml-4">
                  <div className="text-slate-500">Traffic: {testData.trafficSplit}</div>
                  <div className="text-slate-500">Status: {isCompleted ? "Completed" : "Running"}</div>
                  <div className="text-slate-500">
                    {testData.startDate} - {testData.endDate}
                  </div>
                  <button className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    View report <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Info Cards Row */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Duration</p>
              <p className="text-2xl font-bold text-slate-900">{testData.duration} days</p>
              <p className="text-xs text-slate-500">
                {testData.startDate.split(",")[0]} - {testData.endDate.split(",")[0]}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Traffic Split</p>
              <p className="text-2xl font-bold text-slate-900">
                {testData.trafficSplit} / {testData.trafficSplit}
              </p>
              <p className="text-xs text-slate-500">
                A: {testData.impressionsA} B: {testData.impressionsB}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total Impressions</p>
              <p className="text-2xl font-bold text-slate-900">{testData.totalImpressions}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Confidence</p>
              <p className="text-2xl font-bold text-slate-900">{testData.confidence}%</p>
              <p className="text-xs text-slate-500">Very High</p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Performance Comparison Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Performance Comparison</CardTitle>
              <Tabs value={chartTab} onValueChange={setChartTab}>
                <TabsList className="h-9 bg-slate-100">
                  <TabsTrigger value="summary" className="text-xs data-[state=active]:bg-white">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="revenue" className="text-xs data-[state=active]:bg-white">
                    Scaled Revenue
                  </TabsTrigger>
                  <TabsTrigger value="ecpm" className="text-xs data-[state=active]:bg-white">
                    eCPM
                  </TabsTrigger>
                  <TabsTrigger value="match" className="text-xs data-[state=active]:bg-white">
                    Match Rate
                  </TabsTrigger>
                  <TabsTrigger value="impressions" className="text-xs data-[state=active]:bg-white">
                    Scaled Impressions
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="variantA" name="Variant A (Current)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="variantB" name="Variant B (Optimized)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Metrics Comparison Table */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[200px]">Variants</TableHead>
                  <TableHead className="text-right">Scaled Monthly Earnings</TableHead>
                  <TableHead className="text-right">Est. Earnings</TableHead>
                  <TableHead className="text-right">eCPM ($ USD)</TableHead>
                  <TableHead className="text-right">Match Rate</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Variant A */}
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-teal-500" />
                      <div>
                        <span className="font-medium text-slate-900">Variant A</span>
                        <span className="text-xs text-slate-500 block">{testData.variantA.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">${testData.variantA.scaledMonthly}</TableCell>
                  <TableCell className="text-right">${testData.variantA.estEarnings.toFixed(2)}K</TableCell>
                  <TableCell className="text-right">${testData.variantA.ecpm.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{testData.variantA.matchRate}%</TableCell>
                  <TableCell>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </TableCell>
                </TableRow>
                {/* Variant B */}
                <TableRow className="bg-green-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-purple-500" />
                      <div>
                        <span className="font-medium text-slate-900">Variant B</span>
                        <span className="text-xs text-slate-500 block">{testData.variantB.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">${testData.variantB.scaledMonthly}</span>
                    <span className="text-green-600 text-xs ml-1">
                      (+{testData.variantB.improvement.scaledMonthly}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span>${testData.variantB.estEarnings.toFixed(2)}K</span>
                    <span className="text-green-600 text-xs ml-1">(+{testData.variantB.improvement.estEarnings}%)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span>${testData.variantB.ecpm.toFixed(2)}</span>
                    <span className="text-green-600 text-xs ml-1">(+{testData.variantB.improvement.ecpm}%)</span>
                  </TableCell>
                  <TableCell className="text-right">{testData.variantB.matchRate}%</TableCell>
                  <TableCell>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Side-by-Side Waterfall Configuration */}
        <div className="grid grid-cols-2 gap-4">
          {/* Variant A */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="bg-teal-500 text-white p-4">
              <h3 className="font-semibold">Variant A ({testData.trafficSplit})</h3>
              <p className="text-teal-100 text-sm">Current • Original</p>
            </div>
            <CardContent className="p-4">
              {/* Bidding Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Bidding</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="text-blue-600 hover:underline">Add ad source</button>
                    <Select defaultValue="status">
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Change status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Ad source</TableHead>
                      <TableHead>Ad unit mapping</TableHead>
                      <TableHead>Partnership status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Check className="w-4 h-4 text-green-500" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">AdMob Network</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">Not required</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Check className="w-4 h-4 text-green-500" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Pangle</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button className="text-xs text-blue-600 hover:underline">View</button>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Show rows:</span>
                    <Select defaultValue="15">
                      <SelectTrigger className="h-6 w-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>1-2 of 2</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Waterfall Section */}
              <Collapsible open={variantAWaterfallOpen} onOpenChange={setVariantAWaterfallOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Waterfall</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  {variantAWaterfallOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-10">Status</TableHead>
                        <TableHead>Ad source</TableHead>
                        <TableHead>Order (by eCPM)</TableHead>
                        <TableHead>Ad unit mapping</TableHead>
                        <TableHead>Optimization status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waterfallDataA.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Check className="w-4 h-4 text-green-500" />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm">${item.floor.toFixed(2)}</TableCell>
                          <TableCell>
                            <button className="text-xs text-blue-600 hover:underline">View</button>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">Not supported</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Variant B */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="bg-purple-500 text-white p-4">
              <h3 className="font-semibold">Variant B ({testData.trafficSplit})</h3>
              <p className="text-purple-200 text-sm">Optimized • Testing</p>
            </div>
            <CardContent className="p-4">
              {/* Bidding Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Bidding</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="text-blue-600 hover:underline">Add ad source</button>
                    <Select defaultValue="status">
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Change status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Ad source</TableHead>
                      <TableHead>Ad unit mapping</TableHead>
                      <TableHead>Partnership status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Check className="w-4 h-4 text-green-500" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">AdMob Network</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">Not required</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Check className="w-4 h-4 text-green-500" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Pangle</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button className="text-xs text-blue-600 hover:underline">View</button>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Show rows:</span>
                    <Select defaultValue="15">
                      <SelectTrigger className="h-6 w-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>1-2 of 2</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Waterfall Section */}
              <Collapsible open={variantBWaterfallOpen} onOpenChange={setVariantBWaterfallOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Waterfall</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  {variantBWaterfallOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-10">Status</TableHead>
                        <TableHead>Ad source</TableHead>
                        <TableHead>Order (by eCPM)</TableHead>
                        <TableHead>Ad unit mapping</TableHead>
                        <TableHead>Optimization status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waterfallDataB.map((item) => (
                        <TableRow key={item.id} className={item.changed ? "bg-amber-50" : ""}>
                          <TableCell>
                            <Check className="w-4 h-4 text-green-500" />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm">${item.floor.toFixed(2)}</TableCell>
                          <TableCell>
                            <button className="text-xs text-blue-600 hover:underline">View</button>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                item.status === "Incomplete" ? "text-orange-600 text-xs" : "text-slate-500 text-xs"
                              }
                            >
                              {item.status === "Incomplete" ? "Incomplete" : "Not supported"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Sticky Bottom Action Bar */}
        {isCompleted && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between pl-[240px]">
              <span className="text-sm text-slate-600">
                Recommended: <span className="font-medium text-slate-900">Apply Variant B</span>
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-transparent">
                  Keep Variant A
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setApplyModalOpen(true)}>
                  Apply Variant B
                </Button>
              </div>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between pl-[240px]">
              <span className="text-sm text-slate-600">
                Test running: <span className="font-medium text-slate-900">Day 5 of 14</span>
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-transparent text-red-600 border-red-200 hover:bg-red-50">
                  Stop Test Early
                </Button>
                <Button variant="outline" className="bg-transparent">
                  Extend Duration
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Spacer for sticky bar */}
        <div className="h-20" />

        {/* Apply Modal */}
        <ApplyVariantModal open={applyModalOpen} onOpenChange={setApplyModalOpen} mode="test-winner" />
      </div>
    </TooltipProvider>
  )
}
