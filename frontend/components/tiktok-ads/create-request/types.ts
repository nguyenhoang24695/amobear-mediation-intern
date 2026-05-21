import type { CreateTikTokCampaignRequestDto, TikTokOptionDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"

export type TikTokRequestFormState = CreateTikTokCampaignRequestDto
export type TikTokRequestSectionTarget = "account-app" | "campaign-settings" | "adgroup-audience" | "adgroup-budget" | "creative" | "ad"
export type TikTokMediaMode = "upload" | "existing" | "library"

const AUTHORIZED_IDENTITY_TYPE = "AUTH_CODE"
const DEPRECATED_CUSTOM_IDENTITY_TYPE = "CUSTOMIZED_USER"

export const requestSectionIds: Record<TikTokRequestSectionTarget, string> = {
  "account-app": "tiktok-request-section-account-app",
  "campaign-settings": "tiktok-request-section-campaign-settings",
  "adgroup-audience": "tiktok-request-section-adgroup-audience",
  "adgroup-budget": "tiktok-request-section-adgroup-budget",
  creative: "tiktok-request-section-creative",
  ad: "tiktok-request-section-ad",
}

export function buildIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `tiktok-${crypto.randomUUID().replaceAll("-", "")}`
  }
  return `tiktok-${Date.now()}${Math.random().toString(16).slice(2)}`
}

export function optionLabel(option: TikTokOptionDto): string
export function optionLabel(options: TikTokOptionDto[] | undefined, key?: string | null): string
export function optionLabel(first: TikTokOptionDto | TikTokOptionDto[] | undefined, key?: string | null) {
  if (Array.isArray(first) || !first) {
    if (!key) return "-"
    return first?.find((item) => item.key === key)?.label ?? key
  }

  return first.label || first.key
}

export function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function createDefaultTikTokRequestForm(reference: TikTokReferenceResponseDto | null): TikTokRequestFormState {
  const start = new Date()
  return sanitizeTikTokRequestForm({
    tikTokAdAccountRowId: 0,
    appRowId: null,
    paidMediaAppBindingId: null,
    idempotencyKey: buildIdempotencyKey(),
    campaign: {
      campaignName: "",
      objectiveType: reference?.objectives[0]?.key ?? "APP_PROMOTION",
      campaignType: "REGULAR_CAMPAIGN",
      appPromotionType: "APP_INSTALL",
      budget: 50,
      budgetMode: reference?.budgetModes[0]?.key ?? "BUDGET_MODE_DAY",
    },
    adGroup: {
      adGroupName: "",
      placementType: reference?.placementTypes[0]?.key ?? "PLACEMENT_TYPE_AUTOMATIC",
      placements: ["PLACEMENT_TIKTOK"],
      budget: 50,
      budgetMode: reference?.budgetModes[0]?.key ?? "BUDGET_MODE_DAY",
      scheduleType: reference?.scheduleTypes[0]?.key ?? "SCHEDULE_FROM_NOW",
      startTime: formatDateTimeLocal(start),
      optimizationGoal: reference?.optimizationGoals[0]?.key ?? "INSTALL",
      bidType: reference?.bidTypes[0]?.key ?? "BID_TYPE_NO_BID",
      billingEvent: reference?.billingEvents[0]?.key ?? "OCPM",
      appId: undefined,
      appDownloadUrl: undefined,
      operatingSystems: [],
      locationIds: reference?.defaultLocationIds?.length ? reference.defaultLocationIds : ["6252001"],
      countryGroupIds: [],
      ageGroups: [],
      gender: reference?.genders[0]?.key ?? "GENDER_UNLIMITED",
      languages: [],
      adTexts: [""],
    },
    ad: {
      adName: "",
      adFormat: "SINGLE_VIDEO",
      videoId: "",
      videoIds: [],
      imageIds: [],
      videoAssetId: undefined,
      videoAssetIds: [],
      imageAssetIds: [],
      adText: "",
      adTexts: [""],
      callToAction: reference?.callToActions[0]?.key ?? "INSTALL_NOW",
      landingPageUrl: "",
      identityType: reference?.identityTypes.find((option) => !isDeprecatedCustomIdentity(option.key))?.key ?? AUTHORIZED_IDENTITY_TYPE,
      identityAuthorizedBcId: "",
      displayName: "",
      appName: "",
    },
    ads: [],
    adGroups: [],
  })
}

type PayloadRecord = Record<string, unknown>

function asRecord(value: unknown): PayloadRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PayloadRecord : {}
}

