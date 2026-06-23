import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import LiftoffPlacementResponse from "../../types/liftoff/LiftoffPlacementResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { BiddingNetworkID, WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import LiftOffAPI from "../api/LiftOffAPI";
import { EditCall, NewCall } from "../useWaterfallChanges";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";

/**
 * LiftOff(Vungle) network implementation.
 * Relies solely on LiftOffAPI wrapper.
 */
export default class LiftOffProvider implements NetworkProvider {
  readonly id: string = WaterfallNetworkID.LiftOff;

  /* ------------------------------------------------------------------ */
  /*  CREATE                                                            */
  /* ------------------------------------------------------------------ */

  async createUnits(inputs: CreateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const batch = inputs.map((i) => ({
      applicationId: (i.extra!.liftoffAppId as { liftOffAppId: string })
        .liftOffAppId,
      name: i.displayName,
      type: this.liftOffTypeFromFormat(i.mg.targeting!.format!), // ✅ typed
      cpm: i.ecpm,
      allowEndCards: true,
    }));

    const res = await LiftOffAPI.createPlacementsBatch(batch);

    return res.map((pl, idx) => ({
      canonicalId: pl.referenceID, // for adapter-config
      networkId: pl.id, // internal placement-id
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      /* keep LiftOff app-id so Builder → toConfigs can read it */
      extra: { liftoffAppId: batch[idx].applicationId } as any,
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */

  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    // LiftOffProvider.updateUnits
    const updates = inputs.map((i) => ({
      placementId: i.extra!.placementId as string,
      name: i.displayName,
      cpm: i.ecpm,
      allowEndCards: true,
      flatCPM: { default: i.ecpm },
      isFlatCPMEnabled: true,
    }));

    const resp = await LiftOffAPI.batchUpdatePlacements(updates);
    return resp.map((pl, idx) => ({
      canonicalId: pl.referenceID,
      networkId: pl.id,
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      originalLine: inputs[idx].originalLine,
      extra: inputs[idx].extra, // ← propagate untouched
    }));
  }

  private liftOffTypeFromFormat(
    format: string
  ): "interstitial" | "rewarded" | "banner" | "appopen" | "native" {
    // <-- return type!
    switch (format.toUpperCase()) {
      case "INTERSTITIAL":
        return "interstitial";
      case "NATIVE":
        return "native";
      case "REWARDED":
        return "rewarded";
      case "BANNER":
      case "BANNER_INTERSTITIAL":
        return "banner";
      case "APP_OPEN":
        return "appopen";
      default:
        throw new Error(
          `Unsupported LiftOff format: ${format}. Supported formats: INTERSTITIAL, REWARDED, BANNER, APP_OPEN.`
        );
    }
  }
  /* ------------------------------------------------------------------ */
  /*  Adapter config boiler-plate                                       */
  /* ------------------------------------------------------------------ */

  async getAdapterConfig(
    format: string,
    platform: string,
    accountName: string
  ): Promise<AdapterConfigInfo> {
    /**
     * LiftOff doesn’t expose adapter metadata via its own API,
     * so we fetch it from AdMob the same way we do for other
     * third-party networks: through the AdMob Ad-Sources catalogue.
     */

    const adapters = await AdMobAPI.listAdapters(accountName, this.id);
    const adapter = adapters.adapters.find(
      (a) => a.platform === platform && a.formats.includes(format)
    );
    if (!adapter) {
      throw new Error(
        `No LiftOff adapter found for platform=${platform} format=${format}`
      );
    }

    /**
     * LiftOff expects two values:
     *   - “Application ID”  (we fill it later using canonicalId)
     *   - “Placement ID”    (same)
     */
    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  async resolvePlacementId(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<LiftoffPlacementResponse | undefined> {
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
      if (config.adapterConfigMetadataLabel !== "Application ID") {
        adapterConfigMetadataId = config.adapterConfigMetadataId;
      }
    }

    if (!adapterConfigMetadataId) {
      throw new Error(
        `No adapter config metadata found for format=${format} platform=${platform}`
      );
    }

    /* 258 is the “Placement Reference ID” field for Liftoff */
    const referenceId = mapping.adUnitConfigurations[adapterConfigMetadataId];
    if (!referenceId) return;

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Translate referenceID → placement.id via Liftoff              */
    /* ------------------------------------------------------------------ */

    const placements: Record<string, LiftoffPlacementResponse[]> = {};

    placements[appId] = await LiftOffAPI.listPlacements(appId);

    const hit = placements[appId].find((p) => p.referenceID === referenceId);

    return hit;
  }

  // util/providers/LiftOffProvider.ts
  async getAppMap(
    targetedApps: Record<string, { app: App; primaries: string[] }>
  ) {
    const liftoffApps = await LiftOffAPI.getApplications();
    const map: Record<
      string,
      { liftOffAppId: string; info: { app: App; primaries: string[] } }
    > = {};

    Object.values(targetedApps).forEach((app) => {
      const hit = liftoffApps.find(
        (la) =>
          la.platform.toUpperCase() === app.app.platform &&
          la.store.id === app.app.linkedAppInfo.appStoreId
      );
      if (hit)
        map[app.app.linkedAppInfo.appStoreId] = {
          liftOffAppId: hit.id,
          info: app,
        };
    });

    if (Object.keys(map).length !== Object.keys(targetedApps).length) {
      throw new Error(
        "LiftOffProvider.getAppMap: not all targeted apps found in LiftOff"
      );
    }

    return map;
  }

  // LiftOffProvider.ts
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
              liftoffAppId: appMap[app.app.linkedAppInfo.appStoreId],
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
    const liftoffAppIds = Object.values(
      (ctx.appMaps[WaterfallNetworkID.LiftOff] as
        | Record<
            string,
            { liftOffAppId: string; info: { app: App; primaries: string[] } }
          >
        | undefined) ?? {}
    );

    for (const appId of liftoffAppIds) {
      const hit = await this.resolvePlacementId!(
        ctx.accountName,
        edit.originalLine,
        appId.liftOffAppId,
        ctx.mg.targeting!.format!,
        ctx.mg.targeting!.platform!
      );
      if (!hit) continue;

      return [
        {
          adSourceId: this.id,
          resourceName: hit.referenceID,
          cpm: edit.changes.cpm,
          displayName: edit.changes.displayName,
          originalLine: edit.originalLine,
          extra: {
            liftoffAppId: appId,
            placementId: hit.id,
            resourceName: hit.referenceID,
          },
        },
      ];
    }

    throw new Error(
      "⚠️  LiftOff: could not resolve placement" + edit.originalLine
    );
  }

  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[] {
    return template.map((orig) => {
      // ① clone up front
      const cfg: AdapterConfigMetadata = { ...orig };

      // ② mutate the clone only
      if (cfg.adapterConfigMetadataLabel === "Application ID") {
        cfg.value =
          (unit as any).extra?.liftoffAppId.liftOffAppId ||
          (unit as any).extra?.liftoffAppId;
      } else {
        // Covers both “Placement ID” (old) and
        // “Placement Reference ID” (meta-id 260, new SDK)
        cfg.value = unit.canonicalId;
      }

      return cfg; // ③ return the private copy
    });
  }
}
