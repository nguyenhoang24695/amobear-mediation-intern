/**
 * Pangle response format for Placement (aka “ad_slot”) create / update / query
 * endpoints.
 *
 * The Open API isn’t entirely consistent across endpoints, so this interface
 * uses optional properties liberally. Extend as you uncover new attributes.
 */
export interface ExpectedCpm {
  country: string; // ISO‑3166‑1 alpha‑2 (e.g. "cn", "us")
  expected_cpm: number;
}

export default interface PanglePlacementResponse {
  /** Unique identifier of the placement (ad slot) */
  ad_slot_id: number;

  /** Human‑readable name */
  ad_slot_name: string;

  /** Slot type. See `PlacementKind` in util/PangleAPI.ts */
  ad_slot_type: number;

  /** 0 = waterfall, 2 = bidding */
  bidding_type?: number;

  /** Render type (1 = template, 2 = custom native, …) */
  render_type?: number;

  slide_banner?: number;
  width?: number;
  height?: number;

  /** 1 = deleted, 2 = live, 3 = test */
  status?: number;

  expected_cpm_list?: ExpectedCpm[];

  /** ISO‑8601 create/update timestamps */
  created_at?: string;
  updated_at?: string;

  /** Catch‑all for any extra fields */
  [key: string]: unknown;
}
