/**
 * Strongly‑typed representation of a Pangle “App” (aka “Site”).
 *
 * Based on the Open API docs — fields not always present are marked optional.
 */
export default interface PangleApplication {
  /** Numeric identifier assigned by Pangle */
  app_id: number;

  /** Human‑readable app/site name */
  app_name: string;

  /**
   * 1 = deleted, 2 = live, 3 = test (per Pangle spec)
   * Use the numeric code as returned by the API.
   */
  status: number;

  /* Optional metadata — Pangle may omit these depending on the call */
  package_name?: string;
  download_url?: string;
  app_category_code?: number;
  apk_sign?: string;
  os_type: "android" | "ios";

  /** ISO‑8601 timestamps */
  created_at?: string;
  updated_at?: string;

  /** Catch‑all — ensures future compatibility with new attributes */
  [key: string]: unknown;
}
