import AdapterConfigMetadata from "../../types/admob/AdapterConfigMetadata";
import App from "../../types/App";
import MediationGroup from "../../types/admob/MediationGroup";
import { WaterfallNetworkID } from "../../types/Networks";
import AdMobAPI from "../api/AdMobAPI";
import { EditCall, NewCall } from "../useWaterfallChanges";
import {
  NetworkProvider,
  CreateUnitInput,
  CreatedUnit,
  UpdateUnitInput,
  AdapterConfigInfo,
} from "./NetworkProvider";
import { NetworkOptions } from "../../components/AdTypeOptions";

/**
 * Handles ONLY AdMob-Network waterfall ad-units.
 * No other network logic leaks in here.
 */
export default class AdMobProvider implements NetworkProvider {
  readonly id = WaterfallNetworkID.AdMob;

  /* ------------------------------------------------------------------ */
  /*  CREATE                                                            */
  /* ------------------------------------------------------------------ */
  /* src/providers/AdMobProvider.ts */
  async createUnits(
    inputs: CreateUnitInput[],
    networkOptions?: NetworkOptions | undefined
  ): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    /* `targetedApps` is part of the new CreateUnitInput shape */
    const { accountName, targetedApps, mg } = inputs[0];
    const format = mg.targeting!.format!;

    const out: CreatedUnit[] = [];

    /* ──────────────────────────────────────────────────────────────── */
    /* iterate:  each  <appId, { primaries: […] }>  from targetedApps  */
    /* ──────────────────────────────────────────────────────────────── */
    for (const [appId, { primaries }] of Object.entries(targetedApps)) {
      for (const primary of primaries) {
        /* build one payload item *per UI call* (e.g. $10, $100, …) */
        const payload = inputs.map((i) => ({
          cpm: i.ecpm!,
          /* keep the label unique inside the app */
          displayName: `${i.displayName}`,
        }));

        /* ONE app per call ➜ one unit per primary × payload-item */
        const res = await AdMobAPI.batchCreateAdMobNetworkWaterfallAdUnits(
          accountName,
          [appId], // << single app
          format,
          payload,
          networkOptions
        );

        /* API returns <payload.length> units for that single primary */
        res.adMobNetworkWaterfallAdUnits.forEach((u, idx) => {
          out.push({
            canonicalId: u.admobNetworkWaterfallAdUnitId,
            networkId: u.admobNetworkWaterfallAdUnitId,
            cpm: inputs[idx].ecpm, // idx ∈ [0, payload.length)
            adSourceId: this.id,
            /* optional helper if you want 1-to-1 mapping later */
            primaryAdUnit: primary,
          });
        });
      }
    }

    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /*  UPDATE                                                            */
  /* ------------------------------------------------------------------ */
  async updateUnits(inputs: UpdateUnitInput[]): Promise<CreatedUnit[]> {
    if (!inputs.length) return [];

    const { accountName } = inputs[0];

    /** ---------------------------------------------------------------
     *  Helper: mapping-name  ➜  waterfall-unit resource-name
     * -------------------------------------------------------------- */
    const resolveMapping = async (name: string): Promise<string> => {
      /* if it is already a waterfall resource strip any “ca-app-pub …/” */
      if (name.includes("/adMobNetworkWaterfallAdUnits/")) {
        const id = name.split("/").pop()!; // might still contain slash
        const numeric = id.split("/").pop()!; // keep tail = digits only
        return `${accountName}/adMobNetworkWaterfallAdUnits/${numeric}`;
      }

      /* otherwise it’s a mapping – look it up to find the unit id */
      const [, adUnitId] =
        name.match(/\/adUnits\/(\d+)\/adUnitMappings\//) ?? [];
      if (!adUnitId) throw new Error(`Can’t parse id from “${name}”`);

      const { adUnitMappings } = await AdMobAPI.listAdUnitMappings(
        accountName,
        adUnitId
      );
      const hit = adUnitMappings.find((m) => m.name === name);
      if (!hit) throw new Error(`Mapping “${name}” not found on the server`);

      const cfgVal = Object.values(hit.adUnitConfigurations ?? {})[0] as string;
      const numeric = cfgVal.split("/").pop()!; // keep digits
      return `${accountName}/adMobNetworkWaterfallAdUnits/${numeric}`;
    };

    /* -------------------------------------------------------------- */
    /* build batch-update request – *after* we resolved the names      */
    /* -------------------------------------------------------------- */
    const requests = await Promise.all(
      inputs.map(async (i) => ({
        cpm: i.ecpm,
        displayName: i.displayName,
        batchUpdateNames: [await resolveMapping(i.resourceName)],
      }))
    );

    const resp = await AdMobAPI.batchUpdateAdMobNetworkWaterfallAdUnits(
      accountName,
      requests
    );

    if (!resp.admobNetworkWaterfallAdUnits) {
      throw new Error(`batchUpdate failed: ${JSON.stringify(resp)}`);
    }

    /* flatten response back to our neutral “CreatedUnit” shape        */
    return resp.admobNetworkWaterfallAdUnits.map((u, idx) => ({
      canonicalId: u.admobNetworkWaterfallAdUnitId,
      networkId: u.admobNetworkWaterfallAdUnitId,
      cpm: inputs[idx].ecpm,
      adSourceId: this.id,
      originalLine: inputs[idx].originalLine, // keep link for patching
    }));
  }
  /* ------------------------------------------------------------------ */
  /*  Adapter config boiler-plate                                       */
  /* ------------------------------------------------------------------ */

  async getAdapterConfig(
    format: string,
    platform: string,
    accountName: string
  ): Promise<AdapterConfigInfo> {
    // directly query the adapters that belong to *this* ad-source
    const adapters = await AdMobAPI.listAdapters(accountName, this.id);

    const adapter = adapters.adapters.find(
      (a) => a.platform === platform && a.formats.includes(format)
    );
    if (!adapter) {
      throw new Error(
        `No AdMob-waterfall adapter for platform=${platform} format=${format}`
      );
    }

    return {
      adapterId: adapter.adapterId,
      configs: adapter.adapterConfigMetadata,
    };
  }

  getCreatePayload(
    call: NewCall,
    targetedApps: Record<string, { app: App; primaries: string[] }>,
    appMap: Record<string, unknown>
  ) {
    return [
      {
        adSourceId: call.adSourceId,
        displayName: call.displayName,
        cpm: call.cpm,
      },
    ];
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
    return Object.values(edit.originalLine.adUnitMappings ?? {}).map((rn) => ({
      adSourceId: WaterfallNetworkID.AdMob,
      resourceName: rn,
      cpm: edit.changes.cpm,
      displayName: edit.changes.displayName,
      originalLine: edit.originalLine,
    }));
  }

  fillAdapterConfigs(
    template: AdapterConfigMetadata[],
    unit: CreatedUnit
  ): AdapterConfigMetadata[] {
    return template.map((orig) => {
      // ① make a fresh copy of the object
      const cfg: AdapterConfigMetadata = { ...orig };

      // ② mutate only the copy
      if (cfg.adapterConfigMetadataLabel === "Ad Unit ID") {
        cfg.value = unit.canonicalId;
      }

      return cfg; // ③ return the private copy
    });
  }
}
