/**
 * A single app record returned by any of the InMobi “Apps” endpoints.
 * (Docs: https://publisher.inmobi.com/rest/api/v2/apps)
 */
export default interface InMobiApplication {
  storeUrl: string;
  appName: string;
  platform: "Android" | "iPhone" | "iOS";
  bundleId: string;
  childDirected: 1 | 2 | 3;
  appRating: string;
  appId: number;
}
