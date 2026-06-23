"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import type { WaterfallRule } from "./waterfall-rules-content"

interface RulesTableProps {
  rules: WaterfallRule[]
  allRules: WaterfallRule[]
  onEdit: (rule: WaterfallRule) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: "up" | "down") => void
  onBulkEnable: (ids: string[]) => void
  onBulkDisable: (ids: string[]) => void
  onBulkDelete: (ids: string[]) => void
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
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

function conditionsLines(rule: WaterfallRule): string[] {
  const lines: string[] = []
  if (rule.sowMin !== null || rule.sowMax !== null) {
    const min = rule.sowMin !== null ? `${rule.sowMin}%` : "*"
    const max = rule.sowMax !== null ? `${rule.sowMax}%` : "*"
    lines.push(`SoW: ${min} - ${max}`)
  }
  if (rule.matchRateMin !== null || rule.matchRateMax !== null) {
    const min = rule.matchRateMin !== null ? `${rule.matchRateMin}%` : "*"
    const max = rule.matchRateMax !== null ? `${rule.matchRateMax}%` : "*"
    lines.push(`Match Rate: ${min} - ${max}`)
  }
  if (rule.onlyOneInstance) lines.push("Only when 1 instance left")
  if (rule.isHighestFloor && rule.isHighestFloor !== "any")
    lines.push(`Is highest floor: ${rule.isHighestFloor}`)
  return lines
}

export function RulesTable({
  rules,
  allRules,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onMove,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
  hasFilters,
  onClearFilters,
  onCreateNew,
}: RulesTableProps) {
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...rules].sort((a, b) => a.displayOrder - b.displayOrder)
  }, [rules])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSelectAll = () => {
    if (selectedRules.length === paginated.length) {
      setSelectedRules([])
    } else {
      setSelectedRules(paginated.map((r) => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedRules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const isFirst = (rule: WaterfallRule) => {
    const allSorted = [...allRules].sort(
      (a, b) => a.displayOrder - b.displayOrder
    )
    return allSorted[0]?.id === rule.id
  }

  const isLast = (rule: WaterfallRule) => {
    const allSorted = [...allRules].sort(
      (a, b) => a.displayOrder - b.displayOrder
    )
    return allSorted[allSorted.length - 1]?.id === rule.id
  }

  // Empty state
  if (rules.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No rules found
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Try adjusting your search or filters
              </p>
              <Button
                variant="link"
                className="text-blue-600"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ListChecks className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No rules configured
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Create your first rule to get started
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onCreateNew}
              >
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
      {/* Bulk Actions Bar */}
      {selectedRules.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg gap-2">
          <span className="text-sm font-medium text-blue-700">
            {selectedRules.length} rule{selectedRules.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 bg-transparent"
              onClick={() => {
                onBulkEnable(selectedRules)
                setSelectedRules([])
              }}
            >
              Enable Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 bg-transparent"
              onClick={() => {
                onBulkDisable(selectedRules)
                setSelectedRules([])
              }}
            >
              Disable Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
              onClick={() => setBulkDeleteOpen(true)}
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => setSelectedRules([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="border-slate-200 hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedRules.length === paginated.length &&
                        paginated.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16 text-xs font-medium uppercase tracking-wide">
                    Order
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">
                    Rule Name
                  </TableHead>
                  <TableHead className="w-24 text-xs font-medium uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="w-64 text-xs font-medium uppercase tracking-wide">
                    Conditions
                  </TableHead>
                  <TableHead className="w-48 text-xs font-medium uppercase tracking-wide">
                    Action
                  </TableHead>
                  <TableHead className="w-28 text-xs font-medium uppercase tracking-wide">
                    Priority
                  </TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((rule) => {
                  const lines = conditionsLines(rule)
                  return (
                    <TableRow
                      key={rule.id}
                      className={`hover:bg-slate-50 transition-colors ${!rule.active ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRules.includes(rule.id)}
                          onCheckedChange={() => toggleSelect(rule.id)}
                        />
                      </TableCell>

                      {/* Order */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                          <span className="text-sm font-mono text-slate-500">
                            {rule.displayOrder}
                          </span>
                        </div>
                      </TableCell>

                      {/* Rule Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-slate-100">
                            <ListChecks className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {rule.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              {conditionsSummary(rule) || "No conditions"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
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

                      {/* Conditions */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-default space-y-0.5">
                              {lines.length > 0 ? (
                                lines.slice(0, 2).map((line) => (
                                  <p
                                    key={line}
                                    className="text-xs text-slate-600"
                                  >
                                    {line}
                                  </p>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  No conditions
                                </p>
                              )}
                              {lines.length > 2 && (
                                <p className="text-xs text-slate-400">
                                  +{lines.length - 2} more...
                                </p>
                              )}
                            </div>
                          </TooltipTrigger>
                          {lines.length > 0 && (
                            <TooltipContent className="max-w-xs">
                              {lines.map((line) => (
                                <p key={line} className="text-sm">
                                  {line}
                                </p>
                              ))}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${actionColorMap[rule.actionType] || "bg-slate-100 text-slate-700"} hover:opacity-90`}
                          >
                            {rule.actionType}
                          </Badge>
                          {rule.multiplier && (
                            <span className="text-xs text-slate-500 font-medium">
                              {rule.multiplier}x
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Badge
                          className={`${priorityColorMap[rule.priority]} hover:opacity-90 capitalize`}
                        >
                          {rule.priority}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onEdit(rule)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDuplicate(rule.id)}
                            >
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
                            {!isFirst(rule) && (
                              <DropdownMenuItem
                                onClick={() => onMove(rule.id, "up")}
                              >
                                <ArrowUp className="w-4 h-4 mr-2" />
                                Move Up
                              </DropdownMenuItem>
                            )}
                            {!isLast(rule) && (
                              <DropdownMenuItem
                                onClick={() => onMove(rule.id, "down")}
                              >
                                <ArrowDown className="w-4 h-4 mr-2" />
                                Move Down
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {sorted.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sorted.length}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page)
                setSelectedRules([])
              }}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
                setSelectedRules([])
              }}
              itemName="rules"
            />
          )}
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginated.map((rule) => {
          const lines = conditionsLines(rule)
          return (
            <Card
              key={rule.id}
              className={`border-slate-200 ${!rule.active ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedRules.includes(rule.id)}
                      onCheckedChange={() => toggleSelect(rule.id)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        #{rule.displayOrder}
                      </span>
                      <p className="font-medium text-slate-900">{rule.name}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
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
                        className="text-red-600"
                        onClick={() => setDeleteId(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
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
                  <Badge
                    className={`${actionColorMap[rule.actionType] || "bg-slate-100 text-slate-700"} hover:opacity-90`}
                  >
                    {rule.actionType}
                  </Badge>
                  {rule.multiplier && (
                    <span className="text-xs text-slate-500 font-medium">
                      {rule.multiplier}x
                    </span>
                  )}
                  <Badge
                    className={`${priorityColorMap[rule.priority]} hover:opacity-90 capitalize`}
                  >
                    {rule.priority}
                  </Badge>
                </div>

                {lines.length > 0 && (
                  <div className="space-y-0.5">
                    {lines.map((line) => (
                      <p key={line} className="text-xs text-slate-600">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Delete Single Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteId) onDelete(deleteId)
                setDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRules.length} Rules</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRules.length} selected
              rules? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onBulkDelete(selectedRules)
                setSelectedRules([])
                setBulkDeleteOpen(false)
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
