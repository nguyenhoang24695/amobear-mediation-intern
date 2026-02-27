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
  onDeleteApp: (appId: string) => void
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
}

type SortField = "appName"
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
  onDeleteApp,
  hasFilters,
  onClearFilters,
  onCreateNew,
}: ConfigsTableProps) {
  const [sortField, setSortField] = useState<SortField>("appName")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null)
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const arr = [...groups]
    arr.sort((a, b) => {
      const cmp = a.appName.localeCompare(b.appName)
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [groups, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
    }
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
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center text-xs font-medium uppercase tracking-wide hover:text-slate-900"
                      onClick={() => toggleSort()}
                    >
                      App
                      <SortIcon field="appName" />
                    </button>
                  </TableHead>
                  <TableHead className="w-40">Recommendations</TableHead>
                  <TableHead className="w-32">Min Match Rate</TableHead>
                  <TableHead className="w-28">Min SoW</TableHead>
                  <TableHead className="w-40">Updated</TableHead>
                  <TableHead className="w-16">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((group) => (
                  <AppRow
                    key={group.appId}
                    group={group}
                    onEditConfig={onEditConfig}
                    onDeleteConfig={(id) => setDeleteConfigId(id)}
                  />
                ))}
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
          const config = group.configs[0]
          if (!config) return null
          return (
            <Card key={group.appId} className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                      {group.isGlobal ? (
                        <Globe className="w-4 h-4 text-slate-500" />
                      ) : config.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={config.iconUrl}
                          alt={group.appName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Smartphone className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {group.isGlobal ? "Global" : group.appName}
                      </p>
                      {group.isGlobal ? (
                        <p className="text-xs text-slate-500">
                          Default config for all apps
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500">
                            {group.appId}
                          </p>
                          {config.platform && (
                            <p className="text-[11px] text-slate-400">
                              {config.platform}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
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
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onEditConfig(config)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
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

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Recommendations</p>
                    <p className="text-slate-700 font-medium">
                      {config.minRecommendations} - {config.maxRecommendations}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Min Match Rate</p>
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

      {/* Delete All Configs of an App Confirmation (legacy - not used in 1-config-per-app view) */}
    </>
  )
}

// --- App Row: 1 app = 1 row with config details ---
function AppRow({
  group,
  onEditConfig,
  onDeleteConfig,
}: {
  group: AppConfigGroup
  onEditConfig: (config: AppConfig) => void
  onDeleteConfig: (id: string) => void
}) {
  const config = group.configs[0]
  if (!config) return null

  return (
    <TableRow className="hover:bg-slate-50 transition-colors">
      {/* App */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
            {group.isGlobal ? (
              <Globe className="w-4 h-4 text-slate-500" />
            ) : config.iconUrl ? (
              // App logo
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.iconUrl}
                alt={group.appName}
                className="h-full w-full object-cover"
              />
            ) : (
              <Smartphone className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">
              {group.isGlobal ? "Global" : group.appName}
            </p>
            {group.isGlobal ? (
              <p className="text-xs text-slate-500">
                Default config for all apps
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  {group.appId}
                </p>
                {config.platform && (
                  <p className="text-[11px] text-slate-400">
                    {config.platform}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </TableCell>

      {/* Recommendations */}
      <TableCell>
        <p className="text-sm font-medium text-slate-700">
          {config.minRecommendations} - {config.maxRecommendations}
        </p>
      </TableCell>

      {/* Min Match Rate */}
      <TableCell>
        <p className="text-sm font-medium text-slate-700">
          {config.minMatchRate}%
        </p>
      </TableCell>

      {/* Min SoW */}
      <TableCell>
        <p className="text-sm font-medium text-slate-700">
          {config.minSoW}%
        </p>
      </TableCell>

      {/* Updated */}
      <TableCell>
        <p className="text-sm text-slate-500">
          {formatDate(config.updatedAt)}
        </p>
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEditConfig(config)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
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
    </TableRow>
  )
}


