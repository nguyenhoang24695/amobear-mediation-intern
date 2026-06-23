/**
 * A single placement record returned by any of the InMobi
 * “Placements” endpoints.
 * (Docs: https://publisher.inmobi.com/rest/api/v1/placements)
 */
export default interface InMobiPlacementResponse {
  placementId: number;
  placementName: string;
  placementType: "INTERSTITIAL" | "BANNER" | "REWARDED_VIDEO" | "NATIVE";
  testMode: "ON" | "GLOBAL" | "OFF" | string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVE" | "FLAGGED" | string;
  appId: number;
  cpmFloor?: number;
  isAudienceBiddingEnabled: boolean;
  audienceBiddingPartner?: string;
  a9TagId?: string;
  a9AppId?: string;
  isFallbackPlacement: boolean;
  createdOn: string;
}
