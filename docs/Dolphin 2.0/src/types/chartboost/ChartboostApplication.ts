/**
 * Single “app” record returned by GET /v5/apps
 * We keep only the fields Builder cares about.
 */
export default interface ChartboostApplication {
  id: string; // “64054c7d…”
  nickname: string;
  platform: "android" | "ios" | "amazon";
  is_live: boolean;
  store_app_id: string | null; // e.g. "com.example"
  name: string | null; // store name
}
