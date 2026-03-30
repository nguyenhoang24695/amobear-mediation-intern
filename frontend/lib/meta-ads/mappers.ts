import type {
  CreateMetaCampaignRequestDto,
  GroupedValidationErrors,
  MetaCampaignRequestDetailDto,
  MetaRequestFormState,
  UpdateMetaCampaignRequestDto,
} from "@/types/meta-ads"

function parseOptionalLong(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function parseOptionalDate(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? new Date(trimmed).toISOString() : null
}

function parseGender(value: string): string[] {
  if (value === "ALL") return []
  if (value === "MALE") return ["male"]
  if (value === "FEMALE") return ["female"]
  return []
}

function parseBudgetStrategy(form: MetaRequestFormState) {
  return {
    campaignDailyBudget: form.budgetStrategy === "CBO" ? parseOptionalLong(form.campaignDailyBudget) : null,
    campaignLifetimeBudget: form.budgetStrategy === "CBO" ? parseOptionalLong(form.campaignLifetimeBudget) : null,
    adSetDailyBudget: form.budgetStrategy === "ABO" ? parseOptionalLong(form.adSetDailyBudget) : null,
    adSetLifetimeBudget: form.budgetStrategy === "ABO" ? parseOptionalLong(form.adSetLifetimeBudget) : null,
  }
}

export function formStateToCreateDto(form: MetaRequestFormState, idempotencyKey?: string): CreateMetaCampaignRequestDto {
  const budgets = parseBudgetStrategy(form)
  return {
    metaAdAccountId: Number(form.adAccountId),
    appRowId: Number(form.appRowId),
    idempotencyKey,
    campaign: {
      name: form.campaignName.trim(),
      objective: form.campaignObjective.trim(),
      buyingType: form.buyingType.trim() || null,
      dailyBudget: budgets.campaignDailyBudget,
      lifetimeBudget: budgets.campaignLifetimeBudget,
      bidStrategy: form.bidStrategy.trim() || null,
      specialAdCategories: form.specialAdCategories,
    },
    adSet: {
      name: form.adSetName.trim(),
      dailyBudget: budgets.adSetDailyBudget,
      lifetimeBudget: budgets.adSetLifetimeBudget,
      billingEvent: form.billingEvent.trim(),
      optimizationGoal: form.optimizationGoal.trim(),
      bidAmount: parseOptionalLong(form.bidAmount),
      startTime: parseOptionalDate(form.startTime),
      endTime: parseOptionalDate(form.endTime),
      countries: form.countries,
      ageMin: Number.isFinite(form.ageMin) ? form.ageMin : null,
      ageMax: Number.isFinite(form.ageMax) ? form.ageMax : null,
      genders: parseGender(form.gender),
      devicePlatforms: [],
      userOs: [],
      publisherPlatforms: form.placementMode === "MANUAL" ? form.publisherPlatforms : [],
      facebookPositions: form.placementMode === "MANUAL" ? form.facebookPositions : [],
      instagramPositions: form.placementMode === "MANUAL" ? form.instagramPositions : [],
    },
    creative: {
      name: form.creativeName.trim(),
      pageId: form.facebookPageId.trim() || null,
      instagramActorId: form.instagramActorId.trim() || null,
      message: form.primaryText.trim() || null,
      headline: form.headline.trim() || null,
      description: form.description.trim() || null,
      callToActionType: form.callToAction.trim() || null,
      imageHash: form.imageHash.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      linkUrl: form.linkUrl.trim() || null,
    },
    ad: {
      name: form.adName.trim(),
      status: "PAUSED",
      trackingSpecsJson: form.trackingSpecs.trim() || null,
    },
  }
}

export function formStateToUpdateDto(form: MetaRequestFormState): UpdateMetaCampaignRequestDto {
  const createDto = formStateToCreateDto(form)
  return {
    metaAdAccountId: createDto.metaAdAccountId,
    appRowId: createDto.appRowId,
    campaign: createDto.campaign,
    adSet: createDto.adSet,
    creative: createDto.creative,
    ad: createDto.ad,
  }
}

export function detailDtoToFormState(detail: MetaCampaignRequestDetailDto): MetaRequestFormState {
  const payload = detail.payload
  const genders = payload.adSet.genders
  const gender =
    genders.length === 0
      ? "ALL"
      : genders.some((value) => value.toLowerCase() === "female")
        ? "FEMALE"
        : "MALE"

  return {
    adAccountId: detail.metaAdAccountId.toString(),
    appRowId: detail.appRowId.toString(),
    objective: payload.campaign.objective,
    budgetStrategy: payload.campaign.dailyBudget || payload.campaign.lifetimeBudget ? "CBO" : "ABO",
    campaignName: payload.campaign.name ?? "",
    buyingType: payload.campaign.buyingType ?? "AUCTION",
    campaignObjective: payload.campaign.objective ?? "",
    specialAdCategories: payload.campaign.specialAdCategories ?? [],
    bidStrategy: payload.campaign.bidStrategy ?? "",
    campaignDailyBudget: payload.campaign.dailyBudget?.toString() ?? "",
    campaignLifetimeBudget: payload.campaign.lifetimeBudget?.toString() ?? "",
    adSetName: payload.adSet.name ?? "",
    countries: payload.adSet.countries ?? [],
    ageMin: payload.adSet.ageMin ?? 18,
    ageMax: payload.adSet.ageMax ?? 65,
    gender,
    placementMode: payload.adSet.publisherPlatforms.length > 0 || payload.adSet.facebookPositions.length > 0 || payload.adSet.instagramPositions.length > 0 ? "MANUAL" : "AUTOMATIC",
    publisherPlatforms: payload.adSet.publisherPlatforms ?? [],
    facebookPositions: payload.adSet.facebookPositions ?? [],
    instagramPositions: payload.adSet.instagramPositions ?? [],
    adSetDailyBudget: payload.adSet.dailyBudget?.toString() ?? "",
    adSetLifetimeBudget: payload.adSet.lifetimeBudget?.toString() ?? "",
    billingEvent: payload.adSet.billingEvent ?? "IMPRESSIONS",
    optimizationGoal: payload.adSet.optimizationGoal ?? "APP_INSTALLS",
    bidAmount: payload.adSet.bidAmount?.toString() ?? "",
    startTime: payload.adSet.startTime ? payload.adSet.startTime.slice(0, 16) : "",
    endTime: payload.adSet.endTime ? payload.adSet.endTime.slice(0, 16) : "",
    creativeName: payload.creative.name ?? "",
    facebookPageId: payload.creative.pageId ?? "",
    instagramActorId: payload.creative.instagramActorId ?? "",
    primaryText: payload.creative.message ?? "",
    headline: payload.creative.headline ?? "",
    description: payload.creative.description ?? "",
    callToAction: payload.creative.callToActionType ?? "LEARN_MORE",
    imageHash: payload.creative.imageHash ?? "",
    imageUrl: payload.creative.imageUrl ?? "",
    linkUrl: payload.creative.linkUrl ?? "",
    adName: payload.ad.name ?? "",
    trackingSpecs: payload.ad.trackingSpecsJson ?? "",
  }
}

export function groupValidationErrors(errors: string[]): GroupedValidationErrors {
  return errors.reduce<GroupedValidationErrors>((groups, error) => {
    const normalized = error.toLowerCase()
    let key = "General"
    if (normalized.includes("account") || normalized.includes("integration")) key = "Account & Integration"
    else if (normalized.includes("mapping") || normalized.includes("app ")) key = "App Mapping"
    else if (normalized.includes("campaign")) key = "Campaign"
    else if (normalized.includes("ad set") || normalized.includes("targeting") || normalized.includes("country") || normalized.includes("age_")) key = "Ad Set"
    else if (normalized.includes("creative") || normalized.includes("page_id") || normalized.includes("image_") || normalized.includes("link_url")) key = "Creative"
    else if (normalized.startsWith("ad ")) key = "Ad"

    if (!groups[key]) groups[key] = []
    groups[key].push(error)
    return groups
  }, {})
}

export function formatMetaRequestId(id: number | string): string {
  const raw = typeof id === "number" ? id.toString() : id
  return `REQ-${raw.padStart(6, "0")}`
}

export function formatUserGuidShort(value?: string | null): string {
  if (!value) return "—"
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}
