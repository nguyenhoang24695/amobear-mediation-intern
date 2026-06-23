import LiftoffStore from "./LiftOffStore";

export default interface LiftOffApplication {
  isCoppa: boolean;
  name: string;
  platform: "ios" | "android";
  store: LiftoffStore;
  id: string;
  owner: string;
  placement_count: number;
  status: string;
  vungleAppId: string;
  connection: string;
  forceView: {
    nonRewarded: boolean;
    rewarded: boolean;
  };
  maxVideoLength: number;
  minOsVer: string;
  orientation: string;
  tagFilters: {
    blacklist: string[];
  };
  testDevices: string[];
}
