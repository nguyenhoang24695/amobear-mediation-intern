import type {
  CreateMetaCampaignRequestDto,
  GroupedValidationErrors,
  MetaCampaignRequestDetailDto,
  MetaCarouselCardDraftDto,
  MetaCarouselCardFormState,
  MetaFlexibleAssetFormState,
  MetaCreativeDraftDto,
  MetaCreativeMediaMode,
  MetaCreativeMediaSourceDto,
  MetaRequestAssetSelectionState,
  MetaRequestFormState,
  UpdateMetaCampaignRequestDto,
} from "@/types/meta-ads"
import { buildMetaRequestAssetContentUrl } from "@/lib/meta-ads/media-preview"

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createEmptyMediaSelection(mode: MetaCreativeMediaMode = "meta_ref"): MetaRequestAssetSelectionState {
  return {
    mode,
    metaRefSource: "manual",
    imageHash: "",
    imageUrl: "",
    videoId: "",
    uploadedAssetId: null,
    uploadedAssetName: "",
    uploadedAssetPreviewUrl: "",
    metaPreviewUrl: "",
    metaPreviewRequiresAuth: false,
    metaPlayableUrl: "",
    metaAssetId: "",
    metaAssetName: "",
    metaAssetType: "",
    metaAdAccountId: "",
  }
}

export function createEmptyCarouselCard(): MetaCarouselCardFormState {
  return {
    id: createId(),
    headline: "",
    description: "",
    linkUrl: "",
    image: createEmptyMediaSelection("meta_ref"),
  }
}

export function createEmptyFlexibleAsset(assetType: "IMAGE" | "VIDEO" = "IMAGE"): MetaFlexibleAssetFormState {
  return {
    id: createId(),
    assetType,
    image: createEmptyMediaSelection("meta_ref"),
    video: createEmptyMediaSelection("meta_ref"),
    thumbnail: createEmptyMediaSelection("meta_ref"),
  }
}
function sanitizeTextVariations(values: string[] | null | undefined, fallback?: string | null): string[] {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter((value, index, array) => !!value && array.indexOf(value) === index)
    .slice(0, 5)

  if (normalized.length > 0) return normalized

  const fallbackValue = fallback?.trim()
  return fallbackValue ? [fallbackValue] : []
}

function getFirstVariation(values: string[] | null | undefined, fallback?: string | null): string {
  return sanitizeTextVariations(values, fallback)[0] ?? ""
}

function parseOptionalAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replaceAll(",", "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed)
  if (!match) return null

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const date = new Date(year, month - 1, day, hour, minute, 0, 0)

  if (Number.isNaN(date.getTime())) return null
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null
  }

  return date.toISOString()
}


function inferGeoModeFromDraft(adSet: CreateMetaCampaignRequestDto["adSet"]): MetaRequestFormState["geoMode"] {
  const normalized = (adSet.geoMode ?? "").trim().toUpperCase()
  if (normalized === "GLOBAL" || normalized === "REGION" || normalized === "CITY" || normalized === "COUNTRY") {
    return normalized as MetaRequestFormState["geoMode"]
  }

  if ((adSet.cityTargets?.length ?? 0) > 0) return "CITY"
  if ((adSet.regionKeys?.length ?? 0) > 0) return "REGION"
  if ((adSet.countries?.length ?? 0) > 0) return "COUNTRY"
  return "GLOBAL"
}
function inferPerformanceGoalState(adSet: CreateMetaCampaignRequestDto["adSet"]): Pick<MetaRequestFormState, "performanceGoalType" | "performanceGoalEventName" | "performanceGoalValueType" | "optimizationGoal"> {
  const optimizationGoal = (adSet.optimizationGoal ?? "APP_INSTALLS").trim().toUpperCase()
  const performanceGoalType = (adSet.performanceGoalType ?? "").trim().toUpperCase()

  if (performanceGoalType === "APP_EVENT" || performanceGoalType === "VALUE" || performanceGoalType === "APP_INSTALLS") {
    return {
      performanceGoalType,
      performanceGoalEventName: adSet.performanceGoalEventName ?? "",
      performanceGoalValueType: adSet.performanceGoalValueType ?? "",
      optimizationGoal,
    }
  }

  if (optimizationGoal === "VALUE" || optimizationGoal === "IN_APP_VALUE") {
    return {
      performanceGoalType: "VALUE",
      performanceGoalEventName: "",
      performanceGoalValueType: adSet.performanceGoalValueType ?? "IN_APP_PURCHASE",
      optimizationGoal: "VALUE",
    }
  }

  if (optimizationGoal === "APP_INSTALLS") {
    return {
      performanceGoalType: "APP_INSTALLS",
      performanceGoalEventName: "",
      performanceGoalValueType: "",
      optimizationGoal: "APP_INSTALLS",
    }
  }

  return {
    performanceGoalType: "APP_EVENT",
    performanceGoalEventName: adSet.performanceGoalEventName ?? "",
    performanceGoalValueType: "",
    optimizationGoal: optimizationGoal || "CONVERSIONS",
  }
}
function parseGender(value: string): string[] {
  if (value === "ALL") return []
  if (value === "MALE") return ["male"]
  if (value === "FEMALE") return ["female"]
  return []
}

