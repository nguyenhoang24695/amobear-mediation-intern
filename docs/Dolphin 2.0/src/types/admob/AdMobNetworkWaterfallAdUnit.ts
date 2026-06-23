export default interface AdMobNetworkWaterfallAdUnit {
  name: string;
  admobNetworkWaterfallAdUnitId: string;
  appId: string;
  displayName: string;
  format: string;
  adTypes: string[];
  cpmFloorSettings: {
    globalFloorMicros: string;
    regionCpmFloors: [
      {
        regionCode: string;
        regionFloorMicros: string;
      },
    ];
  };
  mappingSetting: {
    primaryAdUnitId: string;
    adUnitMappingId: string;
  };
}
