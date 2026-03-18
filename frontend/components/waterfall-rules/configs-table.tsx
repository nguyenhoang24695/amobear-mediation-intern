"use client"

import Link from "next/link"
import { Fragment, useMemo, useState, type DragEvent } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MoreHorizontal,
  Settings,
  Smartphone,
  Globe,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react"
import { Pagination } from "@/components/shared/pagination"
import type { AppConfig, AppConfigGroup } from "./waterfall-rules-content"

export interface AddAppToGroupPreset {
  minRecommendations: number
  maxRecommendations: number
  minMatchRate: number
  minSoW: number
  ruleGroupId: number | null
  configGroupName: string | null
}

interface ConfigsTableProps {
  groups: AppConfigGroup[]
  onEditConfig: (config: AppConfig) => void
  onEditConfigGroup: (configs: AppConfig[], preset: AddAppToGroupPreset) => void
  onRenameConfigGroup: (configs: AppConfig[], groupName: string | null) => void
  onMoveAppToGroup: (config: AppConfig, preset: AddAppToGroupPreset) => void
  onDeleteConfig: (id: string) => void
  onDeleteApp: (appId: string) => void
  onAddAppToGroup: (preset: AddAppToGroupPreset) => void
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
  configGroupName: string | null
  ruleGroupId: number | null
  ruleGroupName: string | null
  updatedAt: string
  apps: AppConfigGroup[]
}

