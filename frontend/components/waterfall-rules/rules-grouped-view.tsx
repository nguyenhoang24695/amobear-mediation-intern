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
  REMOVE: "bg-destructive/10 text-destructive",
  KEEP: "bg-primary/10 text-primary",
  "TEST REDUCE": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "INCREASE 10%": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "INCREASE 20%": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "ADD LAYER": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "ADD HIGHER": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
}

const priorityColorMap: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "bg-primary/10 text-primary",
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
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No rules found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-primary" onClick={onClearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ListChecks className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No rules configured</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first rule to get started</p>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => onCreateNew()}>
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
        <div className="mb-2 flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={expandAll} className="w-full text-xs sm:w-auto">
            <ChevronsUpDown className="w-3 h-3 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="w-full text-xs sm:w-auto">
            <ChevronsUpDown className="w-3 h-3 mr-1" />
            Collapse All
          </Button>
        </div>

        {groupedData.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          const activeRulesCount = group.rules.filter(r => r.active).length
          
          return (
            <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
              <Card className={`border-border overflow-hidden ${!group.isActive && group.id !== "ungrouped" ? "opacity-60" : ""}`}>
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-border"
                  style={group.color ? { borderLeftWidth: 4, borderLeftColor: group.color } : undefined}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors flex-1 -ml-2 pl-2 py-1 rounded">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Folder className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{group.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.rules.length} rule{group.rules.length !== 1 ? "s" : ""}
                          </Badge>
                          {group.id !== "ungrouped" && group.appCount > 0 && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30">
                              {group.appCount} app{group.appCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {activeRulesCount < group.rules.length && (
                            <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-300 border-amber-500/30">
                              {activeRulesCount} active
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <div className="flex items-center gap-2">
                    {group.id !== "ungrouped" && !group.isActive && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Disabled
                      </Badge>
                    )}
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-muted-foreground"
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
                                  className="text-destructive focus:text-destructive"
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
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No rules in this group
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                              className={`hover:bg-muted/40 transition-colors ${!rule.active ? "opacity-60" : ""}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                  <span className="text-sm font-mono text-muted-foreground">{rule.displayOrder}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="rounded bg-muted p-1.5">
                                    <ListChecks className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground">{rule.name}</p>
                                    <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                                      {conditionsSummary(rule) || "No conditions"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {rule.active ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                                    Inactive
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="max-w-[240px] cursor-default truncate text-xs text-muted-foreground">
                                      {conditionsSummary(rule) || "No conditions"}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-sm">{conditionsSummary(rule) || "No conditions set"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${actionColorMap[rule.actionType] || "bg-muted text-muted-foreground"} hover:opacity-90`}>
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
                                        className="text-destructive focus:text-destructive"
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
                    </div>
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
              className="bg-destructive hover:bg-destructive/90"
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
              className="bg-destructive hover:bg-destructive/90"
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