function parseBudgetStrategy(form: MetaRequestFormState) {
  return {
    campaignDailyBudget: form.budgetStrategy === "CBO" ? parseOptionalAmount(form.campaignDailyBudget) : null,
    campaignLifetimeBudget: form.budgetStrategy === "CBO" ? parseOptionalAmount(form.campaignLifetimeBudget) : null,
    adSetDailyBudget: form.budgetStrategy === "ABO" ? parseOptionalAmount(form.adSetDailyBudget) : null,
    adSetLifetimeBudget: form.budgetStrategy === "ABO" ? parseOptionalAmount(form.adSetLifetimeBudget) : null,
  }
}

function buildMediaSource(selection: MetaRequestAssetSelectionState, kind: "image" | "video"): MetaCreativeMediaSourceDto | null {
  if (selection.uploadedAssetId) {
    return {
      mode: "uploaded_asset",
      uploadedAssetId: selection.uploadedAssetId,
    }
  }

  if (selection.mode === "external_url") {
    if (!selection.imageUrl.trim()) return null
    return {
      mode: "external_url",
      imageUrl: selection.imageUrl.trim(),
    }
  }

  if (kind === "video") {
    if (!selection.videoId.trim()) return null
    return {
      mode: "meta_ref",
      videoId: selection.videoId.trim(),
    }
  }

  if (!selection.imageHash.trim() && !selection.imageUrl.trim()) return null
  return {
    mode: selection.imageHash.trim() ? "meta_ref" : "external_url",
    imageHash: selection.imageHash.trim() || null,
    imageUrl: selection.imageUrl.trim() || null,
  }
}

function mediaSourceToSelection(source: MetaCreativeMediaSourceDto | null | undefined, kind: "image" | "video"): MetaRequestAssetSelectionState {
  const mode = source?.mode ?? (source?.uploadedAssetId ? "uploaded_asset" : source?.videoId ? "meta_ref" : source?.imageHash ? "meta_ref" : source?.imageUrl ? "external_url" : kind === "video" ? "meta_ref" : "meta_ref")
  return {
    mode,
    metaRefSource: "manual",
    imageHash: source?.imageHash ?? "",
    imageUrl: source?.imageUrl ?? "",
    videoId: source?.videoId ?? "",
    uploadedAssetId: source?.uploadedAssetId ?? null,
    uploadedAssetName: source?.uploadedAssetId ? `Asset #${source.uploadedAssetId}` : "",
    uploadedAssetPreviewUrl: source?.uploadedAssetId ? buildMetaRequestAssetContentUrl(source.uploadedAssetId) : "",
    metaPreviewUrl: "",
    metaPreviewRequiresAuth: false,
    metaPlayableUrl: "",
    metaAssetId: "",
    metaAssetName: "",
    metaAssetType: "",
    metaAdAccountId: "",
  }
}

function getCreativeCommon(creative: MetaCreativeDraftDto) {
  return {
    name: creative.common?.name ?? creative.name ?? "",
    pageId: creative.common?.pageId ?? creative.pageId ?? "",
    instagramActorId: creative.common?.instagramActorId ?? creative.instagramActorId ?? "",
  }
}

function getSingleImageCreative(creative: MetaCreativeDraftDto) {
  return creative.singleImage ?? {
    message: creative.message,
    headline: creative.headline,
    description: creative.description,
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    image: {
      mode: creative.imageHash ? "meta_ref" : creative.imageUrl ? "external_url" : "meta_ref",
      imageHash: creative.imageHash,
      imageUrl: creative.imageUrl,
    },
  }
}

function getSingleVideoCreative(creative: MetaCreativeDraftDto) {
  return creative.singleVideo ?? {
    message: creative.message,
    headline: creative.headline,
    description: creative.description,
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    video: null,
    thumbnail: null,
  }
}

