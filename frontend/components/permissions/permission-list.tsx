"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ToggleLeft,
} from "lucide-react"
import type { Screen } from "./permission-management-content"

interface PermissionListProps {
  screens: Screen[]
  permissions: Record<string, string[]>
  onToggleFunction: (screenId: string, functionId: string) => void
  onToggleScreen: (screen: Screen) => void
  onToggleAll: (screens: Screen[]) => void
  disabled?: boolean
}

export function PermissionList({
  screens,
  permissions,
  onToggleFunction,
  onToggleScreen,
  onToggleAll,
  disabled = false,
}: PermissionListProps) {
  const [search, setSearch] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(
    () => new Set(screens.map((s) => s.id)),
  )

  // Available modules
  const modules = useMemo(() => {
    const set = new Set(screens.map((s) => s.module))
    return Array.from(set).sort()
  }, [screens])

  // Filtered screens
  const filteredScreens = useMemo(() => {
    return screens.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const matchesScreen =
          s.name.toLowerCase().includes(q) || s.module.toLowerCase().includes(q)
        const matchesFunction = s.functions.some((f) =>
          f.label.toLowerCase().includes(q),
        )
        if (!matchesScreen && !matchesFunction) return false
      }
      if (moduleFilter !== "all" && s.module !== moduleFilter) return false
      return true
    })
  }, [screens, search, moduleFilter])

  // Grouped by module
  const groupedScreens = useMemo(() => {
    const map = new Map<string, Screen[]>()
    for (const s of filteredScreens) {
      if (!map.has(s.module)) map.set(s.module, [])
      map.get(s.module)!.push(s)
    }
    return Array.from(map.entries())
  }, [filteredScreens])

  // Global stats
  const totalGranted = filteredScreens.reduce(
    (sum, s) => sum + (permissions[s.id] || []).length,
    0,
  )
  const totalAvailable = filteredScreens.reduce(
    (sum, s) => sum + s.functions.length,
    0,
  )
  const allSelected = totalGranted === totalAvailable && totalAvailable > 0
  const someSelected = totalGranted > 0 && !allSelected

  const toggleExpand = (screenId: string) => {
    setExpandedScreens((prev) => {
      const next = new Set(prev)
      if (next.has(screenId)) {
        next.delete(screenId)
      } else {
        next.add(screenId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedScreens(new Set(filteredScreens.map((s) => s.id)))
  }

  const collapseAll = () => {
    setExpandedScreens(new Set())
  }

  const allExpanded = filteredScreens.every((s) => expandedScreens.has(s.id))

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Screen Permissions
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter screens..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => onToggleAll(filteredScreens)}
                  aria-label="Toggle all permissions"
                  disabled={disabled}
                />
                <span className="text-xs text-slate-500">
                  {allSelected ? "Deselect all" : "Select all"}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {totalGranted} / {totalAvailable} granted
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 h-7 px-2"
              onClick={allExpanded ? collapseAll : expandAll}
            >
              <ToggleLeft className="w-3.5 h-3.5 mr-1.5" />
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredScreens.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              No screens match your filter
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search or module filter
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedScreens.map(([module, moduleScreens]) => (
              <div key={module}>
                {/* Module header */}
                <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-600"
                  >
                    {module}
                  </Badge>
                </div>

                {/* Screen rows */}
                {moduleScreens.map((screen) => {
                  const screenFns = permissions[screen.id] || []
                  const isExpanded = expandedScreens.has(screen.id)
                  const allScreenSelected =
                    screenFns.length === screen.functions.length
                  const someScreenSelected =
                    screenFns.length > 0 && !allScreenSelected

                  return (
                    <div key={screen.id} className="border-b border-slate-50 last:border-b-0">
                      {/* Screen header row */}
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-slate-50/60",
                          isExpanded && "bg-slate-50/40",
                        )}
                        onClick={() => toggleExpand(screen.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            toggleExpand(screen.id)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        {/* Expand icon */}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}

                        {/* Select all for screen */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <Checkbox
                            checked={
                              allScreenSelected
                                ? true
                                : someScreenSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={() => onToggleScreen(screen)}
                            aria-label={`Toggle all for ${screen.name}`}
                            disabled={disabled}
                          />
                        </div>

                        {/* Screen name and badge */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-700">
                            {screen.name}
                          </span>
                        </div>

                        {/* Count badge */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-medium flex-shrink-0",
                            allScreenSelected
                              ? "bg-blue-100 text-blue-700"
                              : someScreenSelected
                                ? "bg-blue-50 text-blue-500"
                                : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {screenFns.length} / {screen.functions.length}
                        </Badge>
                      </div>

                      {/* Expanded: function toggles */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 ml-7">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {screen.functions.map((fn) => {
                              const isGranted = screenFns.includes(fn.id)
                              return (
                                <label
                                  key={fn.id}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                                    isGranted
                                      ? "bg-blue-50/60 hover:bg-blue-50"
                                      : "hover:bg-slate-50",
                                  )}
                                >
                                  <Switch
                                    checked={isGranted}
                                    onCheckedChange={() =>
                                      onToggleFunction(screen.id, fn.id)
                                    }
                                    className="data-[state=checked]:bg-blue-600 scale-90"
                                    aria-label={`${fn.label} for ${screen.name}`}
                                    disabled={disabled}
                                  />
                                  <span
                                    className={cn(
                                      "text-sm select-none",
                                      isGranted
                                        ? "text-slate-700 font-medium"
                                        : "text-slate-500",
                                    )}
                                  >
                                    {fn.label}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