function pick(source: PayloadRecord, camelKey: string, pascalKey: string): unknown {
  return source[camelKey] ?? source[pascalKey]
}

function setIfDefined(target: PayloadRecord, key: string, value: unknown) {
  if (value !== undefined && value !== null) target[key] = value
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return undefined
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item) => String(item)).filter(Boolean)
}

function numberArrayValue(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item) => numberValue(item)).filter((item): item is number => item !== undefined)
}

function dateTimeLocalValue(value: unknown): string | undefined {
  const text = stringValue(value)
  if (!text) return undefined
  const match = text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return match?.[1] ?? text
}

export function normalizeTikTokRequestPayloadShape(payload: unknown): Partial<TikTokRequestFormState> {
  const root = asRecord(payload)
  const campaignSource = asRecord(pick(root, "campaign", "Campaign"))
  const adGroupSource = asRecord(pick(root, "adGroup", "AdGroup"))
  const adSource = asRecord(pick(root, "ad", "Ad"))
  const adsSource = pick(root, "ads", "Ads")

  const campaign: PayloadRecord = {}
  setIfDefined(campaign, "campaignName", stringValue(pick(campaignSource, "campaignName", "CampaignName")))
  setIfDefined(campaign, "objectiveType", stringValue(pick(campaignSource, "objectiveType", "ObjectiveType")))
  setIfDefined(campaign, "campaignType", stringValue(pick(campaignSource, "campaignType", "CampaignType")))
  setIfDefined(campaign, "appPromotionType", stringValue(pick(campaignSource, "appPromotionType", "AppPromotionType")))
  setIfDefined(campaign, "budget", numberValue(pick(campaignSource, "budget", "Budget")))
  setIfDefined(campaign, "budgetMode", stringValue(pick(campaignSource, "budgetMode", "BudgetMode")))

  const adGroup: PayloadRecord = {}
  setIfDefined(adGroup, "adGroupName", stringValue(pick(adGroupSource, "adGroupName", "AdGroupName")))
  setIfDefined(adGroup, "placementType", stringValue(pick(adGroupSource, "placementType", "PlacementType")))
  setIfDefined(adGroup, "placements", stringArrayValue(pick(adGroupSource, "placements", "Placements")))
  setIfDefined(adGroup, "budget", numberValue(pick(adGroupSource, "budget", "Budget")))
  setIfDefined(adGroup, "budgetMode", stringValue(pick(adGroupSource, "budgetMode", "BudgetMode")))
  setIfDefined(adGroup, "scheduleType", stringValue(pick(adGroupSource, "scheduleType", "ScheduleType")))
  setIfDefined(adGroup, "startTime", dateTimeLocalValue(pick(adGroupSource, "startTime", "StartTime")))
  setIfDefined(adGroup, "endTime", dateTimeLocalValue(pick(adGroupSource, "endTime", "EndTime")))
  setIfDefined(adGroup, "optimizationGoal", stringValue(pick(adGroupSource, "optimizationGoal", "OptimizationGoal")))
  setIfDefined(adGroup, "bidType", stringValue(pick(adGroupSource, "bidType", "BidType")))
  setIfDefined(adGroup, "bid", numberValue(pick(adGroupSource, "bid", "Bid")))
  setIfDefined(adGroup, "billingEvent", stringValue(pick(adGroupSource, "billingEvent", "BillingEvent")))
  setIfDefined(adGroup, "appId", stringValue(pick(adGroupSource, "appId", "AppId")))
  setIfDefined(adGroup, "appDownloadUrl", stringValue(pick(adGroupSource, "appDownloadUrl", "AppDownloadUrl")))
  setIfDefined(adGroup, "operatingSystems", stringArrayValue(pick(adGroupSource, "operatingSystems", "OperatingSystems")))
  setIfDefined(adGroup, "locationIds", stringArrayValue(pick(adGroupSource, "locationIds", "LocationIds")))
  setIfDefined(adGroup, "countryGroupIds", numberArrayValue(pick(adGroupSource, "countryGroupIds", "CountryGroupIds")))
  setIfDefined(adGroup, "ageGroups", stringArrayValue(pick(adGroupSource, "ageGroups", "AgeGroups")))
  setIfDefined(adGroup, "gender", stringValue(pick(adGroupSource, "gender", "Gender")))
  setIfDefined(adGroup, "languages", stringArrayValue(pick(adGroupSource, "languages", "Languages")))
  setIfDefined(adGroup, "adTexts", stringArrayValue(pick(adGroupSource, "adTexts", "AdTexts")))

  const ad: PayloadRecord = {}
  setIfDefined(ad, "adName", stringValue(pick(adSource, "adName", "AdName")))
  setIfDefined(ad, "adFormat", stringValue(pick(adSource, "adFormat", "AdFormat")))
  setIfDefined(ad, "videoId", stringValue(pick(adSource, "videoId", "VideoId")))
  setIfDefined(ad, "videoIds", stringArrayValue(pick(adSource, "videoIds", "VideoIds")))
  setIfDefined(ad, "imageIds", stringArrayValue(pick(adSource, "imageIds", "ImageIds")))
  setIfDefined(ad, "videoAssetId", numberValue(pick(adSource, "videoAssetId", "VideoAssetId")))
  setIfDefined(ad, "videoAssetIds", numberArrayValue(pick(adSource, "videoAssetIds", "VideoAssetIds")))
  setIfDefined(ad, "imageAssetIds", numberArrayValue(pick(adSource, "imageAssetIds", "ImageAssetIds")))
  setIfDefined(ad, "adText", stringValue(pick(adSource, "adText", "AdText")))
  setIfDefined(ad, "adTexts", stringArrayValue(pick(adSource, "adTexts", "AdTexts")))
  setIfDefined(ad, "callToAction", stringValue(pick(adSource, "callToAction", "CallToAction")))
  setIfDefined(ad, "landingPageUrl", stringValue(pick(adSource, "landingPageUrl", "LandingPageUrl")))
  setIfDefined(ad, "trackingUrl", stringValue(pick(adSource, "trackingUrl", "TrackingUrl")))
  setIfDefined(ad, "identityId", stringValue(pick(adSource, "identityId", "IdentityId")))
  setIfDefined(ad, "identityType", stringValue(pick(adSource, "identityType", "IdentityType")))
  setIfDefined(ad, "identityAuthorizedBcId", stringValue(pick(adSource, "identityAuthorizedBcId", "IdentityAuthorizedBcId")))
  setIfDefined(ad, "displayName", stringValue(pick(adSource, "displayName", "DisplayName")))
  setIfDefined(ad, "appName", stringValue(pick(adSource, "appName", "AppName")))
  setIfDefined(ad, "avatarIconWebUri", stringValue(pick(adSource, "avatarIconWebUri", "AvatarIconWebUri")))

  const ads = Array.isArray(adsSource)
    ? adsSource.map((item) => normalizeTikTokRequestPayloadShape({ ad: item }).ad).filter(Boolean)
    : undefined

  const adGroupsSource = pick(root, "adGroups", "AdGroups")
  const adGroups = Array.isArray(adGroupsSource)
    ? adGroupsSource.map((item) => {
        const itemRecord = asRecord(item)
        const itemAdGroupSource = asRecord(pick(itemRecord, "adGroup", "AdGroup"))
        const itemAdsSource = pick(itemRecord, "ads", "Ads")
        const itemAdGroup = normalizeTikTokRequestPayloadShape({ adGroup: itemAdGroupSource }).adGroup ?? adGroup
        const itemAds = Array.isArray(itemAdsSource)
          ? itemAdsSource.map((adItem) => normalizeTikTokRequestPayloadShape({ ad: adItem }).ad).filter(Boolean)
          : []
        return { adGroup: itemAdGroup, ads: itemAds }
      })
    : []

  return {
    tikTokAdAccountRowId: numberValue(pick(root, "tikTokAdAccountRowId", "TikTokAdAccountRowId")),
    appRowId: numberValue(pick(root, "appRowId", "AppRowId")) ?? null,
    paidMediaAppBindingId: numberValue(pick(root, "paidMediaAppBindingId", "PaidMediaAppBindingId")) ?? null,
    idempotencyKey: stringValue(pick(root, "idempotencyKey", "IdempotencyKey")),
    campaign,
    adGroup,
    ad,
    ads,
    adGroups,
  } as unknown as Partial<TikTokRequestFormState>
}

