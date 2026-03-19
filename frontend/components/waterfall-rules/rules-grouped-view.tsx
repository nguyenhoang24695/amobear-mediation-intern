"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  MoreHorizontal,
  ListChecks,
  GripVertical,
  Pencil,
  Copy,
  Trash2,
  Pause,
  Play,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  ChevronsUpDown,
  Plus,
  FolderPlus,
  Settings,
} from "lucide-react"
import type { WaterfallRule, RuleGroup } from "./waterfall-rule-types"

interface RulesGroupedViewProps {
  rules: WaterfallRule[]
  ruleGroups: RuleGroup[]
  onEdit: (rule: WaterfallRule) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggle: (id: string) => void
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: (groupId?: number | null) => void
  onCreateGroup: () => void
  onEditGroup: (group: RuleGroup) => void
  onDeleteGroup: (groupId: number) => void
  canManage?: boolean
}

const actionColorMap: Record<string, string> = {
  REMOVE: "bg-red-100 text-red-700",
  KEEP: "bg-blue-100 text-blue-700",
  "TEST REDUCE": "bg-amber-100 text-amber-700",
  "INCREASE 10%": "bg-green-100 text-green-700",
  "INCREASE 20%": "bg-green-100 text-green-700",
  "ADD LAYER": "bg-purple-100 text-purple-700",
  "ADD HIGHER": "bg-purple-100 text-purple-700",
}

const priorityColorMap: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
}

function conditionsSummary(rule: WaterfallRule): string {
  const parts: string[] = []
  if (rule.sowMin !== null || rule.sowMax !== null) {
    const min = rule.sowMin !== null ? `${rule.sowMin}%` : "*"
    const max = rule.sowMax !== null ? `${rule.sowMax}%` : "*"
    parts.push(`SoW: ${min} - ${max}`)
  }
  if (rule.matchRateMin !== null || rule.matchRateMax !== null) {
    const min = rule.matchRateMin !== null ? `${rule.matchRateMin}%` : "*"
    const max = rule.matchRateMax !== null ? `${rule.matchRateMax}%` : "*"
    parts.push(`MR: ${min} - ${max}`)
  }
  if (rule.onlyOneInstance) parts.push("Only 1 instance")
  if (rule.isHighestFloor && rule.isHighestFloor !== "any")
    parts.push(`Highest floor: ${rule.isHighestFloor}`)
  return parts.join(", ")
}

interface GroupData {
  id: number | "ungrouped"
  name: string
  description: string | null
  color: string | null
  isActive: boolean
  isDefault: boolean
  rules: WaterfallRule[]
  appCount: number
}

