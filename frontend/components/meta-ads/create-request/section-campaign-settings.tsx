"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Megaphone, X, Info } from "lucide-react"
import type { RequestFormState } from "./create-request-content"

const campaignObjectives = [
  { value: "OUTCOME_APP_PROMOTION", label: "OUTCOME_APP_PROMOTION" },
  { value: "OUTCOME_TRAFFIC", label: "OUTCOME_TRAFFIC" },
  { value: "OUTCOME_AWARENESS", label: "OUTCOME_AWARENESS" },
  { value: "OUTCOME_ENGAGEMENT", label: "OUTCOME_ENGAGEMENT" },
  { value: "OUTCOME_LEADS", label: "OUTCOME_LEADS" },
  { value: "OUTCOME_SALES", label: "OUTCOME_SALES" },
]

const specialAdCategoryOptions = ["CREDIT", "EMPLOYMENT", "HOUSING", "ISSUES_ELECTIONS_POLITICS"]
const bidStrategies = ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
}

export function CampaignSettingsSection({ form, onChange }: Props) {
  const isCBO = form.budgetStrategy === "CBO"

  const toggleCategory = (cat: string) => {
    const current = form.specialAdCategories
    onChange({
      specialAdCategories: current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat]
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
        {/* Campaign Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Campaign Name <span className="text-red-500">*</span></Label>
          <Input
            placeholder="{AppName}_{Country}_{Platform}_{Objective}_{YYYYMMDD}"
            value={form.campaignName}
            onChange={e => onChange({ campaignName: e.target.value })}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-slate-400">Use a structured naming convention for easy reporting.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Buying Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Buying Type</Label>
            <Select value={form.buyingType} onValueChange={v => onChange({ buyingType: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCTION">AUCTION</SelectItem>
                <SelectItem value="RESERVED">RESERVED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Objective */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Campaign Objective <span className="text-red-500">*</span></Label>
            <Select value={form.campaignObjective} onValueChange={v => onChange({ campaignObjective: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select objective..." />
              </SelectTrigger>
              <SelectContent>
                {campaignObjectives.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-mono text-xs">{o.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Budget Strategy — CBO / ABO toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Budget Strategy <span className="text-red-500">*</span></Label>
          <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
            {(["CBO", "ABO"] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ budgetStrategy: s })}
                className={`px-5 py-2 text-xs font-semibold transition-colors ${
                  form.budgetStrategy === s
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                } ${s === "ABO" ? "border-l border-slate-300" : ""}`}
              >
                {s === "CBO" ? "Campaign Budget (CBO)" : "Ad Set Budget (ABO)"}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Meta does not allow conflicting budget strategies. Choose either campaign-level (CBO) or ad set-level (ABO) budget.
          </p>
        </div>

        {/* Campaign Budget — only shown for CBO */}
        <div className={`space-y-2 transition-opacity ${isCBO ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-slate-700">Campaign Budget</Label>
            {isCBO && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">CBO</Badge>}
            {!isCBO && <Badge className="bg-slate-100 text-slate-400 text-[10px] px-1.5 py-0">Disabled in ABO mode</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Daily Budget <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  placeholder="0.00"
                  className="pl-6 h-9 text-sm"
                  value={form.campaignDailyBudget}
                  onChange={e => onChange({ campaignDailyBudget: e.target.value })}
                  disabled={!isCBO}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Lifetime Budget</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  placeholder="0.00"
                  className="pl-6 h-9 text-sm"
                  value={form.campaignLifetimeBudget}
                  onChange={e => onChange({ campaignLifetimeBudget: e.target.value })}
                  disabled={!isCBO}
                />
              </div>
            </div>
          </div>
          {isCBO && (
            <p className="text-[11px] text-slate-400">At least one campaign budget field is required for CBO campaigns.</p>
          )}
        </div>

        {/* Special Ad Categories */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Special Ad Categories <span className="text-slate-400 font-normal">(optional)</span></Label>
          <div className="flex flex-wrap gap-1.5">
            {specialAdCategoryOptions.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  form.specialAdCategories.includes(cat)
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-white text-slate-600 border-slate-300 hover:border-amber-300"
                }`}
              >
                {cat}
                {form.specialAdCategories.includes(cat) && <X className="w-2.5 h-2.5 inline ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Bid Strategy */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Bid Strategy <span className="text-slate-400 font-normal">(optional)</span></Label>
          <Select value={form.bidStrategy} onValueChange={v => onChange({ bidStrategy: v })}>
            <SelectTrigger className="h-9 text-sm w-64">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {bidStrategies.map(s => (
                <SelectItem key={s} value={s}><span className="font-mono text-xs">{s}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