export function sanitizeTikTokRequestForm(state: TikTokRequestFormState): TikTokRequestFormState {
  const next = structuredClone(state) as TikTokRequestFormState
  next.campaign.campaignName = next.campaign.campaignName ?? ""
  next.campaign.objectiveType = next.campaign.objectiveType || "APP_PROMOTION"
  next.campaign.campaignType = next.campaign.campaignType || "REGULAR_CAMPAIGN"
  next.campaign.appPromotionType = next.campaign.appPromotionType || "APP_INSTALL"
  next.campaign.budgetMode = next.campaign.budgetMode || "BUDGET_MODE_DAY"
  next.adGroup.adGroupName = next.adGroup.adGroupName ?? ""
  next.adGroup.placementType = next.adGroup.placementType || "PLACEMENT_TYPE_AUTOMATIC"
  next.adGroup.placements = Array.isArray(next.adGroup.placements) ? next.adGroup.placements : []
  next.adGroup.budgetMode = next.adGroup.budgetMode || "BUDGET_MODE_DAY"
  next.adGroup.scheduleType = next.adGroup.scheduleType || "SCHEDULE_FROM_NOW"
  next.adGroup.optimizationGoal = next.adGroup.optimizationGoal || "INSTALL"
  next.adGroup.bidType = next.adGroup.bidType || "BID_TYPE_NO_BID"
  next.adGroup.billingEvent = next.adGroup.billingEvent || "OCPM"
  next.adGroup.operatingSystems = Array.isArray(next.adGroup.operatingSystems) ? next.adGroup.operatingSystems : []
  next.adGroup.locationIds = Array.isArray(next.adGroup.locationIds) ? next.adGroup.locationIds : []
  next.adGroup.countryGroupIds = Array.isArray(next.adGroup.countryGroupIds) ? next.adGroup.countryGroupIds : []
  next.adGroup.ageGroups = Array.isArray(next.adGroup.ageGroups) ? next.adGroup.ageGroups : []
  next.adGroup.languages = Array.isArray(next.adGroup.languages) ? next.adGroup.languages : []
  next.adGroup.gender = next.adGroup.gender || "GENDER_UNLIMITED"
  const rawGroups = Array.isArray(next.adGroups) && next.adGroups.length > 0
    ? next.adGroups
    : [{ adGroup: next.adGroup, ads: Array.isArray(next.ads) && next.ads.length > 0 ? next.ads : [next.ad] }]
  next.adGroups = rawGroups.map((group) => ({
    adGroup: sanitizeTikTokAdGroup({ ...(group.adGroup ?? next.adGroup), adTexts: Array.isArray(group.adGroup?.adTexts) ? group.adGroup.adTexts : (Array.isArray(group.ads) ? group.ads.flatMap((ad) => Array.isArray(ad.adTexts) ? ad.adTexts : ad.adText ? [ad.adText] : []) : []) }),
    ads: (Array.isArray(group.ads) && group.ads.length > 0 ? group.ads : [next.ad]).map(sanitizeTikTokCreative),
  }))
  next.adGroup = next.adGroups[0]?.adGroup ?? sanitizeTikTokAdGroup(next.adGroup)
  next.ads = next.adGroups[0]?.ads ?? []
  next.ad = next.ads[0] ?? sanitizeTikTokCreative(next.ad)
  return next
}

