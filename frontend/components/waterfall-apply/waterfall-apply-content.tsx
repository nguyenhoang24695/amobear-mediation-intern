"use client"

import { useEffect, useMemo, useState } from "react"

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
import { WaterfallFilterCombobox } from "@/components/apps/waterfall-filter-combobox"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { Pagination } from "@/components/shared/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { hasScreenFunction } from "@/lib/auth"
import { structureApi, waterfallManagementApi, waterfallRecommendationSettingsApi } from "@/lib/api/services"
import { cn } from "@/lib/utils"
import type {
  App,
  WaterfallActivePolicyItemDto,
  WaterfallActivePolicyListResponseDto,
  WaterfallBulkPolicyPreviewResponseDto,
  WaterfallBulkPolicyTargetDto,
  WaterfallFilterOptionDto,
} from "@/types/api"
import { CalendarClock, ExternalLink, Layers, ListChecks, Loader2, RefreshCw, Search, Smartphone } from "lucide-react"

const SCREEN_WATERFALL_APPLY = "s-waterfall-apply"
const FN_VIEW = "view"
const FN_MANAGE = "manage"

type FilterType = "app" | "rule_group"
type ApplyMode = "manual" | "semi_auto" | "auto"

const APPLY_MODE_OPTIONS: Array<{ value: ApplyMode; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "semi_auto", label: "Semi auto" },
  { value: "auto", label: "Auto" },
]

const MODE_ORDER: ApplyMode[] = ["manual", "semi_auto", "auto"]

const DEFAULT_INTERVAL_DAYS = 7
const MIN_INTERVAL_DAYS = 1
const MAX_INTERVAL_DAYS = 30

function getAppLabel(app: App): string {
  return app.displayName?.trim() || app.name?.trim() || app.appId
}

function getApplyModeLabel(mode: string | null | undefined): string {
  switch ((mode ?? "").toLowerCase()) {
    case "semi_auto":
      return "Semi auto"
    case "auto":
      return "Auto"
    default:
      return "Manual"
  }
}

function getApplyModeBadgeClass(mode: string | null | undefined): string {
  switch ((mode ?? "").toLowerCase()) {
    case "semi_auto":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "auto":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "border-border bg-muted/40 text-muted-foreground"
  }
}

function getRuleSourceLabel(source: string | null | undefined): string {
  switch ((source ?? "").toLowerCase()) {
    case "explicit":
      return "Explicit"
    case "default":
      return "Default"
    default:
      return "-"
  }
}

function formatIntervalLabel(intervalDays: number): string {
  return `${intervalDays}-day${intervalDays === 1 ? "" : "s"}`
}

