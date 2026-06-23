/**
 * Single ad-location (a.k.a. “placement”) object.
 * Returned by ad-location APIs in v5.
 */
export default interface ChartboostPlacementResponse {
  uuid: string; // primary key
  name: string;
  ad_type: "interstitial" | "rewarded" | "banner";
  type: "bidding" | "fixed_cpm" | "auto_cpm" | "cross_promo" | "mock_response";
  // Only present for fixed_cpm locations
  country_targeting?: {
    country: string; // "default" or ISO-2
    price: number; // USD CPM
  }[];
}