export function sanitizeTikTokAdGroup(adGroup: TikTokRequestFormState["adGroup"]): TikTokRequestFormState["adGroup"] {
  const next = structuredClone(adGroup) as TikTokRequestFormState["adGroup"]
  next.adGroupName = next.adGroupName ?? ""
  next.placementType = next.placementType || "PLACEMENT_TYPE_AUTOMATIC"
  next.placements = Array.isArray(next.placements) ? next.placements : []
  next.budgetMode = next.budgetMode || "BUDGET_MODE_DAY"
  next.scheduleType = next.scheduleType || "SCHEDULE_FROM_NOW"
  next.optimizationGoal = next.optimizationGoal || "INSTALL"
  next.bidType = next.bidType || "BID_TYPE_NO_BID"
  next.billingEvent = next.billingEvent || "OCPM"
  next.operatingSystems = Array.isArray(next.operatingSystems) ? next.operatingSystems : []
  next.locationIds = Array.isArray(next.locationIds) ? next.locationIds : []
  next.countryGroupIds = Array.isArray(next.countryGroupIds) ? next.countryGroupIds : []
  next.ageGroups = Array.isArray(next.ageGroups) ? next.ageGroups : []
  next.languages = Array.isArray(next.languages) ? next.languages : []
  next.gender = next.gender || "GENDER_UNLIMITED"
  next.adTexts = Array.isArray(next.adTexts) ? next.adTexts.map((item) => item ?? "").slice(0, 5) : [""]
  return next
}

