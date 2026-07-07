"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { OrganizationLogoMark } from "../organization-logo-mark"
import { Badge } from "@/components/ui/badge"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"
import { Crown, Trash2 } from "lucide-react"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const typeStyles: Record<PersonnelNode["type"], string> = {
  organization: "border-blue-300 bg-blue-50/80 ring-2 ring-blue-200 dark:border-blue-500/30 dark:bg-blue-500/10 dark:ring-blue-500/20",
  department: "border-violet-300 bg-violet-50/80 dark:border-violet-500/30 dark:bg-violet-500/10",
  member: "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-blue-500/30",
}

const avatarStyles: Record<PersonnelNode["type"], string> = {
  organization: "bg-blue-600 text-white",
  department: "bg-violet-600 text-white",
  member: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  invited: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
}

interface PersonnelNodeCardProps {
  node: PersonnelNode
  selected?: boolean
  highlighted?: boolean
  collapsed?: boolean
  hasChildren?: boolean
  onClick?: () => void
  onToggleCollapse?: () => void
  showRemove?: boolean
  onRemove?: (node: PersonnelNode) => void
  organizationLogoUrl?: string | null
}

export function PersonnelNodeCard({
  node,
  selected = false,
  highlighted = false,
  collapsed = false,
  hasChildren = false,
  onClick,
  onToggleCollapse,
  showRemove = false,
  onRemove,
  organizationLogoUrl,
}: PersonnelNodeCardProps) {
  const displayName = node.type === "organization" ? node.name : node.name
  const subtitle =
    node.isTeamGroup ? node.title ?? "" : node.type === "department" ? "Department" : node.title ?? node.department ?? ""
  const isHydratedTeamMember = Boolean(node.teamId && !node.isTeamGroup)
  const hasRemovableContent =
    node.type === "member" ||
    (node.type === "organization" && (node.children?.length ?? 0) > 0)
  const canRemove = showRemove && hasRemovableContent && onRemove && !isHydratedTeamMember

  return (
    <div className="relative">
      {canRemove && (
        <button
          type="button"
          title="Remove from chart"
          className="absolute -right-1 -top-1 z-30 flex h-6 w-6 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-500/10"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(node)
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex w-[200px] flex-col items-center gap-2 rounded-lg border px-3 py-3 text-left transition-all",
          node.isTeamGroup ? "border-blue-300 bg-blue-50/80 hover:border-blue-400 hover:shadow-md dark:border-blue-500/30 dark:bg-blue-500/10 dark:hover:border-blue-400" : typeStyles[node.type],
          selected && "ring-2 ring-blue-500 border-blue-400 shadow-md dark:ring-blue-400 dark:border-blue-400",
          highlighted && !selected && "ring-2 ring-amber-300 dark:ring-amber-400",
        )}
      >
        {hasChildren && onToggleCollapse && (
          <span
            role="presentation"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            className="absolute -bottom-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "+" : "−"}
          </span>
        )}
        {node.type === "organization" ? (
          <OrganizationLogoMark
            orgName={displayName}
            logoUrl={organizationLogoUrl}
            size="chart"
          />
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn("text-sm font-semibold", node.isTeamGroup ? "bg-blue-600 text-white" : avatarStyles[node.type])}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="w-full text-center">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
          {node.type !== "organization" && subtitle && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {node.type !== "organization" && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {node.isTeamLead && (
              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 gap-1 dark:bg-amber-500/15 dark:text-amber-200">
                <Crown className="h-3 w-3" />
                Lead
              </Badge>
            )}
            {node.department && node.type === "member" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 dark:bg-slate-800 dark:text-slate-200">
                {node.department}
              </Badge>
            )}
            {node.status && node.type === "member" && (
              <Badge className={cn("text-[10px] px-1.5 py-0 capitalize", statusBadge[node.status])}>
                {node.status}
              </Badge>
            )}
            {typeof node.directReports === "number" && node.directReports > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 dark:border-white/10 dark:text-slate-200">
                {node.directReports} reports
              </Badge>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
