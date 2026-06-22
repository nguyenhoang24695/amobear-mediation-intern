"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { metaReferenceApi } from "@/lib/api/meta-ads"
import { AlertTriangle, CalendarClock, Info, Loader2, Plus } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import type { MetaAdSetDraftValidationDto, MetaPerformanceGoalOptionDto, MetaPerformanceGoalReferenceDto, MetaPerformanceGoalTypeOptionDto } from "@/types/meta-ads"
import {
  bidStrategyRequiresBidAmount,
  bidStrategyRequiresRoasGoal,
  getAllowedPerformanceGoalTypes,
  getPerformanceGoalDisabledReasonForBidStrategy,
  isBidAmountAllowed,
  isPerformanceGoalCompatibleWithBidStrategy,
  resolveOptimizationGoal,
} from "./constants"

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
  currencyCode?: string | null
  appPlatform?: string | null
  appRowId?: number | null
  performanceGoalReference?: MetaPerformanceGoalReferenceDto | null
  performanceGoalReferenceLoading?: boolean
  performanceGoalReferenceMessage?: string | null
  refreshPerformanceGoalReference?: (() => Promise<MetaPerformanceGoalReferenceDto>) | null
  adSetDraftValidation?: MetaAdSetDraftValidationDto | null
  adSetDraftValidationLoading?: boolean
}

const DEFAULT_GOAL_TYPES: Record<string, MetaPerformanceGoalTypeOptionDto> = {
  APP_EVENT: {
    key: "APP_EVENT",
    label: "Maximize number of app events",
    description: "We'll try to show your ads to the people most likely to take a specific action in your app at least once.",
    isEnabled: true,
    disabledReason: null,
  },
  APP_INSTALLS: {
    key: "APP_INSTALLS",
    label: "Maximize number of app installs",
    description: "We'll try to show your ads to the people most likely to install your app.",
    isEnabled: true,
    disabledReason: null,
  },
  VALUE: {
    key: "VALUE",
    label: "Maximize value of conversions",
    description: "We'll try to show your ads to the people most likely to generate higher value through selected value events.",
    isEnabled: true,
    disabledReason: null,
  },
}

const DEFAULT_STANDARD_EVENT_OPTIONS: MetaPerformanceGoalOptionDto[] = [
  {
    key: "PURCHASE",
    label: "Purchase",
    description: "Optimize delivery for purchase events.",
    groupKey: "STANDARD",
    isCustom: false,
  },
  {
    key: "SUBSCRIBE",
    label: "Subscribe",
    description: "Optimize delivery for subscription start events.",
    groupKey: "STANDARD",
    isCustom: false,
  },
  {
    key: "START_TRIAL",
    label: "Start Trial",
    description: "Optimize delivery for trial start events.",
    groupKey: "STANDARD",
    isCustom: false,
  },
]

const DEFAULT_VALUE_TYPES: MetaPerformanceGoalOptionDto[] = [
  {
    key: "IN_APP_PURCHASE",
    label: "In-app purchase",
    description: "Optimize for higher value from in-app purchase events.",
  },
  {
    key: "IN_APP_AD_IMPRESSION",
    label: "In-app ad impression",
    description: "Optimize for higher value from in-app ad impression events.",
  },
]

function getPerformanceGoalOptions(
  allowedGoalTypes: readonly string[],
  bidStrategy: string,
  reference?: MetaPerformanceGoalReferenceDto | null
): MetaPerformanceGoalTypeOptionDto[] {
  const fromReference = (reference?.goalTypes ?? []).reduce<Record<string, MetaPerformanceGoalTypeOptionDto>>((acc, option) => {
    acc[option.key] = option
    return acc
  }, {})

  return allowedGoalTypes.map((key) => {
    const base = fromReference[key] ?? DEFAULT_GOAL_TYPES[key] ?? DEFAULT_GOAL_TYPES.APP_INSTALLS
    const disabledReason = getPerformanceGoalDisabledReasonForBidStrategy(key, bidStrategy)
    return disabledReason
      ? { ...base, isEnabled: false, disabledReason }
      : { ...base, isEnabled: base.isEnabled !== false, disabledReason: base.isEnabled === false ? base.disabledReason : null }
  })
}

