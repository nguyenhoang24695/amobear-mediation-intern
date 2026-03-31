"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Megaphone, X, Info, AlertTriangle } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import type { MetaBidStrategyPresetDto, MetaObjectivePresetDto } from "@/types/meta-ads"
import { bidStrategyRequiresBidAmount } from "./constants"

const specialAdCategoryOptions = ["CREDIT", "EMPLOYMENT", "HOUSING", "ISSUES_ELECTIONS_POLITICS"]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
  objectives: MetaObjectivePresetDto[]
  bidStrategies: MetaBidStrategyPresetDto[]
  currencyCode?: string | null
}

export function CampaignSettingsSection({ form, onChange, objectives, bidStrategies, currencyCode }: Props) {
  const currency = (currencyCode ?? "USD").trim() || "USD"
  const isCBO = form.budgetStrategy === "CBO"
  const bidAmountRequired = bidStrategyRequiresBidAmount(form.bidStrategy)

  const toggleCategory = (category: string) => {
    const current = form.specialAdCategories
    onChange({
      specialAdCategories: current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    })
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-slate-500" />
          Campaign Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">
            Campaign Name <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="{AppName}_{Country}_{Platform}_{Objective}_{YYYYMMDD}"
            value={form.campaignName}
            onChange={(event) => onChange({ campaignName: event.target.value })}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-slate-400">Use a structured naming convention for easier approvals and reporting.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Buying Type</Label>
            <Select value={form.buyingType} onValueChange={(value) => onChange({ buyingType: value })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCTION">AUCTION</SelectItem>
                <SelectItem value="RESERVED">RESERVED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              Campaign Objective <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.campaignObjective}
              onValueChange={(value) => onChange({ campaignObjective: value, objective: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select objective..." />
              </SelectTrigger>
              <SelectContent>
                {objectives.map((objective) => (
                  <SelectItem key={objective.key} value={objective.key}>
                    <div className="py-0.5">
                      <div className="font-mono text-xs">{objective.key}</div>
                      <div className="text-[11px] text-slate-400">{objective.label}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Budget Strategy <span className="text-red-500">*</span>
          </Label>
          <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
            {(["CBO", "ABO"] as const).map((strategy) => (
              <button
                key={strategy}
                type="button"
                onClick={() => onChange({ budgetStrategy: strategy })}
                className={`px-5 py-2 text-xs font-semibold transition-colors ${
                  form.budgetStrategy === strategy
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                } ${strategy === "ABO" ? "border-l border-slate-300" : ""}`}
              >
                {strategy === "CBO" ? "Campaign Budget (CBO)" : "Ad Set Budget (ABO)"}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Use either campaign-level budget or ad set-level budget, not both.
          </p>
        </div>

        <div className={`space-y-2 transition-opacity ${isCBO ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-700">Campaign Budget</Label>
            {isCBO ? (
              <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">CBO</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0">Disabled in ABO mode</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">
                Daily Budget <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
                <Input
                  placeholder="0.00"
                  className="pl-12 h-9 text-sm"
                  value={form.campaignDailyBudget}
                  onChange={(event) => onChange({ campaignDailyBudget: event.target.value })}
                  disabled={!isCBO}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Lifetime Budget</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currency}</span>
                <Input
                  placeholder="0.00"
                  className="pl-12 h-9 text-sm"
                  value={form.campaignLifetimeBudget}
                  onChange={(event) => onChange({ campaignLifetimeBudget: event.target.value })}
                  disabled={!isCBO}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">{`Enter budget in normal ${currency} units. Mediation Pro converts it to Meta minor units during execution.`}</p>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">
            Special Ad Categories <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {specialAdCategoryOptions.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  form.specialAdCategories.includes(category)
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-white text-slate-600 border-slate-300 hover:border-amber-300"
                }`}
              >
                {category}
                {form.specialAdCategories.includes(category) ? <X className="w-2.5 h-2.5 inline ml-1" /> : null}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">{`Enter budget in normal ${currency} units. Mediation Pro converts it to Meta minor units during execution.`}</p>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">
            Bid Strategy <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Select value={form.bidStrategy} onValueChange={(value) => onChange({ bidStrategy: value })}>
            <SelectTrigger className={`h-9 text-sm w-72 ${bidAmountRequired && !form.bidAmount.trim() ? "border-amber-400 ring-1 ring-amber-300" : ""}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {bidStrategies.map((strategy) => (
                <SelectItem key={strategy.key} value={strategy.key}>
                  <div className="py-0.5">
                    <div className="font-mono text-xs">{strategy.key}</div>
                    <div className="text-[11px] text-slate-400">{strategy.label}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bidAmountRequired ? (
            <p className="text-[11px] text-amber-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              This bid strategy requires a Bid Amount in the ad set section.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">Lowest cost without cap can run without a bid amount.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}




