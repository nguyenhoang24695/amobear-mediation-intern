"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMyReportTeamAppGroups } from "@/components/my-reports/hooks/use-my-report-team-app-groups"
import type {
  MyReportAppSelectionMode,
  MyReportConfig,
} from "@/components/my-reports/hooks/use-my-report-config"
import {
  MY_REPORT_APP_SELECTION_MODES,
  appMatchesSearchQuery,
  inferTeamIdsFromSelectedApps,
  resolveMyReportAppPool,
} from "@/lib/reports/my-report-app-selection"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import type { App } from "@/types/api"

export type MyReportAppFilterEditorProps = {
  draft: MyReportConfig
  updateDraft: (patch: Partial<MyReportConfig>) => void
  availableApps: App[]
  appsLoading: boolean
  filterTeams: CommissionTeamOption[]
  onToggleAppSelection: (appId: string) => void
}

function formatAppPlatform(platform?: string | null): string | null {
  if (!platform?.trim()) return null
  const normalized = platform.trim().toUpperCase()
  if (normalized === "IOS" || normalized === "IPHONE") return "iOS"
  if (normalized === "ANDROID") return "Android"
  return platform.trim()
}

function AppCheckboxRow({
  app,
  checked,
  onToggle,
}: {
  app: App
  checked: boolean
  onToggle: () => void
}) {
  const appName = app.displayName?.trim() || app.name?.trim() || app.appId
  const storeId = app.appStoreId?.trim() || null
  const platformLabel = formatAppPlatform(app.platform)
  const initials = appName.slice(0, 2).toUpperCase()

  return (
    <label className="flex min-w-0 cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-2 hover:bg-gray-50">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1 shrink-0" />
      <Avatar className="h-9 w-9 shrink-0 rounded-lg">
        {app.iconUri?.trim() ? (
          <AvatarImage src={app.iconUri.trim()} alt={appName} className="rounded-lg object-cover" />
        ) : null}
        <AvatarFallback className="rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium leading-tight text-gray-900" title={appName}>
            {appName}
          </p>
          {platformLabel ? (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 text-[10px] font-normal text-gray-600"
            >
              {platformLabel}
            </Badge>
          ) : null}
        </div>
        <p
          className="mt-0.5 truncate font-mono text-[11px] leading-tight text-gray-500"
          title={app.appId}
        >
          App ID: {app.appId}
        </p>
        {storeId ? (
          <p
            className="truncate font-mono text-[11px] leading-tight text-gray-400"
            title={storeId}
          >
            Store ID: {storeId}
          </p>
        ) : null}
      </div>
    </label>
  )
}

function AppListBody({
  listLoading,
  emptyMessage,
  children,
}: {
  listLoading: boolean
  emptyMessage?: string
  children: ReactNode
}) {
  if (listLoading) {
    return <p className="px-1 py-4 text-sm text-gray-500">Loading apps…</p>
  }
  if (emptyMessage) {
    return <p className="px-1 py-4 text-sm text-gray-500">{emptyMessage}</p>
  }
  return <>{children}</>
}

export function MyReportAppFilterEditor({
  draft,
  updateDraft,
  availableApps,
  appsLoading,
  filterTeams,
  onToggleAppSelection,
}: MyReportAppFilterEditorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const mode = draft.appSelectionMode
  const byTeamEnabled = mode === "by_team"

  const { groups, unionApps, loading: teamAppsLoading, error: teamAppsError } =
    useMyReportTeamAppGroups(filterTeams, byTeamEnabled)

  const appPool = useMemo(
    () => resolveMyReportAppPool(mode, availableApps, unionApps),
    [mode, availableApps, unionApps],
  )

  const poolAppIds = useMemo(() => appPool.map((app) => app.appId), [appPool])

  const isAppChecked = (appId: string) =>
    draft.selectedAppIds.length === 0 || draft.selectedAppIds.includes(appId)

  const toggleApp = (appId: string) => {
    let nextSelected: string[]
    if (draft.selectedAppIds.length === 0) {
      nextSelected = poolAppIds.filter((id) => id !== appId)
    } else if (draft.selectedAppIds.includes(appId)) {
      nextSelected = draft.selectedAppIds.filter((id) => id !== appId)
    } else {
      nextSelected = [...draft.selectedAppIds, appId]
    }

    const patch: Partial<MyReportConfig> = { selectedAppIds: nextSelected }
    if (mode === "by_team" && nextSelected.length > 0) {
      const inferredTeams = inferTeamIdsFromSelectedApps(nextSelected, groups)
      if (inferredTeams.length > 0) patch.selectedCommissionTeamIds = inferredTeams
    }
    updateDraft(patch)
  }

  const selectAll = () => {
    updateDraft({ selectedAppIds: [] })
  }

  const handleModeChange = (nextMode: MyReportAppSelectionMode) => {
    if (nextMode === mode) return
    setSearchQuery("")
    updateDraft({
      appSelectionMode: nextMode,
      selectedAppIds: [],
    })
  }

  const listLoading = mode === "permission" ? appsLoading : teamAppsLoading

  const filteredPermittedApps = useMemo(
    () => availableApps.filter((app) => appMatchesSearchQuery(app, searchQuery)),
    [availableApps, searchQuery],
  )

  const filteredTeamGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          apps: group.apps.filter((app) => appMatchesSearchQuery(app, searchQuery)),
        }))
        .filter((group) => group.apps.length > 0),
    [groups, searchQuery],
  )

  const searchActive = searchQuery.trim().length > 0
  const noSearchResults =
    searchActive &&
    !listLoading &&
    (mode === "permission"
      ? availableApps.length > 0 && filteredPermittedApps.length === 0
      : groups.length > 0 && filteredTeamGroups.length === 0)

  return (
    <div className="flex max-h-[min(calc(80vh-2rem),520px)] w-full min-w-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <Label className="text-xs font-medium text-gray-500">Apps</Label>

        <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
          {MY_REPORT_APP_SELECTION_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                mode === option.value
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900",
              )}
              onClick={() => handleModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, App ID, Store ID"
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selectAll}>
            Select all
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {noSearchResults ? (
          <p className="px-1 py-4 text-sm text-gray-500">No apps match your search.</p>
        ) : mode === "permission" ? (
          <AppListBody
            listLoading={listLoading}
            emptyMessage={availableApps.length === 0 ? "No permitted apps available." : undefined}
          >
            {filteredPermittedApps.map((app) => (
              <AppCheckboxRow
                key={app.appId}
                app={app}
                checked={isAppChecked(app.appId)}
                onToggle={() => toggleApp(app.appId)}
              />
            ))}
          </AppListBody>
        ) : filterTeams.length === 0 ? (
          <AppListBody listLoading={false} emptyMessage="No teams in your scope." />
        ) : teamAppsError ? (
          <p className="px-1 py-4 text-sm text-red-600">{teamAppsError}</p>
        ) : (
          <AppListBody
            listLoading={listLoading}
            emptyMessage={groups.length === 0 ? "No apps linked to your teams." : undefined}
          >
            {filteredTeamGroups.map((group) => (
              <div key={group.teamId} className="pb-2">
                <p className="sticky top-0 z-[1] bg-white py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group.teamName}
                </p>
                <div className="space-y-0.5">
                  {group.apps.map((app) => (
                    <AppCheckboxRow
                      key={`${group.teamId}-${app.appId}`}
                      app={app}
                      checked={isAppChecked(app.appId)}
                      onToggle={() => toggleApp(app.appId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </AppListBody>
        )}
      </div>
    </div>
  )
}
