"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarClock, Info } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import { OBJECTIVE_OPTIMIZATION_MAP as OPT_MAP, bidStrategyRequiresBidAmount } from "./constants"

const ALL_OPTIMIZATION_GOALS = [
  "APP_INSTALLS", "CLICKS", "CONVERSIONS", "IMPRESSIONS", "LANDING_PAGE_VIEWS",
  "LEAD_GENERATION", "LINK_CLICKS", "PAGE_LIKES", "POST_ENGAGEMENT",
  "REACH", "VALUE", "AD_RECALL_LIFT",
]

const billingEvents = ["IMPRESSIONS", "LINK_CLICKS", "APP_INSTALLS", "PAGE_LIKES", "POST_ENGAGEMENT", "VIDEO_VIEWS"]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
  currencyCode?: string | null
}

export function AdSetBudgetSection({ form, onChange, currencyCode }: Props) {
  const currency = (currencyCode ?? "USD").trim() || "USD"
  const isABO = form.budgetStrategy === "ABO"

  const allowedGoals: string[] = form.campaignObjective
    ? (OPT_MAP[form.campaignObjective] ?? ALL_OPTIMIZATION_GOALS)
    : ALL_OPTIMIZATION_GOALS

  const isGoalCompatible = allowedGoals.includes(form.optimizationGoal)
  const bidAmountRequired = bidStrategyRequiresBidAmount(form.bidStrategy)

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-slate-500" />
          Ad Set - Budget, Bidding &amp; Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ad Set Budgets - only active in ABO mode */}
        <div className={`space-y-2 transition-opacity ${isABO ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-700">Ad Set Budget</Label>
            {isABO && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">ABO</Badge>}
            {!isABO && <Badge className="bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0">Disabled in CBO mode</Badge>}
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
                  onChange={e => onChange({ adSetDailyBudget: e.target.value })}
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
                  onChange={e => onChange({ adSetLifetimeBudget: e.target.value })}
                  disabled={!isABO}
                />
              </div>
            </div>
          </div>
          {isABO && (
            <p className="text-[11px] text-slate-400">At least one ad set budget field is required for ABO campaigns.</p>
          )}
          <p className="text-[11px] text-slate-400">{`Enter budget and bid amounts in normal ${currency} units. Mediation Pro converts them to Meta minor units during execution.`}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Billing Event */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Billing Event</Label>
            <Select value={form.billingEvent} onValueChange={v => onChange({ billingEvent: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {billingEvents.map(e => (
                  <SelectItem key={e} value={e}><span className="font-mono text-xs">{e}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optimization Goal - filtered by objective */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Optimization Goal</Label>
            <Select value={form.optimizationGoal} onValueChange={v => onChange({ optimizationGoal: v })}>
              <SelectTrigger className={`h-9 text-sm ${!isGoalCompatible ? "border-amber-400 ring-1 ring-amber-300" : ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedGoals.map(g => (
                  <SelectItem key={g} value={g}><span className="font-mono text-xs">{g}</span></SelectItem>
                ))}
                {/* Show incompatible goals as disabled */}
                {ALL_OPTIMIZATION_GOALS.filter(g => !allowedGoals.includes(g)).map(g => (
                  <SelectItem key={g} value={g} disabled>
                    <span className="font-mono text-xs text-slate-400 line-through">{g}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.campaignObjective ? (
              !isGoalCompatible ? (
                <p className="text-[11px] text-amber-700 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  This goal is not compatible with <span className="font-mono">{form.campaignObjective}</span>.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Allowed goals for <span className="font-mono">{form.campaignObjective}</span>: {allowedGoals.join(", ")}
                </p>
              )
            ) : (
              <p className="text-[11px] text-slate-400">Select a campaign objective to see compatible goals.</p>
            )}
          </div>
        </div>

        {/* Bid Amount */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Bid Amount {bidAmountRequired ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(optional)</span>}</Label>
          <div className="relative w-48">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
            <Input placeholder="0.00" className={`pl-12 h-9 text-sm ${bidAmountRequired && !form.bidAmount.trim() ? "border-amber-400 ring-1 ring-amber-300" : ""}`} value={form.bidAmount} onChange={e => onChange({ bidAmount: e.target.value })} />
          </div>
          {bidAmountRequired ? (
            <p className="text-[11px] text-amber-700 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Required for {form.bidStrategy}.
            </p>
          ) : null}
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Start Time <span className="text-red-500">*</span></Label>
            <Input type="datetime-local" className="h-9 text-sm" value={form.startTime} onChange={e => onChange({ startTime: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">End Time <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input type="datetime-local" className="h-9 text-sm" value={form.endTime} onChange={e => onChange({ endTime: e.target.value })} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}





