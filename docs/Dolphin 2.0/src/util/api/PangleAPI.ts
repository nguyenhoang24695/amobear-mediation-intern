import PangleApplication from "../../types/pangle/PangleApplication";
import PanglePlacementResponse from "../../types/pangle/PanglePlacementResponse";
import { WaterfallNetworkID } from "../../types/Networks";

import SHA1 from "crypto-js/sha1";

export type PlacementKind = 1 | 2 | 3 | 5 | 6;

const BASE = "/pangle/union/media/open_api";

const VERSION = "1.0";

/* -------------------------------------------------------------------------- */
/*  API class                                                                 */
/* -------------------------------------------------------------------------- */
export default class PangleAPI {
  /* ──────────────────────────────────────────────────────────────────── */
  /*  0-A  Applications (sites)                                          */
  /* ──────────────────────────────────────────────────────────────────── */
  static async getApplications(
    status: number[] = [2],
    page = 1,
    pageSize = 200
  ): Promise<PangleApplication[]> {
    const res = (await this.post("site/query", {
      status,
      page,
      page_size: pageSize,
    })) as any;

    return Array.isArray(res?.data?.app_list) ? res.data.app_list : [];
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  1-A  Create Placement                                              */
  /* ──────────────────────────────────────────────────────────────────── */

  /**
   * Minimal strongly-typed options per ad-slot-type. Only parameters that
   * Pangle expects for that type are accepted.
   */

  static async createPlacement(
    appId: number,
    name: string,
    biddingType: 0 | 1 | 2,
    opts: CreatePlacementOpts,
    cpm: string,
    currency = "usd"
  ): Promise<PanglePlacementResponse> {
    const base: Record<string, any> = {
      app_id: appId,
      ad_slot_type: opts.adSlotType,
      ad_slot_name: name,
      bidding_type: biddingType,
      cpm: biddingType === 1 ? undefined : cpm,
      currency,
    };

    let specific: Record<string, any> = {};

    switch (opts.adSlotType) {
      case 1:
        specific = {
          render_type: 2,
          ad_categories: opts.adCategories,
        };
        break;
      case 2:
        specific = {
          render_type: 1,
          slide_banner: opts.slideBanner,
          width: opts.width,
          height: opts.height,
        };
        break;
      case 3:
        specific = {
          render_type: 1,
          orientation: opts.orientation,
          ...(opts.acceptMaterialType && {
            accept_material_type: opts.acceptMaterialType,
          }),
        };
        break;
      case 5:
        specific = {
          render_type: 1,
          orientation: opts.orientation,
          reward_name: opts.rewardName,
          reward_count: opts.rewardCount,
          reward_is_callback: opts.rewardIsCallback,
          ...(opts.rewardCallbackUrl && {
            reward_callback_url: opts.rewardCallbackUrl,
          }),
        };
        break;
      case 6:
        specific = {
          render_type: 1,
          orientation: opts.orientation,
          ...(opts.acceptMaterialType && {
            accept_material_type: opts.acceptMaterialType,
          }),
        };
        break;
    }

    return (
      (await this.post("code/create", {
        ...base,
        ...specific,
      })) as any
    ).data as PanglePlacementResponse;
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  1-B  Batch Create                                                  */
  /* ──────────────────────────────────────────────────────────────────── */
  static async createPlacementsBatch(
    appId: number,
    biddingType: 0 | 1 | 2,
    placements: { name: string; opts: CreatePlacementOpts; cpm: string }[]
  ) {
    const out: PanglePlacementResponse[] = [];
    for (const p of placements) {
      try {
        out.push(
          await this.createPlacement(appId, p.name, biddingType, p.opts, p.cpm)
        );
      } catch (e) {
        console.error(`Pangle create failed for “${p.name}” →`, e);
      }
    }
    return out;
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  1-C  Update Placement                                              */
  /* ──────────────────────────────────────────────────────────────────── */
  static async updatePlacement(
    placementId: number,
    fields: Partial<
      Omit<
        RewardedOpts & BannerOpts & AppOpenOpts & InterstitialOpts & NativeOpts,
        "adSlotType"
      > & { adSlotName?: string; status?: -1 | 2 | 3 | 6 }
    >,
    cpm: string
  ): Promise<PanglePlacementResponse> {
    const body: Record<string, any> = {
      ad_slot_id: placementId,
      cpm,
      currency: "usd",
    };

    if (fields.adSlotName) body.ad_slot_name = fields.adSlotName;
    if (fields.status !== undefined) body.status = fields.status;

    /** add only valid extra keys – iterate whitelist */
    const allowedKeys = [
      "slide_banner",
      "width",
      "height",
      "orientation",
      "render_type",
      "reward_name",
      "reward_count",
      "reward_is_callback",
      "reward_callback_url",
      "accept_material_type",
      "ad_categories",
    ];
    allowedKeys.forEach((k) => {
      if ((fields as any)[k] !== undefined) body[k] = (fields as any)[k];
    });

    return (await this.post("code/update", body)) as PanglePlacementResponse;
  }

  static async batchUpdatePlacements(
    updates: {
      placementId: number;
      cpm: string;
      fields: Parameters<typeof PangleAPI.updatePlacement>[1];
    }[]
  ): Promise<PanglePlacementResponse[]> {
    const out: PanglePlacementResponse[] = [];
    for (const u of updates) {
      try {
        out.push(await this.updatePlacement(u.placementId, u.fields, u.cpm));
      } catch (e) {
        console.error(`Pangle update failed id=${u.placementId}`, e);
      }
    }
    return out;
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  1-D  List Placements                                               */
  /* ──────────────────────────────────────────────────────────────────── */
  static async listPlacements(
    appId: number,
    page = 1,
    pageSize = 200
  ): Promise<PanglePlacementResponse[]> {
    const res = (await this.post("code/query", {
      app_id: [appId],
      page,
      page_size: pageSize,
    })) as any;

    return Array.isArray(res?.data?.ad_slot_list) ? res.data.ad_slot_list : [];
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  1-E  Update Expected CPM                                           */
  /* ──────────────────────────────────────────────────────────────────── */
  static async updateExpectedCpm(
    placementId: number,
    country: string,
    expectedCpm: number
  ): Promise<PanglePlacementResponse> {
    return (await this.post("expected_cpm", {
      ad_slot_id: placementId,
      expected_cpm_list: [
        { country: country.toLowerCase(), expected_cpm: expectedCpm },
      ],
    })) as PanglePlacementResponse;
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  2-0  Core helpers                                                  */
  /* ──────────────────────────────────────────────────────────────────── */

  private static async post(path: string, payload: Record<string, any>) {
    const body = { ...(await this.getAuthParams()), ...payload };
    return this.doRequest(`${BASE}/${path}`, body);
  }

  private static async doRequest(url: string, body: Record<string, any>) {
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          ...(process.env.NODE_ENV !== "production" && {
            "X-Tt-Env": "open_api_sandbox", // dev-proxy hits live anyway, harmless
          }),
        },
        body: JSON.stringify(body),
      })
        .then((r) => r.json())
        .then((res) => resolve(res))
        .catch(reject);
    });
  }

  private static async getAuthParams() {
    const raw = localStorage.getItem("configurations");
    if (!raw) throw new Error("No configurations in localStorage");

    const cfg = JSON.parse(raw)[WaterfallNetworkID.Pangle] ?? {};
    const { userId, roleId, securityKey } = cfg;
    if (!userId || !roleId || !securityKey)
      throw new Error("Incomplete Pangle credentials");

    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.floor(Math.random() * 1e6);

    return {
      user_id: Number(userId),
      role_id: Number(roleId),
      timestamp,
      nonce,
      sign: this.sign(securityKey, timestamp, nonce),
      version: VERSION,
    };
  }

  private static sign(key: string, ts: number, nonce: number) {
    return SHA1([key, String(ts), String(nonce)].sort().join(""))
      .toString()
      .toLowerCase();
  }
}

type NativeOpts = {
  adSlotType: 1;
  adCategories: number[]; // 4, 11, 12, 13
};

type BannerOpts = {
  adSlotType: 2;
  slideBanner: 1 | 2;
  width: number;
  height: number;
  renderType?: 1; // defaults to 1
};

type AppOpenOpts = {
  adSlotType: 3;
  orientation: 1 | 2;
  acceptMaterialType?: 1 | 2 | 3;
  renderType?: 1; // defaults to 1
};

type RewardedOpts = {
  adSlotType: 5;
  orientation: 1 | 2;
  rewardName: string;
  rewardCount: number;
  rewardIsCallback: 0 | 1;
  rewardCallbackUrl?: string;
  renderType?: 1; // defaults to 1
};

type InterstitialOpts = {
  adSlotType: 6;
  orientation: 1 | 2;
  acceptMaterialType?: 2 | 3;
  renderType?: 1; // defaults to 1
};

export type CreatePlacementOpts =
  | NativeOpts
  | BannerOpts
  | AppOpenOpts
  | RewardedOpts
  | InterstitialOpts;
