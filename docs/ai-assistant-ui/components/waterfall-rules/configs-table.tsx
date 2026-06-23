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
  Settings,
  Smartphone,
  Globe,
  Pencil,
  Copy,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import type { AppConfig, AppConfigGroup } from "./waterfall-rules-content"

interface ConfigsTableProps {
  groups: AppConfigGroup[]
  onEditConfig: (config: AppConfig) => void
  onDeleteConfig: (id: string) => void
  onDuplicateConfig: (id: string) => void
  onDeleteApp: (appId: string) => void
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
}

type SortField = "appName" | "configCount"
type SortDir = "asc" | "desc"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ConfigsTable({
  groups,
  onEditConfig,
  onDeleteConfig,
  onDuplicateConfig,
  onDeleteApp,
  hasFilters,
  onClearFilters,
  onCreateNew,
}: ConfigsTableProps) {
  const [sortField, setSortField] = useState<SortField>("appName")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set())
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null)
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const arr = [...groups]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "appName":
          cmp = a.appName.localeCompare(b.appName)
          break
        case "configCount":
          cmp = a.configs.length - b.configs.length
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [groups, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setCurrentPage(1)
  }

  const toggleExpand = (appId: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appId)) {
        next.delete(appId)
      } else {
        next.add(appId)
      }
      return next
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600" />
    )
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No apps found
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
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                No configurations yet
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Create your first configuration to get started
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={onCreateNew}
              >
                Create Config
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <Card className="border-slate-200 hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-10" />
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("appName")}
                    >
                      App
                      <SortIcon field="appName" />
                    </button>
                  </TableHead>
                  <TableHead className="w-36">
                    <button
                      type="button"
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort("configCount")}
                    >
                      Configs
                      <SortIcon field="configCount" />
                    </button>
                  </TableHead>
                  <TableHead className="w-16">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((group) => {
                  const isExpanded = expandedApps.has(group.appId)
                  return (
                    <AppRow
                      key={group.appId}
                      group={group}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpand(group.appId)}
                      onEditConfig={onEditConfig}
                      onDeleteConfig={(id) => setDeleteConfigId(id)}
                      onDuplicateConfig={onDuplicateConfig}
                      onDeleteApp={() => setDeleteAppId(group.appId)}
                    />
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
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="apps"
            />
          )}
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginated.map((group) => {
          const isExpanded = expandedApps.has(group.appId)
          return (
            <Card key={group.appId} className="border-slate-200">
              <CardContent className="p-0">
                {/* App row */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left"
                  onClick={() => toggleExpand(group.appId)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded ${group.isGlobal ? "bg-slate-100" : "bg-blue-50"}`}
                    >
                      {group.isGlobal ? (
                        <Globe className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {group.isGlobal ? "Global" : group.appName}
                      </p>
                      {group.isGlobal && (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-xs mt-0.5">
                          All Apps
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {group.configs.length}{" "}
                      {group.configs.length === 1 ? "config" : "configs"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteAppId(group.appId)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Delete all configs</span>
                    </Button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded configs */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {group.configs.map((config) => (
                      <div
                        key={config.id}
                        className="p-4 border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-slate-700">
                            Config #{config.id}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => onEditConfig(config)}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDuplicateConfig(config.id)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteConfigId(config.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs">
                              Recommendations
                            </p>
                            <p className="text-slate-700 font-medium">
                              {config.minRecommendations} -{" "}
                              {config.maxRecommendations}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">
                              Min Match Rate
                            </p>
                            <p className="text-slate-700 font-medium">
                              {config.minMatchRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Min SoW</p>
                            <p className="text-slate-700 font-medium">
                              {config.minSoW}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Updated</p>
                            <p className="text-slate-500 text-xs">
                              {formatDate(config.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Delete Single Config Confirmation */}
      <AlertDialog
        open={!!deleteConfigId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfigId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this configuration? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteConfigId) onDeleteConfig(deleteConfigId)
                setDeleteConfigId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Configs of an App Confirmation */}
      <AlertDialog
        open={!!deleteAppId}
        onOpenChange={(open) => {
          if (!open) setDeleteAppId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove App Configs</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const app = groups.find((g) => g.appId === deleteAppId)
                if (!app) return "Are you sure?"
                return `This will delete all ${app.configs.length} configuration${app.configs.length === 1 ? "" : "s"} for "${app.isGlobal ? "Global" : app.appName}". This action cannot be undone.`
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteAppId) onDeleteApp(deleteAppId)
                setDeleteAppId(null)
              }}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- App Row with expandable configs ---
function AppRow({
  group,
  isExpanded,
  onToggleExpand,
  onEditConfig,
  onDeleteConfig,
  onDuplicateConfig,
  onDeleteApp,
}: {
  group: AppConfigGroup
  isExpanded: boolean
  onToggleExpand: () => void
  onEditConfig: (config: AppConfig) => void
  onDeleteConfig: (id: string) => void
  onDuplicateConfig: (id: string) => void
  onDeleteApp: () => void
}) {
  return (
    <>
      {/* Main app row */}
      <TableRow
        className="hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={onToggleExpand}
      >
        <TableCell className="w-10 pr-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded ${group.isGlobal ? "bg-slate-100" : "bg-blue-50"}`}
            >
              {group.isGlobal ? (
                <Globe className="w-4 h-4 text-slate-500" />
              ) : (
                <Smartphone className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {group.isGlobal ? "Global" : group.appName}
              </p>
              {group.isGlobal && (
                <p className="text-xs text-slate-500">
                  Default config for all apps
                </p>
              )}
              {!group.isGlobal && (
                <p className="text-xs text-slate-500">{group.appId}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-medium">
            {group.configs.length}{" "}
            {group.configs.length === 1 ? "config" : "configs"}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteApp()
            }}
            title={`Delete all configs for ${group.isGlobal ? "Global" : group.appName}`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="sr-only">Delete all configs</span>
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded config rows */}
      {isExpanded &&
        group.configs.map((config) => (
          <TableRow
            key={config.id}
            className="bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
          >
            <TableCell className="w-10 pr-0" />
            <TableCell>
              <div className="flex items-center gap-6 pl-8">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-6 w-px bg-slate-300 shrink-0" />
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-6 gap-y-1 flex-1">
                    <div>
                      <p className="text-xs text-slate-500">Recommendations</p>
                      <p className="text-sm font-medium text-slate-700">
                        {config.minRecommendations} -{" "}
                        {config.maxRecommendations}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Min Match Rate</p>
                      <p className="text-sm font-medium text-slate-700">
                        {config.minMatchRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Min SoW</p>
                      <p className="text-sm font-medium text-slate-700">
                        {config.minSoW}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Updated</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(config.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEditConfig(config)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDuplicateConfig(config.id)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDeleteConfig(config.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
    </>
  )
}