function getValueEventOptions(reference?: MetaPerformanceGoalReferenceDto | null, appPlatform?: string | null): MetaPerformanceGoalOptionDto[] {
  const optionsByKey = new Map<string, MetaPerformanceGoalOptionDto>()
  const canonicalValueTypeKey = (key: string) => {
    const normalized = key.trim().toUpperCase()
    if (normalized === "PURCHASE") return "IN_APP_PURCHASE"
    if (normalized === "AD_IMPRESSION") return "IN_APP_AD_IMPRESSION"
    return normalized
  }
  for (const option of DEFAULT_VALUE_TYPES) {
    optionsByKey.set(canonicalValueTypeKey(option.key), option)
  }
  for (const option of reference?.valueTypes ?? []) {
    optionsByKey.set(canonicalValueTypeKey(option.key), { ...option, key: canonicalValueTypeKey(option.key) })
  }
  void appPlatform
  return Array.from(optionsByKey.values()).filter((option) => {
    const key = option.key.toUpperCase()
    return key === "IN_APP_PURCHASE" || key === "PURCHASE" || key === "IN_APP_AD_IMPRESSION" || key === "AD_IMPRESSION"
  })
}

function getValueEventIneligibleMessage(valueType?: string | null): string {
  const normalized = valueType?.trim().toUpperCase()
  return normalized === "IN_APP_AD_IMPRESSION" || normalized === "AD_IMPRESSION"
    ? "This app is not eligible for Meta Value Optimization / Minimum ROAS for in-app ad impression."
    : "This app is not eligible for Meta Value Optimization / Minimum ROAS for in-app purchase."
}

function normalizeCatalogEventKey(value: string): string {
  return value.trim().replace(/[-\s]+/g, "_").toUpperCase()
}

function humanizeEventKey(value: string): string {
  const normalized = normalizeCatalogEventKey(value)
  if (!normalized) return value
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ")
}

function buildAppEventOptions(reference?: MetaPerformanceGoalReferenceDto | null) {
  const rawOptions = reference?.appEvents?.length ? reference.appEvents : DEFAULT_STANDARD_EVENT_OPTIONS
  const standard: MetaPerformanceGoalOptionDto[] = []
  const custom: MetaPerformanceGoalOptionDto[] = []

  for (const option of rawOptions) {
    if ((option.groupKey ?? "").toUpperCase() === "CUSTOM" || option.isCustom) {
      custom.push(option)
    } else {
      standard.push(option)
    }
  }

  return {
    standard: standard.length ? standard : DEFAULT_STANDARD_EVENT_OPTIONS,
    custom,
    all: [...(standard.length ? standard : DEFAULT_STANDARD_EVENT_OPTIONS), ...custom],
  }
}

