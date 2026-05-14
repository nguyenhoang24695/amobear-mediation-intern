import type { CreateTikTokCampaignRequestDto, TikTokOptionDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"

export type TikTokRequestFormState = CreateTikTokCampaignRequestDto
export type TikTokRequestSectionTarget = "account-app" | "campaign-settings" | "adgroup-audience" | "adgroup-budget" | "creative" | "ad"
export type TikTokMediaMode = "upload" | "existing"

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
    appRowId: 0,
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
      ageGroups: [],
      gender: reference?.genders[0]?.key ?? "GENDER_UNLIMITED",
      languages: [],
    },
    ad: {
      adName: "",
      adFormat: "SINGLE_VIDEO",
      videoId: "",
      imageIds: [],
      imageAssetIds: [],
      adText: "",
      callToAction: reference?.callToActions[0]?.key ?? "INSTALL_NOW",
      landingPageUrl: "",
      identityType: reference?.identityTypes.find((option) => !isDeprecatedCustomIdentity(option.key))?.key ?? AUTHORIZED_IDENTITY_TYPE,
      displayName: "",
      appName: "",
    },
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
  setIfDefined(adGroup, "ageGroups", stringArrayValue(pick(adGroupSource, "ageGroups", "AgeGroups")))
  setIfDefined(adGroup, "gender", stringValue(pick(adGroupSource, "gender", "Gender")))
  setIfDefined(adGroup, "languages", stringArrayValue(pick(adGroupSource, "languages", "Languages")))

  const ad: PayloadRecord = {}
  setIfDefined(ad, "adName", stringValue(pick(adSource, "adName", "AdName")))
  setIfDefined(ad, "adFormat", stringValue(pick(adSource, "adFormat", "AdFormat")))
  setIfDefined(ad, "videoId", stringValue(pick(adSource, "videoId", "VideoId")))
  setIfDefined(ad, "imageIds", stringArrayValue(pick(adSource, "imageIds", "ImageIds")))
  setIfDefined(ad, "videoAssetId", numberValue(pick(adSource, "videoAssetId", "VideoAssetId")))
  setIfDefined(ad, "imageAssetIds", numberArrayValue(pick(adSource, "imageAssetIds", "ImageAssetIds")))
  setIfDefined(ad, "adText", stringValue(pick(adSource, "adText", "AdText")))
  setIfDefined(ad, "callToAction", stringValue(pick(adSource, "callToAction", "CallToAction")))
  setIfDefined(ad, "landingPageUrl", stringValue(pick(adSource, "landingPageUrl", "LandingPageUrl")))
  setIfDefined(ad, "trackingUrl", stringValue(pick(adSource, "trackingUrl", "TrackingUrl")))
  setIfDefined(ad, "identityId", stringValue(pick(adSource, "identityId", "IdentityId")))
  setIfDefined(ad, "identityType", stringValue(pick(adSource, "identityType", "IdentityType")))
  setIfDefined(ad, "displayName", stringValue(pick(adSource, "displayName", "DisplayName")))
  setIfDefined(ad, "appName", stringValue(pick(adSource, "appName", "AppName")))
  setIfDefined(ad, "avatarIconWebUri", stringValue(pick(adSource, "avatarIconWebUri", "AvatarIconWebUri")))

  return {
    tikTokAdAccountRowId: numberValue(pick(root, "tikTokAdAccountRowId", "TikTokAdAccountRowId")),
    appRowId: numberValue(pick(root, "appRowId", "AppRowId")),
    idempotencyKey: stringValue(pick(root, "idempotencyKey", "IdempotencyKey")),
    campaign,
    adGroup,
    ad,
  } as unknown as Partial<TikTokRequestFormState>
}

export function sanitizeTikTokRequestForm(state: TikTokRequestFormState): TikTokRequestFormState {
  const next = structuredClone(state) as TikTokRequestFormState
  const wasCustomIdentity = isDeprecatedCustomIdentity(next.ad.identityType)
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
  next.adGroup.ageGroups = Array.isArray(next.adGroup.ageGroups) ? next.adGroup.ageGroups : []
  next.adGroup.languages = Array.isArray(next.adGroup.languages) ? next.adGroup.languages : []
  next.adGroup.gender = next.adGroup.gender || "GENDER_UNLIMITED"
  next.ad.adName = next.ad.adName ?? ""
  next.ad.adFormat = next.ad.adFormat || "SINGLE_VIDEO"
  next.ad.callToAction = normalizeCallToAction(next.ad.callToAction)
  next.ad.identityType = normalizeIdentityType(next.ad.identityType)
  if (wasCustomIdentity) next.ad.identityId = undefined
  next.ad.imageIds = Array.isArray(next.ad.imageIds) ? next.ad.imageIds : []
  next.ad.imageAssetIds = Array.isArray(next.ad.imageAssetIds) ? next.ad.imageAssetIds : []
  if (next.ad.adFormat === "SINGLE_VIDEO") {
    next.ad.imageIds = []
    next.ad.imageAssetIds = []
  }
  if (next.ad.adFormat === "SINGLE_IMAGE") {
    next.ad.videoId = ""
    next.ad.videoAssetId = undefined
  }
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
  return form.ad.adFormat === "SINGLE_VIDEO"
    ? !!(form.ad.videoId?.trim() || form.ad.videoAssetId)
    : form.ad.imageIds.length > 0 || form.ad.imageAssetIds.length > 0
}

export function getMediaMode(form: TikTokRequestFormState): TikTokMediaMode {
  return form.ad.videoAssetId || form.ad.imageAssetIds.length > 0 ? "upload" : "existing"
}
