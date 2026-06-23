import LiftOffApplication from "../../types/liftoff/LiftOffApplication";
import LiftoffPlacementResponse from "../../types/liftoff/LiftoffPlacementResponse";
import { WaterfallNetworkID } from "../../types/Networks";

const URL = "https://publisher-api.vungle.com";
type PlacementKind =
  | "interstitial"
  | "rewarded"
  | "banner"
  | "appopen"
  | "native";

export default class LiftOffAPI {
  static async getApplications(): Promise<LiftOffApplication[]> {
    const url = `${URL}/api/v1/applications`;

    const options = await this.createOptions("GET");

    const response = (await this.doRequest(
      url,
      options
    )) as LiftOffApplication[];

    return response;
  }

  /* ----------------------------------------------------------------------- */
  /* 1-A  CREATE (one-by-one)                                                */
  /* ----------------------------------------------------------------------- */
  static async createPlacement(
    applicationId: string,
    name: string,
    type: "interstitial" | "rewarded" | "banner" | "appopen", // ➊
    cpm: number, // ➊ new
    allowEndCards = true,
    isHBParticipation = false
  ): Promise<LiftoffPlacementResponse> {
    const url = `${URL}/api/v1/placements`;

    const body = {
      application: applicationId,
      name: name + " " + new Date().getTime(), // add timestamp to avoid name collisions
      type,
      allowEndCards,
      /* Flat CPM – spec requires *both* keys: */
      flatCPM: isHBParticipation ? undefined : { default: cpm }, // ➋
      isFlatCPMEnabled: isHBParticipation ? undefined : true, // ➋
      isHBParticipation: isHBParticipation || undefined,
    };

    const options = await this.createOptions("POST", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<LiftoffPlacementResponse>;
  }

  /* ----------------------------------------------------------------------- */
  /* 1-B  BATCH CREATE (used by Builder)                                     */
  /* ----------------------------------------------------------------------- */

  static async createPlacementsBatch(
    placements: {
      applicationId: string;
      name: string;
      type: PlacementKind;
      cpm?: number; // ➌ already present
      allowEndCards?: boolean;
    }[]
  ): Promise<LiftoffPlacementResponse[]> {
    const url = `${URL}/api/v1/placements`;
    const token = await this.getAccessToken();
    const out: LiftoffPlacementResponse[] = [];

    for (const p of placements) {
      const body = {
        application: p.applicationId,
        name: p.name + " " + new Date().getTime(),
        type: p.type,
        allowEndCards: p.allowEndCards ?? true,
        flatCPM: !p.cpm ? undefined : { default: p.cpm }, // ➋
        isFlatCPMEnabled: !p.cpm ? undefined : true, // ➋
        isHBParticipation: !p.cpm ? true : undefined,
      };

      try {
        const res = (await this.doRequest(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })) as LiftoffPlacementResponse;

        out.push({ ...res, cpm: p.cpm });
      } catch (e) {
        console.error(`LiftOff create failed for “${p.name}” →`, e);
      }
    }
    return out;
  }

  /* ----------------------------------------------------------------------- */
  /* 1-C  PATCH (one-by-one)                                                 */
  /* ----------------------------------------------------------------------- */
  static async updatePlacement(
    placementId: string,
    name: string,
    cpm: number, // ➍ new
    allowEndCards = true,
    status: "active" | "inactive" = "active",
    videoOrientationOverride: "none" | "landscape" | "portrait" = "none"
  ): Promise<LiftoffPlacementResponse> {
    const url = `${URL}/api/v1/placements/${placementId}`;

    const body = {
      name: name + " " + new Date().getTime(), // add timestamp to avoid name collisions
      allowEndCards,
      videoOrientationOverride,
      status,
      flatCPM: { default: cpm }, // ➋
      isFlatCPMEnabled: true, // ➋
    };

    const options = await this.createOptions("PATCH", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<LiftoffPlacementResponse>;
  }

  /* ----------------------------------------------------------------------- */
  /* 1-D  BATCH PATCH (used by Builder)                                      */
  /* ----------------------------------------------------------------------- */
  static async batchUpdatePlacements(
    updates: {
      placementId: string;
      name: string;
      cpm: number; // ← added
      allowEndCards?: boolean;
      status?: "active" | "inactive";
      videoOrientationOverride?: "none" | "landscape" | "portrait";
    }[]
  ): Promise<LiftoffPlacementResponse[]> {
    const token = await this.getAccessToken();
    const out: LiftoffPlacementResponse[] = [];

    for (const u of updates) {
      const url = `${URL}/api/v1/placements/${u.placementId}`;
      const body = {
        name: u.name + " " + new Date().getTime(), // add timestamp to avoid name collisions
        allowEndCards: u.allowEndCards ?? true,
        videoOrientationOverride: u.videoOrientationOverride ?? "none",
        status: u.status ?? "active",
        flatCPM: { default: u.cpm }, // ➋
        isFlatCPMEnabled: true, // ➋
      };

      try {
        const res = (await this.doRequest(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })) as LiftoffPlacementResponse;

        out.push(res);
      } catch (e) {
        console.error(`LiftOff update failed for “${u.name}” →`, e);
      }
    }
    return out;
  }

  // util/LiftOffAPI.ts
  static async listPlacements(
    appId: string
  ): Promise<LiftoffPlacementResponse[]> {
    const url = `${URL}/api/v1/placements?application=${appId}`;
    const options = await this.createOptions("GET");

    const res = (await this.doRequest(url, options)) as
      | { data: LiftoffPlacementResponse[] } // normal response
      | LiftoffPlacementResponse[]; // just in case

    // always return an array
    return Array.isArray(res) ? res : (res.data ?? []);
  }
  static async doRequest(url: string, options: any) {
    return new Promise((resolve, reject) => {
      fetch(url, options)
        .then((response) => response.json())
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  static async createOptions(method: string, body?: string) {
    return {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await this.getAccessToken()}`,
      },
      body,
    };
  }

  static getAccessToken() {
    const storedConfigs = localStorage.getItem("configurations");
    if (!storedConfigs) {
      throw new Error("No configurations found in localStorage");
    }

    if (!JSON.parse(storedConfigs).hasOwnProperty(WaterfallNetworkID.LiftOff)) {
      throw new Error("LiftOff configuration not found in localStorage");
    }

    const authUrl = "https://auth-api.vungle.com/v2/auth";

    const apiKey = JSON.parse(storedConfigs)[WaterfallNetworkID.LiftOff].apiKey;

    return new Promise((resolve, reject) => {
      fetch(authUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${apiKey}`,
        },
      })
        .then((response) => response.json())
        .then((res) => {
          resolve(res.token);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
