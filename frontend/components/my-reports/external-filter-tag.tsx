"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GroupedTeamMultiSelect } from "@/components/reports/grouped-team-multi-select"
import { ReportDatePeriodPicker } from "@/components/reports/report-date-period-picker"
import {
  IAP_REVENUE_MODE_OPTIONS,
  REVENUE_SOURCE_OPTIONS,
} from "@/lib/reports/my-report-defaults"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import {
  MY_REPORT_CONFIG_KEY,
  MY_REPORT_EXTERNAL_EDITABLE_CONFIG_KEYS,
  MY_REPORT_PHASE2_CONFIG_KEYS,
  type MyReportConfigKey,
} from "@/lib/reports/my-report-data-config-catalog"
import type { MyReportAppliedFilterTag } from "@/lib/reports/my-report-config-tag-utils"
import type { CommissionTeamOption } from "@/lib/reports/commission-team-utils"
import type { OrgTeamGroup } from "@/lib/api/services"
import type { App } from "@/types/api"

export type ExternalFilterTagProps = {
  tag: MyReportAppliedFilterTag
  draft: MyReportConfig
  updateDraft: (patch: Partial<MyReportConfig>) => void
  availableApps: App[]
  appsLoading: boolean
  onToggleAppSelection: (appId: string) => void
  filterTeams: CommissionTeamOption[]
  filterTeamGroups: OrgTeamGroup[]
  loadingFilterTeams: boolean
}

function FilterTagButton({
  label,
  value,
  showChevron = true,
}: {
  label?: string
  value: string
  showChevron?: boolean
}) {
  return (
    <span className="inline-flex h-8 max-w-[280px] cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm hover:border-gray-300">
      {label ? <span className="text-gray-600">{label}</span> : null}
      <span className="truncate font-medium text-blue-600">{value}</span>
      {showChevron ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : null}
    </span>
  )
}

function Phase2FilterTag({ label, value }: { label: string; value: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed opacity-50">
          <FilterTagButton label={label} value={value} showChevron />
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming in Phase 2</TooltipContent>
    </Tooltip>
  )
}

function DatePeriodFilterTag({
  tag,
  draft,
  updateDraft,
}: {
  tag: { label: string; value: string }
  draft: MyReportConfig
  updateDraft: (patch: Partial<MyReportConfig>) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          <FilterTagButton label={tag.label} value={tag.value} showChevron />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
        {open ? (
          <ReportDatePeriodPicker
            config={draft}
            onApply={(patch) => {
              updateDraft(patch)
              setOpen(false)
            }}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function AppFilterEditor({
  draft,
  updateDraft,
  availableApps,
  appsLoading,
  onToggleAppSelection,
}: Pick<
  ExternalFilterTagProps,
  "draft" | "updateDraft" | "availableApps" | "appsLoading" | "onToggleAppSelection"
>) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-500">Apps</Label>
      <ScrollArea className="max-h-64">
        <div className="pr-2">
          {appsLoading ? (
            <p className="py-4 text-sm text-gray-500">Loading apps…</p>
          ) : (
            availableApps.map((app) => (
              <label
                key={app.appId}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-2 hover:bg-gray-50"
              >
                <Checkbox
                  checked={
                    draft.selectedAppIds.length === 0 ||
                    draft.selectedAppIds.includes(app.appId)
                  }
                  onCheckedChange={() => {
                    if (draft.selectedAppIds.length === 0) {
                      updateDraft({
                        selectedAppIds: availableApps
                          .map((a) => a.appId)
                          .filter((id) => id !== app.appId),
                      })
                    } else {
                      onToggleAppSelection(app.appId)
                    }
                  }}
                />
                <span className="truncate text-sm">{app.displayName ?? app.appId}</span>
              </label>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function renderFilterEditor(
  configKey: MyReportConfigKey,
  props: ExternalFilterTagProps,
) {
  const { draft, updateDraft, filterTeams, filterTeamGroups, loadingFilterTeams } = props

  switch (configKey) {
    case MY_REPORT_CONFIG_KEY.app:
      return <AppFilterEditor {...props} />
    case MY_REPORT_CONFIG_KEY.teams:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Teams</Label>
          <GroupedTeamMultiSelect
            teams={filterTeams}
            teamGroups={filterTeamGroups}
            selectedTeamIds={draft.selectedCommissionTeamIds}
            onSelectedTeamIdsChange={(ids) => updateDraft({ selectedCommissionTeamIds: ids })}
            disabled={loadingFilterTeams}
            placeholder="Teams in your scope"
            searchPlaceholder="Search teams..."
            emptySearchMessage="No teams found."
            emptyTeamsMessage="No teams under you or as team lead"
            triggerClassName="h-9 w-full max-w-none"
            popoverClassName="w-[320px] p-0"
          />
        </div>
      )
    case MY_REPORT_CONFIG_KEY.iapRevenueMode:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">IAP revenue mode</Label>
          <Select
            value={String(draft.iapRevenueMode)}
            onValueChange={(v) => updateDraft({ iapRevenueMode: Number(v) })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IAP_REVENUE_MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case MY_REPORT_CONFIG_KEY.revenueSource:
      return (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Revenue source</Label>
          <Select
            value={draft.revenueSource}
            onValueChange={(v) => updateDraft({ revenueSource: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_SOURCE_OPTIONS.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    default:
      return null
  }
}

export function ExternalFilterTag(props: ExternalFilterTagProps) {
  const { tag, draft, updateDraft } = props

  if (MY_REPORT_PHASE2_CONFIG_KEYS.has(tag.key)) {
    return <Phase2FilterTag label={tag.label} value={tag.value} />
  }

  if (tag.key === MY_REPORT_CONFIG_KEY.datePeriod) {
    return <DatePeriodFilterTag tag={tag} draft={draft} updateDraft={updateDraft} />
  }

  if (!MY_REPORT_EXTERNAL_EDITABLE_CONFIG_KEYS.has(tag.key)) {
    return <FilterTagButton label={tag.label} value={tag.value} showChevron={false} />
  }

  const editor = renderFilterEditor(tag.key, props)
  if (!editor) {
    return <FilterTagButton label={tag.label} value={tag.value} showChevron={false} />
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          <FilterTagButton label={tag.label} value={tag.value} showChevron />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        {editor}
      </PopoverContent>
    </Popover>
  )
}
