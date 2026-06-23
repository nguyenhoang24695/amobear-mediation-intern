/* ──────────────────────────────────────────────────────────────────────────
 *  Chartboost provider  •  mirrors one-for-one
 * ────────────────────────────────────────────────────────────────────────── */

import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import ChartboostPlacementResponse from "../../types/chartboost/ChartboostPlacementResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import ChartBoostAPI from "../api/ChartBoostAPI";
import { EditCall, NewCall } from "../useWaterfallChanges";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";

type AdType = "interstitial" | "rewarded" | "banner";
type PlacementKind = "bidding" | "fixed_cpm";

/**
 * Chartboost network implementation.
 * Uses the ChartBoostAPI wrapper exclusively.
 */
export default class ChartBoostProvider implements NetworkProvider {
  readonly id = WaterfallNetworkID.ChartBoost;

  /* ──────────────────────────────────────────────────────────────────── */
  /*  CREATE                                                             */
  /* ──────────────────────────────────────────────────────────────────── */

  async createUnits(inputs: CreateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    /* Builder → Chartboost batch-payload */
    const batch = inputs.map((i) => ({
      appId: String(i.extra!.chartboostAppId), // stored by Builder
      name: i.displayName,
      adType: this.cbAdTypeFromFormat(i.mg.targeting!.format!),
      kind: "fixed_cpm" as PlacementKind, // we mirror eCPM floors
      cpm: i.ecpm,
    }));

    const res = await ChartBoostAPI.createPlacementsBatch(batch);

    /* Standardise result for Builder */
    return res.map((loc, idx) => ({
      canonicalId: loc.name, // “Location ID” for adapter config
      networkId: loc.uuid, // same for network requests
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      extra: {
        chartboostAppId: batch[idx].appId,
        // preserve the signature that was present in inputs[idx].extra
        chartboostSignature:
          (inputs[idx].extra as any)?.chartboostSignature ?? "",
      },
    }));
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  UPDATE                                                             */
  /* ──────────────────────────────────────────────────────────────────── */

  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const updates = inputs.map((u) => ({
      appId: String(u.extra!.chartboostAppId),
      uuid: String(u.extra!.placementId ?? u.extra!.uuid),
      newName: u.displayName,
      cpm: u.ecpm,
    }));

    const resp = await ChartBoostAPI.batchUpdatePlacements(updates);

    return resp.map((loc, idx) => ({
      canonicalId: loc.name,
      networkId: loc.uuid,
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      originalLine: inputs[idx].originalLine,
      extra: inputs[idx].extra,
    }));
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Adapter-config boiler-plate                                        */
  /* ──────────────────────────────────────────────────────────────────── */

  async getAdapterConfig(
    format: string,
    platform: string,
    accountName: string
  ): Promise<AdapterConfigInfo> {
    /**
     * Chartboost doesn’t expose adapter metadata
     * via its own API. We pull it from AdMob’s Ad-Sources catalogue.
     */
    const adapters = await AdMobAPI.listAdapters(accountName, this.id);
    const adapter = adapters.adapters.find(
      (a) => a.platform === platform && a.formats.includes(format)
    );
    if (!adapter) {
      throw new Error(
        `No Chartboost adapter found for platform=${platform} format=${format}`
      );
    }

    /**
     * Chartboost adapters normally need:
     *   • “App ID”       (stored in extra.chartboostAppId)
     *   • “Location ID”  (canonicalId above)
     * Both values are injected later by Builder → toConfigs().
     */
    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Helpers                                                            */
  /* ──────────────────────────────────────────────────────────────────── */

  private cbAdTypeFromFormat(format: string): AdType {
    switch (format.toUpperCase()) {
      case "INTERSTITIAL":
        return "interstitial";
      case "REWARDED":
        return "rewarded";
      case "BANNER":
      case "BANNER_INTERSTITIAL":
        return "banner";
      default:
        throw new Error(
          `Unsupported Chartboost format: ${format}. ` +
            "Supported: INTERSTITIAL, REWARDED, BANNER."
        );
    }
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  resolvePlacementId (optional)                                      */
  /* ──────────────────────────────────────────────────────────────────── */
  /**
   *  variant: grabs the “Location ID”
   *  written into adapter-config, then matches it to Chartboost’s list of
   *  ad-locations for the relevant app.
   */
  async resolvePlacementId(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<ChartboostPlacementResponse | undefined> {
    /* 1️⃣  Extract AdMob mapping → Location ID (same logics) */
    const rn = Object.values(line.adUnitMappings ?? {})[0];
    const adUnitId = rn.split("/adUnits/")[1].split("/")[0];
    const { adUnitMappings } = await AdMobAPI.listAdUnitMappings(
      accountName,
      adUnitId
    );

    const mapping = adUnitMappings.find((m) => m.name === rn);
    if (!mapping?.adUnitConfigurations) return;

    const adapterInfo = await this.getAdapterConfig(
      format,
      platform,
      accountName
    );

    const meta = adapterInfo.configs.find(
      (c) => c.adapterConfigMetadataLabel === "Ad Location"
    );

    if (!meta) return;

    const locationName =
      mapping.adUnitConfigurations[meta.adapterConfigMetadataId];
    if (!locationName) return;

    /* 2️⃣  Chartboost API lookup */
    const all = await ChartBoostAPI.listPlacements(appId);

    return all.find((loc) => loc.name === locationName);
  }

  // util/providers/ChartBoostProvider.ts
  async getAppMap(
    targetedApps: Record<string, { app: App; primaries: string[] }>
  ) {
    const cbApps = await ChartBoostAPI.getApplications();
    const map: Record<
      string,
      { id: string; signature: string; info: { app: App; primaries: string[] } }
    > = {};

    await Promise.all(
      Object.values(targetedApps).map(async (app) => {
        const hit = cbApps.find(
          (cb) =>
            cb.platform.toUpperCase() === app.app.platform &&
            cb.store_app_id === app.app.linkedAppInfo.appStoreId
        );
        if (hit) {
          const full = await ChartBoostAPI.getApplication(hit.id);
          map[app.app.linkedAppInfo.appStoreId] = {
            id: hit.id,
            signature: full.signature,
            info: app,
          };
        }
      })
    );

    if (Object.keys(map).length !== Object.keys(targetedApps).length) {
      throw new Error(
        "ChartBoostProvider.getAppMap: not all targeted apps found in Chartboost"
      );
    }

    return map;
  }

  getCreatePayload(
    call: NewCall,
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    appMap: Record<string, unknown>
  ) {
    return Object.values(targetedApps)
      .map((app) => {
        return app.primaries.map((primary) => {
          // tell TS what we expect to find in the map
          const entry = appMap[app.app.linkedAppInfo.appStoreId] as
            | { id?: string; signature?: string }
            | undefined;

          return {
            adSourceId: call.adSourceId,
            displayName: call.displayName,
            cpm: call.cpm,
            extra: {
              chartboostAppId: entry?.id ?? "",
              chartboostSignature: entry?.signature ?? "",
            },
          };
        });
      })
      .flat();
  }

  async buildUpdateEdits(
    edit: EditCall,
    ctx: {
      accountName: string;
      mg: MediationGroup;
      appMaps: Record<string, unknown>;
      targetedApps: Record<string, { app: App; primaries: string[] }>;
    }
  ) {
    const cbEntries = Object.values(
      (ctx.appMaps[WaterfallNetworkID.ChartBoost] as
        | Record<string, { id: string; signature: string }>
        | undefined) ?? {}
    );

    for (const { id: appId, signature } of cbEntries) {
      const hit = await this.resolvePlacementId!(
        ctx.accountName,
        edit.originalLine,
        appId,
        ctx.mg.targeting!.format!,
        ctx.mg.targeting!.platform!
      );
      if (!hit) continue;

      return [
        {
          adSourceId: this.id,
          resourceName: hit.name, // Location name for traceability
          cpm: edit.changes.cpm,
          displayName: edit.changes.displayName,
          originalLine: edit.originalLine,
          extra: {
            chartboostAppId: appId,
            placementId: hit.uuid,
            chartboostLocationName: hit.name,
            chartboostSignature: signature,
          },
        },
      ];
    }

    throw new Error(
      "⚠️  Chartboost: could not resolve location" + edit.originalLine
    );
  }

  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[] {
    return template.map((orig) => {
      // ① make a fresh shallow copy (enough; template objects are flat)
      const cfg: AdapterConfigMetadata = { ...orig };

      // ② set the values relevant to this specific unit
      switch (cfg.adapterConfigMetadataLabel) {
        case "App ID":
          cfg.value = (unit as any).extra?.chartboostAppId ?? "";
          break;

        case "Ad Location":
          cfg.value = unit.canonicalId;
          break;

        case "App Signature":
          cfg.value = (unit as any).extra?.chartboostSignature ?? "";
          break;
      }

      return cfg; // ③ return the private copy
    });
  }
}
