"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TikTokAdAccountDto, TikTokAppMappingDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"
import { SectionShell } from "./section-shell"
import type { TikTokRequestFormState } from "./types"
import { optionLabel } from "./types"

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  selectedAdAccount?: TikTokAdAccountDto | null
  selectedAppMapping?: TikTokAppMappingDto | null
  onChange: (patch: Partial<TikTokRequestFormState>) => void
}

function numberOrUndefined(value: string) {
  return value === "" ? undefined : Number(value)
}

export function AdGroupBudgetSection({ form, reference, selectedAdAccount, selectedAppMapping, onChange }: Props) {
  const isInfiniteBudget = form.adGroup.budgetMode === "BUDGET_MODE_INFINITE"
  const ready = Boolean(
    form.adGroup.budgetMode &&
    (isInfiniteBudget || Number(form.adGroup.budget ?? 0) > 0) &&
    form.adGroup.optimizationGoal &&
    form.adGroup.bidType &&
    form.adGroup.billingEvent &&
    form.adGroup.scheduleType,
  )

  return (
    <SectionShell
      eyebrow="Ad Group - Optimization, Budget & Schedule"
      title="Optimization & Schedule"
      description="Review app optimization, bidding strategy, budget, and schedule."
      ready={ready}
    >
      <div className="space-y-5">
        <div className="rounded-md border bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Optimization and app</h3>
              <p className="text-xs text-slate-500">TikTok will optimize delivery for the selected app promotion objective.</p>
            </div>
            <Badge variant="outline">{selectedAppMapping?.appPlatform ?? "APP"}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>App</Label>
              <div className="rounded-md border bg-white px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">{selectedAppMapping?.appDisplayName || selectedAppMapping?.appId || "Select app mapping"}</p>
                <p className="truncate font-mono text-xs text-slate-500">{selectedAppMapping?.tikTokAppId || "-"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Optimization goal</Label>
              <Select value={form.adGroup.optimizationGoal} onValueChange={(value) => onChange({ adGroup: { ...form.adGroup, optimizationGoal: value } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reference.optimizationGoals.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing event</Label>
              <Select value={form.adGroup.billingEvent} onValueChange={(value) => onChange({ adGroup: { ...form.adGroup, billingEvent: value } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reference.billingEvents.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bid type</Label>
              <Select value={form.adGroup.bidType} onValueChange={(value) => onChange({ adGroup: { ...form.adGroup, bidType: value, bid: value === "BID_TYPE_NO_BID" ? undefined : form.adGroup.bid } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reference.bidTypes.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bid</Label>
              <Input
                min={0}
                step="0.01"
                type="number"
                disabled={form.adGroup.bidType === "BID_TYPE_NO_BID"}
                value={form.adGroup.bid ?? ""}
                onChange={(event) => onChange({ adGroup: { ...form.adGroup, bid: numberOrUndefined(event.target.value) } })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-white p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Budget and schedule</h3>
            <p className="text-xs text-slate-500">Timezone: {selectedAdAccount?.timezone ?? "account timezone"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ad group budget mode</Label>
              <Select value={form.adGroup.budgetMode} onValueChange={(value) => onChange({ adGroup: { ...form.adGroup, budgetMode: value, budget: value === "BUDGET_MODE_INFINITE" ? 0 : form.adGroup.budget } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reference.budgetModes.map((option) => (
                    <SelectItem key={option.key} value={option.key}>{optionLabel(option)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ad group budget</Label>
              <Input min={isInfiniteBudget ? 0 : 50} step="0.01" type="number" disabled={isInfiniteBudget} value={form.adGroup.budget ?? ""} onChange={(event) => onChange({ adGroup: { ...form.adGroup, budget: numberOrUndefined(event.target.value) } })} />
              <p className="text-xs text-slate-500">{isInfiniteBudget ? "Ad group uses campaign-level budget; ad group budget remains 0." : "TikTok requires a minimum budget of $50."}</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Schedule</Label>
              <RadioGroup
                value={form.adGroup.scheduleType}
                onValueChange={(value) => onChange({ adGroup: { ...form.adGroup, scheduleType: value, endTime: value === "SCHEDULE_FROM_NOW" ? undefined : form.adGroup.endTime } })}
              >
                <label className="flex items-start gap-3 rounded-md border bg-slate-50 px-3 py-3">
                  <RadioGroupItem className="mt-0.5" value="SCHEDULE_FROM_NOW" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Set start time and run continuously</span>
                    <span className="block text-xs text-slate-500">The ad group keeps running until it is paused or budget is exhausted.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-md border bg-slate-50 px-3 py-3">
                  <RadioGroupItem className="mt-0.5" value="SCHEDULE_START_END" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Set start and end time</span>
                    <span className="block text-xs text-slate-500">Use this when the campaign has a fixed flight window.</span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="datetime-local" value={form.adGroup.startTime ?? ""} onChange={(event) => onChange({ adGroup: { ...form.adGroup, startTime: event.target.value } })} />
            </div>
            <div className={form.adGroup.scheduleType === "SCHEDULE_START_END" ? "space-y-2" : "pointer-events-none space-y-2 opacity-50"}>
              <Label>End time</Label>
              <Input type="datetime-local" value={form.adGroup.endTime ?? ""} onChange={(event) => onChange({ adGroup: { ...form.adGroup, endTime: event.target.value } })} />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

