import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import PanglePlacementResponse from "../../types/pangle/PanglePlacementResponse";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import PangleAPI, { CreatePlacementOpts } from "../api/PangleAPI";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";
import { NetworkOptions } from "../../components/AdTypeOptions";

/**
 * Pangle network implementation.
 * Wraps the PangleAPI helper just like LiftOffProvider does for Liftoff.
 */
export default class PangleProvider implements NetworkProvider {
  readonly id: string = WaterfallNetworkID.Pangle;

  /* ------------------------------------------------------------------ */
  /*  CREATE                                                            */
  /* ------------------------------------------------------------------ */

  async createUnits(
    inputs: CreateUnitInput[],
    networkOptions?: NetworkOptions | undefined
  ): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const out: CreatedUnit[] = [];

    for (const i of inputs) {
      const pangleAppId = Number(
        (i.extra!.pangleAppId as { pangleAppId: any }).pangleAppId
      );
      if (!pangleAppId) throw new Error("Missing pangleAppId in extra payload");

      const displayName = `${i.displayName} ${Date.now()}`;

      const { biddingType, opts } = this._getPlacementConfig(
        i.mg.targeting!.format!,
        displayName,
        i.ecpm,
        networkOptions
      );

      try {
        const pl = await PangleAPI.createPlacement(
          pangleAppId,
          displayName,
          biddingType,
          opts,
          String(i.ecpm)
        );

        console.log("Pangle create result:");

        console.log(pl);

        out.push({
          canonicalId: String(pl.ad_slot_id ?? pl.id ?? pl.adSlotId),
          networkId: String(pl.ad_slot_id ?? pl.id ?? pl.adSlotId),
          cpm: i.ecpm,
          adSourceId: this.id,
          extra: { pangleAppId },
        });
      } catch (e) {
        console.error(`Pangle create failed for “${i.displayName}” →`, e);
      }
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */

  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const out: CreatedUnit[] = [];

    for (const i of inputs) {
      const placementId = Number(i.extra!.placementId);
      if (!placementId) {
        throw new Error("PangleProvider.updateUnits: missing placementId " + i);
      }

      try {
        await PangleAPI.updatePlacement(
          placementId,
          {
            adSlotName: i.displayName,
          } as any,
          String(i.ecpm)
        );

        // if (typeof i.ecpm === "number" && i.ecpm > 0) {
        //   try {
        //     await PangleAPI.updateExpectedCpm(placementId, "us", i.ecpm);
        //   } catch (e) {
        //     console.warn("PangleProvider: updateExpectedCpm failed", e);
        //   }
        // }

        out.push({
          canonicalId: String(placementId),
          networkId: String(placementId),
          cpm: i.ecpm,
          adSourceId: this.id,
          originalLine: i.originalLine,
          extra: i.extra, // propagate untouched
        });
      } catch (e) {
        console.error(`Pangle update failed id=${placementId}`);
      }
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Adapter config boiler‑plate                                        */
  /* ------------------------------------------------------------------ */

  async getAdapterConfig(
    format: string,
    platform: string,
    accountName: string
  ): Promise<AdapterConfigInfo> {
    const adapters = await AdMobAPI.listAdapters(accountName, this.id);

    const adapter = adapters.adapters.find(
      (a) => a.platform === platform && a.formats.includes(format)
    );

    if (!adapter) {
      throw new Error(
        `No Pangle adapter found for platform=${platform} format=${format}`
      );
    }

    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Resource resolution helpers                                        */
  /* ------------------------------------------------------------------ */

  async resolvePlacementId(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<PanglePlacementResponse | undefined> {
    // 1️⃣  Get the AdMob-side mapping
    const rn = Object.values(line.adUnitMappings ?? {})[0];
    const adUnitId = rn.split("/adUnits/")[1].split("/")[0];
    const { adUnitMappings } = await AdMobAPI.listAdUnitMappings(
      accountName,
      adUnitId
    );

    const mapping = adUnitMappings.find((m) => m.name === rn);
    if (!mapping?.adUnitConfigurations) return;

    const specificAdapter = await this.getAdapterConfig(
      format,
      platform,
      accountName
    );

    let placementMetadataId: string | undefined;
    for (const cfg of specificAdapter.configs) {
      if (cfg.adapterConfigMetadataLabel.includes("Placement ID")) {
        placementMetadataId = cfg.adapterConfigMetadataId;
        break;
      }
    }

    if (!placementMetadataId) return;

    const placementIdStr = mapping.adUnitConfigurations[placementMetadataId];
    if (!placementIdStr) return;

    // 2️⃣  Translate placementId → placement object via Pangle
    const placements = await PangleAPI.listPlacements(parseInt(appId));
    const hit = placements.find(
      (p) => String(p.ad_slot_id ?? p.id ?? p.adSlotId) === placementIdStr
    );

    return hit;
  }

  /* ------------------------------------------------------------------ */
  /*  App mapping helper                                                 */
  /* ------------------------------------------------------------------ */

  async getAppMap(
    targetedApps: Record<string, { app: App; primaries: string[] }>
  ) {
    const pangleApps = await PangleAPI.getApplications();
    const map: Record<
      string,
      { pangleAppId: number; info: { app: App; primaries: string[] } }
    > = {};

    Object.values(targetedApps).forEach((app) => {
      const bundle = app.app.linkedAppInfo.appStoreId;
      const os = app.app.platform.toUpperCase();

      if (os === "IOS") {
        const hit = pangleApps
          .filter((item) => item.os_type === "ios")
          .find((pa: any) => {
            // Pangle returns package_name (Android) or bundle_id (iOS)

            const panglePackage =
              (pa.download_url?.match(/id(\d+)/) || [])[1] || "";

            return panglePackage?.toLowerCase() === bundle.toLowerCase();
          });
        if (hit) map[bundle] = { pangleAppId: hit.app_id ?? hit.id, info: app };
      } else {
        const hit = pangleApps
          .filter((item) => item.os_type === "android")
          .find((pa) => {
            // Pangle returns package_name (Android) or bundle_id (iOS)
            return pa.package_name?.toLowerCase() === bundle.toLowerCase();
          });
        if (hit) map[bundle] = { pangleAppId: hit.app_id ?? hit.id, info: app };
      }
    });

    if (Object.keys(map).length !== Object.keys(targetedApps).length) {
      throw new Error(
        "PangleProvider.getAppMap: not all targeted apps found in Pangle"
      );
    }

    return map;
  }

  /* ------------------------------------------------------------------ */
  /*  Waterfall‑Builder helpers                                          */
  /* ------------------------------------------------------------------ */

  getCreatePayload(
    call: any /* NewCall */,
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
              pangleAppId: appMap[app.app.linkedAppInfo.appStoreId],
            },
          };
        });
      })
      .flat();
  }

  async buildUpdateEdits(
    edit: any /* EditCall */,
    ctx: {
      accountName: string;
      mg: MediationGroup;
      appMaps: Record<string, unknown>;
      targetedApps: Record<string, { app: App; primaries: string[] }>;
    }
  ) {
    const pangleAppIds = Object.values(
      (ctx.appMaps[WaterfallNetworkID.Pangle] as
        | Record<
            string,
            { pangleAppId: number; info: { app: App; primaries: string[] } }
          >
        | undefined) ?? {}
    );

    for (const appId of pangleAppIds) {
      const hit = await this.resolvePlacementId(
        ctx.accountName,
        edit.originalLine,
        String(appId.pangleAppId),
        ctx.mg.targeting!.format!,
        ctx.mg.targeting!.platform!
      );
      if (!hit) continue;

      return [
        {
          adSourceId: this.id,
          resourceName: String(hit.ad_slot_id ?? hit.id ?? hit.adSlotId),
          cpm: edit.changes.cpm,
          displayName: edit.changes.displayName,
          originalLine: edit.originalLine,
          extra: {
            pangleAppId: appId,
            placementId: hit.ad_slot_id ?? hit.id ?? hit.adSlotId,
            resourceName: String(hit.ad_slot_id ?? hit.id ?? hit.adSlotId),
          },
        },
      ];
    }

    throw new Error(
      "⚠️  Pangle: could not resolve placement" + edit.originalLine
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Adapter‑config filling                                             */
  /* ------------------------------------------------------------------ */

  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[] {
    return template.map((orig) => {
      const cfg: AdapterConfigMetadata = { ...orig };

      console.log("------");

      console.log(unit);
      console.log("------");

      if (cfg.adapterConfigMetadataLabel.includes("App ID")) {
        cfg.value =
          String(
            (unit as any).extra?.pangleAppId.pangleAppId ||
              (unit as any).extra?.pangleAppId
          ) ?? "";
      } else if (cfg.adapterConfigMetadataLabel.includes("Placement ID")) {
        cfg.value = String(unit.canonicalId);
      }

      return cfg;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private _getPlacementConfig(
    format: string,
    name: string,
    ecpm?: number,
    networkOptions?: NetworkOptions | undefined
  ) {
    const fmt = format.toUpperCase();
    let opts: CreatePlacementOpts;
    let biddingType: 0 | 1 | 2 = !ecpm ? 1 : 0; // default to waterfall CPM

    switch (fmt) {
      case "BANNER":
      case "BANNER_INTERSTITIAL":
        opts = {
          adSlotType: 2,
          slideBanner: 1,
          width: networkOptions ? (networkOptions.size?.width ?? 640) : 640,
          height: networkOptions ? (networkOptions.size?.height ?? 100) : 100,
        };
        break;
      case "INTERSTITIAL":
        opts = {
          adSlotType: 6,
          orientation: networkOptions
            ? networkOptions.orientation === "VERTICAL"
              ? 1
              : 2
            : 1,
        };
        break;
      case "REWARDED":
        opts = {
          adSlotType: 5,
          orientation: networkOptions
            ? networkOptions.orientation === "VERTICAL"
              ? 1
              : 2
            : 1,
          rewardName: "Reward",
          rewardCount: 1,
          rewardIsCallback: 0,
        };
        break;
      case "APP_OPEN":
        opts = {
          adSlotType: 3,
          orientation: networkOptions
            ? networkOptions.orientation === "VERTICAL"
              ? 1
              : 2
            : 1,
        };
        break;
      case "NATIVE":
      default:
        opts = {
          adSlotType: 1,
          adCategories: networkOptions
            ? (networkOptions.categories ?? [4])
            : [4], // video
        };
        break;
    }

    return { biddingType, opts };
  }
}
