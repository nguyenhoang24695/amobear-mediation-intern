"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { FlaskConical, CheckCircle2, XCircle, TrendingUp, ArrowRight } from "lucide-react"

interface ABTestsTabProps {
  onCreateTest: () => void
  hasRunningTest: boolean
}

// Mock A/B test data
const abTests = [
  {
    id: "test-3",
    name: "Waterfall Optimization Test #3",
    status: "running",
    startDate: "Jan 10, 2026",
    duration: 14,
    currentDay: 5,
    trafficSplit: "50/50",
    variantA: { name: "Current", ecpm: 56.4 },
    variantB: { name: "Optimized", ecpm: 61.08 },
    leadingVariant: "B",
    leadingPercentage: 8.3,
  },
  {
    id: "test-2",
    name: "Waterfall Optimization Test #2",
    status: "completed",
    startDate: "Oct 9, 2025",
    endDate: "Jan 7, 2026",
    trafficSplit: "50/50",
    variantA: { name: "Current", ecpm: 56.4 },
    variantB: { name: "Optimized", ecpm: 63.08 },
    winner: "B",
    winnerPercentage: 11.8,
    confidence: 99,
    appliedOn: "Jan 8, 2026",
  },
  {
    id: "test-1",
    name: "Waterfall Optimization Test #1",
    status: "cancelled",
    startDate: "Sep 1, 2025",
    endDate: "Sep 8, 2025",
    trafficSplit: "50/50",
    cancelReason: "Manual cancellation by John Doe",
  },
]

export function ABTestsTab({ onCreateTest, hasRunningTest }: ABTestsTabProps) {
  if (abTests.length === 0) {
    // Empty State
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <FlaskConical className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No A/B Tests Yet</h3>
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">
          Run an A/B test to validate waterfall optimizations before applying them to your production traffic.
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={onCreateTest}>
          Create First A/B Test
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">A/B Tests</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={onCreateTest} disabled={hasRunningTest}>
                  Create New Test
                </Button>
              </span>
            </TooltipTrigger>
            {hasRunningTest && (
              <TooltipContent>
                <p>A test is already running. Wait for it to complete or stop it first.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Test Cards */}
      <div className="space-y-4">
        {abTests.map((test) => (
          <Card key={test.id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    test.status === "running"
                      ? "bg-purple-100"
                      : test.status === "completed"
                        ? "bg-green-100"
                        : "bg-slate-100"
                  }`}
                >
                  {test.status === "running" && <FlaskConical className="w-5 h-5 text-purple-600" />}
                  {test.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {test.status === "cancelled" && <XCircle className="w-5 h-5 text-slate-500" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900">{test.name}</h3>
                    <Badge
                      className={
                        test.status === "running"
                          ? "bg-purple-100 text-purple-700 border-0"
                          : test.status === "completed"
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-slate-100 text-slate-600 border-0"
                      }
                    >
                      {test.status === "running"
                        ? "In Progress"
                        : test.status === "completed"
                          ? "Completed"
                          : "Cancelled"}
                    </Badge>
                  </div>

                  {/* Info line */}
                  <p className="text-xs text-slate-500 mt-1">
                    {test.status === "running" &&
                      `Started: ${test.startDate} • Duration: ${test.duration} days • Traffic: ${test.trafficSplit}`}
                    {test.status === "completed" &&
                      `${test.startDate} - ${test.endDate} • Traffic: ${test.trafficSplit}`}
                    {test.status === "cancelled" &&
                      `${test.startDate} - ${test.endDate} (stopped early) • Traffic: ${test.trafficSplit}`}
                  </p>

                  {/* Running test details */}
                  {test.status === "running" && (
                    <>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">
                          Day {test.currentDay} of {test.duration}
                        </span>
                        <Progress
                          value={(test.currentDay / test.duration) * 100}
                          className="h-1.5 w-32 bg-slate-200 [&>div]:bg-purple-500"
                        />
                      </div>
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Early Results:</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-600">
                            Variant A (Current):{" "}
                            <span className="font-medium text-slate-900">${test.variantA.ecpm} eCPM</span>
                          </span>
                          <span className="text-slate-600">
                            Variant B (Optimized):{" "}
                            <span className="font-medium text-slate-900">${test.variantB.ecpm} eCPM</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-green-600 text-sm">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Variant B leading by +{test.leadingPercentage}%</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Completed test details */}
                  {test.status === "completed" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-green-600">Variant {test.winner} won</span> with{" "}
                        {test.confidence}% confidence
                      </p>
                      <p className="text-xs text-slate-500">
                        Variant A: ${test.variantA.ecpm} eCPM • Variant B: ${test.variantB.ecpm} eCPM (+
                        {test.winnerPercentage}%)
                      </p>
                      <p className="text-xs text-slate-500">
                        Applied Variant {test.winner} on {test.appliedOn}
                      </p>
                    </div>
                  )}

                  {/* Cancelled test details */}
                  {test.status === "cancelled" && (
                    <p className="text-sm text-slate-500 mt-2">Reason: {test.cancelReason}</p>
                  )}
                </div>

                {/* Action */}
                <Link
                  href={`/mediation/tests/${test.id}`}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline flex-shrink-0"
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
