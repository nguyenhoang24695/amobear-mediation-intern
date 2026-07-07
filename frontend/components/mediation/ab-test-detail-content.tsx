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
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {testData.mediationGroupName}
        </Link>

        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-foreground">A/B Test: {testData.name}</h1>
            <Badge
              className={cn(
                "w-fit",
                isCompleted
                  ? "border-0 bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                  : "border-0 bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
              )}
            >
              {isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </div>

        {/* Winner Recommendation Banner */}
        {isCompleted && testData.winner && (
          <Card className="border-border border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white">
                  {testData.winner}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700 dark:text-green-300">
                    Variant {testData.winner} will most likely increase future earnings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {testData.confidence}% (estimated) chance that {testData.winner} will perform better than A
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <Button variant="link" className="px-0 text-muted-foreground sm:px-4">
                    Keep Variant A
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" onClick={() => setApplyModalOpen(true)}>
                    Apply Variant B
                  </Button>
                </div>
                <div className="border-t border-border pt-3 text-sm lg:ml-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 lg:text-right">
                  <div className="text-muted-foreground">Traffic: {testData.trafficSplit}</div>
                  <div className="text-muted-foreground">Status: {isCompleted ? "Completed" : "Running"}</div>
                  <div className="text-muted-foreground">
                    {testData.startDate} - {testData.endDate}
                  </div>
                  <button className="mt-1 flex items-center gap-1 text-primary hover:underline lg:ml-auto">
                    View report <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Info Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold text-foreground">{testData.duration} days</p>
              <p className="text-xs text-muted-foreground">
                {testData.startDate.split(",")[0]} - {testData.endDate.split(",")[0]}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Traffic Split</p>
              <p className="text-2xl font-bold text-foreground">
                {testData.trafficSplit} / {testData.trafficSplit}
              </p>
              <p className="text-xs text-muted-foreground">
                A: {testData.impressionsA} B: {testData.impressionsB}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Total Impressions</p>
              <p className="text-2xl font-bold text-foreground">{testData.totalImpressions}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Confidence</p>
              <p className="text-2xl font-bold text-foreground">{testData.confidence}%</p>
              <p className="text-xs text-muted-foreground">Very High</p>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: Performance Comparison Chart */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Performance Comparison</CardTitle>
              <Tabs value={chartTab} onValueChange={setChartTab}>
                <TabsList className="h-auto w-full flex-wrap justify-start bg-muted p-1 xl:w-auto">
                  <TabsTrigger value="summary" className="text-xs">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="revenue" className="text-xs">
                    Scaled Revenue
                  </TabsTrigger>
                  <TabsTrigger value="ecpm" className="text-xs">
                    eCPM
                  </TabsTrigger>
                  <TabsTrigger value="match" className="text-xs">
                    Match Rate
                  </TabsTrigger>
                  <TabsTrigger value="impressions" className="text-xs">
                    Scaled Impressions
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--card-foreground)",
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
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
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
                        <span className="font-medium text-foreground">Variant A</span>
                        <span className="block text-xs text-muted-foreground">{testData.variantA.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">${testData.variantA.scaledMonthly}</TableCell>
                  <TableCell className="text-right">${testData.variantA.estEarnings.toFixed(2)}K</TableCell>
                  <TableCell className="text-right">${testData.variantA.ecpm.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{testData.variantA.matchRate}%</TableCell>
                  <TableCell>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
                {/* Variant B */}
                <TableRow className="bg-green-50 dark:bg-green-950/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-purple-500" />
                      <div>
                        <span className="font-medium text-foreground">Variant B</span>
                        <span className="block text-xs text-muted-foreground">{testData.variantB.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">${testData.variantB.scaledMonthly}</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                      (+{testData.variantB.improvement.scaledMonthly}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span>${testData.variantB.estEarnings.toFixed(2)}K</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(+{testData.variantB.improvement.estEarnings}%)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span>${testData.variantB.ecpm.toFixed(2)}</span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">(+{testData.variantB.improvement.ecpm}%)</span>
                  </TableCell>
                  <TableCell className="text-right">{testData.variantB.matchRate}%</TableCell>
                  <TableCell>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Side-by-Side Waterfall Configuration */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Variant A */}
          <Card className="overflow-hidden border-border">
            <div className="bg-teal-600 p-4 text-white">
              <h3 className="font-semibold">Variant A ({testData.trafficSplit})</h3>
              <p className="text-teal-100 text-sm">Current • Original</p>
            </div>
            <CardContent className="p-4">
              {/* Bidding Section */}
              <div className="mb-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Bidding</span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button className="text-primary hover:underline">Add ad source</button>
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
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Ad source</TableHead>
                      <TableHead>Ad unit mapping</TableHead>
                      <TableHead>Partnership status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">AdMob Network</p>
                          <p className="max-w-[150px] truncate text-xs text-muted-foreground">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">Not required</TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-green-100 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-300">Active</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Pangle</p>
                          <p className="max-w-[150px] truncate text-xs text-muted-foreground">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button className="text-xs text-primary hover:underline">View</button>
                      </TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-green-100 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-300">Active</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Waterfall Section */}
              <Collapsible open={variantAWaterfallOpen} onOpenChange={setVariantAWaterfallOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Waterfall</span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {variantAWaterfallOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60">
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
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm">${item.floor.toFixed(2)}</TableCell>
                          <TableCell>
                            <button className="text-xs text-primary hover:underline">View</button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">Not supported</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Variant B */}
          <Card className="overflow-hidden border-border">
            <div className="bg-purple-600 p-4 text-white">
              <h3 className="font-semibold">Variant B ({testData.trafficSplit})</h3>
              <p className="text-sm text-purple-100">Optimized • Testing</p>
            </div>
            <CardContent className="p-4">
              {/* Bidding Section */}
              <div className="mb-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Bidding</span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button className="text-primary hover:underline">Add ad source</button>
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
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Ad source</TableHead>
                      <TableHead>Ad unit mapping</TableHead>
                      <TableHead>Partnership status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">AdMob Network</p>
                          <p className="max-w-[150px] truncate text-xs text-muted-foreground">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">Not required</TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-green-100 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-300">Active</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">Pangle</p>
                          <p className="max-w-[150px] truncate text-xs text-muted-foreground">PopupNativePage13...</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button className="text-xs text-primary hover:underline">View</button>
                      </TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-green-100 text-xs text-green-700 dark:bg-green-950/50 dark:text-green-300">Active</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-2 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Waterfall Section */}
              <Collapsible open={variantBWaterfallOpen} onOpenChange={setVariantBWaterfallOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Waterfall</span>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {variantBWaterfallOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/60">
                        <TableHead className="w-10">Status</TableHead>
                        <TableHead>Ad source</TableHead>
                        <TableHead>Order (by eCPM)</TableHead>
                        <TableHead>Ad unit mapping</TableHead>
                        <TableHead>Optimization status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waterfallDataB.map((item) => (
                        <TableRow key={item.id} className={item.changed ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
                          <TableCell>
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{item.name}</TableCell>
                          <TableCell className="text-sm">${item.floor.toFixed(2)}</TableCell>
                          <TableCell>
                            <button className="text-xs text-primary hover:underline">View</button>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                item.status === "Incomplete"
                                  ? "text-xs text-orange-600 dark:text-orange-400"
                                  : "text-xs text-muted-foreground"
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
          <div className="fixed bottom-20 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 pb-3 pt-3 shadow-lg backdrop-blur sm:bottom-0 sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-4">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-sm text-muted-foreground">
                Recommended: <span className="font-medium text-foreground">Apply Variant B</span>
              </span>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button variant="outline" className="w-full bg-background sm:w-auto">
                  Keep Variant A
                </Button>
                <Button className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 sm:w-auto" onClick={() => setApplyModalOpen(true)}>
                  Apply Variant B
                </Button>
              </div>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="fixed bottom-20 left-0 right-0 z-50 border-t border-border bg-background/95 px-3 pb-3 pt-3 shadow-lg backdrop-blur sm:bottom-0 sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-4">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <span className="text-sm text-muted-foreground">
                Test running: <span className="font-medium text-foreground">Day 5 of 14</span>
              </span>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button variant="outline" className="w-full border-red-200 bg-background text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto">
                  Stop Test Early
                </Button>
                <Button variant="outline" className="w-full bg-background sm:w-auto">
                  Extend Duration
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Spacer for sticky bar */}
        <div className="h-56 sm:h-24" />

        {/* Apply Modal */}
        <ApplyVariantModal open={applyModalOpen} onOpenChange={setApplyModalOpen} mode="test-winner" />
      </div>
    </TooltipProvider>
  )
}
