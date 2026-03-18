"use client"

import { Fragment, useMemo, useState } from "react"
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
  Trash2,
  Search,
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
  canManage?: boolean
}

interface ConfigCluster {
  key: string
  isGlobalCluster: boolean
  minRecommendations: number
  maxRecommendations: number
  minMatchRate: number
  minSoW: number
  updatedAt: string
  apps: AppConfigGroup[]
}

function toClusterKey(config: AppConfig): string {
  return `${config.minRecommendations}|${config.maxRecommendations}|${config.minMatchRate}|${config.minSoW}`
}

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
  onDeleteApp: _onDeleteApp,
  hasFilters,
  onClearFilters,
  onCreateNew,
  canManage = true,
}: ConfigsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const clustered = useMemo<ConfigCluster[]>(() => {
    const map = new Map<string, ConfigCluster>()

    for (const appGroup of groups) {
      const config = appGroup.configs[0]
      if (!config) continue
      const key = appGroup.isGlobal ? `__global__${config.id}` : toClusterKey(config)

      if (!map.has(key)) {
        map.set(key, {
          key,
          isGlobalCluster: appGroup.isGlobal,
          minRecommendations: config.minRecommendations,
          maxRecommendations: config.maxRecommendations,
          minMatchRate: config.minMatchRate,
          minSoW: config.minSoW,
          updatedAt: config.updatedAt,
          apps: [],
        })
      }

      const cluster = map.get(key)!
      cluster.apps.push(appGroup)
      if (new Date(config.updatedAt).getTime() > new Date(cluster.updatedAt).getTime()) {
        cluster.updatedAt = config.updatedAt
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isGlobalCluster && !b.isGlobalCluster) return -1
      if (!a.isGlobalCluster && b.isGlobalCluster) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [groups])

  const totalPages = Math.max(1, Math.ceil(clustered.length / pageSize))
  const paginated = clustered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (groups.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          {hasFilters ? (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No apps found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button variant="link" className="text-blue-600" onClick={onClearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No configurations yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first configuration to get started</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onCreateNew}>
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
      <Card className="border-slate-200 hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Config</TableHead>
                  <TableHead className="w-40">Recommendations</TableHead>
                  <TableHead className="w-32">Min Match Rate</TableHead>
                  <TableHead className="w-28">Min SoW</TableHead>
                  <TableHead className="w-24">Apps</TableHead>
                  <TableHead className="w-40">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((cluster) => {
                  const isExpanded = !!expandedRows[cluster.key]
                  return (
                    <Fragment key={cluster.key}>
                      <TableRow
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (cluster.isGlobalCluster) return
                          setExpandedRows((prev) => ({ ...prev, [cluster.key]: !prev[cluster.key] }))
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {cluster.isGlobalCluster ? (
                              <Globe className="w-4 h-4 text-slate-500" />
                            ) : isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                            <span className="text-sm font-medium text-slate-800">
                              {cluster.isGlobalCluster ? "Global Config" : "Config Group"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {cluster.minRecommendations} - {cluster.maxRecommendations}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {cluster.minMatchRate}%
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {cluster.minSoW}%
                        </TableCell>
                        <TableCell>
                          {cluster.isGlobalCluster ? (
                            <Badge variant="outline">Global</Badge>
                          ) : (
                            <Badge variant="secondary">{cluster.apps.length}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(cluster.updatedAt)}</TableCell>
                      </TableRow>

                      {!cluster.isGlobalCluster && isExpanded && (
                        <TableRow className="bg-slate-50/40">
                          <TableCell colSpan={6}>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 py-2">
                              {cluster.apps.map((appGroup) => {
                                const config = appGroup.configs[0]
                                if (!config) return null

                                return (
                                  <Card key={appGroup.appId} className="border-slate-200">
                                    <CardContent className="p-4 space-y-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                                            {appGroup.isGlobal ? (
                                              <Globe className="w-4 h-4 text-slate-500" />
                                            ) : config.iconUrl ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={config.iconUrl}
                                                alt={appGroup.appName}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              <Smartphone className="w-4 h-4 text-blue-600" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-slate-900 truncate">
                                              {appGroup.isGlobal ? "Global" : appGroup.appName}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                              {appGroup.isGlobal
                                                ? "Default config for all apps"
                                                : appGroup.appId}
                                            </p>
                                          </div>
                                        </div>

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-40">
                                            {canManage && (
                                              <DropdownMenuItem onClick={() => onEditConfig(config)}>
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Edit
                                              </DropdownMenuItem>
                                            )}
                                            {canManage && <DropdownMenuSeparator />}
                                            {canManage && (
                                              <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => setDeleteConfigId(config.id)}
                                              >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

                                      <p className="text-xs text-slate-500">Updated {formatDate(config.updatedAt)}</p>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {clustered.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={clustered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              itemName="config groups"
            />
          )}
        </CardContent>
      </Card>

      <div className="md:hidden space-y-3">
        {paginated.map((cluster) => (
          <Card key={cluster.key} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {cluster.isGlobalCluster ? "Global Config" : "Config Group"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cluster.minRecommendations}-{cluster.maxRecommendations} | {cluster.minMatchRate}% | {cluster.minSoW}%
                  </p>
                </div>
                {cluster.isGlobalCluster ? (
                  <Badge variant="outline">Global</Badge>
                ) : (
                  <Badge variant="secondary">{cluster.apps.length} apps</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              Are you sure you want to delete this configuration? This action cannot be undone.
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
    </>
  )
}


