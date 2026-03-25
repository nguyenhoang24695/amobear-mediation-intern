"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, ChevronRight } from "lucide-react"
import Link from "next/link"
import { OBJECTIVE_OPTIMIZATION_MAP } from "./constants"
import { AccountAppSection } from "./section-account-app"
import { CampaignSettingsSection } from "./section-campaign-settings"
import { AdSetAudienceSection } from "./section-adset-audience"
import { AdSetBudgetSection } from "./section-adset-budget"
import { CreativeSection } from "./section-creative"
import { AdSection } from "./section-ad"
import { RequestSummaryRail } from "./summary-rail"

export interface RequestFormState {
  // Account & App
  adAccountId: string
  appId: string
  objective: string
  // Budget Strategy
  budgetStrategy: "CBO" | "ABO"
  // Campaign
  campaignName: string
  buyingType: string
  campaignObjective: string
  specialAdCategories: string[]
  bidStrategy: string
  campaignDailyBudget: string
  campaignLifetimeBudget: string
  // Ad Set
  adSetName: string
  countries: string[]
  ageMin: number
  ageMax: number
  gender: string
  placementMode: string
  publisherPlatforms: string[]
  facebookPositions: string[]
  instagramPositions: string[]
  adSetDailyBudget: string
  adSetLifetimeBudget: string
  billingEvent: string
  optimizationGoal: string
  bidAmount: string
  startTime: string
  endTime: string
  // Creative
  creativeName: string
  facebookPageId: string
  instagramActorId: string
  primaryText: string
  headline: string
  description: string
  callToAction: string
  imageHash: string
  imageUrl: string
  linkUrl: string
  // Ad
  adName: string
  trackingSpecs: string
}

const defaultFormState: RequestFormState = {
  adAccountId: "",
  appId: "",
  objective: "",
  budgetStrategy: "CBO",
  campaignName: "",
  buyingType: "AUCTION",
  campaignObjective: "",
  specialAdCategories: [],
  bidStrategy: "",
  campaignDailyBudget: "",
  campaignLifetimeBudget: "",
  adSetName: "",
  countries: [],
  ageMin: 18,
  ageMax: 65,
  gender: "ALL",
  placementMode: "AUTOMATIC",
  publisherPlatforms: [],
  facebookPositions: [],
  instagramPositions: [],
  adSetDailyBudget: "",
  adSetLifetimeBudget: "",
  billingEvent: "IMPRESSIONS",
  optimizationGoal: "APP_INSTALLS",
  bidAmount: "",
  startTime: "",
  endTime: "",
  creativeName: "",
  facebookPageId: "",
  instagramActorId: "",
  primaryText: "",
  headline: "",
  description: "",
  callToAction: "LEARN_MORE",
  imageHash: "",
  imageUrl: "",
  linkUrl: "",
  adName: "",
  trackingSpecs: "",
}

type RequestStatus = "draft" | "valid" | "ready"

export { OBJECTIVE_OPTIMIZATION_MAP }

