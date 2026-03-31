"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { invalidateCache, useApi } from "@/hooks/use-api"
import { hasScreenFunction } from "@/lib/auth"
import { metaIntegrationsApi, metaReferenceApi, metaRequestsApi } from "@/lib/api/meta-ads"
import {
  createEmptyCarouselCard,
  createEmptyMediaSelection,
  detailDtoToFormState,
  formStateToCreateDto,
  formStateToUpdateDto,
  groupValidationErrors,
} from "@/lib/meta-ads/mappers"
import type {
  GroupedValidationErrors,
  MetaCampaignRequestDetailDto,
  MetaRequestFormState,
  MetaRequestStatus,
} from "@/types/meta-ads"
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { OBJECTIVE_OPTIMIZATION_MAP } from "./constants"
import { AccountAppSection } from "./section-account-app"
import { CampaignSettingsSection } from "./section-campaign-settings"
import { AdSetAudienceSection } from "./section-adset-audience"
import { AdSetBudgetSection } from "./section-adset-budget"
import { CreativeSection } from "./section-creative"
import { AdSection } from "./section-ad"
import { RequestSummaryRail } from "./summary-rail"

export type RequestFormState = MetaRequestFormState

const defaultFormState: RequestFormState = {
  adAccountId: "",
  appRowId: "",
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
  creativeType: "SINGLE_IMAGE",
  creativeName: "",
  facebookPageId: "",
  instagramActorId: "",
  singleImagePrimaryText: "",
  singleImageHeadline: "",
  singleImageDescription: "",
  singleImageCallToAction: "LEARN_MORE",
  singleImageLinkUrl: "",
  singleImageImage: createEmptyMediaSelection("meta_ref"),
  singleVideoPrimaryText: "",
  singleVideoHeadline: "",
  singleVideoDescription: "",
  singleVideoCallToAction: "LEARN_MORE",
  singleVideoLinkUrl: "",
  singleVideoVideo: createEmptyMediaSelection("meta_ref"),
  singleVideoThumbnail: createEmptyMediaSelection("meta_ref"),
  carouselPrimaryText: "",
  carouselCallToAction: "LEARN_MORE",
  carouselCards: [createEmptyCarouselCard(), createEmptyCarouselCard()],
  existingPostId: "",
  adName: "",
  trackingSpecs: "",
}

type TokenState = "none" | "ready" | "not_tested" | "expired" | "missing_permissions" | "invalid" | "disabled"

function buildIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "")
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`
}

function parseValidationErrorsJson(validationErrorsJson?: string | null): GroupedValidationErrors {
  if (!validationErrorsJson) return {}

  try {
    const parsed = JSON.parse(validationErrorsJson) as string[]
    return groupValidationErrors(Array.isArray(parsed) ? parsed : [])
  } catch {
    return {}
  }
}

function invalidateMetaRequestCaches(status?: MetaRequestStatus | null) {
  const baseKeys = [
    "meta-requests:list:all:all:all",
    "meta-requests:list:draft:all:all",
    "meta-requests:list:pending_approval:all:all",
    "meta-requests:list:approved:all:all",
    "meta-requests:list:failed:all:all",
  ]

  if (status && !baseKeys.includes(`meta-requests:list:${status}:all:all`)) {
    baseKeys.push(`meta-requests:list:${status}:all:all`)
  }

  baseKeys.forEach((key) => invalidateCache(key))
}

function deriveTokenState(input: {
  adAccountId: string
  canViewMetaAccounts: boolean
  selectedAdAccountActive?: boolean
  integrationEnabled?: boolean
  hasAccessToken?: boolean
  tokenStatus?: string | null
}): TokenState {
  if (!input.adAccountId) return "none"
  if (!input.selectedAdAccountActive || !input.integrationEnabled) return "disabled"
  if (!input.canViewMetaAccounts) return "none"

  switch (input.tokenStatus) {
    case "VALID":
      return "ready"
    case "EXPIRED":
      return "expired"
    case "MISSING_SCOPES":
      return "missing_permissions"
    case "ACCESS_DENIED":
    case "INVALID":
      return "invalid"
    case "NOT_TESTED":
    default:
      return input.hasAccessToken ? "not_tested" : "invalid"
  }
}

interface Props {
  requestId?: number
}

export function CreateRequestContent({ requestId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEditMode = requestId != null && Number.isFinite(requestId)
  const numericRequestId = isEditMode ? Number(requestId) : null
  const canViewMetaAccounts = hasScreenFunction("s-meta-accounts", "view")

  const [form, setForm] = useState<RequestFormState>(defaultFormState)
  const [draftId, setDraftId] = useState<number | null>(null)
  const [serverStatus, setServerStatus] = useState<MetaRequestStatus | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(buildIdempotencyKey)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<GroupedValidationErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [loadedRequestId, setLoadedRequestId] = useState<number | null>(null)

  const {
    data: referenceData,
    loading: referenceLoading,
    error: referenceError,
  } = useApi(
    () => metaReferenceApi.getCreateCampaignReference(),
    { cacheKey: "meta-reference:create-campaign" }
  )

  const {
    data: editDetail,
    loading: editLoading,
    error: editError,
  } = useApi<MetaCampaignRequestDetailDto>(
    () => metaRequestsApi.getById(numericRequestId as number),
    {
      enabled: numericRequestId != null,
      cacheKey: numericRequestId != null ? `meta-request:${numericRequestId}` : "meta-request:new",
    }
  )

  const { data: integrations } = useApi(
    () => metaIntegrationsApi.list(),
    {
      enabled: canViewMetaAccounts,
      cacheKey: "meta-integrations:list",
    }
  )

  const {
    data: accountScopedAppMappings,
    loading: accountScopedAppMappingsLoading,
    error: accountScopedAppMappingsError,
  } = useApi(
    () => metaReferenceApi.getAdAccountAppMappings(Number(form.adAccountId)),
    {
      enabled: !!form.adAccountId,
      cacheKey: form.adAccountId ? `meta-reference:ad-account:${form.adAccountId}:app-mappings` : "meta-reference:ad-account:none:app-mappings",
    }
  )

  const selectedAdAccount = referenceData?.adAccounts.find((account) => account.id.toString() === form.adAccountId)
  const availableAppMappings = form.adAccountId ? (accountScopedAppMappings ?? []) : []
  const selectedAppMapping = availableAppMappings.find((mapping) => mapping.appRowId.toString() === form.appRowId)
    ?? referenceData?.appMappings.find((mapping) => mapping.appRowId.toString() === form.appRowId)
  const selectedIntegration = integrations?.find((integration) => integration.id === selectedAdAccount?.metaIntegrationId)

  const tokenState = deriveTokenState({
    adAccountId: form.adAccountId,
    canViewMetaAccounts,
    selectedAdAccountActive: selectedAdAccount?.isActive,
    integrationEnabled: selectedIntegration?.isEnabled,
    hasAccessToken: selectedIntegration?.hasAccessToken,
    tokenStatus: selectedIntegration?.tokenStatus,
  })

  const isSubmitBlocked = submitting || saving || validating || tokenState === "expired" || tokenState === "missing_permissions" || tokenState === "invalid" || tokenState === "disabled"

  const updateForm = (patch: Partial<RequestFormState>) => {
    setForm((previous) => {
      const next = { ...previous, ...patch }

      if (patch.campaignObjective && patch.campaignObjective !== previous.campaignObjective) {
        const allowed = OBJECTIVE_OPTIMIZATION_MAP[patch.campaignObjective]
        if (allowed && !allowed.includes(next.optimizationGoal)) {
          next.optimizationGoal = allowed[0]
        }
      }

      if (patch.objective && patch.objective !== previous.objective && !patch.campaignObjective) {
        next.campaignObjective = patch.objective
      }

      return next
    })

    setIsDirty(true)
  }

  const syncFromDetail = (statusDetail: MetaCampaignRequestDetailDto) => {
    setDraftId(statusDetail.id)
    setServerStatus(statusDetail.status)
    setIdempotencyKey(statusDetail.idempotencyKey || idempotencyKey)
    setValidationErrors(parseValidationErrorsJson(statusDetail.validationErrorsJson))
    setIsDirty(false)
  }

  useEffect(() => {
    if (!editDetail || loadedRequestId === editDetail.id) return
    setForm(detailDtoToFormState(editDetail))
    syncFromDetail(editDetail)
    setLoadedRequestId(editDetail.id)
  }, [editDetail, loadedRequestId])

  const persistDraft = async ({ silent }: { silent?: boolean } = {}) => {
    const previousStatus = serverStatus
    const response = draftId
      ? await metaRequestsApi.update(draftId, formStateToUpdateDto(form))
      : await metaRequestsApi.create(formStateToCreateDto(form, idempotencyKey))

    syncFromDetail(response)
    invalidateMetaRequestCaches(response.status)
    invalidateCache("meta-reference:create-campaign")
    invalidateCache(`meta-request:${response.id}`)

    if (!silent) {
      const sentBackForApproval = !!previousStatus && previousStatus !== "draft" && response.status === "pending_approval"
      toast({
        title: sentBackForApproval ? "Changes saved" : draftId ? "Draft updated" : "Draft saved",
        description: sentBackForApproval
          ? "Request was returned for approval."
          : "Your Meta campaign request draft has been saved.",
      })
    }

    return response
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const saved = await persistDraft()
      if (isEditMode && saved.status === "pending_approval") {
        router.push(`/meta-ads/requests/${saved.id}`)
      }
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Failed to save draft."
      toast({ title: "Save failed", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    try {
      setValidating(true)
      const detail = draftId || isDirty ? await persistDraft({ silent: true }) : null
      const currentDraftId = detail?.id ?? draftId

      if (!currentDraftId) {
        throw new Error("Draft must be created before validation.")
      }

      const result = await metaRequestsApi.validate(currentDraftId)
      const groupedErrors = groupValidationErrors(result.errors)
      setValidationErrors(groupedErrors)
      invalidateCache(`meta-request:${currentDraftId}`)

      if (result.isValid) {
        toast({ title: "Validation passed", description: "Request is ready to submit for approval." })
      } else {
        toast({ title: "Validation failed", description: "Please fix the validation issues before submitting.", variant: "destructive" })
      }
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Validation failed."
      toast({ title: "Validation failed", description: message, variant: "destructive" })
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const detail = !draftId || isDirty ? await persistDraft({ silent: true }) : null
      const currentDraftId = detail?.id ?? draftId
      if (!currentDraftId) throw new Error("Draft must be saved before submitting.")

      const submitted = await metaRequestsApi.submit(currentDraftId)
      syncFromDetail(submitted)
      invalidateMetaRequestCaches(submitted.status)
      invalidateCache(`meta-request:${submitted.id}`)
      setSubmitOpen(false)
      toast({ title: "Request submitted for approval" })
      router.push(`/meta-ads/requests/${submitted.id}`)
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Submit failed."
      toast({ title: "Submit failed", description: message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const discardHref = isEditMode && draftId ? `/meta-ads/requests/${draftId}` : "/meta-ads/requests"
  const showSubmitButton = !isEditMode || serverStatus === null || serverStatus === "draft"

  if (referenceLoading || (isEditMode && editLoading && loadedRequestId == null)) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading request form...
      </div>
    )
  }

  if (referenceError || !referenceData || (isEditMode && editError)) {
    return (
      <div className="py-24 text-center text-sm text-red-600">
        {editError?.message ?? referenceError?.message ?? "Unable to load Meta Ads reference data."}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <Link href="/meta-ads/requests" className="hover:text-slate-700">
              Meta Ads
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/meta-ads/requests" className="hover:text-slate-700">
              Requests
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 font-medium">{isEditMode ? "Edit" : "Create"}</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">{isEditMode ? "Edit Meta Campaign Request" : "Create Meta Campaign Request"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEditMode
              ? "Update the request payload. Saving changes for a non-draft request sends it back for approval."
              : "Internal request only. Meta objects are created after approval and execution, and all objects start in PAUSED state."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => (isDirty ? setDiscardOpen(true) : router.push(discardHref))}>
            Discard
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleSaveDraft()} disabled={saving || referenceLoading || editLoading}>
            {saving ? "Saving..." : isEditMode ? "Save Changes" : draftId ? "Update Draft" : "Save Draft"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleValidate()} disabled={validating || referenceLoading || editLoading}>
            {validating ? "Validating..." : "Validate"}
          </Button>
          {showSubmitButton ? (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              disabled={isSubmitBlocked}
              onClick={() => setSubmitOpen(true)}
              title={tokenState !== "ready" && tokenState !== "none" ? "Integration readiness issue" : ""}
            >
              Submit for Approval
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-900">
          {isEditMode ? (
            <>
              <strong>Editing an approved, rejected, completed, or failed request will require approval again.</strong> Existing execution history stays visible in activity logs, but the request itself returns to the approval flow after changes are saved.
            </>
          ) : (
            <>
              <strong>This request will NOT create a live campaign.</strong> Meta objects (Campaign, Ad Set, Ad) are created only after internal approval and execution, all starting in <strong>PAUSED</strong> state.
            </>
          )}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <AccountAppSection
            form={form}
            onChange={updateForm}
            tokenState={tokenState}
            adAccounts={referenceData.adAccounts}
            appMappings={availableAppMappings}
            selectedAppMapping={selectedAppMapping}
            appMappingsLoading={accountScopedAppMappingsLoading}
            appMappingsMessage={accountScopedAppMappingsError?.message ?? null}
            objectives={referenceData.objectives}
            integrationName={selectedIntegration?.displayName}
          />
          <CampaignSettingsSection
            form={form}
            onChange={updateForm}
            objectives={referenceData.objectives}
            bidStrategies={referenceData.bidStrategies}
          />
          <AdSetAudienceSection form={form} onChange={updateForm} />
          <AdSetBudgetSection form={form} onChange={updateForm} currencyCode={selectedAdAccount?.currency} />
          <CreativeSection form={form} onChange={updateForm} />
          <AdSection form={form} onChange={updateForm} />
        </div>

        <div className="w-72 flex-shrink-0 sticky top-20">
          <RequestSummaryRail
            form={form}
            serverStatus={serverStatus}
            validationErrors={validationErrors}
            tokenState={tokenState}
            selectedAppMapping={selectedAppMapping}
            isPersisted={!!draftId}
          />
        </div>
      </div>

      {showSubmitButton ? (
        <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit for Approval?</AlertDialogTitle>
              <AlertDialogDescription>
                This will submit your campaign request for internal review. No Meta objects will be created at this stage. After approval, Campaign, Ad Set, Creative, and Ad will be created in <strong>PAUSED</strong> state.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={submitting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
              >
                {submitting ? "Submitting..." : "Submit for Approval"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All unsaved edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => router.push(discardHref)}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}







