"use client"

import Link from "next/link"
import {
  BarChart2,
  Download,
  ExternalLink,
  LayoutGrid,
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
import { hasScreenFunction } from "@/lib/auth"
import { MyReportTemplatePicker } from "@/components/my-reports/my-report-template-picker"

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

export type MyReportTableViewMode = "flat" | "pivot"

export function MyReportTableViewModeToggle({
  tableViewMode,
  onTableViewModeChange,
  className,
  disabled = false,
}: {
  tableViewMode: MyReportTableViewMode
  onTableViewModeChange: (mode: MyReportTableViewMode) => void
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-9 flex-1 gap-1.5",
          tableViewMode === "flat" && "border-2 border-primary text-primary",
        )}
        onClick={() => onTableViewModeChange("flat")}
      >
        <Table2 className="h-4 w-4" />
        Flat
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-9 flex-1 gap-1.5",
          tableViewMode === "pivot" && "border-2 border-primary text-primary",
        )}
        onClick={() => onTableViewModeChange("pivot")}
      >
        <LayoutGrid className="h-4 w-4" />
        Pivot
      </Button>
    </div>
  )
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
  onSave: () => void
  onLoadTemplate: (templateId: string) => void | Promise<void>
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
  onSave,
  onLoadTemplate,
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
  | "onSave"
  | "onLoadTemplate"
  | "appliedConfig"
  | "orgId"
>) {
  const canViewOverviewReport = hasScreenFunction("s-overview-report", "view")
  const canViewOrgDetails = hasScreenFunction("s-orgs", "view-details")
  const canViewProfitPlan = hasScreenFunction("s-orgs", "view-profit-plan")

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
            className="border-b-2 border-primary bg-transparent text-2xl font-semibold text-foreground outline-none"
          />
        ) : (
          <h1 className="truncate text-2xl font-semibold text-foreground">{reportTitle}</h1>
        )}
        <button
          type="button"
          onClick={() => onEditingTitleChange(true)}
          className="rounded p-1 hover:bg-muted"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canViewOverviewReport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground hover:text-foreground" asChild>
                <Link href={buildOverviewHref(appliedConfig)}>
                  <ExternalLink className="h-4 w-4" />
                  Profit Overview
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open KPI plan vs actual on Overview</TooltipContent>
          </Tooltip>
        )}
        {orgId && canViewOrgDetails && canViewProfitPlan ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground hover:text-foreground" asChild>
                <Link href={`/organizations/${orgId}?tab=profit-plan`}>
                  <ExternalLink className="h-4 w-4" />
                  Team plans
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import and edit team profit plans</TooltipContent>
          </Tooltip>
        ) : null}
        <MyReportTemplatePicker onLoadTemplate={onLoadTemplate} />
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-muted">
          <Star className="h-5 w-5 text-muted-foreground" />
        </Phase3DisabledButton>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </Phase3DisabledButton>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-muted">
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </Phase3DisabledButton>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={!canExport || exportDisabled}
          onClick={onExport}
        >
          <Download className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Phase3DisabledButton className="rounded-md p-2 hover:bg-muted">
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </Phase3DisabledButton>
        <Button
          type="button"
          size="sm"
          className="ml-2 h-9 bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={onSave}
        >
          Save
        </Button>
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
    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-9 gap-1.5", editTableOpen && "border-2 border-primary text-primary")}
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
            chartsVisible && "border-2 border-primary text-primary",
          )}
          onClick={() => onChartsVisibleChange(!chartsVisible)}
        >
          <BarChart2 className="h-4 w-4" />
          Chart
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onRefresh}>
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
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
          className="h-9 bg-primary hover:bg-primary/90"
          disabled={loading}
          onClick={onApply}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
