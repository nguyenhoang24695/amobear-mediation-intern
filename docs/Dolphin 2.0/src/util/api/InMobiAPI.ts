import InMobiApplication from "../../types/inmobi/InMobiApplication";
import InMobiPlacementResponse from "../../types/inmobi/InMobiPlacementResponse";
import { WaterfallNetworkID } from "../../types/Networks";

// util/InMobiAPI.ts
const BASE = "/inmobi";

const URL = `${BASE}/rest/api`; // everything else stays the same

type PlacementKind = "INTERSTITIAL" | "REWARDED_VIDEO" | "BANNER" | "NATIVE";

export default class InMobiAPI {
  /* --------------------------------------------------------------------- */
  /* 0-A  APPS                                                              */
  /* --------------------------------------------------------------------- */

  static async getApplications(): Promise<InMobiApplication[]> {
    const url = `${URL}/v2/apps?pageNum=1&pageLength=1000`;
    const options = await this.createOptions("GET");

    type Resp =
      | { success: true; data: { records: InMobiApplication[] } }
      | { success: false };
    const res = (await this.doRequest(url, options)) as Resp;

    return res && (res as any).data?.records ? (res as any).data.records : [];
  }

  /* --------------------------------------------------------------------- */
  /* 1-A  CREATE PLACEMENT (one-by-one)                                     */
  /* --------------------------------------------------------------------- */
  static async createPlacement(
    appId: number,
    name: string,
    type: PlacementKind,
    cpmFloor: number,
    isAudienceBiddingEnabled = false
  ): Promise<InMobiPlacementResponse> {
    const url = `${URL}/v1/placements`;

    const body = {
      appId,
      placementName: `${name} ${Date.now()}`, // avoid collisions
      placementType: type,
      cpmFloor,
      isAudienceBiddingEnabled,
    };

    const options = await this.createOptions("POST", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<InMobiPlacementResponse>;
  }

  /* --------------------------------------------------------------------- */
  /* 1-B  BATCH CREATE PLACEMENTS                                           */
  /* --------------------------------------------------------------------- */
  static async createPlacementsBatch(
    placements: {
      appId: number;
      name: string;
      type: PlacementKind;
      cpmFloor?: number;
    }[]
  ): Promise<InMobiPlacementResponse[]> {
    const url = `${URL}/v1/placements`;
    const headers = await this.getAuthHeaders();
    const out: InMobiPlacementResponse[] = [];

    for (const p of placements) {
      const body = {
        appId: p.appId,
        placementName: `${p.name} ${Date.now()}`,
        placementType: p.type,
        cpmFloor: !p.cpmFloor ? undefined : p.cpmFloor,
        isAudienceBiddingEnabled: !p.cpmFloor ? true : false,
        audienceBiddingPartner: !p.cpmFloor ? "GOOGLE_SDK_BIDDING" : undefined,
      };

      const res = (
        (await this.doRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        })) as any
      ).data as InMobiPlacementResponse;

      out.push({ ...res, cpmFloor: p.cpmFloor });
    }
    return out;
  }

  /* --------------------------------------------------------------------- */
  /* 1-C  UPDATE PLACEMENT (one-by-one)                                     */
  /* --------------------------------------------------------------------- */
  static async updatePlacement(
    placementId: number,
    name: string,
    cpmFloor: number,
    isAudienceBiddingEnabled = false
  ): Promise<InMobiPlacementResponse> {
    const url = `${URL}/v1/placements/${placementId}`;

    const body = {
      placementName: `${name} ${Date.now()}`,
      cpmFloor,
      isAudienceBiddingEnabled,
    };

    const options = await this.createOptions("PATCH", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<InMobiPlacementResponse>;
  }

  /* --------------------------------------------------------------------- */
  /* 1-D  BATCH UPDATE PLACEMENTS                                           */
  /* --------------------------------------------------------------------- */
  static async batchUpdatePlacements(
    updates: {
      placementId: number;
      name: string;
      cpmFloor: number;
      isAudienceBiddingEnabled?: boolean;
    }[]
  ): Promise<InMobiPlacementResponse[]> {
    const headers = await this.getAuthHeaders();
    const out: InMobiPlacementResponse[] = [];

    for (const u of updates) {
      const url = `${URL}/v1/placements/${u.placementId}`;
      const body = {
        placementName: `${u.name} ${Date.now()}`,
        cpmFloor: u.cpmFloor,
        isAudienceBiddingEnabled: u.isAudienceBiddingEnabled ?? false,
      };

      const res = (
        (await this.doRequest(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        })) as any
      ).data as InMobiPlacementResponse;

      out.push(res);
    }
    return out;
  }

  /* --------------------------------------------------------------------- */
  /* 1-E  LIST PLACEMENTS FOR AN APP                                        */
  /* --------------------------------------------------------------------- */
  static async listPlacements(
    appId: number
  ): Promise<InMobiPlacementResponse[]> {
    const url = `${URL}/v1/placements?appId=${appId}`;
    const options = await this.createOptions("GET");

    type Resp =
      | { success: true; data: { records: InMobiPlacementResponse[] } }
      | { success: false };
    const res = (await this.doRequest(url, options)) as Resp;

    return res && (res as any).data?.records ? (res as any).data.records : [];
  }

  /* --------------------------------------------------------------------- */
  /* 2-0  COMMON REQUEST WRAPPER + AUTH                                     */
  /* --------------------------------------------------------------------- */
  private static async doRequest(url: string, options: any) {
    return new Promise((resolve, reject) => {
      fetch(url, options)
        .then((r) => r.json())
        .then((res) => resolve(res))
        .catch((e) => reject(e));
    });
  }

  private static async createOptions(method: string, body?: string) {
    return {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(await this.getAuthHeaders()),
      },
      body,
    };
  }

  /**
   * Pulls x-client-secret, x-account-id and x-client-id from
   * localStorage.configurations[NetworkID.InMobi]
   * and translates them into request headers.
   */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const stored = localStorage.getItem("configurations");
    if (!stored) throw new Error("No configurations found in localStorage");

    const configs = JSON.parse(stored);
    if (!configs.hasOwnProperty(WaterfallNetworkID.InMobi))
      throw new Error("InMobi configuration not found in localStorage");

    const { clientSecret, accountId, clientId } =
      configs[WaterfallNetworkID.InMobi];

    if (!clientSecret || !accountId || !clientId)
      throw new Error("Incomplete InMobi credentials in localStorage");

    return {
      "x-client-secret": clientSecret,
      "x-account-id": accountId,
      "x-client-id": clientId,
    };
  }
}