export function RulesGroupedView({
  rules,
  ruleGroups,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  hasFilters,
  onClearFilters,
  onCreateNew,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  canManage = true,
}: RulesGroupedViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number | "ungrouped">>(
    () => new Set(ruleGroups.map(g => g.id))
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null)

  const groupedData = useMemo<GroupData[]>(() => {
    const sortedGroups = [...ruleGroups].sort((a, b) => a.displayOrder - b.displayOrder)
    const sortedRules = [...rules].sort((a, b) => a.displayOrder - b.displayOrder)
    
    const result: GroupData[] = []
    
    sortedGroups.forEach(group => {
      const groupRules = sortedRules.filter(r => r.groupId === group.id)
      result.push({
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        isActive: group.isActive,
        isDefault: group.isDefault,
        rules: groupRules,
        appCount: group.appCount,
      })
    })
    
    const ungroupedRules = sortedRules.filter(r => r.groupId === null)
    if (ungroupedRules.length > 0) {
      result.push({
        id: "ungrouped",
        name: "Ungrouped Rules",
        description: null,
        color: null,
        isActive: true,
        isDefault: false,
        rules: ungroupedRules,
        appCount: 0,
      })
    }
    
    return result
  }, [rules, ruleGroups])

  const toggleGroup = (groupId: number | "ungrouped") => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const expandAll = () => {
    const allIds: (number | "ungrouped")[] = groupedData.map(g => g.id)
    setExpandedGroups(new Set(allIds))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  if (rules.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No rules found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-blue-600" onClick={onClearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ListChecks className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No rules configured</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first rule to get started</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onCreateNew()}>
                Create Rule
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        <div className="flex items-center justify-end gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
            <ChevronsUpDown className="w-3 h-3 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
            <ChevronsUpDown className="w-3 h-3 mr-1" />
            Collapse All
          </Button>
        </div>

        {groupedData.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          const activeRulesCount = group.rules.filter(r => r.active).length
          
          return (
            <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
              <Card className={`border-slate-200 overflow-hidden ${!group.isActive && group.id !== "ungrouped" ? "opacity-60" : ""}`}>
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
                  style={group.color ? { borderLeftWidth: 4, borderLeftColor: group.color } : undefined}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors flex-1 -ml-2 pl-2 py-1 rounded">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-slate-600" />
                      ) : (
                        <Folder className="w-5 h-5 text-slate-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{group.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.rules.length} rule{group.rules.length !== 1 ? "s" : ""}
                          </Badge>
                          {group.id !== "ungrouped" && group.appCount > 0 && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                              {group.appCount} app{group.appCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {activeRulesCount < group.rules.length && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              {activeRulesCount} active
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <div className="flex items-center gap-2">
                    {group.id !== "ungrouped" && !group.isActive && (
                      <Badge variant="outline" className="text-xs text-slate-500">
                        Disabled
                      </Badge>
                    )}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={() => onCreateNew(group.id === "ungrouped" ? null : group.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Rule
                          </DropdownMenuItem>
                          {group.id !== "ungrouped" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  const originalGroup = ruleGroups.find(g => g.id === group.id)
                                  if (originalGroup) onEditGroup(originalGroup)
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Group
                              </DropdownMenuItem>
                              {!group.isDefault && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteGroupId(group.id as number)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Group
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                
                <CollapsibleContent>
                  {group.rules.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                      No rules in this group
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                          <TableHead className="w-16 text-xs font-medium uppercase tracking-wide">Order</TableHead>
                          <TableHead className="text-xs font-medium uppercase tracking-wide">Rule Name</TableHead>
                          <TableHead className="w-24 text-xs font-medium uppercase tracking-wide">Status</TableHead>
                          <TableHead className="w-64 text-xs font-medium uppercase tracking-wide">Conditions</TableHead>
                          <TableHead className="w-36 text-xs font-medium uppercase tracking-wide">Action</TableHead>
                          <TableHead className="w-24 text-xs font-medium uppercase tracking-wide">Priority</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rules.map((rule) => (
                          <TableRow
                            key={rule.id}
                            className={`hover:bg-slate-50 transition-colors ${!rule.active ? "opacity-60" : ""}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <span className="text-sm font-mono text-slate-500">{rule.displayOrder}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-slate-100">
                                  <ListChecks className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900">{rule.name}</p>
                                  <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                    {conditionsSummary(rule) || "No conditions"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {rule.active ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-slate-600 truncate max-w-[240px] cursor-default">
                                    {conditionsSummary(rule) || "No conditions"}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">{conditionsSummary(rule) || "No conditions set"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${actionColorMap[rule.actionType] || "bg-slate-100 text-slate-700"} hover:opacity-90`}>
                                {rule.actionType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${priorityColorMap[rule.priority]} hover:opacity-90 capitalize`}>
                                {rule.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDuplicate(rule.id)}>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onToggle(rule.id)}>
                                      {rule.active ? (
                                        <>
                                          <Pause className="w-4 h-4 mr-2" />
                                          Disable
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-4 h-4 mr-2" />
                                          Enable
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteId(rule.id)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? Rules in this group will become ungrouped. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteGroupId) {
                  onDeleteGroup(deleteGroupId)
                  setDeleteGroupId(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

