"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, ArrowRight } from "lucide-react"

const alerts = [
  {
    id: "1",
    severity: "critical",
    message: "AdMob fill rate dropped below 80% for 'Puzzle Master' app",
    time: "5 min ago",
    link: "/alert-center/1",
    appId: "1",
  },
  {
    id: "2",
    severity: "critical",
    message: "Unity Ads SDK error detected in 3 apps",
    time: "12 min ago",
    link: "/alert-center/2",
  },
  {
    id: "3",
    severity: "critical",
    message: "Revenue anomaly detected: 40% drop in APAC region",
    time: "18 min ago",
    link: "/alert-center/3",
  },
  {
    id: "4",
    severity: "warning",
    message: "Meta Audience Network eCPM below threshold",
    time: "25 min ago",
    link: "/alert-center/4",
  },
  {
    id: "5",
    severity: "info",
    message: "New waterfall optimization suggestions available",
    time: "1 hour ago",
    link: "/mediation/1",
  },
]

const severityCounts = {
  critical: 3,
  warning: 8,
  info: 2,
}

export function AlertSummary() {
  const [expanded, setExpanded] = useState(false)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Link href="/alert-center?severity=critical">
                <Badge
                  variant="destructive"
                  className="gap-1 px-2.5 py-1 cursor-pointer hover:bg-red-600 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {severityCounts.critical} Critical
                </Badge>
              </Link>
              <Link href="/alert-center?severity=warning">
                <Badge className="gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {severityCounts.warning} Warning
                </Badge>
              </Link>
              <Link href="/alert-center?severity=info">
                <Badge className="gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors">
                  <Info className="w-3.5 h-3.5" />
                  {severityCounts.info} Info
                </Badge>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/alert-center">
              <Button variant="link" className="text-sm text-blue-600 hover:text-blue-700 p-0 h-auto">
                View All Alerts
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.link}
                className="flex items-start gap-3 p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer block"
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{alert.message}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{alert.time}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
