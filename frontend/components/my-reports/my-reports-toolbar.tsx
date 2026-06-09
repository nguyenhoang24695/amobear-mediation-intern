"use client"

import Link from "next/link"
import {
  BarChart2,
  Download,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Star,
  Table2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { resolveMyReportDateRange } from "@/components/my-reports/hooks/use-my-report-config"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import { toApiDateString } from "@/lib/reports/report-date-filter-utils"

function Phase3DisabledButton({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className={cn("cursor-not-allowed opacity-50", className)}
          >
            {children}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming in Phase 3</TooltipContent>
    </Tooltip>
  )
}

function buildOverviewHref(config: MyReportConfig | null): string {
  if (!config) return "/reports/overview"
  const { start, end } = resolveMyReportDateRange(config)
  const params = new URLSearchParams({
    from: toApiDateString(start),
    to: toApiDateString(end),
  })
  if (config.selectedCommissionTeamIds.length === 1) {
    params.set("teamId", config.selectedCommissionTeamIds[0])
  }
  return `/reports/overview?${params.toString()}`
}

export type MyReportsToolbarProps = {
  reportTitle: string
  isEditingTitle: boolean
  onTitleChange: (value: string) => void
  onEditingTitleChange: (editing: boolean) => void
  editTableOpen: boolean
  onEditTableToggle: () => void
  chartsVisible: boolean
  onChartsVisibleChange: (visible: boolean) => void
  loading: boolean
  hasPendingApply: boolean
  onApply: () => void
  onRefresh: () => void
  canExport: boolean
  exportDisabled: boolean
  onExport: () => void
  appliedConfig: MyReportConfig | null
  orgId?: string | null
}

export function MyReportsToolbar({
  reportTitle,
  isEditingTitle,
  onTitleChange,
  onEditingTitleChange,
  canExport,
  exportDisabled,
  onExport,
  appliedConfig,
  orgId,
}: Pick<
  MyReportsToolbarProps,
  | "reportTitle"
  | "isEditingTitle"
  | "onTitleChange"
  | "onEditingTitleChange"
  | "canExport"
  | "exportDisabled"
  | "onExport"
  | "appliedConfig"
  | "orgId"
>) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pb-4">
      <div className="flex min-w-0 items-center gap-2">
        {isEditingTitle ? (
          <input
            autoFocus
            value={reportTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => onEditingTitleChange(false)}
            onKeyDown={(e) => e.key === "Enter" && onEditingTitleChange(false)}
            className="border-b-2 border-blue-500 bg-transparent text-2xl font-semibold outline-none"
          />
        ) : (
          <h1 className="truncate text-2xl font-semibold text-gray-900">{reportTitle}</h1>
        )}
        <button
          type="button"
          onClick={() => onEditingTitleChange(true)}
          className="rounded p-1 hover:bg-gray-100"
        >
          <Pencil className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-gray-600" asChild>
              <Link href={buildOverviewHref(appliedConfig)}>
                <ExternalLink className="h-4 w-4" />
                Profit Overview
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open KPI plan vs actual on Overview</TooltipContent>
        </Tooltip>
        {orgId ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-gray-600" asChild>
                <Link href={`/organizations/${orgId}?tab=profit-plan`}>
                  <ExternalLink className="h-4 w-4" />
                  Team plans
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import and edit team profit plans</TooltipContent>
          </Tooltip>
        ) : null}
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-gray-100">
          <Star className="h-5 w-5 text-gray-400" />
        </Phase3DisabledButton>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-gray-100">
          <Mail className="h-5 w-5 text-gray-400" />
        </Phase3DisabledButton>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-gray-100">
          <Share2 className="h-5 w-5 text-gray-400" />
        </Phase3DisabledButton>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={!canExport || exportDisabled}
          onClick={onExport}
        >
          <Download className="h-5 w-5 text-gray-400" />
        </Button>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-gray-100">
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </Phase3DisabledButton>
        <Phase3DisabledButton className="ml-2 h-9 rounded-md bg-blue-600 px-5 text-sm font-medium text-white">
          Save
        </Phase3DisabledButton>
      </div>
    </div>
  )
}

export function MyReportsTableActionBar({
  editTableOpen,
  onEditTableToggle,
  chartsVisible,
  onChartsVisibleChange,
  loading,
  hasPendingApply,
  onApply,
  onRefresh,
}: Pick<
  MyReportsToolbarProps,
  | "editTableOpen"
  | "onEditTableToggle"
  | "chartsVisible"
  | "onChartsVisibleChange"
  | "loading"
  | "hasPendingApply"
  | "onApply"
  | "onRefresh"
>) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 gap-1.5", editTableOpen && "border-2 border-blue-600 text-blue-600")}
          onClick={onEditTableToggle}
        >
          <Table2 className="h-4 w-4" />
          Edit table
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5",
            chartsVisible && "border-2 border-blue-600 text-blue-600",
          )}
          onClick={() => onChartsVisibleChange(!chartsVisible)}
        >
          <BarChart2 className="h-4 w-4" />
          Chart
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onRefresh}>
          <RefreshCw className={cn("h-4 w-4 text-gray-500", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {hasPendingApply ? (
          <Badge variant="secondary" className="text-xs">
            Unapplied changes
          </Badge>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="h-9 bg-blue-600 hover:bg-blue-700"
          disabled={loading}
          onClick={onApply}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