function parseIntervalDays(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < MIN_INTERVAL_DAYS || parsed > MAX_INTERVAL_DAYS) {
    return null
  }
  return parsed
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function buildAppOptions(apps: App[]): WaterfallFilterOptionDto[] {
  return apps
    .map((app) => ({
      value: app.appId,
      label: getAppLabel(app),
      secondaryLabel: app.appId,
      iconUri: app.iconUri ?? null,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))
}

function filterLocalOptions(options: WaterfallFilterOptionDto[], search: string): WaterfallFilterOptionDto[] {
  const keyword = search.trim().toLowerCase()
  if (!keyword) return options

  return options.filter((option) => {
    const haystack = `${option.label} ${option.secondaryLabel ?? ""} ${option.value}`.toLowerCase()
    return haystack.includes(keyword)
  })
}

function ActiveAutomationTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast()
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>()
  const [applyMode, setApplyMode] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [dueOnly, setDueOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [data, setData] = useState<WaterfallActivePolicyListResponseDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [pendingModeChange, setPendingModeChange] = useState<{ item: WaterfallActivePolicyItemDto; applyMode: ApplyMode } | null>(null)

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: true, cacheKey: "waterfall_apply_active_apps" },
  )

  const apps = useMemo(() => {
    return [...(appsResponse?.apps ?? [])].sort((left, right) =>
      getAppLabel(left).localeCompare(getAppLabel(right), undefined, { sensitivity: "base" }),
    )
  }, [appsResponse])
  const appOptions = useMemo(() => buildAppOptions(apps), [apps])

  const loadActivePolicies = async () => {
    setLoading(true)
    try {
      const response = await waterfallManagementApi.getActivePolicies({
        appId: selectedAppId,
        applyMode: applyMode === "all" ? undefined : applyMode,
        search: search.trim() || undefined,
        page,
        pageSize,
      })
      setData(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load active automation."
      toast({
        title: "Load failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadActivePolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppId, applyMode, search, page, pageSize])

  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const displayedItems = useMemo(() => {
    const items = data?.items ?? []
    return dueOnly ? items.filter((item) => item.isDue) : items
  }, [data, dueOnly])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handleConfirmModeChange = async () => {
    if (!pendingModeChange) return

    setUpdating(true)
    try {
      await waterfallManagementApi.updatePolicy(pendingModeChange.item.mediationGroupId, {
        applyMode: pendingModeChange.applyMode,
        intervalDays: pendingModeChange.applyMode === "manual" ? null : pendingModeChange.item.intervalDays,
      })
      toast({
        title: "Mode updated",
        description: `${pendingModeChange.item.mediationGroupName} was changed to ${getApplyModeLabel(pendingModeChange.applyMode)}.`,
      })
      setPendingModeChange(null)
      await loadActivePolicies()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update apply mode."
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">Active automation</CardTitle>
              <CardDescription>
                Mediation groups currently running in Auto or Semi auto, including groups that are not due yet.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => void loadActivePolicies()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_minmax(220px,0.75fr)_160px]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">App</label>
              <WaterfallFilterCombobox
                value={selectedAppId}
                placeholder="All apps"
                searchPlaceholder="Search app"
                emptyMessage="No app found"
                allLabel="All apps"
                cacheKeyBase="waterfall_apply_active_app_filter"
                scopeKey={`apps_${appOptions.length}`}
                loadOptions={async (keyword) => filterLocalOptions(appOptions, keyword)}
                onSelect={(option) => {
                  setSelectedAppId(option?.value)
                  setPage(1)
                }}
                disabled={appsLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Mode</label>
              <Select value={applyMode} onValueChange={handleFilterChange(setApplyMode)}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="All automation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All automation</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="semi_auto">Semi auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="App name, App Id, Mediation groups"
                  className="h-10 bg-background pl-9"
                />
              </div>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-muted-foreground">
              <Checkbox checked={dueOnly} onCheckedChange={(checked) => setDueOnly(checked === true)} />
              Due only
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Auto" value={data?.autoCount ?? 0} mode="auto" />
            <SummaryCard label="Semi auto" value={data?.semiAutoCount ?? 0} mode="semi_auto" />
            <Card className="gap-3 py-5">
              <CardContent className="flex items-center justify-between px-5">
                <div>
                  <p className="text-sm text-muted-foreground">Due now</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{data?.dueNowCount ?? 0}</p>
                </div>
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Active automation list</CardTitle>
            <CardDescription>{totalCount} mediation groups are running in Auto or Semi auto.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading active automation...
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No mediation groups match the current filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">App</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mediation group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interval</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next due GMT+7</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last observed apply</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apply source</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platform / format</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {displayedItems.map((item) => (
                      <ActivePolicyRow
                        key={item.mediationGroupId}
                        item={item}
                        canManage={canManage}
                        onModeChange={(nextMode) => {
                          if (item.applyMode !== nextMode) {
                            setPendingModeChange({ item, applyMode: nextMode })
                          }
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value)
                  setPage(1)
                }}
                itemName="mediation groups"
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingModeChange != null} onOpenChange={(open) => !open && setPendingModeChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm apply mode change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingModeChange
                ? `Change ${pendingModeChange.item.mediationGroupName} to ${getApplyModeLabel(pendingModeChange.applyMode)}. This only updates the policy and does not apply waterfall changes directly.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updating}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmModeChange()
              }}
            >
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SummaryCard({ label, value, mode }: { label: string; value: number; mode: ApplyMode }) {
  return (
    <Card className="gap-3 py-5">
      <CardContent className="flex items-center justify-between px-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <Badge variant="outline" className={cn("capitalize", getApplyModeBadgeClass(mode))}>
          {getApplyModeLabel(mode)}
        </Badge>
      </CardContent>
    </Card>
  )
}

function ActivePolicyRow({
  item,
  canManage,
  onModeChange,
}: {
  item: WaterfallActivePolicyItemDto
  canManage: boolean
  onModeChange: (applyMode: ApplyMode) => void
}) {
  return (
    <tr className="align-top hover:bg-muted/40">
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          {item.appIconUri ? (
            <img src={item.appIconUri} alt="" className="h-9 w-9 rounded-md border border-border object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
              <Smartphone className="h-4 w-4" />
            </div>
          )}
          <div className="space-y-1">
            <div className="font-medium text-foreground">{item.appName}</div>
            <div className="text-xs text-muted-foreground">{item.appId}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{item.mediationGroupName}</div>
          <div className="text-xs text-muted-foreground">{item.mediationGroupId}</div>
          <div className="text-xs text-muted-foreground">State: {item.state || "-"}</div>
          <div className="text-xs text-muted-foreground">Rule group: {item.effectiveRuleGroupName || "-"}</div>
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className={getApplyModeBadgeClass(item.applyMode)}>
          {getApplyModeLabel(item.applyMode)}
        </Badge>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{formatIntervalLabel(item.intervalDays)}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDateTime(item.dueAt)}</td>
      <td className="px-4 py-4">
        <Badge variant="outline" className={item.isDue ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted/40 text-muted-foreground"}>
          {item.isDue ? "Due now" : "On schedule"}
        </Badge>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDateTime(item.lastObservedApplyAt)}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{item.lastApplySource || "-"}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        <div>{item.platform || "-"}</div>
        <div className="text-xs text-muted-foreground">{item.adFormat || "-"}</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex min-w-48 flex-col gap-2">
          <Select
            value={item.applyMode}
            onValueChange={(value) => onModeChange(value as ApplyMode)}
            disabled={!canManage}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="Change mode" />
            </SelectTrigger>
            <SelectContent>
              {APPLY_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <a href={`/mediation/${encodeURIComponent(item.mediationGroupId)}?tab=waterfall-optimization`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open mediation
            </a>
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function WaterfallApplyContent() {
  const canView = hasScreenFunction(SCREEN_WATERFALL_APPLY, FN_VIEW)
  const canManage = hasScreenFunction(SCREEN_WATERFALL_APPLY, FN_MANAGE)

  if (!canView) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Waterfall Automation</h1>
        <p className="text-sm text-muted-foreground">
          Monitor active automation or configure apply mode in bulk.
        </p>
      </div>
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active automation</TabsTrigger>
          <TabsTrigger value="bulk">Bulk configure</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          <ActiveAutomationTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="bulk" className="space-y-4">
          <BulkConfigureTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BulkConfigureTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast()

  const [filterType, setFilterType] = useState<FilterType>("app")
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>()
  const [selectedRuleGroupId, setSelectedRuleGroupId] = useState<string>("")
  const [targetApplyMode, setTargetApplyMode] = useState<ApplyMode>("manual")
  const [intervalDays, setIntervalDays] = useState(String(DEFAULT_INTERVAL_DAYS))
  const [previewData, setPreviewData] = useState<WaterfallBulkPolicyPreviewResponseDto | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: true, cacheKey: "waterfall_apply_apps" },
  )
  const { data: ruleGroupsResponse, loading: ruleGroupsLoading } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRuleGroups(),
    { enabled: true, cacheKey: "waterfall_apply_rule_groups" },
  )

  const apps = useMemo(() => {
    return [...(appsResponse?.apps ?? [])].sort((left, right) =>
      getAppLabel(left).localeCompare(getAppLabel(right), undefined, { sensitivity: "base" }),
    )
  }, [appsResponse])

  const appOptions = useMemo(() => buildAppOptions(apps), [apps])

  const ruleGroups = useMemo(() => {
    return [...(ruleGroupsResponse ?? [])].sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    })
  }, [ruleGroupsResponse])

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const totalCount = previewData?.targets.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pagedTargets = useMemo(() => {
    const targets = previewData?.targets ?? []
    const startIndex = (page - 1) * pageSize
    return targets.slice(startIndex, startIndex + pageSize)
  }, [page, pageSize, previewData])

  const parsedIntervalDays = useMemo(() => parseIntervalDays(intervalDays), [intervalDays])
  const dueColumnLabel = targetApplyMode === "manual" ? "Current due" : "Due after update"

  const selectionSummary = useMemo(() => {
    const counters: Record<ApplyMode, number> = {
      manual: 0,
      semi_auto: 0,
      auto: 0,
    }

    for (const target of previewData?.targets ?? []) {
      const key = MODE_ORDER.includes(target.currentApplyMode as ApplyMode)
        ? (target.currentApplyMode as ApplyMode)
        : "manual"
      counters[key] += 1
    }

    return counters
  }, [previewData])

  const previewFilterLabel = useMemo(() => {
    if (!previewData) return null
    if (previewData.filterType === "app") {
      const matchedApp = apps.find((app) => app.appId === previewData.appId)
      return matchedApp ? getAppLabel(matchedApp) : (previewData.appId ?? "-")
    }

    const matchedRuleGroup = ruleGroups.find((group) => group.id === previewData.ruleGroupId)
    return matchedRuleGroup?.name ?? (previewData.ruleGroupId != null ? `Rule Group #${previewData.ruleGroupId}` : "-")
  }, [apps, previewData, ruleGroups])

  const resetPreview = () => {
    setPreviewData(null)
    setSelectedIds([])
    setPage(1)
  }

  const handleFilterTypeChange = (value: string) => {
    const nextFilterType: FilterType = value === "rule_group" ? "rule_group" : "app"
    setFilterType(nextFilterType)
    setSelectedAppId(undefined)
    setSelectedRuleGroupId("")
    resetPreview()
  }

  const handleAppSelect = (option: WaterfallFilterOptionDto | null) => {
    setSelectedAppId(option?.value)
    resetPreview()
  }

  const handleRuleGroupChange = (value: string) => {
    setSelectedRuleGroupId(value)
    resetPreview()
  }

  const handleTargetApplyModeChange = (value: string) => {
    setTargetApplyMode(value as ApplyMode)
    resetPreview()
  }

  const handleIntervalDaysChange = (value: string) => {
    setIntervalDays(value)
    resetPreview()
  }

  const buildPreviewParams = (validatedIntervalDays: number): { appId?: string; ruleGroupId?: number; targetApplyMode: ApplyMode; intervalDays: number } | null => {
    if (filterType === "app") {
      if (!selectedAppId) return null
      return {
        appId: selectedAppId,
        targetApplyMode,
        intervalDays: validatedIntervalDays,
      }
    }

    if (!selectedRuleGroupId) return null
    return {
      ruleGroupId: Number(selectedRuleGroupId),
      targetApplyMode,
      intervalDays: validatedIntervalDays,
    }
  }

  const loadPreview = async () => {
    const validatedIntervalDays = parsedIntervalDays
    if (validatedIntervalDays == null) {
      toast({
        title: "Invalid interval",
        description: `Interval must be a whole number between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS}.`,
        variant: "destructive",
      })
      return
    }

    const params = buildPreviewParams(validatedIntervalDays)
    if (!params) {
      toast({
        title: "Missing filter",
        description: filterType === "app" ? "Select an app before previewing." : "Select a rule group before previewing.",
        variant: "destructive",
      })
      return
    }

    setPreviewLoading(true)
    try {
      const response = await waterfallManagementApi.getBulkPolicyTargets(params)
      setPreviewData(response)
      setSelectedIds(response.targets.map((target) => target.mediationGroupId))
      setPage(1)

      if (response.targets.length === 0) {
        toast({
          title: "No mediation groups found",
          description: "The selected filter did not match any mediation groups.",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to preview mediation groups."
      toast({
        title: "Preview failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleToggleTarget = (mediationGroupId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        if (current.includes(mediationGroupId)) return current
        return [...current, mediationGroupId]
      }

      return current.filter((id) => id !== mediationGroupId)
    })
  }

  const handleToggleCurrentPage = (checked: boolean) => {
    const pageIds = pagedTargets.map((target) => target.mediationGroupId)
    if (checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...pageIds])))
      return
    }

    setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)))
  }

  const handleSelectAll = () => {
    setSelectedIds((previewData?.targets ?? []).map((target) => target.mediationGroupId))
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const isCurrentPageFullySelected = pagedTargets.length > 0 && pagedTargets.every((target) => selectedIdSet.has(target.mediationGroupId))
  const isCurrentPagePartiallySelected = !isCurrentPageFullySelected && pagedTargets.some((target) => selectedIdSet.has(target.mediationGroupId))

  const handleConfirmApply = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "No mediation groups selected",
        description: "Select at least one mediation group before applying.",
        variant: "destructive",
      })
      return
    }

    const validatedIntervalDays = parsedIntervalDays
    if (validatedIntervalDays == null) {
      toast({
        title: "Invalid interval",
        description: `Interval must be a whole number between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS}.`,
        variant: "destructive",
      })
      return
    }

    setApplyLoading(true)
    try {
      const response = await waterfallManagementApi.bulkUpdatePolicies({
        applyMode: targetApplyMode,
        intervalDays: validatedIntervalDays,
        mediationGroupIds: selectedIds,
      })

      setConfirmOpen(false)
      toast({
        title: "Policies updated",
        description: targetApplyMode === "manual"
          ? `Updated ${response.updatedCount} mediation groups to ${getApplyModeLabel(targetApplyMode)}${response.skippedCount > 0 ? `, skipped ${response.skippedCount}` : ""}.`
          : `Updated ${response.updatedCount} mediation groups to ${getApplyModeLabel(targetApplyMode)} with a ${formatIntervalLabel(validatedIntervalDays)} interval${response.skippedCount > 0 ? `, skipped ${response.skippedCount}` : ""}.`,
      })

      await loadPreview()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update waterfall apply policies."
      toast({
        title: "Apply failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setApplyLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Waterfall Automation</CardTitle>
              <CardDescription>
                Bulk update apply mode for mediation groups. This screen only changes policy mode and does not apply waterfall changes directly.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-primary">
              Settings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_200px_180px_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Filter type</label>
              <Select value={filterType} onValueChange={handleFilterTypeChange}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="rule_group">Rule Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {filterType === "app" ? "App" : "Rule Group"}
              </label>
              {filterType === "app" ? (
                <WaterfallFilterCombobox
                  value={selectedAppId}
                  placeholder="Select app"
                  searchPlaceholder="Search app"
                  emptyMessage="No app found"
                  allLabel="Clear app"
                  cacheKeyBase="waterfall_apply_app_filter"
                  scopeKey={`apps_${appOptions.length}`}
                  loadOptions={async (search) => filterLocalOptions(appOptions, search)}
                  onSelect={handleAppSelect}
                  disabled={appsLoading}
                />
              ) : (
                <Select value={selectedRuleGroupId || undefined} onValueChange={handleRuleGroupChange} disabled={ruleGroupsLoading}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Select rule group" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target apply mode</label>
              <Select value={targetApplyMode} onValueChange={handleTargetApplyModeChange}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Select apply mode" />
                </SelectTrigger>
                <SelectContent>
                  {APPLY_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Interval (days)</label>
              <Input
                type="number"
                min={MIN_INTERVAL_DAYS}
                max={MAX_INTERVAL_DAYS}
                step={1}
                value={intervalDays}
                onChange={(event) => handleIntervalDaysChange(event.target.value)}
                disabled={targetApplyMode === "manual"}
                className="h-10 bg-background disabled:bg-muted/40"
              />
              <p className="text-xs text-muted-foreground">
                {targetApplyMode === "manual"
                  ? "Manual mode keeps each mediation group's existing interval."
                  : `Valid range: ${MIN_INTERVAL_DAYS}-${MAX_INTERVAL_DAYS} days.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button className="min-w-36" onClick={loadPreview} disabled={previewLoading || (filterType === "app" ? !selectedAppId : !selectedRuleGroupId)}>
                {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Preview matches
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="gap-3 py-5">
              <CardContent className="flex items-center justify-between px-5">
                <div>
                  <p className="text-sm text-muted-foreground">Matched</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{totalCount}</p>
                </div>
                <Layers className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="gap-3 py-5">
              <CardContent className="flex items-center justify-between px-5">
                <div>
                  <p className="text-sm text-muted-foreground">Selected</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{selectedIds.length}</p>
                </div>
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            {MODE_ORDER.map((mode) => (
              <Card key={mode} className="gap-3 py-5">
                <CardContent className="flex items-center justify-between px-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{getApplyModeLabel(mode)}</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{selectionSummary[mode]}</p>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", getApplyModeBadgeClass(mode))}>
                    {getApplyModeLabel(mode)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Confirmation list</CardTitle>
              <CardDescription>
                {previewData
                  ? `Filter: ${previewData.filterType === "app" ? "App" : "Rule Group"}${previewFilterLabel ? ` - ${previewFilterLabel}` : ""}`
                  : "Run preview to load the mediation groups that will receive the new apply mode."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleSelectAll} disabled={!previewData || totalCount === 0}>
                Select all matched
              </Button>
              <Button variant="outline" onClick={handleClearSelection} disabled={selectedIds.length === 0}>
                Clear selection
              </Button>
              <Button onClick={() => setConfirmOpen(true)} disabled={!canManage || selectedIds.length === 0 || applyLoading}>
                {applyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply {getApplyModeLabel(targetApplyMode)}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {!previewData ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              Select a filter and click Preview matches to confirm the mediation groups before applying.
            </div>
          ) : totalCount === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-muted-foreground">
              No mediation groups matched the selected filter.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <Checkbox
                          checked={isCurrentPageFullySelected ? true : isCurrentPagePartiallySelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => handleToggleCurrentPage(checked === true)}
                          aria-label="Select current page"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mediation group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">App</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Effective rule group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rule source</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dueColumnLabel}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last observed apply</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platform / format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {pagedTargets.map((target) => (
                      <PreviewRow
                        key={target.mediationGroupId}
                        target={target}
                        targetApplyMode={targetApplyMode}
                        checked={selectedIdSet.has(target.mediationGroupId)}
                        onCheckedChange={(checked) => handleToggleTarget(target.mediationGroupId, checked)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value)
                  setPage(1)
                }}
                itemName="mediation groups"
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk apply mode update</AlertDialogTitle>
            <AlertDialogDescription>
              {targetApplyMode === "manual"
                ? `Update ${selectedIds.length} mediation groups to ${getApplyModeLabel(targetApplyMode)}. This only changes the stored apply mode policy.`
                : `Update ${selectedIds.length} mediation groups to ${getApplyModeLabel(targetApplyMode)} with a ${formatIntervalLabel(parsedIntervalDays ?? DEFAULT_INTERVAL_DAYS)} interval. This only changes the stored apply mode policy and does not apply waterfall directly.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={applyLoading}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmApply()
              }}
            >
              {applyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface PreviewRowProps {
  target: WaterfallBulkPolicyTargetDto
  targetApplyMode: ApplyMode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function PreviewRow({ target, targetApplyMode, checked, onCheckedChange }: PreviewRowProps) {
  const displayedDueAt = targetApplyMode === "manual"
    ? target.dueAt
    : (target.previewDueAt ?? target.dueAt)

  return (
    <tr className="align-top hover:bg-muted/40">
      <td className="px-4 py-4">
        <Checkbox
          checked={checked}
          onCheckedChange={(nextValue) => onCheckedChange(nextValue === true)}
          aria-label={`Select ${target.mediationGroupName}`}
        />
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{target.mediationGroupName}</div>
          <div className="text-xs text-muted-foreground">{target.mediationGroupId}</div>
          <div className="text-xs text-muted-foreground">State: {target.state || "-"}</div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          {target.appIconUri ? (
            <img src={target.appIconUri} alt="" className="h-9 w-9 rounded-md border border-border object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
              <Smartphone className="h-4 w-4" />
            </div>
          )}
          <div className="space-y-1">
            <div className="font-medium text-foreground">{target.appName}</div>
            <div className="text-xs text-muted-foreground">{target.appId}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {target.effectiveRuleGroupName || "No effective rule group"}
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
          {getRuleSourceLabel(target.ruleGroupSource)}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className={getApplyModeBadgeClass(target.currentApplyMode)}>
          {getApplyModeLabel(target.currentApplyMode)}
        </Badge>
        <div className="mt-1 text-xs text-muted-foreground">
          Current interval: {formatIntervalLabel(target.currentIntervalDays)}
        </div>
        {!target.hasPersistedPolicy ? (
          <div className="mt-1 text-xs text-muted-foreground">Virtual manual</div>
        ) : null}
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDateTime(displayedDueAt)}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDateTime(target.lastObservedApplyAt)}</td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        <div>{target.platform || "-"}</div>
        <div className="text-xs text-muted-foreground">{target.adFormat || "-"}</div>
      </td>
    </tr>
  )
}