function toClusterKey(config: AppConfig): string {
  return `${config.minRecommendations}|${config.maxRecommendations}|${config.minMatchRate}|${config.minSoW}|${config.ruleGroupId ?? "none"}`
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
  onEditConfigGroup,
  onRenameConfigGroup,
  onMoveAppToGroup,
  onDeleteConfig,
  onDeleteApp: _onDeleteApp,
  onAddAppToGroup,
  hasFilters,
  onClearFilters,
  onCreateNew,
  canManage = true,
}: ConfigsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [draggingConfig, setDraggingConfig] = useState<AppConfig | null>(null)
  const [dragTargetCluster, setDragTargetCluster] = useState<ConfigCluster | null>(null)
  const [pendingMove, setPendingMove] = useState<{ config: AppConfig; target: ConfigCluster } | null>(null)
  const [renameTargetCluster, setRenameTargetCluster] = useState<ConfigCluster | null>(null)
  const [renameGroupName, setRenameGroupName] = useState("")

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
          configGroupName: config.configGroupName ?? null,
          ruleGroupId: config.ruleGroupId ?? null,
          ruleGroupName: config.ruleGroupName ?? null,
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

  const getClusterRuleGroupLabel = (cluster: ConfigCluster): string => {
    if (cluster.isGlobalCluster) return "Global"
    return cluster.ruleGroupName || "Not set"
  }

  const getAddAppPreset = (cluster: ConfigCluster): AddAppToGroupPreset => {
    const ruleGroupIds = Array.from(
      new Set(
        cluster.apps
          .map((appGroup) => appGroup.configs[0]?.ruleGroupId ?? null)
      )
    )
    const ruleGroupId = ruleGroupIds.length === 1 ? (ruleGroupIds[0] ?? null) : null

    return {
      minRecommendations: cluster.minRecommendations,
      maxRecommendations: cluster.maxRecommendations,
      minMatchRate: cluster.minMatchRate,
      minSoW: cluster.minSoW,
      ruleGroupId,
      configGroupName: cluster.configGroupName,
    }
  }
  const handleRenameCluster = (cluster: ConfigCluster) => {
    setRenameTargetCluster(cluster)
    setRenameGroupName(cluster.configGroupName ?? "")
  }

  const handleConfirmRenameCluster = () => {
    if (!renameTargetCluster) return
    const normalized = renameGroupName.trim()
    onRenameConfigGroup(
      getClusterConfigs(renameTargetCluster),
      normalized.length > 0 ? normalized : null
    )
    setRenameTargetCluster(null)
    setRenameGroupName("")
  }


  const getClusterConfigs = (cluster: ConfigCluster): AppConfig[] => {
    return cluster.apps
      .map((appGroup) => appGroup.configs[0])
      .filter((config): config is AppConfig => !!config)
  }

  const isDropAllowed = (source: AppConfig, target: ConfigCluster) => {
    if (target.isGlobalCluster) return false
    return toClusterKey(source) !== target.key
  }

  const handleClusterDragOver = (e: DragEvent<HTMLElement>, cluster: ConfigCluster) => {
    if (!draggingConfig || !isDropAllowed(draggingConfig, cluster)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragTargetCluster(cluster)
  }

  const handleClusterDrop = (e: DragEvent<HTMLElement>, cluster: ConfigCluster) => {
    if (!draggingConfig || !isDropAllowed(draggingConfig, cluster)) return
    e.preventDefault()
    setPendingMove({ config: draggingConfig, target: cluster })
    setDragTargetCluster(null)
  }

  const createDragPreviewElement = (config: AppConfig) => {
    const el = document.createElement("div")
    el.style.position = "fixed"
    el.style.top = "-9999px"
    el.style.left = "-9999px"
    el.style.zIndex = "9999"
    el.style.pointerEvents = "none"
    el.style.background = "#ffffff"
    el.style.border = "1px solid #cbd5e1"
    el.style.borderRadius = "10px"
    el.style.padding = "8px 10px"
    el.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.14)"
    el.style.minWidth = "180px"
    el.style.maxWidth = "260px"
    el.style.fontFamily = "Inter, Segoe UI, Arial, sans-serif"

    const title = document.createElement("div")
    title.textContent = config.appName || config.appId
    title.style.fontSize = "13px"
    title.style.fontWeight = "600"
    title.style.color = "#0f172a"
    title.style.whiteSpace = "nowrap"
    title.style.overflow = "hidden"
    title.style.textOverflow = "ellipsis"

    const subtitle = document.createElement("div")
    subtitle.textContent = "Move to another Config Group"
    subtitle.style.fontSize = "11px"
    subtitle.style.color = "#64748b"
    subtitle.style.marginTop = "2px"

    el.appendChild(title)
    el.appendChild(subtitle)
    return el
  }

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
                  <TableHead className="w-48">Rule Group</TableHead>
                  <TableHead className="w-24">Apps</TableHead>
                  <TableHead className="w-40">Updated</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((cluster) => {
                  const isExpanded = !!expandedRows[cluster.key]
                  return (
                    <Fragment key={cluster.key}>
                      <TableRow
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onDragOver={(e) => handleClusterDragOver(e, cluster)}
                        onDragLeave={() => {
                          if (dragTargetCluster?.key === cluster.key) {
                            setDragTargetCluster(null)
                          }
                        }}
                        onDrop={(e) => handleClusterDrop(e, cluster)}
                        onClick={() => {
                          if (cluster.isGlobalCluster) return
                          setExpandedRows((prev) => ({ ...prev, [cluster.key]: !prev[cluster.key] }))
                        }}
                        style={dragTargetCluster?.key === cluster.key ? { backgroundColor: "#eef6ff" } : undefined}
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
                              {cluster.isGlobalCluster ? "Global Config" : (cluster.configGroupName || "Config Group")}
                            </span>
                            {!cluster.isGlobalCluster && canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRenameCluster(cluster)
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                            )}
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
                          <Badge variant="outline">
                            {getClusterRuleGroupLabel(cluster)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cluster.isGlobalCluster ? (
                            <Badge variant="outline">Global</Badge>
                          ) : (
                            <Badge variant="secondary">{cluster.apps.length}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(cluster.updatedAt)}</TableCell>
                        <TableCell>
                          {!cluster.isGlobalCluster && canManage && (
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
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => onAddAppToGroup(getAddAppPreset(cluster))}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add app to Group
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onEditConfigGroup(getClusterConfigs(cluster), getAddAppPreset(cluster))}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit Config
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>

                      {!cluster.isGlobalCluster && isExpanded && (
                        <TableRow className="bg-slate-50/40">
                          <TableCell colSpan={8}>
                            <div
                              className={`rounded-md p-2 transition-colors ${
                                dragTargetCluster?.key === cluster.key ? "bg-blue-50 ring-1 ring-blue-200" : ""
                              }`}
                              onDragOver={(e) => handleClusterDragOver(e, cluster)}
                              onDrop={(e) => handleClusterDrop(e, cluster)}
                              onDragLeave={() => {
                                if (dragTargetCluster?.key === cluster.key) {
                                  setDragTargetCluster(null)
                                }
                              }}
                            >
                              {dragTargetCluster?.key === cluster.key && draggingConfig && (
                                <div className="mb-2 rounded-md border border-dashed border-blue-300 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
                                  Drop here to move <span className="font-medium">{draggingConfig.appName || draggingConfig.appId}</span> into this group
                                </div>
                              )}
                              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 py-2">
                              {cluster.apps.map((appGroup) => {
                                const config = appGroup.configs[0]
                                if (!config) return null

                                return (
                                  <Card
                                    key={appGroup.appId}
                                    className={`border-slate-200 transition-all ${
                                      draggingConfig?.id === config.id
                                        ? "opacity-50 scale-[0.98] ring-1 ring-blue-200 cursor-grabbing"
                                        : canManage
                                          ? "cursor-grab"
                                          : ""
                                    }`}
                                    draggable={canManage}
                                    onDragStart={(e) => {
                                      if (!canManage) return
                                      e.dataTransfer.effectAllowed = "move"
                                      e.dataTransfer.setData("text/plain", config.id)
                                      const preview = createDragPreviewElement(config)
                                      document.body.appendChild(preview)
                                      e.dataTransfer.setDragImage(preview, 18, 18)
                                      requestAnimationFrame(() => {
                                        if (document.body.contains(preview)) {
                                          document.body.removeChild(preview)
                                        }
                                      })
                                      setDraggingConfig(config)
                                    }}
                                    onDragEnd={() => {
                                      setDraggingConfig(null)
                                      setDragTargetCluster(null)
                                    }}
                                  >
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
                                            {!appGroup.isGlobal && (
                                              <DropdownMenuItem asChild>
                                                <Link href={`/apps/${encodeURIComponent(appGroup.appId)}?tab=overview`}>
                                                  <ExternalLink className="w-4 h-4 mr-2" />
                                                  View Detail
                                                </Link>
                                              </DropdownMenuItem>
                                            )}
                                            {!appGroup.isGlobal && canManage && <DropdownMenuSeparator />}
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
                    {cluster.minRecommendations}-{cluster.maxRecommendations} | {cluster.minMatchRate}% | {cluster.minSoW}% | {getClusterRuleGroupLabel(cluster)}
                  </p>
                </div>
                {cluster.isGlobalCluster ? (
                  <Badge variant="outline">Global</Badge>
                ) : (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{cluster.apps.length} apps</Badge>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onAddAppToGroup(getAddAppPreset(cluster))}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add app to Group
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditConfigGroup(getClusterConfigs(cluster), getAddAppPreset(cluster))}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Config
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
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

      <AlertDialog
        open={!!pendingMove}
        onOpenChange={(open) => {
          if (!open) setPendingMove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move App To Config Group</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove
                ? `Apply target group settings to ${pendingMove.config.appName || pendingMove.config.appId}? This will overwrite its current config.`
                : "Apply target group settings to this app?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (pendingMove) {
                  onMoveAppToGroup(pendingMove.config, getAddAppPreset(pendingMove.target))
                }
                setPendingMove(null)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!renameTargetCluster}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTargetCluster(null)
            setRenameGroupName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Config Group Name</DialogTitle>
            <DialogDescription>
              Rename this config group for easier identification. The new name will be applied to all apps in this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={renameGroupName}
              placeholder="Enter group name (empty = Config Group)"
              onChange={(e) => setRenameGroupName(e.target.value)}
              maxLength={256}
            />
            <p className="text-xs text-slate-500">
              Confirm renaming for{" "}
              <span className="font-medium">
                {renameTargetCluster ? getClusterConfigs(renameTargetCluster).length : 0}
              </span>{" "}
              app(s) in this group.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setRenameTargetCluster(null)
                setRenameGroupName("")
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConfirmRenameCluster}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


