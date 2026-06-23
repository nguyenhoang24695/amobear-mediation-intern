import LiftOffApplication from "./LiftOffApplication";

export default interface LiftoffPlacementResponse {
  allowEndCards: boolean;
  application: LiftOffApplication;
  id: string;
  isSkippable: boolean;
  mutable: boolean;
  name: string;
  referenceID: string;
  status: string;
  type: "interstitial" | "rewarded" | "banner" | "appopen" | "native";
  isHBParticipation?: boolean;
  videoOrientationOverride: string;
  cpm?: number;
}
