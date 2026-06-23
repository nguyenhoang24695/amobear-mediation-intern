export default interface AdUnit {
  name: string;
  adUnitId: string;
  appId: string;
  displayName: string;
  adFormat: string;
  adTypes: [AD_TYPES];
  rewardSettings: {
    unitAmount: string;
    unitType: string;
  };
  cpmFloorSettings: {
    globalFloorMicros: string;
    regionCpmFloors: [
      {
        regionCode: string;
        regionFloorMicros: string;
      }
    ];
  };
  refreshRateSettings: {
    googleOptimizationEnabled: boolean;
    refreshInterval: string;
  };
}

export enum AD_TYPES {
  RICH_MEDIA,
  VIDEO,
}

export enum AD_FORMAT {
  APP_OPEN,
  BANNER,
  BANNER_INTERSTITIAL,
  INTERSTITIAL,
  NATIVE,
  REWARDED,
}