export function CreateRequestContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<RequestFormState>(defaultFormState)
  const [status, setStatus] = useState<RequestStatus>("draft")
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [isDirty, setIsDirty] = useState(false)

  const updateForm = (patch: Partial<RequestFormState>) => {
    setForm(prev => {
      const next = { ...prev, ...patch }
      // Auto-fix: if objective changes, reset optimizationGoal to first allowed
      if (patch.campaignObjective && patch.campaignObjective !== prev.campaignObjective) {
        const allowed = OBJECTIVE_OPTIMIZATION_MAP[patch.campaignObjective]
        if (allowed && !allowed.includes(next.optimizationGoal)) {
          next.optimizationGoal = allowed[0]
        }
      }
      return next
    })
    setIsDirty(true)
    if (status === "valid" || status === "ready") setStatus("draft")
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setIsDirty(false)
    toast({ title: "Draft saved", description: "Your request has been saved as a draft." })
  }

  const handleValidate = async () => {
    setValidating(true)
    setValidationErrors({})
    await new Promise(r => setTimeout(r, 1200))
    setValidating(false)

    const errors: Record<string, string[]> = {}

    // Account & Integration
    if (!form.adAccountId) errors["Account & Integration"] = ["Meta Ad Account is required"]
    if (!form.appId) (errors["App Mapping"] ??= []).push("App selection is required")

    // App Mapping
    if (form.appId) {
      // Simulated: app has no mapping in meta
      // (errors["App Mapping"] ??= []).push("App mapping missing application_id")
    }

    // Campaign
    if (!form.campaignName) (errors["Campaign"] ??= []).push("Campaign Name is required")
    if (!form.campaignObjective) (errors["Campaign"] ??= []).push("Campaign Objective is required")
    if (form.budgetStrategy === "CBO" && !form.campaignDailyBudget && !form.campaignLifetimeBudget) {
      (errors["Campaign"] ??= []).push("Campaign budget required when using CBO strategy")
    }

    // Ad Set
    if (!form.adSetName) (errors["Ad Set"] ??= []).push("Ad Set Name is required")
    if (form.countries.length === 0) (errors["Ad Set"] ??= []).push("No countries selected")
    if (form.budgetStrategy === "ABO" && !form.adSetDailyBudget && !form.adSetLifetimeBudget) {
      (errors["Ad Set"] ??= []).push("Ad Set budget required when using ABO strategy")
    }
    if (!form.startTime) (errors["Ad Set"] ??= []).push("Start time is required")
    if (form.campaignObjective) {
      const allowed = OBJECTIVE_OPTIMIZATION_MAP[form.campaignObjective] ?? []
      if (!allowed.includes(form.optimizationGoal)) {
        (errors["Ad Set"] ??= []).push(`Optimization goal "${form.optimizationGoal}" is not compatible with objective "${form.campaignObjective}"`)
      }
    }

    // Creative
    if (!form.creativeName) (errors["Creative"] ??= []).push("Creative Name is required")
    if (!form.facebookPageId) (errors["Creative"] ??= []).push("Facebook Page ID is required")
    if (!form.primaryText) (errors["Creative"] ??= []).push("Primary Text is required")
    if (!form.headline) (errors["Creative"] ??= []).push("Headline is required")
    if (!form.callToAction) (errors["Creative"] ??= []).push("Call To Action is required")
    if (!form.imageHash && !form.imageUrl) (errors["Creative"] ??= []).push("Creative missing image (hash or URL required)")

    // Ad
    if (!form.adName) (errors["Ad"] ??= []).push("Ad Name is required")

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setStatus("draft")
      toast({ title: "Validation failed", description: "Please fix the errors below.", variant: "destructive" })
    } else {
      setStatus("ready")
      toast({ title: "Validation passed", description: "Request is ready to submit for approval." })
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    setSubmitting(false)
    setSubmitOpen(false)
    toast({ title: "Request submitted for approval", description: "You will be notified when the request is reviewed." })
    router.push("/meta-ads/requests")
  }

  // Token state — simulated based on account selection
  const tokenState: "none" | "ready" | "expired" | "missing_permissions" | "disabled" =
    !form.adAccountId
      ? "none"
      : form.adAccountId === "act_444555666"
        ? "expired"
        : form.adAccountId === "act_777888999"
          ? "disabled"
          : "ready"

  const isSubmitBlocked = status !== "ready" || tokenState === "expired" || tokenState === "missing_permissions" || tokenState === "disabled"

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <Link href="/meta-ads/requests" className="hover:text-slate-700">Meta Ads</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/meta-ads/requests" className="hover:text-slate-700">Requests</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">Create</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Create Meta Campaign Request</h1>
          <p className="text-sm text-slate-500 mt-0.5">Internal request only. Meta objects are created after approval and execution — all in PAUSED state.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => isDirty ? setDiscardOpen(true) : router.push("/meta-ads/requests")}>
            Discard
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleValidate} disabled={validating}>
            {validating ? "Validating..." : "Validate"}
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            disabled={isSubmitBlocked || submitting}
            onClick={() => setSubmitOpen(true)}
            title={tokenState !== "ready" ? "Integration token issue — cannot submit" : status !== "ready" ? "Validate first" : ""}
          >
            Submit for Approval
          </Button>
        </div>
      </div>

      {/* Strong execution-awareness banner */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900">
          <strong>This request will NOT create a live campaign.</strong> Meta objects (Campaign, Ad Set, Ad) will only be created after internal approval and execution — all starting in <strong>PAUSED</strong> state.
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left column — form */}
        <div className="flex-1 min-w-0 space-y-4">
          <AccountAppSection form={form} onChange={updateForm} tokenState={tokenState} />
          <CampaignSettingsSection form={form} onChange={updateForm} />
          <AdSetAudienceSection form={form} onChange={updateForm} />
          <AdSetBudgetSection form={form} onChange={updateForm} />
          <CreativeSection form={form} onChange={updateForm} />
          <AdSection form={form} onChange={updateForm} />
        </div>

        {/* Right rail — sticky summary */}
        <div className="w-72 flex-shrink-0 sticky top-20">
          <RequestSummaryRail
            form={form}
            status={status}
            validationErrors={validationErrors}
            tokenState={tokenState}
          />
        </div>
      </div>

      {/* Submit Confirmation */}
      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Approval?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit your campaign request for internal review. No Meta objects will be created at this stage. Upon approval, Campaign, Ad Set, and Ad will be created in <strong>PAUSED</strong> state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => { e.preventDefault(); handleSubmit() }}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit for Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => router.push("/meta-ads/requests")}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