export function sanitizeTikTokCreative(ad: TikTokRequestFormState["ad"]): TikTokRequestFormState["ad"] {
  const next = structuredClone(ad) as TikTokRequestFormState["ad"]
  const wasCustomIdentity = isDeprecatedCustomIdentity(next.identityType)
  next.adName = next.adName ?? ""
  next.adFormat = "SINGLE_VIDEO"
  next.callToAction = normalizeCallToAction(next.callToAction)
  next.identityType = normalizeIdentityType(next.identityType)
  if (wasCustomIdentity) {
    next.identityId = undefined
    next.identityAuthorizedBcId = undefined
  }
  next.videoIds = Array.isArray(next.videoIds) ? next.videoIds.filter((item) => item?.trim()) : []
  if (next.videoId?.trim() && !next.videoIds.includes(next.videoId.trim())) next.videoIds = [...next.videoIds, next.videoId.trim()]
  next.videoId = next.videoIds[0] ?? ""
  next.imageIds = Array.isArray(next.imageIds) ? next.imageIds : []
  next.videoAssetIds = Array.isArray(next.videoAssetIds) ? next.videoAssetIds.filter((item) => Number.isFinite(item)) : []
  if (next.videoAssetId && !next.videoAssetIds.includes(next.videoAssetId)) next.videoAssetIds = [...next.videoAssetIds, next.videoAssetId]
  if (next.videoIds.length > 0) next.videoAssetIds = []
  next.videoAssetId = next.videoAssetIds[0]
  next.imageAssetIds = Array.isArray(next.imageAssetIds) ? next.imageAssetIds : []
  if (next.imageIds.length > 0) next.imageAssetIds = []
  next.adTexts = Array.isArray(next.adTexts) ? next.adTexts.map((item) => item ?? "").slice(0, 5) : []
  if (next.adText?.trim() && !next.adTexts.some((item) => item.trim() === next.adText?.trim())) next.adTexts = [...next.adTexts, next.adText.trim()].slice(0, 5)
  next.adText = next.adTexts.find((item) => item.trim())?.trim() ?? ""
  return next
}

function normalizeIdentityType(value?: string | null) {
  const normalized = value?.trim().toUpperCase()
  if (!normalized || normalized === DEPRECATED_CUSTOM_IDENTITY_TYPE) return AUTHORIZED_IDENTITY_TYPE
  return normalized
}

function isDeprecatedCustomIdentity(value?: string | null) {
  return value?.trim().toUpperCase() === DEPRECATED_CUSTOM_IDENTITY_TYPE
}

function normalizeCallToAction(value?: string | null) {
  const normalized = value?.trim().toUpperCase() || "INSTALL_NOW"
  if (normalized === "DOWNLOAD") return "DOWNLOAD_NOW"
  if (normalized === "INSTALL") return "INSTALL_NOW"
  if (normalized === "PLAY") return "PLAY_GAME"
  return normalized
}

export function hasCreativeMedia(form: TikTokRequestFormState) {
  const ads = form.adGroups?.length ? form.adGroups.flatMap((group) => group.ads) : form.ads
  return ads.length > 0 && ads.every((ad) => {
    const hasVideo = (ad.videoIds?.length ?? 0) > 0 || (ad.videoAssetIds?.length ?? 0) > 0
    const hasImage = ad.imageIds.length > 0 || ad.imageAssetIds.length > 0
    return hasVideo && hasImage
  })
}

export function getMediaMode(form: TikTokRequestFormState): TikTokMediaMode {
  const ads = form.adGroups?.length ? form.adGroups.flatMap((group) => group.ads) : form.ads
  return ads.some((ad) => (ad.videoAssetIds?.length ?? 0) > 0 || ad.imageAssetIds.length > 0) ? "upload" : "existing"
}

export function getCreativeMediaMode(creative: TikTokRequestFormState["ad"]): TikTokMediaMode {
  if ((creative.videoIds?.length ?? 0) > 0 || creative.imageIds.length > 0) return "library"
  if ((creative.videoAssetIds?.length ?? 0) > 0 || creative.imageAssetIds.length > 0) return "upload"
  return "upload"
}

export function getCreativeVideoMode(creative: TikTokRequestFormState["ad"]): TikTokMediaMode {
  if ((creative.videoIds?.length ?? 0) > 0) return "library"
  if ((creative.videoAssetIds?.length ?? 0) > 0) return "upload"
  return "upload"
}

export function getCreativeImageMode(creative: TikTokRequestFormState["ad"]): TikTokMediaMode {
  if (creative.imageIds.length > 0) return "library"
  if (creative.imageAssetIds.length > 0) return "upload"
  return "upload"
}

