import ChartboostApplication from "../../types/chartboost/ChartboostApplication";
import ChartboostPlacementResponse from "../../types/chartboost/ChartboostPlacementResponse";
import { WaterfallNetworkID } from "../../types/Networks";

/* ───────────────────────── CONFIG ───────────────────────── */

const HOST = "/chartboost";

const BASE = `${HOST}/v5`;
type AdType = "interstitial" | "rewarded" | "banner";
type PlacementKind = "bidding" | "fixed_cpm";

/* ───────────────────────── CLASS  ───────────────────────── */

export default class ChartBoostAPI {
  /* Cached token in memory */
  private static _token: string | null = null;
  private static _tokenExpiry: number = 0; // epoch-seconds

  /* ──────────────────── 0 • APPS ───────────────────────── */

  static async getApplications(): Promise<ChartboostApplication[]> {
    const url = `${BASE}/apps`;
    const options = await this.createOptions("GET");

    type Resp = { items: ChartboostApplication[] };
    const res = (await this.doRequest(url, options)) as Resp | undefined;
    return res?.items ?? [];
  }

  /* ──────────────────── 1-A • CREATE (1) ────────────────── */

  static async createPlacement(
    appId: string,
    name: string,
    adType: AdType,
    kind: PlacementKind = "bidding",
    cpm: number = 0 // used only for fixed_cpm
  ): Promise<ChartboostPlacementResponse> {
    const url = `${BASE}/apps/${appId}/ad-locations`;

    /* Minimal schema accepted by CB v5 */
    const body: any = {
      name: `${name} ${Date.now()}`,
      ad_type: adType,
      type: kind,
    };

    if (kind === "fixed_cpm") {
      body.country_targeting = [{ country: "default", price: cpm }];
    }

    const options = await this.createOptions("POST", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<ChartboostPlacementResponse>;
  }

  /* ──────────────────── 1-B • BATCH CREATE ──────────────── */

  static async createPlacementsBatch(
    placements: {
      appId: string;
      name: string;
      adType: AdType;
      kind: PlacementKind;
      cpm?: number;
    }[]
  ): Promise<ChartboostPlacementResponse[]> {
    const out: ChartboostPlacementResponse[] = [];
    const headers = await this.getAuthHeaders();

    for (const p of placements) {
      const url = `${BASE}/apps/${p.appId}/ad-locations`;
      const body: any = {
        name: `${p.name} ${Date.now()}`,
        ad_type: p.adType,
        type: p.kind,
      };

      if (p.kind === "fixed_cpm") {
        body.country_targeting = [{ country: "default", price: p.cpm ?? 0 }];
      }

      try {
        const res = (await this.doRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        })) as ChartboostPlacementResponse;

        out.push(res);
      } catch (e) {
        console.error(`Chartboost create failed for “${p.name}” →`, e);
      }
    }
    return out;
  }

  /* ──────────────────── 1-C • UPDATE (1) ────────────────── */

  static async updatePlacement(
    appId: string,
    uuid: string,
    newName: string,
    cpm?: number // only applicable to fixed_cpm
  ): Promise<ChartboostPlacementResponse> {
    const url = `${BASE}/apps/${appId}/ad-locations/${uuid}`;

    const body: any = { name: `${newName} ${Date.now()}` };
    if (cpm !== undefined) {
      body.country_targeting = [{ country: "default", price: cpm }];
    }

    const options = await this.createOptions("PATCH", JSON.stringify(body));
    return this.doRequest(url, options) as Promise<ChartboostPlacementResponse>;
  }

  /* ──────────────────── 1-D • BATCH UPDATE ──────────────── */

  static async batchUpdatePlacements(
    updates: {
      appId: string;
      uuid: string;
      newName: string;
      cpm?: number;
    }[]
  ): Promise<ChartboostPlacementResponse[]> {
    const out: ChartboostPlacementResponse[] = [];
    const headers = await this.getAuthHeaders();

    for (const u of updates) {
      const url = `${BASE}/apps/${u.appId}/ad-locations/${u.uuid}`;
      const body: any = { name: `${u.newName} ${Date.now()}` };
      if (u.cpm !== undefined) {
        body.country_targeting = [{ country: "default", price: u.cpm }];
      }

      try {
        const res = (await this.doRequest(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        })) as ChartboostPlacementResponse;

        out.push(res);
      } catch (e) {
        console.error(`Chartboost update failed for “${u.newName}” →`, e);
      }
    }
    return out;
  }

  /* ──────────────────── 1-E • LIST ──────────────────────── */

  static async listPlacements(
    appId: string
  ): Promise<ChartboostPlacementResponse[]> {
    const url = `${BASE}/apps/${appId}/ad-locations`;
    const options = await this.createOptions("GET");

    type Resp = { items: ChartboostPlacementResponse[] };
    const res = (await this.doRequest(url, options)) as Resp | undefined;
    return res?.items ?? [];
  }

  static async getApplication(
    appId: string
  ): Promise<ChartboostApplication & { signature: string }> {
    const url = `${BASE}/apps/${appId}`;
    const res = await this.doRequest(url, await this.createOptions("GET"));
    return res as any;
  }

  /* ──────────────────── 2 • COMMON HELPERS ──────────────── */

  /** Generic fetch wrapper */
  private static async doRequest(url: string, options: any) {
    return new Promise((resolve, reject) => {
      fetch(url, options)
        .then((r) => {
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          return r.json().catch(() => ({})); // allow 204/empty bodies
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /** Adds auth + content headers, body optional */
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

  /** Resolve & cache Bearer token */
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const now = Math.floor(Date.now() / 1000);
    if (this._token && now < this._tokenExpiry - 60) {
      return { Authorization: `Bearer ${this._token}` };
    }

    await this.refreshToken();
    return { Authorization: `Bearer ${this._token!}` };
  }

  /** Fetch a new token via /v5/oauth/token */
  private static async refreshToken() {
    const stored = localStorage.getItem("configurations");
    if (!stored) throw new Error("No configurations found in localStorage");

    const cfg = JSON.parse(stored)[WaterfallNetworkID.ChartBoost];
    if (!cfg?.clientId || !cfg?.clientSecret) {
      throw new Error("Chartboost credentials missing in localStorage");
    }

    const body = {
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      audience: "https://public.api.gateway.chartboost.com",
      grant_type: "client_credentials",
    };

    const res = await this.doRequest(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const { access_token, expires_in } = res as {
      access_token: string;
      expires_in: number;
    };

    this._token = access_token;
    this._tokenExpiry = Math.floor(Date.now() / 1000) + (expires_in ?? 0);
  }
}
