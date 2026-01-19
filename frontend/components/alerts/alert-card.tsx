"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Eye,
  CheckCircle2,
  Timer,
  ChevronDown,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"

interface AlertCardProps {
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
  }
  isSelected: boolean
  onSelect: () => void
  onViewDetail: () => void
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    barColor: "bg-red-500",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    barColor: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Warning",
  },
  info: {
    icon: Info,
    barColor: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Info",
  },
}

const statusConfig = {
  active: {
    badgeClass: "bg-slate-100 text-slate-700",
    label: "Active",
  },
  acknowledged: {
    badgeClass: "bg-purple-100 text-purple-700",
    label: "Acknowledged",
  },
  resolved: {
    badgeClass: "bg-green-100 text-green-700",
    label: "Resolved",
  },
  snoozed: {
    badgeClass: "bg-slate-100 text-slate-500",
    label: "Snoozed",
  },
}

export function AlertCard({ alert, isSelected, onSelect, onViewDetail }: AlertCardProps) {
  const SeverityIcon = severityConfig[alert.severity].icon

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "border-slate-200 overflow-hidden transition-all",
          isSelected && "ring-2 ring-blue-500 ring-offset-2",
          alert.status === "snoozed" && "opacity-60",
        )}
      >
        <div className="flex">
          {/* Severity Indicator Bar */}
          <div className={cn("w-1.5 flex-shrink-0", severityConfig[alert.severity].barColor)} />

          {/* Main Content */}
          <div className="flex-1 p-4">
            {/* Header Row */}
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <Checkbox checked={isSelected} onCheckedChange={onSelect} className="mt-1" />

              <div className="flex-1 min-w-0">
                {/* Top Line: Badges & Timestamp */}
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className={cn("gap-1", severityConfig[alert.severity].badgeClass)}>
                    <SeverityIcon className="w-3 h-3" />
                    {severityConfig[alert.severity].label}
                  </Badge>
                  <Badge variant="outline" className={statusConfig[alert.status].badgeClass}>
                    {statusConfig[alert.status].label}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-slate-900 mb-1">{alert.title}</h3>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-3">{alert.description}</p>

                {/* Affected Entity Links */}
                <div className="flex items-center flex-wrap gap-3 mb-3">
                  {alert.app && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                          <Image
                            src={alert.app.icon || "/placeholder.svg"}
                            alt={alert.app.name}
                            width={18}
                            height={18}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700">{alert.app.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View app details</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {alert.network && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-md">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-slate-700">{alert.network}</span>
                    </div>
                  )}
                  {alert.adUnit && (
                    <div className="px-2.5 py-1.5 bg-slate-50 rounded-md">
                      <span className="text-sm text-slate-500">{alert.adUnit}</span>
                    </div>
                  )}
                </div>

                {/* Metrics (if available) */}
                {alert.metrics && (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{alert.metricLabel}:</span>
                      <span className="text-sm text-slate-400 line-through">
                        {alert.metricLabel?.includes("$") ? `$${alert.metrics.from.toFixed(2)}` : alert.metrics.from}
                      </span>
                      <span className="text-sm text-slate-400">→</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {alert.metricLabel?.includes("$") ? `$${alert.metrics.to.toFixed(2)}` : alert.metrics.to}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        alert.metrics.change < 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-green-50 text-green-700 border-green-200",
                      )}
                    >
                      {alert.metrics.change < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {alert.metrics.change > 0 ? "+" : ""}
                      {alert.metrics.change}%
                    </Badge>
                  </div>
                )}

                {/* Status Info */}
                {alert.status === "acknowledged" && alert.acknowledgedBy && (
                  <p className="text-xs text-slate-500 mt-3">
                    Acknowledged by {alert.acknowledgedBy}{" "}
                    {formatDistanceToNow(alert.acknowledgedAt!, { addSuffix: true })}
                  </p>
                )}
                {alert.status === "snoozed" && alert.snoozedUntil && (
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Snoozed until {alert.snoozedUntil.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={onViewDetail}>
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-white">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolve
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1 bg-white">
                      <Timer className="w-4 h-4" />
                      Snooze
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>1 hour</DropdownMenuItem>
                    <DropdownMenuItem>4 hours</DropdownMenuItem>
                    <DropdownMenuItem>24 hours</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>1 week</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}
