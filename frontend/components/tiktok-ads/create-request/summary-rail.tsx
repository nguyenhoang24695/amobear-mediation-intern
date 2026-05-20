import { AlertCircle, CheckCircle2, Circle, CircleDot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TikTokAppMappingDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"
import type { TikTokRequestFormState, TikTokRequestSectionTarget } from "./types"
import { hasCreativeMedia, optionLabel } from "./types"

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  validationErrors: string[]
  serverStatus?: string | null
  selectedAppMapping?: TikTokAppMappingDto
  isPersisted: boolean
  onNavigateToSection?: (target: TikTokRequestSectionTarget) => void
}

type CheckState = "ok" | "error" | "warning" | "neutral"

export function TikTokRequestSummaryRail({ form, reference, validationErrors, serverStatus, selectedAppMapping, isPersisted, onNavigateToSection }: Props) {
  const selectedAdAccount = reference.adAccounts.find((account) => account.id === form.tikTokAdAccountRowId)
  const minimumBudget = 50
  const isInfiniteAdGroupBudget = form.adGroup.budgetMode === "BUDGET_MODE_INFINITE"
  const campaignBudgetReady = !form.campaign.budget || form.campaign.budget >= minimumBudget || form.campaign.budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET"
  const adGroupBudgetReady = isInfiniteAdGroupBudget || !form.adGroup.budget || form.adGroup.budget >= minimumBudget
  const budgetReady = !!(isInfiniteAdGroupBudget || (form.campaign.budget ?? 0) >= minimumBudget || (form.adGroup.budget ?? 0) >= minimumBudget || form.campaign.budgetMode === "BUDGET_MODE_DYNAMIC_DAILY_BUDGET") && campaignBudgetReady && adGroupBudgetReady
  const audienceReady = form.adGroup.locationIds.length > 0
  const biddingReady = !!(form.adGroup.budgetMode && form.adGroup.scheduleType && form.adGroup.optimizationGoal && form.adGroup.bidType && form.adGroup.billingEvent)
  const creativeReady = hasCreativeMedia(form)
  const adsetTextReady = form.adGroup.adTexts?.some((item) => item.trim())
  const identityReady = form.ads.length > 0 && form.ads.every((ad) => Boolean(ad.identityId?.trim()))
  const adReady = form.ads.length > 0 && Boolean(adsetTextReady) && form.ads.every((ad) => !!(ad.adName.trim() && ad.callToAction && ad.landingPageUrl?.trim())) && identityReady

  return (
    <aside className="space-y-3">
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Readiness Checklist</p>
          <Badge className={isPersisted ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}>{isPersisted ? "Saved" : "Unsaved"}</Badge>
        </div>
        <div className="space-y-1.5">
          <CheckRow state={form.tikTokAdAccountRowId ? "ok" : "error"} label="Account selected" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={selectedAdAccount?.isActive ? "ok" : "neutral"} label="Account active/token usable" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={selectedAppMapping ? "ok" : "error"} label="App mapping ready" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={form.campaign.campaignName.trim() && budgetReady ? "ok" : "error"} label="Campaign settings ready" onClick={() => onNavigateToSection?.("campaign-settings")} />
          <CheckRow state={audienceReady ? "ok" : "error"} label="Audience locations ready" onClick={() => onNavigateToSection?.("adgroup-audience")} />
          <CheckRow state={biddingReady ? "ok" : "error"} label="Budget/bidding/schedule ready" onClick={() => onNavigateToSection?.("adgroup-budget")} />
          <CheckRow state={creativeReady ? "ok" : "error"} label="Creative media ready" onClick={() => onNavigateToSection?.("creative")} />
          <CheckRow state={identityReady ? "ok" : "error"} label="TikTok identity selected" onClick={() => onNavigateToSection?.("creative")} />
          <CheckRow state={adReady ? "ok" : "error"} label="Ad copy, URL, and identity ready" onClick={() => onNavigateToSection?.("creative")} />
        </div>
        {validationErrors.length > 0 ? (
          <div className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
            <p className="font-medium">{validationErrors.length} backend validation issue{validationErrors.length === 1 ? "" : "s"} found.</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {validationErrors.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border bg-white p-3 text-xs shadow-sm">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Request Summary</p>
        <SummaryLine label="Status" value={serverStatus ?? "draft"} />
        <SummaryLine label="Objective" value={optionLabel(reference.objectives, form.campaign.objectiveType)} />
        <SummaryLine label="Budget" value={isInfiniteAdGroupBudget ? `${optionLabel(reference.budgetModes, form.adGroup.budgetMode)} (${form.adGroup.budget ?? 0})` : form.campaign.budget ? `${form.campaign.budget}` : form.adGroup.budget ? `${form.adGroup.budget}` : "-"} />
        <SummaryLine label="Optimization" value={optionLabel(reference.optimizationGoals, form.adGroup.optimizationGoal)} />
        <SummaryLine label="Format" value={optionLabel(reference.adFormats, form.ad.adFormat)} />
        <SummaryLine label="Creatives" value={form.ads.length} />
      </div>
    </aside>
  )
}

function CheckRow({ state, label, onClick }: { state: CheckState; label: string; onClick?: () => void }) {
  const icon = state === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : state === "warning" ? <AlertCircle className="h-3.5 w-3.5" /> : state === "error" ? <CircleDot className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />
  return (
    <Button type="button" variant="ghost" className="h-auto w-full justify-start gap-2 px-1.5 py-1 text-left text-xs" onClick={onClick}>
      <span className={cn(state === "ok" && "text-emerald-600", state === "warning" && "text-amber-600", state === "error" && "text-rose-600", state === "neutral" && "text-slate-400")}>{icon}</span>
      <span className="truncate text-slate-700">{label}</span>
    </Button>
  )
}

function SummaryLine({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t py-1.5 first:border-t-0">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-900">{value ?? "-"}</span>
    </div>
  )
}



