"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Pause } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import { bidStrategyRequiresBidAmount, getAllowedBillingEvents, getAllowedPerformanceGoalTypes, isBidAmountAllowed, isBidStrategyCompatible, isBidStrategySupported, resolveOptimizationGoal } from "./constants"
import type { GroupedValidationErrors, MetaAppMappingDto, MetaRequestStatus } from "@/types/meta-ads"

type TokenState = "none" | "ready" | "not_tested" | "expired" | "missing_permissions" | "invalid" | "disabled"
type RequestSectionTarget = "account-app" | "campaign-settings" | "adset-audience" | "adset-budget" | "creative" | "ad"

interface Props {
  form: RequestFormState
  serverStatus: MetaRequestStatus | null
  validationErrors: GroupedValidationErrors
  tokenState: TokenState
  selectedAppMapping?: MetaAppMappingDto | null
  isPersisted: boolean
  onNavigateToSection?: (target: RequestSectionTarget) => void
}

export function RequestSummaryRail({ form, serverStatus, validationErrors, tokenState, selectedAppMapping, isPersisted, onNavigateToSection }: Props) {
  const hasErrors = Object.keys(validationErrors).length > 0
  const isCBO = form.budgetStrategy === "CBO"
  const hasBudget = isCBO ? !!(form.campaignDailyBudget || form.campaignLifetimeBudget) : !!(form.adSetDailyBudget || form.adSetLifetimeBudget)
  const allowedGoals = getAllowedPerformanceGoalTypes(form.campaignObjective)
  const resolvedOptimizationGoal = resolveOptimizationGoal(form.performanceGoalType)
  const isGoalCompatible = allowedGoals.length === 0 || allowedGoals.includes(form.performanceGoalType)
  const mappingUrl = selectedAppMapping?.objectStoreUrl || selectedAppMapping?.storeUrlOverride || selectedAppMapping?.deepLinkUrlOverride
  const bidAmountRequired = bidStrategyRequiresBidAmount(form.bidStrategy)
  const allowedBillingEvents = getAllowedBillingEvents(resolvedOptimizationGoal)
  const isBillingCompatible = allowedBillingEvents.includes(form.billingEvent)
  const bidStrategySupported = isBidStrategySupported(form.bidStrategy)
  const startTimeValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.startTime)
  const platformAlignmentReady = !selectedAppMapping?.platform || selectedAppMapping.platform === "ANDROID" || selectedAppMapping.platform === "IOS"
  const tokenOk = tokenState === "ready"
  const creativeStatus = getCreativeStatus(form)
  const geoStatus = getGeoStatus(form)
  const geoSummary = getGeoSummary(form)

  return (
    <div className="space-y-3">
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Request Status</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3">
          {!isPersisted ? <Badge className="bg-slate-100 text-slate-600">Unsaved Draft</Badge> : null}
          {isPersisted && serverStatus ? <Badge className="bg-blue-100 text-blue-700">{serverStatus.replace(/_/g, " ")}</Badge> : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Readiness Checklist</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-1.5">
          <CheckRow state={form.adAccountId ? "ok" : "error"} label="Account selected" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={tokenOk ? "ok" : tokenState === "not_tested" ? "warning" : form.adAccountId ? "error" : "neutral"} label={tokenState === "not_tested" ? "Integration token not tested" : "Integration token valid"} onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={form.paidMediaAppBindingId ? (selectedAppMapping?.metaApplicationId && mappingUrl ? "ok" : "error") : "neutral"} label="Promoted object valid" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={form.budgetStrategy ? "ok" : "error"} label={`Budget strategy (${form.budgetStrategy})`} onClick={() => onNavigateToSection?.("campaign-settings")} />
          <CheckRow state={hasBudget ? "ok" : "error"} label="Budget provided" onClick={() => onNavigateToSection?.(isCBO ? "campaign-settings" : "adset-budget")} />
          <CheckRow state={form.campaignObjective ? "ok" : "neutral"} label="Objective set" onClick={() => onNavigateToSection?.("campaign-settings")} />
          <CheckRow state={form.campaignObjective ? (isGoalCompatible ? "ok" : "error") : "neutral"} label="Performance goal compatible" onClick={() => onNavigateToSection?.("adset-budget")} />
          <CheckRow state={form.performanceGoalType ? (isBillingCompatible ? "ok" : "error") : "neutral"} label="Billing event compatible" onClick={() => onNavigateToSection?.("adset-budget")} />
          <CheckRow state={form.bidStrategy ? (bidStrategySupported ? "ok" : "warning") : "neutral"} label={form.bidStrategy ? `Bid strategy supported (${form.bidStrategy})` : "Bid strategy optional"} onClick={() => onNavigateToSection?.("campaign-settings")} />
          <CheckRow state={bidAmountRequired ? (form.bidAmount ? "ok" : "error") : form.bidStrategy ? "ok" : "neutral"} label={bidAmountRequired ? "Bid amount provided for strategy" : "Bid amount optional"} onClick={() => onNavigateToSection?.("adset-budget")} />
          <CheckRow state={"ok"} label={`Advantage Audience explicitly ${form.advantageAudience ? "enabled" : "disabled"}`} onClick={() => onNavigateToSection?.("adset-budget")} />
          <CheckRow state={geoStatus} label={`Geo targeting (${form.geoMode.toLowerCase()})`} onClick={() => onNavigateToSection?.("adset-audience")} />
          <CheckRow state={platformAlignmentReady ? "ok" : "error"} label="Platform targeting can be derived from app mapping" onClick={() => onNavigateToSection?.("account-app")} />
          <CheckRow state={startTimeValid ? "ok" : "error"} label="Start time format valid" onClick={() => onNavigateToSection?.("adset-budget")} />
          <CheckRow state={creativeStatus.ok ? "ok" : "error"} label={`Creative ready (${creativeStatus.label})`} onClick={() => onNavigateToSection?.("creative")} />
          <CheckRow state={form.adName ? "ok" : "error"} label="Ad name complete" onClick={() => onNavigateToSection?.("ad")} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Meta Compatibility</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-1.5 text-[11px]">
          <p className="text-slate-500">Unavailable options in this form are disabled because Meta would reject them or Mediation Pro does not support the required extra fields yet.</p>
          <SummaryLine label="Billing events" value={allowedBillingEvents.join(", ")} />
          <SummaryLine label="Optimization goal" value={resolvedOptimizationGoal} />
          <SummaryLine label="Ad set budget sharing" value={form.budgetStrategy === "ABO" ? (form.isAdSetBudgetSharingEnabled ? "Enabled" : "Disabled") : "Only applies to ad set budget"} />
          <SummaryLine label="Advantage Audience" value={form.advantageAudience ? "Enabled" : "Disabled"} />
          <SummaryLine label="Platform targeting" value={selectedAppMapping?.platform ? `${selectedAppMapping.platform} auto-derived` : "Depends on selected app mapping"} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Execution Preview</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <p className="text-[11px] text-slate-400 mb-1">After approval and execution, Meta objects will be created as:</p>
          {[
            { level: "Campaign", name: form.campaignName || "Unnamed Campaign" },
            { level: "Ad Set", name: form.adSetName || "Unnamed Ad Set" },
            { level: "Ad", name: form.adName || "Unnamed Ad" },
          ].map(({ level, name }) => (
            <div key={level} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
              <div><p className="text-[11px] font-semibold text-slate-700">{level}</p><p className="text-[10px] text-slate-400 truncate max-w-[140px]">{name}</p></div>
              <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0"><Pause className="w-2.5 h-2.5" />PAUSED</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Live Summary</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 space-y-3 text-xs">
          <div>
            <p className="font-semibold text-slate-900 mb-1">Campaign</p>
            <SummaryLine label="Name" value={form.campaignName || "-"} />
            <SummaryLine label="Objective" value={form.campaignObjective || "-"} />
            <SummaryLine label="Budget sharing" value={form.budgetStrategy === "ABO" ? (form.isAdSetBudgetSharingEnabled ? "Enabled" : "Disabled") : "Only applies to ad set budget"} />
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-900 mb-1">Ad Set</p>
            <SummaryLine label="Geo" value={geoSummary} />
            <SummaryLine label="Age" value={`${form.ageMin}-${form.ageMax}`} />
            <SummaryLine label="Performance Goal" value={getPerformanceGoalSummary(form)} />
          </div>
          <div className="pt-2 border-t border-slate-200">
            <p className="font-semibold text-slate-900 mb-1">Creative</p>
            <SummaryLine label="Type" value={form.creativeType.replaceAll("_", " ")} />
            <SummaryLine label="Page ID" value={form.facebookPageId || "-"} />
            <SummaryLine label="Headline" value={getCreativeHeadline(form)} />
            <SummaryLine label="CTA" value={getCreativeCta(form)} />
          </div>
        </CardContent>
      </Card>

      {hasErrors ? (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2 pt-3 px-3"><CardTitle className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">Validation Errors</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3 space-y-2.5">
            {Object.entries(validationErrors).map(([group, errors]) => (
              <div key={group}>
                <p className="text-[11px] font-semibold text-red-900 mb-0.5 uppercase tracking-wide">{group}</p>
                <ul className="space-y-0.5 pl-3">{errors.map((error, index) => <li key={`${group}-${index}`} className="text-[11px] text-red-700 list-disc">{error}</li>)}</ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function getGeoStatus(form: RequestFormState): CheckState {
  if (form.geoMode === "GLOBAL") return "ok"
  if (form.geoMode === "REGION") return form.regionKeys.length > 0 ? "ok" : "error"
  if (form.geoMode === "COUNTRY_GROUP") return form.countryGroupIds.length > 0 ? "ok" : "error"
  if (form.geoMode === "CITY") return form.cityTargets.length > 0 ? "ok" : "error"
  return form.countries.length > 0 ? "ok" : "error"
}

function getGeoSummary(form: RequestFormState): string {
  if (form.geoMode === "GLOBAL") return "Global"
  if (form.geoMode === "REGION") {
    if (form.regionKeys.length === 0) return "-"
    return `${form.regionKeys.length} region(s): ${form.regionKeys.slice(0, 3).join(", ")}${form.regionKeys.length > 3 ? "..." : ""}`
  }
  if (form.geoMode === "COUNTRY_GROUP") {
    if (form.countryGroupIds.length === 0) return "-"
    return `${form.countryGroupIds.length} country group(s)`
  }
  if (form.geoMode === "CITY") {
    if (form.cityTargets.length === 0) return "-"
    return `${form.cityTargets.length} city(s): ${form.cityTargets.slice(0, 2).map((city) => city.name).join(", ")}${form.cityTargets.length > 2 ? "..." : ""}`
  }
  return form.countries.length > 0 ? `${form.countries.length} (${form.countries.slice(0, 3).join(", ")}${form.countries.length > 3 ? "..." : ""})` : "-"
}

function getValueEventLabel(value?: string | null): string {
  if (value === "IN_APP_AD_IMPRESSION") return "In-app ad impression"
  return "In-app purchase"
}

function getPerformanceGoalSummary(form: RequestFormState): string {
  if (form.performanceGoalType === "VALUE") {
    return `Maximize value of conversions${form.performanceGoalValueType ? ` - ${getValueEventLabel(form.performanceGoalValueType)}` : ""}`
  }
  if (form.performanceGoalType === "APP_EVENT") {
    return form.performanceGoalEventName ? `Maximize number of app events - ${form.performanceGoalEventName}` : "Maximize number of app events"
  }
  return "Maximize number of app installs"
}
function getFirstCreativeVariation(values?: string[], fallback?: string): string {
  const found = (values ?? []).map((value) => value.trim()).find((value) => value.length > 0)
  return found || (fallback ?? "")
}

function hasCreativeVariation(values?: string[], fallback?: string): boolean {
  return !!getFirstCreativeVariation(values, fallback)
}

function getCreativeStatus(form: RequestFormState) {
  if (form.creativeType === "SINGLE_VIDEO") {
    return { ok: !!(form.creativeName && form.facebookPageId && hasCreativeVariation(form.singleVideoPrimaryTexts, form.singleVideoPrimaryText) && hasCreativeVariation(form.singleVideoHeadlines, form.singleVideoHeadline) && form.singleVideoCallToAction && (form.singleVideoVideo.videoId || form.singleVideoVideo.uploadedAssetId)), label: "single video" }
  }
  if (form.creativeType === "CAROUSEL_IMAGE") {
    return { ok: !!(form.creativeName && form.facebookPageId && form.carouselCallToAction && form.carouselCards.length >= 2 && form.carouselCards.every((card) => card.headline && (card.image.imageHash || card.image.imageUrl || card.image.uploadedAssetId))), label: "carousel" }
  }
  if (form.creativeType === "FLEXIBLE") {
    return {
      ok: !!(
        form.creativeName
        && form.facebookPageId
        && hasCreativeVariation(form.flexiblePrimaryTexts)
        && hasCreativeVariation(form.flexibleHeadlines)
        && form.flexibleCallToAction
        && form.flexibleAssets.length > 0
        && form.flexibleAssets.every((asset) => asset.assetType === "VIDEO"
          ? (asset.video.videoId || asset.video.uploadedAssetId)
          : (asset.image.imageHash || asset.image.imageUrl || asset.image.uploadedAssetId))
      ),
      label: "flexible",
    }
  }
  if (form.creativeType === "EXISTING_POST") {
    return { ok: !!(form.creativeName && form.facebookPageId && form.existingPostId), label: "existing post" }
  }
  return { ok: !!(form.creativeName && form.facebookPageId && hasCreativeVariation(form.singleImagePrimaryTexts, form.singleImagePrimaryText) && hasCreativeVariation(form.singleImageHeadlines, form.singleImageHeadline) && form.singleImageCallToAction && (form.singleImageImage.imageHash || form.singleImageImage.imageUrl || form.singleImageImage.uploadedAssetId)), label: "single image" }
}

function getCreativeHeadline(form: RequestFormState): string {
  if (form.creativeType === "SINGLE_VIDEO") return getFirstCreativeVariation(form.singleVideoHeadlines, form.singleVideoHeadline) || "-"
  if (form.creativeType === "CAROUSEL_IMAGE") return form.carouselCards[0]?.headline || "-"
  if (form.creativeType === "FLEXIBLE") return getFirstCreativeVariation(form.flexibleHeadlines) || "-"
  if (form.creativeType === "EXISTING_POST") return form.existingPostId || "-"
  return getFirstCreativeVariation(form.singleImageHeadlines, form.singleImageHeadline) || "-"
}

function getCreativeCta(form: RequestFormState): string {
  if (form.creativeType === "SINGLE_VIDEO") return form.singleVideoCallToAction || "-"
  if (form.creativeType === "CAROUSEL_IMAGE") return form.carouselCallToAction || "-"
  if (form.creativeType === "FLEXIBLE") return form.flexibleCallToAction || "-"
  if (form.creativeType === "EXISTING_POST") return "EXISTING_POST"
  return form.singleImageCallToAction || "-"
}

type CheckState = "ok" | "error" | "warning" | "neutral"


function CheckRow({ state, label, onClick }: { state: CheckState; label: string; onClick?: () => void }) {
  const icon = state === "ok"
    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
    : state === "warning"
      ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
      : state === "neutral"
        ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />

  const tone = state === "ok"
    ? "text-green-700"
    : state === "warning"
      ? "text-amber-700"
      : state === "neutral"
        ? "text-slate-400"
        : "text-red-600"

  if (!onClick) {
    return <div className={`flex items-center gap-2 text-xs ${tone}`}>{icon}<span>{label}</span></div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${tone}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-2 text-[11px] py-0.5"><span className="text-slate-500">{label}:</span><span className="text-slate-900 font-medium text-right truncate">{value}</span></div>
}






