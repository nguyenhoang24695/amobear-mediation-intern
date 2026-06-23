/* ──────────────────────────────────────────────────────────────────────────
 *  InMobi provider  •
 * ────────────────────────────────────────────────────────────────────────── */

import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import InMobiPlacementResponse from "../../types/inmobi/InMobiPlacementResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import InMobiAPI from "../api/InMobiAPI";
import { EditCall, NewCall } from "../useWaterfallChanges";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";

type PlacementKind = "INTERSTITIAL" | "BANNER" | "REWARDED_VIDEO" | "NATIVE";

/**
 * InMobi network implementation.
 * Uses the InMobiAPI wrapper exclusively.
 */
export default class InMobiProvider implements NetworkProvider {
  readonly id: string = WaterfallNetworkID.InMobi;

  /* ──────────────────────────────────────────────────────────────────── */
  /*  CREATE                                                             */
  /* ──────────────────────────────────────────────────────────────────── */

  async createUnits(inputs: CreateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    /* Translate Builder inputs → InMobi batch-creation payload */
    const batch = inputs.map((i) => ({
      appId: Number((i.extra!.inmobiAppId as { inMobiAppId: any }).inMobiAppId), // stored by Builder
      name: i.displayName,
      type: this.inmobiTypeFromFormat(i.mg.targeting!.format!),
      cpmFloor: i.ecpm,
    }));

    const res = await InMobiAPI.createPlacementsBatch(batch);

    /* Standardise the result for Builder */
    return res.map((pl, idx) => ({
      /** Value AdMob expects in adapter config (“Placement ID”) */
      canonicalId: String(pl.placementId),
      /** Same numeric ID for network calls */
      networkId: String(pl.placementId),
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      /* keep InMobi app-id so Builder → toConfigs can read it */
      extra: { inmobiAppId: batch[idx].appId } as any,
    }));
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  UPDATE                                                             */
  /* ──────────────────────────────────────────────────────────────────── */

  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const updates = inputs.map((i) => ({
      placementId: Number(i.extra!.placementId),
      name: i.displayName,
      cpmFloor: i.ecpm,
      isAudienceBiddingEnabled: false,
    }));

    const resp = await InMobiAPI.batchUpdatePlacements(updates);

    return resp.map((pl, idx) => ({
      canonicalId: String(pl.placementId),
      networkId: String(pl.placementId),
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      originalLine: inputs[idx].originalLine,
      extra: inputs[idx].extra, // propagate untouched
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
     * InMobi, like, does not expose adapter metadata via its own
     * dashboard API. We fetch it from AdMob’s Ad-Sources catalogue.
     */
    const adapters = await AdMobAPI.listAdapters(accountName, this.id);
    const adapter = adapters.adapters.find(
      (a) => a.platform === platform && a.formats.includes(format)
    );
    if (!adapter) {
      throw new Error(
        `No InMobi adapter found for platform=${platform} format=${format}`
      );
    }

    /**
     * InMobi adapters typically expect two parameters:
     *   • “Account ID”   (x-account-id)
     *   • “Placement ID” (returned above as canonicalId)
     *
     * Builder fills those later when mapping.
     */
    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  /* ──────────────────────────────────────────────────────────────────── */
  /*  Helpers                                                            */
  /* ──────────────────────────────────────────────────────────────────── */

  private inmobiTypeFromFormat(format: string): PlacementKind {
    switch (format.toUpperCase()) {
      case "INTERSTITIAL":
        return "INTERSTITIAL";
      case "REWARDED":
        return "REWARDED_VIDEO";
      case "BANNER":
      case "BANNER_INTERSTITIAL":
        return "BANNER";
      case "NATIVE":
        return "NATIVE";
      default:
        throw new Error(
          `Unsupported InMobi format: ${format}. ` +
            "Supported: INTERSTITIAL, REWARDED, BANNER, NATIVE."
        );
    }
  }

  async resolvePlacementId(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<InMobiPlacementResponse | undefined> {
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Get the AdMob-side mapping                                     */
    /* ------------------------------------------------------------------ */
    const rn = Object.values(line.adUnitMappings ?? {})[0]; // resource-name

    //  example: accounts/pub-…/adUnits/9749922927/adUnitMappings/7326512002616775
    //   const [, , adUnitId] = rn.split("/adUnits/").split("/")[0];

    const adUnitId = rn.split("/adUnits/")[1].split("/")[0];

    const adUnitNum = adUnitId.split("/")[0]; // "9749922927"

    const { adUnitMappings } = await AdMobAPI.listAdUnitMappings(
      accountName,
      adUnitNum
    );

    /* Find the mapping that matches our resource-name */
    const mapping = adUnitMappings.find((m) => m.name === rn);
    if (!mapping?.adUnitConfigurations) return;

    const specificAdapter = await this.getAdapterConfig(
      format,
      platform,
      accountName
    );

    let adapterConfigMetadataId: string | undefined = undefined;

    for (const config of specificAdapter.configs) {
      if (config.adapterConfigMetadataLabel === "Placement ID") {
        adapterConfigMetadataId = config.adapterConfigMetadataId;
      }
    }

    if (!adapterConfigMetadataId) {
      throw new Error(
        `No adapter config metadata found for format=${format} platform=${platform}`
      );
    }

    /* 258 is the “Placement Reference ID” field for */
    const referenceId = mapping.adUnitConfigurations[adapterConfigMetadataId];
    if (!referenceId) return;

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Translate referenceID → placement.id via              */
    /* ------------------------------------------------------------------ */

    const placements: Record<string, InMobiPlacementResponse[]> = {};

    placements[appId] = await InMobiAPI.listPlacements(parseInt(appId));

    const hit = placements[appId].find(
      (p) => String(p.placementId) === referenceId
    );

    return hit;
  }

  // util/providers/InMobiProvider.ts
  async getAppMap(
    targetedApps: Record<string, { app: App; primaries: string[] }>
  ) {
    const inmobiApps = await InMobiAPI.getApplications();
    const map: Record<
      string,
      { inMobiAppId: number; info: { app: App; primaries: string[] } }
    > = {};

    const iosApps = inmobiApps.filter(
      (ia) =>
        ia.platform.toUpperCase() === "IOS" ||
        ia.platform.toUpperCase() === "IPHONE"
    );

    const androidApps = inmobiApps.filter(
      (ia) => ia.platform.toUpperCase() === "ANDROID"
    );

    Object.values(targetedApps).forEach((app) => {
      if (app.app.platform.toUpperCase() === "IOS") {
        const hit = iosApps.find((ia) => {
          const realId = (ia.storeUrl?.match(/id(\d+)/) || [])[1] || "";

          return realId === app.app.linkedAppInfo.appStoreId;
        });
        if (hit)
          map[app.app.linkedAppInfo.appStoreId] = {
            inMobiAppId: hit.appId,
            info: app,
          };
      }

      if (app.app.platform.toUpperCase() === "ANDROID") {
        const hit = androidApps.find(
          (ia) => ia.bundleId === app.app.linkedAppInfo.appStoreId
        );
        if (hit)
          map[app.app.linkedAppInfo.appStoreId] = {
            inMobiAppId: hit.appId,
            info: app,
          };
      }
    });

    if (Object.keys(map).length !== Object.keys(targetedApps).length) {
      throw new Error(
        "InMobiProvider.getAppMap: not all targeted apps found in InMobi"
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
          return {
            adSourceId: call.adSourceId,
            displayName: call.displayName,
            cpm: call.cpm,
            extra: {
              inmobiAppId: appMap[app.app.linkedAppInfo.appStoreId],
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
    const inmobiAppIds = Object.values(
      (ctx.appMaps[WaterfallNetworkID.InMobi] as
        | Record<
            string,
            { inMobiAppId: number; info: { app: App; primaries: string[] } }
          >
        | undefined) ?? {}
    );

    for (const appId of inmobiAppIds) {
      const hit = await this.resolvePlacementId!(
        ctx.accountName,
        edit.originalLine,
        String(appId.inMobiAppId),
        ctx.mg.targeting!.format!,
        ctx.mg.targeting!.platform!
      );
      if (!hit) continue;

      return [
        {
          adSourceId: this.id,
          resourceName: String(hit.placementId), // not used by API, just trace
          cpm: edit.changes.cpm,
          displayName: edit.changes.displayName,
          originalLine: edit.originalLine,
          extra: {
            inmobiAppId: appId,
            placementId: hit.placementId,
          },
        },
      ];
    }

    throw new Error(
      "⚠️  InMobi: could not resolve placement" + edit.originalLine
    );
  }

  fillAdapterConfigs(template: AdapterConfigMetadata[], unit: CreatedUnit) {
    // make a brand-new copy so we never mutate the shared template
    return template.map((orig) => {
      const cfg = { ...orig }; // shallow clone is enough
      if (cfg.adapterConfigMetadataLabel === "Account ID") {
        try {
          const stored = JSON.parse(
            localStorage.getItem("configurations") || "{}"
          );
          cfg.value = stored?.[WaterfallNetworkID.InMobi]?.accountId ?? "";
        } catch {
          cfg.value = "";
        }
      }
      if (cfg.adapterConfigMetadataLabel === "Placement ID") {
        cfg.value = unit.canonicalId; // safe to mutate our private copy
      }
      return cfg;
    });
  }
}
