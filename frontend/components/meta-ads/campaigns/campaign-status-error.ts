import type { CampaignStatusActionKind } from "@/components/meta-ads/campaigns/campaign-status-action"

export interface CampaignStatusUpdateError {
  campaignId: number
  campaignName: string
  action: CampaignStatusActionKind
  message: string
  occurredAt: string
}

const STORAGE_PREFIX = "meta-campaign-status-error:"

function getStorageKey(campaignId: number) {
  return `${STORAGE_PREFIX}${campaignId}`
}

export function saveCampaignStatusError(error: CampaignStatusUpdateError) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(getStorageKey(error.campaignId), JSON.stringify(error))
}

export function readCampaignStatusError(campaignId: number): CampaignStatusUpdateError | null {
  if (typeof window === "undefined") return null

  const raw = window.sessionStorage.getItem(getStorageKey(campaignId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CampaignStatusUpdateError>
    if (
      parsed.campaignId !== campaignId ||
      parsed.action !== "pause" && parsed.action !== "resume" ||
      typeof parsed.message !== "string" ||
      typeof parsed.occurredAt !== "string"
    ) {
      return null
    }

    return {
      campaignId,
      campaignName: typeof parsed.campaignName === "string" ? parsed.campaignName : "Selected campaign",
      action: parsed.action,
      message: parsed.message,
      occurredAt: parsed.occurredAt,
    }
  } catch {
    return null
  }
}

export function clearCampaignStatusError(campaignId: number) {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(getStorageKey(campaignId))
}
