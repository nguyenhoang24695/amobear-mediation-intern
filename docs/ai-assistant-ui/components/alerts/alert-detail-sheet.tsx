"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Timer,
  Bell,
  User,
  ArrowRight,
  Lightbulb,
  History,
  Link2,
  ExternalLink,
} from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow, format } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"

interface AlertDetailSheetProps {
  alert: {
    id: string
    severity: "critical" | "warning" | "info"
    title: string
    description: string
    timestamp: Date
    status: "active" | "acknowledged" | "resolved" | "snoozed"
    app?: { name: string; icon: string }
    network?: string
    adUnit?: string
    metrics?: { from: number; to: number; change: number }
    metricLabel?: string
    acknowledgedBy?: string
    acknowledgedAt?: Date
    snoozedUntil?: Date
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Warning",
  },
  info: {
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Info",
  },
}

// Mock historical data for chart
const historicalData = [
  { time: "12:00", value: 4.52, threshold: 3.0 },
  { time: "13:00", value: 4.48, threshold: 3.0 },
  { time: "14:00", value: 4.35, threshold: 3.0 },
  { time: "15:00", value: 3.89, threshold: 3.0 },
  { time: "16:00", value: 3.21, threshold: 3.0 },
  { time: "17:00", value: 2.85, threshold: 3.0 },
  { time: "18:00", value: 2.45, threshold: 3.0 },
  { time: "19:00", value: 2.1, threshold: 3.0 },
]

// Mock timeline events
const timelineEvents = [
  {
    type: "triggered",
    icon: AlertTriangle,
    title: "Alert Triggered",
    description: "eCPM dropped below $3.00 threshold",
    time: new Date(Date.now() - 15 * 60 * 1000),
    color: "text-red-600",
  },
  {
    type: "notification",
    icon: Bell,
    title: "Notification Sent",
    description: "Email sent to john@example.com",
    time: new Date(Date.now() - 14 * 60 * 1000),
    color: "text-blue-600",
  },
  {
    type: "notification",
    icon: Bell,
    title: "Slack Notification",
    description: "Posted to #ad-alerts channel",
    time: new Date(Date.now() - 14 * 60 * 1000),
    color: "text-blue-600",
  },
]

// Mock related alerts
const relatedAlerts = [
  { id: "rel-1", title: "Fill rate dropped for same ad unit", severity: "warning", time: "2 hours ago" },
  { id: "rel-2", title: "Network latency increased", severity: "info", time: "3 hours ago" },
]

// Mock suggested actions
const suggestedActions = [
  { id: "1", action: "Increase floor price to $2.50", impact: "May improve eCPM by 15%" },
  { id: "2", action: "Enable backup ad network", impact: "Ensures fill rate stability" },
  { id: "3", action: "Review waterfall configuration", impact: "Optimize ad source priorities" },
]

export function AlertDetailSheet({ alert, open, onOpenChange }: AlertDetailSheetProps) {
  if (!alert) return null

  const SeverityIcon = severityConfig[alert.severity].icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                alert.severity === "critical"
                  ? "bg-red-100"
                  : alert.severity === "warning"
                    ? "bg-amber-100"
                    : "bg-blue-100"
              }`}
            >
              <SeverityIcon
                className={`w-5 h-5 ${
                  alert.severity === "critical"
                    ? "text-red-600"
                    : alert.severity === "warning"
                      ? "text-amber-600"
                      : "text-blue-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={severityConfig[alert.severity].badgeClass}>
                  {severityConfig[alert.severity].label}
                </Badge>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                </span>
              </div>
              <SheetTitle className="text-lg">{alert.title}</SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6 pb-6">
          {/* Description */}
          <p className="text-sm text-slate-600">{alert.description}</p>

          {/* Affected Entities */}
          <div className="flex flex-wrap gap-3">
            {alert.app && (
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <Image
                  src={alert.app.icon || "/placeholder.svg"}
                  alt={alert.app.name}
                  width={24}
                  height={24}
                  className="rounded"
                />
                <span className="text-sm font-medium text-slate-700">{alert.app.name}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}
            {alert.network && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-700">{alert.network}</span>
              </div>
            )}
            {alert.adUnit && (
              <div className="px-3 py-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">{alert.adUnit}</span>
              </div>
            )}
          </div>

          {/* Historical Chart */}
          {alert.metrics && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">{alert.metricLabel} Over Time</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} domain={[0, 5]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      />
                      <ReferenceLine
                        y={3}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{ value: "Threshold", position: "insideTopRight", fill: "#ef4444", fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-blue-500" />
                    <span className="text-slate-600">{alert.metricLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500 border-dashed" style={{ borderTop: "2px dashed #ef4444" }} />
                    <span className="text-slate-600">Threshold</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                {timelineEvents.map((event, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-[25px] w-4 h-4 rounded-full bg-white border-2 flex items-center justify-center ${
                        event.type === "triggered" ? "border-red-500" : "border-blue-500"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${event.type === "triggered" ? "bg-red-500" : "bg-blue-500"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-900">{event.title}</span>
                        <span className="text-xs text-slate-400">{format(event.time, "HH:mm")}</span>
                      </div>
                      <p className="text-sm text-slate-500">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Related Alerts */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Related Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {relatedAlerts.map((related) => (
                  <button
                    key={related.id}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {related.severity === "warning" ? (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-sm text-slate-700">{related.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">{related.time}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggested Actions */}
          <Card className="border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Suggested Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {suggestedActions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{suggestion.action}</p>
                      <p className="text-xs text-slate-500">{suggestion.impact}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-1 bg-white">
                      Apply
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
              <CheckCircle2 className="w-4 h-4" />
              Resolve Alert
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent">
              <User className="w-4 h-4" />
              Acknowledge
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Timer className="w-4 h-4" />
              Snooze
            </Button>
          </div>

          {/* Resolution History */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Resolution History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">No previous resolutions for this alert type</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
