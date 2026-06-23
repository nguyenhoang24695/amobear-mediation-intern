import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import MediationGroup from "../../types/admob/MediationGroup";
import MediationGroupLine from "../../types/admob/MediationGroupLine";
import { WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import MintegralAPI from "../api/MintegralAPI";
import MintegralUnitResponse from "../../types/mintegral/MintegralUnitResponse";
import MintegralPlacementResponse from "../../types/mintegral/MintegralPlacementResponse";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";
import { MintegralOptions } from "../../components/MintegralSpecificConfigurations";
import { NetworkOptions } from "../../components/AdTypeOptions";

export default class MintegralProvider implements NetworkProvider {
  readonly id: string = WaterfallNetworkID.Mintegral;

  /* ─────────────────────────────────────────────────── */
  /*  CREATE UNITS (only)                              */
  /* ─────────────────────────────────────────────────── */
  async createUnits(
    inputs: CreateUnitInput[],
    networkOptions?: NetworkOptions | undefined,
    mintegralOptions?: MintegralOptions | null
  ): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];
    const out: CreatedUnit[] = [];

    for (const i of inputs) {
      const extra = i.extra as any;
      console.log(i);
      const mintegralAppId = Number(
        (extra.mintegralAppId as { mintegralAppId: any }).mintegralAppId
      );
      if (!mintegralAppId) {
        throw new Error(
          "MintegralProvider.createUnits: missing mintegralAppId in extra"
        );
      }

      // Determine ad_type based on format
      const adType = this.mapFormatToAdType(i.mg.targeting!.format!);

      let placementId: number | undefined;

      if (mintegralOptions) {
        const selections = Object.values(mintegralOptions);

        const selection = selections.find(
          (s) => s.app.app_id === mintegralAppId
        );

        placementId = selection?.placement.placement_id;
      } else {
        // Find placement matching this adType
        const placements: MintegralPlacementResponse[] =
          await MintegralAPI.listPlacements(mintegralAppId);
        const placement = placements.find((p) => p.ad_type === adType);
        if (!placement) {
          throw new Error(
            `MintegralProvider.createUnits: no placement with ad_type=${adType}`
          );
        }
        placementId = placement.placement_id;
      }

      // Generate a unique unit name
      const unitName = `${i.displayName} ${Date.now()}`;

      if (!placementId) {
        throw new Error(
          "MintegralProvider.createUnits: missing placementId in extra"
        );
      }

      try {
        // Create the ad unit under the existing placement
        const unitResp: MintegralUnitResponse = await MintegralAPI.createUnit(
          mintegralAppId,
          placementId,
          unitName,
          {
            ecpmFloor: !i.ecpm ? undefined : { ALL: i.ecpm },
            biddingType: !i.ecpm ? 1 : 0,
          }
        );

        const unitId = unitResp.unit_id;
        out.push({
          canonicalId: String(unitId),
          networkId: String(unitId),
          cpm: i.ecpm,
          adSourceId: this.id,
          extra: { mintegralAppId, placementId, unitId },
        });
      } catch (e) {
        console.error(
          `Mintegral create unit failed for “${i.displayName}” →`,
          e
        );
      }
    }

    return out;
  }

  /* ─────────────────────────────────────────────────── */
  /*  UPDATE UNITS (only)                              */
  /* ─────────────────────────────────────────────────── */
  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];
    const out: CreatedUnit[] = [];

    for (const u of inputs) {
      const extra = u.extra as any;
      const mintegralAppId = Number(
        extra.mintegralAppId?.mintegralAppId || extra.mintegralAppId
      );
      const unitId = Number(extra.unitId);
      const placementId = Number(extra.placementId);
      if (!mintegralAppId || !unitId) {
        throw new Error(
          "MintegralProvider.updateUnits: missing mintegralAppId or unitId " + u
        );
        continue;
      }

      const newName = `${u.displayName} ${Date.now()}`;

      try {
        // Only update the ad unit's name and eCPM floor
        await MintegralAPI.updateUnit(mintegralAppId, placementId, unitId, {
          unitName: newName,
          ecpmFloor: { ALL: u.ecpm },
        });

        out.push({
          canonicalId: String(unitId),
          networkId: String(unitId),
          cpm: u.ecpm,
          adSourceId: this.id,
          originalLine: u.originalLine,
          extra: u.extra,
        });
      } catch (e) {
        console.error(`Mintegral update unit failed for unitId=${unitId}`, e);
      }
    }

    return out;
  }

  /* ─────────────────────────────────────────────────── */
  /*  ADAPTER CONFIG                                    */
  /* ─────────────────────────────────────────────────── */
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
        `No Mintegral adapter found for platform=${platform} format=${format}`
      );
    }
    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  /* ─────────────────────────────────────────────────── */
  /*  RESOLVE EXISTING                                   */
  /* ─────────────────────────────────────────────────── */
  async resolvePlacementId(
    accountName: string,
    line: MediationGroupLine,
    appId: string,
    format: string,
    platform: string
  ): Promise<MintegralUnitResponse | undefined> {
    // 1️⃣ Extract AdMob mapping → unit metadata
    const rn = Object.values(line.adUnitMappings ?? {})[0];
    const adUnitId = rn.split("/adUnits/")[1].split("/")[0];
    const { adUnitMappings } = await AdMobAPI.listAdUnitMappings(
      accountName,
      adUnitId
    );
    const mapping = adUnitMappings.find((m) => m.name === rn);
    if (!mapping?.adUnitConfigurations) return;

    // 2️⃣ Find the "Unit ID" metadata key
    const adapterInfo = await this.getAdapterConfig(
      format,
      platform,
      accountName
    );
    const unitMeta = adapterInfo.configs.find((c) =>
      c.adapterConfigMetadataLabel.includes("Unit ID")
    );
    if (!unitMeta) return;

    const unitIdStr =
      mapping.adUnitConfigurations[unitMeta.adapterConfigMetadataId];
    if (!unitIdStr) return;

    // 3️⃣ List all units to find matching
    const allUnits: MintegralUnitResponse[] = await MintegralAPI.listUnits();
    return allUnits.find((u) => String(u.unit_id) === unitIdStr);
  }

  /* ─────────────────────────────────────────────────── */
  /*  APP MAPPING                                        */
  /* ─────────────────────────────────────────────────── */
  async getAppMap(
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    mintegralOptions?: MintegralOptions | null
  ) {
    const media = await MintegralAPI.listMedia();
    const map: Record<
      string,
      { mintegralAppId: number; info: { app: App; primaries: string[] } }
    > = {};

    if (mintegralOptions) {
      Object.values(targetedApps).forEach((app) => {
        const bundle = app.app.linkedAppInfo.appStoreId;
        const hit = mintegralOptions[app.app.appId].app;

        if (hit) map[bundle] = { mintegralAppId: hit.app_id, info: app };
      });

      if (Object.keys(map).length !== Object.keys(targetedApps).length) {
        throw new Error(
          "MintegralProvider.getAppMap: not all targeted apps found in Mintegral"
        );
      }

      return map;
    } else {
      Object.values(targetedApps).forEach((app) => {
        const bundle = app.app.linkedAppInfo.appStoreId;
        const os = app.app.platform.toUpperCase();

        if (os === "IOS") {
          const hit = media.find((m) => {
            const mintegralPackage = m.package.replace("id", "");
            return m.os === os && mintegralPackage === bundle;
          });
          if (hit) map[bundle] = { mintegralAppId: hit.app_id, info: app };
        } else {
          const hit = media.find((m) => m.os === os && m.package === bundle);
          if (hit) map[bundle] = { mintegralAppId: hit.app_id, info: app };
        }
      });

      if (Object.keys(map).length !== Object.keys(targetedApps).length) {
        throw new Error(
          "MintegralProvider.getAppMap: not all targeted apps found in Mintegral"
        );
      }

      return map;
    }
  }

  /* ─────────────────────────────────────────────────── */
  /*  CREATE-PAYLOAD                                     */
  /* ─────────────────────────────────────────────────── */
  getCreatePayload(
    call: any,
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
              mintegralAppId: appMap[app.app.linkedAppInfo.appStoreId],
            },
          };
        });
      })
      .flat();
  }

  /* ─────────────────────────────────────────────────── */
  /*  BUILD UPDATE EDITS                                 */
  /* ─────────────────────────────────────────────────── */
  async buildUpdateEdits(
    edit: any,
    ctx: {
      accountName: string;
      mg: MediationGroup;
      appMaps: Record<string, unknown>;
      targetedApps: Record<string, { app: App; primaries: string[] }>;
    }
  ) {
    const entries = Object.values(
      (ctx.appMaps[WaterfallNetworkID.Mintegral] as
        | Record<
            string,
            { inMobiAppId: number; info: { app: App; primaries: string[] } }
          >
        | undefined) ?? {}
    );

    for (const appId of entries) {
      const resolved = await this.resolvePlacementId(
        ctx.accountName,
        edit.originalLine,
        String(appId.inMobiAppId),
        ctx.mg.targeting!.format!,
        ctx.mg.targeting!.platform!
      );
      if (!resolved) continue;

      return [
        {
          adSourceId: this.id,
          resourceName: String(resolved.unit_id),
          cpm: edit.changes.cpm,
          displayName: edit.changes.displayName,
          originalLine: edit.originalLine,
          extra: {
            mintegralAppId: appId,
            placementId: resolved.placement_id,
            unitId: resolved.unit_id,
          },
        },
      ];
    }

    throw new Error(
      "⚠️  Mintegral: could not resolve unit" + edit.originalLine
    );
  }

  /* ─────────────────────────────────────────────────── */
  /*  FILL ADAPTER CONFIG                               */
  /* ─────────────────────────────────────────────────── */
  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[] {
    return template.map((orig) => {
      const cfg = { ...orig };
      if (cfg.adapterConfigMetadataLabel.includes("App ID")) {
        cfg.value = String(
          (unit.extra as any).mintegralAppId.mintegralAppId ||
            (unit.extra as any).mintegralAppId
        );
      } else if (cfg.adapterConfigMetadataLabel.includes("Placement ID")) {
        cfg.value = String((unit.extra as any).placementId);
      } else if (cfg.adapterConfigMetadataLabel.includes("Unit ID")) {
        cfg.value = String((unit.extra as any).unitId);
      } else if (cfg.adapterConfigMetadataLabel === "App Key") {
        try {
          const stored = JSON.parse(
            localStorage.getItem("configurations") || "{}"
          );
          cfg.value = stored?.[WaterfallNetworkID.Mintegral]?.appKey ?? "";
        } catch {
          cfg.value = "";
        }
      }
      return cfg;
    });
  }

  /* ─────────────────────────────────────────────────── */
  /*  HELPERS                                           */
  /* ─────────────────────────────────────────────────── */
  private mapFormatToAdType(format: string): string {
    switch (format.toUpperCase()) {
      case "REWARDED":
        return "rewarded_video";
      case "INTERSTITIAL":
        return "new_interstitial";
      case "BANNER":
        return "banner";
      case "NATIVE":
        return "native";
      case "APP_OPEN":
        return "splash_ad";
      default:
        throw new Error(`Unsupported Mintegral format: ${format}`);
    }
  }
}