function getCarouselCreative(creative: MetaCreativeDraftDto) {
  return creative.carousel ?? {
    message: creative.message,
    callToActionType: creative.callToActionType,
    cards: [] as MetaCarouselCardDraftDto[],
  }
}

function getFlexibleCreative(creative: MetaCreativeDraftDto) {
  return creative.flexible ?? {
    primaryTexts: [],
    headlines: [],
    callToActionType: creative.callToActionType,
    linkUrl: creative.linkUrl,
    assets: [],
  }
}

export function formStateToCreateDto(form: MetaRequestFormState, idempotencyKey?: string): CreateMetaCampaignRequestDto {
  const budgets = parseBudgetStrategy(form)
  const creativeCommon = {
    name: form.creativeName.trim(),
    pageId: form.facebookPageId.trim() || null,
    instagramActorId: form.instagramActorId.trim() || null,
  }

  const creative: MetaCreativeDraftDto = {
    type: form.creativeType,
    common: creativeCommon,
  }

  if (form.creativeType === "SINGLE_VIDEO") {
    creative.singleVideo = {
      message: getFirstVariation(form.singleVideoPrimaryTexts, form.singleVideoPrimaryText) || null,
      messages: sanitizeTextVariations(form.singleVideoPrimaryTexts, form.singleVideoPrimaryText),
      headline: getFirstVariation(form.singleVideoHeadlines, form.singleVideoHeadline) || null,
      headlines: sanitizeTextVariations(form.singleVideoHeadlines, form.singleVideoHeadline),
      description: form.singleVideoDescription.trim() || null,
      callToActionType: form.singleVideoCallToAction.trim() || null,
      linkUrl: form.singleVideoLinkUrl.trim() || null,
      video: buildMediaSource(form.singleVideoVideo, "video"),
      thumbnail: buildMediaSource(form.singleVideoThumbnail, "image"),
    }
  } else if (form.creativeType === "CAROUSEL_IMAGE") {
    creative.carousel = {
      message: form.carouselPrimaryText.trim() || null,
      callToActionType: form.carouselCallToAction.trim() || null,
      cards: form.carouselCards.map((card) => ({
        headline: card.headline.trim() || null,
        description: card.description.trim() || null,
        linkUrl: card.linkUrl.trim() || null,
        image: buildMediaSource(card.image, "image"),
      })),
    }
  } else if (form.creativeType === "EXISTING_POST") {
    creative.existingPost = {
      sourcePostId: form.existingPostId.trim() || null,
    }
  } else if (form.creativeType === "FLEXIBLE") {
    creative.flexible = {
      primaryTexts: sanitizeTextVariations(form.flexiblePrimaryTexts),
      headlines: sanitizeTextVariations(form.flexibleHeadlines),
      callToActionType: form.flexibleCallToAction.trim() || null,
      linkUrl: form.flexibleLinkUrl.trim() || null,
      assets: form.flexibleAssets.map((asset) => ({
        assetType: asset.assetType,
        image: asset.assetType === "IMAGE" ? buildMediaSource(asset.image, "image") : null,
        video: asset.assetType === "VIDEO" ? buildMediaSource(asset.video, "video") : null,
        thumbnail: asset.assetType === "VIDEO" ? buildMediaSource(asset.thumbnail, "image") : null,
      })),
    }
  } else {
    creative.singleImage = {
      message: getFirstVariation(form.singleImagePrimaryTexts, form.singleImagePrimaryText) || null,
      messages: sanitizeTextVariations(form.singleImagePrimaryTexts, form.singleImagePrimaryText),
      headline: getFirstVariation(form.singleImageHeadlines, form.singleImageHeadline) || null,
      headlines: sanitizeTextVariations(form.singleImageHeadlines, form.singleImageHeadline),
      description: form.singleImageDescription.trim() || null,
      callToActionType: form.singleImageCallToAction.trim() || null,
      linkUrl: form.singleImageLinkUrl.trim() || null,
      image: buildMediaSource(form.singleImageImage, "image"),
    }
  }

  return {
    metaAdAccountId: Number(form.adAccountId),
    appRowId: form.appRowId ? Number(form.appRowId) : null,
    paidMediaAppBindingId: form.paidMediaAppBindingId ? Number(form.paidMediaAppBindingId) : null,
    idempotencyKey,
    campaign: {
      name: form.campaignName.trim(),
      objective: form.campaignObjective.trim(),
      buyingType: form.buyingType.trim() || null,
      dailyBudget: budgets.campaignDailyBudget,
      lifetimeBudget: budgets.campaignLifetimeBudget,
      bidStrategy: form.bidStrategy.trim() || null,
      isAdSetBudgetSharingEnabled: form.budgetStrategy === "ABO" ? form.isAdSetBudgetSharingEnabled : false,
      specialAdCategories: form.specialAdCategories,
    },
    adSet: {
      name: form.adSetName.trim(),
      dailyBudget: budgets.adSetDailyBudget,
      lifetimeBudget: budgets.adSetLifetimeBudget,
      billingEvent: form.billingEvent.trim(),
      optimizationGoal: form.optimizationGoal.trim(),
      performanceGoalType: form.performanceGoalType.trim(),
      performanceGoalEventName: form.performanceGoalType === "APP_EVENT" ? form.performanceGoalEventName.trim() || null : null,
      performanceGoalValueType: form.performanceGoalType === "VALUE" ? form.performanceGoalValueType.trim() || null : null,
      bidAmount: parseOptionalAmount(form.bidAmount),
      advantageAudience: form.advantageAudience,
      startTime: parseOptionalDate(form.startTime),
      endTime: parseOptionalDate(form.endTime),
      geoMode: form.geoMode,
      countries: form.geoMode === "COUNTRY" ? form.countries : [],
      regionKeys: form.geoMode === "REGION" ? form.regionKeys : [],
      cityTargets: form.geoMode === "CITY"
        ? form.cityTargets.map((city) => ({
            key: city.key,
            name: city.name,
            region: city.region ?? null,
            regionId: city.regionId ?? null,
            countryCode: city.countryCode ?? null,
            countryName: city.countryName ?? null,
            type: city.type ?? null,
          }))
        : [],
      ageMin: Number.isFinite(form.ageMin) ? form.ageMin : null,
      ageMax: Number.isFinite(form.ageMax) ? form.ageMax : null,
      genders: parseGender(form.gender),
      devicePlatforms: [],
      userOs: [],
      publisherPlatforms: form.placementMode === "MANUAL" ? form.publisherPlatforms : [],
      facebookPositions: form.placementMode === "MANUAL" ? form.facebookPositions : [],
      instagramPositions: form.placementMode === "MANUAL" ? form.instagramPositions : [],
    },
    creative,
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
    paidMediaAppBindingId: createDto.paidMediaAppBindingId,
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

  const creativeType = payload.creative.type ?? "SINGLE_IMAGE"
  const geoMode = inferGeoModeFromDraft(payload.adSet)
  const performanceGoal = inferPerformanceGoalState(payload.adSet)
  const common = getCreativeCommon(payload.creative)
  const singleImage = getSingleImageCreative(payload.creative)
  const singleVideo = getSingleVideoCreative(payload.creative)
  const carousel = getCarouselCreative(payload.creative)
  const flexible = getFlexibleCreative(payload.creative)

  return {
    adAccountId: detail.metaAdAccountId.toString(),
    appRowId: detail.appRowId?.toString() ?? "",
    paidMediaAppBindingId: detail.paidMediaAppBindingId?.toString() ?? detail.payload.paidMediaAppBindingId?.toString() ?? "",
    objective: payload.campaign.objective,
    budgetStrategy: payload.campaign.dailyBudget || payload.campaign.lifetimeBudget ? "CBO" : "ABO",
    campaignName: payload.campaign.name ?? "",
    buyingType: payload.campaign.buyingType ?? "AUCTION",
    campaignObjective: payload.campaign.objective ?? "",
    specialAdCategories: payload.campaign.specialAdCategories ?? [],
    bidStrategy: payload.campaign.bidStrategy || "LOWEST_COST_WITHOUT_CAP",
    isAdSetBudgetSharingEnabled: payload.campaign.isAdSetBudgetSharingEnabled ?? !(payload.campaign.dailyBudget || payload.campaign.lifetimeBudget),
    campaignDailyBudget: payload.campaign.dailyBudget?.toString() ?? "",
    campaignLifetimeBudget: payload.campaign.lifetimeBudget?.toString() ?? "",
    adSetName: payload.adSet.name ?? "",
    geoMode,
    countries: payload.adSet.countries ?? [],
    regionKeys: payload.adSet.regionKeys ?? [],
    cityTargets: (payload.adSet.cityTargets ?? []).map((city) => ({
      key: city.key ?? "",
      name: city.name ?? "",
      region: city.region ?? null,
      regionId: city.regionId ?? null,
      countryCode: city.countryCode ?? null,
      countryName: city.countryName ?? null,
      type: city.type ?? null,
    })),
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
    optimizationGoal: performanceGoal.optimizationGoal,
    performanceGoalType: performanceGoal.performanceGoalType,
    performanceGoalEventName: performanceGoal.performanceGoalEventName,
    performanceGoalValueType: performanceGoal.performanceGoalValueType,
    bidAmount: payload.adSet.bidAmount?.toString() ?? "",
    advantageAudience: payload.adSet.advantageAudience ?? false,
    startTime: payload.adSet.startTime ? payload.adSet.startTime.slice(0, 16) : "",
    endTime: payload.adSet.endTime ? payload.adSet.endTime.slice(0, 16) : "",
    creativeType,
    creativeName: common.name,
    facebookPageId: common.pageId,
    instagramActorId: common.instagramActorId,
    singleImagePrimaryText: getFirstVariation(singleImage.messages, singleImage.message),
    singleImagePrimaryTexts: sanitizeTextVariations(singleImage.messages, singleImage.message).length > 0 ? sanitizeTextVariations(singleImage.messages, singleImage.message) : [""],
    singleImageHeadline: getFirstVariation(singleImage.headlines, singleImage.headline),
    singleImageHeadlines: sanitizeTextVariations(singleImage.headlines, singleImage.headline).length > 0 ? sanitizeTextVariations(singleImage.headlines, singleImage.headline) : [""],
    singleImageDescription: singleImage.description ?? "",
    singleImageCallToAction: singleImage.callToActionType ?? "LEARN_MORE",
    singleImageLinkUrl: singleImage.linkUrl ?? "",
    singleImageImage: mediaSourceToSelection(singleImage.image, "image"),
    singleVideoPrimaryText: getFirstVariation(singleVideo.messages, singleVideo.message),
    singleVideoPrimaryTexts: sanitizeTextVariations(singleVideo.messages, singleVideo.message).length > 0 ? sanitizeTextVariations(singleVideo.messages, singleVideo.message) : [""],
    singleVideoHeadline: getFirstVariation(singleVideo.headlines, singleVideo.headline),
    singleVideoHeadlines: sanitizeTextVariations(singleVideo.headlines, singleVideo.headline).length > 0 ? sanitizeTextVariations(singleVideo.headlines, singleVideo.headline) : [""],
    singleVideoDescription: singleVideo.description ?? "",
    singleVideoCallToAction: singleVideo.callToActionType ?? "LEARN_MORE",
    singleVideoLinkUrl: singleVideo.linkUrl ?? "",
    singleVideoVideo: mediaSourceToSelection(singleVideo.video, "video"),
    singleVideoThumbnail: mediaSourceToSelection(singleVideo.thumbnail, "image"),
    carouselPrimaryText: carousel.message ?? "",
    carouselCallToAction: carousel.callToActionType ?? "LEARN_MORE",
    carouselCards: (carousel.cards ?? []).map((card) => ({
      id: createId(),
      headline: card.headline ?? "",
      description: card.description ?? "",
      linkUrl: card.linkUrl ?? "",
      image: mediaSourceToSelection(card.image, "image"),
    })),
    flexiblePrimaryTexts: sanitizeTextVariations(flexible.primaryTexts).length > 0 ? sanitizeTextVariations(flexible.primaryTexts) : [""],
    flexibleHeadlines: sanitizeTextVariations(flexible.headlines).length > 0 ? sanitizeTextVariations(flexible.headlines) : [""],
    flexibleCallToAction: flexible.callToActionType ?? "LEARN_MORE",
    flexibleLinkUrl: flexible.linkUrl ?? "",
    flexibleAssets: (flexible.assets ?? []).map((asset) => ({
      id: createId(),
      assetType: (asset.assetType ?? "IMAGE").trim().toUpperCase() === "VIDEO" ? "VIDEO" : "IMAGE",
      image: mediaSourceToSelection(asset.image, "image"),
      video: mediaSourceToSelection(asset.video, "video"),
      thumbnail: mediaSourceToSelection(asset.thumbnail, "image"),
    })),
    existingPostId: payload.creative.existingPost?.sourcePostId ?? "",
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
    else if (normalized.includes("creative") || normalized.includes("page_id") || normalized.includes("image") || normalized.includes("video") || normalized.includes("post") || normalized.includes("link_url")) key = "Creative"
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
  if (!value) return "-"
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}
















