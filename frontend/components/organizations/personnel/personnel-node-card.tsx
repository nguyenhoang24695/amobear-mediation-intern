"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { PersonnelNode } from "@/lib/mock/org-personnel-mock"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const typeStyles: Record<PersonnelNode["type"], string> = {
  organization: "border-blue-300 bg-blue-50/80 ring-2 ring-blue-200",
  department: "border-violet-300 bg-violet-50/80",
  member: "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md",
}

const avatarStyles: Record<PersonnelNode["type"], string> = {
  organization: "bg-blue-600 text-white",
  department: "bg-violet-600 text-white",
  member: "bg-slate-100 text-slate-700",
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  invited: "bg-amber-100 text-amber-700",
}

interface PersonnelNodeCardProps {
  node: PersonnelNode
  selected?: boolean
  highlighted?: boolean
  collapsed?: boolean
  hasChildren?: boolean
  onClick?: () => void
  onToggleCollapse?: () => void
}

export function PersonnelNodeCard({
  node,
  selected = false,
  highlighted = false,
  collapsed = false,
  hasChildren = false,
  onClick,
  onToggleCollapse,
}: PersonnelNodeCardProps) {
  const displayName = node.type === "organization" ? node.name : node.name
  const subtitle =
    node.type === "department" ? "Department" : node.title ?? node.department ?? ""

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-[200px] flex-col items-center gap-2 rounded-lg border px-3 py-3 text-left transition-all",
        typeStyles[node.type],
        selected && "ring-2 ring-blue-500 border-blue-400 shadow-md",
        highlighted && !selected && "ring-2 ring-amber-300",
      )}
    >
      {hasChildren && onToggleCollapse && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse()
          }}
          className="absolute -bottom-3 left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "+" : "−"}
        </span>
      )}
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn("text-sm font-semibold", avatarStyles[node.type])}>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {node.department && node.type === "member" && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {node.department}
          </Badge>
        )}
        {node.status && node.type === "member" && (
          <Badge className={cn("text-[10px] px-1.5 py-0 capitalize", statusBadge[node.status])}>
            {node.status}
          </Badge>
        )}
        {typeof node.directReports === "number" && node.directReports > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {node.directReports} reports
          </Badge>
        )}
      </div>
    </button>
  )
}
