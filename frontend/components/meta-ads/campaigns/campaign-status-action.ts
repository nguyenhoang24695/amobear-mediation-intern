export type CampaignStatusActionKind = "pause" | "resume"

export interface CampaignStatusActionInput {
  name: string
  status?: string | null
  effectiveStatus?: string | null
}

export interface CampaignStatusAction {
  action: CampaignStatusActionKind
  label: string
  targetStatus: "ACTIVE" | "PAUSED"
  confirmTitle: string
  confirmDescription: string
}

function normalizeStatus(value?: string | null): string {
  return (value ?? "").trim().toUpperCase()
}

export function getCampaignStatusAction(campaign: CampaignStatusActionInput): CampaignStatusAction | null {
  const status = normalizeStatus(campaign.status)
  if (status === "PAUSED") {
    return {
      action: "resume",
      label: "Resume Campaign",
      targetStatus: "ACTIVE",
      confirmTitle: "Resume Campaign?",
      confirmDescription: "This campaign will be set to ACTIVE at campaign level and may start spending if its ad sets, ads, account, schedule, and review state allow delivery.",
    }
  }

  if (status === "ACTIVE") {
    return {
      action: "pause",
      label: "Pause Campaign",
      targetStatus: "PAUSED",
      confirmTitle: "Pause Campaign?",
      confirmDescription: "This campaign will be set to PAUSED at campaign level and delivery will stop until it is resumed.",
    }
  }

  return null
}

export function isCampaignStatusActionBlocked(campaign: CampaignStatusActionInput): boolean {
  const status = normalizeStatus(campaign.status)
  return status === "ARCHIVED" || status === "DELETED"
}
