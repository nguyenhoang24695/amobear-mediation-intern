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
import { Checkbox } from "@/components/ui/checkbox"
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
  WaterfallBulkPolicyPreviewResponseDto,
  WaterfallBulkPolicyTargetDto,
  WaterfallFilterOptionDto,
} from "@/types/api"
import { Layers, ListChecks, Loader2, RefreshCw, Smartphone } from "lucide-react"

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
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "auto":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    default:
      return "border-slate-200 bg-slate-50 text-slate-700"
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

export function WaterfallApplyContent() {
  const canView = hasScreenFunction(SCREEN_WATERFALL_APPLY, FN_VIEW)
  const canManage = hasScreenFunction(SCREEN_WATERFALL_APPLY, FN_MANAGE)
  const { toast } = useToast()

  const [filterType, setFilterType] = useState<FilterType>("app")
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>()
  const [selectedRuleGroupId, setSelectedRuleGroupId] = useState<string>("")
  const [targetApplyMode, setTargetApplyMode] = useState<ApplyMode>("manual")
  const [previewData, setPreviewData] = useState<WaterfallBulkPolicyPreviewResponseDto | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: appsResponse, loading: appsLoading } = useApi(
    () => structureApi.getApps(),
    { enabled: canView, cacheKey: "waterfall_apply_apps" },
  )
  const { data: ruleGroupsResponse, loading: ruleGroupsLoading } = useApi(
    () => waterfallRecommendationSettingsApi.getAllRuleGroups(),
    { enabled: canView, cacheKey: "waterfall_apply_rule_groups" },
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

  if (!canView) {
    return <NoPermissionView />
  }

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

  const buildPreviewParams = (): { appId?: string; ruleGroupId?: number } | null => {
    if (filterType === "app") {
      if (!selectedAppId) return null
      return { appId: selectedAppId }
    }

    if (!selectedRuleGroupId) return null
    return { ruleGroupId: Number(selectedRuleGroupId) }
  }

  const loadPreview = async () => {
    const params = buildPreviewParams()
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

    setApplyLoading(true)
    try {
      const response = await waterfallManagementApi.bulkUpdatePolicies({
        applyMode: targetApplyMode,
        mediationGroupIds: selectedIds,
      })

      setConfirmOpen(false)
      toast({
        title: "Policies updated",
        description: `Updated ${response.updatedCount} mediation groups${response.skippedCount > 0 ? `, skipped ${response.skippedCount}` : ""}.`,
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
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Waterfall Apply</CardTitle>
              <CardDescription>
                Bulk update apply mode for mediation groups. This screen only changes policy mode and does not apply waterfall changes directly.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-blue-200 bg-blue-50 text-blue-700">
              Settings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_200px_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Filter type</label>
              <Select value={filterType} onValueChange={handleFilterTypeChange}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="rule_group">Rule Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
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
                  <SelectTrigger className="h-10 bg-white">
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
              <label className="text-sm font-medium text-slate-700">Target apply mode</label>
              <Select value={targetApplyMode} onValueChange={(value) => setTargetApplyMode(value as ApplyMode)}>
                <SelectTrigger className="h-10 bg-white">
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

            <div className="flex items-end gap-2">
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
                  <p className="text-sm text-slate-500">Matched</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCount}</p>
                </div>
                <Layers className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            <Card className="gap-3 py-5">
              <CardContent className="flex items-center justify-between px-5">
                <div>
                  <p className="text-sm text-slate-500">Selected</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{selectedIds.length}</p>
                </div>
                <ListChecks className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
            {MODE_ORDER.map((mode) => (
              <Card key={mode} className="gap-3 py-5">
                <CardContent className="flex items-center justify-between px-5">
                  <div>
                    <p className="text-sm text-slate-500">{getApplyModeLabel(mode)}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{selectionSummary[mode]}</p>
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
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              Select a filter and click Preview matches to confirm the mediation groups before applying.
            </div>
          ) : totalCount === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              No mediation groups matched the selected filter.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <Checkbox
                          checked={isCurrentPageFullySelected ? true : isCurrentPagePartiallySelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => handleToggleCurrentPage(checked === true)}
                          aria-label="Select current page"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mediation group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">App</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Effective rule group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rule source</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current mode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last observed apply</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Platform / format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {pagedTargets.map((target) => (
                      <PreviewRow
                        key={target.mediationGroupId}
                        target={target}
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
              Update {selectedIds.length} mediation groups to {getApplyModeLabel(targetApplyMode)}. This only changes the stored apply mode policy.
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
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function PreviewRow({ target, checked, onCheckedChange }: PreviewRowProps) {
  return (
    <tr className="align-top hover:bg-slate-50/60">
      <td className="px-4 py-4">
        <Checkbox
          checked={checked}
          onCheckedChange={(nextValue) => onCheckedChange(nextValue === true)}
          aria-label={`Select ${target.mediationGroupName}`}
        />
      </td>
      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="font-medium text-slate-900">{target.mediationGroupName}</div>
          <div className="text-xs text-slate-500">{target.mediationGroupId}</div>
          <div className="text-xs text-slate-500">State: {target.state || "-"}</div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          {target.appIconUri ? (
            <img src={target.appIconUri} alt="" className="h-9 w-9 rounded-md border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
              <Smartphone className="h-4 w-4" />
            </div>
          )}
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{target.appName}</div>
            <div className="text-xs text-slate-500">{target.appId}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">
        {target.effectiveRuleGroupName || "No effective rule group"}
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
          {getRuleSourceLabel(target.ruleGroupSource)}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <Badge variant="outline" className={getApplyModeBadgeClass(target.currentApplyMode)}>
          {getApplyModeLabel(target.currentApplyMode)}
        </Badge>
        {!target.hasPersistedPolicy ? (
          <div className="mt-1 text-xs text-slate-500">Virtual manual</div>
        ) : null}
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">{formatDateTime(target.dueAt)}</td>
      <td className="px-4 py-4 text-sm text-slate-700">{formatDateTime(target.lastObservedApplyAt)}</td>
      <td className="px-4 py-4 text-sm text-slate-700">
        <div>{target.platform || "-"}</div>
        <div className="text-xs text-slate-500">{target.adFormat || "-"}</div>
      </td>
    </tr>
  )
}
