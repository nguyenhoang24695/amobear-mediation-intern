"use client"

import { Fragment, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronDown,
  ChevronRight,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"
import type { WaterfallConfigItem } from "./waterfall-config-types"

interface ConfigsTableProps {
  configs: WaterfallConfigItem[]
  onEditConfig: (config: WaterfallConfigItem) => void
  onDeleteConfig: (config: WaterfallConfigItem) => void
  hasFilters: boolean
  onClearFilters: () => void
  onCreateNew: () => void
  canManage?: boolean
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatThresholds(config: WaterfallConfigItem) {
  return `${config.minRecommendations}-${config.maxRecommendations} recs | MR ${Number(config.minMatchRatePercent).toFixed(2)}% | SoW ${Number(config.minSowPercent).toFixed(2)}%`
}

export function ConfigsTable({
  configs,
  onEditConfig,
  onDeleteConfig,
  hasFilters,
  onClearFilters,
  onCreateNew,
  canManage = true,
}: ConfigsTableProps) {
  const [expandedConfigIds, setExpandedConfigIds] = useState<number[]>([])
  const [deleteTarget, setDeleteTarget] = useState<WaterfallConfigItem | null>(null)

  const sortedConfigs = useMemo(() => {
    return [...configs].sort((left, right) => {
      if (left.isGlobalDefault && !right.isGlobalDefault) return -1
      if (!left.isGlobalDefault && right.isGlobalDefault) return 1
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    })
  }, [configs])

  const toggleExpanded = (configId: number) => {
    setExpandedConfigIds((current) =>
      current.includes(configId)
        ? current.filter((id) => id !== configId)
        : [...current, configId]
    )
  }

  const isExpanded = (configId: number) => expandedConfigIds.includes(configId)

  if (sortedConfigs.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="rounded-full border bg-muted/25 p-4">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">No configs found</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {hasFilters
                ? "No rule config matches the current filters."
                : "Create a standalone rule config, then assign apps when needed."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hasFilters && (
              <Button variant="outline" className="bg-transparent" onClick={onClearFilters}>
                Clear Filters
              </Button>
            )}
            {canManage && (
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create Config
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Config</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Thresholds</TableHead>
                  <TableHead>Rule Group</TableHead>
                  <TableHead className="w-[240px]">Apps Using Config</TableHead>
                  <TableHead>Updated</TableHead>
                  {canManage && <TableHead className="w-[64px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedConfigs.map((config) => {
                  const expanded = isExpanded(config.id)
                  const hasApps = config.displayApps.length > 0

                  return (
                    <Fragment key={config.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-0.5 h-7 w-7 shrink-0"
                              onClick={() => toggleExpanded(config.id)}
                              disabled={!hasApps}
                            >
                              {hasApps ? (
                                expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                              ) : (
                                <span className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{config.configName}</span>
                                {config.isGlobalDefault && (
                                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                    <Globe className="mr-1 h-3 w-3" />
                                    Global Default
                                  </Badge>
                                )}
                                {!config.isActive && (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    Inactive
                                  </Badge>
                                )}
                                {!config.isGlobalDefault && config.appCount === 0 && (
                                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-800 dark:text-amber-300">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              {config.notes && (
                                <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{config.notes}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {config.isGlobalDefault ? (
                            <span className="text-sm text-muted-foreground">Fallback for unassigned apps</span>
                          ) : config.appCount > 0 ? (
                            <span className="text-sm text-muted-foreground">Direct assignment</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No apps assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatThresholds(config)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{config.ruleGroupName || "Default rule group"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-foreground">{config.displayAppCount} app{config.displayAppCount === 1 ? "" : "s"}</span>
                            {hasApps && (
                              <div className="flex flex-wrap gap-1">
                                {config.displayApps.slice(0, 3).map((app) => (
                                  <Badge key={app.appId} variant="secondary" className="gap-1.5 bg-muted text-muted-foreground">
                                    <Avatar className="h-4 w-4 rounded-sm">
                                      <AvatarImage src={app.iconUrl || "/placeholder.svg"} alt={app.appName} className="rounded-sm object-cover" />
                                      <AvatarFallback className="rounded-sm bg-muted text-[9px] font-medium text-muted-foreground">
                                        {app.appName.slice(0, 1).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="max-w-[110px] truncate">{app.appName}</span>
                                  </Badge>
                                ))}
                                {config.displayApps.length > 3 && (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    +{config.displayApps.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{formatDate(config.updatedAt)}</span>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditConfig(config)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Config
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(config)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Config
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded && hasApps && (
                        <TableRow key={`${config.id}-apps`}>
                          <TableCell colSpan={canManage ? 7 : 6} className="bg-muted/40">
                            <div className="space-y-3 py-2">
                              <div className="text-sm font-medium text-muted-foreground">{config.isGlobalDefault ? "Apps using this config as fallback" : "Assigned apps"}</div>
                              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {config.displayApps.map((app) => (
                                  <div
                                    key={app.appId}
                                    className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2">
                                    <Avatar className="h-9 w-9 shrink-0 rounded-lg">
                                      <AvatarImage src={app.iconUrl || "/placeholder.svg"} alt={app.appName} className="rounded-lg object-cover" />
                                      <AvatarFallback className="rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                                        {app.appName.slice(0, 1).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-foreground">{app.appName}</div>
                                      <div className="mt-1 text-xs text-muted-foreground">{app.appId}</div>
                                    </div>
                                  </div>
                                ))}
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
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule config</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.configName}</span> and remove all of its explicit app assignments. Apps without another config will fall back to the global default or appsettings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteConfig(deleteTarget)
                  setDeleteTarget(null)
                }
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





