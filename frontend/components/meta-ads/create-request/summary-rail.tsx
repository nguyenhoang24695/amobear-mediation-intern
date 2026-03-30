"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Pause } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import { OBJECTIVE_OPTIMIZATION_MAP } from "./constants"
import type { GroupedValidationErrors, MetaAppMappingDto, MetaRequestStatus } from "@/types/meta-ads"

type TokenState = "none" | "ready" | "not_tested" | "expired" | "missing_permissions" | "invalid" | "disabled"

interface Props {
  form: RequestFormState
  serverStatus: MetaRequestStatus | null
  validationErrors: GroupedValidationErrors
  tokenState: TokenState
  selectedAppMapping?: MetaAppMappingDto | null
  isPersisted: boolean
}

export function RequestSummaryRail({ form, serverStatus, validationErrors, tokenState, selectedAppMapping, isPersisted }: Props) {
  const hasErrors = Object.keys(validationErrors).length > 0
  const isCBO = form.budgetStrategy === "CBO"
  const hasBudget = isCBO
    ? !!(form.campaignDailyBudget || form.campaignLifetimeBudget)
    : !!(form.adSetDailyBudget || form.adSetLifetimeBudget)

  const allowedGoals = form.campaignObjective ? (OBJECTIVE_OPTIMIZATION_MAP[form.campaignObjective] ?? []) : []
  const isGoalCompatible = allowedGoals.length === 0 || allowedGoals.includes(form.optimizationGoal)
  const mappingUrl = selectedAppMapping?.objectStoreUrl || selectedAppMapping?.storeUrlOverride || selectedAppMapping?.deepLinkUrlOverride
  const tokenOk = tokenState === "ready"

  return (
    <div className="space-y-3">
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Request Status</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {!isPersisted ? <Badge className="bg-slate-100 text-slate-600">Unsaved Draft</Badge> : null}
          {isPersisted && serverStatus ? (
            <Badge className="bg-blue-100 text-blue-700">{serverStatus.replace(/_/g, " ")}</Badge>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1.5">
          <CheckRow state={form.adAccountId ? "ok" : "error"} label="Account selected" />
          <CheckRow state={tokenOk ? "ok" : tokenState === "not_tested" ? "warning" : form.adAccountId ? "error" : "neutral"} label={tokenState === "not_tested" ? "Integration token not tested" : "Integration token valid"} />
          <CheckRow
            state={form.appRowId ? (selectedAppMapping?.metaApplicationId && mappingUrl ? "ok" : "error") : "neutral"}
            label="Promoted object valid"
          />
          <CheckRow state={form.budgetStrategy ? "ok" : "error"} label={`Budget strategy (${form.budgetStrategy})`} />
          <CheckRow state={hasBudget ? "ok" : "error"} label="Budget provided" />
          <CheckRow state={form.campaignObjective ? "ok" : "neutral"} label="Objective set" />
          <CheckRow state={form.campaignObjective ? (isGoalCompatible ? "ok" : "error") : "neutral"} label="Optimization goal compatible" />
          <CheckRow state={form.countries.length > 0 ? "ok" : "error"} label="Countries selected" />
          <CheckRow
            state={!!(form.creativeName && form.facebookPageId && form.primaryText && form.headline && (form.imageHash || form.imageUrl)) ? "ok" : "error"}
            label="Creative minimum complete"
          />
          <CheckRow state={form.adName ? "ok" : "error"} label="Ad name complete" />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Execution Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <p className="text-[11px] text-slate-400 mb-1">After approval and execution, Meta objects will be created as:</p>
          {[
            { level: "Campaign", name: form.campaignName || "Unnamed Campaign" },
            { level: "Ad Set", name: form.adSetName || "Unnamed Ad Set" },
            { level: "Ad", name: form.adName || "Unnamed Ad" },
          ].map(({ level, name }) => (
            <div key={level} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-[11px] font-semibold text-slate-700">{level}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{name}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">
                <Pause className="w-2.5 h-2.5" />
                PAUSED
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Live Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900 mb-1">Campaign</p>
            <SummaryLine label="Name" value={form.campaignName || "—"} />
            <SummaryLine label="Objective" value={form.campaignObjective || "—"} />
            <SummaryLine
              label="Budget"
              value={form.budgetStrategy === "CBO"
                ? (form.campaignDailyBudget ? `${form.campaignDailyBudget}/day` : form.campaignLifetimeBudget ? `${form.campaignLifetimeBudget} lifetime` : "—")
                : "Set at Ad Set (ABO)"}
            />
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-900 mb-1">Ad Set</p>
            <SummaryLine
              label="Countries"
              value={form.countries.length > 0 ? `${form.countries.length} (${form.countries.slice(0, 3).join(", ")}${form.countries.length > 3 ? "…" : ""})` : "—"}
            />
            <SummaryLine label="Age" value={`${form.ageMin}–${form.ageMax}`} />
            <SummaryLine label="Optimization" value={form.optimizationGoal || "—"} />
            <SummaryLine
              label="Budget"
              value={form.budgetStrategy === "ABO"
                ? (form.adSetDailyBudget ? `${form.adSetDailyBudget}/day` : form.adSetLifetimeBudget ? `${form.adSetLifetimeBudget} lifetime` : "—")
                : "Set at Campaign (CBO)"}
            />
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-900 mb-1">Creative</p>
            <SummaryLine label="Page ID" value={form.facebookPageId || "—"} />
            <SummaryLine label="Headline" value={form.headline || "—"} />
            <SummaryLine label="CTA" value={form.callToAction || "—"} />
          </div>
        </CardContent>
      </Card>

      {hasErrors ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2.5">
            {Object.entries(validationErrors).map(([group, errors]) => (
              <div key={group}>
                <p className="text-[11px] font-semibold text-red-900 mb-0.5 uppercase tracking-wide">{group}</p>
                <ul className="space-y-0.5 pl-3">
                  {errors.map((error, index) => (
                    <li key={`${group}-${index}`} className="text-[11px] text-red-700 list-disc">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

type CheckState = "ok" | "error" | "warning" | "neutral"

function CheckRow({ state, label }: { state: CheckState; label: string }) {
  if (state === "neutral") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{label}</span>
      </div>
    )
  }

  if (state === "ok") {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
        <span>{label}</span>
      </div>
    )
  }

  if (state === "warning") {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-700">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-red-600">
      <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{label}</span>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px] py-0.5">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-900 font-medium text-right truncate">{value}</span>
    </div>
  )
}
