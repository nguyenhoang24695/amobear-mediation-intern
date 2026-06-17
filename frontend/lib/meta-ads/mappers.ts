import type {
  AdVariantFormState,
  CreateMetaCampaignRequestDto,
  GroupedValidationErrors,
  MetaCampaignRequestDetailDto,
  MetaAdVariantDto,
  MetaCarouselCardDraftDto,
  MetaCarouselCardFormState,
  MetaFlexibleAssetFormState,
  MetaCreativeDraftDto,
  MetaCreativeMediaMode,
  MetaCreativeMediaSourceDto,
  MetaRequestAssetSelectionState,
  MetaRequestFormState,
  UpdateMetaCampaignRequestDto,
  MetaDegreesOfFreedomSpecDto,
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
  if (normalized === "GLOBAL" || normalized === "REGION" || normalized === "COUNTRY_GROUP" || normalized === "CITY" || normalized === "COUNTRY") {
    return normalized as MetaRequestFormState["geoMode"]
  }

  if ((adSet.cityTargets?.length ?? 0) > 0) return "CITY"
  if ((adSet.countryGroupIds?.length ?? 0) > 0) return "COUNTRY_GROUP"
  if ((adSet.regionKeys?.length ?? 0) > 0) return "REGION"
  if ((adSet.countries?.length ?? 0) > 0) return "COUNTRY"
  return "GLOBAL"
}
function inferPerformanceGoalState(adSet: CreateMetaCampaignRequestDto["adSet"]): Pick<MetaRequestFormState, "performanceGoalType" | "performanceGoalEventName" | "performanceGoalValueType" | "optimizationGoal"> {
  const optimizationGoal = (adSet.optimizationGoal ?? "APP_INSTALLS").trim().toUpperCase()
  const performanceGoalType = (adSet.performanceGoalType ?? "").trim().toUpperCase()
  const valueType = normalizeValueEventType(adSet.performanceGoalValueType)

  if (performanceGoalType === "APP_EVENT" || performanceGoalType === "VALUE" || performanceGoalType === "APP_INSTALLS") {
    return {
      performanceGoalType,
      performanceGoalEventName: adSet.performanceGoalEventName ?? "",
      performanceGoalValueType: performanceGoalType === "VALUE" ? valueType : "",
      optimizationGoal,
    }
  }

  if (optimizationGoal === "VALUE" || optimizationGoal === "IN_APP_VALUE") {
    return {
      performanceGoalType: "VALUE",
      performanceGoalEventName: "",
      performanceGoalValueType: valueType,
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

function normalizeValueEventType(value?: string | null): string {
  const normalized = (value ?? "").trim().toUpperCase()
  if (normalized === "IN_APP_AD_IMPRESSION" || normalized === "AD_IMPRESSION") return "IN_APP_AD_IMPRESSION"
  if (normalized === "PURCHASE") return "IN_APP_PURCHASE"
  return "IN_APP_PURCHASE"
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

function buildMediaSource(selection: MetaRequestAssetSelectionState, kind: "image" | "video" | "playable"): MetaCreativeMediaSourceDto | null {
  if (selection.uploadedAssetId) {
    return {
      mode: "uploaded_asset",
      uploadedAssetId: selection.uploadedAssetId,
    }
  }

  // Playable source chỉ hỗ trợ uploaded_asset (file HTML đã upload + chuẩn bị).
  if (kind === "playable") return null

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

function mediaSourceToSelection(source: MetaCreativeMediaSourceDto | null | undefined, kind: "image" | "video" | "playable"): MetaRequestAssetSelectionState {
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

function getPlayableCreative(creative: MetaCreativeDraftDto) {
  return creative.playable ?? {
    message: creative.message,
    messages: [] as string[],
    headline: creative.headline,
    headlines: [] as string[],
    callToActionType: creative.callToActionType ?? "INSTALL_MOBILE_APP",
    linkUrl: creative.linkUrl,
    playableSource: null,
    leadInVideo: null,
    thumbnail: null,
  }
}

/** Resolve the effective media type for a SINGLE_MEDIA variant.
 * Falls back to detecting video signals in singleVideoVideo when mediaType is not explicitly set
 * (handles old drafts saved before SINGLE_MEDIA existed). */
function resolveVariantMediaType(v: Pick<AdVariantFormState, "mediaType" | "singleVideoVideo">): "IMAGE" | "VIDEO" {
  if (v.mediaType) return v.mediaType
  // Fallback for old drafts: if there are any video signals, treat as VIDEO
  const vid = v.singleVideoVideo
  if (vid?.videoId || vid?.metaAssetType === "VIDEO" || (vid?.mode === "uploaded_asset" && vid?.uploadedAssetId)) return "VIDEO"
  return "IMAGE"
}

export function variantFormStateToCreativeDto(v: AdVariantFormState): MetaCreativeDraftDto {
  const creativeCommon = {
    name: v.creativeName.trim(),
    pageId: v.facebookPageId.trim() || null,
    instagramActorId: v.instagramActorId.trim() || null,
  }

  const creative: MetaCreativeDraftDto = {
    type: v.creativeType,
    common: creativeCommon,
  }

  if (v.creativeType !== "EXISTING_POST") {
    creative.degreesOfFreedomSpec = {
      creativeFeaturesSpec: {
        advantagePlusCreative: { enrollStatus: v.advantageCreativeAllOptimizations ? "OPT_IN" : "OPT_OUT" },
        imageTouchups: { enrollStatus: v.advantageCreativeImageTouchups ? "OPT_IN" : "OPT_OUT" },
        musicGeneration: { enrollStatus: v.advantageCreativeMusicGeneration ? "OPT_IN" : "OPT_OUT" },
        textOptimizations: { enrollStatus: v.advantageCreativeTextOptimizations ? "OPT_IN" : "OPT_OUT" },
        imageAnimation: { enrollStatus: v.advantageCreativeImageAnimation ? "OPT_IN" : "OPT_OUT" },
        addTextOverlay: { enrollStatus: v.advantageCreativeAddTextOverlay ? "OPT_IN" : "OPT_OUT" },
        inlineComment: { enrollStatus: v.advantageCreativeInlineComment ? "OPT_IN" : "OPT_OUT" },
      }
    }
  }

  if (v.creativeType === "SINGLE_VIDEO") {
    creative.singleVideo = {
      message: getFirstVariation(v.singleVideoPrimaryTexts, v.singleVideoPrimaryText) || null,
      messages: sanitizeTextVariations(v.singleVideoPrimaryTexts, v.singleVideoPrimaryText),
      headline: getFirstVariation(v.singleVideoHeadlines, v.singleVideoHeadline) || null,
      headlines: sanitizeTextVariations(v.singleVideoHeadlines, v.singleVideoHeadline),
      description: v.singleVideoDescription.trim() || null,
      callToActionType: v.singleVideoCallToAction.trim() || null,
      linkUrl: v.singleVideoLinkUrl.trim() || null,
      video: buildMediaSource(v.singleVideoVideo, "video"),
      thumbnail: buildMediaSource(v.singleVideoThumbnail, "image"),
    }
  } else if (v.creativeType === "CAROUSEL_IMAGE") {
    creative.carousel = {
      message: v.carouselPrimaryText.trim() || null,
      callToActionType: v.carouselCallToAction.trim() || null,
      cards: v.carouselCards.map((card) => ({
        headline: card.headline.trim() || null,
        description: card.description.trim() || null,
        linkUrl: card.linkUrl.trim() || null,
        image: buildMediaSource(card.image, "image"),
      })),
    }
  } else if (v.creativeType === "EXISTING_POST") {
    creative.existingPost = {
      sourcePostId: v.existingPostId.trim() || null,
    }
  } else if (v.creativeType === "PLAYABLE") {
    creative.playable = {
      message: getFirstVariation(v.playablePrimaryTexts, v.playablePrimaryText) || null,
      messages: sanitizeTextVariations(v.playablePrimaryTexts, v.playablePrimaryText),
      headline: getFirstVariation(v.playableHeadlines, v.playableHeadline) || null,
      headlines: sanitizeTextVariations(v.playableHeadlines, v.playableHeadline),
      callToActionType: v.playableCallToAction.trim() || "INSTALL_MOBILE_APP",
      linkUrl: v.playableLinkUrl.trim() || null,
      playableSource: buildMediaSource(v.playableSource, "playable"),
      leadInVideo: buildMediaSource(v.playableLeadInVideo, "video"),
      thumbnail: buildMediaSource(v.playableThumbnail, "image"),
    }
  } else if (v.creativeType === "FLEXIBLE") {
    creative.flexible = {
      primaryTexts: sanitizeTextVariations(v.flexiblePrimaryTexts),
      headlines: sanitizeTextVariations(v.flexibleHeadlines),
      callToActionType: v.flexibleCallToAction.trim() || null,
      linkUrl: v.flexibleLinkUrl.trim() || null,
      assets: v.flexibleAssets.map((asset) => ({
        assetType: asset.assetType,
        image: asset.assetType === "IMAGE" ? buildMediaSource(asset.image, "image") : null,
        video: asset.assetType === "VIDEO" ? buildMediaSource(asset.video, "video") : null,
        thumbnail: asset.assetType === "VIDEO" ? buildMediaSource(asset.thumbnail, "image") : null,
      })),
    }
  } else if (v.creativeType === "SINGLE_MEDIA") {
    // UI-only type: resolve to SINGLE_IMAGE or SINGLE_VIDEO based on which media was selected.
    // Text is always read from the canonical singleImage* fields (shared across all SINGLE_MEDIA variations).
    const effectiveMediaType = resolveVariantMediaType(v)
    creative.type = effectiveMediaType === "VIDEO" ? "SINGLE_VIDEO" : "SINGLE_IMAGE"
    if (effectiveMediaType === "VIDEO") {
      creative.singleVideo = {
        message: getFirstVariation(v.singleImagePrimaryTexts, v.singleImagePrimaryText) || null,
        messages: sanitizeTextVariations(v.singleImagePrimaryTexts, v.singleImagePrimaryText),
        headline: getFirstVariation(v.singleImageHeadlines, v.singleImageHeadline) || null,
        headlines: sanitizeTextVariations(v.singleImageHeadlines, v.singleImageHeadline),
        description: v.singleImageDescription.trim() || null,
        callToActionType: v.singleImageCallToAction.trim() || null,
        linkUrl: v.singleImageLinkUrl.trim() || null,
        video: buildMediaSource(v.singleVideoVideo, "video"),
        thumbnail: buildMediaSource(v.singleVideoThumbnail, "image"),
      }
    } else {
      creative.singleImage = {
        message: getFirstVariation(v.singleImagePrimaryTexts, v.singleImagePrimaryText) || null,
        messages: sanitizeTextVariations(v.singleImagePrimaryTexts, v.singleImagePrimaryText),
        headline: getFirstVariation(v.singleImageHeadlines, v.singleImageHeadline) || null,
        headlines: sanitizeTextVariations(v.singleImageHeadlines, v.singleImageHeadline),
        description: v.singleImageDescription.trim() || null,
        callToActionType: v.singleImageCallToAction.trim() || null,
        linkUrl: v.singleImageLinkUrl.trim() || null,
        image: buildMediaSource(v.singleImageImage, "image"),
      }
    }
  } else {
    creative.singleImage = {
      message: getFirstVariation(v.singleImagePrimaryTexts, v.singleImagePrimaryText) || null,
      messages: sanitizeTextVariations(v.singleImagePrimaryTexts, v.singleImagePrimaryText),
      headline: getFirstVariation(v.singleImageHeadlines, v.singleImageHeadline) || null,
      headlines: sanitizeTextVariations(v.singleImageHeadlines, v.singleImageHeadline),
      description: v.singleImageDescription.trim() || null,
      callToActionType: v.singleImageCallToAction.trim() || null,
      linkUrl: v.singleImageLinkUrl.trim() || null,
      image: buildMediaSource(v.singleImageImage, "image"),
    }
  }

  return creative
}

/** Build an AdVariantDto from an AdVariantFormState. */
function variantFormStateToDto(v: AdVariantFormState): MetaAdVariantDto {
  return {
    sequenceNumber: v.sequenceNumber,
    creative: variantFormStateToCreativeDto(v),
    ad: {
      name: v.adName.trim(),
      status: "PAUSED",
      trackingSpecsJson: v.trackingSpecs.trim() || null,
    },
  }
}

/** Extract AdVariantFormState-shaped fields from the flat MetaRequestFormState (variant 1). */
function primaryVariantFromFormState(form: MetaRequestFormState): AdVariantFormState {
  return {
    sequenceNumber: 1,
    creativeType: form.creativeType,
    mediaType: form.mediaType,
    creativeName: form.creativeName,
    facebookPageId: form.facebookPageId,
    instagramActorId: form.instagramActorId,
    singleImagePrimaryText: form.singleImagePrimaryText,
    singleImagePrimaryTexts: form.singleImagePrimaryTexts,
    singleImageHeadline: form.singleImageHeadline,
    singleImageHeadlines: form.singleImageHeadlines,
    singleImageDescription: form.singleImageDescription,
    singleImageCallToAction: form.singleImageCallToAction,
    singleImageLinkUrl: form.singleImageLinkUrl,
    singleImageImage: form.singleImageImage,
    singleVideoPrimaryText: form.singleVideoPrimaryText,
    singleVideoPrimaryTexts: form.singleVideoPrimaryTexts,
    singleVideoHeadline: form.singleVideoHeadline,
    singleVideoHeadlines: form.singleVideoHeadlines,
    singleVideoDescription: form.singleVideoDescription,
    singleVideoCallToAction: form.singleVideoCallToAction,
    singleVideoLinkUrl: form.singleVideoLinkUrl,
    singleVideoVideo: form.singleVideoVideo,
    singleVideoThumbnail: form.singleVideoThumbnail,
    carouselPrimaryText: form.carouselPrimaryText,
    carouselCallToAction: form.carouselCallToAction,
    carouselCards: form.carouselCards,
    flexiblePrimaryTexts: form.flexiblePrimaryTexts,
    flexibleHeadlines: form.flexibleHeadlines,
    flexibleCallToAction: form.flexibleCallToAction,
    flexibleLinkUrl: form.flexibleLinkUrl,
    flexibleAssets: form.flexibleAssets,
    playablePrimaryText: form.playablePrimaryText,
    playablePrimaryTexts: form.playablePrimaryTexts,
    playableHeadline: form.playableHeadline,
    playableHeadlines: form.playableHeadlines,
    playableCallToAction: form.playableCallToAction,
    playableLinkUrl: form.playableLinkUrl,
    playableSource: form.playableSource,
    playableLeadInVideo: form.playableLeadInVideo,
    playableThumbnail: form.playableThumbnail,
    existingPostId: form.existingPostId,
    adName: form.adName,
    trackingSpecs: form.trackingSpecs,
    advantageCreativeAllOptimizations: form.advantageCreativeAllOptimizations,
    advantageCreativeAddTextOverlay: form.advantageCreativeAddTextOverlay,
    advantageCreativeImageTouchups: form.advantageCreativeImageTouchups,
    advantageCreativeMusicGeneration: form.advantageCreativeMusicGeneration,
    advantageCreativeTextOptimizations: form.advantageCreativeTextOptimizations,
    advantageCreativeImageAnimation: form.advantageCreativeImageAnimation,
    advantageCreativeInlineComment: form.advantageCreativeInlineComment,
  }
}

/**
 * Compose an additional variant for serialization by overlaying the variant's per-variant
 * fields (media pickers) on top of the shared form fields.
 *
 * This implements "shared text + per-variant media": text/page/type/CTA/link URL/description
 * always come from the form (= primary variant), so all ads in a request always have
 * consistent shared copy. Only the image/video differs per variant.
 */
function composeAdditionalVariantForSerialization(
  v: AdVariantFormState,
  form: MetaRequestFormState,
): AdVariantFormState {
  return {
    ...primaryVariantFromFormState(form), // shared: type, page, instagram, text fields, CTAs, link URLs, tracking specs
    sequenceNumber: v.sequenceNumber,
    // Creative Name / Ad Name inherit from form here; numeric suffix is applied later
    // by applyVariantNumberSuffixIfMulti so all variants follow the same naming rule.
    creativeName: form.creativeName,
    adName: form.adName,
    // Per-variant media and mediaType (only meaningful for SINGLE_MEDIA / SINGLE_IMAGE / SINGLE_VIDEO):
    mediaType: v.mediaType,
    singleImageImage: v.singleImageImage,
    singleVideoVideo: v.singleVideoVideo,
    singleVideoThumbnail: v.singleVideoThumbnail,
    // Playable per-variant media (source/lead-in/thumbnail differ per variant; text shared).
    playableSource: v.playableSource,
    playableLeadInVideo: v.playableLeadInVideo,
    playableThumbnail: v.playableThumbnail,
  }
}

/**
 * Append `_{sequenceNumber}` to creative name and ad name when there are multiple variants,
 * so Meta receives unique-but-correlated names (e.g. `MyAd_1`, `MyAd_2`, `MyAd_3`).
 *
 * When there is only 1 variant total, names pass through unchanged — no noise for the
 * single-variant case.
 */
function applyVariantNumberSuffixIfMulti(
  v: AdVariantFormState,
  totalVariants: number,
): AdVariantFormState {
  if (totalVariants <= 1) return v
  const suffix = `_${v.sequenceNumber}`
  const baseCreativeName = v.creativeName.trim()
  const baseAdName = v.adName.trim()
  return {
    ...v,
    creativeName: baseCreativeName ? `${baseCreativeName}${suffix}` : "",
    adName: baseAdName ? `${baseAdName}${suffix}` : "",
  }
}

export function formStateToCreateDto(form: MetaRequestFormState, idempotencyKey?: string): CreateMetaCampaignRequestDto {
  const budgets = parseBudgetStrategy(form)

  // Build all variants: variant 1 = primary (flat form fields), variant 2+ = additionalVariants.
  // Additional variants always inherit shared text/page/type fields from the form.
  // When there are multiple variants, append `_1`, `_2`, `_3` etc. to all creative/ad names.
  const totalVariants = 1 + (form.additionalVariants?.length ?? 0)
  const primaryVariant = primaryVariantFromFormState(form)
  const adVariants: MetaAdVariantDto[] = [
    variantFormStateToDto(applyVariantNumberSuffixIfMulti(primaryVariant, totalVariants)),
    ...(form.additionalVariants ?? []).map((v) =>
      variantFormStateToDto(
        applyVariantNumberSuffixIfMulti(composeAdditionalVariantForSerialization(v, form), totalVariants),
      ),
    ),
  ]

  return {
    metaAdAccountId: Number(form.adAccountId),
    executionMetaIntegrationId: form.executionIntegrationId ? Number(form.executionIntegrationId) : null,
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
      isSkadnetworkAttribution: form.isSkadnetworkAttribution,
      specialAdCategories: form.specialAdCategories,
    },
    adSet: {
      name: form.adSetName.trim(),
      deferredDeepLinkUrl: form.deferredDeepLinkUrl?.trim() || null,
      customStoreListingId: form.customStoreListingId?.trim() || null,
      dailyBudget: budgets.adSetDailyBudget,
      lifetimeBudget: budgets.adSetLifetimeBudget,
      billingEvent: form.billingEvent.trim(),
      optimizationGoal: form.optimizationGoal.trim(),
      performanceGoalType: form.performanceGoalType.trim(),
      performanceGoalEventName: form.performanceGoalType === "APP_EVENT" ? form.performanceGoalEventName.trim() || null : null,
      performanceGoalValueType: form.performanceGoalType === "VALUE" ? normalizeValueEventType(form.performanceGoalValueType) : null,
      bidAmount: parseOptionalAmount(form.bidAmount),
      roasAverageFloor: parseOptionalAmount(form.roasAverageFloor),
      advantageAudience: form.advantageAudience,
      startTime: parseOptionalDate(form.startTime),
      endTime: parseOptionalDate(form.endTime),
      geoMode: form.geoMode,
      countries: form.geoMode === "COUNTRY" ? form.countries : [],
      excludedCountries: form.excludedCountries || [],
      regionKeys: form.geoMode === "REGION" ? form.regionKeys : [],
      countryGroupIds: form.geoMode === "COUNTRY_GROUP" ? form.countryGroupIds : [],
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
      locales: Array.from(new Set((form.localeKeys ?? []).filter((key) => Number.isFinite(key) && key > 0))),
      devicePlatforms: [],
      userOs: form.userOs ?? [],
      publisherPlatforms: form.placementMode === "MANUAL" ? form.publisherPlatforms : [],
      facebookPositions: form.placementMode === "MANUAL" ? form.facebookPositions : [],
      instagramPositions: form.placementMode === "MANUAL" ? form.instagramPositions : [],
    },
    adVariants,
  }
}

export function formStateToUpdateDto(form: MetaRequestFormState): UpdateMetaCampaignRequestDto {
  const createDto = formStateToCreateDto(form)
  return {
    metaAdAccountId: createDto.metaAdAccountId,
    executionMetaIntegrationId: createDto.executionMetaIntegrationId,
    appRowId: createDto.appRowId,
    paidMediaAppBindingId: createDto.paidMediaAppBindingId,
    campaign: createDto.campaign,
    adSet: createDto.adSet,
    adVariants: createDto.adVariants,
  }
}

/** Map a single MetaAdVariantDto (from payload) → AdVariantFormState for the form. */
function adVariantDtoToVariantFormState(variant: MetaAdVariantDto): AdVariantFormState {
  const creative = variant.creative ?? {}
  const rawCreativeType = (creative.type ?? "SINGLE_IMAGE") as import("@/types/meta-ads").MetaCreativeType
  const common = getCreativeCommon(creative)
  const singleImage = getSingleImageCreative(creative)
  const singleVideo = getSingleVideoCreative(creative)
  const carousel = getCarouselCreative(creative)
  const flexible = getFlexibleCreative(creative)
  const playable = getPlayableCreative(creative)

  // Backward compat: SINGLE_IMAGE and SINGLE_VIDEO drafts open in the merged SINGLE_MEDIA UI.
  // Text is normalised to singleImage* (canonical) regardless of source type.
  const isSingleMedia = rawCreativeType === "SINGLE_IMAGE" || rawCreativeType === "SINGLE_VIDEO"
  const creativeType: import("@/types/meta-ads").MetaCreativeType = isSingleMedia ? "SINGLE_MEDIA" : rawCreativeType
  const resolvedMediaType: "IMAGE" | "VIDEO" | undefined = isSingleMedia
    ? (rawCreativeType === "SINGLE_VIDEO" ? "VIDEO" : "IMAGE")
    : undefined

  // For SINGLE_VIDEO drafts, copy video text → singleImage* canonical fields so the merged UI shows them correctly.
  const canonicalPrimaryTexts = isSingleMedia && rawCreativeType === "SINGLE_VIDEO"
    ? (sanitizeTextVariations(singleVideo.messages, singleVideo.message).length > 0
        ? sanitizeTextVariations(singleVideo.messages, singleVideo.message)
        : sanitizeTextVariations(singleImage.messages, singleImage.message))
    : sanitizeTextVariations(singleImage.messages, singleImage.message)
  const canonicalHeadlines = isSingleMedia && rawCreativeType === "SINGLE_VIDEO"
    ? (sanitizeTextVariations(singleVideo.headlines, singleVideo.headline).length > 0
        ? sanitizeTextVariations(singleVideo.headlines, singleVideo.headline)
        : sanitizeTextVariations(singleImage.headlines, singleImage.headline))
    : sanitizeTextVariations(singleImage.headlines, singleImage.headline)
  const canonicalDescription = isSingleMedia && rawCreativeType === "SINGLE_VIDEO"
    ? (singleVideo.description ?? singleImage.description ?? "")
    : (singleImage.description ?? "")
  const canonicalCta = isSingleMedia && rawCreativeType === "SINGLE_VIDEO"
    ? (singleVideo.callToActionType ?? singleImage.callToActionType ?? "LEARN_MORE")
    : (singleImage.callToActionType ?? "LEARN_MORE")
  const canonicalLinkUrl = isSingleMedia && rawCreativeType === "SINGLE_VIDEO"
    ? (singleVideo.linkUrl ?? singleImage.linkUrl ?? "")
    : (singleImage.linkUrl ?? "")

  const spec = creative.degreesOfFreedomSpec?.creativeFeaturesSpec

  return {
    sequenceNumber: variant.sequenceNumber,
    creativeType,
    mediaType: resolvedMediaType,
    creativeName: common.name,
    facebookPageId: common.pageId,
    instagramActorId: common.instagramActorId,
    singleImagePrimaryText: canonicalPrimaryTexts[0] ?? "",
    singleImagePrimaryTexts: canonicalPrimaryTexts.length > 0 ? canonicalPrimaryTexts : [""],
    singleImageHeadline: canonicalHeadlines[0] ?? "",
    singleImageHeadlines: canonicalHeadlines.length > 0 ? canonicalHeadlines : [""],
    singleImageDescription: canonicalDescription,
    singleImageCallToAction: canonicalCta,
    singleImageLinkUrl: canonicalLinkUrl,
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
    playablePrimaryText: getFirstVariation(playable.messages, playable.message),
    playablePrimaryTexts: sanitizeTextVariations(playable.messages, playable.message).length > 0 ? sanitizeTextVariations(playable.messages, playable.message) : [""],
    playableHeadline: getFirstVariation(playable.headlines, playable.headline),
    playableHeadlines: sanitizeTextVariations(playable.headlines, playable.headline).length > 0 ? sanitizeTextVariations(playable.headlines, playable.headline) : [""],
    playableCallToAction: playable.callToActionType ?? "INSTALL_MOBILE_APP",
    playableLinkUrl: playable.linkUrl ?? "",
    playableSource: mediaSourceToSelection(playable.playableSource, "playable"),
    playableLeadInVideo: mediaSourceToSelection(playable.leadInVideo, "video"),
    playableThumbnail: mediaSourceToSelection(playable.thumbnail, "image"),
    existingPostId: creative.existingPost?.sourcePostId ?? "",
    adName: variant.ad?.name ?? "",
    trackingSpecs: variant.ad?.trackingSpecsJson ?? "",
    advantageCreativeAllOptimizations: spec?.advantagePlusCreative?.enrollStatus === "OPT_IN",
    advantageCreativeAddTextOverlay: spec?.addTextOverlay?.enrollStatus === "OPT_IN",
    advantageCreativeImageTouchups: spec?.imageTouchups?.enrollStatus === "OPT_IN",
    advantageCreativeMusicGeneration: spec?.musicGeneration?.enrollStatus === "OPT_IN",
    advantageCreativeTextOptimizations: spec?.textOptimizations?.enrollStatus === "OPT_IN",
    advantageCreativeImageAnimation: spec?.imageAnimation?.enrollStatus === "OPT_IN",
    advantageCreativeInlineComment: spec?.inlineComment?.enrollStatus === "OPT_IN",
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

  const geoMode = inferGeoModeFromDraft(payload.adSet)
  const performanceGoal = inferPerformanceGoalState(payload.adSet)

  // Resolve primary variant: new payloads use adVariants[0]; old payloads use top-level creative/ad
  const firstVariantDto: MetaAdVariantDto = payload.adVariants?.[0] ?? {
    sequenceNumber: 1,
    creative: payload.creative ?? {},
    ad: payload.ad ?? { name: "", status: "PAUSED" },
  }
  const { sequenceNumber: _primarySeq, ...primaryVariantFields } = adVariantDtoToVariantFormState(firstVariantDto)

  // Additional variants from adVariants[1+]
  const additionalVariants = (payload.adVariants ?? [])
    .slice(1)
    .map((v) => adVariantDtoToVariantFormState(v))

  return {
    executionIntegrationId: (detail.executionMetaIntegrationId ?? payload.executionMetaIntegrationId ?? "").toString(),
    adAccountId: detail.metaAdAccountId.toString(),
    deferredDeepLinkUrl: payload.adSet.deferredDeepLinkUrl ?? "",
    customStoreListingId: payload.adSet.customStoreListingId ?? "",
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
    isSkadnetworkAttribution: payload.campaign.isSkadnetworkAttribution ?? false,
    campaignDailyBudget: payload.campaign.dailyBudget?.toString() ?? "",
    campaignLifetimeBudget: payload.campaign.lifetimeBudget?.toString() ?? "",
    adSetName: payload.adSet.name ?? "",
    geoMode,
    countries: payload.adSet.countries ?? [],
    excludedCountries: payload.adSet.excludedCountries ?? [],
    regionKeys: payload.adSet.regionKeys ?? [],
    countryGroupIds: payload.adSet.countryGroupIds ?? [],
    cityTargets: (payload.adSet.cityTargets ?? []).map((city) => ({
      key: city.key ?? "",
      name: city.name ?? "",
      region: city.region ?? null,
      regionId: city.regionId ?? null,
      countryCode: city.countryCode ?? null,
      countryName: city.countryName ?? null,
      type: city.type ?? null,
    })),
    localeKeys: payload.adSet.locales ?? [],
    ageMin: payload.adSet.ageMin ?? 18,
    ageMax: payload.adSet.ageMax ?? 65,
    gender,
    userOs: payload.adSet.userOs ?? [],
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
    roasAverageFloor: payload.adSet.roasAverageFloor?.toString() ?? "",
    advantageAudience: payload.adSet.advantageAudience ?? false,
    startTime: payload.adSet.startTime ? payload.adSet.startTime.slice(0, 16) : "",
    endTime: payload.adSet.endTime ? payload.adSet.endTime.slice(0, 16) : "",
    // Spread all creative + ad fields from primary variant (variant 1)
    ...primaryVariantFields,
    additionalVariants,
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

export function normalizeDegreesOfFreedomSpec(configJson: string | null | undefined): MetaDegreesOfFreedomSpecDto | null {
  if (!configJson) return null
  try {
    const raw = JSON.parse(configJson)
    
    const rawSpec = raw.degrees_of_freedom_spec || raw.degreesOfFreedomSpec
    if (!rawSpec) return null
    
    const rawFeatures = rawSpec.creative_features_spec || rawSpec.creativeFeaturesSpec
    if (!rawFeatures) return { creativeFeaturesSpec: null }
    
    const getEnrollStatus = (obj: any) => {
      if (!obj) return null
      const status = obj.enroll_status || obj.enrollStatus
      if (status === "OPT_IN" || status === "OPT_OUT") {
        return { enrollStatus: status as any }
      }
      return null
    }
    
    return {
      creativeFeaturesSpec: {
        advantagePlusCreative: getEnrollStatus(rawFeatures.advantage_plus_creative || rawFeatures.advantagePlusCreative),
        imageTouchups: getEnrollStatus(rawFeatures.image_touchups || rawFeatures.imageTouchups),
        musicGeneration: getEnrollStatus(rawFeatures.music_generation || rawFeatures.musicGeneration),
        textOptimizations: getEnrollStatus(rawFeatures.text_optimizations || rawFeatures.textOptimizations),
        imageAnimation: getEnrollStatus(rawFeatures.image_animation || rawFeatures.imageAnimation),
        addTextOverlay: getEnrollStatus(rawFeatures.add_text_overlay || rawFeatures.addTextOverlay),
        inlineComment: getEnrollStatus(rawFeatures.inline_comment || rawFeatures.inlineComment),
      }
    }
  } catch (err) {
    console.error("Failed to parse configJson for Advantage+ Creative spec:", err)
    return null
  }
}