export function AdSetBudgetSection({
  form,
  onChange,
  currencyCode,
  appPlatform,
  appRowId,
  performanceGoalReference,
  performanceGoalReferenceLoading,
  performanceGoalReferenceMessage,
  refreshPerformanceGoalReference,
  adSetDraftValidation,
  adSetDraftValidationLoading,
}: Props) {
  const { toast } = useToast()
  const currency = (currencyCode ?? "USD").trim() || "USD"
  const isABO = form.budgetStrategy === "ABO"
  const allowedPerformanceGoals = getAllowedPerformanceGoalTypes(form.campaignObjective)
  const selectedGoalType = form.performanceGoalType || "APP_INSTALLS"
  const bidAmountRequired = bidStrategyRequiresBidAmount(form.bidStrategy)
  const bidAmountAllowed = isBidAmountAllowed(form.bidStrategy)
  const normalizedPlatform = (appPlatform ?? "").trim().toUpperCase()
  const platformNote = normalizedPlatform === "ANDROID"
    ? "Android mobile targeting will be applied automatically from the selected app mapping."
    : normalizedPlatform === "IOS"
      ? "iOS mobile targeting will be applied automatically from the selected app mapping."
      : null

  const draftValueEligibilityStatus = adSetDraftValidation?.valueOptimizationEligibilityStatus?.toLowerCase()
  const draftValueIneligible = draftValueEligibilityStatus === "ineligible"
  const performanceGoalOptions = getPerformanceGoalOptions(allowedPerformanceGoals, form.bidStrategy, performanceGoalReference)
  const selectedPerformanceGoal = performanceGoalOptions.find((goalType) => goalType.key === selectedGoalType)
    ?? DEFAULT_GOAL_TYPES.APP_INSTALLS
  const selectedPerformanceGoalCompatible = isPerformanceGoalCompatibleWithBidStrategy(selectedGoalType, form.bidStrategy)
  const valueEventOptions = getValueEventOptions(performanceGoalReference, appPlatform)
  const selectedValueType = valueEventOptions.find((valueType) => valueType.key === form.performanceGoalValueType)
  const valueEligibilityStatus = (draftValueIneligible ? "ineligible" : (draftValueEligibilityStatus ?? "unknown")).toLowerCase()
  const valueEligibilityReason = adSetDraftValidation?.valueOptimizationDisabledReason ?? adSetDraftValidation?.errors?.[0] ?? getValueEventIneligibleMessage(form.performanceGoalValueType)
  const valueEligibilityWarning = adSetDraftValidation?.warning
  const appEventCatalog = useMemo(() => buildAppEventOptions(performanceGoalReference), [performanceGoalReference])
  const selectedAppEventKey = normalizeCatalogEventKey(form.performanceGoalEventName)
  const selectedAppEventOption = appEventCatalog.all.find((option) => option.key.toUpperCase() === selectedAppEventKey)
  const orphanAppEventOption = !selectedAppEventOption && selectedAppEventKey
    ? {
      key: selectedAppEventKey,
      label: humanizeEventKey(selectedAppEventKey),
      description: "This event is not in the current catalog.",
      groupKey: "CUSTOM" as const,
      isCustom: true,
    }
    : null

  const [customEventDialogOpen, setCustomEventDialogOpen] = useState(false)
  const [customEventName, setCustomEventName] = useState("")
  const [customEventError, setCustomEventError] = useState<string | null>(null)
  const [addingCustomEvent, setAddingCustomEvent] = useState(false)
  const normalizedCustomEventPreview = customEventName.trim() ? normalizeCatalogEventKey(customEventName) : ""

  useEffect(() => {
    if (selectedGoalType !== "VALUE" || valueEventOptions.length === 0 || selectedValueType) {
      return
    }

    onChange({ performanceGoalValueType: valueEventOptions[0]?.key ?? "IN_APP_PURCHASE" })
  }, [onChange, selectedGoalType, selectedValueType, valueEventOptions])

  const handlePerformanceGoalChange = (value: string) => {
    const option = performanceGoalOptions.find((goalType) => goalType.key === value)
    if (!option || option.isEnabled === false) {
      return
    }

    onChange({ performanceGoalType: value, optimizationGoal: resolveOptimizationGoal(value) })
  }

  const openCustomEventDialog = () => {
    setCustomEventName("")
    setCustomEventError(null)
    setCustomEventDialogOpen(true)
  }

  const handleCreateCustomEvent = async () => {
    if (!appRowId) {
      setCustomEventError("Select an app before adding a custom event.")
      return
    }

    if (!customEventName.trim()) {
      setCustomEventError("Event name is required.")
      return
    }

    try {
      setAddingCustomEvent(true)
      setCustomEventError(null)
      const created = await metaReferenceApi.createAppCustomEvent(appRowId, { eventKeyOrName: customEventName.trim() })
      if (refreshPerformanceGoalReference) {
        await refreshPerformanceGoalReference()
      }
      onChange({ performanceGoalEventName: created.key })
      setCustomEventDialogOpen(false)
      toast({ title: "Custom event added", description: `${created.label} is now available for this app.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add custom event."
      setCustomEventError(message)
    } finally {
      setAddingCustomEvent(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-slate-500" />
            Ad Set - Budget, Bidding &amp; Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`space-y-2 transition-opacity ${isABO ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-700">Ad set budget</Label>
              {isABO ? <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">ABO</Badge> : <Badge className="bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0">Disabled in campaign budget mode</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Daily Budget <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
                  <Input
                    placeholder="0.00"
                    className="pl-12 h-9 text-sm"
                    value={form.adSetDailyBudget}
                    onChange={(event) => onChange({ adSetDailyBudget: event.target.value })}
                    disabled={!isABO}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Lifetime Budget</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
                  <Input
                    placeholder="0.00"
                    className="pl-12 h-9 text-sm"
                    value={form.adSetLifetimeBudget}
                    onChange={(event) => onChange({ adSetLifetimeBudget: event.target.value })}
                    disabled={!isABO}
                  />
                </div>
              </div>
            </div>
            {isABO ? <p className="text-[11px] text-slate-400">At least one ad set budget field is required for ad set budget mode.</p> : null}
            <p className="text-[11px] text-slate-400">{`Enter budget and bid amounts in normal ${currency} units. Nexus converts them to Meta minor units during execution.`}</p>
          </div>

          <div className="space-y-4 items-start">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Performance Goal</Label>
                <p className="text-[11px] text-slate-500">How you measure success for your ads.</p>
                <Select value={selectedGoalType} onValueChange={handlePerformanceGoalChange}>
                  <SelectTrigger className="h-auto min-h-9 py-2 text-sm bg-white">
                    <div className="min-w-0 text-left">
                      <div className="text-sm font-medium truncate">{selectedPerformanceGoal.label}</div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {performanceGoalOptions.map((goalType) => (
                      <SelectItem key={goalType.key} value={goalType.key} disabled={!goalType.isEnabled}>
                        <div className="py-1 space-y-1">
                          <div className={`text-sm font-medium leading-tight ${goalType.isEnabled ? "" : "text-slate-400 line-through"}`}>{goalType.label}</div>
                          <div className="text-[11px] text-slate-500 leading-relaxed">{goalType.isEnabled ? goalType.description : goalType.disabledReason}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={`text-[11px] flex items-start gap-1 ${selectedPerformanceGoalCompatible ? "text-slate-400" : "text-amber-700"}`}>
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {selectedPerformanceGoalCompatible ? selectedPerformanceGoal.description : (selectedPerformanceGoal.disabledReason || selectedPerformanceGoal.description)}
                </p>
                {performanceGoalReferenceLoading ? <p className="text-[11px] text-slate-400">Loading performance goals for this app...</p> : null}
                {performanceGoalReferenceMessage ? <p className="text-[11px] text-amber-700">{performanceGoalReferenceMessage}</p> : null}
                {adSetDraftValidationLoading ? (
                  <p className="text-[11px] text-slate-400 flex items-start gap-1">
                    <Loader2 className="w-3 h-3 mt-0.5 flex-shrink-0 animate-spin" />
                    Checking Meta Value Optimization eligibility for this draft...
                  </p>
                ) : null}
                {valueEligibilityStatus === "unknown" && form.adAccountId && (selectedGoalType === "VALUE" || bidStrategyRequiresRoasGoal(form.bidStrategy)) ? (
                  <p className="text-[11px] text-amber-700 flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {valueEligibilityWarning ?? "Value Optimization eligibility could not be verified for this app yet."}
                  </p>
                ) : null}
              </div>

              {selectedGoalType === "APP_EVENT" ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">App event</Label>
                  <Select value={selectedAppEventKey || undefined} onValueChange={(value) => onChange({ performanceGoalEventName: value })}>
                    <SelectTrigger className={`h-auto min-h-9 py-2 text-sm ${!selectedAppEventKey ? "border-amber-400 ring-1 ring-amber-300" : ""}`}>
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-medium truncate">{selectedAppEventOption?.label ?? orphanAppEventOption?.label ?? "Select app event..."}</div>
                        {selectedAppEventKey ? <div className="text-[11px] text-slate-500 truncate">{selectedAppEventOption?.key ?? orphanAppEventOption?.key}</div> : null}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Standard Events</div>
                      {appEventCatalog.standard.map((eventOption) => (
                        <SelectItem key={eventOption.key} value={eventOption.key}>
                          <div className="py-1 space-y-1">
                            <div className="text-sm font-medium">{eventOption.label}</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed">{eventOption.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <span>Custom Events</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            openCustomEventDialog()
                          }}
                          disabled={!appRowId}
                        >
                          <Plus className="h-3 w-3" />
                          Add here
                        </button>
                      </div>
                      {appEventCatalog.custom.length > 0 ? appEventCatalog.custom.map((eventOption) => (
                        <SelectItem key={eventOption.key} value={eventOption.key}>
                          <div className="py-1 space-y-1">
                            <div className="text-sm font-medium">{eventOption.label}</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed">{eventOption.key}</div>
                          </div>
                        </SelectItem>
                      )) : (
                        <div className="px-2 pb-2 text-[11px] text-slate-400">No custom events have been added for this app yet.</div>
                      )}
                      {orphanAppEventOption ? (
                        <>
                          <SelectSeparator />
                          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Legacy / Uncataloged</div>
                          <SelectItem value={orphanAppEventOption.key}>
                            <div className="py-1 space-y-1">
                              <div className="text-sm font-medium text-amber-800">{orphanAppEventOption.label}</div>
                              <div className="text-[11px] text-amber-700 leading-relaxed">{orphanAppEventOption.description}</div>
                            </div>
                          </SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">Select a standard Meta event or a custom event stored for this app.</p>
                  {orphanAppEventOption ? <p className="text-[11px] text-amber-700">This event is not in the current catalog. Pick a standard/custom event or add it under Custom Events.</p> : null}
                </div>
              ) : null}

              {selectedGoalType === "VALUE" ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Value event</Label>
                  <Select value={form.performanceGoalValueType} onValueChange={(value) => onChange({ performanceGoalValueType: value })}>
                    <SelectTrigger className={`h-9 text-sm bg-white ${!form.performanceGoalValueType ? "border-amber-400 ring-1 ring-amber-300" : ""}`}>
                      <SelectValue placeholder="Select value event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {valueEventOptions.map((valueType) => (
                        <SelectItem key={valueType.key} value={valueType.key}>
                          <div className="py-1 space-y-1">
                            <div className="text-sm font-medium">{valueType.label}</div>
                            <div className="text-[11px] text-slate-500 leading-relaxed">{valueType.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    {selectedValueType?.description ?? "Select the value event Meta should maximize against."}
                  </p>
                  {valueEligibilityStatus === "ineligible" ? (
                    <p className="text-[11px] text-amber-800 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {valueEligibilityReason}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Bid Amount {bidAmountRequired ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(optional)</span>}</Label>
              <div className="relative w-48">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
                <Input
                  placeholder="0.00"
                  className={`pl-12 h-9 text-sm ${bidAmountRequired && !form.bidAmount.trim() ? "border-amber-400 ring-1 ring-amber-300" : ""}`}
                  value={form.bidAmount}
                  onChange={(event) => onChange({ bidAmount: event.target.value })}
                  disabled={!bidAmountAllowed}
                />
              </div>
              {bidAmountRequired ? (
                <p className="text-[11px] text-amber-700 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Required for {form.bidStrategy}. Meta will reject this ad set without a bid amount.
                </p>
              ) : bidAmountAllowed ? (
                <p className="text-[11px] text-slate-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Optional for this bid strategy.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Bid Amount is disabled because the selected bid strategy should run without a cap. This prevents Meta from treating the ad set as cost cap.
                </p>
              )}
            </div>
          </div>

          {platformNote ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {platformNote}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Start Time <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" className="h-9 text-sm" value={form.startTime} onChange={(event) => onChange({ startTime: event.target.value })} />
              <p className="text-[11px] text-slate-400">Uses your local time in the form, then converts to UTC only when sending to Meta.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">End Time <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input type="datetime-local" className="h-9 text-sm" value={form.endTime} onChange={(event) => onChange({ endTime: event.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={customEventDialogOpen} onOpenChange={(open) => { if (!addingCustomEvent) setCustomEventDialogOpen(open) }}>
        <DialogContent className="sm:!max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add custom event</DialogTitle>
            <DialogDescription>Custom events are stored for this app and will be available in future requests.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Event name</Label>
              <Input
                placeholder="e.g. paid_ad_impression"
                className="h-9 text-sm"
                value={customEventName}
                onChange={(event) => setCustomEventName(event.target.value)}
                disabled={addingCustomEvent}
              />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <div className="font-medium text-slate-700">Normalized key</div>
              <div className="mt-1 font-mono">{normalizedCustomEventPreview || "-"}</div>
            </div>
            {customEventError ? <p className="text-[11px] text-red-600">{customEventError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomEventDialogOpen(false)} disabled={addingCustomEvent}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleCreateCustomEvent()} disabled={addingCustomEvent || !customEventName.trim()}>
              {addingCustomEvent ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Add custom event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
