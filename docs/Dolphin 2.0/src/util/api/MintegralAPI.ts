import MD5 from "crypto-js/md5";
import MintegralMedia from "../../types/mintegral/MintegralMedia";
import MintegralPlacementResponse from "../../types/mintegral/MintegralPlacementResponse";
import MintegralUnitResponse from "../../types/mintegral/MintegralUnitResponse";
import { WaterfallNetworkID } from "../../types/Networks";

/* ───────────────────────── CONFIG ───────────────────────── */

const BASE_URL = "/mintegral";

type MediaListParams = {
  package?: string;
  os?: "ANDROID" | "IOS";
};

type CreatePlacementOptions = {
  contentType?: "image" | "video" | "both";
  videoOrientation?: "portrait" | "landscape" | "both";
  showCloseButton?: 0 | 1;
  autoFresh?: 0 | 1;
  adSpaceType?: 1 | 2;
  unitNames?: string[];
  hbUnitName?: string;
  skipTime?: number;
};

type UpdatePlacementOptions = Partial<CreatePlacementOptions> & {
  placementName?: string;
};

type CreateUnitOptions = {
  biddingType?: 0 | 1;
  ecpmFloor?: Record<string, number>;
  targetEcpm?: Record<string, number>;
};

type UpdateUnitOptions = Partial<CreateUnitOptions> & {
  unitName?: string;
  clearEcpmFloor?: 0 | 1;
  clearTargetEcpm?: 0 | 1;
};

export default class MintegralAPI {
  /* ──────────────────── 0 • AUTH HELPERS ───────────────────── */

  private static getAuthParams(): { skey: string; time: string; sign: string } {
    const stored = localStorage.getItem("configurations");
    if (!stored) throw new Error("No configurations in localStorage");

    const cfg = JSON.parse(stored)[WaterfallNetworkID.Mintegral];
    if (!cfg?.skey || !cfg?.secret) {
      throw new Error("Mintegral credentials missing in localStorage");
    }

    const time = Math.floor(Date.now() / 1000).toString();
    const inner = MD5(time).toString();
    const sign = MD5(cfg.secret + inner)
      .toString()
      .toLowerCase();

    return { skey: cfg.skey, time, sign };
  }

  private static async doRequest<T = any>(
    path: string,
    params: Record<string, any>,
    method: "GET" | "POST" = "POST"
  ): Promise<T> {
    const auth = this.getAuthParams();
    const allParams = { ...auth, ...params };
    let url = `${BASE_URL}${path}`;
    let body: URLSearchParams | undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };

    if (method === "GET") {
      const qs = new URLSearchParams(
        Object.entries(allParams).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${qs}`;
    } else {
      body = new URLSearchParams();
      for (const [k, v] of Object.entries(allParams)) {
        if (v !== undefined && v !== null) {
          body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        }
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
    });
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(`Mintegral API error ${json.code}: ${json.msg}`);
    }
    return json.data;
  }

  /* ──────────────────── 1 • MEDIA MODULE ───────────────────── */

  static async listMedia(
    filters: MediaListParams = {}
  ): Promise<MintegralMedia[]> {
    return this.doRequest("/v2/app/open_api_list", filters, "GET").then(
      (data: any) => (Array.isArray(data.lists) ? data.lists : [])
    );
  }

  /* ──────────────────── 2 • PLACEMENT MODULE ───────────────── */

  static async listPlacements(
    appId?: number
  ): Promise<MintegralPlacementResponse[]> {
    return this.doRequest(
      "/v2/placement/open_api_list",
      appId ? { app_id: appId } : {},
      "GET"
    ).then((data: any) => (Array.isArray(data.lists) ? data.lists : []));
  }

  /* ──────────────────── 3 • UNIT MODULE ────────────────────── */

  static async createUnit(
    appId: number,
    placementId: number,
    unitName: string,
    options: CreateUnitOptions = {}
  ): Promise<MintegralUnitResponse> {
    const data: any = {
      app_id: appId,
      placement_id: placementId,
      bidding_type: options.biddingType,
      unit_name: unitName,
      // ecpm_floor: options.biddingType === 1 ? undefined : options.ecpmFloor,
    };

    // Check if ecpmFloor exists and is not undefined
    if (options.ecpmFloor) {
      // Assuming ecpmFloor is always of the format { ALL: value }
      const key = Object.keys(options.ecpmFloor)[0];
      const value = options.ecpmFloor[key];
      data[`target_ecpm[${key}]`] = value;
    }

    return this.doRequest("/v2/unit/open_api_create", data);
  }

  static async updateUnit(
    appId: number,
    placementId: number,
    unitId: number,
    updates: UpdateUnitOptions
  ): Promise<MintegralUnitResponse> {
    const data: any = {
      app_id: appId,
      placement_id: placementId,
      unit_id: unitId,
      unit_name: updates.unitName,
      clear_target_ecpm: updates.clearEcpmFloor,
    };

    // Check if ecpmFloor exists and is not undefined
    if (updates.ecpmFloor) {
      // Assuming ecpmFloor is always of the format { ALL: value }
      const key = Object.keys(updates.ecpmFloor)[0];
      const value = updates.ecpmFloor[key];
      data[`target_ecpm[${key}]`] = value;
    }

    return this.doRequest("/v2/unit/open_api_edit", data);
  }

  static async deleteUnits(
    unitIds: number[]
  ): Promise<{ publisher_id: number }> {
    return this.doRequest("/unit/open_api_delete", {
      unit_ids: unitIds.join(","),
    });
  }

  static async listUnits(
    placementId?: number
  ): Promise<MintegralUnitResponse[]> {
    return this.doRequest(
      "/v2/unit/open_api_list",
      placementId ? { placement_id: placementId } : {},
      "GET"
    ).then((data: any) => (Array.isArray(data.lists) ? data.lists : []));
  }
}
